import { db, auth } from "./index.js";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

import * as math from 'mathjs';

const studentNameHtml = document.getElementById("student-name-id");
const coursesGridContainer = document.getElementById("courses-grid-container");
const alertBannersContainer = document.querySelector(".alert-banners");

const confirmDeleteCourseModalID = document.getElementById("confirm-delete-modal");
const confirmDeleteCourseModalCancelButtonID = document.getElementById("close-modal-btn-delete-course");
const confirmDeleteYesButtonID = document.getElementById("confirm-delete-yes-button-ID");
const confirmDeleteNoButtonID = document.getElementById("confirm-delete-no-button-ID");

const styleToken = document.createElement("style");
styleToken.textContent = `
    .inline-edit-row-btn {
        animation: fadeInSlide 0.3s ease-out forwards;
        z-index: -1;
    }
    #edit-actions-footer-container {
        animation: footerSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeInSlide {
        from { opacity: 0; transform: translateX(-8px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes footerSlideUp {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .grades-table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: 5px !important;
        table-layout: fixed !important;
    }
    .grades-table td, .grades-table th {
        transition: all 0.25s ease-in-out;
        vertical-align: middle !important;
        padding: 8px 6px !important;
        text-align: left;
    }
    .grades-table th {
        font-weight: 700 !important;
        color: #333 !important;
        border-bottom: 2px solid #ccc !important;
    }
    .action-header, .action-cell {
        width: 80px !important;
        min-width: 80px !important;
        max-width: 80px !important;
        text-align: center !important;
        z-index: 1000;
    }
    .score-header, .score-cell {
        width: 95px !important;
        min-width: 95px !important;
        max-width: 95px !important;
    }
    .total-header, .total-cell {
        width: 80px !important;
        min-width: 80px !important;
        max-width: 80px !important;
    }
    .edit-input-score {
        width: 100% !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 4px 6px !important;
        height: 28px !important;
        display: block !important;
        font-size: 0.85rem !important;
        font-weight: bold !important;
        border: 1px solid #f49223 !important;
        border-radius: 4px !important;
        outline: none !important;
        transition: border-color 0.2s ease, background-color 0.2s ease;
    }
    .edit-input-score.input-error {
        border-color: #ef4444 !important;
        background-color: #fef2f2 !important;
        color: #ef4444 !important;
    }
    .units-badge {
        font-weight: 600;
        color: #f49223;
        background-color: #fdf6ed;
        border: 1px solid #fcead2;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
    }
    .btn-shake-error {
        background: #ef4444 !important; 
        animation: shakeWiggle 0.5s ease-in-out !important;
    }
    .settings-gear.trash-btn {
        cursor: pointer;
        color: #ef4444;
        transition: color 0.2s ease;
    }
    .settings-gear.trash-btn:hover {
        color: #b91c1c;
    }
    .empty-notifications-placeholder {
        padding: 40px 20px !important;
        min-height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    @keyframes shakeWiggle {
        0%, 100% { transform: translateX(0); }
        15%, 45%, 75% { transform: translateX(-6px); }
        30%, 60%, 90% { transform: translateX(6px); }
    }
`;
document.head.appendChild(styleToken);

let activeCourseCode = null;
let activeDocId = null; 
let localComponentsDistribution = {};
let localBackupDistribution = {};
let isEditMode = false;

let localCachedCoursesList = [];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        setTimeout(async () => {
            try {
                const decRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(decRef);

                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    studentNameHtml.innerHTML = userData.fullName || "Student";
                    
                    if (userData.gwaGoal && goalSlider && goalValueDisplay) {
                        goalSlider.value = userData.gwaGoal;
                        goalValueDisplay.textContent = parseFloat(userData.gwaGoal).toFixed(2);
                        updateGwaCardUI(parseFloat(userData.gwaGoal));
                    }
                } else {
                    console.log("Data Does Not Exist.");
                }

                await fetchAndRenderCourses(user.uid);

            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        }, 50);
        
    } else {
        const repoPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        window.location.href = `${repoPath}/login.html`;
    }
});

function determinePUPStatus(percentageScore) {
    const rawScore = percentageScore;
    if (isNaN(rawScore)) return { scale: "N/A", description: "Invalid Score Data" };

    if (rawScore >= 97.00) return { scale: "1.00", description: "Excellent" };
    if (rawScore >= 94.00) return { scale: "1.25", description: "Excellent" };
    if (rawScore >= 91.00) return { scale: "1.50", description: "Very Good" };
    if (rawScore >= 88.00) return { scale: "1.75", description: "Very Good" };
    if (rawScore >= 85.00) return { scale: "2.00", description: "Good" };
    if (rawScore >= 82.00) return { scale: "2.25", description: "Good" };
    if (rawScore >= 79.00) return { scale: "2.50", description: "Satisfactory" };
    if (rawScore >= 76.00) return { scale: "2.75", description: "Satisfactory" };
    if (rawScore >= 75.00) return { scale: "3.00", description: "Passing" };

    return { scale: "5.00", description: "-.--" };
}

function calculateCourseGradeMetrics(formulaString, componentsDistribution) {
    if (!formulaString) return { finalGrade: 0, breakdown: {}, passPredictions: [] };

    let parsedNode;
    try {
        parsedNode = math.parse(formulaString);
    } catch (e) {
        return { finalGrade: 0, breakdown: {}, passPredictions: [] };
    }

    const formulaVariables = [];
    parsedNode.filter((node) => node.isSymbolNode).forEach((sym) => {
        if (!formulaVariables.includes(sym.name) && !math[sym.name]) {
            formulaVariables.push(sym.name);
        }
    });

    const totalWeightsMap = {};
    formulaVariables.forEach(v => {
        const singleVarScope = {};
        singleVarScope[v] = 1;
        formulaVariables.forEach(otherV => { if (otherV !== v) singleVarScope[otherV] = 0; });
        try {
            totalWeightsMap[v] = parsedNode.evaluate(singleVarScope);
        } catch (e) {
            totalWeightsMap[v] = 0;
        }
    });

    const variableCalculatedValues = {};
    const componentBreakdown = {};
    const passPredictions = [];

    let structuralMissingItemsCount = 0;
    let targetMissingRowRef = null;
    let missingItemVarWeight = 0; 
    let missingConfigWeight = 0;
    let missingItemConfigItemsCount = 0;

    formulaVariables.forEach((varName) => {
        const compData = componentsDistribution[varName] || componentsDistribution[varName.toLowerCase()] || null;
        const configsArray = (compData && compData.configs) ? compData.configs : [];
        const varWeightCoefficient = totalWeightsMap[varName] || 0;

        let variableSumAccumulator = 0;
        componentBreakdown[varName] = { configs: [], totalVarScore: 0 };

        configsArray.forEach((config) => {
            let configPairsSum = 0;
            const pairArray = config.scorePairs || [];
            const itemsInConfigCount = pairArray.length;
            const configPercentageWeight = (config.percentageDistribution !== undefined ? config.percentageDistribution : 0) / 100;

            pairArray.forEach((pair) => {
                const currentScore = parseFloat(pair.score) || 0;
                const totalBoundScore = parseFloat(pair.totalScore) || 100;

                if (currentScore === 0) {
                    structuralMissingItemsCount++;
                    targetMissingRowRef = {
                        configName: config.inputName || "Exam/Assessment",
                        totalBoundScore: totalBoundScore
                    };
                    missingItemVarWeight = varWeightCoefficient;
                    missingConfigWeight = configPercentageWeight;
                    missingItemConfigItemsCount = itemsInConfigCount;
                }

                // (Score / Total * 50) + 50
                const normalizedInstanceScore = ((currentScore / totalBoundScore) * 50) + 50;
                configPairsSum += normalizedInstanceScore;
            });

            const averageConfigScore = itemsInConfigCount > 0 ? (configPairsSum / itemsInConfigCount) : 0;

            const finalWeightedConfigValue = averageConfigScore * configPercentageWeight;
            variableSumAccumulator += finalWeightedConfigValue;

            componentBreakdown[varName].configs.push({
                name: config.inputName,
                average: averageConfigScore,
                weighted: finalWeightedConfigValue
            });
        });

        const finalComputedVariableValue = variableSumAccumulator * varWeightCoefficient;
        variableCalculatedValues[varName] = finalComputedVariableValue;
        componentBreakdown[varName].totalVarScore = variableSumAccumulator; 
    });

    let computedFinalOverallGrade = 0;
    formulaVariables.forEach(v => {
        computedFinalOverallGrade += (variableCalculatedValues[v] || 0);
    });

    if (structuralMissingItemsCount === 1 && targetMissingRowRef && missingItemVarWeight > 0 && missingConfigWeight > 0 && missingItemConfigItemsCount > 0) {
        const standardPassingMark = 75;
        const currentDeficit = standardPassingMark - computedFinalOverallGrade;

        if (currentDeficit > 0) {
            const neededConfigPoints = currentDeficit / missingItemVarWeight; 

            const neededAverageIncrease = neededConfigPoints / missingConfigWeight;

            
            const neededNormalizedScoreForThisItem = 50 + (neededAverageIncrease * missingItemConfigItemsCount);

            const targetScoreValue = ((neededNormalizedScoreForThisItem - 50) / 50) * targetMissingRowRef.totalBoundScore;
            const requiredPercentageRatio = (targetScoreValue / targetMissingRowRef.totalBoundScore) * 100;

            if (requiredPercentageRatio <= 100) {
                passPredictions.push({
                    itemTitle: targetMissingRowRef.configName,
                    requiredPercentage: Math.max(0, Math.round(requiredPercentageRatio * 100) / 100),
                    requiredScore: Math.max(0, Math.round(targetScoreValue * 100) / 100),
                    maxPoints: targetMissingRowRef.totalBoundScore
                });
            }
        }
    }

    return {
        finalGrade: Math.min(100, Math.round(computedFinalOverallGrade * 100) / 100),
        breakdown: componentBreakdown,
        passPredictions: passPredictions
    };
}

async function fetchAndRenderCourses(uid) {
    if (!coursesGridContainer) return;

    try {
        const coursesCollectionRef = collection(db, "users", uid, "courses");
        const querySnapshot = await getDocs(coursesCollectionRef);
        
        let coursesList = [];
        let totalWeightedGradesAccumulator = 0;
        let totalCreditUnitsAccumulator = 0;
        let globalPassPredictionsList = [];

        if (querySnapshot.empty) {
            coursesGridContainer.innerHTML = `<p class="no-courses">No courses added yet. Click "+ Add New Course" to begin.</p>`;
            if (alertBannersContainer) alertBannersContainer.innerHTML = `<p class="no-courses empty-notifications-placeholder">No notification.</p>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            coursesList.push({ id: doc.id, ...data });
        });

        coursesList.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateA - dateB; 
        });

        localCachedCoursesList = coursesList;

        let gridHTML = "";
        
        for (let courseData of coursesList) {
            const courseName = courseData.courseName || "Unnamed Course";
            const courseCode = courseData.courseCode || "N/A";
            const professor = courseData.instructor || "N/A";
            const formula = courseData.selectedFormula || "";
            const units = courseData.creditUnits !== undefined ? parseFloat(courseData.creditUnits) : 0;
            
            const componentsDistribution = courseData.componentsDistribution || {};
            
            const analysis = calculateCourseGradeMetrics(formula, componentsDistribution);
            const finalGrade = formula ? analysis.finalGrade : 0;

            if (analysis.passPredictions && analysis.passPredictions.length > 0) {
                analysis.passPredictions.forEach(pred => {
                    globalPassPredictionsList.push({
                        course: courseName,
                        ...pred
                    });
                });
            }

            if (formula && !isNaN(analysis.finalGrade) && units > 0) {
                totalWeightedGradesAccumulator += (analysis.finalGrade * units);
                totalCreditUnitsAccumulator += units;
            }
            
            const componentsDistributionStr = JSON.stringify(componentsDistribution);

            gridHTML += `
                <a href="javascript:void(0);"
                    class="check-card-trigger"
                    data-course="${courseName}"
                    data-code="${courseCode}"
                    data-id="${courseData.id}"
                    data-professor="${professor}"
                    data-grade="${determinePUPStatus(finalGrade).scale}"
                    data-units="${units}"
                    data-formula="${encodeURIComponent(formula)}"
                    data-distribution="${encodeURIComponent(componentsDistributionStr)}">
                    <div class="course-card"> 
                        <div class="course-top">
                            <h4 class="course-title">${courseName}</h4>
                        </div>
                        <div class="grade-highlight text-green">${finalGrade}%</div>
                        <div class="course-bottom">
                            <div class="course-info" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                                <div>
                                    <span class="course-code">${courseCode}</span>
                                    <p class="professor" style="margin: 2px 0 0 0;">${professor}</p>
                                </div>
                                <span class="units-badge">${units} Units</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
        }

        coursesGridContainer.innerHTML = gridHTML;

        // Sum of all (Course Grade * Credit Units) / Sum of Credit Units
        if (totalCreditUnitsAccumulator > 0) {
            const calculatedFinalGwaScore = totalWeightedGradesAccumulator / totalCreditUnitsAccumulator;
            
            const gwaSummaryDisplay = document.getElementById("dashboard-calculated-gwa");
            if (gwaSummaryDisplay) {
                gwaSummaryDisplay.textContent = calculatedFinalGwaScore.toFixed(2) + "%";
            }
            const sidebarGwa = document.querySelector("#GWA-actual-prediction");
            if (sidebarGwa) {
                sidebarGwa.textContent = determinePUPStatus(calculatedFinalGwaScore).scale + " ("+ calculatedFinalGwaScore.toFixed(2) + "%)";
            }
            const sidebarStatus = document.querySelector(".status-text");
            if (sidebarStatus) {
                sidebarStatus.textContent = determinePUPStatus(calculatedFinalGwaScore).description;
            }
        }

        if (alertBannersContainer) {
            alertBannersContainer.innerHTML = "";
            
            if (globalPassPredictionsList.length > 0) {
                globalPassPredictionsList.forEach(p => {
                    const bannerNode = document.createElement("div");
                    bannerNode.className = "banner warning";
                    bannerNode.innerHTML = `
                        <span class="banner-icon">!</span>
                        <div class="banner-text">
                            <strong>${p.course}</strong>
                            <p>
                                Target Requirement: You must achieve at least <strong>${p.requiredPercentage.toFixed(1)}%</strong> on your upcoming missing component <strong>"${p.itemTitle}"</strong> to secure an overall passing baseline grade of 75.0%.
                            </p>
                        </div>
                    `;
                    alertBannersContainer.appendChild(bannerNode);
                });
            } else {
                alertBannersContainer.innerHTML = `<p class="no-courses empty-notifications-placeholder">No active grade alerts or missing structural assignments detected.</p>`;
            }
        }

    } catch (error) {
        console.error("Error pulling course collections:", error);
        coursesGridContainer.innerHTML = `<p>Error loading dashboard cards.</p>`;
    }
}

async function confirmDeleteCard(confirmation) {
    const user = auth.currentUser;
    if (!user || !activeDocId) return;

    if (confirmation) {
        try {
            const targetDocRef = doc(db, "users", user.uid, "courses", activeDocId);
            await deleteDoc(targetDocRef);
            window.location.reload();
        } catch (err) {
            console.error("Error attempting to delete firestore record:", err);
            alert("An error occurred while deleting the course from the database.");
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const cardModal = document.getElementById("card-modal");
    const dynamicContainer = document.getElementById("dynamic-sections-container");
    const editModalBtn = document.querySelector(".edit-modal-btn");

    if (cardModal) {
        const structuralIconElement = cardModal.querySelector(".settings-gear");
        if (structuralIconElement) {
            structuralIconElement.innerHTML = "&#128465;"; 
            structuralIconElement.className = "settings-gear trash-btn";
            structuralIconElement.title = "Delete this course";
            
            structuralIconElement.addEventListener("click", async (e) => {
                let confirmationDelete = false;

                e.preventDefault();
                const user = auth.currentUser;
                if (!user || !activeDocId) return;

                if (confirmDeleteCourseModalCancelButtonID && confirmDeleteYesButtonID && confirmDeleteNoButtonID && confirmDeleteCourseModalID) {
                    e.preventDefault();
                    confirmDeleteCourseModalID.classList.add("is-active");

                    confirmDeleteNoButtonID.addEventListener("click", () => {
                        confirmDeleteCourseModalID.classList.remove("is-active");
                    });

                    confirmDeleteCourseModalID.addEventListener("click", (e) => {
                        if (e.target === confirmDeleteCourseModalID) {
                            confirmDeleteCourseModalID.classList.remove("is-active");
                        }
                    });

                    confirmDeleteCourseModalCancelButtonID.addEventListener("click", () => {
                        confirmDeleteCourseModalID.classList.remove("is-active");
                    });

                    confirmDeleteYesButtonID.addEventListener("click", () => {
                        confirmationDelete = true;
                        confirmDeleteCard(confirmationDelete);
                        confirmDeleteCourseModalID.classList.remove("is-active");
                    });


                }

                
            });
        }
    }

    if (coursesGridContainer && cardModal) {
        coursesGridContainer.addEventListener("click", (e) => {
            const trigger = e.target.closest(".check-card-trigger");
            if (!trigger) return;

            e.preventDefault();
            resetModalEditState();

            const course = trigger.getAttribute("data-course") || "N/A";
            const code = trigger.getAttribute("data-code") || "N/A";
            const id = trigger.getAttribute("data-id") || code; 
            const professor = trigger.getAttribute("data-professor") || "N/A";
            const grade = trigger.getAttribute("data-grade") || "N/A";
            const unitsScore = trigger.getAttribute("data-units") || "N/A";
            
            activeCourseCode = code; 
            activeDocId = id; 
            
            const rawDistribution = trigger.getAttribute("data-distribution");
            try {
                localComponentsDistribution = rawDistribution ? JSON.parse(decodeURIComponent(rawDistribution)) : {};
            } catch (err) {
                console.error("Error parsing componentsDistribution:", err);
                localComponentsDistribution = {};
            }

            if (cardModal.querySelector(".modal-title")) cardModal.querySelector(".modal-title").textContent = course;
            if (cardModal.querySelector(".modal-course")) cardModal.querySelector(".modal-course").textContent = code;
            if (cardModal.querySelector("#modal-prof-name")) cardModal.querySelector("#modal-prof-name").textContent = professor;
            if (cardModal.querySelector("#modal-current-score")) cardModal.querySelector("#modal-current-score").textContent = grade;
            if (cardModal.querySelector("#modal-units-score")) cardModal.querySelector("#modal-units-score").textContent = unitsScore + " Units";

            renderDynamicSections();
            cardModal.classList.add("is-active");
        });
    }

    function resetModalEditState() {
        isEditMode = false;
        if (editModalBtn) {
            editModalBtn.style.opacity = "1";
            editModalBtn.style.color = "";
            editModalBtn.style.cursor = "pointer";
            editModalBtn.style.pointerEvents = "auto";
        }
        removeEditActionButtons();
    }

    function renderDynamicSections() {
        if (!dynamicContainer) return;
        dynamicContainer.innerHTML = "";

        const triggerSource = document.querySelector(`.check-card-trigger[data-code="${activeCourseCode}"]`);
        const decodedFormula = triggerSource ? decodeURIComponent(triggerSource.getAttribute("data-formula")) : "";
        const modalFormula = document.getElementById("course-formula-modal");

        if (decodedFormula && decodedFormula !== "No formula specified") {
            try {
                const node1 = math.parse(decodedFormula);
                const node1ToTex = node1.toTex();

                if (modalFormula) modalFormula.innerHTML = `\\(${node1ToTex}\\)`;

                const variables = [];
                node1.filter((node) => node.isSymbolNode).forEach((symbolNode) => {
                    if (!variables.includes(symbolNode.name) && !math[symbolNode.name]) {
                        variables.push(symbolNode.name);
                    }
                });

                const currentCalculations = calculateCourseGradeMetrics(decodedFormula, localComponentsDistribution);
                console.log(calculateCourseGradeMetrics(decodedFormula, localComponentsDistribution));

                if (variables.length > 0) {
                    let dynamicHTML = "";

                    variables.forEach((varName) => {
                        const displayHeader = varName.toUpperCase();
                        const componentData = localComponentsDistribution[varName] || localComponentsDistribution[varName.toLowerCase()] || null;
                        const configsArray = (componentData && componentData.configs) ? componentData.configs : [];

                        let tableRowsHTML = "";

                        if (configsArray.length === 0) {
                            tableRowsHTML = `<tr><td colspan="${isEditMode ? 4 : 3}" style="text-align: center; color: #888; padding: 10px;">No records registered for ${varName} yet.</td></tr>`;
                        } else {
                            configsArray.forEach((config, configIdx) => {
                                const itemTitle = config.inputName ? config.inputName.toUpperCase() : "ASSESSMENT";
                                const distributionNumber = config.percentageDistribution !== undefined ? `${config.percentageDistribution}%` : "0%";

                                tableRowsHTML += `
                                    <tr style="background-color: #f7f9fa; font-weight: bold; border-bottom: 2px solid #eaeaea;">
                                        <td colspan="${isEditMode ? 4 : 3}" style="color: #64748b; padding: 8px; font-size: 0.9rem; text-align: left;">
                                            ${itemTitle} (Weight: ${distributionNumber})
                                        </td>
                                    </tr>
                                `;
                                
                                if (config.scorePairs && Array.isArray(config.scorePairs)) {
                                    config.scorePairs.forEach((pair, pairIdx) => {
                                        const itemName = `${itemTitle} — Entry #${pairIdx + 1}`;
                                        const itemScore = pair.score !== undefined ? pair.score : "0";
                                        const itemMax = pair.totalScore !== undefined ? pair.totalScore : "0";

                                        tableRowsHTML += `
                                            <tr data-var="${varName}" data-config="${configIdx}" data-pair="${pairIdx}">
                                                ${isEditMode ? `
                                                <td class="action-cell">
                                                    <button type="button" class="inline-edit-row-btn config-title-edit-btn edit-field-btn pct-edit-btn" style="display: block; padding: 2px 8px; height: 24px; font-size: 0.75rem; cursor: pointer; background-color: #fff; color: #f49223; border: 1px solid #f49223; border-radius: 6px; font-weight: 600; transition: all 0.25s ease-in-out; white-space: nowrap; margin: 0 auto; box-sizing: border-box;">Edit</button>
                                                </td>` : ''}
                                                <td style="padding-left: 20px; font-size: 0.85rem; color: #555; text-align: left;">${itemName}</td>
                                                <td class="score-cell" style="font-weight: 600; color: #333; text-align: left;">${itemScore}</td>
                                                <td class="total-cell" data-max="${itemMax}" style="color: #666; text-align: left;">${itemMax}</td>
                                            </tr>
                                        `;
                                    });
                                }
                            });
                        }

                        const varStandingScore = currentCalculations.breakdown[varName] ? currentCalculations.breakdown[varName].totalVarScore : 0;

                        dynamicHTML += `
                            <div class="section-wrapper" style="margin-bottom: 24px;">
                                <div class="class-standing-header" style="font-weight: bold; font-size: 1.1rem; color: #333; margin-bottom: 8px; text-align: left;">
                                    ${displayHeader}
                                </div>
                                <hr class="dashboard-divider">
                                <div class="breakdown-container nested-container">
                                    <div class="component-section full-width-section">
                                        <div class="table-wrapper">
                                            <table class="grades-table">
                                                <thead style="display: table-header-group;">
                                                    <tr>
                                                        ${isEditMode ? '<th class="action-header">Action</th>' : ''}
                                                        <th style="text-align: left;">Item Reference</th>
                                                        <th class="score-header" style="text-align: left;">Score</th>
                                                        <th class="total-header" style="text-align: left;">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${tableRowsHTML}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer-grades" style="margin-top: 10px; text-align: right;">
                                    <div>Total Component Component Grade: <span class="bold">${varStandingScore.toFixed(2)}%</span></div>
                                </div>
                            </div>
                        `;
                    });

                    dynamicContainer.innerHTML = dynamicHTML;

                    if (isEditMode) {
                        attachInlineRowListeners();
                    }
                }
            } catch (err) {
                console.error("Math.js parsing failed on this formula string:", err);
                if (modalFormula) modalFormula.textContent = decodedFormula; 
            }
        } else {
            if (modalFormula) modalFormula.textContent = "N/A"; 
            if (dynamicContainer) dynamicContainer.innerHTML = "<p style='color: #666; padding: 10px;'>Setup a formula rule to track detailed components.</p>";
        }
        
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([modalFormula]).catch((err) => console.error(err));
        }
    }

    if (editModalBtn) {
        editModalBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (isEditMode) return;
            
            isEditMode = true;
            localBackupDistribution = JSON.parse(JSON.stringify(localComponentsDistribution));

            editModalBtn.style.color = "#444444";
            editModalBtn.style.opacity = "0.5";
            editModalBtn.style.cursor = "not-allowed";
            editModalBtn.style.pointerEvents = "none";

            renderDynamicSections();
            insertActionButtons();
        });
    }

    function attachInlineRowListeners() {
        const rowEditButtons = cardModal.querySelectorAll(".inline-edit-row-btn");
        rowEditButtons.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const tr = e.target.closest("tr");
                const scoreCell = tr.querySelector(".score-cell");

                if (scoreCell.querySelector("input")) return; 

                const currentScore = scoreCell.textContent.trim();
                scoreCell.innerHTML = `<input type="number" class="edit-input-score" value="${currentScore}" style="animation: fadeInSlide 0.2s ease-out;">`;

                const scoreInput = scoreCell.querySelector(".edit-input-score");
                scoreInput.focus();

                scoreInput.addEventListener("keydown", (evt) => {
                    if (evt.key === "Enter") {
                        saveRowInputsToLocalState(tr);
                    }
                });
            });
        });
    }

    function saveRowInputsToLocalState(tr) {
        const scoreInput = tr.querySelector(".edit-input-score");
        if (!scoreInput) return true;

        const newScore = parseFloat(scoreInput.value) || 0;
        const totalCell = tr.querySelector(".total-cell");
        const maxScore = parseFloat(totalCell.getAttribute("data-max")) || 0;

        if (newScore > maxScore || newScore < 0) {
            scoreInput.classList.add("input-error");
            return false;
        }

        scoreInput.classList.remove("input-error");
        const varName = tr.dataset.var;
        const configIdx = parseInt(tr.dataset.config);
        const pairIdx = parseInt(tr.dataset.pair);

        let key = localComponentsDistribution[varName] ? varName : varName.toLowerCase();
        
        if (localComponentsDistribution[key]?.configs?.[configIdx]?.scorePairs?.[pairIdx]) {
            localComponentsDistribution[key].configs[configIdx].scorePairs[pairIdx].score = newScore;
        }

        tr.querySelector(".score-cell").innerHTML = newScore;
        return true;
    }

    function insertActionButtons() {
        removeEditActionButtons(); 

        const actionContainer = document.createElement("div");
        actionContainer.id = "edit-actions-footer-container";
        actionContainer.style.cssText = "display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 25px; padding: 15px 24px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; transition: all 0.3s ease;";

        actionContainer.innerHTML = `
            <button id="modal-edit-cancel" style="color: #fff; cursor: pointer; border: none; border-radius: 8px; margin-top: .5rem; padding: .4rem 2.5rem; font-size: 16px; transition-duration: .7s; background-color: #959191;">Cancel</button>
            <button id="modal-edit-save" style="color: #fff; cursor: pointer; border: none; border-radius: 8px; margin-top: .5rem; padding: .4rem 2.5rem; font-size: 16px; transition-duration: .7s; background: #ff8000;">Save Changes</button>
        `;

        cardModal.querySelector(".modal-card2").appendChild(actionContainer);

        const saveBtnElement = document.getElementById("modal-edit-save");
        const cancelBtnElement = document.getElementById("modal-edit-cancel");

        cancelBtnElement.addEventListener("click", () => {
            resetModalEditState();
            localComponentsDistribution = JSON.parse(JSON.stringify(localBackupDistribution));
            renderDynamicSections();
        });

        saveBtnElement.addEventListener("click", async () => {
            const activeInputs = cardModal.querySelectorAll("tr[data-var]");
            let allValid = true;

            activeInputs.forEach(row => {
                if (!saveRowInputsToLocalState(row)) {
                    allValid = false;
                }
            });

            if (!allValid) return;

            const currentDataStr = JSON.stringify(localComponentsDistribution);
            const backupDataStr = JSON.stringify(localBackupDistribution);

            if (currentDataStr === backupDataStr) {
                saveBtnElement.classList.add("btn-shake-error");
                
                setTimeout(() => {
                    saveBtnElement.classList.remove("btn-shake-error");
                }, 500);
                
                return;
            }

            const user = auth.currentUser;
            if (!user || !activeCourseCode) return;

            saveBtnElement.textContent = "Saving...";
            saveBtnElement.disabled = true;

            try {
                let courseDocRef = doc(db, "users", user.uid, "courses", activeDocId);
                let docSnap = await getDoc(courseDocRef);

                if (!docSnap.exists()) {
                    const coursesCollectionRef = collection(db, "users", user.uid, "courses");
                    const snapshot = await getDocs(coursesCollectionRef);
                    let foundMatch = false;

                    snapshot.forEach((courseDoc) => {
                        const data = courseDoc.data();
                        if (data.courseCode === activeCourseCode) {
                            courseDocRef = doc(db, "users", user.uid, "courses", courseDoc.id);
                            foundMatch = true;
                        }
                    });

                    if (!foundMatch) throw new Error(`No matching document found.`);
                }
                
                await updateDoc(courseDocRef, {
                    componentsDistribution: localComponentsDistribution,
                    updatedAt: new Date()
                });

                const triggerSource = document.querySelector(`.check-card-trigger[data-code="${activeCourseCode}"]`);
                if (triggerSource) {
                    triggerSource.setAttribute("data-distribution", encodeURIComponent(JSON.stringify(localComponentsDistribution)));
                }

                resetModalEditState();
                renderDynamicSections();
                cardModal.classList.remove("is-active");
                location.reload();

            } catch (error) {
                console.error("Error updating Firestore data entries:", error);
                alert("Failed to sync grade changes with database server.");
                saveBtnElement.textContent = "Save Changes";
                saveBtnElement.disabled = false;
            }
        });
    }

    function removeEditActionButtons() {
        const existingContainer = document.getElementById("edit-actions-footer-container");
        if (existingContainer) existingContainer.remove();
    }

    const closeModalBtn2 = document.getElementById("close-modal-btn2");
    if (closeModalBtn2) {
        closeModalBtn2.addEventListener("click", () => {
            resetModalEditState();
            cardModal.classList.remove("is-active");
        });
    }

    if (cardModal) {
        cardModal.addEventListener("click", (e) => {
            if (e.target === cardModal) {
                resetModalEditState();
                cardModal.classList.remove("is-active");
            }
        });
    }

    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        logoutButton.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                logoutButton.innerHTML = "logging out...";
                setTimeout(() => signOut(auth), 1000);
            } catch (error) {
                console.error(error);
            }
        });
    }

    const gwaTrigger = document.getElementById("check-gwa-trigger");
    const gwaModal = document.getElementById("gwa-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");

    if (gwaTrigger && gwaModal && closeModalBtn) {
        gwaTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            gwaModal.classList.add("is-active");
            
            if (gwaTrigger && gwaModal && closeModalBtn) {
                gwaTrigger.addEventListener("click", (e) => {
                    e.preventDefault();
                    
                    renderGwaModalContents(); 
                    
                    gwaModal.classList.add("is-active");
                });
                closeModalBtn.addEventListener("click", () => gwaModal.classList.remove("is-active"));
                gwaModal.addEventListener("click", (e) => {
                    if (e.target === gwaModal) gwaModal.classList.remove("is-active");
                });
            } 
        });
        closeModalBtn.addEventListener("click", () => gwaModal.classList.remove("is-active"));
        gwaModal.addEventListener("click", (e) => {
            if (e.target === gwaModal) gwaModal.classList.remove("is-active");
        });
    }
});

const setGoalsTriggers = [
    ...document.querySelectorAll("a"),
    ...document.querySelectorAll("button"),
    ...document.querySelectorAll("*")
].filter((element) => {
    const text = element.textContent?.trim();
    return (text === "Set Goals" || text === "Change your goal here...");
});

const goalsModal = document.getElementById("goals-modal");
const closeGoalsModalBtn = document.getElementById("close-goals-modal");
const goalSlider = document.getElementById("goal-slider");
const goalValueDisplay = document.getElementById("goal-value-display");
const saveGoalBtn = document.getElementById("save-goal-btn");

function updateGwaCardUI(selectedGoal) {
    const formattedGoal = parseFloat(selectedGoal).toFixed(2);
    const goalCard = document.querySelector(".card-container");

    if (goalCard) {
        const finalGradeElement = goalCard.querySelector(".final-grade");
        const alertTextElement = goalCard.querySelector(".alert-text");

        if (finalGradeElement) {
            const percentageEquivalent = Math.max(65, Math.round(100 - ((selectedGoal - 1) * 12)));
            finalGradeElement.textContent = `${formattedGoal} (${percentageEquivalent}%)`;
        }

        // if (alertTextElement) {
        //     if (selectedGoal <= 1.75) {
        //         alertTextElement.textContent = "ACADEMIC EXCELLENCE TARGET";
        //         alertTextElement.style.color = "#2e7d32";
        //     } else if (selectedGoal <= 2.50) {
        //         alertTextElement.textContent = "YOU ARE ON TRACK";
        //         alertTextElement.style.color = "#f49223";
        //     } else {
        //         alertTextElement.textContent = "YOU HAVE NOT REACHED YOUR GOAL";
        //         alertTextElement.style.color = "#cc0000";
        //     }
        // }
    }
}

if (goalsModal && closeGoalsModalBtn && goalSlider && goalValueDisplay) {
    setGoalsTriggers.forEach((trigger) => {
        trigger.addEventListener("click", (e) => {
            e.preventDefault();
            goalsModal.classList.add("active");
        });
    });

    const closeGoalsModal = () => { goalsModal.classList.remove("active"); };
    closeGoalsModalBtn.addEventListener("click", closeGoalsModal);
    
    goalsModal.addEventListener("click", (e) => {
        if (e.target === goalsModal) { closeGoalsModal(); }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && goalsModal.classList.contains("active")) {
            closeGoalsModal();
        }
    });

    goalSlider.addEventListener("input", () => {
        goalValueDisplay.textContent = parseFloat(goalSlider.value).toFixed(2);
    });

    saveGoalBtn.addEventListener("click", async () => {
        const selectedGoal = parseFloat(goalSlider.value);
        const user = auth.currentUser;

        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);

                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const currentGoal = userData.gwaGoal ? parseFloat(userData.gwaGoal) : null;

                    if (currentGoal !== null && selectedGoal === currentGoal) {
                        saveGoalBtn.classList.add("btn-shake-error");
                        
                        setTimeout(() => {
                            saveGoalBtn.classList.remove("btn-shake-error");
                        }, 500);
                        
                        return;
                    }
                }

                saveGoalBtn.textContent = "Saving...";
                saveGoalBtn.disabled = true;
                
                await updateDoc(userDocRef, {
                    gwaGoal: selectedGoal
                });

                console.log("Preferred Goal Saved to profile:", selectedGoal.toFixed(2));
                updateGwaCardUI(selectedGoal);
                closeGoalsModal();
                location.reload();
            } catch (error) {
                console.error("Error saving goal value to document:", error);
            } finally {
                saveGoalBtn.textContent = "Save Goal";
                saveGoalBtn.disabled = false;
            }
        } else {
            updateGwaCardUI(selectedGoal);
            closeGoalsModal();
        }
    });

}

function renderGwaModalContents() {
    const modalGwaNumber = document.getElementById("modal-gwa-summary-number");
    const modalGradesList = document.getElementById("modal-gwa-grades-list");
    
    if (!modalGradesList) return;
    modalGradesList.innerHTML = "";

    let totalWeightedGradesAccumulator = 0;
    let totalCreditUnitsAccumulator = 0;
    let listHTML = "";

    localCachedCoursesList.forEach(courseData => {
        const courseName = courseData.courseName || "Unnamed Course";
        const formula = courseData.selectedFormula || "";
        const units = courseData.creditUnits !== undefined ? parseFloat(courseData.creditUnits) : 0;
        const componentsDistribution = courseData.componentsDistribution || {};
        const analysis = calculateCourseGradeMetrics(formula, componentsDistribution);
        const pupMetrics = formula ? determinePUPStatus(analysis.finalGrade) : { scale: "-", description: "--" };
        if (formula && !isNaN(analysis.finalGrade) && units > 0) {
            totalWeightedGradesAccumulator += (analysis.finalGrade * units);
            totalCreditUnitsAccumulator += units;
        }

        let colorClass = "grey";
        if (pupMetrics.scale !== "-") {
            const scaleNum = parseFloat(pupMetrics.scale);
            if (scaleNum <= 1.75) colorClass = "green";
            else if (scaleNum <= 3.00) colorClass = "orange";
            else colorClass = "red";
        }

        listHTML += `
            <li class="grade-item">
                <span class="item-prefix">> </span>
                <span class="modal-course-code">${courseName}</span>
                <span class="grade-score ${colorClass}">${pupMetrics.scale}</span>
            </li>
        `;
    });

    modalGradesList.innerHTML = listHTML;

    if (totalCreditUnitsAccumulator > 0) {
        const globalFinalGwaScore = totalWeightedGradesAccumulator / totalCreditUnitsAccumulator;
        if (modalGwaNumber) {
            modalGwaNumber.textContent = determinePUPStatus(globalFinalGwaScore).scale;
        }
    } else {
        if (modalGwaNumber) modalGwaNumber.textContent = "-.--";
    }
}

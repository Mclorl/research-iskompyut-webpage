import { db, auth } from "./index.js";
import { doc, getDoc, collection, addDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, getAuth } from "firebase/auth";

import * as math from 'mathjs';

const courseNameID = document.getElementById("course-name");
const instructorID = document.getElementById("prof-name");
const courseCodeID = document.getElementById("course-code");
const creditUnitsID = document.getElementById("credit-units");
const buttonSaveCourse = document.getElementById("saveCourse");
const warningMessage = document.getElementById("warning-message");

// mathjax id
const minorFormulaID = document.getElementById("minor-formula-p");
const majorFormulaID = document.getElementById("major-formula-p");
const customFormulaID = document.getElementById("custom-formula-p");

const customFormulaInputID = document.getElementById("customized-formula");

// chosen formula p
const chosenFormulaID = document.getElementById("chosen-formula");

// button action
const minorFormulaButtonID = document.getElementById("minorFormula");
const majorFormulaButtonID = document.getElementById("majorFormula");
const customFormulaButtonID = document.getElementById("customFormula");
const cancelCourseButtonID = document.getElementById("cancelCourse");
const dashboardLinkId = document.getElementById("dashboard");
const closeModalBtn = document.getElementById("close-modal-btn");
const dashboardModalBtn = document.getElementById("db-modal-btn");
const closeButtonConfirmationYesID = document.getElementById("cancel-yes-button-ID");
const closeButtonConfirmationNoID = document.getElementById("cancel-no-button-ID");

const dashboardButtonConfirmationYesID = document.getElementById("dashboard-yes-button-ID");
const dashboardButtonConfirmationNoID = document.getElementById("dashboard-no-button-ID");

const cancelModalID = document.getElementById("cancel-modal");
const dashboardModalID = document.getElementById("dashboard-modal");

// input grades div
const inputGradesCardID = document.getElementById("input-grades-card");

const rawMinorFormula = "class_standard*0.70+exam*0.30";
const rawMajorFormula = "class_standard*0.60+exam*0.40";
let rawCustomFormula;

let selectedRawFormula = ""; 

const parserMinor = math.parse(rawMinorFormula);
const parserMajor = math.parse(rawMajorFormula);
let parserCustom;

const minorFormulaLatex = '$$' + parserMinor.toTex() + '$$';
const majorFormulaLatex = '$$' + parserMajor.toTex() + '$$';
let customFormulaLatex;

minorFormulaID.innerHTML = minorFormulaLatex;
majorFormulaID.innerHTML = majorFormulaLatex;

// global variable names
let globalVariableNames;

const styleSheetToken = document.createElement("style");
styleSheetToken.textContent = `
    .config-header-row, .score-input-pair {
        position: relative !important;
    }
    .add-pair-trigger-btn:hover, .add-config-trigger-btn:hover {
        background: #dcfce7 !important;
        border-color: #86efac !important;
        color: #15803d !important;
    }
    .delete-overlay-btn {
        position: absolute;
        top: 6px;
        right: 6px;
        background: #fee2e2;
        color: #ef4444;
        border: 1px solid #fca5a5;
        border-radius: 4px;
        width: 20px;
        height: 20px;
        font-size: 10px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease, background 0.2s ease;
        z-index: 20;
    }
    .config-header-row:hover .delete-overlay-btn,
    .score-input-pair:hover .delete-overlay-btn {
        opacity: 1;
    }
    .delete-overlay-btn:hover {
        background: #fecaca;
        color: #dc2626;
    }
    .weight-input-invalid {
        border: 2px solid red !important;
        background-color: #fef2f2 !important;
    }
`;
document.head.appendChild(styleSheetToken);

function renderInitialFormulas() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([minorFormulaID, majorFormulaID])
            .then(() => console.log("Initial formulas rendered successfully!"))
            .catch((err) => console.error("Initial render failed:", err));
    } else {
        setTimeout(renderInitialFormulas, 200);
    }
}
renderInitialFormulas();

// mathjs function
let formulaInputVar;
let turnIntoLaTex;

customFormulaInputID.addEventListener("input", function() {
    const userInput = customFormulaInputID.value.trim();
    rawCustomFormula = userInput;

    if (!userInput) {
        customFormulaID.innerHTML = "Your formula will show up here.";
        customFormulaID.style.color = "black";
        return;
    }

    try {
        formulaInputVar = math.parse(rawCustomFormula);
        parserCustom = math.parse(rawCustomFormula);

        turnIntoLaTex = '$$' + formulaInputVar.toTex() + '$$';
        customFormulaLatex = turnIntoLaTex;

        customFormulaID.innerHTML = ''; 
        customFormulaID.textContent = turnIntoLaTex;
        customFormulaID.style.color = "black";
        
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetClear([customFormulaID]);
            window.MathJax.typesetPromise([customFormulaID])
                .catch((err) => console.log("Live render error:", err.message));
        }

    } catch (error) {
        customFormulaID.innerHTML = `<span style="color: #888; font-style: italic;">${userInput}</span>`;
    }
});

let userUID;

function showWarning(message) {
    warningMessage.style.display = "block";
    warningMessage.innerHTML = message;
    warningMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function validateAndCollectData() {

    if (!courseNameID.value.trim() || !instructorID.value.trim() || !courseCodeID.value.trim() || !creditUnitsID.value.trim()) {
        showWarning("Core course details are incomplete. Please ensure Course Name, Instructor, Course Code, and Credit Units are filled out.");
        return null;
    }

    if (!selectedRawFormula) {
        showWarning("No grading formula selected. Please choose Minor, Major, or your Custom formula variant.");
        return null;
    }

    const gradingSystemDistribution = {};
    const inputCards = inputGradesCardID.querySelectorAll(".inputCard");

    if (inputCards.length === 0) {
        showWarning("No structural grading configuration setup cards were generated.");
        return null;
    }

    for (let card of inputCards) {
        const variableName = card.getAttribute("data-variable");
        const configGroups = card.querySelectorAll(".scoring-setup-group");
        const distOfConfigs = configGroups.length;

        if (distOfConfigs === 0) {
            showWarning(`Please append at least one configuration distribution structure component for: <strong>${variableName}</strong>.`);
            return null;
        }

        let totalWeightSum = 0;
        configGroups.forEach(group => {
            const percentageInput = group.querySelector('input[name="config-percentage"]');
            const value = parseFloat(percentageInput.value.trim()) || 0;
            totalWeightSum += value;
        });

        if (totalWeightSum !== 100) {
            configGroups.forEach(group => {
                const percentageInput = group.querySelector('input[name="config-percentage"]');
                percentageInput.classList.add("weight-input-invalid");
            });
            showWarning(`The configuration weight percentages for <strong>${variableName}</strong> must sum to exactly 100%. Currently, they add up to: <strong>${totalWeightSum}%</strong>.`);
            return null;
        } else {
            configGroups.forEach(group => {
                const percentageInput = group.querySelector('input[name="config-percentage"]');
                percentageInput.classList.remove("weight-input-invalid");
            });
        }

        gradingSystemDistribution[variableName] = {
            distributionCount: distOfConfigs,
            configs: []
        };

        for (let cIdx = 0; cIdx < configGroups.length; cIdx++) {
            const configGroup = configGroups[cIdx];
            const configIndex = cIdx + 1;

            const titleInput = configGroup.querySelector('input[type="text"]');
            const titleValue = titleInput.value.trim();

            if (!titleValue) {
                showWarning(`Title missing on <strong>${variableName}</strong> &rarr; Item Group #${configIndex}.`);
                return null;
            }

            const percentageInput = configGroup.querySelector('input[name="config-percentage"]');
            const pctValue = percentageInput.value.trim();

            if (!pctValue) {
                showWarning(`Component <strong>${variableName}</strong> &rarr; Item Group #${configIndex} ("${titleValue}") target distribution weight percentage value is missing.`);
                return null;
            }

            const scorePairBlocks = configGroup.querySelectorAll(".score-input-pair");
            const scorePairsCount = scorePairBlocks.length;

            if (scorePairsCount === 0) {
                showWarning(`Item assessment count elements not configured for title "<strong>${titleValue}</strong>".`);
                return null;
            }

            const configProfile = {
                configNo: configIndex,
                inputName: titleValue,
                percentageDistribution: parseFloat(pctValue),
                selectCount: scorePairsCount,
                scorePairs: []
            };

            for (let pIdx = 0; pIdx < scorePairBlocks.length; pIdx++) {
                const pairBlock = scorePairBlocks[pIdx];
                const pairIndex = pIdx + 1;

                const totalInput = pairBlock.querySelector('input[name="total-score"]');
                const totalValue = totalInput.value.trim();

                if (!totalValue) {
                    showWarning(`Specify a Total Max score bounds value for listing item #${pairIndex} inside assessment component "${titleValue}".`);
                    return null;
                }

                configProfile.scorePairs.push({
                    score: 0,
                    totalScore: parseInt(totalValue)
                });
            }

            gradingSystemDistribution[variableName].configs.push(configProfile);
        }
    }

    warningMessage.style.display = "none";
    return gradingSystemDistribution;
}

async function addNewCourse() {
    if (!userUID) {
        console.error("No authenticated session available.");
        return;
    }

    const distributionPayload = validateAndCollectData();
    
    if (!distributionPayload) {
        return; 
    }

    try {
        buttonSaveCourse.disabled = true;
        buttonSaveCourse.innerText = "Saving Data...";

        const referenceDocument = doc(db, "users", userUID, "courses", courseNameID.value.trim());
        
        await setDoc(referenceDocument, {
            courseName: courseNameID.value.trim(),
            instructor: instructorID.value.trim(),
            courseCode: courseCodeID.value.trim(),
            creditUnits: parseFloat(creditUnitsID.value.trim()),
            selectedFormula: selectedRawFormula,
            componentsDistribution: distributionPayload,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log("Course structure configuration compiled and saved successfully!");
        
        const repoPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        window.location.href = `${repoPath}/dashboard.html`;

    } catch (error) {
        console.error("Firestore Transaction Failed:", error);
        showWarning(`Could not save course data configurations securely. Server error: ${error.message}`);

        buttonSaveCourse.disabled = false;
        buttonSaveCourse.innerText = "Save Course System";
    }
}

async function renderChosenFormula() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetClear([chosenFormulaID]);
        window.MathJax.typesetPromise([chosenFormulaID])
            .then(() => console.log("chosen formula successfully loaded."))
            .catch((err) => console.error("chosen formula render failed:", err));
    }
}

function displayFormula(formulaText) {
    const node = math.parse(formulaText);
    
    const variableNames = [];
    node.traverse(function (node) {
        if (node.isSymbolNode && !math[node.name]) {
            if (!variableNames.includes(node.name)) {
                variableNames.push(node.name);
            }
        }
    });

    globalVariableNames = variableNames;

    if (variableNames.length >= 4) {
        console.log("Too much variable: " + variableNames.length);
        warningMessage.style.display = "block";
        warningMessage.innerHTML = "Too much variable. Please change.";
        return;
    } else {
        warningMessage.style.display = "none";
        warningMessage.innerHTML = "";
        inputGradesCardID.innerHTML = "";
        
        variableNames.forEach((variable) => {
            const htmlGroup = `
                <div class="inputCard" data-variable="${variable}" style="margin-bottom: 20px; border: 1px solid #eaeaea; padding: 15px; border-radius: 6px;">
                    <h4 style="margin-bottom: 12px;">Percentage Dist. ${variable}</h4>
                    
                    <div id="${variable}-configs-master-wrapper" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;"></div>

                    <button type="button" class="add-config-trigger-btn" id="${variable}-add-config-btn" style="display: block; background: #f0fdf4; padding: 12px; border-radius: 4px; border: 2px dotted #bbf7d0; width: 100%; text-align: center; color: #16a34a; font-weight: bold; cursor: pointer; transition: background 0.2s ease;">
                        + Add New Configuration Group
                    </button>
                </div>
            `;

            inputGradesCardID.insertAdjacentHTML("beforeend", htmlGroup);

            const configsMasterWrapper = document.getElementById(`${variable}-configs-master-wrapper`);
            const addConfigBtn = document.getElementById(`${variable}-add-config-btn`);
            
            let configCounter = 0;

            addConfigBtn.addEventListener("click", function() {
                configCounter++;
                const k = configCounter;

                const dynamicConfigGroupHtml = `
                    <div class="scoring-setup-group" data-config-idx="${k}" style="display: flex; flex-direction: column; gap: 8px; background: #fafafa; padding: 12px; border-radius: 4px; border-left: 3px solid #f49223;">
                        
                        <div class="config-header-row" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; width: 100%; padding-right: 36px; box-sizing: border-box;">
                            
                            <button type="button" class="delete-overlay-btn remove-config-trigger" title="Delete Configuration Group">✕</button>

                            <div style="display: flex; align-items: center; gap: 12px;">
                                <input type="text" 
                                    id="${variable}-name-config-${k}" 
                                    placeholder="Quiz / Activity Title" 
                                    style="width: 160px; padding: 2px 6px; height: 28px; border-radius: 4px; border: 1px solid #ccc; margin: 0;">
                            </div>

                            <div class="editable-field-group percentage-field-group" style="height: 32px; gap: 4px; display: inline-flex; align-items: center; margin-left: auto;">
                                <label for="${variable}-percentage-${k}" class="input-pct-label" style="font-size: 0.85rem; color: #555; margin-right: 2px;">% weight:</label>
                                
                                <input type="number" 
                                       id="${variable}-percentage-${k}" 
                                       name="config-percentage" 
                                       placeholder="20" 
                                       min="0" 
                                       max="100" 
                                       style="width: 50px; padding: 2px 4px; height: 26px; border: 1px solid #f49223; border-radius: 4px; background: #fff; margin: 0; font-size: 0.9rem; font-weight: bold; text-align: center; outline: none; box-sizing: border-box;">
                                
                                <span id="${variable}-pct-sign-${k}" class="pct-sign" style="font-weight: bold; color: #555; font-size: 0.9rem; margin-right: 4px;">%</span>
                            </div>
                        </div>

                        <div id="${variable}-score-pairs-container-${k}" style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px; width: 100%;"></div>

                        <button type="button" class="add-pair-trigger-btn" id="${variable}-add-pair-btn-${k}" style="display: block; background: #f0fdf4; padding: 6px 12px; border-radius: 4px; border: 2px dotted #bbf7d0; width: 100%; max-width: 450px; text-align: center; color: #16a34a; font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease; box-sizing: border-box;">
                            + Add Assessment Item Record
                        </button>
                    </div>
                `;
                
                configsMasterWrapper.insertAdjacentHTML("beforeend", dynamicConfigGroupHtml);
                
                const currentConfigBlock = configsMasterWrapper.lastElementChild;
                
                const titleInput = currentConfigBlock.querySelector(`input[type="text"]`);
                const pctInput = currentConfigBlock.querySelector(`input[name="config-percentage"]`);

                const scorePairsContainer = currentConfigBlock.querySelector(`#${variable}-score-pairs-container-${k}`);
                const addPairBtn = currentConfigBlock.querySelector(`#${variable}-add-pair-btn-${k}`);
                const configDeleteButton = currentConfigBlock.querySelector(`.remove-config-trigger`);

                configDeleteButton.addEventListener("click", function() {
                    currentConfigBlock.remove();
                });

                titleInput.addEventListener("keydown", function(event) {
                    if (event.key === "Enter") {
                        event.preventDefault();
                    }
                });

                pctInput.addEventListener("keydown", function(event) {
                    if (event.key === "Enter") {
                        event.preventDefault();
                    }
                });

                pctInput.addEventListener("input", function() {
                    pctInput.classList.remove("weight-input-invalid");
                });

                let pairCounter = 0;

                addPairBtn.addEventListener("click", function() {
                    pairCounter++;
                    const p = pairCounter;

                    const scorePairHtml = `
                        <div class="score-input-pair" style="display: block; background: #fdf6ed; padding: 6px 36px 6px 12px; border-radius: 4px; border: 1px solid #fcead2; width: 100%; max-width: 450px; box-sizing: border-box;">

                            <button type="button" class="delete-overlay-btn remove-pair-trigger" title="Delete Score Row">✕</button>

                            <div style="display: flex; align-items: center; gap: 10px; width: 100%; justify-content: flex-start;">
                                <span class="pair-index-label" style="font-size: 0.75rem; font-weight: bold; color: #cf7d1f; min-width: 25px;">#${p}</span>
                                
                                <p style="font-size: 0.85rem; color: #555; margin: 0; min-width: 90px;">
                                    Score: <span id="${variable}-score-${k}-${p}" class="pair-score-display" style="font-weight: bold; color: #444;">0</span>
                                </p>
                                
                                <span style="font-size: 0.85rem; color: #555; font-weight: bold;">/</span>
                                
                                <div class="total-score-field-group" style="display: inline-flex; align-items: center; gap: 6px;">
                                    <label for="${variable}-total-${k}-${p}" class="total-label" style="font-size: 0.85rem; color: #555; margin: 0;">Total:</label>
                                    <input type="number" 
                                        id="${variable}-total-${k}-${p}" 
                                        class="pair-total-input"
                                        name="total-score" 
                                        placeholder="100" 
                                        min="1" 
                                        style="width: 65px; padding: 2px 6px; height: 24px; border: 1px solid #ccc; border-radius: 3px; margin: 0;">
                                    
                                    <p id="${variable}-total-preview-${k}-${p}" class="total-preview" style="display: none; font-size: 0.85rem; font-weight: bold; color: #444; margin: 0;"></p>
                                </div>

                                <button type="button" 
                                        id="${variable}-total-edit-btn-${k}-${p}" 
                                        class="edit-field-btn total-edit-btn" 
                                        style="display: none; padding: 1px 6px; height: 22px; font-size: 0.7rem; margin-left: auto;">
                                    Edit
                                </button>
                            </div>
                        </div>
                    `;

                    scorePairsContainer.insertAdjacentHTML("beforeend", scorePairHtml);

                    const currentPairRow = scorePairsContainer.lastElementChild;
                    const totalInputField = currentPairRow.querySelector(`input[name="total-score"]`);
                    const totalPreviewField = currentPairRow.querySelector(`.total-preview`);
                    const totalEditBtnField = currentPairRow.querySelector(`.total-edit-btn`);
                    const pairDeleteButton = currentPairRow.querySelector(`.remove-pair-trigger`);

                    pairDeleteButton.addEventListener("click", function() {
                        currentPairRow.remove();
                        
                        const remainingPairs = scorePairsContainer.querySelectorAll(".score-input-pair");
                        pairCounter = remainingPairs.length;

                        remainingPairs.forEach((row, index) => {
                            const newIndex = index + 1;

                            const label = row.querySelector(".pair-index-label");
                            if (label) label.textContent = `#${newIndex}`;

                            const scoreDisplay = row.querySelector(".pair-score-display");
                            if (scoreDisplay) scoreDisplay.id = `${variable}-score-${k}-${newIndex}`;

                            const totalInput = row.querySelector(".pair-total-input");
                            if (totalInput) totalInput.id = `${variable}-total-${k}-${newIndex}`;

                            const totalPreview = row.querySelector(".total-preview");
                            if (totalPreview) totalPreview.id = `${variable}-total-preview-${k}-${newIndex}`;

                            const editBtn = row.querySelector(".total-edit-btn");
                            if (editBtn) editBtn.id = `${variable}-total-edit-btn-${k}-${newIndex}`;
                            
                            const totalLabel = row.querySelector(".total-label");
                            if (totalLabel) totalLabel.setAttribute("for", `${variable}-total-${k}-${newIndex}`);
                        });
                    });

                    totalInputField.addEventListener("keydown", function(event) {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            const value = totalInputField.value.trim();
                            if (value !== "") {
                                totalPreviewField.textContent = value;
                                totalInputField.style.display = "none";
                                totalPreviewField.style.display = "inline-block";
                                totalEditBtnField.style.display = "inline-block";
                            }
                        }
                    });

                    totalEditBtnField.addEventListener("click", function() {
                        totalInputField.style.display = "block";
                        totalPreviewField.style.display = "none";
                        totalEditBtnField.style.display = "none";
                        totalInputField.focus();
                    });
                });
            });
        });
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    if (cancelCourseButtonID && cancelModalID && closeModalBtn) {
        cancelCourseButtonID.addEventListener("click", (e) => {
            e.preventDefault();
            cancelModalID.classList.add("is-active");
        });

        closeModalBtn.addEventListener("click", () => {
            cancelModalID.classList.remove("is-active");
        });

        cancelModalID.addEventListener("click", (e) => {
            if (e.target === cancelModalID) {
                cancelModalID.classList.remove("is-active");
            }
        });
    }

    if (dashboardLinkId && dashboardModalID && dashboardModalBtn) {
        dashboardLinkId.addEventListener("click", (e) => {
            e.preventDefault();
            dashboardModalID.classList.add("is-active");
        });

        dashboardModalBtn.addEventListener("click", () => {
            dashboardModalID.classList.remove("is-active");
        });

        dashboardModalID.addEventListener("click", (e) => {
            if (e.target === dashboardModalID) {
                dashboardModalID.classList.remove("is-active");
            }
        });
    }

    if (closeButtonConfirmationYesID && closeButtonConfirmationNoID) {
        closeButtonConfirmationYesID.addEventListener("click", function() {
            const repoPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            window.location.href = `${repoPath}/dashboard.html`;
        });

        closeButtonConfirmationNoID.addEventListener("click", () => {
            cancelModalID.classList.remove("is-active");
        });
    }

    if (dashboardButtonConfirmationNoID && dashboardButtonConfirmationYesID) {
        dashboardButtonConfirmationYesID.addEventListener("click", () => {
            window.location.href = "./dashboard.html";
        });

        dashboardButtonConfirmationNoID.addEventListener("click", () => {
            dashboardModalID.classList.remove("is-active");
        });
    }
});

buttonSaveCourse.addEventListener("click", function() {
    addNewCourse();
});

minorFormulaButtonID.addEventListener("click", function() {
    selectedRawFormula = rawMinorFormula;
    chosenFormulaID.textContent = minorFormulaLatex;
    chosenFormulaID.style.color = "black";

    renderChosenFormula();
    displayFormula(rawMinorFormula);
});

majorFormulaButtonID.addEventListener("click", function() {
    selectedRawFormula = rawMajorFormula;
    chosenFormulaID.textContent = majorFormulaLatex;
    chosenFormulaID.style.color = "black";

    renderChosenFormula();
    displayFormula(rawMajorFormula);
});

customFormulaButtonID.addEventListener("click", function() {
    if (!customFormulaInputID.value) {
        chosenFormulaID.innerHTML = "";
        customFormulaID.style.color = "rgb(189, 21, 21)";
        customFormulaID.innerHTML = "Input Missing.";
        selectedRawFormula = ""; 
    } else {
        selectedRawFormula = rawCustomFormula;
        chosenFormulaID.textContent = customFormulaLatex;
        chosenFormulaID.style.color = "black";
        renderChosenFormula();
        displayFormula(rawCustomFormula);
    }
});

if (courseNameID) {
    let coursePreviewSpan = document.getElementById("course-name-preview");
    let courseEditBtn = document.getElementById("course-name-edit-btn");
    
    if (!coursePreviewSpan) {
        coursePreviewSpan = document.createElement("p");
        coursePreviewSpan.id = "course-name-preview";
        coursePreviewSpan.style.cssText = "display: none; font-size: 1rem; font-weight: bold; margin: 0; margin-bottom: 8px; min-height: 28px; line-height: 28px;";
        
        courseEditBtn = document.createElement("button");
        courseEditBtn.type = "button";
        courseEditBtn.id = "course-name-edit-btn";
        courseEditBtn.textContent = "Edit";
        courseEditBtn.style.cssText = "display: none; padding: 2px 8px; height: 26px; font-size: 0.75rem; margin-left: 10px;";

        courseNameID.parentNode.insertBefore(coursePreviewSpan, courseNameID.nextSibling);
        coursePreviewSpan.parentNode.insertBefore(courseEditBtn, coursePreviewSpan.nextSibling);

        courseNameID.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                const value = courseNameID.value.trim();
                if (value !== "") {
                    coursePreviewSpan.textContent = value;
                    courseNameID.style.display = "none";
                    coursePreviewSpan.style.display = "inline-block";
                    courseEditBtn.style.display = "inline-block";
                }
            }
        });

        courseEditBtn.addEventListener("click", function() {
            courseNameID.style.display = "block";
            coursePreviewSpan.style.display = "none";
            courseEditBtn.style.display = "none";
            courseNameID.focus();
        });
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        const repoPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        window.location.href = `${repoPath}/login.html`;
    } else {
        userUID = user.uid;
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logout-button");

    if (logoutButton) {
        logoutButton.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                console.log("Logging out.");
                logoutButton.innerHTML = "logging out...";
                setTimeout(() => {
                    signOut(auth);
                }, 1000);
            } catch (error) {
                console.error("Sign out transaction failed:", error);
                alert("Could not log out securely. Please try again.");
            }
        });
    }
});
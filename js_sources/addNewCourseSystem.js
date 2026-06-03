import { db, auth } from "./index.js";
import { doc, getDoc, collection, addDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, getAuth } from "firebase/auth";

import * as math from 'mathjs';

const courseNameID = document.getElementById("course-name");
const instructorID = document.getElementById("prof-name");
const courseCodeID = document.getElementById("course-code");
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
const closeModalBtn = document.getElementById("close-modal-btn");
const closeButtonConfirmationYesID = document.getElementById("cancel-yes-button-ID");
const closeButtonConfirmationNoID = document.getElementById("cancel-no-button-ID");

const cancelModalID = document.getElementById("cancel-modal");

// input grades div
const inputGradesCardID = document.getElementById("input-grades-card");

const rawMinorFormula = "class_standard*(70/100)+exam*(30/100)";
const rawMajorFormula = "class_standard*(60/100)+exam*(40/100)";
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
    if (!courseNameID.value.trim() || !instructorID.value.trim() || !courseCodeID.value.trim()) {
        showWarning("Core course details are incomplete. Please ensure Course Name, Instructor, and Course Code are filled out.");
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
        const mainDistSelect = card.querySelector(".main-dist-select");
        const distOfMembers = parseInt(mainDistSelect.value);

        if (distOfMembers === 0) {
            showWarning(`Please define the distribution of members for component: <strong>${variableName}</strong>.`);
            return null;
        }

        gradingSystemDistribution[variableName] = {
            distributionOfMembers: distOfMembers,
            items: []
        };

        const subItemRows = card.querySelectorAll(".sub-item-row");
        
        for (let idx = 0; idx < subItemRows.length; idx++) {
            const row = subItemRows[idx];
            const itemIndex = idx + 1;

            const percentageInput = row.querySelector('input[name="sub-percentage"]');
            const pctValue = percentageInput.value.trim();

            if (!pctValue) {
                showWarning(`Component <strong>${variableName}</strong> (Item ${itemIndex}) distribution target percentage value is missing.`);
                return null;
            }

            const configsCountSelect = row.querySelector(`select[name="sub-number"]`);
            const configsCount = parseInt(configsCountSelect.value);

            if (configsCount === 0) {
                showWarning(`Component <strong>${variableName}</strong> (Item ${itemIndex}) requires at least 1 scoring config element assignment set.`);
                return null;
            }

            const itemConfigurationData = {
                itemNo: itemIndex,
                percentageDistribution: parseFloat(pctValue),
                configs: []
            };

            const configGroups = row.querySelectorAll(".scoring-setup-group");
            for (let cIdx = 0; cIdx < configGroups.length; cIdx++) {
                const configGroup = configGroups[cIdx];
                const configIndex = cIdx + 1;

                const titleInput = configGroup.querySelector('input[type="text"]');
                const titleValue = titleInput.value.trim();

                if (!titleValue) {
                    showWarning(`Title missing on <strong>${variableName}</strong> &rarr; Item ${itemIndex} &rarr; Config ${configIndex}.`);
                    return null;
                }

                const subScoreCountSelect = configGroup.querySelector(".sub-score-count-select");
                const scorePairsCount = parseInt(subScoreCountSelect.value);

                if (scorePairsCount === 0) {
                    showWarning(`Item count values not configured for title "<strong>${titleValue}</strong>" layout profile.`);
                    return null;
                }

                const configProfile = {
                    inputName: titleValue,
                    selectCount: scorePairsCount,
                    scorePairs: []
                };

                const scorePairBlocks = configGroup.querySelectorAll(".score-input-pair");
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

                itemConfigurationData.configs.push(configProfile);
            }

            gradingSystemDistribution[variableName].items.push(itemConfigurationData);
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
            selectedFormula: selectedRawFormula,
            componentsDistribution: distributionPayload,
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

// render chosen formula function
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
                    <h4>Percentage Dist. ${variable}</h4>
                    
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <select name="number" id="${variable}-distribution" class="main-dist-select" style="width: 60px; padding: 2px 5px;">
                            <option value="0">none</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                            <option value="7">7</option>
                            <option value="8">8</option>
                            <option value="9">9</option>
                        </select>
                        <p style="margin: 0;">the distribution of members</p>
                    </div>

                    <div id="${variable}-sub-options-container" style="margin-top: 10px; display: flex; flex-direction: column; gap: 12px;"></div>
                </div>
            `;

            inputGradesCardID.insertAdjacentHTML("beforeend", htmlGroup);

            const selectElement = document.getElementById(`${variable}-distribution`);
            const subContainer = document.getElementById(`${variable}-sub-options-container`);

            selectElement.addEventListener("change", function() {
                const selectedValue = parseInt(this.value);
                
                subContainer.innerHTML = "";

                if (selectedValue === 0) return;

                for (let i = 1; i <= selectedValue; i++) {
                    const subGroupHtml = `
                        <div class="sub-item-row" style="border-bottom: 1px dashed #ddd; padding-bottom: 10px; margin-bottom: 5px;">
                            <div class="inputDropDown" style="display: flex; align-items: center; gap: 12px; margin-left: 1rem; flex-wrap: wrap;">
                                <label style="font-size: 0.85rem; color: #555; font-weight: 600; min-width: 50px;">Item ${i}:</label>
                                
                                <select name="sub-number" id="${variable}-group-distribution-${i}" style="width: 60px; padding: 2px 5px; height: 28px; border-radius: 4px; border: 1px solid #ccc;">
                                    <option value="0">0</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                    <option value="6">6</option>
                                    <option value="7">7</option>
                                    <option value="8">8</option>
                                    <option value="9">9</option>
                                </select>

                                <div class="editable-field-group percentage-field-group" style="margin: 0; height: 32px; gap: 6px; display: flex; align-items: center;">
                                    <label for="${variable}-percentage-${i}" class="input-pct-label" style="font-size: 0.85rem; color: #555;">% distribution:</label>
                                    
                                    <input type="number" 
                                           id="${variable}-percentage-${i}" 
                                           name="sub-percentage" 
                                           placeholder="Ex. 20" 
                                           min="0" 
                                           max="100" 
                                           style="width: 70px; padding: 2px 6px; height: 28px; border-radius: 4px; border: 1px solid #ccc; margin: 0;">
                                    
                                    <span class="field-preview pct-preview" style="display: none; font-size: 14px; padding: 2px 6px; height: 28px; line-height: 24px;"></span>
                                    <span class="pct-sign" style="font-weight: bold; color: #555;">%</span>
                                    
                                    <button type="button" class="edit-field-btn pct-edit-btn" style="display: none; padding: 2px 8px; height: 26px; font-size: 0.75rem; margin-left: 5px;">Edit</button>
                                </div>
                            </div>

                            <div id="${variable}-configs-master-wrapper-${i}" style="margin-top: 5px; display: flex; flex-direction: column; gap: 8px;"></div>
                        </div>
                    `;
                    subContainer.insertAdjacentHTML("beforeend", subGroupHtml);

                    const currentItemBlock = subContainer.lastElementChild;
                    
                    const inputElement = currentItemBlock.querySelector('input[type="number"]');
                    const previewElement = currentItemBlock.querySelector('.field-preview');
                    const editButton = currentItemBlock.querySelector('.edit-field-btn');

                    const scoreCountSelect = currentItemBlock.querySelector(`#${variable}-group-distribution-${i}`);
                    const configsMasterWrapper = currentItemBlock.querySelector(`#${variable}-configs-master-wrapper-${i}`);

                    inputElement.addEventListener("keydown", function(event) {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            const value = inputElement.value.trim();
                            if (value !== "") {
                                previewElement.textContent = value;
                                inputElement.style.display = "none";
                                previewElement.style.display = "block";
                                editButton.style.display = "inline-block";
                            }
                        }
                    });

                    currentItemBlock.querySelector('.edit-field-btn').addEventListener("click", function() {
                        inputElement.style.display = "block";
                        previewElement.style.display = "none";
                        editButton.style.display = "none";
                        inputElement.focus();
                    });

                    scoreCountSelect.addEventListener("change", function() {
                        const count = parseInt(this.value);
                        configsMasterWrapper.innerHTML = "";

                        if (count === 0) return;

                        for (let k = 1; k <= count; k++) {
                            const dynamicConfigGroupHtml = `
                                <div class="scoring-setup-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-left: 2rem; margin-top: 6px; background: #fafafa; padding: 8px; border-radius: 4px; border-left: 3px solid #ccc;">
                                    
                                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; width: 100%;">
                                        <label style="font-size: 0.85rem; color: #444; font-weight: 600; min-width: 50px;">Config ${k}:</label>
                                        
                                        <input type="text" 
                                            id="${variable}-name-${i}-config-${k}" 
                                            placeholder="Quiz / Activity Title" 
                                            style="width: 160px; padding: 2px 6px; height: 28px; border-radius: 4px; border: 1px solid #ccc; margin: 0;">
                                        
                                        <p id="${variable}-name-preview-${i}-config-${k}" style="display: none; font-size: 0.9rem; font-weight: bold; margin: 0; color: #333; min-height: 24px; line-height: 24px;"></p>
                                        
                                        <button type="button" id="${variable}-name-edit-btn-${i}-config-${k}" class="config-title-edit-btn edit-field-btn pct-edit-btn" style="display: none; padding: 1px 6px; height: 24px; font-size: 0.7rem;">Edit</button>
                                        
                                        <span style="color: #888; font-size: 0.8rem; margin-left: auto;">Items count:</span>
                                        <select id="${variable}-sub-score-count-${i}-${k}" class="sub-score-count-select" style="width: 50px; padding: 2px 5px; height: 28px; border-radius: 4px; border: 1px solid #ccc;">
                                            <option value="0">0</option>
                                            <option value="1">1</option>
                                            <option value="2">2</option>
                                            <option value="3">3</option>
                                            <option value="4">4</option>
                                            <option value="5">5</option>
                                            <option value="6">6</option>
                                            <option value="7">7</option>
                                            <option value="8">8</option>
                                            <option value="9">9</option>
                                        </select>
                                    </div>

                                    <div id="${variable}-score-pairs-container-${i}-${k}" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 4px; width: 100%;"></div>
                                </div>
                            `;
                            configsMasterWrapper.insertAdjacentHTML("beforeend", dynamicConfigGroupHtml);
                            
                            const currentConfigBlock = configsMasterWrapper.lastElementChild;
                            
                            const titleInput = currentConfigBlock.querySelector(`input[type="text"]`);
                            const titlePreview = currentConfigBlock.querySelector(`#${variable}-name-preview-${i}-config-${k}`);
                            const titleEditBtn = currentConfigBlock.querySelector(`.config-title-edit-btn`);
                            
                            const subScoreCountSelect = currentConfigBlock.querySelector(`#${variable}-sub-score-count-${i}-${k}`);
                            const scorePairsContainer = currentConfigBlock.querySelector(`#${variable}-score-pairs-container-${i}-${k}`);

                            titleInput.addEventListener("keydown", function(event) {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    const value = titleInput.value.trim();
                                    if (value !== "") {
                                        titlePreview.textContent = value;
                                        titleInput.style.display = "none";
                                        titlePreview.style.display = "inline-block";
                                        titleEditBtn.style.display = "inline-block";
                                    }
                                }
                            });

                            titleEditBtn.addEventListener("click", function() {
                                titleInput.style.display = "block";
                                titlePreview.style.display = "none";
                                titleEditBtn.style.display = "none";
                                titleInput.focus();
                            });

                            subScoreCountSelect.addEventListener("change", function() {
                                const selectedPairsCount = parseInt(this.value);
                                scorePairsContainer.innerHTML = "";

                                if (selectedPairsCount === 0) return;

                                scorePairsContainer.style.display = "flex";
                                scorePairsContainer.style.flexDirection = "column";
                                scorePairsContainer.style.alignItems = "flex-start";
                                scorePairsContainer.style.gap = "8px";
                                scorePairsContainer.style.width = "100%";

                                for (let p = 1; p <= selectedPairsCount; p++) {
                                    const scorePairHtml = `
                                        <div class="score-input-pair" style="display: block; background: #fdf6ed; padding: 6px 12px; border-radius: 4px; border: 1px solid #fcead2; width: 100%; max-width: 450px; box-sizing: border-box;">
                                            <div style="display: flex; align-items: center; gap: 10px; width: 100%; justify-content: flex-start;">
                                                <span style="font-size: 0.75rem; font-weight: bold; color: #cf7d1f; min-width: 25px;">#${p}</span>
                                                
                                                <p style="font-size: 0.85rem; color: #555; margin: 0; min-width: 90px;">
                                                    Score: <span id="${variable}-score-${i}-${k}-${p}" style="font-weight: bold; color: #444;">0</span>
                                                </p>
                                                
                                                <span style="font-size: 0.85rem; color: #555; font-weight: bold;">/</span>
                                                
                                                <div class="total-score-field-group" style="display: inline-flex; align-items: center; gap: 6px;">
                                                    <label for="${variable}-total-${i}-${k}-${p}" class="total-label" style="font-size: 0.85rem; color: #555; margin: 0;">Total:</label>
                                                    <input type="number" 
                                                        id="${variable}-total-${i}-${k}-${p}" 
                                                        name="total-score" 
                                                        placeholder="100" 
                                                        min="1" 
                                                        style="width: 65px; padding: 2px 6px; height: 24px; border: 1px solid #ccc; border-radius: 3px; margin: 0;">
                                                    
                                                    <p id="${variable}-total-preview-${i}-${k}-${p}" class="total-preview" style="display: none; font-size: 0.85rem; font-weight: bold; color: #444; margin: 0;"></p>
                                                </div>

                                                <button type="button" 
                                                        id="${variable}-total-edit-btn-${i}-${k}-${p}" 
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
                                }
                            });
                        }
                    });
                }
            });
        });
    }
}

// event listeners


document.addEventListener("DOMContentLoaded", () =>{

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

    if (closeButtonConfirmationYesID && closeButtonConfirmationNoID) {
        closeButtonConfirmationYesID.addEventListener("click", function() {
            const repoPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            window.location.href = `${repoPath}/dashboard.html`;
        });

        closeButtonConfirmationNoID.addEventListener("click", () => {
            cancelModalID.classList.remove("is-active");
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

const fieldGroups = document.querySelectorAll(".editable-field-group");

fieldGroups.forEach((group) => {
    const inputElement = group.querySelector("input");
    const previewElement = group.querySelector(".field-preview");
    const editButton = group.querySelector(".edit-field-btn");

    inputElement.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            
            const value = inputElement.value.trim();
            if (value !== "") {
                previewElement.textContent = value;
                inputElement.style.display = "none";
                previewElement.style.display = "block";
                editButton.style.display = "inline-block";
            }
        }
    });

    editButton.addEventListener("click", function() {
        inputElement.style.display = "block";
        previewElement.style.display = "none";
        editButton.style.display = "none";
        inputElement.focus();
    });
});

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
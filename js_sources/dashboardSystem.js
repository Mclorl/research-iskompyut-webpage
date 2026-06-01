import { db, auth } from "./index.js";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const studentNameHtml = document.getElementById("student-name-id");

// keeping the user log in or when logged out they will be kicked out of this page.
onAuthStateChanged(auth, async (user) => {
    if (user) {
        setTimeout(async () => {
            try {
                const decRef = doc(db, "users",  user.uid);
                const docSnap = await getDoc(decRef);

                if (docSnap.exists()) {
                    const userData = docSnap.data();

                    const studentName = userData.fullName;

                    if (studentNameHtml) studentNameHtml.innerHTML = studentName;
                    
                     if (userData.gwaGoal) {
                        updateGoalCard(userData.gwaGoal);
                        const slider = document.getElementById("gwa-slider");
                        const display = document.getElementById("gwa-display");
                        if (slider) {
                            slider.value = userData.gwaGoal;
                            updateSliderFill(slider);
                        }
                        if (display) {
                            display.textContent = parseFloat(userData.gwaGoal).toFixed(2);
                        }
                    }
                    
                } else {
                    console.log ("Data Does Not Exist.");
                }

                } catch (error) {
                console.error("Error fetching user document:", error);
            }
        }, 50);
        
    } else {
        const repoPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        window.location.href = `${repoPath}/login.html`;
    }
});


// logout functionality.
document.addEventListener("DOMContentLoaded", () =>{
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
        })
    }

    // Modal Interaction Handlers Only
    const gwaTrigger = document.getElementById("check-gwa-trigger");
    const gwaModal = document.getElementById("gwa-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");

    if (gwaTrigger && gwaModal && closeModalBtn) {
        gwaTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            gwaModal.classList.add("is-active");
        });

        closeModalBtn.addEventListener("click", () => {
            gwaModal.classList.remove("is-active");
        });

        gwaModal.addEventListener("click", (e) => {
            if (e.target === gwaModal) {
                gwaModal.classList.remove("is-active");
            }
        });
    }

    // Opens the GWA goal modal overlay
    function openGoalModal() {
        const overlay = document.getElementById("gwa-modal-overlay");
        if (overlay) overlay.classList.add("active");
    }

    // Opens the GWA goal modal
    const allNavLinks = document.querySelectorAll(".nav-links a");
        allNavLinks.forEach((link) => {
            if (link.textContent.trim().toLowerCase() === "set goals") {
                link.addEventListener("click", (e) => {
                    e.preventDefault();
                    const overlay = document.getElementById("gwa-modal-overlay");
                    if (overlay) overlay.classList.add("active");
                });
            }
        });

    // "Change your goal here..." action link to open the same GWA goal modal
    const changeGoalLink = document.querySelector(".action-link[data-goal-trigger]");
    if (changeGoalLink) {
        changeGoalLink.addEventListener("click", (e) => {
            e.preventDefault();
            openGoalModal();
        });
    }
    
    // Updates displayed GWA number and track fill in real time
    const slider = document.getElementById("gwa-slider");
        if (slider) {
            slider.addEventListener("input", () => {
                const display = document.getElementById("gwa-display");
                    if (display) display.textContent = parseFloat(slider.value).toFixed(2);
                    updateSliderFill(slider);
            });
        }

    // Persists GWA goal to Firestore and updates dashboard card immediately
    const saveBtn = document.getElementById("gwa-save-btn");
    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            const slider = document.getElementById("gwa-slider");
            const gwa = parseFloat(slider.value);
            const user = auth.currentUser;
            if (!user) return;
 
            try {
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, { gwaGoal: gwa });
                console.log("✅ GWA goal saved:", gwa);
                updateGoalCard(gwa);
                const overlay = document.getElementById("gwa-modal-overlay");
                if (overlay) overlay.classList.remove("active");
            } catch (err) {
                console.error("❌ Failed to save GWA goal:", err.message);
            }
        });
    }

    // Closes modal without saving
    const cancelBtn = document.getElementById("gwa-cancel-btn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            const overlay = document.getElementById("gwa-modal-overlay");
            if (overlay) overlay.classList.remove("active");
        });
    }

    // Closes modal when clicking the dark background
    const overlay = document.getElementById("gwa-modal-overlay");
    if (overlay) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.classList.remove("active");
        });
    }

});

    // Calculates slider fill percentage and sets 
    function updateSliderFill(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty("--pct", `${pct}%`);
}
 
// Finds the "Your Goal" card and updates its displayed grade value
function updateGoalCard(gwa) {
    const cards = document.querySelectorAll(".card-container");
    cards.forEach((card) => {
        const heading = card.querySelector("h2");
        if (heading && heading.textContent.trim() === "Your Goal") {
            const gradeEl = card.querySelector(".final-grade");
            if (gradeEl) gradeEl.textContent = parseFloat(gwa).toFixed(2);
        }
    });
}

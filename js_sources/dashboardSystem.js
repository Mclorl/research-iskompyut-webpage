import { db, auth } from "./index.js";
import { doc, getDoc } from "firebase/firestore";
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
                    studentNameHtml.innerHTML = studentName;
                    
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

    // Modal Interaction Handlers Only (2)
    const cardTriggers = document.querySelectorAll(".check-card-trigger");
    const cardModal = document.getElementById("card-modal");
    const closeModalBtn2 = document.getElementById("close-modal-btn2");
    
    if (cardModal && cardTriggers.length > 0 && closeModalBtn2) {

    const modalTitle = cardModal.querySelector(".modal-title");
    const modalCourseCode = cardModal.querySelector(".modal-course");
    const modalProfessor = cardModal.querySelector("#professor");
    const modalGrade = cardModal.querySelector("#gwa-number");

        cardTriggers.forEach((trigger) => {
            trigger.addEventListener("click", (e) => {
                e.preventDefault();

                const course = trigger.dataset.course || "N/A";
                const code = trigger.dataset.code || "N/A";
                const professor = trigger.dataset.professor || "N/A";
                const grade = trigger.dataset.grade || "N/A";

                if (modalTitle) modalTitle.textContent = course;
                if (modalCourseCode) modalCourseCode.textContent = code;
                if (modalProfessor) modalProfessor.textContent = professor;
                if (modalGrade) modalGrade.textContent = grade;

                cardModal.classList.add("is-active");
            });
        });

        /*cardTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            cardModal.classList.add("is-active");
        });*/

        closeModalBtn2.addEventListener("click", () => {
            cardModal.classList.remove("is-active");
        });

        cardModal.addEventListener("click", (e) => {
            if (e.target === cardModal) {
                cardModal.classList.remove("is-active");
            }
        });
    }
});
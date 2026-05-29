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
});
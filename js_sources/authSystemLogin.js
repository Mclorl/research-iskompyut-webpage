import { auth, formatUsernameToEmail } from "./index.js";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
    
    const loginForm = document.getElementById("login-form-element");
    const usernameInput = document.getElementById("login-username");
    const passwordInput = document.getElementById("login-password");
    const errorEl = document.getElementById("login-error-message");

    function showError(text) {
        if (errorEl) {
            errorEl.innerText = text;
            errorEl.style.display = "block";
        }
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (errorEl) errorEl.style.display = "none";

            const username = usernameInput.value;
            const password = passwordInput.value;
            const pseudoEmail = formatUsernameToEmail(username);

            try {
                await signInWithEmailAndPassword(auth, pseudoEmail, password);
                
                // Success! Redirect user to dashboard
                const repoPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                const rootPath = repoPath.substring(0, repoPath.lastIndexOf('/')); 
                window.location.href = `${rootPath}/html_sources/dashboard.html`; // after the user logged in, go to the main dashboard.
                // window.location.href = "./dashboard.html";
            } catch (error) {
                switch (error.code) {
                    case "auth/invalid-credential":
                        showError("Invalid username or password.");
                        break;
                    default:
                        showError("Sign in failed. Please try again.");
                }
            }
        });
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login-username").style.display = "none";
        document.getElementById("login-password").style.display = "none";
        document.getElementById("login-error-message").style.display = "block";
        document.getElementById("login-error-message").style.color = "#4ca081";
        document.getElementById("login-error-message").innerHTML = "You Are Already Logged In!";

        setTimeout(() => {
            if (user) {
                const repoPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                window.location.href = `${repoPath}/dashboard.html`;
            }
        }, 1500)
    }
})
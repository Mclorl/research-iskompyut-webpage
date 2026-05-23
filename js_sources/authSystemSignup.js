import { auth, formatUsernameToEmail } from "./index.js";
import { createUserWithEmailAndPassword } from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
    
    const signupForm = document.getElementById("signup-form-element");
    const nameInput = document.getElementById("signup-name");
    const classInput = document.getElementById("signup-class");
    const usernameInput = document.getElementById("signup-username");
    const passwordInput = document.getElementById("signup-password");
    const confirmPasswordInput = document.getElementById("signup-confirm");
    const errorEl = document.getElementById("error-message");

    function showError(text) {
        if (errorEl) {
            errorEl.style.color = "#f87171";
            errorEl.innerText = text;
            errorEl.style.display = "block";
        }
    }

    function showSuccess(text) {
        if (errorEl) {
            errorEl.style.color = "#34d399";
            errorEl.innerText = text;
            errorEl.style.display = "block";
        }
    }

    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (errorEl) errorEl.style.display = "none";

            const username = usernameInput.value;
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Validate local password matches
            if (password !== confirmPassword) {
                showError("Passwords do not match.");
                return;
            }

            const pseudoEmail = formatUsernameToEmail(username);

            try {
                await createUserWithEmailAndPassword(auth, pseudoEmail, password);
                
                showSuccess("Account registered successfully! Redirecting...");
                signupForm.reset();

                setTimeout(() => {
                    const repoPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                    window.location.href = `${repoPath}/login.html`;
                }, 1500);

            } catch (error) {
                switch (error.code) {
                    case "auth/email-already-in-use":
                        showError("This username is already taken.");
                        break;
                    case "auth/weak-password":
                        showError("Password must be at least 6 characters.");
                        break;
                    default:
                        showError(error.message);
                }
            }
        });
    }
});
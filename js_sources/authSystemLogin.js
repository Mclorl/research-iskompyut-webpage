import { auth, formatUsernameToEmail } from "./index.js";
import { signInWithEmailAndPassword } from "firebase/auth";

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

            const username = usernameInput?.value.trim();
            const password = passwordInput?.value;

            if (!username || !password) {
                showError("Please enter both username and password.");
                return;
            }

            const pseudoEmail = formatUsernameToEmail(username);

            if (!pseudoEmail) {
                showError("Invalid username format.");
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, pseudoEmail, password);
                console.log("✅ Login successful, redirecting...");
                const base = window.location.hostname === "localhost" ? "" : "/research-iskompyut-webpage";
                window.location.href = `${base}/html_sources/dashboard.html`;


            } catch (error) {
                console.error("❌ Login error:", error.code);
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
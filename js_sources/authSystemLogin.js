import { auth, formatUsernameToEmail } from "./index.js";
import { signInWithEmailAndPassword } from "firebase/auth";

const loginForm = document.querySelector(".login-box form");
const usernameInput = loginForm.querySelector("input[type='text']");
const passwordInput = loginForm.querySelector("input[type='password']");
const errorEl = document.getElementById("error-message");

function showError(text) {
    errorEl.innerText = text;
    errorEl.style.display = "block";
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Halt normal page reload
    errorEl.style.display = "none";

    const username = usernameInput.value;
    const password = passwordInput.value;
    const pseudoEmail = formatUsernameToEmail(username);

    try {
        await signInWithEmailAndPassword(auth, pseudoEmail, password);
        
        // Success! Redirect user to your app dashboard index page
        const repoPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        const rootPath = repoPath.substring(0, repoPath.lastIndexOf('/')); 
        window.location.href = `${rootPath}/index.html`;
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
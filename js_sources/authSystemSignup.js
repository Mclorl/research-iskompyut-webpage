// signup.js
import { auth, formatUsernameToEmail } from "./index.js";
import { createUserWithEmailAndPassword } from "firebase/auth";

const signupForm = document.querySelector(".signup-form form");
// Map inputs safely according to their appearance order in your DOM
const nameInput = signupForm.querySelectorAll("input[type='text']")[0];
const classInput = signupForm.querySelectorAll("input[type='text']")[1];
const usernameInput = signupForm.querySelectorAll("input[type='text']")[2];
const passwordInput = signupForm.querySelectorAll("input[type='password']")[0];
const confirmPasswordInput = signupForm.querySelectorAll("input[type='password']")[1];
const errorEl = document.getElementById("error-message");

function showError(text) {
    errorEl.style.color = "#f87171";
    errorEl.innerText = text;
    errorEl.style.display = "block";
}

function showSuccess(text) {
    errorEl.style.color = "#34d399"; // Green success state
    errorEl.innerText = text;
    errorEl.style.display = "block";
}

signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";

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
        
        // Push user to login portal or dashboard after brief delay
        setTimeout(() => {
            window.location.href = "login.html"; // placeholder
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
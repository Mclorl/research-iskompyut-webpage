import { auth, db, createUserDocument } from "./index.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", () => {

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "/html_sources/login.html";
            return;
        }

        try {
            await createUserDocument(user);

            const userRef = doc(db, "users", user.uid);
            const snapshot = await getDoc(userRef);

            if (snapshot.exists()) {
                const userData = snapshot.data();
                console.log("? Dashboard loaded for:", userData.email);

                const greetingEl = document.querySelector(".greetingsContainer h1");
                if (greetingEl) {
                    const displayName = userData.displayName || user.email.split("@")[0];
                    greetingEl.innerHTML = `Welcome, <br><span>${displayName}</span>!`;
                }
            }

        } catch (error) {
            console.error("? Dashboard auth error:", error.message);
        }
    });

    const allNavLinks = document.querySelectorAll(".nav-links a");
    allNavLinks.forEach((link) => {
        if (link.textContent.trim().toLowerCase() === "log out") {
            link.addEventListener("click", async (e) => {
                e.preventDefault();
                try {
                    await auth.signOut();
                    window.location.href = "/html_sources/login.html";
                } catch (error) {
                    console.error("? Logout failed:", error.message);
                }
            });
        }
    });

});

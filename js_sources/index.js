// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// imports
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-6jwzCrx03dVkjPX4UB7HMuSkAkjSU74",
  authDomain: "iskompyut-4655e.firebaseapp.com",
  projectId: "iskompyut-4655e",
  storageBucket: "iskompyut-4655e.firebasestorage.app",
  messagingSenderId: "11455511103",
  appId: "1:11455511103:web:c4f7cbfde543496e6b968a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// code
// initialize services from firebase

export const auth = getAuth(app);
export const db = getFirestore(app); // connecting to the firestore database project.

export function formatUsernameToEmail(username) {
    const cleanName = username.trim().replace(/\s+/g, '').toLowerCase();
    if (!cleanName) return '';
    return `${cleanName}@iskompyut.local`;
}
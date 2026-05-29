import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-6jwzCrx03dVkjPX4UB7HMuSkAkjSU74",
  authDomain: "iskompyut-4655e.firebaseapp.com",
  projectId: "iskompyut-4655e",
  storageBucket: "iskompyut-4655e.firebasestorage.app",
  messagingSenderId: "11455511103",
  appId: "1:11455511103:web:c4f7cbfde543496e6b968a",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export function formatUsernameToEmail(username) {
  if (!username || typeof username !== "string") return "";
  const cleanName = username.trim().replace(/\s+/g, "").toLowerCase();
  if (!cleanName) return "";
  return `${cleanName}@iskompyut.local`;
}

export async function createUserDocument(user) {
  if (!user?.uid) throw new Error("createUserDocument: invalid user object.");
  const userRef = doc(db, "users", user.uid);
  try {
    const existingSnap = await getDoc(userRef);
    const isNewUser = !existingSnap.exists();
    const payload = {
      displayName: user.displayName || "",
      email: user.email || "",
      lastLogin: serverTimestamp(),
      ...(isNewUser && {
        createdAt: serverTimestamp(),
        role: "student",
      }),
    };
    await setDoc(userRef, payload, { merge: true });
    console.log(isNewUser ? "✅ New user created:" : "✅ User updated:", user.uid);
  } catch (error) {
    throw new Error(`createUserDocument failed: ${error.message}`);
  }
}
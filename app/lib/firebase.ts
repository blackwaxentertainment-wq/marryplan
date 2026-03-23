import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC2OXTW7nzMFR9pKBr0ddpIKuIRArgNXOk",
  authDomain: "marryplan.firebaseapp.com",
  projectId: "marryplan",
  storageBucket: "marryplan.firebasestorage.app",
  messagingSenderId: "498989170372",
  appId: "1:498989170372:web:3b74126805f8126eb89391"
};

// 👉 verhindert doppelte Initialisierung
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
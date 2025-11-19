/** @format */

// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "synergyflow-pvqrj",
  appId: "1:945618752972:web:c66774aa022a98cd74b969",
  storageBucket: "synergyflow-pvqrj.appspot.com",
  apiKey: "AIzaSyDzFTXPJHLLfjPpzx2eSaVCiI5krW7Hy0s",
  authDomain: "synergyflow-pvqrj.firebaseapp.com",
  messagingSenderId: "945618752972",
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize services
const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };


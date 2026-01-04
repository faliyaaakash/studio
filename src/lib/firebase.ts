
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  projectId: "studio-7838183676-b74cb",
  appId: "1:1069984663146:web:db6ca5e5875e00cc2bec13",
  apiKey: "AIzaSyD5oLneuuqwYlLlIZsCFSSBl1KWPX1n8Ac",
  authDomain: "studio-7838183676-b74cb.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "1069984663146",
  storageBucket: "studio-7838183676-b74cb.appspot.com"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();


export { app, auth, db, storage, googleProvider };

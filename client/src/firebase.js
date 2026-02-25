// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// THAY THẾ KHỐI NÀY BẰNG CẤU HÌNH CỦA BẠN TRÊN FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyBs6iVyirKOErvyiNGFRq-lbKfWB_Q1yvQ",
    authDomain: "astro-cat-5.firebaseapp.com",
    projectId: "astro-cat-5",
    storageBucket: "astro-cat-5.firebasestorage.app",
    messagingSenderId: "271365354200",
    appId: "1:271365354200:web:af4e26e6386c39af971dad",
    measurementId: "G-SQM8ZNMB74"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
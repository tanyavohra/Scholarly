// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage"; 
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAFbPDRgzhsoewgi6pJT2EIol9Z5ftBMWQ",
  authDomain: "Scholarly-2bd9b.firebaseapp.com",
  projectId: "Scholarly-2bd9b",
  storageBucket: "Scholarly-2bd9b.appspot.com",
  messagingSenderId: "13931137647",
  appId: "1:13931137647:web:57302aa880647981d19b9a",
  measurementId: "G-C01RVB857T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const storage = getStorage(app)
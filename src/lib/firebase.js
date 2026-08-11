import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAV9Lds6q-NcO_oxaojgZDqlpIVf85CwzQ",
  authDomain: "staff-27847.firebaseapp.com",
  projectId: "staff-27847",
  storageBucket: "staff-27847.firebasestorage.app",
  messagingSenderId: "45989022390",
  appId: "1:45989022390:web:5358b83188b24a97957417",
  measurementId: "G-719CPCZWLD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

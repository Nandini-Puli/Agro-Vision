import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  browserLocalPersistence,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  setPersistence,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCe6Ws1TQ7apsJ0a-Ri5BJT2LCqsXk0OTA",
  authDomain: "agro-vision-2b02c.firebaseapp.com",
  projectId: "agro-vision-2b02c",
  storageBucket: "agro-vision-2b02c.firebasestorage.app",
  messagingSenderId: "697359040054",
  appId: "1:697359040054:web:268477e8bdfe1a987fe297",
  measurementId: "G-SFYZHQ8R5V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Firebase auth persistence could not be initialized:", error);
});

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  setPersistence,
  updateProfile,
  onAuthStateChanged
};

export default app;

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "local-dev-key",
  authDomain: "lorry52-1a4b3.firebaseapp.com",
  projectId: "lorry52-1a4b3",
  storageBucket: "lorry52-1a4b3.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Re-enable Firestore Emulator now that Java is being set up
if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    console.log("Connected to Local Firestore Emulator");
  } catch (err) {
    console.log("Firestore emulator connection skipped or already active");
  }

  try {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    console.log("Connected to Local Storage Emulator");
  } catch (err) {
    console.log("Storage emulator connection skipped or already active");
  }
}

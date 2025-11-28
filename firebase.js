import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA_z668OP_FlLEc11iUv647JupovRFuERI",
  authDomain: "campus-connect-chat-96101.firebaseapp.com",
  projectId: "campus-connect-chat-96101",
  storageBucket: "campus-connect-chat-96101.firebasestorage.app",
  messagingSenderId: "417805508123",
  appId: "1:417805508123:web:757c67189041ddc20022be"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

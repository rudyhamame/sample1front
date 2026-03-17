import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCq9-0jgcikx3IpKq0Y5qV3n8Z8En3Lk_s",
  authDomain: "mctosh-be1f3.firebaseapp.com",
  projectId: "mctosh-be1f3",
  storageBucket: "mctosh-be1f3.appspot.com",
  messagingSenderId: "351016351889",
  appId: "1:351016351889:web:4759fba4613f5837eea730",
  measurementId: "G-0X1DRVDP2S",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

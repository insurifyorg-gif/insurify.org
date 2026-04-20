// Replace these with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHunYLxizbXQhwvn54Uq6xP1eXNKconeY",
  authDomain: "insurifyorg-387fb.firebaseapp.com",
  projectId: "insurifyorg-387fb",
  storageBucket: "insurifyorg-387fb.firebasestorage.app",
  messagingSenderId: "940506824987",
  appId: "1:940506824987:web:4b4d909bed38fbafd7d3be",
  measurementId: "G-10S0N0PSNT"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

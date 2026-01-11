import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2wEZMelhCwNYKs7vtgEFhcXkPxXeTx1U",
  authDomain: "shell-toktok.firebaseapp.com",
  projectId: "shell-toktok",
  storageBucket: "shell-toktok.firebasestorage.app",
  messagingSenderId: "559812497776",
  appId: "1:559812497776:web:b2256f21be94c712fd7fb5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authPage = document.getElementById("authPage");
const appPage = document.getElementById("appPage");

onAuthStateChanged(auth, user => {
  if (user) {
    authPage.classList.add("hidden");
    appPage.classList.remove("hidden");
    showSection("home");
  } else {
    appPage.classList.add("hidden");
    authPage.classList.remove("hidden");
  }
});

window.login = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => alert(e.message));
};

window.register = () => {
  createUserWithEmailAndPassword(auth, email.value, password.value)
    .catch(e => alert(e.message));
};

window.logout = () => signOut(auth);

window.showRegister = () => {
  document.getElementById("registerBox").classList.remove("hidden");
};

window.showSection = (id) => {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
};

window.openSupport = () => {
  window.location.href = "https://wa.me/22605765650";
};

window.submitAccount = async () => {
  await addDoc(collection(db, "accounts"), {
    username: username.value,
    followers: followers.value,
    price: price.value,
    payment: payment.value,
    whatsapp: country.value + whatsapp.value,
    status: "En attente"
  });
  alert("Compte déposé avec succès");
};

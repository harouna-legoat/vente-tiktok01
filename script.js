/***********************
 * NAVIGATION UI
 ***********************/
document.addEventListener("DOMContentLoaded", () => {

  const links = document.querySelectorAll(".nav-links a");
  const sections = document.querySelectorAll(".section");

  // sécurité si sections pas encore créées
  if (links.length > 0) {
    links.forEach(link => {
      link.addEventListener("click", () => {
        const target = link.textContent.toLowerCase();

        sections.forEach(sec => sec.style.display = "none");

        if (target.includes("acheter")) {
          document.getElementById("buy")?.style.display = "block";
        } 
        else if (target.includes("vendre")) {
          document.getElementById("sell")?.style.display = "block";
        } 
        else if (target.includes("mon")) {
          document.getElementById("account")?.style.display = "block";
        }
      });
    });
  }

});

/***********************
 * FIREBASE
 ***********************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
  getFirestore 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* CONFIG FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyA2wEZMelhCwNYKs7vtgEFhcXkPxXeTx1U",
  authDomain: "shell-toktok.firebaseapp.com",
  projectId: "shell-toktok",
  storageBucket: "shell-toktok.firebasestorage.app",
  messagingSenderId: "559812497776",
  appId: "1:559812497776:web:b2256f21be94c712fd7fb5"
};

/* INIT */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/***********************
 * AUTH STATE
 ***********************/
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Utilisateur connecté :", user.email);
  } else {
    console.log("Utilisateur non connecté");
    // plus tard → redirection page login
  }
});

/***********************
 * LOGOUT
 ***********************/
const logoutBtn = document.querySelector(".logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      location.reload();
    });
  });
}

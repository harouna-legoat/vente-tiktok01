/* ================================
   🔥 COLLE ICI TON CODE FIREBASE
   (initializeApp, auth, firestore)
================================ */
// 👉 EXACTEMENT le code Firebase que tu m’as déjà donné
// NE CHANGE RIEN DEDANS

// Exemple :
// import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";

/* ================================
   WHATSAPP SERVICE CLIENT
================================ */
function contacterService() {
  window.open("https://wa.me/22605765650", "_blank");
}

/* ================================
   DEPOSER UN COMPTE
================================ */
function deposerCompte() {
  const nom = document.getElementById("nomCompte").value;
  const prix = document.getElementById("prixCompte").value;
  const paiement = document.getElementById("paiement").value;

  if (!nom || !prix) {
    alert("Veuillez remplir tous les champs");
    return;
  }

  // 🔥 ICI : enregistrement Firebase
  // collection: comptes
  // champs: nom, prix, paiement, vendeurId, date

  alert("Compte déposé avec succès !");
}

/* ================================
   ACHETER / TRANSACTIONS
================================ */
// Ici on affichera
// - ce que l’utilisateur a déposé
// - ce qu’il a acheté
// Si vide → "La liste est vide"

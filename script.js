import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔥 TON FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyA2wEZMelhCwNYKs7vtgEFhcXkPxXeTx1U",
  authDomain: "shell-toktok.firebaseapp.com",
  projectId: "shell-toktok",
  storageBucket: "shell-toktok.firebasestorage.app",
  messagingSenderId: "559812497776",
  appId: "1:559812497776:web:b2256f21be94c712fd7fb5",
  measurementId: "G-QPXENJ247J"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* 👤 USER STATE */
let currentUser = null;

/* ELEMENTS */
const authModal = document.getElementById("authModal");
const sellModal = document.getElementById("sellModal");
const listingsDiv = document.getElementById("listings");

/* 🔐 AUTH GUARD */
onAuthStateChanged(auth, user => {
  currentUser = user;
});

/* 🔑 LOGIN / REGISTER */
document.getElementById("authBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch {
    await createUserWithEmailAndPassword(auth, email, password);
  }
  authModal.classList.add("hidden");
};

/* 📦 LOAD LISTINGS */
async function loadListings() {
  listingsDiv.innerHTML = "";
  const snap = await getDocs(collection(db, "listings"));

  snap.forEach(d => {
    const data = d.data();
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <p><strong>${data.username}</strong></p>
      <p>${data.followers} abonnés</p>
      <p class="price">${data.price}$</p>
      <button onclick="buyListing('${d.id}')">Acheter</button>
      <p class="micro">Votre argent est conservé par notre système sécurisé</p>
    `;
    listingsDiv.appendChild(card);
  });
}
loadListings();

/* 🛒 BUY (ESCROW MOCK) */
window.buyListing = async (id) => {
  if (!currentUser) return authModal.classList.remove("hidden");

  await updateDoc(doc(db, "listings", id), {
    status: "pending",
    buyer: currentUser.uid
  });

  alert("Paiement sécurisé initié. Fonds bloqués (escrow).");
};

/* 🧾 SELL */
document.getElementById("sellBtn").onclick = () => {
  if (!currentUser) return authModal.classList.remove("hidden");

  const code = "SAFE-" + Math.floor(Math.random() * 9000);
  document.getElementById("verifyCode").textContent = code;
  sellModal.classList.remove("hidden");
};

/* 🔍 VERIFY (MOCK TIKTOK BIO) */
document.getElementById("verifyBtn").onclick = async () => {
  await addDoc(collection(db, "listings"), {
    username: username.value,
    followers: followers.value,
    price: price.value,
    niche: niche.value,
    status: "verified",
    seller: currentUser.uid,
    createdAt: Date.now()
  });

  sellModal.classList.add("hidden");
  loadListings();
};

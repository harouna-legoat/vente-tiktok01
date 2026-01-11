import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA2wEZMelhCwNYKs7vtgEFhcXkPxXeTx1U",
  authDomain: "shell-toktok.firebaseapp.com",
  projectId: "shell-toktok",
  storageBucket: "shell-toktok.firebasestorage.app",
  messagingSenderId: "559812497776",
  appId: "1:559812497776:web:b2256f21be94c712fd7fb5"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// ELEMENTS
const authPage = document.getElementById("authPage");
const appPage = document.getElementById("appPage");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const goSignUp = document.getElementById("goSignUp");
const accountsList = document.getElementById("accountsList");
const myTransactions = document.getElementById("myTransactions");
const userEmail = document.getElementById("userEmail");

// NAVIGATION
window.show = (id) => {
  document.querySelectorAll("section").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
};

// AUTH
window.register = async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Inscription réussie !");
  } catch (e) {
    alert(e.message);
  }
};

window.login = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (e) {
    alert(e.message);
  }
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if(user) {
    authPage.classList.add("hidden");
    appPage.classList.remove("hidden");
    userEmail.textContent = user.email;
    loadAccounts();
    loadMyTransactions();
  } else {
    authPage.classList.remove("hidden");
    appPage.classList.add("hidden");
  }
});

// SIGNUP PAGE NAVIGATION
goSignUp.addEventListener("click", () => {
  register(); // Pour le moment, on peut améliorer plus tard si tu veux une page séparée
});

// VENDRE
window.sellAccount = async () => {
  const username = document.getElementById("username").value;
  const followers = document.getElementById("followers").value;
  const price = document.getElementById("price").value;
  const paymentMethod = document.getElementById("paymentMethod").value;
  const whatsapp = document.getElementById("whatsapp").value;
  const file = document.getElementById("screenshot").files[0];

  // Validation
  if(!username || !followers || !price || !paymentMethod || !whatsapp || !file){
    alert("Veuillez remplir tous les champs !");
    return;
  }
  if(!whatsapp.startsWith("+226") && !whatsapp.startsWith("+33")){
    alert("Numéro WhatsApp invalide. UEMOA ou France uniquement.");
    return;
  }
  if(paymentMethod !== "Orange Money" && paymentMethod !== "Wave"){
    alert("Moyen de paiement invalide !");
    return;
  }

  // Upload image
  const imageRef = ref(storage, `screenshots/${Date.now()}`);
  await uploadBytes(imageRef, file);
  const imageUrl = await getDownloadURL(imageRef);

  // Ajouter à Firestore
  await addDoc(collection(db, "accounts"), {
    userId: auth.currentUser.uid,
    username, followers, price, paymentMethod, whatsapp,
    image: imageUrl,
    status: "en attente",
    date: Date.now()
  });

  alert("Compte mis en vente !");
  document.getElementById("username").value="";
  document.getElementById("followers").value="";
  document.getElementById("price").value="";
  document.getElementById("paymentMethod").value="";
  document.getElementById("whatsapp").value="";
  document.getElementById("screenshot").value="";
  show("buy");
  loadAccounts();
};

// CHARGER LES COMPTES POUR ACHETER
async function loadAccounts() {
  const snap = await getDocs(collection(db, "accounts"));
  accountsList.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    if(d.status === "en attente"){
      accountsList.innerHTML += `
        <div class="account-card">
          <img src="${d.image}" width="100"><br>
          <b>@${d.username}</b><br>
          👥 ${d.followers} abonnés<br>
          💰 ${d.price} FCFA<br>
          ☎️ ${d.whatsapp}<br>
        </div><hr>
      `;
    }
  });
}

// CHARGER MES TRANSACTIONS
async function loadMyTransactions() {
  const q = query(collection(db, "accounts"), where("userId", "==", auth.currentUser.uid));
  const snap = await getDocs(q);
  myTransactions.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    const id = doc.id;
    myTransactions.innerHTML += `
      <div class="transaction-card">
        <b>@${d.username}</b> - ${d.followers} abonnés - ${d.price} FCFA - ${d.status}<br>
        <button onclick="deleteTransaction('${id}')">Supprimer</button>
      </div><hr>
    `;
  });
}

// SUPPRIMER UNE TRANSACTION
window.deleteTransaction = async (id) => {
  await deleteDoc(doc(db, "accounts", id));
  loadMyTransactions();
  loadAccounts();
};

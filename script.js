import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/* FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyA2wEZMelhCwNYKs7vtgEFhcXkPxXeTx1U",
  authDomain: "shell-toktok.firebaseapp.com",
  projectId: "shell-toktok",
  storageBucket: "shell-toktok.firebasestorage.app",
  messagingSenderId: "559812497776",
  appId: "1:559812497776:web:b2256f21be94c712fd7fb5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

/* AFFICHAGE AUTH / APP (POINT CLÉ) */
const authPage = document.getElementById("authPage");
const appPage = document.getElementById("appPage");

onAuthStateChanged(auth, (user) => {
  if (user) {
    authPage.classList.add("hidden");
    appPage.classList.remove("hidden");
    document.getElementById("userEmail").textContent = user.email;
    show("home");
    loadAccounts();
    loadMyTransactions();
  } else {
    appPage.classList.add("hidden");
    authPage.classList.remove("hidden");
  }
});

/* AUTH */
window.login = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
  } catch (e) {
    alert(e.message);
  }
};

window.register = async () => {
  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value);
  } catch (e) {
    alert(e.message);
  }
};

window.logout = () => signOut(auth);

/* NAV */
window.show = (id) => {
  document.querySelectorAll("section").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
};

/* VENDRE */
window.sellAccount = async () => {
  const file = screenshot.files[0];
  if (!file) return alert("Ajoute une capture d’écran");

  if (!whatsapp.value.startsWith("+226") && !whatsapp.value.startsWith("+33"))
    return alert("Numéro WhatsApp invalide");

  const imgRef = ref(storage, `screens/${Date.now()}`);
  await uploadBytes(imgRef, file);
  const imgUrl = await getDownloadURL(imgRef);

  await addDoc(collection(db, "accounts"), {
    userId: auth.currentUser.uid,
    username: username.value,
    followers: followers.value,
    price: price.value,
    paymentMethod: paymentMethod.value,
    whatsapp: whatsapp.value,
    image: imgUrl,
    status: "en attente",
    date: Date.now()
  });

  alert("Compte déposé !");
  show("buy");
  loadAccounts();
};

/* ACHETER */
async function loadAccounts() {
  accountsList.innerHTML = "";
  const snap = await getDocs(collection(db, "accounts"));
  snap.forEach(d => {
    const a = d.data();
    if (a.status === "en attente") {
      accountsList.innerHTML += `
        <div class="card">
          <img src="${a.image}" width="100%">
          <b>@${a.username}</b><br>
          ${a.followers} abonnés<br>
          ${a.price} FCFA
        </div>
      `;
    }
  });
}

/* TRANSACTIONS */
async function loadMyTransactions() {
  myTransactions.innerHTML = "";
  const q = query(collection(db, "accounts"), where("userId", "==", auth.currentUser.uid));
  const snap = await getDocs(q);
  snap.forEach(d => {
    const a = d.data();
    myTransactions.innerHTML += `
      <div class="card">
        @${a.username} - ${a.status}
        <button onclick="deleteTransaction('${d.id}')">Supprimer</button>
      </div>
    `;
  });
}

window.deleteTransaction = async (id) => {
  await deleteDoc(doc(db, "accounts", id));
  loadMyTransactions();
  loadAccounts();
};

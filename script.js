import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

window.register = () => {
  createUserWithEmailAndPassword(auth, email.value, password.value);
};

window.login = () => {
  signInWithEmailAndPassword(auth, email.value, password.value);
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    authPage.classList.add("hidden");
    appPage.classList.remove("hidden");
    loadAccounts();
  } else {
    authPage.classList.remove("hidden");
    appPage.classList.add("hidden");
  }
});

window.show = (id) => {
  document.querySelectorAll("section").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
};

window.sellAccount = async () => {
  const file = screenshot.files[0];
  const imageRef = ref(storage, `screenshots/${Date.now()}`);
  await uploadBytes(imageRef, file);
  const imageUrl = await getDownloadURL(imageRef);

  await addDoc(collection(db, "accounts"), {
    userId: auth.currentUser.uid,
    username: username.value,
    followers: followers.value,
    price: price.value,
    image: imageUrl,
    status: "en attente"
  });

  alert("Compte mis en vente !");
};

async function loadAccounts() {
  const snap = await getDocs(collection(db, "accounts"));
  accountsList.innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data();
    accountsList.innerHTML += `
      <div>
        <b>@${d.username}</b><br>
        👥 ${d.followers} abonnés<br>
        💰 ${d.price} FCFA
      </div><hr>
    `;
  });
}

window.requestWithdraw = async () => {
  await addDoc(collection(db, "withdraws"), {
    userId: auth.currentUser.uid,
    status: "en cours",
    date: Date.now()
  });
  alert("Demande envoyée");
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const authPage = document.getElementById("authPage");
const appPage = document.getElementById("appPage");

/* AUTH STATE */
onAuthStateChanged(auth, user => {
  if(user){
    authPage.classList.add("hidden");
    appPage.classList.remove("hidden");
    showSection("home");
    loadAccounts();
    loadTransactions();
  } else {
    authPage.classList.remove("hidden");
    appPage.classList.add("hidden");
  }
});

/* LOGIN / REGISTER */
window.login = () => {
  signInWithEmailAndPassword(auth,email.value,password.value)
    .catch(e=>alert(e.message));
};

window.register = () => {
  createUserWithEmailAndPassword(auth,email.value,password.value)
    .catch(e=>alert(e.message));
};

window.logout = () => signOut(auth);
window.showRegister = () => {
  document.getElementById("registerBox").classList.remove("hidden");
};

/* NAVIGATION */
window.showSection = (id) => {
  document.querySelectorAll(".section").forEach(s=>s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
};

window.openSupport = () => {
  window.open("https://wa.me/22605765650","_blank");
};

/* DEPOT COMPTE */
window.submitAccount = async () => {
  const file = document.getElementById("screenshot").files[0];
  if(!file) return alert("Ajoute une capture d’écran");
  const imgRef = ref(storage, `screenshots/${Date.now()}`);
  await uploadBytes(imgRef,file);
  const imgUrl = await getDownloadURL(imgRef);

  await addDoc(collection(db,"accounts"),{
    userId: auth.currentUser.uid,
    username: username.value,
    followers: followers.value,
    price: price.value,
    payment: payment.value,
    whatsapp: country.value+whatsapp.value,
    image: imgUrl,
    status:"en attente",
    date: Date.now()
  });

  document.getElementById("successMessage").classList.remove("hidden");
  setTimeout(()=>document.getElementById("successMessage").classList.add("hidden"), 3000);
  showSection("buy");
};

/* REAL-TIME DISPLAY DES COMPTES */
function loadAccounts(){
  const list = document.getElementById("accountsList");
  const col = collection(db,"accounts");
  onSnapshot(col, snap=>{
    list.innerHTML = "";
    snap.forEach(d=>{
      const a=d.data();
      if(a.status==="en attente"){
        list.innerHTML += `<div class="card">
          <img src="${a.image}" width="100%" style="border-radius:8px;">
          <b>@${a.username}</b><br>
          ${a.followers} abonnés<br>
          ${a.price} FCFA
        </div>`;
      }
    });
  });
}

/* MES TRANSACTIONS */
function loadTransactions(){
  const myTrans = document.getElementById("myTransactions");
  const col = collection(db,"accounts");
  onSnapshot(col,snap=>{
    myTrans.innerHTML="";
    snap.forEach(d=>{
      const a=d.data();
      if(a.userId===auth.currentUser.uid){
        myTrans.innerHTML+=`<div class="card">@${a.username} - ${a.status}</div>`;
      }
    });
  });
            }

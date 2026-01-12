// Ta configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA2wEZMelhCwNYKs7vtgEFhcXkPxXeTx1U",
  authDomain: "shell-toktok.firebaseapp.com",
  projectId: "shell-toktok",
  storageBucket: "shell-toktok.firebasestorage.app",
  messagingSenderId: "559812497776",
  appId: "1:559812497776:web:b2256f21be94c712fd7fb5"
};

// Initialisation
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Éléments HTML
const submitBtn = document.getElementById('submitBtn');
const accountList = document.getElementById('accountList');

// 1. FONCTION : Publier un compte
submitBtn.addEventListener('click', () => {
    const user = document.getElementById('username').value;
    const subs = document.getElementById('followers').value;
    const price = document.getElementById('price').value;

    if(user && subs && price) {
        const newAccountRef = database.ref('comptes').push();
        newAccountRef.set({
            username: user,
            followers: subs,
            price: price,
            timestamp: Date.now()
        }).then(() => {
            alert("Annonce publiée ! En attente de vérification.");
            // Réinitialiser les champs
            document.getElementById('username').value = "";
            document.getElementById('followers').value = "";
            document.getElementById('price').value = "";
        });
    } else {
        alert("Veuillez remplir tous les champs.");
    }
});

// 2. FONCTION : Afficher les comptes en temps réel
database.ref('comptes').on('value', (snapshot) => {
    accountList.innerHTML = ""; // On vide la liste avant de la rafraîchir
    
    snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        
        const card = document.createElement('div');
        card.className = "account-card";
        card.innerHTML = `
            <h3>${data.username}</h3>
            <div class="info">👥 <b>${data.followers}</b> abonnés</div>
            <span class="price-tag">${data.price} €</span>
            <button class="buy-btn" onclick="contactAdmin('${data.username}')">Acheter via Intermédiaire</button>
        `;
        accountList.appendChild(card);
    });
});

// 3. FONCTION : Contact (à personnaliser)
function contactAdmin(accountName) {
    alert("Vous allez être mis en relation avec l'intermédiaire pour le compte : " + accountName);
    // Ici tu pourrais rediriger vers ton WhatsApp ou un chat
    // window.location.href = "https://wa.me/TON_NUMERO?text=Je veux acheter le compte " + accountName;
}

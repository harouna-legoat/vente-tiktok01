/* ═══════════════════════════════════════════════════════════════════
   TIKESCROW — SCRIPT.JS
   Auteur : TikEscrow Platform
   ---------------------------------------------------------------
   GUIDE DE CONFIGURATION :
   1. Cherche "🔧 FIREBASE CONFIG" et colle ta config Firebase
   2. Cherche "🔧 CINETPAY CONFIG" et colle ta clé CinetPay
   3. Cherche "🔧 FEDAPAY CONFIG" et colle ta clé FedaPay
   4. Cherche "🔧 WHATSAPP CONFIG" et mets ton numéro WhatsApp
   5. Cherche "🔧 ADMIN CONFIG" pour le numéro Orange Money admin (10%)
═══════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════
   🔧 FIREBASE CONFIG
   Remplace cet objet par ta vraie config Firebase
   (Projet Firebase > Paramètres > Tes applications)
═══════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey:            "COLLE_TON_API_KEY_ICI",
  authDomain:        "COLLE_TON_AUTH_DOMAIN_ICI",
  projectId:         "COLLE_TON_PROJECT_ID_ICI",
  storageBucket:     "COLLE_TON_STORAGE_BUCKET_ICI",
  messagingSenderId: "COLLE_TON_MESSAGING_SENDER_ID_ICI",
  appId:             "COLLE_TON_APP_ID_ICI"
};

/* ═══════════════════════════════════════════════════
   🔧 CINETPAY CONFIG
   Récupère ta clé sur https://cinetpay.com
═══════════════════════════════════════════════════ */
const CINETPAY_API_KEY  = "COLLE_TON_API_KEY_CINETPAY_ICI";
const CINETPAY_SITE_ID  = "COLLE_TON_SITE_ID_CINETPAY_ICI";

/* ═══════════════════════════════════════════════════
   🔧 FEDAPAY CONFIG
   Récupère ta clé sur https://fedapay.com
   Utilise la clé publique (pk_live_...)
═══════════════════════════════════════════════════ */
const FEDAPAY_PUBLIC_KEY = "COLLE_TA_CLE_PUBLIQUE_FEDAPAY_ICI";

/* ═══════════════════════════════════════════════════
   🔧 WHATSAPP CONFIG
   Remplace par ton numéro WhatsApp (avec indicatif, sans +)
   ex: 2250700000000
═══════════════════════════════════════════════════ */
const WHATSAPP_NUMBER = "2250700000000";

/* ═══════════════════════════════════════════════════
   🔧 ADMIN CONFIG
   Numéro Orange Money de l'admin qui reçoit 10% de commission
═══════════════════════════════════════════════════ */
const ADMIN_MOMO_NUMBER = "+225XXXXXXXXXX"; // 🔧 Remplace par ton numéro Orange Money

/* ═══════════════════════════════════════════════════
   INITIALISATION FIREBASE
═══════════════════════════════════════════════════ */
firebase.initializeApp(firebaseConfig);
const auth      = firebase.auth();
const db        = firebase.firestore();
const storage   = firebase.storage();

/* ── Variables globales ── */
let currentUser       = null;
let pendingAuthAction = null;  // "acheter" | "vendre" — action après connexion
let currentListing    = null;  // Annonce en cours d'achat
let confirmationResult = null; // Pour la vérification OTP téléphone

/* ═══════════════════════════════════════════════════
   SPLASH SCREEN & INITIALISATION
═══════════════════════════════════════════════════ */
window.addEventListener("load", () => {
  // Lien WhatsApp
  const waLink = document.getElementById("whatsapp-link");
  if (waLink) waLink.href = `https://wa.me/${WHATSAPP_NUMBER}`;

  // Écouter l'état de connexion Firebase
  auth.onAuthStateChanged(user => {
    currentUser = user;

    // Masquer le splash après 1.5s
    setTimeout(() => {
      const splash = document.getElementById("splash-screen");
      if (splash) {
        splash.style.opacity = "0";
        setTimeout(() => splash.remove(), 500);
      }

      if (user) {
        // Utilisateur connecté
        document.getElementById("navbar").classList.remove("hidden");
        document.getElementById("nav-username").textContent =
          user.displayName || user.phoneNumber || user.email || "Utilisateur";
        // Rediriger vers le tableau de bord
        showPage("page-dashboard");
        // Si action en attente (acheter/vendre)
        if (pendingAuthAction === "vendre") showPage("page-sell");
        else if (pendingAuthAction === "acheter") showPage("page-listings");
        pendingAuthAction = null;
      } else {
        // Non connecté : afficher l'accueil
        document.getElementById("navbar").classList.add("hidden");
        showPage("page-home");
      }
    }, 1500);
  });
});

/* ═══════════════════════════════════════════════════
   NAVIGATION ENTRE PAGES
═══════════════════════════════════════════════════ */
function showPage(pageId, action = null) {
  // Si action (acheter/vendre) et non connecté → aller à l'auth
  if ((pageId === "page-sell" || pageId === "page-listings") && !currentUser) {
    pendingAuthAction = action || (pageId === "page-sell" ? "vendre" : "acheter");
    pageId = "page-auth";
  }

  // Masquer toutes les pages
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));

  // Afficher la page cible
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Actions au changement de page
  if (pageId === "page-listings")   loadListings();
  if (pageId === "page-mylistings") loadMyListings();
}

/* ═══════════════════════════════════════════════════
   AUTHENTIFICATION — GOOGLE
═══════════════════════════════════════════════════ */
function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      // onAuthStateChanged s'occupe du reste
    })
    .catch(err => {
      showAuthError("Erreur Google : " + err.message);
    });
}

/* ═══════════════════════════════════════════════════
   AUTHENTIFICATION — TÉLÉPHONE (OTP)
   Étape 1 : Envoyer le SMS
═══════════════════════════════════════════════════ */
function sendOTPAuth() {
  const phone = document.getElementById("input-phone").value.trim();
  if (!phone || phone.length < 8) {
    showAuthError("Numéro de téléphone invalide.");
    return;
  }

  // ReCAPTCHA invisible (obligatoire pour Firebase Phone Auth)
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
    size: "invisible",
    callback: () => {} // ReCAPTCHA résolu automatiquement
  });

  auth.signInWithPhoneNumber(phone, window.recaptchaVerifier)
    .then(result => {
      confirmationResult = result;
      // Afficher le champ de saisie du code SMS
      document.getElementById("phone-step-1").classList.add("hidden");
      document.getElementById("phone-step-2").classList.remove("hidden");
    })
    .catch(err => {
      showAuthError("Erreur d'envoi SMS : " + err.message);
      // Réinitialiser le reCAPTCHA en cas d'erreur
      if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
    });
}

/* ═══════════════════════════════════════════════════
   AUTHENTIFICATION — TÉLÉPHONE (OTP)
   Étape 2 : Vérifier le code SMS
═══════════════════════════════════════════════════ */
function verifyOTPAuth() {
  const code = document.getElementById("input-sms-code").value.trim();
  if (!code || code.length < 4) {
    showAuthError("Code invalide.");
    return;
  }
  if (!confirmationResult) {
    showAuthError("Session expirée. Recommence depuis le début.");
    return;
  }

  confirmationResult.confirm(code)
    .then(() => {
      // onAuthStateChanged prend le relais
    })
    .catch(err => {
      showAuthError("Code incorrect : " + err.message);
    });
}

function showAuthError(msg) {
  const el = document.getElementById("auth-error");
  if (el) el.textContent = msg;
}

/* ═══════════════════════════════════════════════════
   DÉCONNEXION
═══════════════════════════════════════════════════ */
function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    showPage("page-home");
  });
}

/* ═══════════════════════════════════════════════════
   VENDEUR — SOUMETTRE UNE ANNONCE
═══════════════════════════════════════════════════ */
async function submitListing() {
  if (!currentUser) { showPage("page-auth", "vendre"); return; }

  // Récupérer les valeurs
  const followers   = parseInt(document.getElementById("sell-followers").value);
  const price       = parseFloat(document.getElementById("sell-price").value);
  const currency    = document.getElementById("sell-currency").value;
  const country     = document.getElementById("sell-country").value.trim();
  const momoNumber  = document.getElementById("sell-momo").value.trim();
  const tiktokUser  = document.getElementById("sell-tiktok-user").value.trim();
  const tiktokPass  = document.getElementById("sell-tiktok-pass").value.trim();
  const tiktokEmail = document.getElementById("sell-tiktok-email").value.trim();
  const screenshot  = document.getElementById("sell-screenshot").files[0];

  // Validation basique
  if (!followers || !price || !country || !momoNumber || !tiktokUser || !tiktokPass) {
    showModal("⚠️ Champs manquants", "Merci de remplir tous les champs obligatoires.");
    return;
  }

  try {
    showModal("⏳ Traitement…", "Upload de la capture et enregistrement en cours…");

    // 1. Uploader la capture d'écran sur Firebase Storage
    let screenshotUrl = "";
    if (screenshot) {
      const storageRef = storage.ref(`screenshots/${currentUser.uid}_${Date.now()}`);
      const snap = await storageRef.put(screenshot);
      screenshotUrl = await snap.ref.getDownloadURL();
    }

    // ─────────────────────────────────────────────────────────────
    // ⚠️ SÉCURITÉ IMPORTANTE :
    // Les identifiants TikTok sont stockés dans Firestore.
    // Dans une vraie production, tu dois chiffrer tiktokPass
    // côté serveur (Firebase Cloud Functions + chiffrement AES)
    // avant de le stocker. Ne jamais stocker un mot de passe en clair.
    // ─────────────────────────────────────────────────────────────
    const listingData = {
      sellerId:     currentUser.uid,
      sellerPhone:  currentUser.phoneNumber || currentUser.email || "",
      followers,
      price,
      currency,
      country,
      momoNumber,       // Numéro Mobile Money vendeur (recevra 90%)
      screenshotUrl,
      // Identifiants chiffrés (à chiffrer en production)
      tiktokUser,
      tiktokPass,       // 🔧 En production : chiffrer avant stockage
      tiktokEmail,
      status:     "pending",  // En attente de validation admin
      createdAt:  firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("listings").add(listingData);

    closeModal();
    showModal(
      "✅ Annonce soumise !",
      "Ton compte a bien été soumis.\n\nIl sera visible par les acheteurs uniquement après vérification manuelle par notre équipe.\n\n⚠️ Pense à te déconnecter de ton compte TikTok maintenant."
    );

    // Réinitialiser le formulaire
    document.getElementById("sell-followers").value = "";
    document.getElementById("sell-price").value = "";
    document.getElementById("sell-country").value = "";
    document.getElementById("sell-momo").value = "";
    document.getElementById("sell-tiktok-user").value = "";
    document.getElementById("sell-tiktok-pass").value = "";
    document.getElementById("sell-tiktok-email").value = "";
    document.getElementById("sell-screenshot").value = "";
    document.getElementById("screenshot-preview").innerHTML = "";

  } catch (err) {
    closeModal();
    showModal("❌ Erreur", "Une erreur est survenue : " + err.message);
  }
}

// Prévisualiser la capture d'écran
document.addEventListener("DOMContentLoaded", () => {
  const screenshotInput = document.getElementById("sell-screenshot");
  if (screenshotInput) {
    screenshotInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          document.getElementById("screenshot-preview").innerHTML =
            `<img src="${ev.target.result}" alt="Aperçu"/>`;
        };
        reader.readAsDataURL(file);
      }
    });
  }
});

/* ═══════════════════════════════════════════════════
   ACHETEUR — CHARGER LES ANNONCES APPROUVÉES
═══════════════════════════════════════════════════ */
async function loadListings() {
  const grid = document.getElementById("listings-grid");
  if (!grid) return;
  grid.innerHTML = '<div class="loading-spinner">Chargement des annonces…</div>';

  try {
    const minFollowers = parseInt(document.getElementById("filter-min")?.value) || 0;
    const maxFollowers = parseInt(document.getElementById("filter-max")?.value) || 999999999;

    // Charger uniquement les annonces avec status = "approved" (validées par l'admin)
    const snap = await db.collection("listings")
      .where("status", "==", "approved")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const listings = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(l => l.followers >= minFollowers && l.followers <= maxFollowers);

    if (listings.length === 0) {
      grid.innerHTML = '<div class="loading-spinner">Aucun compte disponible pour le moment.</div>';
      return;
    }

    grid.innerHTML = listings.map(l => `
      <div class="listing-card" onclick="openListing('${l.id}')">
        <div class="listing-card-header">
          <div class="listing-followers">${formatFollowers(l.followers)} abonnés</div>
          <div class="listing-price">${formatPrice(l.price, l.currency)}</div>
        </div>
        <div class="listing-meta">
          <span>🌍 ${l.country || "–"}</span>
          <span>💳 10% commission incluse</span>
        </div>
        ${l.screenshotUrl ? `<img src="${l.screenshotUrl}" alt="Capture TikTok" loading="lazy"/>` : ""}
      </div>
    `).join("");

  } catch (err) {
    grid.innerHTML = `<div class="loading-spinner">Erreur : ${err.message}</div>`;
  }
}

/* ═══════════════════════════════════════════════════
   ACHETEUR — OUVRIR UNE ANNONCE EN DÉTAIL
═══════════════════════════════════════════════════ */
async function openListing(listingId) {
  try {
    const doc  = await db.collection("listings").doc(listingId).get();
    const data = { id: doc.id, ...doc.data() };
    currentListing = data;

    const content = document.getElementById("detail-content");
    content.innerHTML = `
      <div class="detail-card">
        <h3>📊 Détails du compte</h3>
        <div class="detail-row"><span class="dr-label">Abonnés</span><span class="dr-value">${formatFollowers(data.followers)}</span></div>
        <div class="detail-row"><span class="dr-label">Prix</span><span class="dr-value">${formatPrice(data.price, data.currency)}</span></div>
        <div class="detail-row"><span class="dr-label">Pays d'origine</span><span class="dr-value">${data.country || "–"}</span></div>
        <div class="detail-row"><span class="dr-label">Commission plateforme</span><span class="dr-value">10%</span></div>
        ${data.screenshotUrl ? `<img src="${data.screenshotUrl}" alt="Capture du compte"/>` : ""}
      </div>
    `;

    showPage("page-detail");

  } catch (err) {
    showModal("❌ Erreur", "Impossible de charger l'annonce.");
  }
}

/* ═══════════════════════════════════════════════════
   PAIEMENT — INITIALISER
   Appelé quand l'acheteur clique sur CinetPay ou FedaPay
═══════════════════════════════════════════════════ */
async function initPayment(provider) {
  if (!currentUser) { showPage("page-auth", "acheter"); return; }
  if (!currentListing) { showModal("❌ Erreur", "Aucune annonce sélectionnée."); return; }

  const amount      = currentListing.price;
  const currency    = currentListing.currency === "FCFA" ? "XOF" : currentListing.currency;
  const transactionId = `TIK_${Date.now()}_${Math.random().toString(36).substr(2,6).toUpperCase()}`;

  // Enregistrer la transaction en attente dans Firestore
  await db.collection("transactions").add({
    listingId:     currentListing.id,
    buyerId:       currentUser.uid,
    sellerId:      currentListing.sellerId,
    amount,
    currency:      currentListing.currency,
    provider,
    transactionId,
    status:        "pending",
    createdAt:     firebase.firestore.FieldValue.serverTimestamp()
  });

  if (provider === "cinetpay") {
    initCinetPay(amount, currency, transactionId);
  } else if (provider === "fedapay") {
    initFedaPay(amount, currency, transactionId);
  }
}

/* ═══════════════════════════════════════════════════
   PAIEMENT — CINETPAY
   Documentation : https://docs.cinetpay.com
   
   🔧 Pour que ça fonctionne :
   1. Colle ta clé dans CINETPAY_API_KEY et CINETPAY_SITE_ID
   2. Ajoute le SDK CinetPay dans index.html :
      <script src="https://cdn.cinetpay.com/seamless/main.js"></script>
═══════════════════════════════════════════════════ */
function initCinetPay(amount, currency, transactionId) {
  /* ─────────────────────────────────────────────
     🔧 CINETPAY INTEGRATION
     Décommente ce bloc une fois le SDK chargé et ta clé configurée.
     
     CinetPay.setConfig({
       apikey:        CINETPAY_API_KEY,
       site_id:       CINETPAY_SITE_ID,
       notify_url:    "https://ton-domaine.com/notify",  // URL de callback serveur
       mode:          "PRODUCTION"  // ou "TEST" pour les tests
     });
     CinetPay.getCheckout({
       transaction_id: transactionId,
       amount:         amount,
       currency:       currency,
       channels:       "ALL",
       description:    "Achat compte TikTok via TikEscrow",
       customer_id:    currentUser.uid,
     });
     CinetPay.waitResponse(data => {
       if (data.status === "ACCEPTED") {
         onPaymentSuccess(transactionId);
       } else {
         showModal("❌ Paiement échoué", "Le paiement n'a pas été validé. Réessaie.");
       }
     });
     CinetPay.onError(data => {
       showModal("❌ Erreur CinetPay", data.description || "Erreur de paiement.");
     });
  ───────────────────────────────────────────── */
  showModal(
    "💳 CinetPay – Mode démo",
    `Montant : ${formatPrice(amount, currentListing.currency)}\n\nID transaction : ${transactionId}\n\n🔧 Connecte ta vraie clé CinetPay dans script.js pour activer le vrai paiement.\n\nCliquer OK simule un paiement réussi (démo uniquement).`,
    () => onPaymentSuccess(transactionId)
  );
}

/* ═══════════════════════════════════════════════════
   PAIEMENT — FEDAPAY
   Documentation : https://docs.fedapay.com
   
   🔧 Pour que ça fonctionne :
   1. Colle ta clé publique dans FEDAPAY_PUBLIC_KEY
   2. Ajoute le SDK FedaPay dans index.html :
      <script src="https://cdn.fedapay.com/checkout.js?v=1.1.7"></script>
═══════════════════════════════════════════════════ */
function initFedaPay(amount, currency, transactionId) {
  /* ─────────────────────────────────────────────
     🔧 FEDAPAY INTEGRATION
     Décommente ce bloc une fois le SDK chargé et ta clé configurée.
     
     FedaPay.init({
       public_key:     FEDAPAY_PUBLIC_KEY,
       transaction: {
         amount:      amount,
         description: "Achat compte TikTok",
         custom_metadata: { transactionId }
       },
       customer: {
         email: currentUser.email || "client@tikescrow.com",
         phone_number: currentUser.phoneNumber || ""
       },
       onComplete: function(object) {
         if (object.reason === FedaPay.DIALOG_DISMISSED) {
           showModal("❌ Annulé", "Tu as annulé le paiement.");
         } else {
           onPaymentSuccess(transactionId);
         }
       }
     }).open();
  ───────────────────────────────────────────── */
  showModal(
    "💳 FedaPay – Mode démo",
    `Montant : ${formatPrice(amount, currentListing.currency)}\n\nID transaction : ${transactionId}\n\n🔧 Connecte ta vraie clé FedaPay dans script.js pour activer le vrai paiement.\n\nCliquer OK simule un paiement réussi (démo uniquement).`,
    () => onPaymentSuccess(transactionId)
  );
}

/* ═══════════════════════════════════════════════════
   PAIEMENT — SUCCÈS : LIVRAISON DES IDENTIFIANTS
   
   ⚠️ LOGIQUE DE COMMISSION (10% admin / 90% vendeur) :
   Ce calcul se fait idéalement dans une Firebase Cloud Function
   déclenchée après confirmation de paiement côté serveur.
   Voici la logique à implémenter côté backend :
   
   const commission  = amount * 0.10;   → envoyé à ADMIN_MOMO_NUMBER
   const sellerShare = amount * 0.90;   → envoyé à listing.momoNumber
   
   Utilise l'API de versement de CinetPay ou FedaPay pour
   déclencher les virements automatiquement.
═══════════════════════════════════════════════════ */
async function onPaymentSuccess(transactionId) {
  closeModal();

  if (!currentListing) return;

  try {
    // 1. Mettre à jour le statut de la transaction
    const txSnap = await db.collection("transactions")
      .where("transactionId", "==", transactionId)
      .limit(1).get();

    if (!txSnap.empty) {
      await txSnap.docs[0].ref.update({
        status:    "completed",
        paidAt:    firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    // 2. Marquer l'annonce comme vendue
    await db.collection("listings").doc(currentListing.id).update({
      status: "sold",
      soldAt: firebase.firestore.FieldValue.serverTimestamp(),
      buyerId: currentUser.uid
    });

    // 3. Afficher les identifiants à l'acheteur
    const reveal = document.getElementById("credentials-reveal");
    reveal.innerHTML = `
      <div class="cred-row">
        <span class="cred-label">Nom d'utilisateur TikTok</span>
        <span class="cred-value">@${currentListing.tiktokUser}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Mot de passe</span>
        <span class="cred-value">${currentListing.tiktokPass}</span>
      </div>
      ${currentListing.tiktokEmail ? `
      <div class="cred-row">
        <span class="cred-label">Email lié</span>
        <span class="cred-value">${currentListing.tiktokEmail}</span>
      </div>` : ""}
      <div class="cred-row">
        <span class="cred-label">Pays</span>
        <span class="cred-value">${currentListing.country}</span>
      </div>
    `;

    currentListing = null;
    showPage("page-delivery");

  } catch (err) {
    showModal("❌ Erreur critique", "Paiement reçu mais erreur lors de la livraison. Contacte le support WhatsApp immédiatement.");
  }
}

/* ═══════════════════════════════════════════════════
   VENDEUR — MES ANNONCES
═══════════════════════════════════════════════════ */
async function loadMyListings() {
  const grid = document.getElementById("mylistings-grid");
  if (!grid || !currentUser) return;
  grid.innerHTML = '<div class="loading-spinner">Chargement…</div>';

  try {
    const snap = await db.collection("listings")
      .where("sellerId", "==", currentUser.uid)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (snap.empty) {
      grid.innerHTML = '<div class="loading-spinner">Tu n\'as aucune annonce pour le moment.</div>';
      return;
    }

    grid.innerHTML = snap.docs.map(doc => {
      const l = { id: doc.id, ...doc.data() };
      const statusLabel = {
        pending:   "En attente de vérification",
        approved:  "En ligne – visible aux acheteurs",
        sold:      "Vendu ✓",
        cancelled: "Annulé"
      }[l.status] || l.status;

      const canCancel = l.status === "pending" || l.status === "approved";

      return `
        <div class="mylisting-card">
          <div class="mylisting-header">
            <span class="mylisting-title">${formatFollowers(l.followers)} abonnés</span>
            <span class="status-badge status-${l.status}">${statusLabel}</span>
          </div>
          <div class="mylisting-meta">
            💰 ${formatPrice(l.price, l.currency)} • 🌍 ${l.country || "–"}
          </div>
          ${canCancel ? `<button class="btn-cancel" onclick="cancelListing('${l.id}')">Annuler cette annonce</button>` : ""}
        </div>
      `;
    }).join("");

  } catch (err) {
    grid.innerHTML = `<div class="loading-spinner">Erreur : ${err.message}</div>`;
  }
}

/* ═══════════════════════════════════════════════════
   VENDEUR — ANNULER UNE ANNONCE
   L'admin sera notifié et renverra les identifiants manuellement
═══════════════════════════════════════════════════ */
async function cancelListing(listingId) {
  if (!confirm("Confirmer l'annulation ? L'administrateur te renverra tes identifiants sous 24h.")) return;

  try {
    await db.collection("listings").doc(listingId).update({
      status:      "cancelled",
      cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Créer une notification pour l'admin dans Firestore
    // 🔧 L'admin peut surveiller la collection "admin_notifications"
    await db.collection("admin_notifications").add({
      type:      "listing_cancelled",
      listingId,
      sellerId:  currentUser.uid,
      message:   `Le vendeur ${currentUser.uid} a annulé son annonce ${listingId}. Renvoyer les identifiants.`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      read:      false
    });

    showModal("✅ Annonce annulée", "Ton annonce a été annulée. Notre équipe te renverra tes identifiants dans les plus brefs délais.");
    loadMyListings();

  } catch (err) {
    showModal("❌ Erreur", "Impossible d'annuler : " + err.message);
  }
}

/* ═══════════════════════════════════════════════════
   MODAL UTILITAIRE
═══════════════════════════════════════════════════ */
function showModal(title, message, onClose = null) {
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("modal-content");
  content.innerHTML = `
    <h3>${title}</h3>
    <p>${message.replace(/\n/g, "<br/>")}</p>
  `;
  overlay.classList.remove("hidden");

  // Callback optionnel quand on ferme
  overlay._onClose = onClose;
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  overlay.classList.add("hidden");
  if (typeof overlay._onClose === "function") {
    overlay._onClose();
    overlay._onClose = null;
  }
}

/* ═══════════════════════════════════════════════════
   UTILITAIRES D'AFFICHAGE
═══════════════════════════════════════════════════ */
function formatFollowers(n) {
  if (!n) return "–";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(0) + "K";
  return n.toString();
}

function formatPrice(price, currency = "FCFA") {
  if (!price) return "–";
  return new Intl.NumberFormat("fr-FR").format(price) + " " + currency;
}

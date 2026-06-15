/* ═══════════════════════════════════════════════════════════════
   TIKESCROW — SCRIPT.JS — VERSION FINALE CORRIGÉE
   ─────────────────────────────────────────────────────────────
   ✅ Firebase  : shell-toktok (intégré)
   ✅ FedaPay   : clé publique pk_live_... (intégrée)
   ✅ WhatsApp  : +226 05 76 56 50 (intégré)
   ✅ Admin     : +226 05 76 56 50 — reçoit 10% de commission
   ✅ CORRECTIF : Google → signInWithRedirect (plus de popup bloquée)
   ✅ CORRECTIF : reCAPTCHA → rendu unique (plus d'erreur double rendu)
═══════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════
   ✅ CONFIG FIREBASE — shell-toktok
═══════════════════════════════════════ */
const firebaseConfig = {
  apiKey:            "AIzaSyA2wEZMelhCwNYKs7vtgEFhcXkPxXeTx1U",
  authDomain:        "shell-toktok.firebaseapp.com",
  projectId:         "shell-toktok",
  storageBucket:     "shell-toktok.firebasestorage.app",
  messagingSenderId: "559812497776",
  appId:             "1:559812497776:web:aac415e3d6c0bc2afd7fb5",
  measurementId:     "G-WK90ML0EDK"
};

/* ═══════════════════════════════════════
   ✅ CONFIG FEDAPAY
═══════════════════════════════════════ */
const FEDAPAY_PUBLIC_KEY = "pk_live_DXMkqOLzATcQL50WA5nLDcZA";

/* ═══════════════════════════════════════
   ✅ CONFIG ADMIN & WHATSAPP
═══════════════════════════════════════ */
const ADMIN_MOMO_NUMBER = "+22605765650";
const WHATSAPP_NUMBER   = "22605765650";

/* ═══════════════════════════════════════
   INITIALISATION FIREBASE
═══════════════════════════════════════ */
firebase.initializeApp(firebaseConfig);
const auth      = firebase.auth();
const db        = firebase.firestore();
const storage   = firebase.storage();
const analytics = firebase.analytics();

/* ── Variables globales ── */
let currentUser        = null;
let pendingAuthAction  = null;
let currentListing     = null;
let confirmationResult = null;
let recaptchaVerifier  = null; // ✅ CORRECTIF : variable globale unique pour reCAPTCHA

/* ═══════════════════════════════════════
   DÉMARRAGE
═══════════════════════════════════════ */
window.addEventListener("load", () => {

  /* ✅ CORRECTIF GOOGLE : gérer le retour après redirection */
  auth.getRedirectResult()
    .then(result => {
      if (result && result.user) {
        // Connexion Google réussie via redirection
        // onAuthStateChanged s'occupe du reste
      }
    })
    .catch(err => {
      if (err.code !== "auth/no-current-user") {
        showAuthError("Erreur Google : " + err.message);
      }
    });

  /* Écouter l'état de connexion */
  auth.onAuthStateChanged(user => {
    currentUser = user;

    setTimeout(() => {
      const splash = document.getElementById("splash-screen");
      if (splash) {
        splash.style.opacity = "0";
        setTimeout(() => splash.remove(), 500);
      }

      if (user) {
        document.getElementById("navbar").classList.remove("hidden");
        document.getElementById("nav-username").textContent =
          user.displayName || user.phoneNumber || user.email || "Utilisateur";

        if (pendingAuthAction === "vendre")       showPage("page-sell");
        else if (pendingAuthAction === "acheter") showPage("page-listings");
        else                                      showPage("page-dashboard");
        pendingAuthAction = null;
      } else {
        document.getElementById("navbar").classList.add("hidden");
        showPage("page-home");
      }
    }, 1500);
  });

  /* Preview image vendeur */
  const screenshotInput = document.getElementById("sell-screenshot");
  if (screenshotInput) {
    screenshotInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById("screenshot-preview").innerHTML =
          `<img src="${ev.target.result}" alt="Aperçu"/>`;
      };
      reader.readAsDataURL(file);
    });
  }
});

/* ═══════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════ */
function showPage(pageId, action = null) {
  if ((pageId === "page-sell" || pageId === "page-listings") && !currentUser) {
    pendingAuthAction = action || (pageId === "page-sell" ? "vendre" : "acheter");
    pageId = "page-auth";
  }

  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (pageId === "page-listings")   loadListings();
  if (pageId === "page-mylistings") loadMyListings();

  const authErr = document.getElementById("auth-error");
  if (authErr) authErr.textContent = "";
}

/* ═══════════════════════════════════════
   ✅ AUTH GOOGLE — REDIRECTION
   (remplace signInWithPopup qui était bloquée)
═══════════════════════════════════════ */
function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  // signInWithRedirect = redirige vers Google puis revient sur le site
  // Fonctionne sur tous les navigateurs et tous les mobiles
  auth.signInWithRedirect(provider).catch(err => {
    showAuthError("Erreur Google : " + err.message);
  });
}

/* ═══════════════════════════════════════
   ✅ AUTH TÉLÉPHONE — ÉTAPE 1 : Envoyer SMS
   CORRECTIF : reCAPTCHA créé une seule fois
═══════════════════════════════════════ */
function sendOTPAuth() {
  const phone = document.getElementById("input-phone").value.trim();
  if (!phone || phone.length < 8) {
    showAuthError("Numéro invalide. Exemple : +22605765650");
    return;
  }

  // ✅ CORRECTIF : vider le conteneur avant de créer un nouveau reCAPTCHA
  const container = document.getElementById("recaptcha-container");
  container.innerHTML = ""; // Vide le div pour éviter le double rendu

  // ✅ CORRECTIF : réinitialiser proprement l'ancien reCAPTCHA s'il existe
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch (e) {}
    recaptchaVerifier = null;
  }

  // Créer un nouveau reCAPTCHA invisible
  recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
    size: "invisible",
    callback: () => {}
  });

  auth.signInWithPhoneNumber(phone, recaptchaVerifier)
    .then(result => {
      confirmationResult = result;
      document.getElementById("phone-step-1").classList.add("hidden");
      document.getElementById("phone-step-2").classList.remove("hidden");
    })
    .catch(err => {
      showAuthError("Erreur SMS : " + err.message);
      // Nettoyer en cas d'erreur
      if (recaptchaVerifier) {
        try { recaptchaVerifier.clear(); } catch (e) {}
        recaptchaVerifier = null;
      }
      container.innerHTML = "";
    });
}

/* ═══════════════════════════════════════
   AUTH TÉLÉPHONE — ÉTAPE 2 : Vérifier SMS
═══════════════════════════════════════ */
function verifyOTPAuth() {
  const code = document.getElementById("input-sms-code").value.trim();
  if (!code || code.length < 4) {
    showAuthError("Code invalide.");
    return;
  }
  if (!confirmationResult) {
    showAuthError("Session expirée. Recommence depuis le début.");
    resetPhoneAuth();
    return;
  }
  confirmationResult.confirm(code).catch(err => {
    showAuthError("Code incorrect : " + err.message);
  });
}

/* ═══════════════════════════════════════
   AUTH TÉLÉPHONE — RESET
═══════════════════════════════════════ */
function resetPhoneAuth() {
  confirmationResult = null;

  // Nettoyer le reCAPTCHA
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch (e) {}
    recaptchaVerifier = null;
  }
  const container = document.getElementById("recaptcha-container");
  if (container) container.innerHTML = "";

  document.getElementById("phone-step-1").classList.remove("hidden");
  document.getElementById("phone-step-2").classList.add("hidden");
  document.getElementById("input-phone").value      = "";
  document.getElementById("input-sms-code").value   = "";
}

function showAuthError(msg) {
  const el = document.getElementById("auth-error");
  if (el) el.textContent = msg;
}

/* ═══════════════════════════════════════
   DÉCONNEXION
═══════════════════════════════════════ */
function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    showPage("page-home");
  });
}

/* ═══════════════════════════════════════
   VENDEUR — SOUMETTRE UNE ANNONCE
═══════════════════════════════════════ */
async function submitListing() {
  if (!currentUser) { showPage("page-auth", "vendre"); return; }

  const followers   = parseInt(document.getElementById("sell-followers").value);
  const price       = parseFloat(document.getElementById("sell-price").value);
  const currency    = document.getElementById("sell-currency").value;
  const country     = document.getElementById("sell-country").value.trim();
  const momoNumber  = document.getElementById("sell-momo").value.trim();
  const tiktokUser  = document.getElementById("sell-tiktok-user").value.trim();
  const tiktokPass  = document.getElementById("sell-tiktok-pass").value.trim();
  const tiktokEmail = document.getElementById("sell-tiktok-email").value.trim();
  const screenshot  = document.getElementById("sell-screenshot").files[0];

  if (!followers || !price || !country || !momoNumber || !tiktokUser || !tiktokPass) {
    showModal("⚠️ Champs manquants", "Merci de remplir tous les champs obligatoires.");
    return;
  }

  try {
    showModal("⏳ Envoi en cours…", "Upload et enregistrement. Merci de patienter.");

    let screenshotUrl = "";
    if (screenshot) {
      const ref  = storage.ref(`screenshots/${currentUser.uid}_${Date.now()}`);
      const snap = await ref.put(screenshot);
      screenshotUrl = await snap.ref.getDownloadURL();
    }

    await db.collection("listings").add({
      sellerId:    currentUser.uid,
      sellerPhone: currentUser.phoneNumber || currentUser.email || "",
      followers,
      price,
      currency,
      country,
      momoNumber,
      screenshotUrl,
      tiktokUser,
      tiktokPass,
      tiktokEmail,
      status:    "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    closeModal();
    showModal(
      "✅ Annonce soumise !",
      "Ton compte a été soumis avec succès.\n\nIl sera visible après vérification manuelle par notre équipe.\n\n⚠️ Déconnecte-toi de ton compte TikTok maintenant !"
    );

    ["sell-followers","sell-price","sell-country","sell-momo",
     "sell-tiktok-user","sell-tiktok-pass","sell-tiktok-email"].forEach(id => {
      document.getElementById(id).value = "";
    });
    document.getElementById("sell-screenshot").value    = "";
    document.getElementById("screenshot-preview").innerHTML = "";

  } catch (err) {
    closeModal();
    showModal("❌ Erreur", "Une erreur est survenue : " + err.message);
  }
}

/* ═══════════════════════════════════════
   ACHETEUR — CHARGER LES ANNONCES
═══════════════════════════════════════ */
async function loadListings() {
  const grid = document.getElementById("listings-grid");
  if (!grid) return;
  grid.innerHTML = '<div class="loading-spinner">Chargement des annonces…</div>';

  try {
    const minF = parseInt(document.getElementById("filter-min")?.value) || 0;
    const maxF = parseInt(document.getElementById("filter-max")?.value) || 999999999;

    const snap = await db.collection("listings")
      .where("status", "==", "approved")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const listings = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(l => l.followers >= minF && l.followers <= maxF);

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
          <span>✅ Vérifié</span>
        </div>
        ${l.screenshotUrl ? `<img src="${l.screenshotUrl}" alt="Capture TikTok" loading="lazy"/>` : ""}
      </div>
    `).join("");

  } catch (err) {
    grid.innerHTML = `<div class="loading-spinner">Erreur : ${err.message}</div>`;
  }
}

/* ═══════════════════════════════════════
   ACHETEUR — OUVRIR UNE ANNONCE
═══════════════════════════════════════ */
async function openListing(listingId) {
  if (!currentUser) { showPage("page-auth", "acheter"); return; }

  try {
    const doc = await db.collection("listings").doc(listingId).get();
    if (!doc.exists) { showModal("❌ Erreur", "Annonce introuvable."); return; }

    currentListing = { id: doc.id, ...doc.data() };

    document.getElementById("detail-content").innerHTML = `
      <div class="detail-card">
        <h3>📊 Détails du compte</h3>
        <div class="detail-row">
          <span class="dr-label">Abonnés</span>
          <span class="dr-value">${formatFollowers(currentListing.followers)}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Prix</span>
          <span class="dr-value">${formatPrice(currentListing.price, currentListing.currency)}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Pays d'origine</span>
          <span class="dr-value">${currentListing.country || "–"}</span>
        </div>
        <div class="detail-row">
          <span class="dr-label">Commission plateforme</span>
          <span class="dr-value">10% inclus</span>
        </div>
        ${currentListing.screenshotUrl
          ? `<img src="${currentListing.screenshotUrl}" alt="Capture du compte"/>`
          : ""}
      </div>
    `;

    showPage("page-detail");

  } catch (err) {
    showModal("❌ Erreur", "Impossible de charger l'annonce : " + err.message);
  }
}

/* ═══════════════════════════════════════
   PAIEMENT — FEDAPAY
   10% → +22605765650 (admin)
   90% → numéro Mobile Money du vendeur
═══════════════════════════════════════ */
async function initPayment() {
  if (!currentUser)    { showPage("page-auth", "acheter"); return; }
  if (!currentListing) { showModal("❌ Erreur", "Aucune annonce sélectionnée."); return; }

  if (typeof FedaPay === "undefined") {
    showModal("❌ Erreur", "Le service de paiement n'est pas disponible. Recharge la page.");
    return;
  }

  const amount        = currentListing.price;
  const transactionId = `TIK_${Date.now()}_${Math.random().toString(36).substr(2,6).toUpperCase()}`;

  try {
    await db.collection("transactions").add({
      listingId:   currentListing.id,
      buyerId:     currentUser.uid,
      sellerId:    currentListing.sellerId,
      sellerMomo:  currentListing.momoNumber,
      adminMomo:   ADMIN_MOMO_NUMBER,
      amount,
      currency:    currentListing.currency,
      commission:  Math.round(amount * 0.10),
      sellerShare: Math.round(amount * 0.90),
      transactionId,
      status:      "pending",
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    showModal("❌ Erreur", "Impossible d'initialiser le paiement : " + err.message);
    return;
  }

  FedaPay.init({
    public_key:  FEDAPAY_PUBLIC_KEY,
    transaction: {
      amount,
      description: `Achat compte TikTok – ${formatFollowers(currentListing.followers)} abonnés`,
      custom_metadata: { transactionId, listingId: currentListing.id, buyerId: currentUser.uid }
    },
    customer: {
      email:        currentUser.email        || "client@tikescrow.com",
      phone_number: currentUser.phoneNumber  || ""
    },
    onComplete: function(object) {
      if (object.reason === FedaPay.DIALOG_DISMISSED) {
        showModal("❌ Paiement annulé", "Tu as annulé le paiement. Tu peux réessayer quand tu veux.");
      } else {
        onPaymentSuccess(transactionId);
      }
    }
  }).open();
}

/* ═══════════════════════════════════════
   PAIEMENT RÉUSSI — LIVRAISON
═══════════════════════════════════════ */
async function onPaymentSuccess(transactionId) {
  if (!currentListing) return;

  try {
    const txSnap = await db.collection("transactions")
      .where("transactionId", "==", transactionId)
      .limit(1).get();

    if (!txSnap.empty) {
      await txSnap.docs[0].ref.update({
        status: "completed",
        paidAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    await db.collection("listings").doc(currentListing.id).update({
      status:  "sold",
      soldAt:  firebase.firestore.FieldValue.serverTimestamp(),
      buyerId: currentUser.uid
    });

    await db.collection("admin_notifications").add({
      type:        "payment_received",
      transactionId,
      listingId:   currentListing.id,
      amount:      currentListing.price,
      currency:    currentListing.currency,
      commission:  Math.round(currentListing.price * 0.10),
      sellerShare: Math.round(currentListing.price * 0.90),
      sellerMomo:  currentListing.momoNumber,
      adminMomo:   ADMIN_MOMO_NUMBER,
      message:     `Paiement reçu ! Envoyer ${Math.round(currentListing.price * 0.90)} ${currentListing.currency} au vendeur (${currentListing.momoNumber}). Tu gardes ${Math.round(currentListing.price * 0.10)} ${currentListing.currency} de commission.`,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      read:        false
    });

    document.getElementById("credentials-reveal").innerHTML = `
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
        <span class="cred-label">Pays du compte</span>
        <span class="cred-value">${currentListing.country}</span>
      </div>
    `;

    currentListing = null;
    showPage("page-delivery");

  } catch (err) {
    showModal(
      "⚠️ Paiement reçu — Erreur de livraison",
      "Ton paiement a bien été reçu mais une erreur est survenue. Contacte le support WhatsApp avec cet ID : " + transactionId
    );
  }
}

/* ═══════════════════════════════════════
   VENDEUR — MES ANNONCES
═══════════════════════════════════════ */
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

    const statusLabels = {
      pending:   "⏳ En attente de vérification",
      approved:  "✅ En ligne",
      sold:      "💰 Vendu",
      cancelled: "❌ Annulé"
    };

    grid.innerHTML = snap.docs.map(doc => {
      const l = { id: doc.id, ...doc.data() };
      const canCancel = l.status === "pending" || l.status === "approved";
      return `
        <div class="mylisting-card">
          <div class="mylisting-header">
            <span class="mylisting-title">${formatFollowers(l.followers)} abonnés</span>
            <span class="status-badge status-${l.status}">${statusLabels[l.status] || l.status}</span>
          </div>
          <div class="mylisting-meta">
            💰 ${formatPrice(l.price, l.currency)} &nbsp;•&nbsp; 🌍 ${l.country || "–"}
          </div>
          ${canCancel
            ? `<button class="btn-cancel" onclick="cancelListing('${l.id}')">Annuler cette annonce</button>`
            : ""}
        </div>
      `;
    }).join("");

  } catch (err) {
    grid.innerHTML = `<div class="loading-spinner">Erreur : ${err.message}</div>`;
  }
}

/* ═══════════════════════════════════════
   VENDEUR — ANNULER UNE ANNONCE
═══════════════════════════════════════ */
async function cancelListing(listingId) {
  if (!confirm("Confirmer l'annulation ? L'admin te renverra tes identifiants sous 24h.")) return;

  try {
    await db.collection("listings").doc(listingId).update({
      status:      "cancelled",
      cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("admin_notifications").add({
      type:        "listing_cancelled",
      listingId,
      sellerId:    currentUser.uid,
      sellerPhone: currentUser.phoneNumber || currentUser.email || "",
      message:     `Annulation de l'annonce ${listingId}. Renvoyer les identifiants TikTok au vendeur.`,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      read:        false
    });

    showModal("✅ Annonce annulée", "Annonce annulée. Notre équipe te renverra tes identifiants sous 24h.");
    loadMyListings();

  } catch (err) {
    showModal("❌ Erreur", "Impossible d'annuler : " + err.message);
  }
}

/* ═══════════════════════════════════════
   MODAL
═══════════════════════════════════════ */
function showModal(title, message, onClose = null) {
  const overlay = document.getElementById("modal-overlay");
  document.getElementById("modal-content").innerHTML = `
    <h3>${title}</h3>
    <p>${message.replace(/\n/g, "<br/>")}</p>
  `;
  overlay.classList.remove("hidden");
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

/* ═══════════════════════════════════════
   UTILITAIRES
═══════════════════════════════════════ */
function formatFollowers(n) {
  if (!n) return "–";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(0) + "K";
  return n.toString();
}

function formatPrice(price, currency = "FCFA") {
  if (!price) return "–";
  return new Intl.NumberFormat("fr-FR").format(price) + " " + currency;
}v

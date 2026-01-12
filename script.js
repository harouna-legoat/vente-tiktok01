// SIMULATION (remplacé par Firebase après)
let isLoggedIn = false;

function login() {
  isLoggedIn = true;
  checkAuth();
}

function register() {
  isLoggedIn = true;
  checkAuth();
}

function logout() {
  isLoggedIn = false;
  checkAuth();
}

function checkAuth() {
  if (isLoggedIn) {
    document.getElementById("auth-screen").style.display = "none";
    document.getElementById("app-screen").style.display = "block";
  } else {
    document.getElementById("auth-screen").style.display = "flex";
    document.getElementById("app-screen").style.display = "none";
  }
}

checkAuth();

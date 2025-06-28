import {
  getAuth,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const auth = getAuth();

document.getElementById("recuperar-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Correo de recuperación enviado");
  } catch (error) {
    alert("Error: " + error.message);
  }
});

// firebase-config.js — configuração do projeto Firebase
//
// Enquanto for null, a app funciona em modo local (dados só neste browser).
// Para ativar a partilha em tempo real, cola aqui a configuração do teu
// projeto (Consola Firebase → Definições do projeto → As tuas apps → Config):
//
// window.FIREBASE_CONFIG = {
//   apiKey: "...",
//   authDomain: "....firebaseapp.com",
//   projectId: "...",
//   storageBucket: "....appspot.com",
//   messagingSenderId: "...",
//   appId: "..."
// };
//
// Nota: esta configuração NÃO é secreta — pode ser publicada no GitHub.
// A proteção dos dados é feita pelas regras do Firestore + código da quinta.
window.FIREBASE_CONFIG = null;

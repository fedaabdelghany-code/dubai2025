importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');


firebase.initializeApp({
  apiKey: "AIzaSyAXnLsICQenDbqAuHBduK5eRyV1o7WIBCA",
  authDomain: "mea-egypt-ahlanapp-prd.firebaseapp.com",
  projectId: "mea-egypt-ahlanapp-prd",
  messagingSenderId: "107201585408",
  appId: "1:107201585408:web:2b42931613ef33fda693e5",
  measurementId: "G-LCLHRYDEXY"
});

const messaging = firebase.messaging();

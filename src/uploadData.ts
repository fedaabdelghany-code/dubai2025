// uploadSessions.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import sessions from './assets/data/agenda.json' ;

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXnLsICQenDbqAuHBduK5eRyV1o7WIBCA",
  authDomain: "mea-egypt-ahlanapp-prd.firebaseapp.com",
  projectId: "mea-egypt-ahlanapp-prd",
  storageBucket: "mea-egypt-ahlanapp-prd.firebasestorage.app",
  messagingSenderId: "107201585408",
  appId: "1:107201585408:web:2b42931613ef33fda693e5",
  measurementId: "G-LCLHRYDEXY"
}



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to convert ISO string to Firestore Timestamp
const convertToTimestamp = (isoString: string): Timestamp => {
  return Timestamp.fromDate(new Date(isoString));
};

// Function to upload sessions
const uploadSessions = async () => {
  try {
    const sessionsCollection = collection(db, 'sessions');
    
    for (const session of sessions.sessions) {
      // Convert startTime and endTime to Firestore Timestamps
      const sessionData = {
        ...session,
        startTime: convertToTimestamp(session.startTime),
        endTime: convertToTimestamp(session.endTime)
      };
      
      // Add document to Firestore
      const docRef = await addDoc(sessionsCollection, sessionData);
      console.log(`Session added with ID: ${docRef.id} - ${session.title}`);
    }
    
    console.log('\n✅ All sessions uploaded successfully!');
    console.log(`Total sessions uploaded: ${sessions.sessions.length}`);
    
  } catch (error) {
    console.error('❌ Error uploading sessions:', error);
  }
};

// Run the upload
uploadSessions();
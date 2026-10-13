import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, doc, getDocFromServer, memoryLocalCache } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import config from '../firebase-applet-config.json';

let app;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  app = getApps().length === 0 ? initializeApp(config) : getApp();
  // Ensure pure cloud/server-authoritative synchronization with NO stale offline disk cache:
  try {
    db = initializeFirestore(app, { 
      ignoreUndefinedProperties: true,
      localCache: memoryLocalCache()
    }, config.firestoreDatabaseId || '(default)');
  } catch {
    db = config.firestoreDatabaseId 
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
  }
  auth = getAuth(app);
} catch (error) {
  console.warn("Firebase initialization warning (app will use direct cloud sync):", error);
}

// Validate connection to Firestore on boot as per Firebase skill guidelines
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export { app, db, auth, config };


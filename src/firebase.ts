import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  Firestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache 
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import config from '../firebase-applet-config.json';

let app;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  app = getApps().length === 0 ? initializeApp(config) : getApp();
  const databaseId = config.firestoreDatabaseId || '(default)';
  
  // Use persistent IndexedDB local cache with multi-tab support so mobile devices
  // retain updated data offline and avoid exhausting free tier read quotas
  try {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, databaseId);
  } catch {
    try {
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        localCache: persistentLocalCache()
      }, databaseId);
    } catch {
      try {
        db = initializeFirestore(app, {
          ignoreUndefinedProperties: true,
          localCache: memoryLocalCache()
        }, databaseId);
      } catch {
        db = config.firestoreDatabaseId 
          ? getFirestore(app, config.firestoreDatabaseId)
          : getFirestore(app);
      }
    }
  }
  auth = getAuth(app);
} catch (error) {
  console.warn("Firebase initialization warning:", error);
}



export { app, db, auth, config };

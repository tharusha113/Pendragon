/* =========================================================
   FIREBASE CLOUD DATABASE CONFIGURATION & REALTIME ADAPTER
   Pendragon Furniture - Cloud Firestore Synchronization
   ========================================================= */

const FIREBASE_CONFIG_STORAGE_KEY = 'pendragon_firebase_config_v1';

// Default / fallback configuration template
// Users can paste their credentials here or via Admin Settings UI
const HARDCODED_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

let firebaseApp = null;
let firestoreDb = null;
let isFirebaseConnected = false;
let firebaseListeners = [];

/**
 * Get the active Firebase configuration
 */
function getActiveFirebaseConfig() {
  try {
    const stored = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored Firebase config:', e);
  }
  return HARDCODED_FIREBASE_CONFIG;
}

/**
 * Check if the active configuration has real keys
 */
function isFirebaseConfigured() {
  const cfg = getActiveFirebaseConfig();
  return Boolean(
    cfg &&
    cfg.apiKey &&
    cfg.apiKey.trim() !== '' &&
    !cfg.apiKey.includes('YOUR_') &&
    cfg.projectId &&
    cfg.projectId.trim() !== '' &&
    !cfg.projectId.includes('YOUR_')
  );
}

/**
 * Save Firebase configuration to browser storage
 */
function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
    return initFirebase(true);
  } catch (e) {
    console.error('Error saving Firebase config:', e);
    return false;
  }
}

/**
 * Initialize Firebase SDK
 */
function initFirebase(forceReinit = false) {
  if (!isFirebaseConfigured()) {
    isFirebaseConnected = false;
    return false;
  }

  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK script not loaded yet.');
    isFirebaseConnected = false;
    return false;
  }

  const config = getActiveFirebaseConfig();

  try {
    if (firebaseApp && forceReinit) {
      // Clear previous app instance if re-initializing with new credentials
      try {
        firebaseApp.delete();
      } catch (err) {}
      firebaseApp = null;
      firestoreDb = null;
    }

    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.app();
    }

    firestoreDb = firebase.firestore();
    isFirebaseConnected = true;
    console.log('✓ Firebase Firestore initialized successfully for project:', config.projectId);
    return true;
  } catch (err) {
    console.error('Firebase initialization failed:', err);
    isFirebaseConnected = false;
    return false;
  }
}

/**
 * Push Website DB to Cloud Firestore
 */
async function pushWebsiteDbToFirebase(websiteData) {
  if (!initFirebase()) return false;
  try {
    const docRef = firestoreDb.collection('pendragon_data').doc('website_db');
    await docRef.set({
      ...websiteData,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to push Website DB to Firebase:', err);
    return false;
  }
}

/**
 * Push Workshop DB to Cloud Firestore
 */
async function pushWorkshopDbToFirebase(workshopData) {
  if (!initFirebase()) return false;
  try {
    const docRef = firestoreDb.collection('pendragon_data').doc('workshop_db');
    await docRef.set({
      ...workshopData,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to push Workshop DB to Firebase:', err);
    return false;
  }
}

/**
 * Pull latest data from Cloud Firestore
 */
async function pullDataFromFirebase() {
  if (!initFirebase()) return null;
  try {
    const webDoc = await firestoreDb.collection('pendragon_data').doc('website_db').get();
    let webData = null;
    if (webDoc.exists) {
      webData = webDoc.data();
    }

    const wsDoc = await firestoreDb.collection('pendragon_data').doc('workshop_db').get();
    let wsData = null;
    if (wsDoc.exists) {
      wsData = wsDoc.data();
    }

    return { website: webData, workshop: wsData };
  } catch (err) {
    console.error('Failed to pull data from Firebase:', err);
    return null;
  }
}

/**
 * Listen to real-time changes from Firestore
 */
function setupFirebaseRealtimeSync(onWebsiteUpdate, onWorkshopUpdate) {
  if (!initFirebase()) return null;

  try {
    const unsubscribeWeb = firestoreDb
      .collection('pendragon_data')
      .doc('website_db')
      .onSnapshot((doc) => {
        if (doc.exists && typeof onWebsiteUpdate === 'function') {
          const remoteData = doc.data();
          onWebsiteUpdate(remoteData);
        }
      }, (err) => {
        console.warn('Firebase realtime listener error (website_db):', err);
      });

    const unsubscribeWs = firestoreDb
      .collection('pendragon_data')
      .doc('workshop_db')
      .onSnapshot((doc) => {
        if (doc.exists && typeof onWorkshopUpdate === 'function') {
          const remoteData = doc.data();
          onWorkshopUpdate(remoteData);
        }
      }, (err) => {
        console.warn('Firebase realtime listener error (workshop_db):', err);
      });

    return () => {
      if (unsubscribeWeb) unsubscribeWeb();
      if (unsubscribeWs) unsubscribeWs();
    };
  } catch (e) {
    console.warn('Realtime listener registration failed:', e);
    return null;
  }
}

// Automatically attempt initialization on script load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initFirebase();
  });
}

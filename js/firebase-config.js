/* =========================================================
   FIREBASE CLOUD DATABASE CONFIGURATION & REALTIME ADAPTER
   Pendragon Furniture - Cloud Firestore Synchronization
   ========================================================= */

const FIREBASE_CONFIG_STORAGE_KEY = 'pendragon_firebase_config_v1';

// Default / fallback configuration template
// Users can paste their credentials here or via Admin Settings UI
const HARDCODED_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCoWkMDyfHlwlm7PBhVUMIA4AMtN1NuW3M",
  authDomain: "pendragon-furniture.firebaseapp.com",
  projectId: "pendragon-furniture",
  storageBucket: "pendragon-furniture.firebasestorage.app",
  messagingSenderId: "115665485901",
  appId: "1:115665485901:web:bae1bc54b1b9cb64a95c04",
  measurementId: "G-34W19C3W1Y"
};

let firebaseApp = null;
let firestoreDb = null;
let firebaseStorage = null;
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
      if (parsed && parsed.apiKey && parsed.projectId && !parsed.apiKey.includes('YOUR_')) {
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

    // Initialize Firebase Cloud Storage if SDK is loaded
    if (typeof firebase.storage === 'function') {
      try {
        firebaseStorage = firebase.storage();
        console.log('✓ Firebase Cloud Storage connected for bucket:', config.storageBucket || '(default)');
      } catch (storageErr) {
        console.warn('Firebase Storage initialization warning:', storageErr);
      }
    } else {
      console.info('Firebase Storage SDK not loaded. Storage features will fall back to local Base64.');
    }

    console.log('✓ Firebase Firestore connected successfully for:', config.projectId);
    return true;
  } catch (err) {
    console.error('Firebase initialization failed:', err);
    isFirebaseConnected = false;
    return false;
  }
}

/**
 * Check if Firebase Cloud Storage is initialized and ready
 */
function isFirebaseStorageAvailable() {
  return Boolean(isFirebaseConnected && firebaseStorage);
}

/**
 * Upload an image File or Blob directly to Firebase Cloud Storage.
 * Returns the permanent public HTTPS download URL.
 * 
 * @param {File|Blob} fileOrBlob 
 * @param {string} folder - 'products' | 'gallery' | 'uploads'
 * @param {function} [onProgress] - optional (percent: number) => void
 * @returns {Promise<string>} public download URL
 */
async function uploadFileToFirebaseStorage(fileOrBlob, folder = 'products', onProgress = null) {
  if (!initFirebase()) {
    throw new Error('Firebase is not initialized. Please verify your Firebase configuration in Settings.');
  }
  if (!firebaseStorage) {
    throw new Error('Firebase Cloud Storage SDK is not loaded. Please verify that firebase-storage-compat.js is included.');
  }
  if (!fileOrBlob) {
    throw new Error('No image file provided for upload.');
  }

  // Format clean unique filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  let ext = 'jpg';
  if (fileOrBlob.name) {
    const parts = fileOrBlob.name.split('.');
    if (parts.length > 1) {
      ext = parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    }
  } else if (fileOrBlob.type) {
    const mimeMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg'
    };
    ext = mimeMap[fileOrBlob.type] || 'jpg';
  }

  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'products';
  const filePath = `${safeFolder}/${timestamp}_${randomStr}.${ext}`;
  const storageRef = firebaseStorage.ref().child(filePath);

  const metadata = {
    contentType: fileOrBlob.type || 'image/jpeg',
    cacheControl: 'public,max-age=31536000'
  };

  const uploadTask = storageRef.put(fileOrBlob, metadata);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      (snapshot) => {
        if (typeof onProgress === 'function' && snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        let msg = error.message || 'Firebase Storage upload failed.';
        if (error.code === 'storage/unauthorized') {
          msg = 'Firebase Storage Permission Denied (storage/unauthorized). Please go to Firebase Console -> Storage -> Rules, and set: allow read, write: if true;';
        } else if (error.code === 'storage/bucket-not-found') {
          msg = `Firebase Storage bucket "${storageRef.bucket}" not found. Please verify your storageBucket in Firebase Settings.`;
        } else if (error.code === 'storage/quota-exceeded') {
          msg = 'Firebase Storage quota exceeded. Please check your project storage limits.';
        }
        const customErr = new Error(msg);
        customErr.code = error.code;
        reject(customErr);
      },
      async () => {
        try {
          const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
          console.log(`✓ Image uploaded successfully to Firebase Storage: ${filePath}`);
          resolve(downloadUrl);
        } catch (urlErr) {
          reject(urlErr);
        }
      }
    );
  });
}

/**
 * Push Website DB to Cloud Firestore with safety guard against 1 MB document limit
 */
async function pushWebsiteDbToFirebase(websiteData) {
  if (!initFirebase()) return false;
  try {
    const docRef = firestoreDb.collection('pendragon_data').doc('website_db');
    const deletedIds = Array.isArray(websiteData.deletedIds)
      ? websiteData.deletedIds
      : (typeof getDeletedEntityIds === 'function' ? Array.from(getDeletedEntityIds()) : []);

    let cleanPayload = JSON.parse(JSON.stringify(websiteData));
    cleanPayload.deletedIds = deletedIds;
    cleanPayload.lastUpdated = new Date().toISOString();

    // Check payload size (Firestore hard document limit is 1,048,576 bytes)
    const jsonLength = JSON.stringify(cleanPayload).length;
    if (jsonLength > 750 * 1024) {
      console.warn(`[Firestore Safe-Guard] website_db is ${Math.round(jsonLength / 1024)} KB. Optimizing central index...`);
      // Keep primary image in central website_db index to keep document light;
      // full multi-images are preserved in dedicated 'products' & 'gallery_albums' collections!
      if (Array.isArray(cleanPayload.products)) {
        cleanPayload.products = cleanPayload.products.map(p => ({
          ...p,
          images: (p.images && p.images.length > 1) ? [p.images[0]] : (p.images || [])
        }));
      }
      if (Array.isArray(cleanPayload.galleryAlbums)) {
        cleanPayload.galleryAlbums = cleanPayload.galleryAlbums.map(a => ({
          ...a,
          photos: (a.photos && a.photos.length > 2) ? a.photos.slice(0, 2) : (a.photos || [])
        }));
      }
    }

    await docRef.set(cleanPayload, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to push Website DB to Firebase:', err);
    return false;
  }
}

/**
 * Push Workshop DB to Cloud Firestore with safety guard against 1 MB document limit
 */
async function pushWorkshopDbToFirebase(workshopData) {
  if (!initFirebase()) return false;
  try {
    const docRef = firestoreDb.collection('pendragon_data').doc('workshop_db');
    const deletedIds = Array.isArray(workshopData.deletedIds)
      ? workshopData.deletedIds
      : (typeof getDeletedEntityIds === 'function' ? Array.from(getDeletedEntityIds()) : []);

    let cleanPayload = JSON.parse(JSON.stringify(workshopData));
    cleanPayload.deletedIds = deletedIds;
    cleanPayload.lastUpdated = new Date().toISOString();

    const jsonLength = JSON.stringify(cleanPayload).length;
    if (jsonLength > 750 * 1024) {
      if (Array.isArray(cleanPayload.products)) {
        cleanPayload.products = cleanPayload.products.map(p => ({
          ...p,
          images: (p.images && p.images.length > 1) ? [p.images[0]] : (p.images || [])
        }));
      }
    }

    await docRef.set(cleanPayload, { merge: true });
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
 * Push a single product directly to Firestore ('products' or 'workshop_products' collection)
 */
async function pushProductToFirebase(product, isWorkshop = false) {
  if (!initFirebase() || !product || !product.id) {
    return { success: false, error: 'Firebase is not initialized or invalid product' };
  }
  try {
    const colName = isWorkshop ? 'workshop_products' : 'products';
    const cleanProduct = JSON.parse(JSON.stringify(product));
    cleanProduct.lastUpdated = new Date().toISOString();

    // 1. Direct document in the dedicated products collection
    await firestoreDb.collection(colName).doc(String(cleanProduct.id)).set(cleanProduct, { merge: true });

    // 2. Also keep the central database document in sync
    if (isWorkshop) {
      if (typeof getWorkshopDb === 'function') {
        await pushWorkshopDbToFirebase(getWorkshopDb());
      }
    } else {
      if (typeof getWebsiteDb === 'function') {
        await pushWebsiteDbToFirebase(getWebsiteDb());
      }
    }

    console.log(`✓ Product "${cleanProduct.name}" (${cleanProduct.id}) synced to Firebase collection: ${colName}`);
    return { success: true, id: cleanProduct.id, collection: colName };
  } catch (err) {
    console.error('Failed to push Product to Firebase:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Delete a product from Firestore ('products' or 'workshop_products' collection)
 */
async function deleteProductFromFirebase(productId, isWorkshop = false) {
  if (!initFirebase() || !productId) return false;
  try {
    const colName = isWorkshop ? 'workshop_products' : 'products';
    await firestoreDb.collection(colName).doc(String(productId)).delete();
    console.log(`✓ Product ${productId} deleted from Firebase collection: ${colName}`);
    return true;
  } catch (err) {
    console.error('Failed to delete Product from Firebase:', err);
    return false;
  }
}

/**
 * Push a single gallery album directly to Firestore ('gallery_albums' collection)
 */
async function pushGalleryAlbumToFirebase(album) {
  if (!initFirebase() || !album || !album.id) {
    return { success: false, error: 'Firebase is not initialized or invalid album' };
  }
  try {
    const cleanAlbum = JSON.parse(JSON.stringify(album));
    cleanAlbum.lastUpdated = new Date().toISOString();

    // 1. Direct document in dedicated gallery_albums collection
    await firestoreDb.collection('gallery_albums').doc(String(cleanAlbum.id)).set(cleanAlbum, { merge: true });

    // 2. Also keep central website_db in sync
    if (typeof getWebsiteDb === 'function') {
      await pushWebsiteDbToFirebase(getWebsiteDb());
    }

    console.log(`✓ Gallery Album "${cleanAlbum.title}" (${cleanAlbum.id}) synced to Firebase collection: gallery_albums`);
    return { success: true, id: cleanAlbum.id, collection: 'gallery_albums' };
  } catch (err) {
    console.error('Failed to push Gallery Album to Firebase:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Delete a gallery album from Firestore ('gallery_albums' collection)
 */
async function deleteGalleryAlbumFromFirebase(albumId) {
  if (!initFirebase() || !albumId) return false;
  try {
    await firestoreDb.collection('gallery_albums').doc(String(albumId)).delete();
    console.log(`✓ Gallery Album ${albumId} deleted from Firebase collection: gallery_albums`);
    return true;
  } catch (err) {
    console.error('Failed to delete Gallery Album from Firebase:', err);
    return false;
  }
}

/**
 * Synchronize all gallery albums from local state to Firebase
 */
async function syncAllGalleryAlbumsToFirebase() {
  if (!initFirebase()) return { success: false, error: 'Firebase is not initialized' };
  let count = 0;
  try {
    if (typeof getGalleryAlbums === 'function') {
      const albums = getGalleryAlbums();
      for (const a of albums) {
        if (a && a.id) {
          const cleanA = JSON.parse(JSON.stringify(a));
          cleanA.lastUpdated = new Date().toISOString();
          await firestoreDb.collection('gallery_albums').doc(String(cleanA.id)).set(cleanA, { merge: true });
          count++;
        }
      }
    }
    return { success: true, count };
  } catch (err) {
    console.error('Failed to sync gallery albums to Firebase:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Synchronize all products and gallery albums from local state to Firebase
 */
async function syncAllProductsToFirebase() {
  if (!initFirebase()) {
    return { success: false, error: 'Firebase is not initialized' };
  }
  let count = 0;
  try {
    if (typeof getProducts === 'function') {
      const prods = getProducts();
      for (const p of prods) {
        if (p && p.id) {
          const cleanP = JSON.parse(JSON.stringify(p));
          cleanP.lastUpdated = new Date().toISOString();
          await firestoreDb.collection('products').doc(String(cleanP.id)).set(cleanP, { merge: true });
          count++;
        }
      }
    }
    if (typeof getWorkshopProducts === 'function') {
      const wsProds = getWorkshopProducts();
      for (const p of wsProds) {
        if (p && p.id) {
          const cleanP = JSON.parse(JSON.stringify(p));
          cleanP.lastUpdated = new Date().toISOString();
          await firestoreDb.collection('workshop_products').doc(String(cleanP.id)).set(cleanP, { merge: true });
        }
      }
    }
    await syncAllGalleryAlbumsToFirebase();
    if (typeof getWebsiteDb === 'function') {
      await pushWebsiteDbToFirebase(getWebsiteDb());
    }
    if (typeof getWorkshopDb === 'function') {
      await pushWorkshopDbToFirebase(getWorkshopDb());
    }
    return { success: true, count };
  } catch (err) {
    console.error('Failed to sync all products to Firebase:', err);
    return { success: false, error: err.message || String(err) };
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
        if (!doc.exists) {
          // Auto-seed initial Website DB to Cloud Firestore on first run
          console.log('Seeding initial Website DB to Cloud Firestore...');
          if (typeof getWebsiteDb === 'function') {
            pushWebsiteDbToFirebase(getWebsiteDb());
          }
        } else if (typeof onWebsiteUpdate === 'function') {
          const remoteData = doc.data();
          onWebsiteUpdate(remoteData);
        }
      }, (err) => {
        console.warn('Firebase realtime listener (website_db):', err);
      });

    const unsubscribeWs = firestoreDb
      .collection('pendragon_data')
      .doc('workshop_db')
      .onSnapshot((doc) => {
        if (!doc.exists) {
          // Auto-seed initial Workshop DB to Cloud Firestore on first run
          console.log('Seeding initial Workshop DB to Cloud Firestore...');
          if (typeof getWorkshopDb === 'function') {
            pushWorkshopDbToFirebase(getWorkshopDb());
          }
        } else if (typeof onWorkshopUpdate === 'function') {
          const remoteData = doc.data();
          onWorkshopUpdate(remoteData);
        }
      }, (err) => {
        console.warn('Firebase realtime listener (workshop_db):', err);
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

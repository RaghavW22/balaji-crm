import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  collection,
  collectionGroup,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// ----------------------------------------------------------------------
// 🔑 FIREBASE CONFIGURATION (Secured via .env environment variables)
// ----------------------------------------------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth & Firestore Database
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Firebase Analytics safely
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  }).catch(() => {});
}
export { analytics };

/**
 * Log in an authorized user with Email & Password + Persistence Setting
 */
export const loginUser = async (email, password, rememberMe = true) => {
  try {
    const persistenceMode = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceMode);

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    if (rememberMe) {
      localStorage.setItem('remembered_email', email);
      localStorage.setItem('remember_me_checked', 'true');
    } else {
      localStorage.removeItem('remembered_email');
      localStorage.setItem('remember_me_checked', 'false');
    }

    return { success: true, user: userCredential.user };
  } catch (error) {
    let friendlyMessage = error.message;
    if (
      error.code === 'auth/invalid-credential' || 
      error.code === 'auth/wrong-password' || 
      error.code === 'auth/user-not-found'
    ) {
      friendlyMessage = "Invalid email or password. Please double-check your credentials.";
    } else if (error.code === 'auth/invalid-email') {
      friendlyMessage = "Please enter a valid email address.";
    } else if (error.code === 'auth/too-many-requests') {
      friendlyMessage = "Too many failed attempts. Access temporarily blocked for security.";
    }
    return { success: false, error: friendlyMessage, code: error.code };
  }
};

/**
 * Listen for persistent Auth State changes
 */
export const subscribeAuthState = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// Shared Organization / Company Workspace ID so all authenticated logins see the exact same
// catalog, leads, settings, and sent replies across the entire company.
export const SHARED_WORKSPACE_ID = "balaji_company_workspace";

// Helper to resolve workspace ID: prioritizes shared company workspace
const resolveWorkspaceId = (userId) => {
  return SHARED_WORKSPACE_ID;
};

/**
 * Save API Integration Keys to Firebase Firestore Database
 * Path: users/{workspaceId}/settings/api_keys
 */
export const saveApiSettingsToFirestore = async (userId, apiSettings) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const settingsRef = doc(db, "users", wsId, "settings", "api_keys");
    await setDoc(settingsRef, {
      ...apiSettings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.warn("Firestore save fallback warning:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch API Integration Keys from Firebase Firestore Database
 */
export const fetchApiSettingsFromFirestore = async (userId) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const settingsRef = doc(db, "users", wsId, "settings", "api_keys");
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    }
    // If not yet in shared workspace and individual userId provided, check legacy doc
    if (userId && userId !== wsId) {
      const userRef = doc(db, "users", userId, "settings", "api_keys");
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const legacyData = userSnap.data();
        // Migrate to shared workspace in background
        setDoc(settingsRef, legacyData, { merge: true }).catch(() => {});
        return { success: true, data: legacyData };
      }
    }
    return { success: true, data: null };
  } catch (error) {
    console.warn("Firestore fetch warning:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Add an Email Buyer Product Request to Firestore Database
 */
export const saveLeadToFirestore = async (userId, leadData) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const leadsRef = collection(db, "users", wsId, "leads");
    const docRef = await addDoc(leadsRef, {
      ...leadData,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.warn("Firestore lead add warning:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch all Email Buyer Product Requests from Firestore Database
 * Automatically filters & deletes items older than 7 days from the database.
 */
export const fetchLeadsFromFirestore = async (userId) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const leadsRef = collection(db, "users", wsId, "leads");
    const q = query(leadsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const leads = [];
    const now = new Date().getTime();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const deletePromises = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const itemTimestamp = new Date(data.timestamp || data.createdAt).getTime();

      // Check if data is older than 7 days
      if (now - itemTimestamp > SEVEN_DAYS_MS) {
        // Automatically delete from Firestore Database
        deletePromises.push(deleteDoc(doc(db, "users", wsId, "leads", docSnap.id)));
      } else {
        leads.push({ id: docSnap.id, ...data });
      }
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`🧹 Auto-purged ${deletePromises.length} request(s) older than 7 days from database.`);
    }

    // Migration check: If shared workspace has no leads yet and user has legacy leads, load and migrate them
    if (leads.length === 0 && userId && userId !== wsId) {
      try {
        const userLeadsRef = collection(db, "users", userId, "leads");
        const userQ = query(userLeadsRef, orderBy("createdAt", "desc"));
        const userSnap = await getDocs(userQ);
        userSnap.forEach((docSnap) => {
          const lData = docSnap.data();
          leads.push({ id: docSnap.id, ...lData });
          // Copy to shared collection
          setDoc(doc(db, "users", wsId, "leads", docSnap.id), lData).catch(() => {});
        });
      } catch (_) {}
    }

    return { success: true, leads };
  } catch (error) {
    console.warn("Firestore leads fetch warning:", error.message);
    return { success: false, error: error.message, leads: [] };
  }
};

/**
 * Delete a single Product Request from Firestore Database
 */
export const deleteLeadFromFirestore = async (userId, leadId, queryId = null) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    if (leadId) {
      try {
        const leadRef = doc(db, "users", wsId, "leads", leadId);
        await deleteDoc(leadRef);
      } catch (_) {}
    }
    if (queryId && queryId !== leadId) {
      try {
        const leadsRef = collection(db, "users", wsId, "leads");
        const q = query(leadsRef, where("query_id", "==", queryId));
        const snapshot = await getDocs(q);
        const deletes = [];
        snapshot.forEach(docSnap => {
          deletes.push(deleteDoc(doc(db, "users", wsId, "leads", docSnap.id)));
        });
        if (deletes.length > 0) {
          await Promise.all(deletes);
        }
      } catch (_) {}
    }
    return { success: true };
  } catch (error) {
    console.warn("Firestore lead delete warning:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Clear All Product Requests for User from Firestore Database
 */
export const clearAllLeadsFromFirestore = async (userId) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const leadsRef = collection(db, "users", wsId, "leads");
    const querySnapshot = await getDocs(leadsRef);
    const deletePromises = [];
    querySnapshot.forEach((docSnap) => {
      deletePromises.push(deleteDoc(doc(db, "users", wsId, "leads", docSnap.id)));
    });
    await Promise.all(deletePromises);
    return { success: true };
  } catch (error) {
    console.warn("Firestore clear all leads warning:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Add a Seller Product to Firestore Database
 * Path: users/{workspaceId}/products
 */
export const saveProductToFirestore = async (userId, productData) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const productsRef = collection(db, "users", wsId, "products");
    const docRef = await addDoc(productsRef, {
      ...productData,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.warn("Firestore product add warning:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Update an existing Seller Product in Firestore Database
 * Path: users/{workspaceId}/products/{productId}
 */
export const updateProductInFirestore = async (userId, productId, productData) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const productRef = doc(db, "users", wsId, "products", productId);
    await updateDoc(productRef, {
      ...productData,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.warn("Firestore product update warning:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch all Seller Products from Firestore Database
 * Automatically aggregates products from the shared workspace AND queries all historical
 * user collections across the entire database via collectionGroup("products").
 * Any old product ever added by ANY account is automatically migrated into the shared catalog!
 */
export const fetchProductsFromFirestore = async (userId) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const products = [];
    const seenIds = new Set();
    const seenNames = new Set();

    // 1. Fetch current shared products
    try {
      const productsRef = collection(db, "users", wsId, "products");
      const q = query(productsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        products.push({ id: docSnap.id, ...data });
        seenIds.add(docSnap.id);
        if (data.name) seenNames.add(data.name.trim().toLowerCase());
      });
    } catch (sharedErr) {
      console.warn("Shared products fetch error:", sharedErr.message);
    }

    // 2. Scan ALL historical products across ANY account in Firestore using collectionGroup
    try {
      const allProductsGroupRef = collectionGroup(db, "products");
      const groupSnap = await getDocs(allProductsGroupRef);
      const migratePromises = [];

      groupSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const normName = (data.name || '').trim().toLowerCase();
        
        // If not already in our product list, add it!
        if (!seenIds.has(docSnap.id) && !seenNames.has(normName)) {
          products.push({ id: docSnap.id, ...data });
          seenIds.add(docSnap.id);
          if (normName) seenNames.add(normName);

          // Copy into shared company workspace so it permanently lives in the shared catalog
          migratePromises.push(
            setDoc(doc(db, "users", wsId, "products", docSnap.id), data, { merge: true })
          );
        }
      });

      if (migratePromises.length > 0) {
        Promise.all(migratePromises).catch(() => {});
        console.log(`📦 Unified ${migratePromises.length} historical product(s) from previous accounts into the shared catalog.`);
      }
    } catch (groupErr) {
      console.warn("collectionGroup products scan warning (rules or index):", groupErr.message);
      
      // Fallback: If collectionGroup needs an index or fails, check current user's individual path
      if (userId && userId !== wsId) {
        try {
          const userProductsRef = collection(db, "users", userId, "products");
          const userQ = query(userProductsRef, orderBy("createdAt", "desc"));
          const userSnap = await getDocs(userQ);
          userSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const normName = (data.name || '').trim().toLowerCase();
            if (!seenIds.has(docSnap.id) && !seenNames.has(normName)) {
              products.push({ id: docSnap.id, ...data });
              seenIds.add(docSnap.id);
              if (normName) seenNames.add(normName);
              setDoc(doc(db, "users", wsId, "products", docSnap.id), data).catch(() => {});
            }
          });
        } catch (_) {}
      }
    }

    return { success: true, products };
  } catch (error) {
    console.warn("Firestore products fetch warning:", error.message);
    return { success: false, error: error.message, products: [] };
  }
};

/**
 * Delete a Product from Firestore Database
 */
export const deleteProductFromFirestore = async (userId, productId) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const productRef = doc(db, "users", wsId, "products", productId);
    await deleteDoc(productRef);
    return { success: true };
  } catch (error) {
    console.warn("Firestore product delete warning:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Clear All Sent Replies from Firestore Database for User
 */
export const clearAllSentRepliesFromFirestore = async (userId) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const repliesRef = collection(db, "users", wsId, "sent_replies");
    const querySnapshot = await getDocs(repliesRef);
    const deletePromises = [];
    querySnapshot.forEach((docSnap) => {
      deletePromises.push(deleteDoc(doc(db, "users", wsId, "sent_replies", docSnap.id)));
    });
    await Promise.all(deletePromises);
    return { success: true };
  } catch (error) {
    console.warn("Firestore clear sent replies warning:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a Single Sent Reply from Firestore Database
 */
export const deleteSentReplyFromFirestore = async (userId, replyId) => {
  try {
    const wsId = resolveWorkspaceId(userId);
    const replyRef = doc(db, "users", wsId, "sent_replies", replyId);
    await deleteDoc(replyRef);
    return { success: true };
  } catch (error) {
    console.warn("Firestore reply delete warning:", error.message);
    return { success: false, error: error.message };
  }
};


/**
 * Send Password Reset Email
 */
export const resetUserPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { 
      success: true, 
      message: `Password reset email sent to ${email}. Please check your inbox.` 
    };
  } catch (error) {
    let friendlyMessage = error.message;
    if (error.code === 'auth/user-not-found') {
      friendlyMessage = "No user account found with this email address.";
    } else if (error.code === 'auth/invalid-email') {
      friendlyMessage = "Please enter a valid email address.";
    }
    return { success: false, error: friendlyMessage };
  }
};

/**
 * Sign out user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

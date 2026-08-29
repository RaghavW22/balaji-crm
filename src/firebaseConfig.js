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
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy
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

/**
 * Save API Integration Keys to Firebase Firestore Database
 * Path: users/{userId}/settings/api_keys
 */
export const saveApiSettingsToFirestore = async (userId, apiSettings) => {
  try {
    const settingsRef = doc(db, "users", userId, "settings", "api_keys");
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
    const settingsRef = doc(db, "users", userId, "settings", "api_keys");
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
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
    const leadsRef = collection(db, "users", userId, "leads");
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
    const leadsRef = collection(db, "users", userId, "leads");
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
        deletePromises.push(deleteDoc(doc(db, "users", userId, "leads", docSnap.id)));
      } else {
        leads.push({ id: docSnap.id, ...data });
      }
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`🧹 Auto-purged ${deletePromises.length} request(s) older than 7 days from database.`);
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
export const deleteLeadFromFirestore = async (userId, leadId) => {
  try {
    const leadRef = doc(db, "users", userId, "leads", leadId);
    await deleteDoc(leadRef);
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
    const leadsRef = collection(db, "users", userId, "leads");
    const querySnapshot = await getDocs(leadsRef);
    const deletePromises = [];
    querySnapshot.forEach((docSnap) => {
      deletePromises.push(deleteDoc(doc(db, "users", userId, "leads", docSnap.id)));
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
 * Path: users/{userId}/products
 */
export const saveProductToFirestore = async (userId, productData) => {
  try {
    const productsRef = collection(db, "users", userId, "products");
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
 * Fetch all Seller Products from Firestore Database
 */
export const fetchProductsFromFirestore = async (userId) => {
  try {
    const productsRef = collection(db, "users", userId, "products");
    const q = query(productsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const products = [];
    querySnapshot.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...docSnap.data() });
    });
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
    const productRef = doc(db, "users", userId, "products", productId);
    await deleteDoc(productRef);
    return { success: true };
  } catch (error) {
    console.warn("Firestore product delete warning:", error.message);
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

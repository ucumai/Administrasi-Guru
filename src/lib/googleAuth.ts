import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut 
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

// Mandatory Google Workspace scopes for Spreadsheet Backup & Drive file creation
export const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file"
];

let _provider: GoogleAuthProvider | null = null;
export const getGoogleAuthProvider = () => {
  if (!_provider) {
    _provider = new GoogleAuthProvider();
    SCOPES.forEach((scope) => _provider!.addScope(scope));
    _provider.setCustomParameters({
      prompt: "consent",
      access_type: "offline"
    });
  }
  return _provider;
};

// Flag to track sign-in in progress
let isSigningIn = false;

// CRITICAL: Cache the access token ONLY in memory (never localStorage / sessionStorage)
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  try {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    });
  } catch (err) {
    console.warn("Init auth deferred:", err);
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const auth = getFirebaseAuth();
    const provider = getGoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Gagal memperoleh token akses Google dari Firebase Auth");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Get in-memory access token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Set token in memory (if obtained via credential)
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Check if currently authenticated with Google
export const isGoogleConnected = (): boolean => {
  try {
    const auth = getFirebaseAuth();
    return Boolean(auth.currentUser && cachedAccessToken);
  } catch {
    return false;
  }
};

// Get current connected user
export const getCurrentGoogleUser = (): FirebaseUser | null => {
  try {
    const auth = getFirebaseAuth();
    return auth.currentUser;
  } catch {
    return null;
  }
};

// Logout from Google
export const logoutGoogle = async () => {
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
  }
};

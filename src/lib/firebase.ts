import { initializeApp, getApps, getApp } from '@firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, type User as FirebaseUser } from '@firebase/auth';

/**
 * Firebase is used only for "Google bilan kirish". The web config comes from public NEXT_PUBLIC_FIREBASE_* variables.
 * Nothing is hardcoded here. They are read at build time, so after changing them on Render, redeploy the site.
 * The server checks the Google ID token (app/api/[...path] → auth/google) against the same project id.
 */
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : ''),
  projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Without config the SDK still has to start (so the page renders); the Google button then explains what is missing.
const app = !getApps().length
  ? initializeApp(isFirebaseConfigured ? firebaseConfig : { ...firebaseConfig, apiKey: 'not-configured', projectId: 'not-configured' })
  : getApp();
const auth = getAuth(app);

// Only the basic profile is requested (the default Google scopes). The app needs no Drive, Gmail or Docs access.
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/** Firebase error codes → a clear Uzbek message the owner can act on. */
const FRIENDLY: Record<string, string> = {
  'auth/operation-not-allowed':
    'Google bilan kirish Firebase’da yoqilmagan. Firebase Console → Authentication → Sign-in method → Google ni yoqing.',
  'auth/unauthorized-domain':
    'Bu sayt manzili Firebase’da ruxsat etilmagan. Firebase Console → Authentication → Settings → Authorized domains ga sayt domenini qo‘shing (masalan, edu-level.onrender.com).',
  'auth/popup-blocked': 'Brauzer oynasini (popup) bloklagan. Ruxsat berib, qayta urinib ko‘ring.',
  'auth/network-request-failed': 'Internet bilan aloqa yo‘q. Ulanishni tekshirib, qayta urinib ko‘ring.',
  'auth/invalid-api-key': 'Firebase API kaliti noto‘g‘ri: NEXT_PUBLIC_FIREBASE_API_KEY qiymatini tekshiring.',
  'auth/configuration-not-found':
    'Firebase loyihasi topilmadi: NEXT_PUBLIC_FIREBASE_PROJECT_ID va NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN qiymatlarini tekshiring.'
};
/** The user closed the Google window themselves: not an error to show. */
const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

/**
 * Opens Google's sign-in window and returns the signed-in Firebase user, or null if the user closed the window.
 * The caller sends `user.getIdToken()` to the server, which verifies it; no Google access token is needed.
 */
export const googleSignIn = async (): Promise<{ user: FirebaseUser } | null> => {
  if (!isFirebaseConfigured) {
    throw new Error('Google kirish sozlanmagan: Render’da NEXT_PUBLIC_FIREBASE_* muhit o‘zgaruvchilarini kiriting, so‘ng saytni qayta deploy qiling.');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user };
  } catch (error: any) {
    const code: string = error?.code || '';
    if (CANCELLED.has(code)) return null;
    console.error('[google-sign-in]', code || error?.message);
    throw new Error(FRIENDLY[code] || `Google bilan kirishda xatolik${code ? ` (${code})` : ''}. Qayta urinib ko‘ring.`);
  }
};

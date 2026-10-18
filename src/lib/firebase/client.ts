import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * On deployed hosts the auth helpers are served same-origin via the `/__/auth/*`
 * rewrite in next.config.mjs, so popup/redirect sign-in never crosses origins
 * (required for installed standalone PWAs). Localhost and SSR keep the env value.
 */
function resolveAuthDomain(): string | undefined {
  const fallback = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  if (typeof window === "undefined") return fallback;

  const override = process.env.NEXT_PUBLIC_FIREBASE_BROWSER_AUTH_DOMAIN;
  if (override) return override;

  const { hostname, host } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return fallback;
  return host;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);

export { app, auth };

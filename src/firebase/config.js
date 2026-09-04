import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env : {})

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
}

export function isFirebaseConfigured() {
  const { apiKey, projectId } = firebaseConfig
  return Boolean(
    apiKey &&
    projectId &&
    apiKey !== 'your_api_key_here' &&
    projectId !== 'your_project_id_here' &&
    String(apiKey).trim() !== '' &&
    String(projectId).trim() !== '',
  )
}

let app = null
let db = null
let auth = null

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)
    console.info('🔥 Firebase Cloud Firestore & Auth connected successfully for project:', firebaseConfig.projectId)
  } catch (err) {
    console.warn('⚠️ Error initializing Firebase:', err)
  }
} else {
  console.info('ℹ️ Firebase credentials not provided in .env — using local in-memory/localStorage state.')
}

export { app, db, auth }


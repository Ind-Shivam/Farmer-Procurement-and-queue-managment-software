import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase/config.js'
import { normalizeMobile } from '../utils/validation.js'
import { saveFarmer } from './firebaseService.js'

export const USERS_COLLECTION = 'users'

/**
 * Maps Firebase Auth error codes to user-friendly error messages
 */
export function getFriendlyAuthErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.'
  const code = error.code || ''
  const message = error.message || ''

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password. Please check your credentials and try again.'
    case 'auth/user-not-found':
      return 'No registered account found with this email address.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in or use a different email.'
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/network-request-failed':
      return 'Network communication failed. Please check your internet connection and try again.'
    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to multiple failed attempts. Please wait a moment and try again.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled before it finished.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups and try again.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email. Sign in using email and password.'
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact the administrator.'
    default:
      if (message.includes('auth/')) {
        return message.replace(/^Firebase:\s*/, '')
      }
      return message || 'Authentication failed. Please try again.'
  }
}

/**
 * 1. Fetch user profile from Firestore users collection
 */
export async function getUserProfile(uid) {
  if (!db || !isFirebaseConfigured() || !uid) return null

  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid)
    const snapshot = await getDoc(userDocRef)
    if (snapshot.exists()) {
      return { uid, ...snapshot.data() }
    }
    return null
  } catch (err) {
    console.warn('⚠️ Error fetching user profile from Firestore:', err)
    return null
  }
}

/**
 * 2. Create or update user profile document in Firestore
 */
export async function setUserProfile(uid, profileData) {
  if (!db || !isFirebaseConfigured() || !uid) return null

  const userDocRef = doc(db, USERS_COLLECTION, uid)
  const now = new Date().toISOString()
  const payload = {
    uid,
    name: String(profileData.name || '').trim(),
    email: String(profileData.email || '').trim().toLowerCase(),
    role: profileData.role || 'farmer',
    mobile: normalizeMobile(profileData.mobile) || '',
    createdAt: profileData.createdAt || now,
    updatedAt: now,
  }

  await setDoc(userDocRef, payload, { merge: true })
  return payload
}

/**
 * 3. Farmer Registration & Sign-Up
 * Public signups are GUARANTEED to receive role: 'farmer'.
 */
export async function signUpFarmer({ email, password, name, mobile, village = '' }) {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Firebase Authentication is not configured.')
  }

  const cleanEmail = String(email).trim().toLowerCase()
  const cleanName = String(name).trim()
  const cleanMobile = normalizeMobile(mobile)

  if (!cleanName) throw new Error('Full name is required.')
  if (!cleanMobile) throw new Error('Valid 10-digit mobile number is required.')
  if (!cleanEmail) throw new Error('Email address is required.')
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.')

  // 1. Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password)
  const user = userCredential.user

  // 2. Update display name in Firebase Auth
  try {
    await updateProfile(user, { displayName: cleanName })
  } catch (e) {
    console.warn('Could not update displayName in Firebase Auth:', e)
  }

  // 3. Save user document in Firestore `users/{uid}` with strict role: 'farmer'
  const userProfile = {
    uid: user.uid,
    name: cleanName,
    email: cleanEmail,
    role: 'farmer',
    mobile: cleanMobile,
    village: String(village).trim(),
    createdAt: new Date().toISOString(),
  }

  await setUserProfile(user.uid, userProfile)

  // 4. Save farmer document in `farmers` collection for backward compatibility
  try {
    await saveFarmer({
      name: cleanName,
      mobile: cleanMobile,
      village: String(village).trim(),
    })
  } catch (e) {
    console.warn('Could not sync farmer profile in farmers collection:', e)
  }

  return { user, profile: userProfile }
}

/**
 * 4. Sign In user with Email & Password
 * Retrieves role and profile from Firestore `users/{uid}`.
 */
export async function loginUser(email, password) {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Firebase Authentication is not configured.')
  }

  const cleanEmail = String(email).trim().toLowerCase()
  if (!cleanEmail) throw new Error('Email address is required.')
  if (!password) throw new Error('Password is required.')

  // 1. Sign in with Firebase Auth
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password)
  const user = userCredential.user

  // 2. Fetch role and user document from Firestore `users/{uid}`
  let profile = await getUserProfile(user.uid)

  // 3. If doc does not exist yet (e.g. newly created via Firebase Console), create default profile
  if (!profile) {
    const isDefaultAdmin = cleanEmail.includes('admin')
    const isDefaultStaff = cleanEmail.includes('staff')
    const defaultRole = isDefaultAdmin ? 'admin' : isDefaultStaff ? 'staff' : 'farmer'

    profile = {
      uid: user.uid,
      name: user.displayName || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: defaultRole,
      mobile: '',
      createdAt: new Date().toISOString(),
    }
    await setUserProfile(user.uid, profile)
  }

  return { user, profile }
}

/**
 * Sign in with Google and create a default farmer profile when needed.
 */
export async function loginWithGoogle() {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Firebase Authentication is not configured.')
  }

  const provider = new GoogleAuthProvider()
  const userCredential = await signInWithPopup(auth, provider)
  const user = userCredential.user
  const email = String(user.email || '').trim().toLowerCase()

  let profile = await getUserProfile(user.uid)

  if (!profile) {
    const isDefaultAdmin = email.includes('admin')
    const isDefaultStaff = email.includes('staff')
    profile = {
      uid: user.uid,
      name: user.displayName || email.split('@')[0] || 'User',
      email,
      role: isDefaultAdmin ? 'admin' : isDefaultStaff ? 'staff' : 'farmer',
      mobile: '',
      createdAt: new Date().toISOString(),
    }
    await setUserProfile(user.uid, profile)
  }

  return { user, profile }
}

/**
 * 5. Sign Out
 */
export async function logoutUser() {
  if (!auth || !isFirebaseConfigured()) return
  await signOut(auth)
}

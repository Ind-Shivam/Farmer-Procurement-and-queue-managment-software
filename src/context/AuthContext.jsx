import { useCallback, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../firebase/config.js'
import {
  getUserProfile,
  loginUser,
  loginWithGoogle,
  logoutUser,
  setUserProfile as saveUserProfileDoc,
  signUpFarmer,
} from '../services/authService.js'
import { AuthContext } from './AuthContext.js'

export function AuthProvider({ children }) {
  const isFb = isFirebaseConfigured()
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(isFb && auth))
  const [authError, setAuthError] = useState(null)

  // Listen for Firebase Auth state changes
  useEffect(() => {
    if (!isFb || !auth) {
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {

      try {
        if (firebaseUser) {
          setCurrentUser(firebaseUser)
          const profile = await getUserProfile(firebaseUser.uid)
          if (profile) {
            setUserProfile(profile)
          } else {
            // Default fallback if doc is still initializing
            const email = firebaseUser.email || ''
            const role = email.includes('admin') ? 'admin' : email.includes('staff') ? 'staff' : 'farmer'
            setUserProfile({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || email.split('@')[0] || 'User',
              email,
              role,
              mobile: '',
            })
          }
        } else {
          setCurrentUser(null)
          setUserProfile(null)
        }
      } catch (err) {
        console.warn('Auth state subscription profile error:', err)
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [isFb])

  // Login handler
  const login = useCallback(async (email, password) => {
    setAuthError(null)
    const { user, profile } = await loginUser(email, password)
    setCurrentUser(user)
    setUserProfile(profile)
    return { user, profile }
  }, [])

  const loginGoogle = useCallback(async () => {
    setAuthError(null)
    const { user, profile } = await loginWithGoogle()
    setCurrentUser(user)
    setUserProfile(profile)
    return { user, profile }
  }, [])

  // Signup handler (guaranteed farmer role)
  const signup = useCallback(async ({ name, mobile, email, password, village }) => {
    setAuthError(null)
    const { user, profile } = await signUpFarmer({ name, mobile, email, password, village })
    setCurrentUser(user)
    setUserProfile(profile)
    return { user, profile }
  }, [])

  // Logout handler
  const logout = useCallback(async () => {
    setAuthError(null)
    await logoutUser()
    setCurrentUser(null)
    setUserProfile(null)
  }, [])

  // Reload user profile from Firestore
  const refreshProfile = useCallback(async () => {
    if (currentUser?.uid) {
      const fresh = await getUserProfile(currentUser.uid)
      if (fresh) setUserProfile(fresh)
    }
  }, [currentUser])

  // Update profile locally & sync to Firestore
  const updateUserProfile = useCallback(async (partialData) => {
    if (!partialData) return
    setUserProfile((prev) => {
      const next = { ...(prev || {}), ...partialData }
      if (currentUser?.uid && isFb) {
        saveUserProfileDoc(currentUser.uid, next).catch((e) => {
          console.warn('Could not update profile doc in Firestore:', e)
        })
      }
      return next
    })
  }, [currentUser, isFb])

  const userRole = userProfile?.role || 'farmer'
  const isFarmer = userRole === 'farmer'
  const isStaff = userRole === 'staff'
  const isAdmin = userRole === 'admin'

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      userRole,
      isFarmer,
      isStaff,
      isAdmin,
      loading,
      authError,
      setAuthError,
      login,
      loginGoogle,
      signup,
      logout,
      refreshProfile,
      updateUserProfile,
      isAuthenticated: Boolean(currentUser),
    }),
    [
      currentUser,
      userProfile,
      userRole,
      isFarmer,
      isStaff,
      isAdmin,
      loading,
      authError,
      login,
      loginGoogle,
      signup,
      logout,
      refreshProfile,
      updateUserProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


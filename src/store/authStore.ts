import { create } from 'zustand';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface User {
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => {
  // Listen for real-time Firebase Auth changes
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        let profile: User;
        if (userDoc.exists()) {
          const data = userDoc.data();
          profile = {
            email: firebaseUser.email || '',
            name: data.name || firebaseUser.displayName || 'Staff Member',
            role: firebaseUser.email === 'cerezvincent24@gmail.com' ? 'admin' : (data.role || 'staff').toLowerCase(),
          };
        } else {
          // If the profile document doesn't exist in Firestore, create one!
          profile = {
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Staff Member',
            role: firebaseUser.email?.toLowerCase().includes('admin') ? 'admin' : 'staff',
          };
          await setDoc(userDocRef, {
            id: firebaseUser.uid,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            status: 'Active',
          });
        }
        set({ user: profile, isAuthenticated: true, isInitialized: true });
      } catch (err) {
        console.error('[Auth] Error fetching user profile:', err);
        set({
          user: {
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Staff Member',
            role: 'staff',
          },
          isAuthenticated: true,
          isInitialized: true
        });
      }
    } else {
      set({ user: null, isAuthenticated: false, isInitialized: true });
    }
  });

  return {
    user: null,
    isAuthenticated: false,
    isInitialized: false,
    
    login: async (email, password) => {
      try {
        // Attempt normal layout sign-in
        await signInWithEmailAndPassword(auth, email, password);
        return true;
      } catch (err: any) {
        // Auto-register mock user or any credential if not found in Auth system
        if (
          err.code === 'auth/user-not-found' || 
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/cannot-find-user'
        ) {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
            return true;
          } catch (createErr: any) {
            // Email-already-in-use thrown because they entered wrong password for an existing account
            if (createErr.code === 'auth/email-already-in-use') {
              const wrongPasswordErr = new Error('Incorrect password for this existing account. If you want to create a new user, please use a different email.');
              (wrongPasswordErr as any).code = 'auth/wrong-password';
              throw wrongPasswordErr;
            }
            console.error('[Auth] On-the-fly registration failed:', createErr);
            throw createErr;
          }
        }
        console.error('[Auth] Login error:', err);
        throw err;
      }
    },

    register: async (email, password) => {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        return true;
      } catch (err: any) {
        console.error('[Auth] Manual Register error:', err);
        throw err;
      }
    },

    signInWithGoogle: async () => {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        return true;
      } catch (err) {
        console.error('[Auth] Google Sign-In error:', err);
        return false;
      }
    },
    
    logout: async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('[Auth] Cancel signout error:', err);
      }
    },
  };
});

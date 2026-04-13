import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { auth, onAuthStateChanged, db, doc, onSnapshot, setDoc, getDoc } from './firebase';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from './error-handler';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (user) {
        const docRef = doc(db, 'users', user.uid);
        
        // Check if profile exists first, if not create it
        try {
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            const newProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: user.email === 'sksjakaria@gmail.com' ? 'admin' : 'visitor',
              createdAt: new Date().toISOString(),
            };
            await setDoc(docRef, newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }

        // Listen for real-time updates
        unsubProfile = onSnapshot(docRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data());
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin: profile?.role === 'admin' || user?.email === 'sksjakaria@gmail.com'
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  db,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  onAuthStateChanged 
} from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up a new user
  async function signup(email, password, username, profileImage = '') {
    const defaultAvatar = profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    
    // Create the authenticated user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update their profile in Firebase Auth
    await updateProfile(user, {
      displayName: username,
      photoURL: defaultAvatar
    });

    const joinedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const docData = {
      uid: user.uid,
      username,
      email,
      profileImage: defaultAvatar,
      joinedDate,
      createdAt: new Date().toISOString()
    };

    // Save profile metadata to Firestore
    await setDoc(doc(db, 'users', user.uid), docData);
    setUserData(docData);
    return user;
  }

  // Log in
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Log out
  function logout() {
    setUserData(null);
    return signOut(auth);
  }

  // Sync profile details from Firestore
  async function fetchUserProfile(user) {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists()) {
        const profile = userSnap.data();
        setUserData({
          uid: user.uid,
          username: profile.username || user.displayName || 'Farmer',
          email: profile.email || user.email || '',
          profileImage: profile.profileImage || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName || 'Farmer'}`,
          joinedDate: profile.joinedDate || 'Recently Joined',
          ...profile
        });
      } else {
        const fallbackData = {
          uid: user.uid,
          username: user.displayName || 'Farmer',
          email: user.email || '',
          profileImage: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName || 'Farmer'}`,
          joinedDate: 'Recently Joined'
        };
        setUserData(fallbackData);
        await setDoc(userDocRef, fallbackData, { merge: true });
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setUserData({
        uid: user.uid,
        username: user.displayName || 'Farmer',
        email: user.email || '',
        profileImage: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName || 'Farmer'}`,
        joinedDate: 'Recently Joined'
      });
    }
  }

  // Update profile
  async function updateProfileData(updates) {
    if (!currentUser) return;
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    const updatedData = { ...userData, ...updates };
    
    await setDoc(userDocRef, updatedData, { merge: true });
    
    if (updates.username || updates.profileImage) {
      await updateProfile(currentUser, {
        displayName: updates.username || currentUser.displayName,
        photoURL: updates.profileImage || currentUser.photoURL
      });
    }

    setUserData(updatedData);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        setCurrentUser(user);
        if (user) {
          await fetchUserProfile(user);
        } else {
          setUserData(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    signup,
    login,
    logout,
    updateProfileData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

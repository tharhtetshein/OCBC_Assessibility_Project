import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, onAuthStateChanged, registerUser, getUserData } from "../services/firebase";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user data from Firestore
        const result = await getUserData(user.uid);
        if (result.success) {
          setUserData(result.data);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (email, password, additionalData) => {
    return await registerUser(email, password, additionalData);
  };

  const refreshUserData = async () => {
    if (currentUser) {
      const result = await getUserData(currentUser.uid);
      if (result.success) {
        setUserData(result.data);
      }
    }
  };

  const value = {
    currentUser,
    userData,
    loading,
    register,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

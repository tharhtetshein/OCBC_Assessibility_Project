import React from "react";
import { useAuth } from "../auth/AuthContext";
import { updateUserShortcuts, updateUserBalance } from "../services/firebase";

function UserProfile() {
  const { currentUser, userData, refreshUserData } = useAuth();

  const handleAddShortcut = async () => {
    if (!currentUser) return;
    
    const newShortcut = {
      id: Date.now(),
      name: "Pay Bills",
      action: "paybills"
    };
    
    const updatedShortcuts = [...(userData?.shortcuts || []), newShortcut];
    const result = await updateUserShortcuts(currentUser.uid, updatedShortcuts);
    
    if (result.success) {
      await refreshUserData();
      alert("Shortcut added!");
    }
  };

  if (!userData) {
    return <div>Loading user data...</div>;
  }

  return (
    <div className="user-profile">
      <h2>User Profile</h2>
      <div>
        <p><strong>Name:</strong> {userData.name}</p>
        <p><strong>User ID:</strong> {userData.userId}</p>
        <p><strong>Email:</strong> {userData.email}</p>
        <p><strong>Phone:</strong> {userData.phoneNumber}</p>
        <p><strong>Balance:</strong> ${userData.balance.toFixed(2)}</p>
      </div>
      
      <div>
        <h3>Shortcuts</h3>
        {userData.shortcuts && userData.shortcuts.length > 0 ? (
          <ul>
            {userData.shortcuts.map((shortcut, index) => (
              <li key={index}>{shortcut.name}</li>
            ))}
          </ul>
        ) : (
          <p>No shortcuts set</p>
        )}
        <button onClick={handleAddShortcut}>Add Sample Shortcut</button>
      </div>
    </div>
  );
}

export default UserProfile;

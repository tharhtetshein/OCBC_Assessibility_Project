import { initializeApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

import emailjs from '@emailjs/browser';

// Include BOTH database types
import { getDatabase, ref, set, push, get, update, remove } from "firebase/database";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, query, where, orderBy, getDocs ,limit } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { defaultShortcuts } from "../shortcuts/shortcutsConfig";

const getSingaporeTimeISOString = () => {
    return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Singapore" }).replace(" ", "T") + "+08:00";
};

const getSingaporeDateString = () => {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
};

const firebaseConfig = {
    apiKey: "",
    authDomain: "ocbcwebgrp4.firebaseapp.com",
    databaseURL: "https://ocbcwebgrp4-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ocbcwebgrp4",
    storageBucket: "ocbcwebgrp4.firebasestorage.app",
    messagingSenderId: "129654882043",
    appId: "1:129654882043:web:01809c3519ad09df927a5e",
    measurementId: "G-ZWW3BLR5JF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const callSpinWheel = async () => {
  try {
    const spinFn = httpsCallable(functions, 'spinTheWheel');
    const result = await spinFn();
    return result.data; // Returns { success, prizeIndex, rewardValue }
  } catch (error) {
    console.error("Backend Error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Submit Whack-A-Scam Score
 * Updates Reward Coins AND updates 'whackHighScore' for the leaderboard
 */
/**
 * Submit Whack-A-Scam Score (Debug Version)
 */
export const submitWhackScore = async (score) => {
  console.log("🚀 STARTING SCORE SUBMISSION...");
  try {
    const user = auth.currentUser;
    if (!user) {
        console.error("❌ Error: No authenticated user found.");
        return { success: false, error: "User not authenticated" };
    }

    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const currentRewardCoins = userData.rewardCoins || 0;
        const currentHighScore = userData.whackHighScore || 0;
        
        console.log(`👤 User: ${userData.name}`);
        console.log(`📊 Current High Score: ${currentHighScore} | Game Score: ${score}`);

        // Logic: Always update coins, but only update High Score if beaten
        const newHighScore = score > currentHighScore ? score : currentHighScore;

        console.log(`💾 Saving -> Coins: ${currentRewardCoins + score}, High Score: ${newHighScore}`);

        await updateDoc(userRef, {
            rewardCoins: currentRewardCoins + score,
            whackHighScore: newHighScore
        });

        console.log("✅ SAVE SUCCESSFUL!");
        return { success: true, addedCoins: score };
    } else {
        console.error("❌ Error: User document does not exist in Firestore.");
        return { success: false, error: "User document not found" };
    }

  } catch (error) {
    console.error("❌ DIRECT UPDATE ERROR:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch Whack-A-Scam Leaderboard
 * Returns top 10 users ordered by High Score
 */
/**
 * Fetch Leaderboard
 */
export const getWhackLeaderboard = async () => {
    console.log("🏆 FETCHING LEADERBOARD...");
    try {
        const usersRef = collection(db, "users");
        
        // Ensure you have "whackHighScore" > 0
        const q = query(
            usersRef,
            where("whackHighScore", ">", 0),
            orderBy("whackHighScore", "desc"),
            limit(10)
        );

        const querySnapshot = await getDocs(q);
        const leaderboard = [];

        console.log(`🔎 Found ${querySnapshot.size} documents in leaderboard.`);

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(` - Found User: ${data.name}, Score: ${data.whackHighScore}`);
            leaderboard.push({
                id: doc.id,
                name: data.name || "Unknown User",
                score: data.whackHighScore || 0
            });
        });

        return { success: true, leaderboard };
    } catch (error) {
        console.error("❌ LEADERBOARD ERROR:", error);
        return { success: false, error: error.message };
    }
};
export { onAuthStateChanged };

export const analytics = getAnalytics(app);

// BOTH databases exported
export const database = getDatabase(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// ------------------- HELPER FUNCTIONS -------------------

/**
 * Generate a unique account number in format 671-XXXXXX-XXX
 */
const generateAccountNumber = async () => {
    const prefix = "671";

    // Generate random middle part (6 digits)
    const middle = Math.floor(100000 + Math.random() * 900000).toString();

    // Generate random last part (3 digits)
    const last = Math.floor(100 + Math.random() * 900).toString();

    const accountNumber = `${prefix}-${middle}-${last}`;

    // Check if this account number already exists
    const q = query(
        collection(db, "users"),
        where("accountNumber", "==", accountNumber)
    );

    const querySnapshot = await getDocs(q);

    // If account number exists, recursively generate a new one
    if (!querySnapshot.empty) {
        return generateAccountNumber();
    }

    return accountNumber;
};

// ------------------- AUTH FUNCTIONS -------------------

export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const registerUser = async (email, password, userData, referralCode = null) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        // Validate referral code if provided

        // Generate unique referral code for new user
        const newUserReferralCode = await generateUniqueReferralCode();

        let referrerId = null;
        if (referralCode && referralCode.trim() !== "") {
            const validation = await validateReferralCode(referralCode);
            if (validation.valid) {
                // Prevent self-referral (shouldn't happen, but just in case)
                if (validation.referrerId !== userId) {
                    referrerId = validation.referrerId;
                }
            }
        }

        const initialShortcuts =
            userData.shortcuts && userData.shortcuts.length > 0
                ? userData.shortcuts
                : defaultShortcuts;

        // Create Firestore user document
        await setDoc(doc(db, "users", userId), {
            name: userData.name || "",
            userId: userId,
            email: email,
            accountNumber: await generateAccountNumber(),
            phoneNumber: userData.phoneNumber || "",
            shortcuts: initialShortcuts,
            balance: 10000,
            lockedAmount: 0,
            isLocked: false, // Account lock status for AI feature
            portfolio: [], // Investment portfolio array [{ticker, shares, avgPrice, totalValue}]
            referralCode: newUserReferralCode,
            referredBy: referrerId,
            rewardCoins: 0,
            // Award 100 coins if referred, else 0
            referralCoins: referrerId ? 100 : 0,
            createdAt: new Date().toISOString(),
            dailyTasks: {
                lastUpdated: getSingaporeDateString(),
                chatCount: 0,
                transferCount: 0,
                referralCount: 0,
                claimed: { chat: false, transfer: false, referral: false }
            }
        });

        // Award referral bonus to referrer
        if (referrerId) {
            await awardReferralBonus(referrerId, userId, {
                name: userData.name,
                email: email
            });
        }

        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ------------------- REALTIME DATABASE FUNCTIONS -------------------

// 1. Add a shared access request
export const addSharedAccessRequest = async (userId, requestData) => {
    try {
        const requestsRef = ref(database, `sharedAccessRequests/${userId}`);
        const newRequestRef = push(requestsRef);

        await set(newRequestRef, {
            accountOwner: requestData.accountOwner,
            accountNumber: requestData.accountNumber,
            requestType: requestData.requestType,
            amount: requestData.amount,
            reference: requestData.reference,
            status: "pending",
            createdAt: new Date().toISOString()
        });

        return { success: true, id: newRequestRef.key };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 2. Get all pending requests
export const getPendingRequests = async (userId) => {
    try {
        const requestsRef = ref(database, `sharedAccessRequests/${userId}`);
        const snapshot = await get(requestsRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            const requests = Object.keys(data)
                .map(key => ({ id: key, ...data[key] }))
                .filter(req => req.status === "pending");

            return { success: true, requests };
        }

        return { success: true, requests: [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 3. Approve request
export const approveRequest = async (userId, requestId) => {
    try {
        const requestRef = ref(database, `sharedAccessRequests/${userId}/${requestId}`);
        await update(requestRef, {
            status: "approved",
            approvedAt: new Date().toISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 4. Reject request
export const rejectRequest = async (userId, requestId) => {
    try {
        const requestRef = ref(database, `sharedAccessRequests/${userId}/${requestId}`);
        await update(requestRef, {
            status: "rejected",
            rejectedAt: new Date().toISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 5. Add shared account
export const addSharedAccount = async (userId, accountData) => {
    try {
        const accountsRef = ref(database, `sharedAccounts/${userId}`);
        const newAccountRef = push(accountsRef);

        await set(newAccountRef, {
            name: accountData.name,
            number: accountData.number,
            hasAccess: accountData.hasAccess,
            addedAt: new Date().toISOString()
        });

        return { success: true, id: newAccountRef.key };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 6. Get all shared accounts
export const getSharedAccounts = async (userId) => {
    try {
        const accountsRef = ref(database, `sharedAccounts/${userId}`);
        const snapshot = await get(accountsRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            const accounts = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));

            return { success: true, accounts };
        }

        return { success: true, accounts: [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// 7. Delete request
export const deleteRequest = async (userId, requestId) => {
    try {
        const requestRef = ref(database, `sharedAccessRequests/${userId}/${requestId}`);
        await remove(requestRef);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ------------------- FIRESTORE USER DATA -------------------

export const getUserData = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) return { success: true, data: userDoc.data() };
        return { success: false, error: "User not found" };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const updateUserData = async (userId, updates) => {
    try {
        await updateDoc(doc(db, "users", userId), updates);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const updateUserShortcuts = async (userId, shortcuts) => {
    try {
        // Use setDoc with merge to create document if it doesn't exist
        await setDoc(doc(db, "users", userId), { shortcuts }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating shortcuts:', error);
        return { success: false, error: error.message };
    }
};

export const updateUserSettings = async (userId, settings) => {
    try {
        // Save user settings (autoOrganize, largeTextMode, etc.)
        await setDoc(doc(db, "users", userId), { settings }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating settings:', error);
        return { success: false, error: error.message };
    }
};

// ------------------- CHATBOT CUSTOMIZATION FUNCTIONS -------------------

export const updateBotName = async (userId, botName) => {
    try {
        await setDoc(doc(db, "users", userId), { 
            chatbotSettings: { 
                botName: botName 
            } 
        }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating bot name:', error);
        return { success: false, error: error.message };
    }
};

export const getBotName = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return { 
                success: true, 
                botName: userData.chatbotSettings?.botName || 'Helper' 
            };
        }
        return { success: true, botName: 'Helper' };
    } catch (error) {
        console.error('Error getting bot name:', error);
        return { success: false, error: error.message, botName: 'Helper' };
    }
};

export const updateUserBalance = async (userId, balance) => {
    try {
        await updateDoc(doc(db, "users", userId), { balance });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const updateUserLockedAmount = async (userId, lockedAmount) => {
    try {
        await updateDoc(doc(db, "users", userId), { lockedAmount });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ------------------- PAYNOW TRANSACTION FUNCTIONS -------------------

/**
 * Process a PayNow transaction
 * - Deducts amount from user balance
 * - Stores transaction in Firestore
 * - Returns transaction details
 */
export const processPayNowTransaction = async (userId, transactionData, accessData = null) => {
    try {
        // Get current user balance
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { success: false, error: "User not found" };
        }
        const userData = userDoc.data();
        const userAccountNumber = userData.accountNumber || "671-******-***";
        const currentBalance = userDoc.data().balance || 0;
        const amount = parseFloat(transactionData.amount);

        // Check if user has sufficient balance
        if (currentBalance < amount) {
            return { success: false, error: "Insufficient balance" };
        }
        // Check if this is a shared account transaction that needs approval (Helper initiating)
        if (accessData && accessData.transactionApprovalLimit) {
            const limit = parseFloat(accessData.transactionApprovalLimit);

            // If amount exceeds limit, create pending approval request
            if (amount > limit) {
                const approvalResult = await createTransactionApprovalRequest({
                    accessId: accessData.accessId,
                    ownerId: accessData.ownerId,
                    userId: accessData.accessorId || userId,
                    amount: amount,
                    recipientName: transactionData.recipientName,
                    recipientNumber: transactionData.recipientNumber,
                    message: transactionData.message || "",
                    requestedBy: "user", // The person with shared access is requesting
                    approverId: accessData.ownerId, // Owner needs to approve
                    accountNumber: userAccountNumber,
                    accountName: transactionData.accountName || "OCBC FRANK Account"
                });

                if (approvalResult.success) {
                    return {
                        success: true,
                        requiresApproval: true,
                        approvalId: approvalResult.approvalId,
                        message: `Transaction requires approval. Amount $${amount.toFixed(2)} exceeds your limit of $${limit.toFixed(2)}.`,
                        status: "pending"
                    };
                } else {
                    return { success: false, error: "Failed to create approval request: " + approvalResult.error };
                }

            }
        } else if (!accessData) {
            // Owner initiating transaction - Check if any helper needs to approve (Reverse Approval)
            // Find active helpers who have approval permissions and a limit
            const accessQuery = query(
                collection(db, "accountAccess"),
                where("ownerId", "==", userId),
                where("status", "==", "active")
            );

            const accessSnapshot = await getDocs(accessQuery);
            let approverFound = null;
            let approvalLimit = 0;

            accessSnapshot.forEach((doc) => {
                const data = doc.data();
                // Check if helper has permission to approve AND has a limit set
                if (data.permissions && data.permissions.approveRequests && data.transactionApprovalLimit > 0) {
                    // If multiple helpers, we just pick the first one for now (simplification)
                    if (!approverFound) {
                        approverFound = data;
                        approvalLimit = parseFloat(data.transactionApprovalLimit);
                    }
                }
            });

            if (approverFound && amount > approvalLimit) {
                const approvalResult = await createTransactionApprovalRequest({
                    accessId: approverFound.id || `${userId}_${approverFound.userId}`, // Reconstruct ID if needed
                    ownerId: userId,
                    userId: userId, // Owner is initiating
                    amount: amount,
                    recipientName: transactionData.recipientName,
                    recipientNumber: transactionData.recipientNumber,
                    message: transactionData.message || "",
                    requestedBy: "owner", // Owner is requesting
                    approverId: approverFound.userId, // Helper needs to approve
                    accountNumber: userAccountNumber,
                    accountName: transactionData.accountName || "OCBC FRANK Account"
                });

                if (approvalResult.success) {
                    return {
                        success: true,
                        requiresApproval: true,
                        approvalId: approvalResult.approvalId,
                        message: `Transaction requires approval from your helper ${approverFound.userName}. Amount $${amount.toFixed(2)} exceeds the limit of $${approvalLimit.toFixed(2)}.`,
                        status: "pending"
                    };
                } else {
                    return { success: false, error: "Failed to create approval request: " + approvalResult.error };
                }
            }
        }


        // Calculate new balance
        const newBalance = currentBalance - amount;


        // Create transaction record
        const transactionRef = await addDoc(collection(db, "transactions"), {
            userId: userId,
            type: "paynow",
            status: "completed",
            amount: amount,
            recipientName: transactionData.recipientName,
            recipientNumber: transactionData.recipientNumber,
            message: transactionData.message || "",
            accountNumber: userAccountNumber,
            accountName: transactionData.accountName || "OCBC FRANK Account",
            transactionId: `25-${Date.now()}`,
            createdAt: getSingaporeTimeISOString(),
            completedAt: getSingaporeTimeISOString()
        });

        // Update sender's balance
        await updateDoc(doc(db, "users", userId), {
            balance: newBalance
        });

        // Credit the recipient's balance
        // Look up recipient by phone number
        if (transactionData.recipientNumber) {
            const recipientQuery = query(
                collection(db, "users"),
                where("phoneNumber", "==", transactionData.recipientNumber)
            );
            const recipientSnapshot = await getDocs(recipientQuery);

            if (!recipientSnapshot.empty) {
                const recipientDoc = recipientSnapshot.docs[0];
                const recipientData = recipientDoc.data();
                const recipientNewBalance = (recipientData.balance || 0) + amount;

                // Update recipient's balance
                await updateDoc(doc(db, "users", recipientDoc.id), {
                    balance: recipientNewBalance
                });

                // Create incoming transaction record for recipient
                await addDoc(collection(db, "transactions"), {
                    userId: recipientDoc.id,
                    type: "paynow_received",
                    status: "completed",
                    amount: amount,
                    senderName: userData.name || "Unknown",
                    senderAccountNumber: userAccountNumber,
                    message: transactionData.message || "",
                    accountNumber: recipientData.accountNumber || "",
                    accountName: "OCBC FRANK Account",
                    transactionId: `25-${Date.now()}-R`,
                    createdAt: getSingaporeTimeISOString(),
                    completedAt: getSingaporeTimeISOString()
                });
            }
        }

        // Trigger Daily Task Update for Transfer
        const taskResult = await updateDailyTaskProgress(userId, 'transfer');
        // >>>>> END BLOCK <<<<<

        return {
            success: true,
            requiresApproval: false,
            transactionId: transactionRef.id,
            newBalance: newBalance,
            taskCompleted: taskResult.taskCompleted,
            transaction: {
                id: transactionRef.id,
                ...transactionData,
                accountNumber: userAccountNumber,
                transactionId: `25-${Date.now()}`,
                createdAt: getSingaporeTimeISOString()
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get user's transaction history
 * - Returns all transactions for a user
 * - Ordered by date (newest first)
 */
export const getUserTransactions = async (userId, limit = 50) => {
    try {
        const q = query(
            collection(db, "transactions"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const transactions = [];

        querySnapshot.forEach((doc) => {
            transactions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return { success: true, transactions };
    } catch (error) {
        console.error("Error fetching transactions:", error);

        // Fallback: Fetch all transactions without orderBy if index doesn't exist
        try {
            const fallbackQuery = query(
                collection(db, "transactions"),
                where("userId", "==", userId)
            );

            const fallbackSnapshot = await getDocs(fallbackQuery);
            const transactions = [];

            fallbackSnapshot.forEach((doc) => {
                transactions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort in memory
            transactions.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            return { success: true, transactions };
        } catch (fallbackError) {
            return { success: false, error: fallbackError.message };
        }
    }
};
// ------------------- CONTACT MANAGEMENT FUNCTIONS -------------------

//Add a new contact for a user
export const addContact = async (userId, contactData) => {
    try {
        const contactRef = await addDoc(collection(db, "contacts"), {
            userId: userId,
            name: contactData.name,
            number: contactData.number,
            initial: contactData.initial || contactData.name.charAt(0).toUpperCase(),
            color: contactData.color || '#6B7280',
            createdAt: getSingaporeTimeISOString()
        });

        return { success: true, id: contactRef.id, contact: { id: contactRef.id, ...contactData } };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get all contacts for a user
 */
export const getUserContacts = async (userId) => {
    try {
        const q = query(
            collection(db, "contacts"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const contacts = [];

        querySnapshot.forEach((doc) => {
            contacts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return { success: true, contacts };
    } catch (error) {
        console.error("Error fetching contacts:", error);

        // Fallback: Fetch all contacts without orderBy if index doesn't exist
        try {
            const fallbackQuery = query(
                collection(db, "contacts"),
                where("userId", "==", userId)
            );

            const fallbackSnapshot = await getDocs(fallbackQuery);
            const contacts = [];

            fallbackSnapshot.forEach((doc) => {
                contacts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort in memory
            contacts.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            return { success: true, contacts };
        } catch (fallbackError) {
            return { success: false, error: fallbackError.message };
        }
    }
};

/**
 * Delete a contact
 */
export const deleteContact = async (contactId) => {
    try {
        await deleteDoc(doc(db, "contacts", contactId));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Update a contact
 */
export const updateContact = async (contactId, updates) => {
    try {
        await updateDoc(doc(db, "contacts", contactId), updates);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Grant access to someone else to view/manage your account
 * Creates a two-way relationship in Firestore
 */
export const grantAccess = async (ownerId, accessData) => {
    try {
        const accessId = `${ownerId}_${accessData.userId}`;

        // Create access record in Firestore
        await setDoc(doc(db, "accountAccess", accessId), {
            ownerId: ownerId, // Person who owns the account
            ownerName: accessData.ownerName,
            ownerAccountNumber: accessData.ownerAccountNumber,
            userId: accessData.userId, // Person who gets access
            userName: accessData.userName,
            userEmail: accessData.userEmail,
            userPhone: accessData.userPhone,
            permissions: accessData.permissions || {
                viewBalance: true,
                viewTransactions: true,
                makeTransfers: false,
                approveRequests: true,
                emergencyWithdrawal: false
            },
            transactionApprovalLimit: accessData.transactionApprovalLimit || 0,
            emergencyLimit: accessData.emergencyLimit || 0, 
            status: "active", // active, revoked, pending
            grantedAt: getSingaporeTimeISOString(),
            expiresAt: accessData.expiresAt || null
        });

        return { success: true, accessId: accessId };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get all people who have access to my account
 */
export const getPeopleWithAccess = async (ownerId) => {
    try {
        const q = query(
            collection(db, "accountAccess"),
            where("ownerId", "==", ownerId),
            where("status", "==", "active")
        );

        const querySnapshot = await getDocs(q);
        const people = [];

        querySnapshot.forEach((doc) => {
            people.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return { success: true, people };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get all accounts I have access to
 */
export const getAccountsICanAccess = async (userId) => {
    try {
        const q = query(
            collection(db, "accountAccess"),
            where("userId", "==", userId),
            where("status", "==", "active")
        );

        const querySnapshot = await getDocs(q);
        const accounts = [];

        querySnapshot.forEach((doc) => {
            accounts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return { success: true, accounts };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Revoke someone's access to my account
 */
export const revokeAccess = async (accessId) => {
    try {
        await updateDoc(doc(db, "accountAccess", accessId), {
            status: "revoked",
            revokedAt: getSingaporeTimeISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Update permissions for someone who has access
 */
export const updateAccessPermissions = async (accessId, updates) => {
    try {
        // This function now handles both permissions and emergencyLimit updates
        await updateDoc(doc(db, "accountAccess", accessId), {
            ...updates,
            updatedAt: getSingaporeTimeISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
/**
 * Update emergency limit for a helper 
 */
export const updateEmergencyLimit = async (accessId, newLimit) => {
    try {
        await updateDoc(doc(db, "accountAccess", accessId), {
            emergencyLimit: newLimit,
            updatedAt: getSingaporeTimeISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Send access invitation to someone by email/phone
 */
export const sendAccessInvitation = async (ownerId, invitationData) => {
    try {
        const invitationRef = await addDoc(collection(db, "accessInvitations"), {
            ownerId: ownerId,
            ownerName: invitationData.ownerName,
            ownerAccountNumber: invitationData.ownerAccountNumber,
            recipientEmail: invitationData.recipientEmail || null,
            recipientPhone: invitationData.recipientPhone || null,
            permissions: invitationData.permissions,
            status: "pending", // pending, accepted, declined, expired
            createdAt: getSingaporeTimeISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

        return { success: true, invitationId: invitationRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Accept access invitation
 */
export const acceptAccessInvitation = async (invitationId, userId, userData) => {
    try {
        // Get invitation details
        const invitationDoc = await getDoc(doc(db, "accessInvitations", invitationId));

        if (!invitationDoc.exists()) {
            return { success: false, error: "Invitation not found" };
        }

        const invitation = invitationDoc.data();

        // Check if invitation is still valid
        if (invitation.status !== "pending") {
            return { success: false, error: "Invitation already processed" };
        }

        if (new Date(invitation.expiresAt) < new Date()) {
            return { success: false, error: "Invitation has expired" };
        }

        // Create access record
        const accessResult = await grantAccess(invitation.ownerId, {
            userId: userId,
            userName: userData.userName,
            userEmail: userData.userEmail,
            userPhone: userData.userPhone,
            ownerName: invitation.ownerName,
            ownerAccountNumber: invitation.ownerAccountNumber,
            permissions: invitation.permissions
        });

        if (!accessResult.success) {
            return accessResult;
        }

        // Update invitation status
        await updateDoc(doc(db, "accessInvitations", invitationId), {
            status: "accepted",
            acceptedBy: userId,
            acceptedAt: getSingaporeTimeISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get my pending invitations
 */
export const getMyPendingInvitations = async (userEmail, userPhone) => {
    try {
        const queries = [];

        if (userEmail) {
            queries.push(
                query(
                    collection(db, "accessInvitations"),
                    where("recipientEmail", "==", userEmail),
                    where("status", "==", "pending")
                )
            );
        }

        if (userPhone) {
            queries.push(
                query(
                    collection(db, "accessInvitations"),
                    where("recipientPhone", "==", userPhone),
                    where("status", "==", "pending")
                )
            );
        }

        const invitations = [];

        for (const q of queries) {
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                // Check if not expired
                const data = doc.data();
                if (new Date(data.expiresAt) > new Date()) {
                    invitations.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
        }

        return { success: true, invitations };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
// ------------------- ACCESS INVITATION SYSTEM -------------------

/**
 * Send access invitation (requires recipient confirmation)
 */
export const sendAccessInvitationV2 = async (ownerId, invitationData) => {
    try {
        const invitationRef = await addDoc(collection(db, "accessInvitations"), {
            ownerId: ownerId,
            ownerName: invitationData.ownerName,
            ownerAccountNumber: invitationData.ownerAccountNumber,
            ownerEmail: invitationData.ownerEmail,
            recipientEmail: invitationData.recipientEmail || null,
            recipientPhone: invitationData.recipientPhone || null,
            recipientId: invitationData.recipientId, // Store recipient user ID
            recipientName: invitationData.recipientName,
            permissions: invitationData.permissions,
            transactionApprovalLimit: invitationData.transactionApprovalLimit || 0,
            requireMutualConsent: invitationData.requireMutualConsent || false,
            status: "pending", // pending, accepted, declined, expired
            createdAt: getSingaporeTimeISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

        return { success: true, invitationId: invitationRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get pending invitations for a user (to accept/decline)
 */
export const getMyPendingInvitationsV2 = async (userId) => {
    try {
        const q = query(
            collection(db, "accessInvitations"),
            where("recipientId", "==", userId),
            where("status", "==", "pending")
        );

        const querySnapshot = await getDocs(q);
        const invitations = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Check if not expired
            if (new Date(data.expiresAt) > new Date()) {
                invitations.push({
                    id: doc.id,
                    ...data
                });
            }
        });

        return { success: true, invitations };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Accept access invitation
 */
export const acceptAccessInvitationV2 = async (invitationId, userId) => {
    try {
        const invitationDoc = await getDoc(doc(db, "accessInvitations", invitationId));

        if (!invitationDoc.exists()) {
            return { success: false, error: "Invitation not found" };
        }

        const invitation = invitationDoc.data();

        if (invitation.status !== "pending") {
            return { success: false, error: "Invitation already processed" };
        }

        if (new Date(invitation.expiresAt) < new Date()) {
            return { success: false, error: "Invitation has expired" };
        }

        // Get recipient user data
        const recipientData = await getUserData(userId);
        if (!recipientData.success) {
            return { success: false, error: "Could not fetch your user data" };
        }

        // Create access record
        const accessId = `${invitation.ownerId}_${userId}`;

        await setDoc(doc(db, "accountAccess", accessId), {
            ownerId: invitation.ownerId,
            ownerName: invitation.ownerName,
            ownerAccountNumber: invitation.ownerAccountNumber,
            userId: userId,
            userName: recipientData.data.name,
            userEmail: recipientData.data.email,
            userPhone: recipientData.data.phoneNumber || "",
            permissions: invitation.permissions,
            requireMutualConsent: invitation.requireMutualConsent,
            transactionApprovalLimit: invitation.transactionApprovalLimit || 0,
            status: "active",
            grantedAt: getSingaporeTimeISOString(),
            acceptedAt: getSingaporeTimeISOString()
        });

        // Update invitation status
        await updateDoc(doc(db, "accessInvitations", invitationId), {
            status: "accepted",
            acceptedAt: getSingaporeTimeISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Decline access invitation
 */
export const declineAccessInvitation = async (invitationId) => {
    try {
        await updateDoc(doc(db, "accessInvitations", invitationId), {
            status: "declined",
            declinedAt: getSingaporeTimeISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Request to revoke access (when requireMutualConsent is true)
 */
export const requestRevokeAccess = async (accessId, requestedBy, reason = "") => {
    try {
        const accessDoc = await getDoc(doc(db, "accountAccess", accessId));

        if (!accessDoc.exists()) {
            return { success: false, error: "Access record not found" };
        }

        const accessData = accessDoc.data();

        // If mutual consent not required, revoke immediately
        if (!accessData.requireMutualConsent) {
            await updateDoc(doc(db, "accountAccess", accessId), {
                status: "revoked",
                revokedAt: getSingaporeTimeISOString(),
                revokedBy: requestedBy
            });
            return { success: true, immediate: true };
        }

        // Create revocation request
        const revocationRef = await addDoc(collection(db, "revocationRequests"), {
            accessId: accessId,
            ownerId: accessData.ownerId,
            ownerName: accessData.ownerName,
            userId: accessData.userId,
            userName: accessData.userName,
            requestedBy: requestedBy, // "owner" or "user"
            reason: reason,
            status: "pending",
            createdAt: getSingaporeTimeISOString()
        });

        return {
            success: true,
            immediate: false,
            requestId: revocationRef.id,
            message: "Revocation request sent. Waiting for approval."
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get pending revocation requests for a user
 */
export const getMyRevocationRequests = async (userId) => {
    try {
        // Get requests where I need to approve (either as owner or user)
        const queries = [
            query(
                collection(db, "revocationRequests"),
                where("ownerId", "==", userId),
                where("status", "==", "pending"),
                where("requestedBy", "==", "user")
            ),
            query(
                collection(db, "revocationRequests"),
                where("userId", "==", userId),
                where("status", "==", "pending"),
                where("requestedBy", "==", "owner")
            )
        ];

        const requests = [];

        for (const q of queries) {
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                requests.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        }

        return { success: true, requests };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Approve revocation request
 */
export const approveRevocation = async (requestId) => {
    try {
        const requestDoc = await getDoc(doc(db, "revocationRequests", requestId));

        if (!requestDoc.exists()) {
            return { success: false, error: "Request not found" };
        }

        const request = requestDoc.data();

        // Update access record to revoked
        await updateDoc(doc(db, "accountAccess", request.accessId), {
            status: "revoked",
            revokedAt: getSingaporeTimeISOString(),
            revokedBy: request.requestedBy,
            mutuallyAgreed: true
        });

        // Update revocation request
        await updateDoc(doc(db, "revocationRequests", requestId), {
            status: "approved",
            approvedAt: getSingaporeTimeISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Decline revocation request
 */
export const declineRevocation = async (requestId) => {
    try {
        await updateDoc(doc(db, "revocationRequests", requestId), {
            status: "declined",
            declinedAt: getSingaporeTimeISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
// ------------------- TRANSACTION APPROVAL SYSTEM -------------------

/**
 * Create a transaction approval request
 */
export const createTransactionApprovalRequest = async (requestData) => {
    try {
        const approvalRef = await addDoc(collection(db, "transactionApprovals"), {
            accessId: requestData.accessId,
            ownerId: requestData.ownerId,
            userId: requestData.userId,
            amount: requestData.amount,
            recipientName: requestData.recipientName,
            recipientNumber: requestData.recipientNumber,
            message: requestData.message || "",
            accountNumber: requestData.accountNumber,
            accountName: requestData.accountName,
            requestedBy: requestData.requestedBy, // "owner" or "user"
            approverId: requestData.approverId, // Who needs to approve this
            status: "pending",
            createdAt: getSingaporeTimeISOString()
        });

        return { success: true, approvalId: approvalRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get pending transaction approvals for a user
 * Now returns approvals where the user needs to approve
 */
export const getPendingTransactionApprovals = async (userId) => {
    try {
        // 1. Get approvals where this user is the owner (Old flow: Helper initiated)
        const q1 = query(
            collection(db, "transactionApprovals"),
            where("ownerId", "==", userId),
            where("status", "==", "pending"),
            where("requestedBy", "==", "user")
        );

        // 2. Get approvals where this user is the designated approver (New flow: Owner initiated, or explicit approver)
        const q2 = query(
            collection(db, "transactionApprovals"),
            where("approverId", "==", userId),
            where("status", "==", "pending")
        );

        const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const approvalsMap = new Map();

        snapshot1.forEach((doc) => {
            approvalsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });

        snapshot2.forEach((doc) => {
            // Avoid duplicates if logic overlaps
            if (!approvalsMap.has(doc.id)) {
                approvalsMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
        });

        const approvals = Array.from(approvalsMap.values());

        // Sort by createdAt desc
        approvals.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return { success: true, approvals };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
/**
 * Get my pending transaction requests (NEW)
 * Returns approvals that I requested and are awaiting approval
 */
export const getMyPendingTransactionRequests = async (userId) => {
    try {
        const q = query(
            collection(db, "transactionApprovals"),
            where("userId", "==", userId),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const requests = [];

        querySnapshot.forEach((doc) => {
            requests.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return { success: true, requests };
    } catch (error) {
        console.error("Error fetching my pending requests:", error);

        // Fallback without orderBy
        try {
            const fallbackQuery = query(
                collection(db, "transactionApprovals"),
                where("userId", "==", userId),
                where("status", "==", "pending")
            );

            const fallbackSnapshot = await getDocs(fallbackQuery);
            const requests = [];

            fallbackSnapshot.forEach((doc) => {
                requests.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort in memory
            requests.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            return { success: true, requests };
        } catch (fallbackError) {
            return { success: false, error: fallbackError.message };
        }
    }
};

/**
 * Approve a transaction request and execute the transaction (UPDATED)
 */
export const approveTransactionRequest = async (approvalId) => {
    try {
        // Get the approval request
        const approvalDoc = await getDoc(doc(db, "transactionApprovals", approvalId));

        if (!approvalDoc.exists()) {
            return { success: false, error: "Approval request not found" };
        }

        const approval = approvalDoc.data();

        // Get owner's current balance
        const ownerDoc = await getDoc(doc(db, "users", approval.ownerId));
        if (!ownerDoc.exists()) {
            return { success: false, error: "Account owner not found" };
        }

        const currentBalance = ownerDoc.data().balance || 0;
        const amount = parseFloat(approval.amount);

        // Check if owner has sufficient balance
        if (currentBalance < amount) {
            // Update approval to rejected due to insufficient funds
            await updateDoc(doc(db, "transactionApprovals", approvalId), {
                status: "rejected",
                rejectedAt: getSingaporeTimeISOString(),
                rejectionReason: "Insufficient balance"
            });
            return { success: false, error: "Insufficient balance in account" };
        }

        // Calculate new balance
        const newBalance = currentBalance - amount;

        // Create the actual transaction for the owner
        const transactionRef = await addDoc(collection(db, "transactions"), {
            userId: approval.ownerId,
            initiatedBy: approval.userId, // Track who initiated the transaction
            type: "paynow",
            status: "completed",
            amount: amount,
            recipientName: approval.recipientName,
            recipientNumber: approval.recipientNumber,
            message: approval.message || "",
            accountNumber: approval.accountNumber,
            accountName: approval.accountName,
            transactionId: `25-${Date.now()}`,
            approvalId: approvalId, // Link to the approval request
            createdAt: getSingaporeTimeISOString(),
            completedAt: getSingaporeTimeISOString()
        });

        // Update owner's balance
        await updateDoc(doc(db, "users", approval.ownerId), {
            balance: newBalance
        });

        // ---------------------------------------------------------
        // Credit the recipient
        // ---------------------------------------------------------
        try {
            console.log("Attempting to credit recipient. PayNow ID:", approval.recipientNumber);

            const usersRef = collection(db, "users");
            let recipientDoc = null;

            // Try to find recipient using multiple formats
            const formatsToTry = [
                approval.recipientNumber, // Exact match
                approval.recipientNumber.replace(/\s/g, ''), // Remove spaces
                approval.recipientNumber.replace(/[^0-9+]/g, ''), // Remove non-digits/plus
            ];

            // Add +65 variation
            if (!approval.recipientNumber.startsWith('+65')) {
                formatsToTry.push(`+65 ${approval.recipientNumber}`);
                formatsToTry.push(`+65${approval.recipientNumber}`);
            } else {
                // Remove +65
                formatsToTry.push(approval.recipientNumber.replace('+65', '').trim());
                formatsToTry.push(approval.recipientNumber.replace('+65', '').replace(/\s/g, ''));
            }

            // Remove duplicates
            const uniqueFormats = [...new Set(formatsToTry)];
            console.log("Trying formats:", uniqueFormats);

            for (const format of uniqueFormats) {
                const q = query(usersRef, where("phoneNumber", "==", format));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    recipientDoc = querySnapshot.docs[0];
                    console.log(`Recipient found with format: "${format}"`);
                    break;
                }
            }

            if (recipientDoc) {
                const recipientData = recipientDoc.data();
                console.log("Recipient found:", recipientData.name, "Current Balance:", recipientData.balance);

                const recipientNewBalance = (recipientData.balance || 0) + amount;

                // Update recipient's balance
                await updateDoc(doc(db, "users", recipientDoc.id), {
                    balance: recipientNewBalance
                });
                console.log("Recipient balance updated to:", recipientNewBalance);

                // Create transaction record for recipient
                await addDoc(collection(db, "transactions"), {
                    userId: recipientDoc.id,
                    type: "received",
                    status: "completed",
                    amount: amount,
                    senderName: approval.accountName || "Shared Account", // Or fetch owner's name
                    senderNumber: approval.accountNumber,
                    message: approval.message || "",
                    transactionId: `25-${Date.now()}-R`, // Unique ID for recipient side
                    relatedTransactionId: transactionRef.id,
                    createdAt: getSingaporeTimeISOString(),
                    completedAt: getSingaporeTimeISOString()
                });
                console.log("Recipient transaction record created");
            } else {
                console.warn("Recipient not found for PayNow ID:", approval.recipientNumber);
            }
        } catch (recipientError) {
            console.error("Error crediting recipient:", recipientError);
            // We don't fail the whole approval if recipient update fails, but we log it
        }
        // ---------------------------------------------------------

        // Update approval status
        await updateDoc(doc(db, "transactionApprovals", approvalId), {
            status: "approved",
            approvedAt: getSingaporeTimeISOString(),
            transactionId: transactionRef.id
        });

        return {
            success: true,
            transactionId: transactionRef.id,
            newBalance: newBalance
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const rejectTransactionRequest = async (approvalId, reason = "") => {
    try {
        await updateDoc(doc(db, "transactionApprovals", approvalId), {
            status: "rejected",
            rejectedAt: getSingaporeTimeISOString(),
            rejectionReason: reason
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
/**
 * Cancel a pending transaction request (NEW)
 * Allows the requester to cancel their own pending approval request
 */
export const cancelTransactionRequest = async (approvalId, userId) => {
    try {
        // Get the approval request
        const approvalDoc = await getDoc(doc(db, "transactionApprovals", approvalId));

        if (!approvalDoc.exists()) {
            return { success: false, error: "Approval request not found" };
        }

        const approval = approvalDoc.data();

        // Check if the user is authorized to cancel (must be the requester)
        if (approval.userId !== userId) {
            return { success: false, error: "You are not authorized to cancel this request" };
        }

        // Update approval status to cancelled
        await updateDoc(doc(db, "transactionApprovals", approvalId), {
            status: "cancelled",
            cancelledAt: getSingaporeTimeISOString(),
            cancelledBy: userId
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Request to update transaction limit
 */
export const requestTransactionLimitUpdate = async (accessId, newLimit, requestedBy) => {
    try {
        const accessDoc = await getDoc(doc(db, "accountAccess", accessId));

        if (!accessDoc.exists()) {
            return { success: false, error: "Access record not found" };
        }

        const accessData = accessDoc.data();
        const currentLimit = accessData.transactionApprovalLimit || 0;

        // Create limit change request
        const requestRef = await addDoc(collection(db, "limitChangeRequests"), {
            accessId: accessId,
            ownerId: accessData.ownerId,
            ownerName: accessData.ownerName,
            userId: accessData.userId,
            userName: accessData.userName,
            currentLimit: currentLimit,
            newLimit: newLimit,
            requestedBy: requestedBy, // "owner" or "user"
            status: "pending",
            createdAt: getSingaporeTimeISOString()
        });

        return {
            success: true,
            requestId: requestRef.id,
            message: "Limit change request sent. Waiting for approval."
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get pending limit change requests
 */
export const getPendingLimitChangeRequests = async (userId) => {
    try {
        const queries = [
            query(
                collection(db, "limitChangeRequests"),
                where("ownerId", "==", userId),
                where("status", "==", "pending"),
                where("requestedBy", "==", "user")
            ),
            query(
                collection(db, "limitChangeRequests"),
                where("userId", "==", userId),
                where("status", "==", "pending"),
                where("requestedBy", "==", "owner")
            )
        ];

        const requests = [];

        for (const q of queries) {
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                requests.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        }

        return { success: true, requests };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Approve limit change request
 */
export const approveLimitChange = async (requestId) => {
    try {
        const requestDoc = await getDoc(doc(db, "limitChangeRequests", requestId));

        if (!requestDoc.exists()) {
            return { success: false, error: "Request not found" };
        }

        const request = requestDoc.data();

        // Update access record with new limit
        await updateDoc(doc(db, "accountAccess", request.accessId), {
            transactionApprovalLimit: request.newLimit,
            limitUpdatedAt: getSingaporeTimeISOString()
        });

        // Update request status
        await updateDoc(doc(db, "limitChangeRequests", requestId), {
            status: "approved",
            approvedAt: getSingaporeTimeISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Decline limit change request
 */
export const declineLimitChange = async (requestId) => {
    try {
        await updateDoc(doc(db, "limitChangeRequests", requestId), {
            status: "declined",
            declinedAt: getSingaporeTimeISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ------------------- REFERRAL CODE FUNCTIONS -------------------

/**
 * Generate a unique referral code
 */
const generateUniqueReferralCode = async () => {
    const prefix = "OCBC";
    let isUnique = false;
    let code = "";

    while (!isUnique) {
        // Generate random 6 characters
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        code = prefix + random;

        // Check if code already exists
        const q = query(
            collection(db, "users"),
            where("referralCode", "==", code)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            isUnique = true;
        }
    }

    return code;
};

/**
 * Validate if a referral code exists and return the referrer's ID
 */
export const validateReferralCode = async (code) => {
    try {
        if (!code || code.trim() === "") {
            return { valid: false, error: "Referral code is empty" };
        }

        const q = query(
            collection(db, "users"),
            where("referralCode", "==", code.toUpperCase())
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { valid: false, error: "Referral code not found" };
        }

        const referrerDoc = querySnapshot.docs[0];
        return {
            valid: true,
            referrerId: referrerDoc.id,
            referrerData: referrerDoc.data()
        };
    } catch (error) {
        return { valid: false, error: error.message };
    }
};

/**
 * Award referral bonus to the referrer
 */
export const awardReferralBonus = async (referrerId, referredUserId, referredUserData) => {
    try {
        // Get referrer's current data
        const referrerDoc = await getDoc(doc(db, "users", referrerId));
        if (!referrerDoc.exists()) {
            return { success: false, error: "Referrer not found" };
        }

        const referrerData = referrerDoc.data();
        const currentReferralCoins = referrerData.referralCoins || 0;

        // Add 100 coins to referrer
        await updateDoc(doc(db, "users", referrerId), {
            referralCoins: currentReferralCoins + 100
        });
        // Trigger Daily Task Update for Referral
        await updateDailyTaskProgress(referrerId, 'referral');
        // Create referral record
        await addDoc(collection(db, "referrals"), {
            referrerId: referrerId,
            referredUserId: referredUserId,
            referredUserName: referredUserData.name,
            referredUserEmail: referredUserData.email,
            coinsAwarded: 100,
            createdAt: new Date().toISOString()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get all users who used my referral code
 */
export const getReferralsByUser = async (userId) => {
    try {
        const q = query(
            collection(db, "referrals"),
            where("referrerId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const referrals = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            referrals.push({
                id: doc.id,
                referredUserName: data.referredUserName,
                referredUserEmail: data.referredUserEmail,
                referredUserId: data.referredUserId,
                coinsAwarded: data.coinsAwarded,
                createdAt: data.createdAt
            });
        });

        console.log(`Found ${referrals.length} referrals for user ${userId}`); // Debug log

        return { success: true, referrals };
    } catch (error) {
        console.error("Error getting referrals:", error);
        return { success: false, error: error.message, referrals: [] };
    }
};

// ------------------- PRIZE REDEMPTION FUNCTIONS -------------------

/**
 * Get all available prizes
 */
export const getAvailablePrizes = async () => {
    try {
        const q = query(
            collection(db, "prizes"),
            where("available", "==", true)
        );

        const querySnapshot = await getDocs(q);
        const prizes = [];

        querySnapshot.forEach((doc) => {
            prizes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return { success: true, prizes };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Redeem a prize
 */
export const redeemPrize = async (userId, prizeData) => {
    try {
        // Get user data
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { success: false, error: "User not found" };
        }

        const userData = userDoc.data();
        const rewardCoins = userData.rewardCoins || 0;
        const referralCoins = userData.referralCoins || 0;
        const totalCoins = rewardCoins + referralCoins;

        // Check if user has enough coins
        if (totalCoins < prizeData.costInCoins) {
            return { success: false, error: "Insufficient coins" };
        }

        // Deduct coins (deduct from rewardCoins first, then referralCoins)
        let remainingCost = prizeData.costInCoins;
        let newRewardCoins = rewardCoins;
        let newReferralCoins = referralCoins;

        if (newRewardCoins >= remainingCost) {
            newRewardCoins -= remainingCost;
        } else {
            remainingCost -= newRewardCoins;
            newRewardCoins = 0;
            newReferralCoins -= remainingCost;
        }

        // Update user coins
        await updateDoc(doc(db, "users", userId), {
            rewardCoins: newRewardCoins,
            referralCoins: newReferralCoins
        });

        // Create redemption record
        const redemptionRef = await addDoc(collection(db, "redemptions"), {
            userId: userId,
            userName: userData.name,
            userEmail: userData.email,
            prizeId: prizeData.id,
            prizeName: prizeData.name,
            prizeDescription: prizeData.description,
            costInCoins: prizeData.costInCoins,
            status: "pending",
            redeemedAt: new Date().toISOString()
        });

        // --- TRIGGER EMAIL  ---
        const voucherCode = "OCBC-" + Math.random().toString(36).toUpperCase().substring(2, 10);
        
        const emailParams = {
            user_name: userData.name,
            prize_name: prizeData.name,
            cost: prizeData.costInCoins,
            voucher_code: voucherCode
        };

        emailjs.send( // get ID from emailjs.com
            "service_7zhsnqg", // service ID
            "template_k4ceznp", // email template ID
            emailParams, 
            "kumUhENojPmIw3tpB" // public key
        ).then((result) => {
            console.log('Email successfully sent!', result.text);
        }, (error) => {
            console.error('Failed to send email:', error.text);
        });

        return {
            success: true,
            redemptionId: redemptionRef.id,
            newTotalCoins: newRewardCoins + newReferralCoins
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get user's redemption history
 */
export const getUserRedemptions = async (userId) => {
    try {
        const q = query(
            collection(db, "redemptions"),
            where("userId", "==", userId),
            orderBy("redeemedAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const redemptions = [];

        querySnapshot.forEach((doc) => {
            redemptions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return { success: true, redemptions };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ------------------- COIN MANAGEMENT FUNCTIONS -------------------

/**
 * Update user's reward coins (from daily rewards, spin wheel, etc.)
 */
export const updateUserRewardCoins = async (userId, coinsToAdd) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { success: false, error: "User not found" };
        }

        const currentRewardCoins = userDoc.data().rewardCoins || 0;
        const newRewardCoins = currentRewardCoins + coinsToAdd;

        await updateDoc(doc(db, "users", userId), {
            rewardCoins: newRewardCoins
        });

        return { success: true, newRewardCoins };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get user's total coins (reward + referral)
 */
export const getUserTotalCoins = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { success: false, error: "User not found" };
        }

        const userData = userDoc.data();
        const rewardCoins = userData.rewardCoins || 0;
        const referralCoins = userData.referralCoins || 0;
        const totalCoins = rewardCoins + referralCoins;

        return {
            success: true,
            rewardCoins,
            referralCoins,
            totalCoins
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Add this temporary function to firebase.js to debug the data

export const debugReferralData = async (userId) => {
    try {
        console.log("=== DEBUGGING REFERRAL DATA ===");
        console.log("User ID:", userId);

        // Check user document
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User Data:", {
                name: userData.name,
                referralCode: userData.referralCode,
                referralCoins: userData.referralCoins,
                rewardCoins: userData.rewardCoins
            });
        } else {
            console.log("User document not found!");
        }

        // Check referrals collection (where referrerId = userId)
        const q1 = query(
            collection(db, "referrals"),
            where("referrerId", "==", userId)
        );
        const snapshot1 = await getDocs(q1);
        console.log(`Found ${snapshot1.size} documents in referrals collection where referrerId = ${userId}`);
        snapshot1.forEach((doc) => {
            console.log("Referral document:", doc.id, doc.data());
        });

        // Check all referrals in collection (to see structure)
        const q2 = query(collection(db, "referrals"));
        const snapshot2 = await getDocs(q2);
        console.log(`Total referrals in database: ${snapshot2.size}`);
        snapshot2.forEach((doc) => {
            console.log("All referral:", doc.id, doc.data());
        });

        // Check users who have referredBy = userId
        const q3 = query(
            collection(db, "users"),
            where("referredBy", "==", userId)
        );
        const snapshot3 = await getDocs(q3);
        console.log(`Found ${snapshot3.size} users who were referred by ${userId}`);
        snapshot3.forEach((doc) => {
            const data = doc.data();
            console.log("Referred user:", {
                id: doc.id,
                name: data.name,
                email: data.email,
                referredBy: data.referredBy
            });
        });

        console.log("=== END DEBUG ===");
        return { success: true };
    } catch (error) {
        console.error("Debug error:", error);
        return { success: false, error: error.message };
    }
};

// ------------------- DAILY TASK SYSTEM -------------------

/**
 * Updates progress for a specific task.
 * Handles daily resets automatically.
 */
export const updateDailyTaskProgress = async (userId, taskType) => {
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) return { success: false, error: "User not found" };

        const userData = userDoc.data();
        const today = getSingaporeDateString();

        // Initialize or Reset if date changed
        let dailyTasks = userData.dailyTasks || {};

        if (dailyTasks.lastUpdated !== today) {
            dailyTasks = {
                lastUpdated: today,
                chatCount: 0,
                transferCount: 0,
                referralCount: 0,
                claimed: { chat: false, transfer: false, referral: false }
            };
        }

        // Define Targets
        const targets = { chat: 3, transfer: 1, referral: 1 };
        let taskCompletedNow = false;

        // Update Counters based on type
        if (taskType === 'chat') {
            if ((dailyTasks.chatCount || 0) < targets.chat) {
                dailyTasks.chatCount = (dailyTasks.chatCount || 0) + 1;
                if (dailyTasks.chatCount === targets.chat) taskCompletedNow = true;
            }
        } else if (taskType === 'transfer') {
            if ((dailyTasks.transferCount || 0) < targets.transfer) {
                dailyTasks.transferCount = (dailyTasks.transferCount || 0) + 1;
                if (dailyTasks.transferCount === targets.transfer) taskCompletedNow = true;
            }
        } else if (taskType === 'referral') {
            if ((dailyTasks.referralCount || 0) < targets.referral) {
                dailyTasks.referralCount = (dailyTasks.referralCount || 0) + 1;
                if (dailyTasks.referralCount === targets.referral) taskCompletedNow = true;
            }
        }

        // Save back to Firestore (using set with merge or update)
        await setDoc(userRef, { dailyTasks: dailyTasks }, { merge: true });

        return { success: true, taskCompleted: taskCompletedNow };
    } catch (error) {
        console.error("Error updating task:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Claims the reward for a completed task
 */
export const claimDailyTaskReward = async (userId, taskType, rewardAmount) => {
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) return { success: false, error: "User not found" };

        const userData = userDoc.data();
        const dailyTasks = userData.dailyTasks;

        // Validation
        if (!dailyTasks || dailyTasks.lastUpdated !== getSingaporeDateString()) {
            return { success: false, error: "Task data outdated or reset. Please refresh." };
        }

        if (dailyTasks.claimed && dailyTasks.claimed[taskType]) {
            return { success: false, error: "Reward already claimed today." };
        }

        // Verify completion
        const targets = { chat: 3, transfer: 1, referral: 1 };
        const countKey = `${taskType}Count`; // e.g., chatCount

        if ((dailyTasks[countKey] || 0) < targets[taskType]) {
            return { success: false, error: "Task not yet completed." };
        }

        // Update Claim Status & Add Coins
        const newClaimed = { ...(dailyTasks.claimed || {}), [taskType]: true };
        const newRewardCoins = (userData.rewardCoins || 0) + rewardAmount;

        // Update Firestore
        await updateDoc(userRef, {
            "dailyTasks.claimed": newClaimed,
            rewardCoins: newRewardCoins
        });

        return { success: true, newTotalCoins: newRewardCoins + (userData.referralCoins || 0) };

    } catch (error) {
        return { success: false, error: error.message };
    }
};


export const findUserByIdentifier = async (identifier) => {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("phoneNumber", "==", identifier));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            return { id: userDoc.id, ...userDoc.data() };
        }
        return null;
    } catch (error) {
        console.error("Error finding user by identifier:", error);
        return null;
    }
};

// ------------------- CHAT HISTORY FUNCTIONS -------------------

/**
 * Save a chat session to Firestore
 */
export const saveChatSession = async (userId, messages, sessionId = null) => {
    try {
        const timestamp = getSingaporeTimeISOString();

        if (sessionId) {
            // Update existing session
            await updateDoc(doc(db, "chatSessions", sessionId), {
                messages: messages,
                updatedAt: timestamp
            });
            return { success: true, sessionId: sessionId };
        } else {
            // Create new session
            const sessionRef = await addDoc(collection(db, "chatSessions"), {
                userId: userId,
                messages: messages,
                createdAt: timestamp,
                updatedAt: timestamp
            });
            return { success: true, sessionId: sessionRef.id };
        }
    } catch (error) {
        console.error("Error saving chat session:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all chat sessions for a user
 */
export const getChatHistory = async (userId, limit = 20) => {
    try {
        const q = query(
            collection(db, "chatSessions"),
            where("userId", "==", userId),
            orderBy("updatedAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const sessions = [];

        querySnapshot.forEach((doc) => {
            sessions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Apply limit
        return { success: true, sessions: sessions.slice(0, limit) };
    } catch (error) {
        console.error("Error fetching chat history:", error);

        // Fallback without orderBy if index doesn't exist
        try {
            const fallbackQuery = query(
                collection(db, "chatSessions"),
                where("userId", "==", userId)
            );

            const fallbackSnapshot = await getDocs(fallbackQuery);
            const sessions = [];

            fallbackSnapshot.forEach((doc) => {
                sessions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort in memory
            sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            return { success: true, sessions: sessions.slice(0, limit) };
        } catch (fallbackError) {
            return { success: false, error: fallbackError.message };
        }
    }
};

/**
 * Get a specific chat session by ID
 */
export const getChatSession = async (sessionId) => {
    try {
        const sessionDoc = await getDoc(doc(db, "chatSessions", sessionId));
        if (sessionDoc.exists()) {
            return { success: true, session: { id: sessionDoc.id, ...sessionDoc.data() } };
        }
        return { success: false, error: "Session not found" };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Delete a chat session
 */
export const deleteChatSession = async (sessionId) => {
    try {
        await deleteDoc(doc(db, "chatSessions", sessionId));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ------------------- ACCOUNT LOCK FUNCTIONS -------------------

/**
 * Set account lock status
 */
export const setAccountLockStatus = async (userId, isLocked) => {
    try {
        await updateDoc(doc(db, "users", userId), {
            isLocked: isLocked,
            lockUpdatedAt: getSingaporeTimeISOString()
        });
        return { success: true, isLocked: isLocked };
    } catch (error) {
        console.error("Error setting account lock status:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Get account lock status
 */
export const getAccountLockStatus = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            return { success: true, isLocked: userDoc.data().isLocked || false };
        }
        return { success: false, error: "User not found" };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ------------------- PORTFOLIO/INVESTMENT FUNCTIONS -------------------

/**
 * Get user's investment portfolio
 */
export const getPortfolio = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const portfolio = userDoc.data().portfolio || [];
            return { success: true, portfolio: portfolio };
        }
        return { success: false, error: "User not found" };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Update entire portfolio
 */
export const updatePortfolio = async (userId, portfolio) => {
    try {
        await updateDoc(doc(db, "users", userId), {
            portfolio: portfolio,
            portfolioUpdatedAt: getSingaporeTimeISOString()
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Buy stock/investment
 * @param {string} userId - User ID
 * @param {string} ticker - Stock ticker symbol
 * @param {number} amount - Dollar amount to invest
 * @param {number} pricePerShare - Current price per share
 */
export const buyInvestment = async (userId, ticker, amount, pricePerShare) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { success: false, error: "User not found" };
        }

        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;

        // Check if account is locked
        if (userData.isLocked) {
            return { success: false, error: "Account is locked. Please unlock to make transactions." };
        }

        // Check sufficient balance
        if (currentBalance < amount) {
            return { success: false, error: "Insufficient balance for this investment." };
        }

        const shares = amount / pricePerShare;
        const portfolio = userData.portfolio || [];

        // Find existing holding for this ticker
        const existingIndex = portfolio.findIndex(p => p.ticker.toUpperCase() === ticker.toUpperCase());

        if (existingIndex >= 0) {
            // Update existing holding
            const existing = portfolio[existingIndex];
            const totalShares = existing.shares + shares;
            const totalCost = (existing.shares * existing.avgPrice) + amount;
            const newAvgPrice = totalCost / totalShares;

            portfolio[existingIndex] = {
                ...existing,
                shares: totalShares,
                avgPrice: newAvgPrice,
                totalValue: totalShares * pricePerShare,
                lastUpdated: getSingaporeTimeISOString()
            };
        } else {
            // Add new holding
            portfolio.push({
                ticker: ticker.toUpperCase(),
                shares: shares,
                avgPrice: pricePerShare,
                totalValue: amount,
                purchasedAt: getSingaporeTimeISOString(),
                lastUpdated: getSingaporeTimeISOString()
            });
        }

        // Update balance and portfolio
        const newBalance = currentBalance - amount;
        await updateDoc(doc(db, "users", userId), {
            balance: newBalance,
            portfolio: portfolio,
            portfolioUpdatedAt: getSingaporeTimeISOString()
        });

        // Record transaction
        await addDoc(collection(db, "transactions"), {
            userId: userId,
            type: "investment_buy",
            status: "completed",
            amount: amount,
            ticker: ticker.toUpperCase(),
            shares: shares,
            pricePerShare: pricePerShare,
            transactionId: `INV-${Date.now()}`,
            createdAt: getSingaporeTimeISOString()
        });

        return {
            success: true,
            shares: shares,
            ticker: ticker.toUpperCase(),
            amount: amount,
            newBalance: newBalance,
            message: `Successfully purchased ${shares.toFixed(4)} shares of ${ticker.toUpperCase()} for $${amount.toFixed(2)}`
        };
    } catch (error) {
        console.error("Error buying investment:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Sell stock/investment
 * @param {string} userId - User ID
 * @param {string} ticker - Stock ticker symbol
 * @param {number} shares - Number of shares to sell (or 'all')
 * @param {number} pricePerShare - Current price per share
 */
export const sellInvestment = async (userId, ticker, shares, pricePerShare) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { success: false, error: "User not found" };
        }

        const userData = userDoc.data();

        // Check if account is locked
        if (userData.isLocked) {
            return { success: false, error: "Account is locked. Please unlock to make transactions." };
        }

        const portfolio = userData.portfolio || [];
        const holdingIndex = portfolio.findIndex(p => p.ticker.toUpperCase() === ticker.toUpperCase());

        if (holdingIndex < 0) {
            return { success: false, error: `You don't own any ${ticker.toUpperCase()} shares.` };
        }

        const holding = portfolio[holdingIndex];

        // Handle selling all shares
        let sharesToSell = shares;
        if (shares === 'all' || shares >= holding.shares) {
            sharesToSell = holding.shares;
        }

        if (sharesToSell > holding.shares) {
            return { success: false, error: `Insufficient shares. You only have ${holding.shares.toFixed(4)} shares of ${ticker.toUpperCase()}.` };
        }

        const saleAmount = sharesToSell * pricePerShare;
        const newBalance = (userData.balance || 0) + saleAmount;

        // Update portfolio
        if (sharesToSell >= holding.shares) {
            // Remove entirely
            portfolio.splice(holdingIndex, 1);
        } else {
            // Reduce shares
            portfolio[holdingIndex] = {
                ...holding,
                shares: holding.shares - sharesToSell,
                totalValue: (holding.shares - sharesToSell) * pricePerShare,
                lastUpdated: getSingaporeTimeISOString()
            };
        }

        // Update balance and portfolio
        await updateDoc(doc(db, "users", userId), {
            balance: newBalance,
            portfolio: portfolio,
            portfolioUpdatedAt: getSingaporeTimeISOString()
        });

        // Record transaction
        await addDoc(collection(db, "transactions"), {
            userId: userId,
            type: "investment_sell",
            status: "completed",
            amount: saleAmount,
            ticker: ticker.toUpperCase(),
            shares: sharesToSell,
            pricePerShare: pricePerShare,
            transactionId: `INV-${Date.now()}`,
            createdAt: getSingaporeTimeISOString()
        });

        return {
            success: true,
            shares: sharesToSell,
            ticker: ticker.toUpperCase(),
            amount: saleAmount,
            newBalance: newBalance,
            message: `Successfully sold ${sharesToSell.toFixed(4)} shares of ${ticker.toUpperCase()} for $${saleAmount.toFixed(2)}`
        };
    } catch (error) {
        console.error("Error selling investment:", error);
        return { success: false, error: error.message };
    }
};

// ------------------- CURRENCY EXCHANGE FUNCTIONS -------------------

/**
 * Exchange currency - deduct from balance, record exchange
 * @param {string} userId - User ID
 * @param {string} fromCurrency - Source currency (e.g., 'SGD')
 * @param {string} toCurrency - Target currency (e.g., 'USD')
 * @param {number} amount - Amount in source currency
 * @param {number} exchangeRate - Exchange rate (how much toCurrency per 1 fromCurrency)
 */
export const performCurrencyExchange = async (userId, fromCurrency, toCurrency, amount, exchangeRate) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { success: false, error: "User not found" };
        }

        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;

        // Check if account is locked
        if (userData.isLocked) {
            return { success: false, error: "Account is locked. Please unlock to make transactions." };
        }

        // For SGD, check balance
        if (fromCurrency.toUpperCase() === 'SGD') {
            if (currentBalance < amount) {
                return { success: false, error: "Insufficient SGD balance for this exchange." };
            }
        }

        const convertedAmount = amount * exchangeRate;

        // Deduct from balance if exchanging from SGD
        let newBalance = currentBalance;
        if (fromCurrency.toUpperCase() === 'SGD') {
            newBalance = currentBalance - amount;
            await updateDoc(doc(db, "users", userId), {
                balance: newBalance
            });
        }

        // Record the exchange transaction
        await addDoc(collection(db, "transactions"), {
            userId: userId,
            type: "currency_exchange",
            status: "completed",
            fromCurrency: fromCurrency.toUpperCase(),
            toCurrency: toCurrency.toUpperCase(),
            fromAmount: amount,
            toAmount: convertedAmount,
            exchangeRate: exchangeRate,
            transactionId: `FX-${Date.now()}`,
            createdAt: getSingaporeTimeISOString()
        });

        return {
            success: true,
            fromCurrency: fromCurrency.toUpperCase(),
            toCurrency: toCurrency.toUpperCase(),
            fromAmount: amount,
            toAmount: convertedAmount,
            exchangeRate: exchangeRate,
            newBalance: newBalance,
            message: `Successfully exchanged ${amount.toFixed(2)} ${fromCurrency.toUpperCase()} to ${convertedAmount.toFixed(2)} ${toCurrency.toUpperCase()} at rate ${exchangeRate.toFixed(4)}`
        };
    } catch (error) {
        console.error("Error performing currency exchange:", error);
        return { success: false, error: error.message };
    }
};

// ------------------- ATM AMOUNT LOCK FUNCTIONS -------------------

/**
 * Process ATM amount lock/unlock
 * @param {string} userId - User ID
 * @param {string} action - 'lock' or 'unlock'
 * @param {number} amount - Amount to lock/unlock
 */
export const processATMAmountLock = async (userId, action, amount) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { success: false, error: "User not found" };
        }

        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;
        const currentLockedAmount = userData.lockedAmount || 0;

        if (action === 'lock') {
            // Check if user has sufficient available balance
            if (currentBalance < amount) {
                return { success: false, error: "Insufficient available balance to lock this amount" };
            }

            // Lock the amount: reduce balance, increase lockedAmount
            const newBalance = currentBalance - amount;
            const newLockedAmount = currentLockedAmount + amount;

            await updateDoc(doc(db, "users", userId), {
                balance: newBalance,
                lockedAmount: newLockedAmount,
                lockedAmountUpdatedAt: getSingaporeTimeISOString()
            });

            // Record transaction
            await addDoc(collection(db, "transactions"), {
                userId: userId,
                type: "amount_lock",
                status: "completed",
                amount: amount,
                transactionId: `LOCK-${Date.now()}`,
                createdAt: getSingaporeTimeISOString()
            });

            return {
                success: true,
                action: 'lock',
                amount: amount,
                newBalance: newBalance,
                newLockedAmount: newLockedAmount,
                message: `Successfully locked $${amount.toFixed(2)}`
            };

        } else if (action === 'unlock') {
            // Check if user has sufficient locked amount
            if (currentLockedAmount < amount) {
                return { success: false, error: "Insufficient locked amount to unlock" };
            }

            // Unlock the amount: increase balance, reduce lockedAmount
            const newBalance = currentBalance + amount;
            const newLockedAmount = currentLockedAmount - amount;

            await updateDoc(doc(db, "users", userId), {
                balance: newBalance,
                lockedAmount: newLockedAmount,
                lockedAmountUpdatedAt: getSingaporeTimeISOString()
            });

            // Record transaction
            await addDoc(collection(db, "transactions"), {
                userId: userId,
                type: "amount_unlock",
                status: "completed",
                amount: amount,
                transactionId: `UNLOCK-${Date.now()}`,
                createdAt: getSingaporeTimeISOString()
            });

            return {
                success: true,
                action: 'unlock',
                amount: amount,
                newBalance: newBalance,
                newLockedAmount: newLockedAmount,
                message: `Successfully unlocked $${amount.toFixed(2)}`
            };

        } else {
            return { success: false, error: "Invalid action. Must be 'lock' or 'unlock'" };
        }

    } catch (error) {
        console.error("Error processing ATM amount lock:", error);
        return { success: false, error: error.message };
    }
};

// ------------------- ADVANCED CHATBOT CUSTOMIZATION FUNCTIONS -------------------

/**
 * Update advanced chatbot settings
 */
export const updateAdvancedChatbotSettings = async (userId, settings) => {
    try {
        await setDoc(doc(db, "users", userId), { 
            advancedChatbotSettings: settings 
        }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating advanced chatbot settings:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get advanced chatbot settings
 */
export const getAdvancedChatbotSettings = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return { 
                success: true, 
                settings: userData.advancedChatbotSettings || {
                    // Default settings
                    botName: 'OCBC AI Assistant',
                    simpleMode: false,
                    language: 'english',
                    familyMembers: [],
                    safetyProfile: 'standard',
                    speechSettings: {
                        voiceInput: false,
                        voiceOutput: false,
                        voiceSpeed: 1.0,
                        voicePitch: 1.0
                    },
                    memorySettings: {
                        rememberPreferences: true,
                        personalizedResponses: true,
                        contextAwareness: true
                    }
                }
            };
        }
        return { 
            success: true, 
            settings: {
                botName: 'OCBC AI Assistant',
                simpleMode: false,
                language: 'english',
                familyMembers: [],
                safetyProfile: 'standard',
                speechSettings: {
                    voiceInput: false,
                    voiceOutput: false,
                    voiceSpeed: 1.0,
                    voicePitch: 1.0
                },
                memorySettings: {
                    rememberPreferences: true,
                    personalizedResponses: true,
                    contextAwareness: true
                }
            }
        };
    } catch (error) {
        console.error('Error getting advanced chatbot settings:', error);
        return { success: false, error: error.message };
    }
};

// ------------------- EMERGENCY CASH WITHDRAWAL FUNCTIONS -------------------

/**
 * Create emergency self withdrawal (OTP-based)
 * @param {string} userId - User ID
 * @param {number} amount - Withdrawal amount
 * @param {string} otp - Generated 6-digit OTP
 */
export const createEmergencySelfWithdrawal = async (userId, amount, otp, validitySeconds = 600) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    const selfEmergencyLimit = 500;

    if (amount > selfEmergencyLimit) {
      return { success: false, error: `Amount exceeds emergency limit of $${selfEmergencyLimit}` };
    }

    // Use validitySeconds parameter
    const tokenRef = await addDoc(collection(db, "emergencyWithdrawals"), {
      tokenId: `self_OTP_${Date.now()}`,
      ownerId: userId,
      amount: amount,
      method: "OTP",
      otp: otp,
      expiresAt: new Date(Date.now() + validitySeconds * 1000).toISOString(),
      used: false,
      createdAt: getSingaporeTimeISOString(),
      status: "pending"
    });

    return { 
      success: true, 
      tokenId: tokenRef.id,
      otp: otp,
      expiresAt: new Date(Date.now() + validitySeconds * 1000).toISOString()
    };
  } catch (error) {
    console.error("Error creating emergency self withdrawal:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create emergency shared withdrawal (QR-based)
 * @param {string} ownerId - Account owner ID
 * @param {string} userId - Shared access user ID
 * @param {number} amount - Withdrawal amount
 * @param {string} atmId - ATM ID from scanned QR
 */
export const createEmergencySharedWithdrawal = async (ownerId, userId, amount, atmId) => {
  try {
    // Get access record to verify permissions and limits
    const accessId = `${ownerId}_${userId}`;
    const accessDoc = await getDoc(doc(db, "accountAccess", accessId));

    if (!accessDoc.exists()) {
      return { success: false, error: "No shared access found" };
    }

    const accessData = accessDoc.data();
    const emergencyLimit = accessData.emergencyLimit || 300;

    // Validate amount
    if (amount > emergencyLimit) {
      return { success: false, error: `Amount exceeds emergency limit of $${emergencyLimit}` };
    }

    // Check owner's balance
    const ownerDoc = await getDoc(doc(db, "users", ownerId));
    if (!ownerDoc.exists()) {
      return { success: false, error: "Account owner not found" };
    }

    const ownerBalance = ownerDoc.data().balance || 0;
    if (ownerBalance < amount) {
      return { success: false, error: "Insufficient balance in owner's account" };
    }

    // Create withdrawal session
    const sessionRef = await addDoc(collection(db, "emergencyWithdrawals"), {
      tokenId: `shared_QR_${Date.now()}`,
      ownerId: ownerId,
      sharedUserId: userId,
      amount: amount,
      method: "QR",
      atmId: atmId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      used: false,
      createdAt: getSingaporeTimeISOString(),
      status: "approved" // Automatically approved for shared access
    });

    return { 
      success: true, 
      sessionId: sessionRef.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
  } catch (error) {
    console.error("Error creating emergency shared withdrawal:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify emergency OTP and process withdrawal
 * @param {string} otp - 6-digit OTP entered at ATM
 */
export const verifyEmergencyOTP = async (otp) => {
  try {
    // Find token by OTP
    const q = query(
      collection(db, "emergencyWithdrawals"),
      where("otp", "==", otp),
      where("used", "==", false),
      where("method", "==", "OTP")
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: "Invalid or expired OTP" };
    }

    const tokenDoc = querySnapshot.docs[0];
    const tokenData = tokenDoc.data();

    // Check if expired
    if (new Date(tokenData.expiresAt) < new Date()) {
      return { success: false, error: "OTP has expired" };
    }

    // Get owner's data
    const ownerDoc = await getDoc(doc(db, "users", tokenData.ownerId));
    if (!ownerDoc.exists()) {
      return { success: false, error: "Account owner not found" };
    }

    const ownerData = ownerDoc.data();
    const currentBalance = ownerData.balance || 0;

    // Check balance
    if (currentBalance < tokenData.amount) {
      await updateDoc(doc(db, "emergencyWithdrawals", tokenDoc.id), {
        status: "rejected",
        rejectionReason: "Insufficient balance",
        usedAt: getSingaporeTimeISOString()
      });
      return { success: false, error: "Insufficient balance" };
    }

    // Deduct amount from balance
    const newBalance = currentBalance - tokenData.amount;
    await updateDoc(doc(db, "users", tokenData.ownerId), {
      balance: newBalance
    });

    // Mark token as used
    await updateDoc(doc(db, "emergencyWithdrawals", tokenDoc.id), {
      used: true,
      usedAt: getSingaporeTimeISOString(),
      status: "completed"
    });

    // Create transaction record
    await addDoc(collection(db, "transactions"), {
      userId: tokenData.ownerId,
      type: "emergency_withdrawal",
      status: "completed",
      amount: tokenData.amount,
      method: "OTP",
      transactionId: `EMG-${Date.now()}`,
      createdAt: getSingaporeTimeISOString(),
      completedAt: getSingaporeTimeISOString()
    });

    return {
      success: true,
      amount: tokenData.amount,
      newBalance: newBalance,
      message: "Withdrawal approved"
    };
  } catch (error) {
    console.error("Error verifying emergency OTP:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Process emergency shared withdrawal (QR-based)
 * @param {string} sessionId - Session ID from QR scan
 */
export const processEmergencySharedWithdrawal = async (sessionId) => {
  try {
    const sessionDoc = await getDoc(doc(db, "emergencyWithdrawals", sessionId));

    if (!sessionDoc.exists()) {
      return { success: false, error: "Invalid session" };
    }

    const sessionData = sessionDoc.data();

    // Check if already used
    if (sessionData.used) {
      return { success: false, error: "Session already used" };
    }

    // Check if expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      return { success: false, error: "Session has expired" };
    }

    // Get owner's data
    const ownerDoc = await getDoc(doc(db, "users", sessionData.ownerId));
    if (!ownerDoc.exists()) {
      return { success: false, error: "Account owner not found" };
    }

    const ownerData = ownerDoc.data();
    const currentBalance = ownerData.balance || 0;

    // Check balance
    if (currentBalance < sessionData.amount) {
      await updateDoc(doc(db, "emergencyWithdrawals", sessionId), {
        status: "rejected",
        rejectionReason: "Insufficient balance",
        usedAt: getSingaporeTimeISOString()
      });
      return { success: false, error: "Insufficient balance" };
    }

    // Deduct amount from balance
    const newBalance = currentBalance - sessionData.amount;
    await updateDoc(doc(db, "users", sessionData.ownerId), {
      balance: newBalance
    });

    // Mark session as used
    await updateDoc(doc(db, "emergencyWithdrawals", sessionId), {
      used: true,
      usedAt: getSingaporeTimeISOString(),
      status: "completed"
    });

    // Create transaction record for owner
    await addDoc(collection(db, "transactions"), {
      userId: sessionData.ownerId,
      type: "emergency_withdrawal",
      status: "completed",
      amount: sessionData.amount,
      method: "QR",
      initiatedBy: sessionData.sharedUserId,
      atmId: sessionData.atmId,
      transactionId: `EMG-${Date.now()}`,
      createdAt: getSingaporeTimeISOString(),
      completedAt: getSingaporeTimeISOString()
    });

    return {
      success: true,
      amount: sessionData.amount,
      newBalance: newBalance,
      message: "Withdrawal approved"
    };
  } catch (error) {
    console.error("Error processing emergency shared withdrawal:", error);
    return { success: false, error: error.message };
  }
};


/**
 * Get all ongoing (active, non-expired, non-used) OTP sessions for a user
 * @param {string} userId - User ID
 */
export const getOngoingOTPSessions = async (userId) => {
  try {
    const now = new Date().toISOString();

    // Query with just 3 conditions (might still need index, but simpler)
    const q = query(
      collection(db, "emergencyWithdrawals"),
      where("ownerId", "==", userId),
      where("method", "==", "OTP"),
      where("used", "==", false)
      // Filter status and expiresAt in JS
    );

    const querySnapshot = await getDocs(q);
    const sessions = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Additional filtering in JavaScript
      if (data.status === "pending" && new Date(data.expiresAt) > new Date()) {
        sessions.push({
          id: doc.id,
          ...data
        });
      }
    });

    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { success: true, sessions };
  } catch (error) {
    console.error("Error fetching ongoing OTP sessions:", error);
    return { success: false, error: error.message, sessions: [] };
  }
};

/**
 * Discard/cancel an OTP session
 * @param {string} sessionId - Session ID to discard
 */
export const discardOTPSession = async (sessionId) => {
  try {
    const db = getFirestore();
    
    // Update the session to mark it as cancelled
    await updateDoc(doc(db, "emergencyWithdrawals", sessionId), {
      status: "cancelled",
      used: true, // Prevent it from being used
      cancelledAt: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error("Error discarding OTP session:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get successful self-withdrawal history for a user (FIXED)
 */
export const getSelfWithdrawalHistory = async (userId, limit = 10) => {
  try {
    // SIMPLIFIED QUERY - Only 2 where clauses
    const q = query(
      collection(db, "emergencyWithdrawals"),
      where("ownerId", "==", userId),
      where("method", "==", "OTP")
      // Removed: status, used - filter in JS
    );

    const querySnapshot = await getDocs(q);
    const history = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Filter for completed withdrawals in JavaScript
      if (data.status === "completed" && data.used === true) {
        history.push({
          id: doc.id,
          amount: data.amount,
          otp: data.otp,
          createdAt: data.createdAt,
          usedAt: data.usedAt,
          completedAt: data.usedAt || data.completedAt,
          status: data.status
        });
      }
    });

    // Sort by completion date (newest first)
    history.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    // Apply limit
    const limitedHistory = history.slice(0, limit);

    console.log('✅ Found withdrawal history:', limitedHistory.length); // Debug log

    return { success: true, history: limitedHistory };
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    return { success: false, error: error.message, history: [] };
  }
};

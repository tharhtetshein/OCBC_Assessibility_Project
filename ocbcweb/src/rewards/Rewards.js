import React, { useState, useEffect } from "react";
import { auth } from "../services/firebase";
import { 
  getUserData, 
  updateUserRewardCoins, 
  getReferralsByUser,
  redeemPrize,
  claimDailyTaskReward,
  submitWhackScore,
  getWhackLeaderboard
} from "../services/firebase";
import BottomNav from "../navigation/BottomNav";

const Rewards = () => {
    /* ============================================================
        STATE
    ============================================================ */
    const [currentUser, setCurrentUser] = useState(null);
    const [currentDay, setCurrentDay] = useState(0);
    const [coins, setCoins] = useState(0);
    const [rewardCoins, setRewardCoins] = useState(0);
    const [referralCoins, setReferralCoins] = useState(0);
    const [canCollect, setCanCollect] = useState(true);

    const [referralCode, setReferralCode] = useState("");
    const [referredUsers, setReferredUsers] = useState([]);
    const [showReferralList, setShowReferralList] = useState(false);

    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [spinsLeft, setSpinsLeft] = useState(3);

    // Prize redemption state
    const [showPrizeModal, setShowPrizeModal] = useState(false);
    const [selectedPrize, setSelectedPrize] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [redeeming, setRedeeming] = useState(false);

    // Popup notifications
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState("");
    const [popupType, setPopupType] = useState("success"); // success, error, info

    // Available prizes (hardcoded for now, can be moved to Firebase later)
    const prizes = [
        { 
            id: "grab5", 
            name: "S$5 Grab Voucher", 
            description: "Valid for 30 days",
            costInCoins: 50, 
            icon: "🚗",
            available: true 
        },
        { 
            id: "ntuc10", 
            name: "S$10 NTUC Voucher", 
            description: "Valid for 60 days",
            costInCoins: 100, 
            icon: "🛒",
            available: true 
        },
        { 
            id: "starbucks15", 
            name: "S$15 Starbucks Card", 
            description: "Valid for 90 days",
            costInCoins: 150, 
            icon: "☕",
            available: true 
        },
        { 
            id: "popular20", 
            name: "S$20 Popular Bookstore", 
            description: "Valid for 60 days",
            costInCoins: 200, 
            icon: "📚",
            available: true 
        },
        { 
            id: "lazada50", 
            name: "S$50 Lazada Voucher", 
            description: "Valid for 90 days",
            costInCoins: 500, 
            icon: "🎁",
            available: true 
        },
        { 
            id: "airpods", 
            name: "Apple AirPods Pro", 
            description: "Brand new, sealed",
            costInCoins: 2000, 
            icon: "🎧",
            available: true 
        },
    ];

    const prizes_wheel = [
        { id: 1, label: "1 Coin", value: 1, color: "#ffffff", text: "#e31837" },
        { id: 2, label: "10 Coins", value: 10, color: "#e31837", text: "#ffffff" },
        { id: 3, label: "5 Coins", value: 5, color: "#ffffff", text: "#e31837" },
        { id: 4, label: "Try Again", value: 0, color: "#e31837", text: "#ffffff" },
        { id: 5, label: "2 Coins", value: 2, color: "#ffffff", text: "#e31837" },
        { id: 6, label: "20 Coins", value: 20, color: "#e31837", text: "#ffffff" },
        { id: 7, label: "5 Coins", value: 5, color: "#ffffff", text: "#e31837" },
        { id: 8, label: "100 Coins", value: 100, color: "#e31837", text: "#ffffff" },
    ];

    // Daily Tasks State
    const [dailyTasks, setDailyTasks] = useState({
        chatCount: 0,
        transferCount: 0,
        referralCount: 0,
        claimed: { chat: false, transfer: false, referral: false }
    });
    const [claimingTask, setClaimingTask] = useState(null); // To prevent double clicks

// --- WHACK-A-SCAM GAME STATE ---
    const [wsGameActive, setWsGameActive] = useState(false);
    const [wsScore, setWsScore] = useState(0);
    const [wsTimeLeft, setWsTimeLeft] = useState(20);
    const [wsItems, setWsItems] = useState([]);
    const [wsGamePlayedToday, setWsGamePlayedToday] = useState(false);
    const [wsGameOver, setWsGameOver] = useState(false);
    
    // UI & Logic State
    const [wsCombo, setWsCombo] = useState(0); 
    const [wsShake, setWsShake] = useState(false); 
    
    // New: Education State (Replaces simple pause)
    const [wsEducation, setWsEducation] = useState({
        active: false,
        text: "",
        message: ""
    });
    
    // New: Score Popups State
    const [wsPopups, setWsPopups] = useState([]);

    // Leaderboard State
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

    // Data from your reference file
    const SCAM_SCENARIOS = [
        { text: "🎁 Free iPhone!", education: "No legitimate company gives away expensive items for free. This is bait to steal your info." },
        { text: "⚠️ Account Locked", education: "Banks never send urgent 'account locked' messages via SMS to panic you." },
        { text: "💸 You Won $500!", education: "You can't win a contest you never entered. They will ask for 'fees' to claim it." },
        { text: "🔓 Verify Now", education: "Legitimate services don't demand immediate verification via random links." },
        { text: "📦 Package Issue", education: "Fake delivery notifications are common. Check the official app instead." },
        { text: "💳 Card Expired", education: "Banks send secure in-app notifications or letters, not random texts asking for details." },
        { text: "🏦 Bank Alert!", education: "Real bank alerts don't ask for your PIN or password. Call the bank directly." },
        { text: "🎰 Jackpot Win!", education: "Lottery scams promise huge winnings but require upfront 'taxes'. Real lotteries deduct automatically." }
    ];
    
    const LEGIT_SCENARIOS = [
        "💰 Salary Credit", "📝 Bill Paid", "🔢 OTP: 8829", 
        "✅ Transfer OK", "📧 Newsletter", "🛒 Order Shipped"
    ];

    /* ============================================================
        POPUP HELPER
    ============================================================ */
    const showNotification = (message, type = "success") => {
        setPopupMessage(message);
        setPopupType(type);
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 3000);
    };

    /* ============================================================
        LOAD DATA
    ============================================================ */
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setCurrentUser(user);
                await loadUserData(user.uid);
                await loadReferrals(user.uid);
            }
        });

        const savedDay = localStorage.getItem("currentDay");
        const lastCollected = localStorage.getItem("lastCollected");
        if (savedDay) setCurrentDay(parseInt(savedDay));
        if (lastCollected) {
            const today = new Date().toDateString();
            setCanCollect(lastCollected !== today);
        }

        const savedSpins = localStorage.getItem("spinsLeft");
        if (savedSpins) setSpinsLeft(parseInt(savedSpins));

        return () => unsubscribe();
    }, []);

    const loadUserData = async (userId) => {
        const result = await getUserData(userId);
        if (result.success) {
            const userData = result.data;
            setReferralCode(userData.referralCode || "");
            const rewardC = userData.rewardCoins || 0;
            const referralC = userData.referralCoins || 0;
            setRewardCoins(rewardC);
            setReferralCoins(referralC);
            setCoins(rewardC + referralC);
            // Load Daily Tasks
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
            if (result.data.dailyTasks && result.data.dailyTasks.lastUpdated === today) {
                setDailyTasks(result.data.dailyTasks);
            } else {
                // Fallback default for view if DB hasn't updated yet
                setDailyTasks({
                    chatCount: 0,
                    transferCount: 0,
                    referralCount: 0,
                    claimed: { chat: false, transfer: false, referral: false }
                });
            }
        }
    };

    const loadReferrals = async (userId) => {
    console.log("Loading referrals for userId:", userId);
    const result = await getReferralsByUser(userId);
    console.log("getReferralsByUser result:", result);
    if (result.success) {
        console.log("Referrals data:", result.referrals);
        setReferredUsers(result.referrals);
    } else {
        console.log("Error loading referrals:", result.error);
    }
};

    /* ============================================================
        DAILY REWARD
    ============================================================ */
    const collectReward = async () => {
        if (!canCollect || !currentUser) return;

        const newDay = currentDay < 7 ? currentDay + 1 : 0;
        const bonus = newDay === 7 ? 4 : 1;

        const result = await updateUserRewardCoins(currentUser.uid, bonus);
        if (result.success) {
            const newRewardCoins = result.newRewardCoins;
            setRewardCoins(newRewardCoins);
            setCoins(newRewardCoins + referralCoins);
            setCurrentDay(newDay);
            setCanCollect(false);
            localStorage.setItem("currentDay", newDay.toString());
            localStorage.setItem("lastCollected", new Date().toDateString());
            showNotification(`🎉 Collected ${bonus} coin${bonus > 1 ? 's' : ''}!`, "success");
        }
    };

    /* ============================================================
        REFERRAL
    ============================================================ */
    const copyCode = () => {
        navigator.clipboard.writeText(referralCode);
        showNotification("📋 Referral code copied!", "info");
    };

    const shareCode = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Join OCBC Rewards!",
                    text: `Use my referral code ${referralCode} to help me earn 100 bonus coins!`,
                });
            } catch {
                copyCode();
            }
        } else {
            copyCode();
        }
    };
    // TASK CLAIM HANDLER
    const handleTaskClaim = async (taskType, rewardAmount) => {
        if (!currentUser || claimingTask) return;
        setClaimingTask(taskType);

        const result = await claimDailyTaskReward(currentUser.uid, taskType, rewardAmount);
        
        if (result.success) {
            setCoins(result.newTotalCoins);
            // Optimistic update for UI
            setDailyTasks(prev => ({
                ...prev,
                claimed: { ...prev.claimed, [taskType]: true }
            }));
            showNotification(`🎉 Claimed ${rewardAmount} coins!`);
        } else {
            showNotification(`❌ ${result.error}`, "error");
        }
        setClaimingTask(null);
    };
    
/* ============================================================
        WHACK-A-SCAM LOGIC
    ============================================================ */
    useEffect(() => {
        const lastGame = localStorage.getItem("lastWhackGameDate");
        const today = new Date().toDateString();
        if (lastGame === today) setWsGamePlayedToday(true);
    }, []);



    const startWhackGame = () => {
        if (wsGamePlayedToday) return;
        setWsScore(0); setWsCombo(0); setWsTimeLeft(20); 
        setWsItems([]); setWsPopups([]); 
        setWsEducation({ active: false, text: "", message: "" });
        setWsGameOver(false); setWsGameActive(true);
    };

    const handleWhackItem = (id, type, text, educationMsg) => {
        if (wsEducation.active) return; // Ignore taps during education

        setWsItems((prev) => prev.filter((item) => item.id !== id));
        
        // Find click coordinates for popup (approximated center)
        // In a real DOM event we'd use clientX/Y, here we just spawn it
        
        if (type === 'legit') {
            // Correct Hit
            const newCombo = wsCombo + 1;
            const points = Math.min(1 + Math.floor(newCombo / 3), 5);
            setWsScore((prev) => prev + points);
            setWsCombo(newCombo);
            
            // Add Score Popup
            const newPopup = { id: Date.now(), text: `+${points}`, color: "#FFD700" };
            setWsPopups(prev => [...prev, newPopup]);
            setTimeout(() => setWsPopups(curr => curr.filter(p => p.id !== newPopup.id)), 800);

            if (navigator.vibrate) navigator.vibrate(30);

        } else {
            // Wrong Hit (Scam) -> Trigger Education
            setWsScore((prev) => Math.max(0, prev - 5));
            setWsCombo(0);
            
            const newPopup = { id: Date.now(), text: "-5", color: "#ff4d4d" };
            setWsPopups(prev => [...prev, newPopup]);
            setTimeout(() => setWsPopups(curr => curr.filter(p => p.id !== newPopup.id)), 800);

            setWsShake(true); 
            setTimeout(() => setWsShake(false), 300);
            if (navigator.vibrate) navigator.vibrate([50, 100, 50]);

            // Activate Education Mode
            setWsEducation({
                active: true,
                text: text,
                message: educationMsg
            });

            // Resume after 3 seconds
            setTimeout(() => {
                setWsEducation({ active: false, text: "", message: "" });
            }, 3000);
        }
    };

    const endWhackGame = async () => {
        setWsGameActive(false);
        setWsGameOver(true);
        
        if (wsScore > 0 && currentUser) {
            const result = await submitWhackScore(wsScore);
            if (result.success) {
                setRewardCoins(prev => prev + result.addedCoins);
                setCoins(prev => prev + result.addedCoins);
                showNotification(`Game Verified! +${result.addedCoins} coins added.`);
            } else {
                showNotification(`Error: ${result.error}`, "error");
            }
        }
        localStorage.setItem("lastWhackGameDate", new Date().toDateString());
        setWsGamePlayedToday(true);
    };

    // --- MOVED GAME LOOP HERE TO FIX "endWhackGame not defined" ---
    useEffect(() => {
        let timerInterval, spawnInterval;
        const isPaused = wsEducation.active; 

        if (wsGameActive && wsTimeLeft > 0 && !isPaused) {
            timerInterval = setInterval(() => setWsTimeLeft((prev) => prev - 1), 1000);
            
            spawnInterval = setInterval(() => {
                const isScam = Math.random() < 0.6; 
                let text, educationMsg = "";

                if (isScam) {
                    const scenario = SCAM_SCENARIOS[Math.floor(Math.random() * SCAM_SCENARIOS.length)];
                    text = scenario.text;
                    educationMsg = scenario.education;
                } else {
                    text = LEGIT_SCENARIOS[Math.floor(Math.random() * LEGIT_SCENARIOS.length)];
                }
                
                const newItem = {
                    id: Date.now() + Math.random(),
                    type: isScam ? 'scam' : 'legit',
                    text: text,
                    education: educationMsg,
                    top: Math.floor(Math.random() * 80) + "%",
                    left: Math.floor(Math.random() * 80) + "%",
                };
                setWsItems((prev) => [...prev, newItem]);
                setTimeout(() => setWsItems((curr) => curr.filter(i => i.id !== newItem.id)), 2500);
            }, 700); 
        } else if (wsTimeLeft === 0 && wsGameActive) {
            endWhackGame();
        }
        return () => { clearInterval(timerInterval); clearInterval(spawnInterval); };
    }, [wsGameActive, wsTimeLeft, wsEducation.active]);

    // --- LEADERBOARD FUNCTION ---
    const handleOpenLeaderboard = async () => {
        setLoadingLeaderboard(true);
        setShowLeaderboard(true);
        const result = await getWhackLeaderboard();
        if (result.success) {
            setLeaderboardData(result.leaderboard);
        } else {
            console.error(result.error); 
        }
        setLoadingLeaderboard(false);
    };
/* ============================================================
        SPIN WHEEL (SVG LOGIC)
    ============================================================ */
    const spinWheel = async () => {
        if (spinning || spinsLeft <= 0 || !currentUser) return;

        setSpinning(true);
        
        // 1. FRONTEND LOGIC: Pick a random winner
        const randomIndex = Math.floor(Math.random() * prizes_wheel.length);
        const prize = prizes_wheel[randomIndex];

        // 2. Calculate Rotation
        // In SVG, 0 degrees is usually 3 o'clock. We rotate -90deg to make index 0 start at 12 o'clock.
        // Slice Angle = 360 / 8 = 45 degrees.
        // To point to Index X, we need to rotate the WHEEL so that Index X is at the top.
        const sliceAngle = 360 / prizes_wheel.length;
        
        // Add random full rotations (5 to 10 spins) + offset to land on center of slice
        const fullSpins = 360 * (5 + Math.floor(Math.random() * 5)); 
        
        // Target calculation: 
        // We want the selected index to be at -90deg (Top).
        // Current position of index i is (i * sliceAngle).
        // Rotation needed = - (i * sliceAngle) - (sliceAngle / 2) to center it.
        const stopAngle = fullSpins + (360 - (randomIndex * sliceAngle));

        setRotation(stopAngle);

        // 3. Wait for animation (4 seconds)
        setTimeout(async () => {
            // Update Firestore directly
            const result = await updateUserRewardCoins(currentUser.uid, prize.value);
            
            if (result.success) {
                setRewardCoins(result.newRewardCoins);
                setCoins(result.newRewardCoins + referralCoins);
                
                const newSpins = spinsLeft - 1;
                setSpinsLeft(newSpins);
                localStorage.setItem("spinsLeft", newSpins.toString());
                
                showNotification(
                    prize.value > 0 
                    ? `🎰 You won ${prize.label}!` 
                    : "😢 So close! Try again tomorrow.", 
                    prize.value > 0 ? "success" : "info"
                );
            } else {
                showNotification("Error saving reward.", "error");
            }
            setSpinning(false);
        }, 4000);
    };
    /* ============================================================
        PRIZE REDEMPTION
    ============================================================ */
    const handleRedeemClick = (prize) => {
        if (coins < prize.costInCoins) {
            showNotification(`❌ Need ${prize.costInCoins - coins} more coins!`, "error");
            return;
        }
        setSelectedPrize(prize);
        setShowConfirmDialog(true);
    };

    useEffect(() => {
        if (!showConfirmDialog) return;

        const target = "[data-help-id='rewards-confirm-redemption']";

        const dispatchOnce = () => {
            window.dispatchEvent(
                new CustomEvent('help:set-step-by-target', {
                    detail: { target }
                })
            );
        };

        dispatchOnce();
        const intervalId = setInterval(dispatchOnce, 300);
        const timeoutId = setTimeout(() => clearInterval(intervalId), 4000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [showConfirmDialog]);

    useEffect(() => {
        if (!showConfirmDialog) return;

        const timeoutId = setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent('help:advance-to-target', {
                    detail: {
                        fromTargets: [
                            "[data-help-id='rewards-redeem-button']",
                            "[data-help-id='rewards-close-prizes']"
                        ],
                        target: "[data-help-id='rewards-confirm-redemption']"
                    }
                })
            );
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [showConfirmDialog]);


    const confirmRedeem = async () => {
        if (!selectedPrize || !currentUser || redeeming) return;
        setRedeeming(true);

        // Pass the entire prize object instead of just the ID
        const result = await redeemPrize(currentUser.uid, selectedPrize);
        
        if (result.success) {
            showNotification(`✅ Redeemed ${selectedPrize.name}! Check your email.`, "success");
            setCoins(result.newTotalCoins);
            await loadUserData(currentUser.uid);
            setShowConfirmDialog(false);
            setShowPrizeModal(false);
            setSelectedPrize(null);
        } else {
            showNotification(`❌ ${result.error}`, "error");
        }
        setRedeeming(false);
    };

    /* ============================================================
        DAYS LIST
    ============================================================ */
    const days = Array.from({ length: 8 }, (_, i) => {
        // If we can collect, 'Today' is the current pointer (currentDay).
        // If we already collected, 'Today' is still the box we just finished (currentDay - 1).
        const activeIndex = canCollect ? currentDay : Math.max(0, currentDay - 1);
        
        return {
            day: i,
            reward: i === 7 ? 4 : 1,
            // A day is collected if its index is less than the next counter
            collected: i < currentDay,
            // The white box stays on the active index
            isToday: i === activeIndex, 
        };
    });

    /* ============================================================
        UI
    ============================================================ */
    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", paddingBottom: "80px" }}>
            {/* POPUP NOTIFICATION */}
            {showPopup && (
                <div
                    style={{
                        position: "fixed",
                        top: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 1000,
                        background: popupType === "error" ? "#e31837" : popupType === "info" ? "#4365ff" : "#28a745",
                        color: "white",
                        padding: "15px 30px",
                        borderRadius: "25px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        fontSize: "16px",
                        fontWeight: "600",
                        animation: "slideDown 0.3s ease",
                    }}
                >
                    {popupMessage}
                </div>
            )}

            <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* DAILY REWARDS */}
                <div style={{ padding: "20px", background: "linear-gradient(135deg, #e31837 0%, #c41530 100%)", color: "white", borderRadius: "15px", boxShadow: "0 4px 12px rgba(227,24,55,0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                        <h2 style={{ margin: 0 }}>OCBC Rewards</h2>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <button
                                onClick={() => setShowPrizeModal(true)}
                                data-help-id="rewards-open-prizes"
                                style={{ background: "rgba(255,255,255,0.2)", border: "2px solid white", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "20px" }}
                                title="Redeem Prizes"
                            >
                                🎁
                            </button>
                            <div data-help-id="rewards-coin-balance" style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.2)", padding: "5px 14px", borderRadius: "20px" }}>
                                <span>💰</span>
                                <b>{coins}</b>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", marginBottom: "20px" }}>
                        {days.map((day, idx) => (
                            <div key={idx} style={{ 
                                padding: "12px 8px", 
                                textAlign: "center", 
                                borderRadius: "10px", 
                                backgroundColor: day.isToday ? "rgba(255,255,255,0.3)" : day.collected ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)", 
                                border: day.isToday ? "2px solid white" : "none" 
                            }}>
                                <div style={{ fontSize: "11px" }}>
                                    {day.isToday ? "Today" : `Day ${day.day + 1}`}
                                </div>
                                <div style={{ fontWeight: "bold", marginTop: "2px" }}>
                                    {day.collected ? (
                                        <span style={{ color: "#4caf50", fontSize: "16px", textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>✔</span>
                                    ) : (
                                        `+${day.reward}`
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={collectReward} disabled={!canCollect} data-help-id="rewards-collect-button" style={{ width: "100%", padding: "15px", borderRadius: "25px", fontWeight: "bold", backgroundColor: canCollect ? "#FFD700" : "rgba(255,255,255,0.3)", color: "#333", border: "none", cursor: canCollect ? "pointer" : "not-allowed" }}>
                        {canCollect ? "Collect daily coin!" : "Come back tomorrow!"}
                    </button>
                </div>

                {/* REFERRAL */}
                <div style={{ padding: "25px", background: "white", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                    <div style={{ display: "flex", marginBottom: "20px" }}>
                        <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "linear-gradient(135deg,#e31837,#FFD700)", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "24px" }}>
                            👥
                        </div>
                        <div style={{ marginLeft: "14px" }}>
                            <h3 style={{ margin: "0 0 4px 0" }}>Refer Friends</h3>
                            <p style={{ margin: 0, color: "#666" }}>Earn 100 coins per referral</p>
                        </div>
                    </div>

                    <div style={{ background: "#f5f5f5", padding: "15px", borderRadius: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                            <small style={{ color: "#666" }}>Your Referral Code</small>
                            <p style={{ fontFamily: "monospace", fontSize: "20px", fontWeight: "bold", margin: "5px 0 0 0" }}>
                                {referralCode || "Loading..."}
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "5px" }}>
                            <button onClick={() => setShowReferralList(true)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "24px" }} title="View Referrals">
                                👥
                            </button>
                            <button onClick={copyCode} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "24px" }} title="Copy Code">
                                📋
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
                        <div style={{ background: "linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,215,0,0.05))", padding: "15px", borderRadius: "10px", border: "1px solid rgba(255,215,0,0.2)", textAlign: "center" }}>
                            <div style={{ fontSize: "20px" }}>🎁</div>
                            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{referredUsers.length}</div>
                            <small style={{ color: "#666" }}>Referrals</small>
                        </div>
                    <div style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.06))", padding: "15px", borderRadius: "10px", border: "1px solid rgba(34,197,94,0.2)", textAlign: "center" }}>
                            <div style={{ fontSize: "20px" }}>💰</div>
                            {/* FIX: Calculate lifetime earnings (count * 100) instead of current balance */}
                            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{referredUsers.length * 100}</div>
                            <small style={{ color: "#666" }}>Coins Earned</small>
                        </div>
                    </div>

                    <button onClick={shareCode} data-help-id="rewards-share-code" style={{ width: "100%", background: "#e31837", color: "white", padding: "15px", borderRadius: "25px", fontWeight: "bold", border: "none", cursor: "pointer", fontSize: "16px" }}>
                        📤 Share Code
                    </button>
                </div>

            {/* --- WHACK-A-SCAM GAME --- */}
                <div style={{ 
                    padding: "0", 
                    backgroundColor: "#1a1a1a", 
                    borderRadius: "20px", 
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)", 
                    border: wsShake ? "2px solid #e31837" : "2px solid #333",
                    position: "relative", 
                    overflow: "hidden", 
                    minHeight: wsGameActive ? "400px" : "auto",
                    color: "white",
                    transition: "border 0.1s",
                    fontFamily: "'Segoe UI', sans-serif"
                }} className={wsShake ? "shake-anim" : ""}>
                    
                    {/* Intro Screen */}
                    {!wsGameActive && !wsGameOver && (
                        <div style={{ textAlign: "center", padding: "30px" }}>
                            <div style={{ fontSize: "60px", marginBottom: "15px", animation: "bounce 2s infinite" }}>🔨</div>
                            {/* Title & Leaderboard Icon */}
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                <h3 style={{ margin: 0, color: "#fff", fontSize: "24px", fontWeight: "bold" }}>Whack-A-Scam</h3>
                                <button 
                                    onClick={handleOpenLeaderboard}
                                    style={{ 
                                        background: "rgba(255, 215, 0, 0.2)", 
                                        border: "1px solid #FFD700", 
                                        borderRadius: "50%", 
                                        width: "35px", height: "35px", 
                                        cursor: "pointer", fontSize: "18px", 
                                        display: "flex", alignItems: "center", justifyContent: "center"
                                    }}
                                    title="View Leaderboard"
                                >
                                    🏆
                                </button>
                            </div>
                            <p style={{ margin: "0 0 25px 0", fontSize: "15px", color: "#aaa", lineHeight: "1.6" }}>
                                Tap <span style={{color: "#4caf50", fontWeight: "bold"}}>GREEN LEGIT</span> messages.<br/>
                                Avoid <span style={{color: "#ff4d4d", fontWeight: "bold"}}>RED SCAM</span> messages!
                            </p>
                            <button 
                                onClick={startWhackGame}
                                disabled={wsGamePlayedToday}
                                style={{ 
                                    width: "100%", padding: "16px", borderRadius: "16px", 
                                    backgroundColor: wsGamePlayedToday ? "#444" : "#e31837", 
                                    color: wsGamePlayedToday ? "#888" : "white", 
                                    border: "none", fontWeight: "bold", fontSize: "16px",
                                    cursor: wsGamePlayedToday ? "default" : "pointer",
                                    boxShadow: wsGamePlayedToday ? "none" : "0 4px 15px rgba(227, 24, 55, 0.4)"
                                }}
                            >
                                {wsGamePlayedToday ? "Come Back Tomorrow" : "🎮 START GAME"}
                            </button>
                            <div style={{ marginTop: "20px" }}>
                                <button onClick={() => { localStorage.removeItem("lastWhackGameDate"); setWsGamePlayedToday(false); showNotification("Reset!", "info"); }} style={{ background: "none", border: "none", color: "#555", fontSize: "12px", cursor: "pointer" }}>[Admin Reset]</button>
                            </div>
                        </div>
                    )}

                    {/* Game Over Screen */}
                    {wsGameOver && (
                        <div style={{ textAlign: "center", padding: "40px 20px" }}>
                            <div style={{ fontSize: "70px", marginBottom: "15px" }}>
                                {wsScore > 20 ? "🏆" : wsScore > 5 ? "🎉" : "😅"}
                            </div>
                            <h2 style={{ color: "white", marginBottom: "10px", fontSize: "28px" }}>TIME'S UP!</h2>
                            <div style={{ marginBottom: "30px" }}>
                                <div style={{ fontSize: "14px", color: "#888" }}>Final Score</div>
                                <div style={{ fontSize: "40px", fontWeight: "bold", color: "#FFD700" }}>{wsScore}</div>
                            </div>
                            <div style={{ background: "rgba(255,255,255,0.1)", padding: "15px", borderRadius: "12px", marginBottom: "20px" }}>
                                <span style={{ color: "#4caf50", fontWeight: "bold" }}>+{wsScore} Coins Added</span>
                            </div>
                            <button onClick={() => setWsGameOver(false)} style={{ width: "100%", background: "transparent", border: "1px solid #666", color: "#fff", padding: "14px", borderRadius: "16px", cursor: "pointer" }}>Close</button>
                        </div>
                    )}

                    {/* Active Game Board */}
                    {wsGameActive && (
                        <>
                            {/* HUD */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                                <div>
                                    <div style={{fontSize: "11px", color: "#888", fontWeight: "bold", letterSpacing: "1px"}}>TIME</div>
                                    <div style={{fontSize: "20px", fontWeight: "bold", color: wsTimeLeft <= 5 ? "#ff4d4d" : "white", fontFamily: "monospace"}}>{wsTimeLeft}s</div>
                                </div>
                                <div style={{textAlign: "center"}}>
                                    <div style={{fontSize: "11px", color: "#888", fontWeight: "bold", letterSpacing: "1px"}}>COMBO</div>
                                    <div style={{fontSize: "20px", fontWeight: "bold", color: wsCombo > 2 ? "#FFD700" : "#666"}}>x{wsCombo}</div>
                                </div>
                                <div style={{textAlign: "right"}}>
                                    <div style={{fontSize: "11px", color: "#888", fontWeight: "bold", letterSpacing: "1px"}}>SCORE</div>
                                    <div style={{fontSize: "24px", fontWeight: "bold", color: "#FFD700"}}>{wsScore}</div>
                                </div>
                            </div>

                            {/* Play Area */}
                            <div style={{ position: "relative", height: "320px", overflow: "hidden" }}>
                                
                                {/* Background Grid */}
                                <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>

                                {wsItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onMouseDown={(e) => { e.preventDefault(); handleWhackItem(item.id, item.type, item.text, item.education); }}
                                        onTouchStart={(e) => { e.preventDefault(); handleWhackItem(item.id, item.type, item.text, item.education); }}
                                        style={{
                                            position: "absolute",
                                            top: item.top,
                                            left: item.left,
                                            backgroundColor: item.type === 'scam' ? "rgba(220, 38, 38, 0.95)" : "rgba(22, 163, 74, 0.95)",
                                            color: "white",
                                            border: "1px solid rgba(255,255,255,0.4)",
                                            borderRadius: "16px",
                                            padding: "12px 16px",
                                            fontSize: "13px",
                                            fontWeight: "bold",
                                            boxShadow: item.type === 'scam' ? "0 4px 15px rgba(220, 38, 38, 0.4)" : "0 4px 15px rgba(22, 163, 74, 0.4)",
                                            cursor: "pointer",
                                            animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                            zIndex: 10,
                                            whiteSpace: "nowrap",
                                            backdropFilter: "blur(4px)",
                                            transform: "translate(-50%, -50%)"
                                        }}
                                    >
                                        {item.type === 'scam' ? "⚠️ " : "✅ "}{item.text}
                                    </button>
                                ))}

                                {/* Floating Score Popups */}
                                {wsPopups.map((p) => (
                                    <div key={p.id} style={{
                                        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                                        color: p.color, fontSize: "40px", fontWeight: "bold",
                                        animation: "floatUp 0.8s ease-out forwards", zIndex: 20, pointerEvents: "none",
                                        textShadow: "0 2px 10px rgba(0,0,0,0.5)"
                                    }}>
                                        {p.text}
                                    </div>
                                ))}

                                {/* --- EDUCATION OVERLAY (Based on ScamEducation.tsx) --- */}
                                {wsEducation.active && (
                                    <div style={{
                                        position: "absolute", inset: 0, zIndex: 50,
                                        backgroundColor: "rgba(10, 10, 20, 0.95)", backdropFilter: "blur(8px)",
                                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                        padding: "20px", textAlign: "center",
                                        animation: "fadeIn 0.2s ease-out"
                                    }}>
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: "10px",
                                            background: "rgba(220, 38, 38, 0.2)", border: "1px solid rgba(220, 38, 38, 0.5)",
                                            padding: "8px 16px", borderRadius: "30px", marginBottom: "20px"
                                        }}>
                                            <span style={{fontSize: "20px"}}>🛡️</span>
                                            <span style={{color: "#ff4d4d", fontWeight: "bold"}}>SCAM CAUGHT!</span>
                                        </div>

                                        <div style={{
                                            background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "15px",
                                            marginBottom: "20px", width: "100%", border: "1px solid rgba(255,255,255,0.1)"
                                        }}>
                                            <div style={{fontSize: "12px", color: "#888", marginBottom: "5px"}}>The Message</div>
                                            <div style={{fontSize: "16px", fontWeight: "bold", color: "white"}}>"{wsEducation.text}"</div>
                                        </div>

                                        <div style={{
                                            background: "rgba(255, 215, 0, 0.1)", border: "1px solid rgba(255, 215, 0, 0.3)",
                                            borderRadius: "12px", padding: "15px", width: "100%"
                                        }}>
                                            <div style={{display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginBottom: "8px"}}>
                                                <span>💡</span>
                                                <span style={{color: "#FFD700", fontWeight: "bold", fontSize: "14px"}}>Why is this a scam?</span>
                                            </div>
                                            <p style={{color: "#ddd", fontSize: "14px", lineHeight: "1.5", margin: 0}}>
                                                {wsEducation.message}
                                            </p>
                                        </div>

                                        <div style={{marginTop: "20px", width: "100%", height: "4px", background: "#333", borderRadius: "2px", overflow: "hidden"}}>
                                            <div style={{width: "100%", height: "100%", background: "#FFD700", animation: "shrinkWidth 3s linear forwards"}}></div>
                                        </div>
                                        <p style={{color: "#666", fontSize: "11px", marginTop: "8px"}}>Game resuming...</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <style>{`
                @keyframes popIn {
                    from { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                @keyframes floatUp {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    20% { transform: translate(-50%, -80%) scale(1.2); opacity: 1; }
                    100% { transform: translate(-50%, -150%) scale(1); opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes shrinkWidth {
                    from { transform: scaleX(1); transform-origin: left; }
                    to { transform: scaleX(0); transform-origin: left; }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .shake-anim {
                    animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}</style>

            {/* SPIN WHEEL (SVG IMPLEMENTATION) */}
                <div style={{ padding: "25px", backgroundColor: "white", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                        <h3 style={{ margin: 0 }}>🎡 Spin the Wheel</h3>
                        <div style={{ background: "#f5f5f5", padding: "6px 15px", borderRadius: "20px", fontSize: "14px", fontWeight: 600 }}>
                            {spinsLeft} spins left
                        </div>
                    </div>

                    <div style={{ position: "relative", width: "300px", height: "300px", margin: "0 auto" }}>
                        
                        {/* 1. Pointer */}
                        <div style={{ position: "absolute", top: "-5px", left: "50%", transform: "translateX(-50%)", zIndex: 20, filter: "drop-shadow(0 3px 2px rgba(0,0,0,0.3))" }}>
                            <div style={{ width: 0, height: 0, borderLeft: "20px solid transparent", borderRight: "20px solid transparent", borderTop: "40px solid #333" }}></div>
                        </div>

                        {/* 2. Wheel Container */}
                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: "8px solid #333", boxSizing: "border-box", boxShadow: "0 10px 20px rgba(0,0,0,0.15)", position: "relative", overflow: "hidden", backgroundColor: "#333" }}>
                            <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 4s cubic-bezier(0.2, 0, 0.2, 1)" : "none" }}>
                                {prizes_wheel.map((prize, i) => {
                                    const sliceAngle = 360 / prizes_wheel.length;
                                    const rotate = i * sliceAngle;
                                    return (
                                        <g key={prize.id} transform={`rotate(${rotate} 50 50)`}>
                                            <path d="M 50 50 L 50 0 A 50 50 0 0 1 85.35 14.64 Z" fill={prize.color} stroke="#333" strokeWidth="0.5" transform={`rotate(${-sliceAngle/2} 50 50)`} />
                                            <text x="50" y="15" fill={prize.text} fontSize="4" fontWeight="bold" textAnchor="middle" transform="rotate(0 50 50)" style={{ fontFamily: "Arial, sans-serif" }}>
                                                {prize.label}
                                            </text>
                                            <circle cx="50" cy="22" r="1.5" fill={prize.text} opacity="0.3" />
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>

                        {/* 3. Center Button */}
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "70px", height: "70px", borderRadius: "50%", background: "white", border: "5px solid #e31837", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(0,0,0,0.2)", zIndex: 10 }}>
                            <button 
                                onClick={spinWheel} 
                                disabled={spinning || spinsLeft <= 0} 
                                data-help-id="rewards-spin-button"
                                style={{ background: "none", border: "none", fontWeight: "900", color: "#e31837", fontSize: "16px", cursor: (spinning || spinsLeft <= 0) ? "not-allowed" : "pointer" }}
                            >
                                {spinning ? "..." : "SPIN"}
                            </button>
                        </div>
                    </div>

                    {/* --- ADMIN RESET BUTTON --- */}
                    <div style={{ marginTop: "20px", textAlign: "center" }}>
                        <button onClick={() => { setSpinsLeft(3); localStorage.setItem("spinsLeft", "3"); showNotification("Spins reset to 3!", "info"); }} style={{ background: "none", border: "none", color: "#999", fontSize: "12px", textDecoration: "underline", cursor: "pointer" }}>
                            Admin Reset
                        </button>
                    </div>
                </div>
            </div>
            {/* DAILY TASKS SECTION */}
                <div style={{ padding: "25px", backgroundColor: "white", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                        <div style={{ fontSize: "24px" }}>📝</div>
                        <h3 style={{ margin: 0 }}>Daily Tasks</h3>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {/* Chat Task */}
                        <TaskItem 
                            title="Ask AI Chatbot 3 messages" 
                            progress={dailyTasks.chatCount || 0} 
                            target={3} 
                            reward={10}
                            isClaimed={dailyTasks.claimed?.chat}
                            onClaim={() => handleTaskClaim('chat', 10)}
                            isLoading={claimingTask === 'chat'}
                        />

                        {/* Transfer Task */}
                        <TaskItem 
                            title="Make a PayNow transfer" 
                            progress={dailyTasks.transferCount || 0} 
                            target={1} 
                            reward={20}
                            isClaimed={dailyTasks.claimed?.transfer}
                            onClaim={() => handleTaskClaim('transfer', 20)}
                            isLoading={claimingTask === 'transfer'}
                        />

                        {/* Referral Task */}
                        <TaskItem 
                            title="Make a successful referral" 
                            progress={dailyTasks.referralCount || 0} 
                            target={1} 
                            reward={50}
                            isClaimed={dailyTasks.claimed?.referral}
                            onClaim={() => handleTaskClaim('referral', 50)}
                            isLoading={claimingTask === 'referral'}
                        />
                    </div>
                </div>
            {/* REFERRAL LIST MODAL */}
            {showReferralList && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }} onClick={() => setShowReferralList(false)}>
                    <div style={{ backgroundColor: "white", borderRadius: "16px", maxWidth: "500px", width: "100%", maxHeight: "80vh", overflow: "auto", padding: "24px" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                            <h2 style={{ margin: 0 }}>👥 Your Referrals</h2>
                            <button onClick={() => setShowReferralList(false)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}>×</button>
                        </div>
                        {referredUsers.length === 0 ? (
                            <p style={{ textAlign: "center", color: "#666", padding: "40px 20px" }}>No referrals yet. Share your code to start earning!</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {referredUsers.map((user, idx) => (
                                    <div key={idx} style={{ padding: "15px", background: "#f8f9fa", borderRadius: "12px", display: "flex", alignItems: "center", gap: "15px" }}>
                                        <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#e31837", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "bold" }}>
                                            {user.referredUserName.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: "600", fontSize: "16px" }}>{user.referredUserName}</div>
                                            <div style={{ fontSize: "12px", color: "#666" }}>{new Date(user.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#28a745" }}>+100 💰</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PRIZE REDEMPTION MODAL */}
            {showPrizeModal && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }} onClick={() => setShowPrizeModal(false)}>
                    <div data-help-id="rewards-prize-modal" style={{ backgroundColor: "white", borderRadius: "16px", maxWidth: "500px", width: "100%", maxHeight: "80vh", overflow: "auto", padding: "24px" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                            <h2 style={{ margin: 0 }}>🎁 Redeem Prizes</h2>
                            <button
                                onClick={() => setShowPrizeModal(false)}
                                data-help-id="rewards-close-prizes"
                                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ marginBottom: "20px", textAlign: "center", background: "#f8f9fa", padding: "15px", borderRadius: "10px" }}>
                            <p style={{ fontSize: "14px", color: "#666", margin: "0 0 5px 0" }}>Your Balance</p>
                            <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>💰 {coins} coins</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            {prizes.map((prize) => (
                                <div key={prize.id} style={{ border: coins >= prize.costInCoins ? "2px solid #e31837" : "1px solid #e0e0e0", borderRadius: "12px", padding: "15px", display: "flex", alignItems: "center", gap: "15px", background: coins < prize.costInCoins ? "#f9f9f9" : "white" }}>
                                    <div style={{ fontSize: "40px" }}>{prize.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>{prize.name}</h3>
                                        <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>{prize.description}</p>
                                        <p style={{ margin: 0, fontWeight: "bold", color: "#e31837" }}>💰 {prize.costInCoins} coins</p>
                                    </div>
                                    <button onClick={() => handleRedeemClick(prize)} disabled={coins < prize.costInCoins} data-help-id="rewards-redeem-button" style={{ background: coins < prize.costInCoins ? "#ccc" : "#e31837", color: "white", border: "none", borderRadius: "20px", padding: "10px 20px", cursor: coins < prize.costInCoins ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "14px" }}>
                                        Redeem
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION DIALOG */}
            {showConfirmDialog && selectedPrize && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 101, padding: "16px" }}>
                    <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px", maxWidth: "400px", textAlign: "center" }}>
                        <div style={{ fontSize: "60px", marginBottom: "20px" }}>{selectedPrize.icon}</div>
                        <h3 style={{ marginBottom: "10px" }}>Confirm Redemption</h3>
                        <p style={{ color: "#666", marginBottom: "20px" }}>
                            Redeem <strong>{selectedPrize.name}</strong> for <strong style={{ color: "#e31837" }}>{selectedPrize.costInCoins} coins</strong>?
                        </p>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={() => { setShowConfirmDialog(false); setSelectedPrize(null); }} style={{ flex: 1, padding: "12px", borderRadius: "25px", border: "1px solid #e0e0e0", background: "white", cursor: "pointer", fontWeight: "600" }}>
                                Cancel
                            </button>
                            <button onClick={confirmRedeem} disabled={redeeming} data-help-id="rewards-confirm-redemption" style={{ flex: 1, padding: "12px", borderRadius: "25px", border: "none", background: redeeming ? "#ccc" : "#e31837", color: "white", cursor: redeeming ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                                {redeeming ? "Processing..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

{/* LEADERBOARD MODAL */}
            {showLeaderboard && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px", backdropFilter: "blur(5px)" }} onClick={() => setShowLeaderboard(false)}>
                    <div style={{ backgroundColor: "#1a1a1a", borderRadius: "16px", maxWidth: "400px", width: "100%", maxHeight: "80vh", overflow: "hidden", border: "1px solid #333", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
                        
                        <div style={{ padding: "20px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#222" }}>
                            <h2 style={{ margin: 0, color: "#FFD700", display: "flex", alignItems: "center", gap: "10px" }}>
                                🏆 Top Scam Busters
                            </h2>
                            <button onClick={() => setShowLeaderboard(false)} style={{ background: "none", border: "none", fontSize: "24px", color: "#888", cursor: "pointer" }}>×</button>
                        </div>

                        <div style={{ padding: "10px", overflowY: "auto" }}>
                            {loadingLeaderboard ? (
                                <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>Loading scores...</div>
                            ) : leaderboardData.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>No scores yet.<br/>Be the first to play!</div>
                            ) : (
                                leaderboardData.map((user, idx) => (
                                    <div key={user.id} style={{ 
                                        display: "flex", alignItems: "center", gap: "15px", 
                                        padding: "15px", marginBottom: "8px", 
                                        backgroundColor: idx === 0 ? "rgba(255, 215, 0, 0.1)" : "rgba(255,255,255,0.05)", 
                                        borderRadius: "12px",
                                        border: idx === 0 ? "1px solid rgba(255, 215, 0, 0.3)" : "1px solid transparent"
                                    }}>
                                        <div style={{ 
                                            width: "30px", height: "30px", borderRadius: "50%", 
                                            background: idx === 0 ? "#FFD700" : idx === 1 ? "#C0C0C0" : idx === 2 ? "#CD7F32" : "#444", 
                                            color: idx > 2 ? "#fff" : "#000",
                                            display: "flex", alignItems: "center", justifyContent: "center", 
                                            fontWeight: "bold", fontSize: "14px"
                                        }}>
                                            {idx + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: "bold", color: "white" }}>{user.name}</div>
                                        </div>
                                        <div style={{ color: "#FFD700", fontWeight: "bold", fontSize: "18px" }}>
                                            {user.score}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <BottomNav activeTab="rewards" />

            <style>{`
                @keyframes slideDown {
                    from {
                        transform: translate(-50%, -100px);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
    
};
const TaskItem = ({ title, progress, target, reward, isClaimed, onClaim, isLoading }) => {
    const isCompleted = progress >= target;
    
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px", border: "1px solid #eee", borderRadius: "12px", background: isClaimed ? "#f8f9fa" : "white" }}>
            <div>
                <div style={{ fontWeight: "600", marginBottom: "4px", color: isClaimed ? "#888" : "#333" }}>{title}</div>
                <div style={{ fontSize: "12px", color: isClaimed ? "#999" : "#666" }}>Reward: <span style={{ color: "#e31837", fontWeight: "bold" }}>{reward} coins</span></div>
            </div>
            
            {isClaimed ? (
                <button disabled style={{ background: "#e0e0e0", color: "#888", border: "none", padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", cursor: "default" }}>Claimed</button>
            ) : isCompleted ? (
                <button onClick={onClaim} disabled={isLoading} style={{ background: isLoading ? "#ccc" : "#28a745", color: "white", border: "none", padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", cursor: isLoading ? "not-allowed" : "pointer", boxShadow: "0 2px 5px rgba(40, 167, 69, 0.3)" }}>
                    {isLoading ? "..." : "Claim"}
                </button>
            ) : (
                <div style={{ background: "#f5f5f5", color: "#888", padding: "8px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>{progress} / {target}</div>
            )}
        </div>
    );
};

export default Rewards;
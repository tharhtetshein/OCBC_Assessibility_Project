import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import LandingPage from "./dashboard/LandingPage";
import Login from "./auth/Login";
import Dashboard from "./dashboard/Dashboard";
import MorePage from "./navigation/MorePage";
import SharedAccess from "./shared-access/SharedAccess";
import Notification from "./notifications/Notification";
import PayNow from "./paynow/PayNow";
import Rewards from "./rewards/Rewards";
import CustomiseShortcut from "./shortcuts/CustomiseShortcut";
import ChatbotPage from "./chatbot/ChatbotPage";
import EyeTrackerPython from "./eye-tracker/EyeTrackerPython";
import HandTrackerPython from "./hand-tracker/HandTrackerPython";
import ATMRemoteAccess from "./remote-atm-screen/ATMRemoteAccess";
import EmergencyWithdrawal from "./emergency-withdrawal/EmergencyWithdrawal";
import EmergencyQRWithdrawalWrapper from "./emergency-withdrawal/EmergencyQRWithdrawalWrapper";
import VoiceHelpButton from "./help/VoiceHelpButton";
import HelpOverlay from "./help/HelpOverlay";
import FloatingActionButton from "./FloatingActionButton/FloatingActionButton";
import onboardingSteps, { onboardingTitle } from "./help/onboardingGuidance";
import { auth, getUserData, updateUserData } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import "./App.css";

const ProtectedChatbot = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" state={{ redirectTo: "/chatbot" }} replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Onboarding states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [remoteOnboardingSeen, setRemoteOnboardingSeen] = useState(null);

  // --- TRACKING STATES (UPDATED FOR PERSISTENCE) ---
  // 1. Initialize from localStorage so it remembers "ON" after refresh
  const [isEyeTrackingEnabled, setIsEyeTrackingEnabled] = useState(() => {
    return localStorage.getItem("isEyeTrackingEnabled") === "true";
  });

  const [isHandTrackingEnabled, setIsHandTrackingEnabled] = useState(() => {
    return localStorage.getItem("isHandTrackingEnabled") === "true";
  });

  // Help Overlay state
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const [helpSteps, setHelpSteps] = useState([]);
  const [helpTitle, setHelpTitle] = useState("");
  const [helpInitialStep, setHelpInitialStep] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);

        const guestShortcuts = localStorage.getItem("guestShortcuts");
        if (guestShortcuts) {
          try {
            const { updateUserShortcuts } = await import("./services/firebase");
            const shortcuts = JSON.parse(guestShortcuts);
            await updateUserShortcuts(user.uid, shortcuts);
            localStorage.setItem("shortcuts", guestShortcuts);
            localStorage.removeItem("guestShortcuts");
            console.log("Guest shortcuts synced to Firebase");
          } catch (error) {
            console.error("Error syncing guest shortcuts:", error);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Onboarding Logic ---
  const getOnboardingStorageKey = () => {
    if (user?.uid) {
      return `ocbc_onboarding_seen_${user.uid}`;
    }
    return "ocbc_onboarding_seen_guest";
  };

  const handleCloseOnboarding = () => {
    const key = getOnboardingStorageKey();
    localStorage.setItem(key, "true");
    if (user?.uid) {
      updateUserData(user.uid, { "settings.onboardingSeen": true })
        .then(() => setRemoteOnboardingSeen(true))
        .catch((error) =>
          console.error("Failed to update onboarding flag:", error),
        );
    } else {
      setRemoteOnboardingSeen(true);
    }
    setShowOnboarding(false);
  };

  useEffect(() => {
    if (!user) {
      setShowOnboarding(false);
      setRemoteOnboardingSeen(null);
    }
  }, [user]);

  useEffect(() => {
    let isActive = true;

    const loadOnboardingState = async () => {
      if (!user?.uid) return;

      try {
        const result = await getUserData(user.uid);
        if (!isActive) return;
        setRemoteOnboardingSeen(
          Boolean(result.success && result.data?.settings?.onboardingSeen),
        );
      } catch (error) {
        if (!isActive) return;
        console.error("Failed to fetch onboarding state:", error);
        setRemoteOnboardingSeen(false);
      }
    };

    loadOnboardingState();

    return () => {
      isActive = false;
    };
  }, [user]);

  // --- TRACKER TOGGLES (UPDATED TO SAVE STATE) ---
  const handleToggleEyeTracking = () => {
    const newState = !isEyeTrackingEnabled;
    setIsEyeTrackingEnabled(newState);
    localStorage.setItem("isEyeTrackingEnabled", newState); // Save to memory

    // If turning ON, ensure Hand Tracking is OFF (Mutual Exclusivity)
    if (newState) {
      setIsHandTrackingEnabled(false);
      localStorage.setItem("isHandTrackingEnabled", "false");
    }
  };

  const handleToggleHandTracking = () => {
    const newState = !isHandTrackingEnabled;
    setIsHandTrackingEnabled(newState);
    localStorage.setItem("isHandTrackingEnabled", newState); // Save to memory

    // If turning ON, ensure Eye Tracking is OFF
    if (newState) {
      setIsEyeTrackingEnabled(false);
      localStorage.setItem("isEyeTrackingEnabled", "false");
    }
  };

  // Trigger VoiceHelpButton from FAB
  const handleVoiceHelpClick = () => {
    const voiceHelpBtn = document.querySelector(".voice-help-button");
    if (voiceHelpBtn) {
      voiceHelpBtn.click();
    }
  };

  // --- Help Logic ---
  const handleHelpRequest = (intent, steps, title) => {
    if (showOnboarding) {
      handleCloseOnboarding();
    }
    setHelpSteps(steps);
    setHelpTitle(title);
    setShowHelpOverlay(true);
  };

  const handleCloseHelp = () => {
    setShowHelpOverlay(false);
    setHelpSteps([]);
    setHelpTitle("");
    localStorage.removeItem("helpOverlayState");
  };

  useEffect(() => {
    const savedState = localStorage.getItem("helpOverlayState");
    if (savedState) {
      try {
        const { title, steps, currentStep } = JSON.parse(savedState);
        setTimeout(() => {
          setHelpTitle(title);
          setHelpSteps(steps);
          setHelpInitialStep(currentStep || 0);
          setShowHelpOverlay(true);
          localStorage.removeItem("helpOverlayState");
        }, 800);
      } catch (e) {
        console.error("Failed to restore help state:", e);
        localStorage.removeItem("helpOverlayState");
      }
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const AppContent = () => {
    const location = useLocation();
    const isDashboard = location.pathname === "/dashboard";

    // Onboarding Trigger Logic
    useEffect(() => {
      if (!user || !isDashboard) {
        if (showOnboarding) {
          setShowOnboarding(false);
        }
        return;
      }

      if (showOnboarding || showHelpOverlay) return;
      if (user && remoteOnboardingSeen === null) return;

      const onboardingKey = `ocbc_onboarding_seen_${user.uid}`;
      const guestKey = "ocbc_onboarding_seen_guest";
      const hasSeenOnboarding =
        localStorage.getItem(onboardingKey) === "true" ||
        localStorage.getItem(guestKey) === "true" ||
        remoteOnboardingSeen === true;
      if (hasSeenOnboarding) return;

      const timer = setTimeout(() => {
        localStorage.setItem(onboardingKey, "true");
        if (user?.uid) {
          updateUserData(user.uid, { "settings.onboardingSeen": true })
            .then(() => setRemoteOnboardingSeen(true))
            .catch((error) =>
              console.error("Failed to update onboarding flag:", error),
            );
        } else {
          setRemoteOnboardingSeen(true);
        }
        setShowOnboarding(true);
      }, 700);

      return () => clearTimeout(timer);
    }, [
      user,
      isDashboard,
      showOnboarding,
      showHelpOverlay,
      remoteOnboardingSeen,
    ]);

    return (
      <div className="App">
        {/* Eye Tracker */}
        <EyeTrackerPython
          onFaceDetected={(data) => console.log("Face detected")}
          onFaceLost={() => console.log("Face lost")}
          autoStart={isEyeTrackingEnabled}
          // controlsContainerId={isDashboard ? "dashboard-eye-tracker-slot" : undefined}
          onStopTracking={() => {
            setIsEyeTrackingEnabled(false);
            localStorage.setItem("isEyeTrackingEnabled", "false"); // Update memory on stop
          }}
        />

        {/* Hand Tracker */}
        <HandTrackerPython
          onHandDetected={(data) => console.log("Hand detected")}
          onHandLost={() => console.log("Hand lost")}
          autoStart={isHandTrackingEnabled}
          onStopTracking={() => {
            setIsHandTrackingEnabled(false);
            localStorage.setItem("isHandTrackingEnabled", "false"); // Update memory on stop
          }}
        />

        <Routes>
          <Route path="/" element={<LandingPage user={user} />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              user ? (
                <Dashboard
                  user={user}
                  isHelpOverlayActive={showHelpOverlay || showOnboarding}
                  isHandTrackingEnabled={isHandTrackingEnabled}
                  onToggleHandTracking={handleToggleHandTracking}
                  isEyeTrackingEnabled={isEyeTrackingEnabled}
                  onToggleEyeTracking={handleToggleEyeTracking}
                  onVoiceHelpClick={handleVoiceHelpClick}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/morepage"
            element={user ? <MorePage /> : <Navigate to="/" />}
          />
          <Route
            path="/paynow"
            element={user ? <PayNow /> : <Navigate to="/" />}
          />
          <Route path="/shared-access" element={<SharedAccess />} />
          <Route path="/notification" element={<Notification />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/customise-shortcut" element={<CustomiseShortcut />} />
          <Route
            path="/chatbot"
            element={
              <ProtectedChatbot user={user}>
                <ChatbotPage
                  isHelpOverlayActive={showHelpOverlay || showOnboarding}
                />
              </ProtectedChatbot>
            }
          />
          <Route path="/atm-remote" element={<ATMRemoteAccess />} />
          <Route
            path="/emergency-withdrawal"
            element={<EmergencyWithdrawal />}
          />
          <Route
            path="/emergency-qr-withdrawal"
            element={<EmergencyQRWithdrawalWrapper />}
          />
        </Routes>

        <FloatingActionButton
          user={user}
          onEnableEyeTracking={handleToggleEyeTracking}
          isEyeTrackingEnabled={isEyeTrackingEnabled}
          onEnableHandTracking={handleToggleHandTracking}
          isHandTrackingEnabled={isHandTrackingEnabled}
          onVoiceHelpClick={handleVoiceHelpClick}
          hideButton={user && location.pathname === '/chatbot'} // Use reactive location object
        />

        <VoiceHelpButton
          onHelpRequest={handleHelpRequest}
          hideButton={isDashboard}
        />

        {showHelpOverlay && helpSteps.length > 0 && (
          <HelpOverlay
            steps={helpSteps}
            title={helpTitle}
            onClose={handleCloseHelp}
            initialStep={helpInitialStep}
          />
        )}

        {showOnboarding && (
          <HelpOverlay
            steps={onboardingSteps}
            title={onboardingTitle}
            onClose={handleCloseOnboarding}
            initialStep={0}
          />
        )}
      </div>
    );
  };

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
import React, { useState } from "react";
import { auth } from "../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Popup state
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");
 
  const location = useLocation();
  const navigate = useNavigate();
  const initialRedirect = location.state?.redirectTo || "/dashboard";
  const redirectState = location.state?.redirectState;
  const [redirectTo] = useState(initialRedirect);

  const showNotification = (message, type = "success") => {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (loading) return;
    setLoading(true);
    
    try {
      if (isSignup) {
        const { registerUser } = await import("../services/firebase");
        const result = await registerUser(email, password, {
          name,
          phoneNumber,
          shortcuts: [],
          balance: 10000
        }, referralCode || null);
        
        if (result.success) {
          showNotification("✅ Account created successfully!", "success");
          setTimeout(() => navigate(redirectTo), 1500);
        } else {
          showNotification(`❌ ${result.error}`, "error");
          setLoading(false);
          return;
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification("✅ Login successful!", "success");
        setTimeout(() => navigate(redirectTo), 1000);
      }
    } catch (error) {
      showNotification(`❌ ${error.message}`, "error");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* POPUP NOTIFICATION */}
      {showPopup && (
        <div
          className={`auth-toast ${popupType}`}
          role={popupType === "error" ? "alert" : "status"}
          aria-live={popupType === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {popupMessage}
        </div>
      )}

      <div className="header auth-header">
        <div className="header-left">
          <img
            src="/images/OCBC_logo.png"
            alt="OCBC Logo"
            className="logo"
          />
        </div>
        <div className="header-right">
          <div className="ai-chatbot-button">
            <span className="material-icons">chat</span>
            <span>Our new AI Chatbot</span>
          </div>
          <span className="material-icons">notifications</span>
        </div>
      </div>

      <main className="main-content auth-main" role="main">
        <div className="auth-card">
          <div className="auth-heading">
            <p className="auth-eyebrow">OCBC Digital Banking</p>
            <h2 className="auth-title">
              {isSignup ? "Create your OCBC account" : "Welcome back"}
            </h2>
            <p className="auth-subtitle">
              {isSignup
                ? "Set up your profile to personalize your banking experience."
                : "Log in securely to manage your accounts and rewards."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" aria-busy={loading}>
            {isSignup && (
              <>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phoneNumber">Phone Number</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="referralCode">Referral Code (Optional)</label>
                  <input
                    type="text"
                    id="referralCode"
                    name="referralCode"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="OCBC123ABC"
                    maxLength="10"
                    style={{ textTransform: "uppercase" }}
                    aria-describedby="referral-hint"
                    disabled={loading}
                  />
                  <small
                    id="referral-hint"
                    style={{
                      color: "#666",
                      fontSize: "12px",
                      display: "block",
                      marginTop: "5px",
                    }}
                  >
                    Bonus: Have a referral code? You and your friend get 100
                    bonus coins!
                  </small>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="login-button auth-submit"
              disabled={loading}
              style={{
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Processing..." : isSignup ? "Sign Up" : "Log In"}
            </button>

            <button
              type="button"
              className="toggle-button auth-toggle"
              onClick={() => setIsSignup(!isSignup)}
              disabled={loading}
              style={{
                marginTop: "10px",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {isSignup ? "Already have an account? Log in" : "New user? Sign up"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Login;

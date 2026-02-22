import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ShortcutsLayoutManager from "../shortcuts/ShortcutsLayoutManager";
import {
  defaultShortcuts,
  getShortcutDestination,
  MAX_SHORTCUTS
} from "../shortcuts/shortcutsConfig";
function LandingPage({ user }) {
  const navigate = useNavigate(); // Use navigate to change routes

  const [shortcuts, setShortcuts] = useState(defaultShortcuts);

  // Load guest shortcuts from localStorage (before login)
  useEffect(() => {
    const guestShortcuts = localStorage.getItem('guestShortcuts');
    if (guestShortcuts) {
      try {
        setShortcuts(JSON.parse(guestShortcuts));
      } catch (error) {
        console.error('Error loading guest shortcuts:', error);
      }
    }
  }, []);

  const handleLoginClick = () => {
    // Navigate to the login page
    navigate("/login");
  };

  return (
    <div
      className="landing-page"
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div
        className="header"
        style={{
          backgroundColor: "#ffffff",
          padding: "15px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div className="header-left" style={{ flex: 1 }}></div>
        <div
          className="header-center"
          style={{ flex: 1, display: "flex", justifyContent: "center" }}
        >
          <button
            className="ai-chatbot-button"
            onClick={() => navigate("/chatbot")}
            style={{
              backgroundColor: "#e31837",
              border: "none",
              borderRadius: "50px",
              padding: "8px 25px 8px 8px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(227, 24, 55, 0.3)",
              fontSize: "16px",
              fontWeight: "500",
              transition: "all 0.3s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#c41530";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(227, 24, 55, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#e31837";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(227, 24, 55, 0.3)";
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "50%",
                width: "45px",
                height: "45px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              <span style={{ fontSize: "24px" }}>🤖</span>
            </div>
            <span style={{ color: "white", whiteSpace: "nowrap" }}>
              Our new AI Chatbot
            </span>
          </button>
        </div>
        <div
          className="header-right"
          style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}
        >
          <div
            className="notification-icon"
            style={{
              cursor: "pointer",
              backgroundColor: "white",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="https://png.pngtree.com/png-vector/20250708/ourmid/pngtree-red-3d-notification-bell-icon-for-youtube-or-app-alerts-png-image_16616221.webp"
              alt="Notifications"
              style={{ width: "50px", height: "50px", objectFit: "contain" }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" style={{ padding: "20px" }}>
        {/* Promotional Banner */}
        <div
          className="promo-banner"
          style={{
            maxWidth: "600px",
            margin: "0 auto 30px",
            backgroundColor: "#e8f4ff",
            borderRadius: "15px",
            padding: "30px",
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              color: "#e31837",
              fontSize: "24px",
              marginBottom: "10px",
              fontWeight: "bold",
            }}
          >
            Adventure starts with OCBC
          </h1>
          <p style={{ fontSize: "16px", color: "#333", marginBottom: "20px" }}>
            Bring home Disney's Zootopia 2 exclusives
          </p>
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "20px",
              marginBottom: "15px",
            }}
          >
            <img
              src="https://cdn.abcotvs.com/dip/images/16474772_051925-otrc-zootopia2poster-img.jpg"
              alt="Zootopia 2"
              style={{
                maxWidth: "100%",
                height: "auto",
                borderRadius: "8px",
              }}
            />
          </div>
          <p style={{ fontSize: "14px", color: "#666" }}>
            ONLY IN CINEMAS 27 NOV
          </p>
        </div>

        {/* Info Banner - Guest Customization */}
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto 15px",
            padding: "12px 20px",
            backgroundColor: "#fff3cd",
            borderRadius: "10px",
            border: "1px solid #ffc107",
            fontSize: "14px",
            color: "#856404",
            textAlign: "center",
            fontWeight: "500"
          }}
        >
          💡 Customize now! Your changes will be saved when you log in
        </div>

        {/* Customise Shortcut Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            maxWidth: "600px",
            margin: "0 auto 15px",
          }}
        >
          <button
            className="customise-button"
            onClick={() => {
              console.log("Customise button clicked!");
              try {
                navigate('/customise-shortcut');
              } catch (error) {
                console.error("Navigate error:", error);
                window.location.href = '/customise-shortcut';
              }
            }}
            style={{
              background: "#e31837",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              color: "white",
              padding: "10px 16px",
              borderRadius: "20px",
              transition: "all 0.2s",
              boxShadow: "0 2px 6px rgba(227, 24, 55, 0.3)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#c41530";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#e31837";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span style={{ fontSize: "18px" }}>⚙️</span>
            <span>Customise Shortcut</span>
          </button>
        </div>

        {/* Shortcuts Grid */}
       <ShortcutsLayoutManager 
          shortcuts={shortcuts}
          onShortcutClick={(shortcut) => {
            const destination = getShortcutDestination(shortcut);
            
            // Check if shortcut is disabled
            if (destination.state?.disabled) {
              console.log(`${shortcut.label} clicked - feature coming soon`);
              return;
            }
            
            // If user is already logged in, go directly to the feature
            if (user) {
              navigate(
                destination.path,
                destination.state ? { state: destination.state } : undefined
              );
            } else if (destination.requiresLogin) {
              // Not logged in and feature requires login - redirect to login first
              navigate("/login", {
                state: {
                  redirectTo: destination.path,
                  redirectState: destination.state
                }
              });
            } else {
              // Feature doesn't require login
              navigate(
                destination.path,
                destination.state ? { state: destination.state } : undefined
              );
            }
          }}
          onAddClick={() => navigate('/customise-shortcut')}
          showLayoutSelector={false}
          defaultLayout="swipeable"
        />

        {/* Log in to OCBC Singapore Button */}
        <button
          onClick={handleLoginClick}
          className="login-button"
          style={{
            display: "block",
            maxWidth: "600px",
            width: "calc(100% - 40px)",
            margin: "0 auto 20px",
            padding: "15px",
            backgroundColor: "#2c3e50",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(44, 62, 80, 0.3)",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#1a252f";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 6px 16px rgba(44, 62, 80, 0.4)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#2c3e50";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 12px rgba(44, 62, 80, 0.3)";
          }}
        >
          Log in to OCBC Singapore
        </button>

        {/* Security Advisory */}
        <div
          className="security-notice"
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "15px 20px",
            backgroundColor: "#fff3cd",
            borderRadius: "10px",
            border: "1px solid #ffc107",
            fontSize: "13px",
            color: "#856404",
            lineHeight: "1.6",
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Security advisory:</strong> Be aware of e-commerce scams. Do
            not click links or scan QR codes to make/collect payments - if an
            offer seems too good to be true, it likely is.{" "}
            <button
              style={{
                background: "none",
                border: "none",
                color: "#0066cc",
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
                font: "inherit",
              }}
            >
              Learn more
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;

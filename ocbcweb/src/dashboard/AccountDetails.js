import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import BottomNav from "../navigation/BottomNav";

const AccountDetails = ({ onBack }) => {
  const [selectedMonth, setSelectedMonth] = useState("Nov 2025");
  const { userData } = useAuth();

  const months = ["Nov 2025", "Oct 2025", "Sep 2025", "Aug 2025"];
  
  // Get locked amount from user data
  const lockedAmount = userData?.lockedAmount || 0;
  const totalBalance = (userData?.balance || 0) + lockedAmount;

  return (
    <div
      className="account-details"
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
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            padding: "5px",
          }}
        >
          ←
        </button>
        <button
          style={{
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            padding: "5px",
          }}
        >
          ⚙️
        </button>
      </div>

      {/* Account Info */}
      <div style={{ padding: "20px" }}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#333",
            marginBottom: "5px",
          }}
        >
          OCBC FRANK Account
        </h2>
        <p style={{ fontSize: "16px", color: "#666", marginBottom: "25px" }}>
          671-000000-001
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginBottom: "30px",
            gap: "15px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              cursor: "pointer",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: "40px",
                marginBottom: "8px",
              }}
            >
              💸
            </div>
            <div style={{ fontSize: "13px", color: "#333" }}>
              Local Transfer
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              cursor: "pointer",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: "40px",
                marginBottom: "8px",
              }}
            >
              ⚖️
            </div>
            <div style={{ fontSize: "13px", color: "#333" }}>
              Transaction limit
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              cursor: "pointer",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: "40px",
                marginBottom: "8px",
              }}
            >
              🔒
            </div>
            <div style={{ fontSize: "13px", color: "#333" }}>Money Lock</div>
          </div>
        </div>

        {/* Balance Section */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "15px",
            padding: "20px",
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                fontSize: "14px",
                color: "#999",
                marginBottom: "5px",
              }}
            >
              Total Balance
            </div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {totalBalance.toFixed(2)} <span style={{ fontSize: "20px" }}>SGD</span>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                fontSize: "14px",
                color: "#999",
                marginBottom: "5px",
              }}
            >
              Available Balance
            </div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {(userData?.balance || 0).toFixed(2)} <span style={{ fontSize: "20px" }}>SGD</span>
            </div>
          </div>

          {/* Foreign Currencies Section */}
          {userData?.foreignCurrencies && Object.keys(userData.foreignCurrencies).length > 0 && (
            <div
              style={{
                backgroundColor: "#f0f7ff",
                borderRadius: "10px",
                padding: "15px",
                marginBottom: "20px",
                border: "1px solid #d0e3ff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <span style={{ fontSize: "20px" }}>💱</span>
                <span style={{ fontWeight: "600", color: "#333" }}>
                  Foreign Currency Holdings
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {Object.entries(userData.foreignCurrencies).map(([currency, amount]) => (
                  <div
                    key={currency}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 15px",
                      backgroundColor: "white",
                      borderRadius: "8px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  >
                    <span style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>
                      {Number(amount).toFixed(2)}
                    </span>
                    <span style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>
                      {currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investment Portfolio Section */}
          {userData?.portfolio && userData.portfolio.length > 0 && (
            <div
              style={{
                backgroundColor: "#f0fff4",
                borderRadius: "10px",
                padding: "15px",
                marginBottom: "20px",
                border: "1px solid #c6f6d5",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <span style={{ fontSize: "20px" }}>📈</span>
                <span style={{ fontWeight: "600", color: "#333" }}>
                  Investment Portfolio
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {userData.portfolio.map((holding, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 15px",
                      backgroundColor: "white",
                      borderRadius: "8px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "16px", fontWeight: "600", color: "#333" }}>
                        {holding.ticker}
                      </span>
                      <span style={{ fontSize: "12px", color: "#888" }}>
                        {Number(holding.shares).toFixed(4)} shares @ ${Number(holding.avgPrice).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "18px", fontWeight: "bold", color: "#22543d" }}>
                        ${Number(holding.totalValue).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Money Lock Info */}
          <div
            style={{
              backgroundColor: "#fff9e6",
              borderRadius: "10px",
              padding: "15px",
              border: "1px solid #ffe066",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <span style={{ fontSize: "20px" }}>🔒</span>
              <span style={{ fontWeight: "600", color: "#333" }}>
                Money Lock
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                marginBottom: "15px",
              }}
            >
              <span style={{ fontSize: "18px", marginTop: "2px" }}>ℹ️</span>
              <p
                style={{
                  fontSize: "13px",
                  color: "#666",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                Locked funds are protected from scams. This caters for one or
                more locked accounts.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "14px", color: "#666" }}>
                Amount Locked
              </span>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                {lockedAmount.toLocaleString()} <span style={{ fontSize: "16px" }}>SGD</span>
              </span>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
            overflowX: "auto",
            paddingBottom: "10px",
          }}
        >
          {months.map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              style={{
                padding: "10px 20px",
                borderRadius: "25px",
                border: "none",
                backgroundColor:
                  selectedMonth === month ? "#e31837" : "#f0f0f0",
                color: selectedMonth === month ? "white" : "#666",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {month}
            </button>
          ))}
        </div>

        {/* Transactions Section */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "15px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#333",
                margin: 0,
              }}
            >
              Transactions
            </h3>
            <button
              style={{
                background: "none",
                border: "none",
                color: "#0066cc",
                fontSize: "14px",
                cursor: "pointer",
                textDecoration: "underline",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              📄 View Statement
            </button>
          </div>

          <div
            style={{
              backgroundColor: "#e8f4ff",
              borderRadius: "10px",
              padding: "15px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              marginBottom: "80px",
            }}
          >
            <span style={{ fontSize: "18px", marginTop: "2px" }}>ℹ️</span>
            <p
              style={{
                fontSize: "13px",
                color: "#666",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Pending transactions made on your debit card may take up to 7 days
              to appear. You may check your available balance to ensure the
              correct amount has been deducted.
            </p>
          </div>
        </div>
      </div>
      <BottomNav activeTab="home" />
    </div>
  );
};

export default AccountDetails;

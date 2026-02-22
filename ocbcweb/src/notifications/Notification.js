import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getPendingTransactionApprovals,
  approveTransactionRequest,
  rejectTransactionRequest,
  getUserData
} from "../services/firebase";

const Notification = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await getPendingTransactionApprovals(currentUser.uid);
      if (result.success) {
        // Transform approvals to match notification structure
        const formattedNotifications = result.approvals.map(approval => ({
          id: approval.id,
          type: "action",
          title: "You have an action to authorise",
          description: `${approval.requestedBy === 'user' ? 'Shared Account User' : 'User'}: Request to PayNow $${approval.amount} to ${approval.recipientName}`,
          timestamp: approval.createdAt,
          details: {
            amount: `$${parseFloat(approval.amount).toFixed(2)}`,
            from: approval.requestedBy === 'user' ? 'Shared Account User' : 'User',
            account: approval.accountName || "OCBC Account",
            accountNumber: approval.accountNumber || "N/A",
            payNowTo: approval.recipientNumber,
            recipientName: approval.recipientName,
            note: approval.message || "No message provided",
            originalObject: approval
          },
        }));
        setNotifications(formattedNotifications);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
    setLoading(false);
  };

  const handleNotificationClick = (n) => {
    if (n.type === "action") setSelectedNotification(n);
  };

  const handleReject = async () => {
    if (!selectedNotification) return;

    const result = await rejectTransactionRequest(selectedNotification.id, "Rejected by owner");
    if (result.success) {
      setActionResult("rejected");
      loadNotifications(); // Refresh list
    } else {
      alert("Error rejecting request: " + result.error);
    }
  };

  const handleAuthorise = async () => {
    if (!selectedNotification) return;

    const result = await approveTransactionRequest(selectedNotification.id);
    if (result.success) {
      setActionResult("authorised");
      loadNotifications(); // Refresh list
    } else {
      alert("Error approving request: " + result.error);
    }
  };

  const closeDialog = () => {
    setSelectedNotification(null);
    setActionResult(null);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e0e0e0",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px",
          }}
        >
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "8px",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <span style={{ fontSize: "20px" }}>←</span>
          </button>
          <h1 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>
            Notifications
          </h1>
          <div style={{ width: "36px" }} />
        </div>
      </div>

      {/* Filter */}
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px" }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            backgroundColor: "white",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          <span>⚙</span>
          Filter
        </button>
      </div>

      {/* Notification List */}
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "0 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
            <div>No new notifications</div>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              style={{
                padding: "16px",
                backgroundColor: "white",
                borderRadius: "12px",
                border: "1px solid #e0e0e0",
                cursor: n.type === "action" ? "pointer" : "default",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                transition: "box-shadow 0.2s",
              }}
              onMouseOver={(e) => {
                if (n.type === "action") {
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
              }}
            >
              <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#e31837",
                    marginTop: "8px",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontWeight: "600",
                      fontSize: "14px",
                      marginBottom: "4px",
                      margin: 0,
                    }}
                  >
                    {n.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {n.description}
                  </p>
                  <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
                    {new Date(n.timestamp).toLocaleString()}
                  </div>
                </div>
                <span style={{ fontSize: "20px", color: "#999", flexShrink: 0 }}>
                  ›
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Dialog */}
      {selectedNotification && !actionResult && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
          onClick={closeDialog}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: "relative", padding: "24px" }}>
              <button
                onClick={closeDialog}
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "16px",
                  padding: "8px",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "20px",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f0f0f0")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                ×
              </button>

              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  textAlign: "center",
                  marginBottom: "24px",
                }}
              >
                Action:
              </h2>

              {selectedNotification?.details && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Amount */}
                  <div
                    style={{
                      backgroundColor: "#f8f9fa",
                      padding: "16px",
                      borderRadius: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <span style={{ fontSize: "18px", fontWeight: "600" }}>SGD</span>
                      <span style={{ fontSize: "32px", fontWeight: "700" }}>
                        {selectedNotification.details.amount.replace('$', '')}
                      </span>
                    </div>
                  </div>

                  {/* From */}
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                      From: {selectedNotification.details.from}
                    </div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      {selectedNotification.details.account}
                    </div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      {selectedNotification.details.accountNumber}
                    </div>
                  </div>

                  {/* PayNow */}
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                      PayNow To:
                    </div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      {selectedNotification.details.payNowTo}
                    </div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      {selectedNotification.details.recipientName}
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                      Note from {selectedNotification.details.from}:
                    </div>
                    <div style={{ fontSize: "14px" }}>
                      {selectedNotification.details.note}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: "12px", paddingTop: "16px" }}>
                    <button
                      onClick={handleReject}
                      style={{
                        flex: 1,
                        backgroundColor: "#e31837",
                        color: "white",
                        border: "none",
                        borderRadius: "24px",
                        height: "48px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "background-color 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "#c41530")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "#e31837")
                      }
                    >
                      REJECT
                    </button>
                    <button
                      onClick={handleAuthorise}
                      style={{
                        flex: 1,
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "24px",
                        height: "48px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "background-color 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "#218838")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "#28a745")
                      }
                    >
                      AUTHORISE
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Result Dialog */}
      {actionResult && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
          onClick={closeDialog}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              maxWidth: "500px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: "relative", padding: "24px" }}>
              <button
                onClick={closeDialog}
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "16px",
                  padding: "8px",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "20px",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f0f0f0")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                ×
              </button>

              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  textAlign: "center",
                  marginBottom: "24px",
                }}
              >
                Action:
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "24px",
                }}
              >
                <div
                  style={{
                    width: "96px",
                    height: "96px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      actionResult === "rejected"
                        ? "rgba(227, 24, 55, 0.1)"
                        : "rgba(40, 167, 69, 0.1)",
                    border: `4px solid ${actionResult === "rejected" ? "#e31837" : "#28a745"
                      }`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "48px",
                      color: actionResult === "rejected" ? "#e31837" : "#28a745",
                    }}
                  >
                    {actionResult === "rejected" ? "×" : "✓"}
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e0e0e0",
                    borderRadius: "12px",
                    padding: "24px",
                    textAlign: "center",
                    width: "100%",
                  }}
                >
                  <p style={{ fontWeight: "600", margin: 0 }}>
                    The Request was Successfully{" "}
                    {actionResult === "rejected" ? "Rejected" : "Authorised"}
                  </p>
                </div>

                <button
                  onClick={() => navigate("/")}
                  style={{
                    width: "100%",
                    backgroundColor: "#e31837",
                    color: "white",
                    border: "none",
                    borderRadius: "24px",
                    height: "48px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "#c41530")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "#e31837")
                  }
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;
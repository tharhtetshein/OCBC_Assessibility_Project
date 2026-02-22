import React from "react";


const BottomNav = ({ activeTab = "home" }) => {
  const navItems = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "plan", icon: "🌱", label: "Plan" },
    { id: "pay", icon: "⇄", label: "Pay & Transfer" },
    { id: "rewards", icon: "🎁", label: "Rewards" },
    { id: "more", icon: "⋮⋮", label: "More" },
  ];

  const handleClick = (id) => {
    if (id === "home") {
      window.location.href = "/dashboard";
    } else if (id === "more") {
      window.location.href = "/morepage";
    } else if (id === "rewards") {
      window.location.href = "/rewards";
    }
  };

  return (
    <div
      className="bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        borderTop: "1px solid #e0e0e0",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "10px 0",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
        zIndex: 1000,
      }}
    >
      {navItems.map((item) => (
        <div
          key={item.id}
          onClick={() => handleClick(item.id)}
          data-help-id={item.id === "rewards" ? "bottom-nav-rewards" : undefined}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "pointer",
            flex: 1,
            padding: "5px",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              marginBottom: "4px",
              color: activeTab === item.id ? "#e31837" : "#999",
            }}
          >
            {item.icon}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: activeTab === item.id ? "#e31837" : "#999",
              fontWeight: activeTab === item.id ? "600" : "400",
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BottomNav;

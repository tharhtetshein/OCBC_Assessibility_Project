import React from 'react';

const ShortcutsGrid = ({ shortcuts, onShortcutClick, onAddClick, maxShortcuts = 6 }) => {
  const getIconDisplay = (shortcut) => {
    // Use Material Icons consistently like in Customisation Page
    return <span className="material-icons" style={{ fontSize: "40px", color: '#333' }}>{shortcut.icon}</span>;
  };

  return (
    <div
      className="shortcuts-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "25px",
        maxWidth: "600px",
        margin: "0 auto 30px",
        padding: "25px",
        backgroundColor: "white",
        borderRadius: "15px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        border: "1px solid #e0e0e0",
      }}
    >
      {shortcuts.map((shortcut, index) => (
        <div
          key={shortcut.id || index}
          className="shortcut-item"
          onClick={() => onShortcutClick(shortcut)}
          style={{
            textAlign: "center",
            cursor: "pointer",
            padding: "15px 10px",
            borderRadius: "12px",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#f8f9fa";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div className="shortcut-icon" style={{ marginBottom: "12px" }}>
            {getIconDisplay(shortcut)}
          </div>
          <div
            className="shortcut-label"
            style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}
          >
            {shortcut.label}
          </div>
        </div>
      ))}

      {shortcuts.length < maxShortcuts && (
        <div
          className="shortcut-item"
          onClick={onAddClick}
          style={{
            textAlign: "center",
            cursor: "pointer",
            padding: "15px 10px",
            borderRadius: "12px",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#f8f9fa";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            className="shortcut-icon"
            style={{ fontSize: "40px", marginBottom: "12px" }}
          >
            +
          </div>
          <div
            className="shortcut-label"
            style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}
          >
            Add
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortcutsGrid;

import React from "react";
import { useNavigate } from "react-router-dom";
import Chatbot from "./Chatbot";
import { AuthProvider } from "../auth/AuthContext";

const ChatbotPage = ({ isHelpOverlayActive = false }) => {
  const navigate = useNavigate();

  const handleClose = () => {
    // Go back to previous page or landing page
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <AuthProvider>
      <Chatbot onClose={handleClose} isHelpOverlayActive={isHelpOverlayActive} />
    </AuthProvider>
  );
};

export default ChatbotPage;

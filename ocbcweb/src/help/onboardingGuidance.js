/**
 * Guided onboarding for first-time users.
 */

export const onboardingTitle = "Welcome to OCBC Digital Banking";

export const onboardingSteps = [
  {
    target: ".account-card",
    text: "Your balance lives here. Tap the card to see account details and locked amounts.",
    position: "bottom"
  },

  {
    target: "[data-help-id='onboarding-chatbot']",
    text: "Prefer typing? Tap AI Chatbot and say/type \"Send $50 to John\" or \"Convert 100 SGD to USD\".",
    position: "right",
    skipIfMissing: true
  },
  {
    target: "[data-shortcut='payNow']",
    text: "Use PayNow for quick transfers. Tap it to start sending money.",
    position: "top",
    skipIfMissing: true
  }
];

export default onboardingSteps;

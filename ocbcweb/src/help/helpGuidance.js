/**
 * Help Guidance Configuration
 * Maps user intents to step-by-step visual walkthroughs
 */

export const helpGuidance = {
  transfer_money: {
    title: "Transfer Money",
    keywords: ["transfer", "send", "money", "pay", "paynow", "payment"],
    steps: [
      {
        target: "[data-shortcut='payNow']",
        text: "Tap PayNow in your shortcuts to start a transfer.",
        position: "bottom",
        action: "click"
      },
      {
        target: "[data-help-id='scam-warning-proceed']",
        text: "Acknowledge the scam warning to continue.",
        position: "top",
        action: "click",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='recipient-input']",
        text: "Enter the recipient's mobile number here, then select the contact or pay to the number.",
        position: "bottom"
      },
      {
        target: "[data-help-id='pay-to-number']",
        text: "Tap Pay to Number to confirm the recipient and continue.",
        position: "bottom",
        action: "click",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='manual-number-next']",
        text: "Tap Next to confirm the number.",
        position: "top",
        action: "click",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='save-contact-actions']",
        text: "Choose Save or Skip to continue.",
        position: "top",
        waitForSelectors: ["[data-help-id='save-contact-skip']", "[data-help-id='save-contact-save']"],
        skipIfMissing: true
      },
      {
        target: "[data-help-id='amount-input']",
        text: "Enter the amount you want to send.",
        position: "bottom"
      },
      {
        target: "[data-help-id='next-button']",
        text: "Tap Next to review the transfer details.",
        position: "top",
        action: "click"
      },
      {
        target: "[data-help-id='confirm-button']",
        text: "Tap Slide to Pay to complete the transfer.",
        position: "top",
        waitForSelectors: ["[data-help-id='confirm-button']"]
      }
    ]
  },

  emergency_cash: {
    title: "Emergency Cash",
    keywords: ["emergency cash", "emergency withdrawal", "emergency", "cash", "otp", "urgent cash"],
    steps: [
      {
        target: "[data-help-id='emergency-cash-button']",
        text: "Tap Emergency Cash to start an emergency withdrawal.",
        position: "bottom",
        action: "click",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='emergency-tab-self']",
        text: "Choose For Self (OTP) to generate a one-time password.",
        position: "bottom",
        action: "click",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='emergency-amount-input']",
        text: "Enter the amount you need within your emergency limit.",
        position: "bottom",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='emergency-generate-otp']",
        text: "Tap Generate OTP to create your emergency withdrawal code.",
        position: "top",
        waitForSelectors: ["[data-help-id='emergency-generate-otp']"],
        skipIfMissing: true
      },
      {
        target: "[data-help-id='emergency-otp-card']",
        text: "Use this OTP at any ATM before it expires.",
        position: "top"
      },
      {
        target: "[data-help-id='emergency-otp-done']",
        text: "Tap Done after noting the OTP to return to the dashboard.",
        position: "top",
        waitForSelectors: ["[data-help-id='emergency-otp-done']"]
      }
    ]
  },

  check_balance: {
    title: "Check Balance",
    keywords: ["balance", "money", "how much", "account", "available"],
    steps: [
      {
        target: ".account-card",
        text: "Your current balance is shown right here on the account card. The large number shows your available balance in SGD.",
        position: "bottom"
      },
      {
        target: ".account-card",
        text: "Tap on the card to see more details including foreign currencies and investment portfolio.",
        position: "bottom",
        action: "click"
      }
    ]
  },

  use_chatbot: {
    title: "AI Chatbot",
    keywords: ["chatbot", "ai", "assistant", "help", "bot", "talk", "chat", "tutorial", "features", "capabilities"],
    steps: [
      {
        target: ".ai-chatbot-button",
        text: "Tap AI Chatbot in Accessible Actions to open the AI chatbot.",
        position: "bottom",
        action: "click",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='chatbot-messages']",
        text: "Your conversation appears here. The chatbot replies with balances, transfers, exchanges, and investments.",
        position: "bottom"
      },
      {
        target: "[data-help-id='chatbot-input']",
        text: "Type your request here. Press Enter or tap Send to submit.",
        position: "top"
      },
      {
        target: "[data-help-id='chatbot-input']",
        text: "Check balance: try \"What's my balance?\"",
        position: "top",
        intentKey: "check_balance"
      },
      {
        target: "[data-help-id='chatbot-input']",
        text: "Transfer money: try \"Send $50 to John\" to start a PayNow transfer.",
        position: "top",
        intentKey: "transfer_money"
      },
      {
        target: "[data-help-id='chatbot-input']",
        text: "Lock or unlock funds: try \"Lock my account\" or \"Unlock my account\".",
        position: "top",
        intentKey: "account_lock"
      },
      {
        target: "[data-help-id='chatbot-input']",
        text: "Exchange currency: try \"Convert 100 SGD to USD\" for rates and exchange.",
        position: "top",
        intentKey: "exchange_currency"
      },
      {
        target: "[data-help-id='chatbot-input']",
        text: "Investments and portfolio: try \"Buy $200 of AAPL\", \"Sell 2 shares of TSLA\", or \"Show my portfolio\".",
        position: "top",
        intentKey: "investments"
      }
    ]
  },

  view_rewards: {
    title: "View Rewards",
    keywords: ["rewards", "points", "coins", "spin", "wheel", "prize", "redeem", "voucher", "referral"],
    steps: [
      {
        target: "[data-help-id='bottom-nav-rewards']",
        text: "Tap Rewards in the bottom nav to open your rewards hub.",
        position: "top",
        action: "click",
        navigateTo: "/rewards"
      },
      {
        target: "[data-help-id='rewards-coin-balance']",
        text: "Your total reward coins are shown here.",
        position: "bottom"
      },
      {
        target: "[data-help-id='rewards-collect-button']",
        text: "Collect your daily coin here when available.",
        textWhenDisabled: "You've already collected today. Come back tomorrow for the next coin.",
        position: "top",
        autoAdvanceWhenDisabled: true
      },
      {
        target: "[data-help-id='rewards-spin-button']",
        text: "Spin the wheel for a chance to win bonus coins.",
        textWhenDisabled: "Spin in progress. If you've used all spins, come back later.",
        position: "top",
        waitForSelectors: ["[data-help-id='rewards-spin-button']"],
        autoAdvanceWhenDisabled: true
      },
      {
        target: "[data-help-id='rewards-open-prizes']",
        text: "Open the prize catalog to redeem rewards.",
        position: "left",
        waitForSelectors: ["[data-help-id='rewards-open-prizes']"]
      },
      {
        target: "[data-help-id='rewards-redeem-button']",
        text: "Choose a prize to redeem when you have enough coins.",
        textWhenDisabled: "You don't have enough coins yet. Tap Next to continue.",
        position: "left",
        autoAdvanceToTarget: "[data-help-id='rewards-confirm-redemption']"
      },
      {
        target: "[data-help-id='rewards-confirm-redemption']",
        text: "Tap Confirm to complete your redemption.",
        position: "top",
        action: "click",
        waitForSelectors: ["[data-help-id='rewards-confirm-redemption']"],
        forceWhenVisible: true,
        skipIfMissing: true
      },
      {
        target: "[data-help-id='rewards-close-prizes']",
        text: "Close the prizes list to continue.",
        position: "left",
        action: "click",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='rewards-share-code']",
        text: "Share your referral code to earn more coins.",
        position: "top",
        waitForSelectors: ["[data-help-id='rewards-share-code']"]
      }
    ]
  },

  shared_access: {
    title: "Shared Access",
    keywords: ["share", "family", "helper", "access", "caregiver", "permission", "elderly"],
    steps: [
      {
        target: ".shared-access-button",
        text: "Tap Shared Access to manage who can help with your account.",
        position: "top",
        action: "click"
      },
      {
        target: "[data-help-id='shared-access-people-tab']",
        text: "Switch to People with Access to invite someone new.",
        position: "bottom",
        action: "click"
      },
      {
        target: "[data-help-id='shared-access-add-person']",
        text: "Tap Add Person to open the invitation form.",
        position: "bottom",
        action: "click"
      },
      {
        target: "[data-help-id='shared-access-email-input']",
        text: "Enter the person's email address.",
        position: "bottom"
      },
      {
        target: "[data-help-id='shared-access-search-button']",
        text: "Tap Search to find the user.",
        position: "bottom",
        waitForSelectors: ["[data-help-id='shared-access-search-button']"]
      },
      {
        target: "[data-help-id='shared-access-found-user']",
        text: "Confirm you have the right person.",
        position: "bottom"
      },
      {
        target: "[data-help-id='shared-access-permissions']",
        text: "Choose what they can do, like view balance or make transfers.",
        position: "bottom",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='shared-access-approval-limit']",
        text: "Set a transfer approval limit if needed.",
        position: "bottom",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='shared-access-mutual-consent']",
        text: "Optional: require mutual consent to revoke access.",
        position: "bottom",
        skipIfMissing: true
      },
      {
        target: "[data-help-id='shared-access-send-invite']",
        text: "Send the invitation when you are ready.",
        position: "top",
        waitForSelectors: ["[data-help-id='shared-access-send-invite']"],
        skipIfMissing: true
      }
    ]
  },

  remote_atm: {
    title: "Remote ATM",
    keywords: ["atm", "remote atm", "withdraw", "cash", "cardless", "session code", "atm access"],
    steps: [
      {
        target: "[data-help-id='remote-atm-badge']",
        text: "Tap Remote ATM to start a cardless ATM session.",
        position: "left",
        waitForSelectors: ["[data-help-id='remote-atm-badge']"],
        skipIfMissing: true
      },
      {
        target: "[data-help-id='remote-atm-action-withdrawal']",
        text: "Choose Cash Withdrawal to prepare a withdrawal.",
        position: "bottom",
        waitForSelectors: ["[data-help-id='remote-atm-action-withdrawal']"]
      },
      {
        target: "[data-help-id='remote-atm-amount-input']",
        text: "Enter the amount you want to withdraw.",
        position: "bottom"
      },
      {
        target: "[data-help-id='remote-atm-continue']",
        text: "Tap Continue to generate your session code.",
        position: "top",
        waitForSelectors: ["[data-help-id='remote-atm-continue']"]
      },
      {
        target: "[data-help-id='remote-atm-session-code']",
        text: "This is your session code. Go to an OCBC ATM before it expires.",
        position: "top"
      },
      {
        target: "[data-help-id='remote-atm-simulate-atm']",
        text: "Insert your card at the ATM. (Demo: tap here to simulate.)",
        position: "top",
        waitForSelectors: ["[data-help-id='remote-atm-simulate-atm']"]
      },
      {
        target: "[data-help-id='remote-atm-confirm-transaction']",
        text: "Confirm the transaction to complete the withdrawal.",
        position: "top",
        waitForSelectors: ["[data-help-id='remote-atm-confirm-transaction']"]
      },
      {
        target: "[data-help-id='remote-atm-return-dashboard']",
        text: "Return to the dashboard when you're done.",
        position: "top",
        waitForSelectors: ["[data-help-id='remote-atm-return-dashboard']"]
      }
    ]
  },

  customize_shortcuts: {
    title: "Customize Shortcuts",
    keywords: ["shortcut", "customize", "arrange", "organize", "personalize", "quick"],
    steps: [
      {
        target: ".customise-button",
        text: "Tap 'Customise Shortcut' to change which features appear in your quick access grid.",
        position: "top",
        action: "click"
      },
      {
        target: null,
        text: "Drag and drop to reorder, or tap the edit icons to add/remove shortcuts. Your most-used features should be easily accessible!",
        position: "center"
      }
    ]
  },

  view_notifications: {
    title: "Notifications",
    keywords: ["notification", "alert", "message", "pending", "approval"],
    steps: [
      {
        target: ".notification-icon",
        text: "Tap the bell icon to see your notifications and any pending approvals.",
        position: "bottom",
        action: "click"
      },
      {
        target: null,
        text: "Here you'll find transaction alerts, shared access requests, and important account updates.",
        position: "center"
      }
    ]
  },

  buy_stocks: {
    title: "Buy Investments",
    keywords: ["stock", "invest", "buy", "shares", "portfolio", "trading"],
    steps: [
      {
        target: ".ai-chatbot-button",
        text: "Open the AI chatbot to buy stocks easily.",
        position: "bottom",
        action: "click"
      },
      {
        target: null,
        text: "Tell the AI what you want to buy, like 'Buy $100 of Apple stock' or 'Invest in GOOGL'. The AI will handle the transaction!",
        position: "center"
      }
    ]
  },

  exchange_currency: {
    title: "Exchange Currency",
    keywords: ["exchange", "currency", "forex", "convert", "usd", "eur", "foreign"],
    steps: [
      {
        target: ".ai-chatbot-button",
        text: "Open the AI chatbot for currency exchange.",
        position: "bottom",
        action: "click"
      },
      {
        target: null,
        text: "Ask the AI to exchange currency, like 'Convert $100 SGD to USD'. The AI shows live rates and processes the exchange instantly!",
        position: "center"
      }
    ]
  }
};

/**
 * Find the best matching guidance for a user query
 */
export const findBestGuidance = (query) => {
  const lowerQuery = query.toLowerCase();
  
  let bestMatch = null;
  let highestScore = 0;

  for (const [intentKey, guidance] of Object.entries(helpGuidance)) {
    let score = 0;
    
    for (const keyword of guidance.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += keyword.length; // Longer matches get higher scores
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = { intent: intentKey, ...guidance };
    }
  }

  return bestMatch;
};

export default helpGuidance;

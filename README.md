# OCBC_DigitalBanking_Grp4

---

## How to Start the App

1. **Start the backend API**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Make sure `backend/.env` is configured (see `backend/README.md` for details).

---

3. **Start the frontend (React) app**
   ```bash
   cd ocbcweb
   npm install
   npm start
   ```
   The frontend expects the backend to be running on `http://localhost:5000`.

## Features

### Contributed by **Kavin**

The following advanced customization and user experience features were designed and implemented by Kavin.

### 13. AI Chatbot Customization
A comprehensive personalization system that allows users to fully customize their AI banking assistant to match their preferences and needs.

**Key Features:**
- **Companion Settings**: Customize bot name, language (English, Chinese, Malay, Tamil), and enable simple mode for accessibility
- **Contextual Awareness**: Add personal information (nickname, occupation, about you) for personalized responses
- **Family Member Shortcuts**: Configure family member shortcuts for quick transfers (e.g., "Send $50 to Mom")
- **Speech Controls**: Enable voice input/output with adjustable speed and pitch settings
- **Memory Settings**: Control how the AI remembers preferences and provides contextual responses
- **Theme Customization**: Personalize chat interface colors including background, chat bubbles, text, and accent colors
- **Interactive Preview**: Real-time preview of customization changes with sample conversations

**Technical Highlights:**
- **Firebase Integration**: All customization settings are saved to Firestore and persist across sessions
- **Real-Time Theme Application**: CSS custom properties dynamically updated based on user theme preferences
- **Advanced Settings Architecture**: Modular settings system with tabbed interface for organized customization
- **Voice API Integration**: Browser Speech Recognition and Speech Synthesis APIs for voice features
- **Responsive Design**: Mobile-optimized customization interface with touch-friendly controls

---

### 14. Enhanced Shortcuts System
A revolutionary shortcut management system featuring innovative layouts and comprehensive customization options.

**Key Features:**
- **Donut Grid Layout**: Unique circular arrangement of shortcuts in an aesthetically pleasing donut pattern
- **Multiple Layout Options**: Choose between traditional grid, circular donut, and swipeable carousel layouts
- **Saved Layout Preferences**: User-selected layouts are automatically saved and restored across sessions
- **Shortcut Information System**: Detailed descriptions of purpose and usage for each shortcut
- **Enhanced UI/UX Design**: Modern, intuitive interface with smooth animations and visual feedback


**Technical Highlights:**
- **CSS Grid & Flexbox Mastery**: Advanced CSS layouts for the donut grid using mathematical positioning
- **LocalStorage Persistence**: Layout preferences and shortcut arrangements saved locally for instant loading
- **React State Management**: Complex state handling for multiple layout modes and customization options
- **Animation Framework**: Smooth transitions and micro-interactions using CSS transforms and React transitions
- **Responsive Grid System**: Adaptive layouts that work seamlessly across all device sizes
- **Performance Optimization**: Efficient rendering with React.memo and optimized re-renders

---

### Contributed by **Thar Htet Shein**

The following advanced features were designed and implemented by Thar Htet Shein.

### 1. AI Chatbot
A next-generation banking assistant powered by the **OpenRouter GPT OSS 120b** model, capable of complex financial reasoning and natural conversation.

**Capabilities:**
- **Smart Transactions**: "Transfer $50 to Mom" — The bot resolves "Mom" from your shortcuts and executes the transfer.
- **Investment Management**: Buy/Sell stocks using real-time market data.
- **Account Security**: Instantly lock/unlock your account via voice or text commands.
- **Multilingual Support**: Communicates fluently in multiple languages.

**Technical Highlights:**
- **Voice Architecture**: Built on the **Web Speech API** for seamless, browser-native Speech-to-Text and Text-to-Speech (TTS) requiring no external plugins.
- **Real-Time Data Streams**: Integrates with **Alpha Vantage** for live stock tickers and **ExchangeRate-API** for up-to-the-second currency conversion rates.
- **State Persistence**: Uses **Firebase Firestore** to maintain conversation context, user preferences (dark mode, voice speed), and transaction history across sessions.
- **Secure Backend**: Request handling via a secure Node.js/Express backend (`server.js`) that sanitizes inputs before interacting with the LLM.

---

### 2. The Tutorial (Help Overlay)
An enterprise-grade, accessible onboarding system that guides users through complex workflows like "PayNow" and "Rewards Redemption."

**Key Features:**
- **Spotlight Focus**: Uses a darkened backdrop with a "cutout" effect to visually isolate and highlight the step's target element.
- **Smart Navigation**: The engine intelligently detects if a target element is disabled or missing from the DOM and automatically skips the step or waits for it to appear (using `MutationObserver`).
- **Context-Aware Triggers**: The Chatbot can programmatically launch specific tutorials based on user questions (e.g., asking "How do I withdraw cash?" triggers the `remote_atm` tour).

**Technical Highlights:**
- **Event-Driven Architecture**: Utilizes a robust `CustomEvent` system (`chatbot:tutorial-progress`, `help:advance-to-target`) for decoupled communication between the Chatbot and the Help Overlay.
- **Accessibility First**: Fully navigable via keyboard. Dynamic tooltips automatically calculate optimal positioning to avoid screen edges and ensuring text is always readable.
- **Resilience**: A `MutationObserver` constantly monitors the DOM to re-anchor tooltips if the underlying UI shifts or resizes.

---

### Contributed by **Pierre Foo**

### 3. Rewards & Gamification
A comprehensive rewards system designed to incentivize banking activities and enhance financial literacy through interactive games.

**Key Features:**
- **Daily Check-In & Streak System**: Encourages daily app usage with progressively increasing coin rewards for 7-day streaks.
- **"Whack-A-Scam" Education Game**: A gamified cybersecurity lesson where users must quickly identify and tap "legit" messages while avoiding "scam" messages. Mistakes trigger instant educational popups explaining the red flags.
- **Whack-A-Scam Leaderboard**: A real-time competitive leaderboard that tracks high scores for the "Whack-A-Scam" game, fostering community competition.
- **Spin The Wheel**: A luck-based minigame implemented with SVG for smooth animations, offering random coin bonuses.
- **Prize Redemption**: Users can exchange earned coins for real-world vouchers (e.g., Grab, NTUC).
- **Prize Redemption Email Confirmation**: Email automation to deliver digital voucher codes instantly upon redemption.

---

### Contributed by **Le Wun Sandi Kyaw**

The following accessibility features were designed and implemented by Le Wun Sandi Kyaw for stroke patients who cannot use traditional touchscreens.

### 4. Eye Tracker
A hands-free navigation system powered by **MediaPipe Face Mesh**, enabling users to control the banking application entirely with their eyes.

**Capabilities:**
- **Gaze Navigation**: Move a cursor across the screen simply by looking — the system tracks your iris position in real-time.
- **Dwell Click**: Stare at any button or link for 2.5 seconds to click it, with a visual progress ring indicating activation time.
- **Eye-Controlled Typing**: Focus on input fields to open an on-screen keyboard, then type by gazing at keys.
- **Auto Scroll**: Look at the top or bottom edges of the screen to automatically scroll the page.

**Technical Highlights:**
- **Computer Vision Pipeline**: Built on **MediaPipe Face Mesh** with iris refinement enabled, providing 478 facial landmarks including precise iris tracking at ~60 FPS.
- **Real-Time Communication**: Uses **Flask-SocketIO** for bidirectional WebSocket streaming between the Python backend and React frontend.
- **Intelligent Eye Detection**: The system distinguishes between face detection and eye visibility — cursor stops when eyes are closed or covered, preventing unintended interactions.
- **Gaze Smoothing**: Implements an **Exponential Moving Average (EMA)** algorithm with deadzone filtering to eliminate jitter and provide stable cursor movement.

---

### 5. Hand Tracker
A gesture-based control system powered by **MediaPipe Hands**, allowing users to navigate and interact using simple hand movements and pinch gestures.

**Capabilities:**
- **Finger Cursor**: Point with your index finger to move the cursor — the system tracks your fingertip position with precision.
- **Pinch to Click**: Bring your thumb and index finger together for an instant click, mimicking a natural "tap" gesture.
- **Dwell Click**: Hold your hand steady over an element for 2 seconds to activate it, ideal for users with limited fine motor control.
- **Hand-Controlled Typing**: Point at input fields to open an on-screen keyboard, then pinch or dwell on keys to type.
- **Gesture Recognition**: The system recognizes multiple hand poses — point 👆, pinch 👌, open palm 🖐️, and fist ✊.

**Technical Highlights:**
- **Hand Landmark Detection**: Utilizes **MediaPipe Hands** to track 21 hand landmarks per hand, with high confidence thresholds (0.7) for reliable detection.
- **Mirrored Interaction**: Camera feed and cursor movement are mirrored to provide an intuitive "mirror-like" experience where moving your hand left moves the cursor left.
- **Pinch Distance Calculation**: Real-time Euclidean distance calculation between thumb tip (landmark 4) and index tip (landmark 8) with configurable threshold for pinch detection.
- **Gesture Cooldown System**: Implements a 1-second cooldown between pinch clicks to prevent accidental double-clicks and improve interaction reliability.
- **Multi-Point Hit Detection**: The cursor checks multiple points in a radius pattern to detect clickable elements, improving accuracy for users with hand tremors.

---

### 6. On-Screen Keyboard
An accessibility-focused virtual keyboard designed for both eye and hand tracker input methods, enabling text entry without physical touch.

**Capabilities:**
- **Full QWERTY Layout**: Complete keyboard with letters, numbers, and symbols across 5 rows.
- **Shift & Caps Lock**: Toggle between lowercase, uppercase, and symbol layers with visual state indicators.
- **Live Preview**: A real-time preview box displays typed text with a blinking cursor, showing exactly what will be entered.
- **Smart Input Sync**: Automatically syncs with React-controlled input fields using native value setters to trigger proper state updates.
- **One-Click Clear**: Instantly clear all typed text with a dedicated clear button.

**Technical Highlights:**
- **React State Compatibility**: Uses `Object.getOwnPropertyDescriptor` to access native input value setters, ensuring compatibility with React's synthetic event system and controlled components.
- **Dynamic Tracker Detection**: Automatically displays "Eye-Controlled Keyboard" or "Hand-Controlled Keyboard" based on the active input method.
- **Dual Hover Styling**: CSS supports both `.gaze-hovered` (red theme) and `.hand-hovered` (blue theme) classes for visual feedback matching each tracker's color scheme.
- **Form Integration**: Handles Enter key intelligently — submits forms for single-line inputs or adds newlines for textareas.
- **Tab Navigation**: Supports keyboard-style tab navigation to move focus between input fields sequentially.

---

### 7. Draggable Camera Feed
A floating, repositionable camera preview that provides real-time visual feedback of the tracking system's view.

**Capabilities:**
- **Live Video Feed**: Displays the camera view with tracking overlays (iris landmarks for eye tracker, hand skeleton for hand tracker).
- **Drag to Reposition**: Click and drag the panel to any position on screen — position persists across sessions.
- **Status Indicators**: Shows current tracking state (Face/Hand Detected, Keyboard Active, etc.) with color-coded feedback.
- **Quick Stop Button**: One-click button to immediately stop tracking without navigating away.

**Technical Highlights:**
- **LocalStorage Persistence**: Camera position is saved to `localStorage` and restored on page load, maintaining user preferences across sessions.
- **Touch & Mouse Support**: Drag handlers support both mouse events (`mousedown`, `mousemove`) and touch events (`touchstart`, `touchmove`) for cross-device compatibility.
- **Boundary Constraints**: Position clamping ensures the panel never moves off-screen, always remaining accessible.
- **Base64 Video Streaming**: Video frames are encoded as Base64 JPEG on the Python backend and streamed via WebSocket for efficient, plugin-free video display.

---

### 8. Floating Action Button (FAB)
A draggable, expandable quick-access menu that serves as the central hub for all accessibility features and app shortcuts.

**Capabilities:**
- **Drag Anywhere**: Position the FAB anywhere on screen by dragging, perfect for users who need it in a specific location for easier access.
- **One-Tap Expansion**: Click to reveal a menu with quick access to Eye Tracking, Hand Tracking, Voice Help, Remote ATM, Emergency Cash, and more.
- **Toggle Trackers**: Enable or disable Eye Tracking and Hand Tracking directly from the menu with visual state indicators (green for enable, red for disable).
- **Voice Help Integration**: Launch the voice assistance system directly from the FAB for hands-free help.
- **Quick Navigation**: Jump to key features like AI Chatbot, Shared Access, and Customise Shortcuts without navigating through menus.

**Technical Highlights:**
- **Smart Click vs Drag Detection**: Uses a movement threshold (`dragThreshold = 5px`) to distinguish between intentional drags and clicks, preventing accidental menu toggles while repositioning.
- **Position Persistence**: FAB position is saved to `localStorage` and restored on app load, remembering user's preferred placement across sessions.
- **Boundary Constraints**: Position clamping ensures the FAB stays within viewport bounds (`Math.max(10, Math.min(newX, maxX))`), always remaining accessible.
- **Staggered Menu Animation**: Menu items animate in sequence with CSS `animationDelay` based on index, creating a smooth cascade effect.
- **Gaze & Hand Compatible**: All menu items include the `.clickable` class and `.gaze-hovered` styles, making the entire FAB fully accessible via eye and hand tracking.
- **Click Outside to Close**: A `mousedown` event listener on the document automatically closes the expanded menu when clicking elsewhere, improving usability.
  
---

### Contributed by **Nur Asyira Fitri Binte Razali**

The following security and emergency-access features were designed and implemented to enhance trust, safety, and real-world usability in digital banking.

### 9. Shared Access

A controlled, permission-based account sharing system that allows users to safely involve a trusted helper while maintaining full ownership and control.

**Capabilities:**

* **Granular Permission Control**: Assign helper permissions such as viewing balances, approving transfers, or initiating transfers with explicit consent.
* **Dynamic Access Management**: Modify permissions or revoke access instantly at any time.
* **Mutual Agreement Flow**: Both the account holder and helper must acknowledge and accept access terms before activation.
* **Dual-Approval Transfers**: High-value transfers require approval from the other party before execution.

**Technical Highlights:**

* **Role-Based Access Control (RBAC)**: Backend-enforced permission system validating each action per user role.
* **Real-Time Approval Notifications**: Instant in-app approval prompts for sensitive transactions.
* **Transaction Limit Enforcement**: Configurable transfer limits validated server-side.
* **Audit Logging**: All shared-access actions are logged with timestamps for accountability and traceability.

---

### 10. Emergency Cash Withdrawal

A fast and secure emergency withdrawal mechanism designed for urgent real-world situations.

**Capabilities:**

* **OTP-Based Emergency Withdrawal**: Generates a one-time password specifically for emergency cash access.
* **User-Defined OTP Validity**: Account holders can configure how long the OTP remains valid.
* **Multi-Modal OTP Sharing**: OTP can be copied, shared, or read aloud via text-to-speech.
* **Visual Countdown Feedback**: Clear countdown timer indicating OTP validity and withdrawal status.

**Technical Highlights:**

* **Time-Bound OTP Generation**: Secure OTPs with automatic expiration handling.
* **Audio Privacy Controls**: Sensitive OTPs are spoken only when headphones are connected.
* **Real-Time Status Updates**: Live UI feedback for OTP creation, usage, and expiry.
* **Backend Validation Layer**: OTP verification and withdrawal authorization enforced server-side.

---

### 11. ATM Remote Access Screen

A mobile-based ATM interface that enables users to perform ATM-specific transactions without physical interaction.

**Capabilities:**

* **Remote ATM Interface**: Initiate ATM-only transactions directly from the mobile app.
* **Voice Guidance & Haptic Feedback**: Spoken instructions and vibration cues for hands-free usage.
* **Privacy-Aware Audio Output**: Sensitive information is spoken only when headphones are connected.
* **QR-Based Withdrawals**: Generate QR codes for fast and secure ATM withdrawals.

**Technical Highlights:**

* **Secure QR Tokenization**: Time-limited QR codes linked to specific withdrawal amounts.
* **Cross-Channel ATM Compatibility**: QR codes usable across physical ATMs and the remote ATM interface.
* **Accessibility Feedback System**: Voice and vibration cues synchronized with transaction steps.
* **Session Timeout Controls**: Automatic expiration of inactive ATM sessions for security.

---

### 12. Emergency Shared Access

A temporary shared access mode designed specifically for emergency scenarios requiring immediate assistance.

**Capabilities:**

* **Emergency-Only Permissions**: Helpers are restricted to predefined emergency withdrawal limits.
* **Instant Enable / Disable**: Emergency shared access can be activated or revoked at any time.
* **QR-Based Emergency Withdrawal**: Helpers can generate QR codes within allowed limits.
* **Multi-Channel Usage**: QR codes can be used via physical ATMs or the Remote ATM interface.

**Technical Highlights:**

* **Emergency Access Flags**: Separate permission state from standard shared access to prevent privilege escalation.
* **Withdrawal Limit Guardrails**: Emergency caps enforced on both frontend and backend.
* **Single-Use QR Lifecycle**: QR codes expire automatically after redemption or timeout.
* **Independent Audit Trail**: Emergency actions are logged separately for post-incident review.

---

### References & Resources

**AI Chatbot & Voice:**
- [OpenRouter API Documentation](https://openrouter.ai/docs): Used for accessing the GPT OSS 120b model.
- [Web Speech API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API): Implemented for browser-native Speech-to-Text and Text-to-Speech.
- [Firebase Firestore](https://firebase.google.com/docs/firestore): Real-time NoSQL database used for state persistence.
- [Alpha Vantage API](https://www.alphavantage.co/documentation/): Source for real-time stock market data.
- [ExchangeRate-API](https://www.exchangerate-api.com/docs/standard-requests): Provider for live currency conversion rates.

**Front-End & Architecture:**
- [MutationObserver API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver): Used in the Help Overlay for detecting DOM changes.
- [React Portals](https://react.dev/reference/react-dom/createPortal): Technique used to render the Help Overlay above all other z-index triggers.
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/): Applied for ensuring accessibility in the overlay components.
- [CustomEvent Interface](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent): Mechanism used for the Event-Driven Architecture between Chatbot and Tutorial.

**Rewards & Email:**
- [Nodemailer] (https://nodemailer.com/): Used in the backend for sending transactional reward emails.
- [EmailJS] (https://www.emailjs.com/): Email Service used to facilitate email automation with Nodemailer.
- [Lovable] (https://lovable.dev/): For webapp design inspiration.
---

## Testing

To run the frontend test suite:

```bash
cd ocbcweb
npm test -- --watchAll=false
```
---

### Feature-Specific Tests

**Test the AI Chatbot:**
```bash
npm test -- Chatbot --watchAll=false
```
---

**Test the Tutorial (Help Overlay):**
```bash
npm test -- HelpOverlay --watchAll=false
```

---

## CI/CD Workflow

This project uses **GitHub Actions** for Continuous Integration. The workflow is defined in [.github/workflows/ci.yml](.github/workflows/ci.yml).

- **Triggers**: Pushes and Pull Requests to the `main` branch.
- **Jobs**:
  - `test-frontend`: Installs dependencies and runs the full test suite for the `ocbcweb` frontend.


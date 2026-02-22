# Firebase Authentication Setup

## Overview
Your OCBC web application now has Firebase authentication integrated! Here's what has been implemented:

## Features Added
- **User Registration**: New users can create accounts with email/password
- **User Login**: Existing users can log in with their credentials
- **User Logout**: Authenticated users can securely log out
- **Protected Routes**: Dashboard is only accessible to authenticated users
- **Real-time Auth State**: App automatically updates when user logs in/out

## How to Use

### For New Users
1. Open the application
2. Click "Log in to OCBC Singapore"
3. Enter your email and password
4. Click "Log In" to sign in

### Firebase Console Setup
Your Firebase project is already configured with these details:
- Project ID: `ocbcwebgrp4`
- Auth Domain: `ocbcwebgrp4.firebaseapp.com`

### Enable Authentication Methods
To allow users to register/login, you need to enable Email/Password authentication in Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `ocbcwebgrp4`
3. Navigate to Authentication > Sign-in method
4. Enable "Email/Password" provider
5. Save the changes

## File Structure
- `src/firebase.js` - Firebase configuration and auth functions
- `src/AuthContext.js` - React context for managing auth state
- `src/Login.js` - Login form component
- `src/Dashboard.js` - Protected dashboard for authenticated users
- `src/App.js` - Main app with auth state management

## Security Notes
- Passwords must be at least 6 characters long
- All authentication is handled securely by Firebase
- User sessions persist across browser refreshes
- Automatic logout when session expires

## Next Steps
1. Enable Email/Password authentication in Firebase Console
2. Test user registration and login
3. Customize the dashboard with actual banking features
4. Add password reset functionality if needed
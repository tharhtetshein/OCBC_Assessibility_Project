# AI Chatbot Setup Guide

## Overview
The AI chatbot uses Gemini 2.0 Flash to help users with banking tasks like checking their balance.

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

### 2. Get Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 3. Configure .env

Edit `backend/.env` and add your API key:

```
GEMINI_API_KEY=your_api_key_here
PORT=5000
FIREBASE_PROJECT_ID=ocbcwebgrp4
```

### 4. Start Backend Server

```bash
# In the backend folder
npm run dev
```

The server will start on `http://localhost:5000`

### 5. Start Frontend

```bash
# In a new terminal, navigate to ocbcweb folder
cd ocbcweb

# Start the React app (if not already running)
npm start
```

## Using the Chatbot

1. Log in to the app
2. Click the "New AI Chatbot" button in the header
3. Try asking: "What's my balance?"
4. The AI will check your balance and respond

## Current Features

- ✅ Check account balance
- ✅ Natural conversation
- ✅ Context-aware responses
- ✅ Send money to another OCBC account when the user provides a phone or account number

## Adding More Features Later

To add new features, you'll need to:
1. Add new function declarations in `backend/server.js`
2. Implement the function logic
3. The AI will automatically learn to use the new functions

## Troubleshooting

**"Failed to connect" error:**
- Make sure the backend server is running on port 5000
- Check that your Gemini API key is valid

**"User not found" error:**
- Make sure you're logged in
- Check that user data exists in Firestore

**CORS errors:**
- The backend has CORS enabled for all origins
- If issues persist, check browser console for details

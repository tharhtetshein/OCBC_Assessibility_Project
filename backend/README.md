# OCBC AI Chatbot Backend

Backend server for the OCBC AI Chatbot feature using Gemini 2.0 Flash.

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Add your Gemini API key to `.env`:**
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=5000
   FIREBASE_PROJECT_ID=ocbcwebgrp4
   ```

4. **Get Gemini API Key:**
   - Go to https://aistudio.google.com/app/apikey
   - Create a new API key
   - Copy and paste it into your `.env` file

## Running the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### POST /api/chat
Send a message to the AI chatbot.

**Request:**
```json
{
  "message": "What's my balance?",
  "userId": "user_firebase_uid",
  "chatHistory": []
}
```

**Response:**
```json
{
  "message": "Your available balance is $0.00 SGD...",
  "success": true
}
```

### GET /api/health
Health check endpoint.

## Features

The AI chatbot can currently:
- Check user balance (available, locked, and total)
- Send money to another OCBC account by providing a phone or account number
- Respond to general banking queries

More features will be added later.

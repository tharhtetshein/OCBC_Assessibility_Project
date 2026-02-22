const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log("OPENROUTER_API_KEY present:", !!process.env.OPENROUTER_API_KEY);
if (process.env.OPENROUTER_API_KEY) {
  console.log("OPENROUTER_API_KEY length:", process.env.OPENROUTER_API_KEY.length);
  console.log("OPENROUTER_API_KEY first 4 chars:", process.env.OPENROUTER_API_KEY.substring(0, 4));
} else {
  console.error("CRITICAL: OPENROUTER_API_KEY is missing from environment variables!");
}


// Initialize Firebase Admin SDK
// Priority: 1) Service account JSON file, 2) Environment variable, 3) Default credentials
let firebaseInitialized = false;
try {
  const serviceAccountPath = './serviceAccountKey.json';
  
  if (fs.existsSync(serviceAccountPath)) {
    // Option 1: Use service account JSON file (for local development)
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('Firebase Admin initialized with service account file');
    firebaseInitialized = true;
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Option 2: Use service account from environment variable (for production deployment)
    // The env var should contain the JSON stringified service account
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('Firebase Admin initialized with environment variable');
    firebaseInitialized = true;
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    // Option 3: Use individual env vars for service account parts
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle escaped newlines in private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('Firebase Admin initialized with individual env vars');
    firebaseInitialized = true;
  } else {
    // Option 4: Try default credentials (for Google Cloud deployment)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log('Firebase Admin initialized with default credentials');
    firebaseInitialized = true;
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error.message);
  console.log('Please set FIREBASE_SERVICE_ACCOUNT env var or add serviceAccountKey.json');
}

// Firestore reference
const db = firebaseInitialized ? admin.firestore() : null;

// Helper function to get user document
async function getUserDocument(userId) {
  if (!db) {
    return { error: 'Firebase not initialized. Please add serviceAccountKey.json' };
  }
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return { error: 'User not found' };
    }
    
    return {
      id: userId,
      data: userDoc.data()
    };
  } catch (error) {
    console.error('Error fetching user document:', error);
    return { error: 'Failed to fetch user data' };
  }
}

// Function to get user balance from Firestore
async function getUserBalance(userId) {
  const userDoc = await getUserDocument(userId);
  if (userDoc.error) {
    return { error: userDoc.error };
  }
  const userData = userDoc.data || {};

  const balance = Number(userData.balance || 0);
  const lockedAmount = Number(userData.lockedAmount || 0);

  return {
    balance,
    lockedAmount,
    totalBalance: balance + lockedAmount
  };
}

async function updateUserBalanceInFirestore(userId, balance) {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    await db.collection('users').doc(userId).update({
      balance: Number(balance)
    });
  } catch (error) {
    throw new Error(`Failed to update balance for ${userId}: ${error.message}`);
  }
}

// ------------------- EXCHANGE RATE FUNCTIONS -------------------

// Cache for exchange rates (refresh every 1 hour)
let exchangeRatesCache = {
  rates: null,
  lastFetched: null
};

async function getExchangeRates() {
  const ONE_HOUR = 60 * 60 * 1000;

  // Use cache if available and fresh
  if (exchangeRatesCache.rates && exchangeRatesCache.lastFetched &&
    (Date.now() - exchangeRatesCache.lastFetched) < ONE_HOUR) {
    return exchangeRatesCache.rates;
  }

  try {
    // Free exchange rate API
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/SGD');
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    exchangeRatesCache = {
      rates: data.rates,
      lastFetched: Date.now()
    };

    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return fallback rates if API fails
    return {
      SGD: 1,
      USD: 0.74,
      EUR: 0.68,
      GBP: 0.58,
      JPY: 110.5,
      AUD: 1.12,
      CNY: 5.35,
      MYR: 3.45,
      THB: 26.5,
      HKD: 5.78,
      KRW: 980.5,
      INR: 61.5
    };
  }
}

async function convertCurrency(fromCurrency, toCurrency, amount) {
  const rates = await getExchangeRates();

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (!rates[from] && from !== 'SGD') {
    return { error: `Unsupported currency: ${from}` };
  }
  if (!rates[to]) {
    return { error: `Unsupported currency: ${to}` };
  }

  // Convert: SGD -> target rate directly available
  // For other conversions, go through SGD
  let rate;
  if (from === 'SGD') {
    rate = rates[to];
  } else if (to === 'SGD') {
    rate = 1 / rates[from];
  } else {
    // Convert from -> SGD -> to
    const fromToSGD = 1 / rates[from];
    const sgdToTarget = rates[to];
    rate = fromToSGD * sgdToTarget;
  }

  return {
    fromCurrency: from,
    toCurrency: to,
    fromAmount: amount,
    toAmount: amount * rate,
    exchangeRate: rate
  };
}

// ------------------- STOCK PRICE FUNCTIONS -------------------

// Alpha Vantage API for real stock prices
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Cache for stock prices (refresh every 24 hours to respect rate limits)
// Alpha Vantage free tier: 25 requests/day
let stockPriceCache = {};
const STOCK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const ALPHA_VANTAGE_STATE_PATH = path.join(__dirname, '.alpha-vantage-state.json');
let alphaVantageBlockedUntil = 0;
let alphaVantageRequestInFlight = false;

const loadAlphaVantageState = () => {
  try {
    if (!fs.existsSync(ALPHA_VANTAGE_STATE_PATH)) {
      return { blockedUntil: 0 };
    }
    const raw = fs.readFileSync(ALPHA_VANTAGE_STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      blockedUntil: Number(parsed.blockedUntil) || 0
    };
  } catch (error) {
    console.warn('Failed to read Alpha Vantage state:', error.message);
    return { blockedUntil: 0 };
  }
};

const saveAlphaVantageState = (blockedUntil) => {
  try {
    fs.writeFileSync(
      ALPHA_VANTAGE_STATE_PATH,
      JSON.stringify({ blockedUntil }),
      'utf8'
    );
  } catch (error) {
    console.warn('Failed to persist Alpha Vantage state:', error.message);
  }
};

const alphaVantageState = loadAlphaVantageState();
alphaVantageBlockedUntil = alphaVantageState.blockedUntil || 0;

const setAlphaVantageBlockedUntil = (timestamp) => {
  alphaVantageBlockedUntil = timestamp;
  saveAlphaVantageState(timestamp);
};

// Fallback mock stock prices (used when API is unavailable)
// 100+ stocks across multiple sectors
const MOCK_STOCK_PRICES = {
  // Tech Giants
  AAPL: 185.50,   // Apple
  GOOGL: 140.25,  // Alphabet/Google
  GOOG: 141.80,   // Alphabet Class C
  MSFT: 378.90,   // Microsoft
  AMZN: 178.45,   // Amazon
  META: 505.60,   // Meta Platforms
  NVDA: 875.30,   // NVIDIA
  TSLA: 248.75,   // Tesla
  AMD: 165.30,    // AMD
  INTC: 42.80,    // Intel
  CRM: 275.50,    // Salesforce
  ORCL: 125.40,   // Oracle
  ADBE: 580.20,   // Adobe
  CSCO: 52.30,    // Cisco
  QCOM: 168.90,   // Qualcomm
  AVGO: 1320.50,  // Broadcom
  IBM: 185.60,    // IBM
  NOW: 785.40,    // ServiceNow
  SHOP: 78.50,    // Shopify
  UBER: 72.30,    // Uber
  LYFT: 16.80,    // Lyft
  ABNB: 145.60,   // Airbnb
  SQ: 75.40,      // Block (Square)
  TWLO: 65.40,    // Twilio
  ZM: 72.50,      // Zoom
  DOCU: 58.90,    // DocuSign
  SNOW: 165.40,   // Snowflake
  PLTR: 22.80,    // Palantir
  U: 28.50,       // Unity Software
  COIN: 175.60,   // Coinbase
  HOOD: 18.90,    // Robinhood
  
  // Semiconductors
  TSM: 142.30,    // TSMC
  ASML: 925.60,   // ASML
  MU: 92.40,      // Micron
  LRCX: 785.30,   // Lam Research
  KLAC: 620.40,   // KLA Corp
  AMAT: 185.60,   // Applied Materials
  MRVL: 68.90,    // Marvell
  ARM: 125.40,    // ARM Holdings
  
  // Finance & Banking
  JPM: 195.20,    // JPMorgan Chase
  V: 275.80,      // Visa
  MA: 455.60,     // Mastercard
  BAC: 35.80,     // Bank of America
  WFC: 52.40,     // Wells Fargo
  GS: 385.70,     // Goldman Sachs
  MS: 92.50,      // Morgan Stanley
  AXP: 215.30,    // American Express
  BLK: 795.40,    // BlackRock
  C: 58.90,       // Citigroup
  SCHW: 72.40,    // Charles Schwab
  PYPL: 62.80,    // PayPal
  SOFI: 8.90,     // SoFi
  AFRM: 42.30,    // Affirm
  
  // Healthcare & Pharma
  JNJ: 158.90,    // Johnson & Johnson
  UNH: 525.30,    // UnitedHealth
  PFE: 28.50,     // Pfizer
  ABBV: 165.70,   // AbbVie
  MRK: 125.40,    // Merck
  LLY: 785.60,    // Eli Lilly
  TMO: 545.20,    // Thermo Fisher
  BMY: 52.40,     // Bristol-Myers
  GILD: 82.30,    // Gilead
  AMGN: 285.60,   // Amgen
  MRNA: 98.40,    // Moderna
  BNTX: 105.80,   // BioNTech
  CVS: 78.90,     // CVS Health
  
  // Retail & Consumer
  WMT: 165.40,    // Walmart
  COST: 725.30,   // Costco
  HD: 365.80,     // Home Depot
  TGT: 145.60,    // Target
  NKE: 98.50,     // Nike
  SBUX: 95.40,    // Starbucks
  MCD: 295.70,    // McDonald's
  KO: 62.30,      // Coca-Cola
  PEP: 175.40,    // PepsiCo
  LOW: 225.60,    // Lowe's
  LULU: 485.30,   // Lululemon
  GPS: 22.40,     // Gap
  ROST: 145.80,   // Ross Stores
  TJX: 98.60,     // TJX Companies
  DG: 128.40,     // Dollar General
  DLTR: 142.30,   // Dollar Tree
  
  // Entertainment & Media
  DIS: 112.40,    // Disney
  NFLX: 625.50,   // Netflix
  SPOT: 285.60,   // Spotify
  WBD: 12.40,     // Warner Bros Discovery
  PARA: 15.80,    // Paramount
  CMCSA: 42.60,   // Comcast
  LYV: 105.40,    // Live Nation
  ROKU: 68.90,    // Roku
  
  // Energy & Industrial
  XOM: 108.90,    // Exxon Mobil
  CVX: 155.40,    // Chevron
  COP: 118.60,    // ConocoPhillips
  SLB: 52.40,     // Schlumberger
  BA: 215.60,     // Boeing
  CAT: 325.70,    // Caterpillar
  GE: 158.30,     // General Electric  
  HON: 205.40,    // Honeywell
  UPS: 145.60,    // UPS
  FDX: 275.80,    // FedEx
  RTX: 98.40,     // Raytheon
  LMT: 465.30,    // Lockheed Martin
  NOC: 485.60,    // Northrop Grumman
  DE: 385.40,     // John Deere
  MMM: 105.80,    // 3M
  
  // Electric Vehicles & Clean Energy
  RIVN: 18.50,    // Rivian
  LCID: 4.20,     // Lucid Motors
  NIO: 8.90,      // NIO
  XPEV: 12.40,    // XPeng
  LI: 28.60,      // Li Auto
  ENPH: 125.40,   // Enphase Energy
  SEDG: 72.30,    // SolarEdge
  FSLR: 175.60,   // First Solar
  PLUG: 4.80,     // Plug Power
  
  // Telecom
  T: 18.90,       // AT&T
  VZ: 42.30,      // Verizon
  TMUS: 165.40,   // T-Mobile
  
  // Gaming & Social
  RBLX: 42.50,    // Roblox
  EA: 138.60,     // Electronic Arts
  ATVI: 95.20,    // Activision Blizzard
  TTWO: 158.40,   // Take-Two Interactive
  SNAP: 15.80,    // Snap Inc
  PINS: 32.40,    // Pinterest
  RDDT: 125.60,   // Reddit
  MTCH: 35.80,    // Match Group
  
  // REITs
  AMT: 205.40,    // American Tower
  PLD: 128.60,    // Prologis
  SPG: 152.30,    // Simon Property
  O: 58.40,       // Realty Income
  
  // Food & Beverage
  MDLZ: 72.40,    // Mondelez
  KHC: 35.80,     // Kraft Heinz
  GIS: 68.90,     // General Mills
  K: 58.40,       // Kellanova
  HSY: 192.30,    // Hershey
  
  // Luxury & Fashion
  LVMUY: 165.40,  // LVMH
  
  // Singapore & Asia
  GRAB: 3.85,     // Grab Holdings
  SE: 45.60,      // Sea Limited
  BABA: 78.90,    // Alibaba
  JD: 28.40,      // JD.com
  PDD: 125.30,    // PDD Holdings
  BIDU: 98.60,    // Baidu
  NTES: 98.40,    // NetEase
  TME: 12.80,     // Tencent Music
  BILI: 15.40,    // Bilibili
  
  // Global/International
  TM: 185.40,     // Toyota
  SONY: 92.60,    // Sony
  NVO: 125.30,    // Novo Nordisk
  SAP: 195.40,    // SAP
  SHEL: 68.90,    // Shell
  BP: 38.40,      // BP
  
  // Crypto & Blockchain
  BTC: 42850.00,  // Bitcoin (simulated)
  ETH: 2650.00,   // Ethereum (simulated)
  SOL: 98.50,     // Solana (simulated)
  XRP: 0.62,      // Ripple (simulated)
  ADA: 0.58,      // Cardano (simulated)
  DOGE: 0.085,    // Dogecoin (simulated)
  DOT: 7.25,      // Polkadot (simulated)
  AVAX: 38.50,    // Avalanche (simulated)
  MATIC: 0.92,    // Polygon (simulated)
  LINK: 14.80,    // Chainlink (simulated)
  UNI: 7.45,      // Uniswap (simulated)
  SHIB: 0.000012, // Shiba Inu (simulated)
  LTC: 72.50,     // Litecoin (simulated)
  
  // Crypto ETFs & Trusts (Real Tickers)
  IBIT: 42.30,    // iShares Bitcoin Trust
  GBTC: 58.90,    // Grayscale Bitcoin Trust
  FBTC: 55.40,    // Fidelity Bitcoin ETF
  BITB: 35.60,    // Bitwise Bitcoin ETF
  ETHE: 28.40,    // Grayscale Ethereum Trust
  
  // Crypto-Related Stocks
  MSTR: 485.60,   // MicroStrategy (Bitcoin holder)
  MARA: 18.50,    // Marathon Digital (mining)
  RIOT: 12.40,    // Riot Platforms (mining)
  CLSK: 9.80,     // CleanSpark (mining)
  HUT: 8.50,      // Hut 8 Mining
  BITF: 2.85      // Bitfarms
};

// Fetch real stock price from Alpha Vantage
async function fetchRealStockPrice(ticker) {
  const upperTicker = ticker.toUpperCase();

  // Check cache first
  const cached = stockPriceCache[upperTicker];
  if (cached && (Date.now() - cached.timestamp) < STOCK_CACHE_TTL) {
    console.log(`Using cached price for ${upperTicker}: $${cached.price}`);
    return {
      ticker: upperTicker,
      price: cached.price,
      currency: 'USD',
      source: 'cache'
    };
  }

  if (Date.now() < alphaVantageBlockedUntil) {
    console.warn('Alpha Vantage is rate-limited; using mock data until cooldown ends');
    return getMockStockPrice(upperTicker);
  }

  // If no API key, use mock
  if (!ALPHA_VANTAGE_API_KEY || ALPHA_VANTAGE_API_KEY === 'your_alpha_vantage_api_key_here') {
    console.log(`No Alpha Vantage API key, using mock price for ${upperTicker}`);
    return getMockStockPrice(upperTicker);
  }

  if (alphaVantageRequestInFlight) {
    console.warn('Alpha Vantage request already in flight; using mock data');
    return getMockStockPrice(upperTicker);
  }

  try {
    alphaVantageRequestInFlight = true;
    setAlphaVantageBlockedUntil(Date.now() + RATE_LIMIT_COOLDOWN);
    // Alpha Vantage GLOBAL_QUOTE endpoint
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${upperTicker}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    console.log(`Fetching real price for ${upperTicker} from Alpha Vantage...`);
    const response = await fetch(url);
    const data = await response.json();

    // Check for rate limit or error
    if (data['Note'] || data['Information']) {
      console.warn('Alpha Vantage rate limit hit, using mock data');
      return getMockStockPrice(upperTicker);
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      console.warn(`No data found for ${upperTicker}, using mock`);
      return getMockStockPrice(upperTicker);
    }

    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']) || 0;
    const changePercent = quote['10. change percent'] || '0%';

    // Cache the result
    stockPriceCache[upperTicker] = {
      price: price,
      change: change,
      changePercent: changePercent,
      timestamp: Date.now()
    };

    console.log(`Real price for ${upperTicker}: $${price} (${changePercent})`);
    return {
      ticker: upperTicker,
      price: price,
      change: change,
      changePercent: changePercent,
      currency: 'USD',
      source: 'alpha_vantage'
    };

  } catch (error) {
    console.error(`Error fetching stock price for ${upperTicker}:`, error.message);
    return getMockStockPrice(upperTicker);
  } finally {
    alphaVantageRequestInFlight = false;
  }
}

// Get mock stock price (fallback)
function getMockStockPrice(ticker) {
  const upperTicker = ticker.toUpperCase();
  if (MOCK_STOCK_PRICES[upperTicker]) {
    // Add random variation for visible gains/losses (5-10%)
    const basePrice = MOCK_STOCK_PRICES[upperTicker];
    const variation = (Math.random() - 0.5) * 20; // +/- 10%
    return {
      ticker: upperTicker,
      price: basePrice * (1 + variation / 100),
      currency: 'USD',
      source: 'mock'
    };
  }
  return null;
}

// Main function to get stock price (async, tries real API first)
async function getStockPrice(ticker) {
  const upperTicker = ticker.toUpperCase();

  // Try to get real price
  const realPrice = await fetchRealStockPrice(upperTicker);
  if (realPrice) {
    return realPrice;
  }

  // Fallback to mock
  return getMockStockPrice(upperTicker);
}

// ------------------- ACCOUNT LOCK FUNCTIONS -------------------

async function setAccountLock(userId, locked) {
  if (!db) {
    throw new Error('Firebase not initialized');
  }
  
  try {
    const userDoc = await getUserDocument(userId);
    if (userDoc.error) {
      throw new Error(userDoc.error);
    }
    
    const userData = userDoc.data;
    const currentBalance = Number(userData.balance || 0);
    const currentLockedAmount = Number(userData.lockedAmount || 0);
    
    if (locked) {
      // Lock: Move all available balance to locked amount
      await db.collection('users').doc(userId).update({
        isLocked: true,
        balance: 0,
        lockedAmount: currentLockedAmount + currentBalance,
        lockUpdatedAt: new Date().toISOString()
      });
      
      console.log(`🔒 Locked $${currentBalance.toFixed(2)} for user ${userId}`);
      
      return { 
        success: true, 
        isLocked: true,
        amountLocked: currentBalance,
        newLockedAmount: currentLockedAmount + currentBalance,
        message: `Successfully locked $${currentBalance.toFixed(2)}. Your funds are now protected.`
      };
    } else {
      // Unlock: Move locked amount back to available balance
      await db.collection('users').doc(userId).update({
        isLocked: false,
        balance: currentBalance + currentLockedAmount,
        lockedAmount: 0,
        lockUpdatedAt: new Date().toISOString()
      });
      
      console.log(`🔓 Unlocked $${currentLockedAmount.toFixed(2)} for user ${userId}`);
      
      return { 
        success: true, 
        isLocked: false,
        amountUnlocked: currentLockedAmount,
        newBalance: currentBalance + currentLockedAmount,
        message: `Successfully unlocked $${currentLockedAmount.toFixed(2)}. Your funds are now available.`
      };
    }
  } catch (error) {
    throw new Error(`Failed to update lock status: ${error.message}`);
  }
}

async function getAccountLockStatus(userId) {
  const userDoc = await getUserDocument(userId);
  if (userDoc.error) {
    return { error: userDoc.error };
  }
  return { isLocked: userDoc.data.isLocked || false };
}

// ------------------- PORTFOLIO FUNCTIONS -------------------

async function getPortfolio(userId) {
  const userDoc = await getUserDocument(userId);
  if (userDoc.error) {
    return { error: userDoc.error };
  }

  const portfolio = userDoc.data.portfolio || [];

  // Enrich with current prices
  const enrichedPortfolio = await Promise.all(portfolio.map(async (holding) => {
    const currentPrice = await getStockPrice(holding.ticker);
    const currentValue = currentPrice ? holding.shares * currentPrice.price : holding.totalValue;
    const gainLoss = currentValue - (holding.shares * holding.avgPrice);
    const gainLossPercent = ((currentValue / (holding.shares * holding.avgPrice)) - 1) * 100;

    return {
      ...holding,
      currentPrice: currentPrice ? currentPrice.price : holding.avgPrice,
      currentValue: currentValue,
      gainLoss: gainLoss,
      gainLossPercent: gainLossPercent,
      source: currentPrice?.source || 'unknown'
    };
  }));

  const totalValue = enrichedPortfolio.reduce((sum, h) => sum + h.currentValue, 0);

  return {
    portfolio: enrichedPortfolio,
    totalValue: totalValue,
    holdingsCount: enrichedPortfolio.length
  };
}

async function buyStock(userId, ticker, dollarAmount) {
  const userDoc = await getUserDocument(userId);
  if (userDoc.error) {
    return { error: userDoc.error };
  }

  const userData = userDoc.data;

  // Check if account is locked
  if (userData.isLocked) {
    return { error: 'Account is locked. Please unlock your account to make transactions.' };
  }

  const currentBalance = Number(userData.balance || 0);
  if (currentBalance < dollarAmount) {
    return { error: `Insufficient balance. You have $${currentBalance.toFixed(2)} available.` };
  }

  const stockInfo = await getStockPrice(ticker);
  if (!stockInfo) {
    return { error: `Stock ticker "${ticker}" not found. Try AAPL, GOOGL, MSFT, TSLA, etc.` };
  }

  const shares = dollarAmount / stockInfo.price;
  const portfolio = userData.portfolio || [];

  // Find or create holding
  const existingIndex = portfolio.findIndex(p => p.ticker === stockInfo.ticker);

  if (existingIndex >= 0) {
    const existing = portfolio[existingIndex];
    const totalShares = existing.shares + shares;
    const totalCost = (existing.shares * existing.avgPrice) + dollarAmount;

    portfolio[existingIndex] = {
      ticker: stockInfo.ticker,
      shares: totalShares,
      avgPrice: totalCost / totalShares,
      totalValue: totalShares * stockInfo.price,
      lastUpdated: new Date().toISOString()
    };
  } else {
    portfolio.push({
      ticker: stockInfo.ticker,
      shares: shares,
      avgPrice: stockInfo.price,
      totalValue: dollarAmount,
      purchasedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
  }

  // Update user document
  const newBalance = currentBalance - dollarAmount;
  
  try {
    console.log('📊 Updating portfolio for user:', userId);
    console.log('📊 New balance:', newBalance);
    console.log('📊 Portfolio:', JSON.stringify(portfolio, null, 2));
    
    await db.collection('users').doc(userId).update({
      balance: newBalance,
      portfolio: portfolio
    });
    
    console.log('✅ Portfolio updated successfully');
  } catch (error) {
    console.error('❌ Failed to update portfolio:', error);
    throw new Error(`Failed to update portfolio: ${error.message}`);
  }

  return {
    success: true,
    ticker: stockInfo.ticker,
    shares: shares,
    price: stockInfo.price,
    amount: dollarAmount,
    newBalance: newBalance,
    message: `Successfully purchased ${shares.toFixed(4)} shares of ${stockInfo.ticker} at $${stockInfo.price.toFixed(2)} per share for $${dollarAmount.toFixed(2)}`
  };
}

async function sellStock(userId, ticker, amount, isByValue = false) {
  const userDoc = await getUserDocument(userId);
  if (userDoc.error) {
    return { error: userDoc.error };
  }

  const userData = userDoc.data;

  // Check if account is locked
  if (userData.isLocked) {
    return { error: 'Account is locked. Please unlock your account to make transactions.' };
  }

  const portfolio = userData.portfolio || [];
  const holdingIndex = portfolio.findIndex(p => p.ticker.toUpperCase() === ticker.toUpperCase());

  if (holdingIndex < 0) {
    return { error: `You don't own any ${ticker.toUpperCase()} shares.` };
  }

  const holding = portfolio[holdingIndex];
  const stockInfo = await getStockPrice(ticker);
  const currentPrice = stockInfo ? stockInfo.price : holding.avgPrice;

  let sharesToSell;
  if (isByValue) {
    sharesToSell = amount / currentPrice;
  } else {
    sharesToSell = amount;
  }

  // Handle "all" or excessive shares
  let actualSharesToSell = sharesToSell;
  if (sharesToSell >= holding.shares || sharesToSell === -1) {
    actualSharesToSell = holding.shares;
  }

  if (actualSharesToSell > holding.shares) {
    return { error: `Insufficient shares. You only have ${holding.shares.toFixed(4)} shares of ${ticker.toUpperCase()}.` };
  }

  const saleAmount = actualSharesToSell * currentPrice;
  const newBalance = Number(userData.balance || 0) + saleAmount;

  // Update portfolio
  if (actualSharesToSell >= holding.shares) {
    portfolio.splice(holdingIndex, 1);
  } else {
    portfolio[holdingIndex] = {
      ...holding,
      shares: holding.shares - actualSharesToSell,
      totalValue: (holding.shares - actualSharesToSell) * currentPrice,
      lastUpdated: new Date().toISOString()
    };
  }

  // Update Firestore
  try {
    await db.collection('users').doc(userId).update({
      balance: newBalance,
      portfolio: portfolio
    });
  } catch (error) {
    throw new Error(`Failed to update portfolio: ${error.message}`);
  }

  return {
    success: true,
    ticker: ticker.toUpperCase(),
    shares: actualSharesToSell,
    price: currentPrice,
    amount: saleAmount,
    newBalance: newBalance,
    message: `Successfully sold ${actualSharesToSell.toFixed(4)} shares of ${ticker.toUpperCase()} at $${currentPrice.toFixed(2)} per share for $${saleAmount.toFixed(2)}`
  };
}

// ------------------- CURRENCY EXCHANGE EXECUTION -------------------

async function performCurrencyExchange(userId, fromCurrency, toCurrency, amount) {
  const userDoc = await getUserDocument(userId);
  if (userDoc.error) {
    return { error: userDoc.error };
  }

  const userData = userDoc.data;

  // Check if account is locked
  if (userData.isLocked) {
    return { error: 'Account is locked. Please unlock your account to make transactions.' };
  }

  // Only check balance if converting FROM SGD
  if (fromCurrency.toUpperCase() === 'SGD') {
    const currentBalance = Number(userData.balance || 0);
    if (currentBalance < amount) {
      return { error: `Insufficient SGD balance. You have $${currentBalance.toFixed(2)} available.` };
    }
  } else {
    // Check foreign currency balance
    const foreignCurrencies = userData.foreignCurrencies || {};
    const fromBalance = Number(foreignCurrencies[fromCurrency.toUpperCase()] || 0);
    if (fromBalance < amount) {
      return { error: `Insufficient ${fromCurrency.toUpperCase()} balance. You have ${fromBalance.toFixed(2)} available.` };
    }
  }

  // Get exchange rate
  const conversionResult = await convertCurrency(fromCurrency, toCurrency, amount);
  if (conversionResult.error) {
    return { error: conversionResult.error };
  }

  // Get current foreign currencies
  const foreignCurrencies = userData.foreignCurrencies || {};
  
  // Deduct from source and add to target
  if (fromCurrency.toUpperCase() === 'SGD') {
    // SGD -> Foreign: Deduct SGD, add to foreign currency
    const newBalance = Number(userData.balance || 0) - amount;
    const targetCurrency = toCurrency.toUpperCase();
    foreignCurrencies[targetCurrency] = (Number(foreignCurrencies[targetCurrency] || 0)) + conversionResult.toAmount;
    
    await db.collection('users').doc(userId).update({
      balance: newBalance,
      foreignCurrencies: foreignCurrencies
    });

    return {
      success: true,
      ...conversionResult,
      newBalance: newBalance,
      foreignCurrencies: foreignCurrencies,
      message: `Successfully exchanged ${amount.toFixed(2)} SGD to ${conversionResult.toAmount.toFixed(2)} ${targetCurrency}. Your SGD balance is now $${newBalance.toFixed(2)}. Your ${targetCurrency} balance is now ${foreignCurrencies[targetCurrency].toFixed(2)}.`
    };
  } else if (toCurrency.toUpperCase() === 'SGD') {
    // Foreign -> SGD: Deduct foreign, add to SGD
    const sourceCurrency = fromCurrency.toUpperCase();
    foreignCurrencies[sourceCurrency] = (Number(foreignCurrencies[sourceCurrency] || 0)) - amount;
    
    // Remove if zero
    if (foreignCurrencies[sourceCurrency] <= 0) {
      delete foreignCurrencies[sourceCurrency];
    }
    
    const newBalance = Number(userData.balance || 0) + conversionResult.toAmount;
    
    await db.collection('users').doc(userId).update({
      balance: newBalance,
      foreignCurrencies: foreignCurrencies
    });

    return {
      success: true,
      ...conversionResult,
      newBalance: newBalance,
      foreignCurrencies: foreignCurrencies,
      message: `Successfully exchanged ${amount.toFixed(2)} ${sourceCurrency} to ${conversionResult.toAmount.toFixed(2)} SGD. Your SGD balance is now $${newBalance.toFixed(2)}.`
    };
  } else {
    // Foreign -> Foreign
    const sourceCurrency = fromCurrency.toUpperCase();
    const targetCurrency = toCurrency.toUpperCase();
    
    foreignCurrencies[sourceCurrency] = (Number(foreignCurrencies[sourceCurrency] || 0)) - amount;
    if (foreignCurrencies[sourceCurrency] <= 0) {
      delete foreignCurrencies[sourceCurrency];
    }
    
    foreignCurrencies[targetCurrency] = (Number(foreignCurrencies[targetCurrency] || 0)) + conversionResult.toAmount;
    
    await db.collection('users').doc(userId).update({
      foreignCurrencies: foreignCurrencies
    });

    return {
      success: true,
      ...conversionResult,
      foreignCurrencies: foreignCurrencies,
      message: `Successfully exchanged ${amount.toFixed(2)} ${sourceCurrency} to ${conversionResult.toAmount.toFixed(2)} ${targetCurrency}.`
    };
  }
}

async function runFirestoreQuery(structuredQuery) {
  const url = `${FIRESTORE_BASE_URL}/documents:runQuery`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Firestore query failed: ${errorBody}`);
  }

  const raw = (await response.text()).trim();
  if (!raw) return [];

  // First, try parsing as regular JSON (array or single object)
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      return [parsed];
    }
  } catch (error) {
    // Not regular JSON, fall back to NDJSON parsing below.
  }

  // Fallback: handle newline-delimited JSON (NDJSON) responses
  const chunks = raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.replace(/^[\[,]+/, '').replace(/[\],]+$/, ''))
    .filter(Boolean);

  const results = [];
  for (const chunk of chunks) {
    try {
      results.push(JSON.parse(chunk));
    } catch (error) {
      console.error('Failed to parse Firestore query chunk:', chunk);
    }
  }

  return results;
}

async function findRecipientByIdentifier(identifier) {
  if (!identifier) return null;

  const trimmed = String(identifier).trim();
  if (!trimmed) return null;

  const digitsOnly = trimmed.replace(/\D/g, '');
  const candidateValues = Array.from(new Set([trimmed, trimmed.replace(/\s+/g, ''), digitsOnly])).filter(Boolean);
  const fieldsToCheck = ['phoneNumber', 'accountNumber'];

  for (const value of candidateValues) {
    for (const field of fieldsToCheck) {
      try {
        const results = await runFirestoreQuery({
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: field },
              op: 'EQUAL',
              value: { stringValue: value }
            }
          },
          limit: 1
        });

        const match = results.find(entry => entry.document);
        if (match && match.document) {
          const docNameParts = match.document.name.split('/');
          const userId = docNameParts[docNameParts.length - 1];
          return {
            id: userId,
            data: parseFirestoreFields(match.document.fields || {})
          };
        }
      } catch (error) {
        console.error(`Failed to search users by ${field}:`, error);
      }
    }
  }

  return null;
}

async function createChatbotTransactionRecord(transactionData) {
  const url = `${FIRESTORE_BASE_URL}/documents/transactions`;
  const fields = {
    userId: { stringValue: transactionData.userId },
    type: { stringValue: transactionData.type || 'chatbot_transfer' },
    status: { stringValue: transactionData.status || 'completed' },
    amount: { doubleValue: Number(transactionData.amount) },
    recipientName: { stringValue: transactionData.recipientName || '' },
    recipientNumber: { stringValue: transactionData.recipientNumber || '' },
    message: { stringValue: transactionData.message || '' },
    accountNumber: { stringValue: transactionData.accountNumber || '' },
    accountName: { stringValue: transactionData.accountName || '' },
    transactionId: { stringValue: transactionData.transactionId },
    createdAt: { timestampValue: transactionData.createdAt },
    completedAt: { timestampValue: transactionData.completedAt },
    channel: { stringValue: 'ai_chatbot' }
  };

  if (transactionData.note) {
    fields.note = { stringValue: transactionData.note };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to record transaction: ${errorBody}`);
  }
}

async function checkUserHasHelper(userId) {
  try {
    // Query accountAccess for active helpers for this owner
    const results = await runFirestoreQuery({
      from: [{ collectionId: 'accountAccess' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'ownerId' },
                op: 'EQUAL',
                value: { stringValue: userId }
              }
            },
            {
              fieldFilter: {
                field: { fieldPath: 'status' },
                op: 'EQUAL',
                value: { stringValue: 'active' }
              }
            }
          ]
        }
      }
    });

    const helpers = results
      .map(entry => {
        if (!entry.document) return null;
        return {
          id: entry.document.name.split('/').pop(),
          data: parseFirestoreFields(entry.document.fields || {})
        };
      })
      .filter(Boolean);

    // Find a helper with approval permissions
    // Note: We assume if they are an active helper, they can approve. 
    // But ideally we check permissions.approveRequests == true.
    // Firestore query structure for map fields is complex, so we filter in memory.
    const eligibleHelper = helpers.find(h =>
      h.data.permissions && h.data.permissions.approveRequests === true
    );

    return eligibleHelper;
  } catch (error) {
    console.error('Error checking for helper:', error);
    return null;
  }
}

async function createBackendTransactionApprovalRequest(requestData) {
  const url = `${FIRESTORE_BASE_URL}/documents/transactionApprovals`;
  const fields = {
    accessId: { stringValue: requestData.accessId },
    ownerId: { stringValue: requestData.ownerId },
    userId: { stringValue: requestData.userId }, // The helper's ID
    amount: { doubleValue: Number(requestData.amount) },
    recipientName: { stringValue: requestData.recipientName },
    recipientNumber: { stringValue: requestData.recipientNumber },
    message: { stringValue: requestData.message || "" },
    accountNumber: { stringValue: requestData.accountNumber || "" },
    accountName: { stringValue: requestData.accountName || "" },
    requestedBy: { stringValue: "owner" },
    approverId: { stringValue: requestData.approverId }, // The helper's ID
    status: { stringValue: "pending" },
    createdAt: { timestampValue: new Date().toISOString() },
    source: { stringValue: "chatbot" } // Mark as chatbot source
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create approval request: ${errorBody}`);
  }

  return await response.json();
}

async function performSendMoney({ userId, recipientIdentifier, amount, note }) {
  try {
    if (!recipientIdentifier) {
      return { error: 'Recipient identifier is required.' };
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return { error: 'Amount must be a positive number.' };
    }

    const roundedAmount = Math.round(numericAmount * 100) / 100;

    // 1. Check if user has a helper (Mandatory for Chatbot)
    const helper = await checkUserHasHelper(userId);

    if (!helper) {
      return {
        error: 'Security Restriction: You must have a trusted helper (Shared Access) to use Chatbot payments. Please add a helper via the "Shared Access" feature in the app settings.'
      };
    }

    const senderDoc = await getUserDocument(userId);
    if (senderDoc.error) {
      return { error: senderDoc.error };
    }

    const senderData = senderDoc.data || {};
    const currentBalance = Number(senderData.balance || 0);

    if (currentBalance < roundedAmount) {
      return { error: 'Insufficient balance for this transfer.' };
    }

    const recipient = await findRecipientByIdentifier(recipientIdentifier);
    if (!recipient) {
      return { error: 'Recipient account was not found.' };
    }

    if (recipient.id === userId) {
      return { error: 'You cannot transfer money to yourself.' };
    }

    const recipientData = recipient.data || {};

    // 2. Create Approval Request instead of executing transaction
    try {
      await createBackendTransactionApprovalRequest({
        accessId: helper.id,
        ownerId: userId,
        userId: helper.data.userId, // The helper's User ID
        amount: roundedAmount,
        recipientName: recipientData.name || '',
        recipientNumber: recipientData.phoneNumber || recipientData.accountNumber || String(recipientIdentifier),
        message: note || '',
        accountNumber: senderData.accountNumber || '',
        accountName: senderData.accountName || 'OCBC Account',
        approverId: helper.data.userId // Helper must approve
      });

      return {
        success: true,
        message: `Approval Request Sent! Your helper ${helper.data.userName || 'User'} needs to approve this transaction of $${roundedAmount} before it is processed.`,
        requiresApproval: true,
        amount: roundedAmount,
        recipient: recipientData.name || recipientIdentifier
      };

    } catch (approvalError) {
      console.error("Failed to create approval request:", approvalError);
      return { error: "Failed to create approval request. Please try again." };
    }

  } catch (error) {
    console.error('Error performing send money:', error);
    return { error: 'Failed to send money. Please try again later.' };
  }
}

// Function declarations for Gemini
const functions = {
  check_balance: async (userId) => {
    const balanceData = await getUserBalance(userId);
    if (balanceData.error) {
      return JSON.stringify({ error: balanceData.error });
    }

    // Also get lock status
    const lockStatus = await getAccountLockStatus(userId);
    
    // Get full user data for foreign currencies
    const userDoc = await getUserDocument(userId);
    const foreignCurrencies = userDoc.data?.foreignCurrencies || {};

    return JSON.stringify({
      available_balance: balanceData.balance,
      locked_amount: balanceData.lockedAmount,
      total_balance: balanceData.totalBalance,
      account_locked: lockStatus.isLocked || false,
      foreign_currencies: foreignCurrencies,
      message: Object.keys(foreignCurrencies).length > 0 
        ? `SGD Balance: $${balanceData.balance.toFixed(2)}. Foreign currencies: ${Object.entries(foreignCurrencies).map(([k,v]) => `${v.toFixed(2)} ${k}`).join(', ')}`
        : `SGD Balance: $${balanceData.balance.toFixed(2)}`
    });
  },

  send_money: async ({ userId, recipientIdentifier, amount, note, advancedSettings = {} }) => {
    // Check if account is locked first
    const lockStatus = await getAccountLockStatus(userId);
    if (lockStatus.isLocked) {
      return JSON.stringify({ error: 'Account is locked. Please unlock your account to make transfers.' });
    }

    const transferResult = await performSendMoneyWithShortcuts({
      userId,
      recipientIdentifier,
      amount,
      note,
      advancedSettings
    });
    return JSON.stringify(transferResult);
  },

  exchange_currency: async ({ userId, fromCurrency, toCurrency, amount }) => {
    const result = await performCurrencyExchange(userId, fromCurrency, toCurrency, amount);
    return JSON.stringify(result);
  },

  manage_investment: async ({ userId, action, ticker, amount, amountType }) => {
    if (action === 'buy') {
      const result = await buyStock(userId, ticker, amount);
      return JSON.stringify(result);
    } else if (action === 'sell') {
      // Default to shares if not specified, but check amountType for backward compatibility
      const isByValue = amountType === 'currency'; 
      const result = await sellStock(userId, ticker, amount, isByValue);
      return JSON.stringify(result);
    } else {
      return JSON.stringify({ error: 'Invalid action. Use "buy" or "sell".' });
    }
  },

  withdraw_investment: async ({ userId, ticker, amount }) => {
    // Always sell by value (currency)
    const result = await sellStock(userId, ticker, amount, true);
    return JSON.stringify(result);
  },

  set_account_lock: async ({ userId, locked }) => {
    try {
      const result = await setAccountLock(userId, locked);
      return JSON.stringify({
        success: true,
        isLocked: locked,
        message: locked
          ? 'Your account has been locked. All transactions (transfers, investments, exchanges) are now blocked until you unlock it.'
          : 'Your account has been unlocked. You can now make transactions normally.'
      });
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },

  get_portfolio: async ({ userId }) => {
    const result = await getPortfolio(userId);
    if (result.error) {
      return JSON.stringify({ error: result.error });
    }
    return JSON.stringify({
      portfolio: result.portfolio,
      total_value: result.totalValue,
      holdings_count: result.holdingsCount,
      message: result.holdingsCount > 0
        ? `You have ${result.holdingsCount} investment(s) worth $${result.totalValue.toFixed(2)} total.`
        : 'You have no investments in your portfolio yet.'
    });
  },

  get_exchange_rate: async ({ fromCurrency, toCurrency, amount }) => {
    const result = await convertCurrency(fromCurrency, toCurrency, amount || 1);
    if (result.error) {
      return JSON.stringify({ error: result.error });
    }
    return JSON.stringify({
      fromCurrency: result.fromCurrency,
      toCurrency: result.toCurrency,
      rate: result.exchangeRate,
      amount: amount || 1,
      converted: result.toAmount,
      message: `1 ${result.fromCurrency} = ${result.exchangeRate.toFixed(4)} ${result.toCurrency}`
    });
  }
};

// Function declarations for Gemini AI
const functionDeclarations = [
  {
    name: 'check_balance',
    description: 'Check the user\'s account balance, including available balance, locked amount, total balance, and account lock status',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'send_money',
    description: 'Transfer money from the authenticated user to another OCBC account using a phone or account number. Will fail if account is locked.',
    parameters: {
      type: 'object',
      properties: {
        recipientIdentifier: {
          type: 'string',
          description: 'Phone number, PayNow ID, or account number belonging to the recipient'
        },
        amount: {
          type: 'number',
          description: 'Amount (in SGD) to transfer to the recipient'
        },
        note: {
          type: 'string',
          description: 'Optional note or message for the transfer'
        }
      },
      required: ['recipientIdentifier', 'amount']
    }
  },
  {
    name: 'exchange_currency',
    description: 'Convert money from one currency to another using real-time exchange rates. If converting FROM SGD, the amount will be deducted from the user\'s balance. Supported currencies: SGD, USD, EUR, GBP, JPY, AUD, CNY, MYR, THB, HKD, KRW, INR.',
    parameters: {
      type: 'object',
      properties: {
        fromCurrency: {
          type: 'string',
          description: 'Source currency code (e.g., SGD, USD, EUR)'
        },
        toCurrency: {
          type: 'string',
          description: 'Target currency code (e.g., USD, EUR, JPY)'
        },
        amount: {
          type: 'number',
          description: 'Amount in the source currency to convert'
        }
      },
      required: ['fromCurrency', 'toCurrency', 'amount']
    }
  },
  {
    name: 'manage_investment',
    description: 'Buy stocks (invest dollar amount) or sell stocks by SHARE COUNT. To sell by dollar amount, use "withdraw_investment" instead.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['buy', 'sell'],
          description: 'Whether to buy or sell'
        },
        ticker: {
          type: 'string',
          description: 'Stock ticker symbol'
        },
        amount: {
          type: 'number',
          description: 'For buy: dollar amount. For sell: number of shares.'
        }
      },
      required: ['action', 'ticker', 'amount']
    }
  },
  {
    name: 'withdraw_investment',
    description: 'Sell a specific DOLLAR AMOUNT of a stock (e.g., "withdraw $1000 from NVDA"). Calculates fractional shares automatically.',
    parameters: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description: 'Stock ticker symbol to sell from'
        },
        amount: {
          type: 'number',
          description: 'Dollar amount to withdraw/sell'
        }
      },
      required: ['ticker', 'amount']
    }
  },
  {
    name: 'set_account_lock',
    description: 'Lock or unlock the user\'s account. When locked, all transactions (transfers, investments, currency exchanges) will be blocked for safety. Use this when the user wants to freeze their account or protect against unauthorized transactions.',
    parameters: {
      type: 'object',
      properties: {
        locked: {
          type: 'boolean',
          description: 'Set to true to lock the account, false to unlock it'
        }
      },
      required: ['locked']
    }
  },
  {
    name: 'get_portfolio',
    description: 'Get the user\'s current investment portfolio showing all stock holdings, current values, and gains/losses.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_exchange_rate',
    description: 'Get the current exchange rate between two currencies without performing an actual exchange. Use this to check rates before exchanging.',
    parameters: {
      type: 'object',
      properties: {
        fromCurrency: {
          type: 'string',
          description: 'Source currency code (e.g., SGD, USD)'
        },
        toCurrency: {
          type: 'string',
          description: 'Target currency code (e.g., USD, EUR)'
        },
        amount: {
          type: 'number',
          description: 'Optional amount to calculate conversion for (defaults to 1)'
        }
      },
      required: ['fromCurrency', 'toCurrency']
    }
  }
];

// Helper function to retry API calls
async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 503 && i < maxRetries - 1) {
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId, chatHistory = [], advancedSettings = {} } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ error: 'Message and userId are required' });
    }

    // Fetch user portfolio context
    let portfolioContext = "";
    try {
      const portfolioData = await getPortfolio(userId);
      if (portfolioData && portfolioData.portfolio && portfolioData.portfolio.length > 0) {
        const holdingsSummary = portfolioData.portfolio
          .map(h => `${h.ticker} (${h.shares.toFixed(4)} shares, $${h.currentValue.toFixed(2)})`)
          .join(', ');
        portfolioContext = ` User's current portfolio: ${holdingsSummary}.`;
      } else {
        portfolioContext = " User currently has no stock holdings.";
      }
    } catch (err) {
      console.error("Error fetching portfolio for context:", err);
    }

    // Build enhanced system prompt with advanced settings
    let systemPrompt = `You are a professional and helpful AI banking assistant for OCBC Bank Singapore.`;
    
    // Add personalization based on advanced settings
    if (advancedSettings.botName) {
      systemPrompt += ` Your name is ${advancedSettings.botName}.`;
    } else {
      systemPrompt += ` Your name is OCBC AI Assistant.`;
    }

    // Add language preference
    if (advancedSettings.language && advancedSettings.language !== 'english') {
      const languageMap = {
        'chinese': 'Chinese (Simplified)',
        'malay': 'Malay',
        'tamil': 'Tamil'
      };
      systemPrompt += ` Please respond primarily in ${languageMap[advancedSettings.language] || 'English'}, but you can use English for technical banking terms when needed.`;
    }

    // Add simple mode for accessibility
    if (advancedSettings.simpleMode) {
      systemPrompt += ` IMPORTANT: The user has enabled Simple Mode. Please provide responses that are:
- Clear and easy to understand
- Use simple language and avoid complex banking jargon
- Break down complex information into simple steps
- Use shorter sentences
- Be more explicit and detailed in explanations`;
    }

    // Add safety profile considerations
    if (advancedSettings.safetyProfile) {
      const safetyMap = {
        'high': ' Be extra cautious with transactions, always double-confirm amounts and recipients, and provide additional security reminders.',
        'family': ' Be patient and provide clear, step-by-step explanations. Avoid complex financial jargon.',
        'elderly': ' Use simple language, provide extra confirmation steps, and be very patient with explanations. Always confirm transaction details clearly.'
      };
      systemPrompt += safetyMap[advancedSettings.safetyProfile] || '';
    }

    // Add family member context from both advanced settings and database
    let familyShortcutsContext = '';
    
    // Get family shortcuts from database
    const userFamilyShortcuts = await getUserFamilyShortcuts(userId);
    if (userFamilyShortcuts.length > 0) {
      familyShortcutsContext += ` You can help users send money using their family member shortcuts: `;
      userFamilyShortcuts.forEach(shortcut => {
        familyShortcutsContext += `"${shortcut.quickPhrase}" refers to ${shortcut.name}${shortcut.relationship ? ` (${shortcut.relationship})` : ''} at ${shortcut.email}. `;
      });
      familyShortcutsContext += `When users say phrases like these, use them directly as the recipientIdentifier in send_money function.`;
    }
    
    // Also check advanced settings for chatbot customization family members
    if (advancedSettings.familyMembers && advancedSettings.familyMembers.length > 0) {
      if (!familyShortcutsContext) {
        familyShortcutsContext += ` The user has configured these family member shortcuts: `;
      } else {
        familyShortcutsContext += ` Additional shortcuts from chatbot settings: `;
      }
      advancedSettings.familyMembers.forEach(member => {
        if (member.name && member.shortcut) {
          const emailInfo = member.email ? ` at ${member.email}` : '';
          const relationshipInfo = member.relationship ? ` (${member.relationship})` : '';
          familyShortcutsContext += `"${member.shortcut}" refers to ${member.name}${relationshipInfo}${emailInfo}. `;
        }
      });
      familyShortcutsContext += `When the user mentions these shortcuts, use the email address as the recipientIdentifier if available, otherwise use the shortcut phrase.`;
    }
    
    if (familyShortcutsContext) {
      systemPrompt += familyShortcutsContext;
    }

    // Add personal information context
    if (advancedSettings.personalInfo) {
      const { nickname, occupation, aboutYou } = advancedSettings.personalInfo;
      
      console.log('Processing personalInfo:', { nickname, occupation, aboutYou });
      
      if (nickname) {
        systemPrompt += ` The user prefers to be called "${nickname}".`;
      }
      
      if (occupation) {
        systemPrompt += ` The user works as a ${occupation}.`;
      }
      
      if (aboutYou) {
        systemPrompt += ` Additional context about the user: ${aboutYou}`;
      }
      
      if (aboutYou) {
        systemPrompt += ` Additional context about the user: ${aboutYou}`;
      }
      
      // If any personal info is provided, add instruction to use it
      if (nickname || occupation || aboutYou) {
        systemPrompt += ` Use this personal information to provide more personalized and relevant responses when appropriate.`;
      }
    }

    // Add portfolio context
    systemPrompt += portfolioContext;

    // Add memory settings context
    if (advancedSettings.memorySettings) {
      if (advancedSettings.memorySettings.personalizedResponses) {
        systemPrompt += ` Remember the user's preferences and provide personalized responses based on their past interactions.`;
      }
      if (advancedSettings.memorySettings.contextAwareness) {
        systemPrompt += ` Be aware of the conversation context and refer back to previous messages when relevant.`;
      }
    }

    systemPrompt += `

CAPABILITIES:
1. CHECK BALANCE - View account balance, foreign currency holdings, locked amounts, and lock status
2. SEND MONEY - Transfer funds to other accounts (blocked if account is locked)
3. EXCHANGE CURRENCY - Convert between currencies (SGD, USD, EUR, GBP, JPY, AUD, CNY, MYR, THB, HKD, KRW, INR) with real-time rates
4. MANAGE INVESTMENTS - Buy/sell 65+ stocks across multiple sectors
5. LOCK/UNLOCK ACCOUNT - Freeze or unfreeze the account for security
6. VIEW PORTFOLIO - See current investment holdings and performance
7. CHECK EXCHANGE RATES - Get current rates without exchanging

AVAILABLE STOCKS BY SECTOR:
- TECH: AAPL (Apple), GOOGL (Google), MSFT (Microsoft), AMZN (Amazon), META, NVDA, TSLA, AMD, INTC, CRM, ORCL, ADBE, CSCO, QCOM, AVGO
- FINANCE: JPM (JPMorgan), V (Visa), MA (Mastercard), BAC, WFC, GS (Goldman), MS, AXP, BLK, PYPL, SQ
- HEALTHCARE: JNJ, UNH, PFE (Pfizer), ABBV, MRK (Merck), LLY, TMO
- RETAIL: WMT (Walmart), COST (Costco), HD, TGT, NKE (Nike), SBUX, MCD, KO (Coca-Cola), PEP
- ENTERTAINMENT: DIS (Disney), NFLX (Netflix), SPOT (Spotify), WBD, PARA
- ENERGY/INDUSTRIAL: XOM, CVX, BA (Boeing), CAT, GE, HON, UPS, FDX
- EV/CLEAN ENERGY: RIVN, LCID, NIO, ENPH
- GAMING/SOCIAL: RBLX, EA, ATVI, SNAP, PINS
- ASIA: GRAB, SE, BABA (Alibaba), JD, PDD

GUIDELINES:
- Be friendly, professional, and concise
- Always confirm transaction details before executing
- Explain what you're doing when performing actions
- Always use the appropriate tools - never make up balances or rates
- Format currency amounts with 2 decimal places
- When user asks to invest, buy stocks, or make investments, use the manage_investment function with action "buy"
- When user asks what they can do or for help, list the available features

INVESTMENT ADVICE - You CAN and SHOULD provide investment recommendations:
- When user asks "what should I invest in" or asks for recommendations, PROVIDE helpful suggestions
- Base recommendations on their stated risk tolerance and budget
- For CONSERVATIVE risk: Suggest stable dividend stocks like JNJ, KO, WMT, V, JPM, MSFT
- For MODERATE risk: Suggest growth stocks like AAPL, GOOGL, DIS, COST, HD, MA
- For AGGRESSIVE risk: Suggest high-growth stocks like TSLA, NVDA, AMD, META, RIVN, NIO, GRAB
- For ASIA exposure: Suggest GRAB, SE, BABA, JD for regional diversification
- If user provides a budget, suggest appropriate allocation with 2-4 stocks for diversification
- Always explain WHY you're recommending certain stocks (industry position, growth potential, etc.)
- After making a recommendation, offer to execute the investment for them

ERROR HANDLING - Always provide helpful responses for these scenarios:
- INSUFFICIENT BALANCE: If the user doesn't have enough SGD or foreign currency, explain their current balance and suggest a smaller amount
- LOCKED ACCOUNT: If the account is locked and they try a transaction, explain that they need to unlock it first by saying "unlock my account"
- INVALID CURRENCY: If they request an unsupported currency, list the supported currencies (SGD, USD, EUR, GBP, JPY, AUD, CNY, MYR, THB, HKD, KRW, INR)
- INVALID STOCK: If they request an unsupported stock ticker, list some popular options (AAPL, GOOGL, MSFT, AMZN, TSLA, META, NVDA)
- INSUFFICIENT SHARES: If they try to sell more shares than they own, tell them their current holding
- NO PORTFOLIO: If they ask about portfolio but have none, suggest buying some stocks

The user's ID is: ${userId}`;

    // Build tools list in OpenAI ID format
    const tools = functionDeclarations.map(fn => ({
      type: 'function',
      function: {
        name: fn.name,
        description: fn.description,
        parameters: {
          type: 'object',
          properties: fn.parameters.properties,
          required: fn.parameters.required
        }
      }
    }));

    // Build chat history with OpenAI roles
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach((msg, index) => {
        // Skip first assistant message if it's the welcome message (optional check)
        if (index === 0 && msg.role === 'assistant') return;
        
        // Map roles: 'user' -> 'user', 'assistant'/'model' -> 'assistant'
        const role = (msg.role === 'assistant' || msg.role === 'model') ? 'assistant' : 'user';
        messages.push({ role, content: msg.content });
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    let maxSteps = 10;
    let finalContent = "";

    // Chat loop for handling tool calls
    while (maxSteps > 0) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter
            "X-Title": "OCBC Digital Banking AI" // Required by OpenRouter
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b:free",
            messages: messages,
            tools: tools,
            reasoning: {
              enabled: true
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices[0];
        const responseMessage = choice.message;

        // Add assistant response to history
        messages.push(responseMessage);

        if (responseMessage.tool_calls) {
          console.log(`OpenRouter: Processing ${responseMessage.tool_calls.length} tool calls`);
          
          for (const toolCall of responseMessage.tool_calls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            const toolCallId = toolCall.id;

            console.log('Function called:', functionName, functionArgs);

            let functionResult;
            try {
              switch (functionName) {
                case 'check_balance':
                  functionResult = await functions.check_balance(userId);
                  break;
                case 'send_money':
                  functionResult = await functions.send_money({
                    userId,
                    recipientIdentifier: functionArgs.recipientIdentifier,
                    amount: functionArgs.amount,
                    note: functionArgs.note,
                    advancedSettings
                  });
                  break;
                case 'exchange_currency':
                  functionResult = await functions.exchange_currency({
                    userId,
                    fromCurrency: functionArgs.fromCurrency,
                    toCurrency: functionArgs.toCurrency,
                    amount: functionArgs.amount
                  });
                  break;
                case 'manage_investment':
                  functionResult = await functions.manage_investment({
                    userId,
                    action: functionArgs.action,
                    ticker: functionArgs.ticker,
                    amount: functionArgs.amount,
                    amountType: functionArgs.amountType
                  });
                  break;
                case 'withdraw_investment':
                  functionResult = await functions.withdraw_investment({
                    userId,
                    ticker: functionArgs.ticker,
                    amount: functionArgs.amount
                  });
                  break;
                case 'set_account_lock':
                  functionResult = await functions.set_account_lock({
                    userId,
                    locked: functionArgs.locked
                  });
                  break;
                case 'get_portfolio':
                  functionResult = await functions.get_portfolio({ userId });
                  break;
                case 'get_exchange_rate':
                  functionResult = await functions.get_exchange_rate({
                    fromCurrency: functionArgs.fromCurrency,
                    toCurrency: functionArgs.toCurrency,
                    amount: functionArgs.amount
                  });
                  break;
                default:
                  functionResult = JSON.stringify({ error: `Function ${functionName} is not implemented.` });
              }
            } catch (err) {
              console.error(`Error executing tool ${functionName}:`, err);
              functionResult = JSON.stringify({ error: `Execution error: ${err.message}` });
            }

            // Append tool result to messages
            messages.push({
              role: "tool",
              tool_call_id: toolCallId,
              name: functionName,
              content: functionResult
            });
          }
          // Loop will continue to send tool results back to model
        } else {
          // No tool calls, we have the final answer
          finalContent = responseMessage.content;
          break;
        }

        maxSteps--;
      } catch (error) {
        console.error("OpenRouter Loop Error:", error);
        throw error;
      }
    }

    res.json({
      message: finalContent || "Sorry, I couldn't generate a response.",
      success: true
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Portfolio endpoint with live prices
app.get('/api/portfolio/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userDoc = await getUserDocument(userId);
    if (userDoc.error) {
      return res.status(404).json({ error: userDoc.error });
    }

    const portfolio = userDoc.data.portfolio || [];
    
    // Enrich portfolio with live prices
    const enrichedPortfolio = await Promise.all(
      portfolio.map(async (holding) => {
        const livePrice = await getStockPrice(holding.ticker);
        const currentPrice = livePrice ? livePrice.price : holding.avgPrice;
        const currentValue = holding.shares * currentPrice;
        const costBasis = holding.shares * holding.avgPrice;
        const gainLoss = currentValue - costBasis;
        const gainLossPercent = costBasis > 0 ? ((gainLoss / costBasis) * 100) : 0;

        return {
          ticker: holding.ticker,
          shares: holding.shares,
          avgPrice: holding.avgPrice,
          currentPrice: currentPrice,
          currentValue: currentValue,
          costBasis: costBasis,
          gainLoss: gainLoss,
          gainLossPercent: gainLossPercent,
          priceSource: livePrice ? livePrice.source : 'stored'
        };
      })
    );

    const totalValue = enrichedPortfolio.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCostBasis = enrichedPortfolio.reduce((sum, h) => sum + h.costBasis, 0);
    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? ((totalGainLoss / totalCostBasis) * 100) : 0;

    res.json({
      success: true,
      portfolio: enrichedPortfolio,
      summary: {
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercent,
        holdingsCount: enrichedPortfolio.length
      }
    });

  } catch (error) {
    console.error('Portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// ------------------- FAMILY MEMBER SHORTCUTS FUNCTIONS -------------------

async function findFamilyMemberByPhrase(userId, phrase) {
  if (!db) {
    return null;
  }
  
  try {
    const familyShortcutsRef = db.collection('familyMemberShortcuts');
    const q = familyShortcutsRef
      .where('userId', '==', userId)
      .where('quickPhrase', '==', phrase.toLowerCase());
    
    const querySnapshot = await q.get();
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error finding family member by phrase:', error);
    return null;
  }
}

// Enhanced send money function that supports family shortcuts from both database and chatbot settings
async function performSendMoneyWithShortcuts({ userId, recipientIdentifier, amount, note, advancedSettings = {} }) {
  try {
    // First, check if the recipientIdentifier is a family member shortcut phrase from database
    let familyMember = await findFamilyMemberByPhrase(userId, recipientIdentifier);
    
    // If not found in database, check chatbot settings
    if (!familyMember && advancedSettings.familyMembers) {
      const settingsMember = advancedSettings.familyMembers.find(member => 
        member.shortcut && member.shortcut.toLowerCase() === recipientIdentifier.toLowerCase()
      );
      
      if (settingsMember && settingsMember.email) {
        familyMember = {
          name: settingsMember.name,
          relationship: settingsMember.relationship,
          email: settingsMember.email,
          quickPhrase: settingsMember.shortcut,
          source: 'chatbot_settings'
        };
      }
    }
    
    let actualRecipientIdentifier = recipientIdentifier;
    let recipientName = null;
    
    if (familyMember) {
      // Use the email from the family member shortcut
      actualRecipientIdentifier = familyMember.email;
      recipientName = familyMember.name;
      console.log(`Family shortcut detected: "${recipientIdentifier}" -> ${familyMember.name} (${familyMember.email}) from ${familyMember.source || 'database'}`);
    }
    
    // Now proceed with the regular send money logic
    if (!actualRecipientIdentifier) {
      return { error: 'Recipient identifier is required.' };
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return { error: 'Amount must be a positive number.' };
    }

    const roundedAmount = Math.round(numericAmount * 100) / 100;

    // 1. Check if user has a helper (Mandatory for Chatbot)
    const helper = await checkUserHasHelper(userId);

    if (!helper) {
      return {
        error: 'Security Restriction: You must have a trusted helper (Shared Access) to use Chatbot payments. Please add a helper via the "Shared Access" feature in the app settings.'
      };
    }

    const senderDoc = await getUserDocument(userId);
    if (senderDoc.error) {
      return { error: senderDoc.error };
    }

    const senderData = senderDoc.data || {};
    const currentBalance = Number(senderData.balance || 0);

    if (currentBalance < roundedAmount) {
      return { error: 'Insufficient balance for this transfer.' };
    }

    const recipient = await findRecipientByIdentifier(actualRecipientIdentifier);
    if (!recipient) {
      return { error: `Recipient account was not found${familyMember ? ` for ${familyMember.name} (${familyMember.email})` : ''}.` };
    }

    if (recipient.id === userId) {
      return { error: 'You cannot transfer money to yourself.' };
    }

    const recipientData = recipient.data || {};

    // 2. Create Approval Request instead of executing transaction
    try {
      await createBackendTransactionApprovalRequest({
        accessId: helper.id,
        ownerId: userId,
        userId: helper.data.userId, // The helper's User ID
        amount: roundedAmount,
        recipientName: recipientName || recipientData.name || '',
        recipientNumber: recipientData.phoneNumber || recipientData.accountNumber || String(actualRecipientIdentifier),
        message: note || '',
        accountNumber: senderData.accountNumber || '',
        accountName: senderData.accountName || 'OCBC Account',
        approverId: helper.data.userId // Helper must approve
      });

      const displayName = recipientName || recipientData.name || actualRecipientIdentifier;
      const shortcutMessage = familyMember ? ` using your "${recipientIdentifier}" shortcut` : '';
      
      return {
        success: true,
        message: `Approval Request Sent! Your helper ${helper.data.userName || 'User'} needs to approve this transaction of ${roundedAmount} to ${displayName}${shortcutMessage} before it is processed.`,
        requiresApproval: true,
        amount: roundedAmount,
        recipient: displayName,
        usedShortcut: !!familyMember
      };

    } catch (approvalError) {
      console.error("Failed to create approval request:", approvalError);
      return { error: "Failed to create approval request. Please try again." };
    }

  } catch (error) {
    console.error('Error performing send money with shortcuts:', error);
    return { error: 'Failed to send money. Please try again later.' };
  }
}

// Function to get user's family member shortcuts for context
async function getUserFamilyShortcuts(userId) {
  if (!db) {
    return [];
  }
  
  try {
    const familyShortcutsRef = db.collection('familyMemberShortcuts');
    const q = familyShortcutsRef.where('userId', '==', userId);
    
    const querySnapshot = await q.get();
    const shortcuts = [];
    
    querySnapshot.forEach(doc => {
      shortcuts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return shortcuts;
  } catch (error) {
    console.error('Error getting family shortcuts:', error);
    return [];
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ------------------- HELP INTENT API -------------------

// Help guidance configurations (matches frontend helpGuidance.js)
const helpGuidanceConfig = {
  transfer_money: {
    title: "Transfer Money",
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
    steps: [
      { target: ".account-card", text: "Your balance is shown here on the account card.", position: "bottom" },
      { target: ".account-card", text: "Tap to see more details.", position: "bottom", action: "click" }
    ]
  },
  use_chatbot: {
    title: "AI Chatbot",
    steps: [
      { target: ".ai-chatbot-button", text: "Tap AI Chatbot in Accessible Actions to open the AI chatbot.", position: "bottom", action: "click", skipIfMissing: true },
      { target: "[data-help-id='chatbot-messages']", text: "Your conversation appears here. The chatbot replies with balances, transfers, exchanges, and investments.", position: "bottom" },
      { target: "[data-help-id='chatbot-input']", text: "Type your request here. Press Enter or tap Send to submit.", position: "top" },
      { target: "[data-help-id='chatbot-input']", text: "Check balance: try \"What's my balance?\"", position: "top", intentKey: "check_balance" },
      { target: "[data-help-id='chatbot-input']", text: "Transfer money: try \"Send $50 to John\" to start a PayNow transfer.", position: "top", intentKey: "transfer_money" },
      { target: "[data-help-id='chatbot-input']", text: "Lock or unlock funds: try \"Lock my account\" or \"Unlock my account\".", position: "top", intentKey: "account_lock" },
      { target: "[data-help-id='chatbot-input']", text: "Exchange currency: try \"Convert 100 SGD to USD\" for rates and exchange.", position: "top", intentKey: "exchange_currency" },
      { target: "[data-help-id='chatbot-input']", text: "Investments and portfolio: try \"Buy $200 of AAPL\", \"Sell 2 shares of TSLA\", or \"Show my portfolio\".", position: "top", intentKey: "investments" }
    ]
  },
  view_rewards: {
    title: "View Rewards",
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
    steps: [
      { target: ".shared-access-button", text: "Tap Shared Access to manage who can help with your account.", position: "top", action: "click" },
      { target: "[data-help-id='shared-access-people-tab']", text: "Switch to People with Access to invite someone new.", position: "bottom", action: "click" },
      { target: "[data-help-id='shared-access-add-person']", text: "Tap Add Person to open the invitation form.", position: "bottom", action: "click" },
      { target: "[data-help-id='shared-access-email-input']", text: "Enter the person's email address.", position: "bottom" },
      { target: "[data-help-id='shared-access-search-button']", text: "Tap Search to find the user.", position: "bottom", waitForSelectors: ["[data-help-id='shared-access-search-button']"] },
      { target: "[data-help-id='shared-access-found-user']", text: "Confirm you have the right person.", position: "bottom" },
      { target: "[data-help-id='shared-access-permissions']", text: "Choose what they can do, like view balance or make transfers.", position: "bottom", skipIfMissing: true },
      { target: "[data-help-id='shared-access-approval-limit']", text: "Set a transfer approval limit if needed.", position: "bottom", skipIfMissing: true },
      { target: "[data-help-id='shared-access-mutual-consent']", text: "Optional: require mutual consent to revoke access.", position: "bottom", skipIfMissing: true },
      { target: "[data-help-id='shared-access-send-invite']", text: "Send the invitation when you are ready.", position: "top", waitForSelectors: ["[data-help-id='shared-access-send-invite']"], skipIfMissing: true }
    ]
  },
  remote_atm: {
    title: "Remote ATM",
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
    steps: [
      { target: ".customise-button", text: "Tap 'Customise Shortcut' to change your quick access.", position: "top", action: "click" },
      { target: null, text: "Drag to reorder or tap edit icons to add/remove.", position: "center" }
    ]
  },
  view_notifications: {
    title: "Notifications",
    steps: [
      { target: ".notification-icon", text: "Tap the bell icon to see notifications.", position: "bottom", action: "click" },
      { target: null, text: "Find transaction alerts and pending approvals here.", position: "center" }
    ]
  },
  buy_stocks: {
    title: "Buy Investments",
    steps: [
      { target: ".ai-chatbot-button", text: "Open the AI chatbot for investing.", position: "bottom", action: "click" },
      { target: null, text: "Say 'Buy $100 of Apple stock' and the AI handles it!", position: "center" }
    ]
  },
  exchange_currency: {
    title: "Exchange Currency",
    steps: [
      { target: ".ai-chatbot-button", text: "Open the AI chatbot for currency exchange.", position: "bottom", action: "click" },
      { target: null, text: "Ask 'Convert $100 SGD to USD' for live rates!", position: "center" }
    ]
  }
};

// Keyword-based fallback for intent matching (when AI is unavailable)
const intentKeywords = {
  transfer_money: ['transfer', 'send', 'money', 'pay', 'paynow', 'payment'],
  emergency_cash: ['emergency cash', 'emergency withdrawal', 'emergency', 'cash', 'otp', 'urgent cash'],
  check_balance: ['balance', 'account', 'how much', 'available', 'money'],
  use_chatbot: ['chatbot', 'ai', 'assistant', 'bot', 'talk', 'chat', 'help', 'tutorial', 'features', 'capabilities'],
  view_rewards: ['reward', 'coin', 'prize', 'spin', 'wheel', 'point', 'redeem', 'voucher', 'referral'],
  shared_access: ['share', 'family', 'helper', 'access', 'caregiver', 'elderly', 'permission'],
  remote_atm: ['atm', 'remote atm', 'withdraw', 'cash', 'cardless', 'session code', 'atm access'],
  customize_shortcuts: ['shortcut', 'customize', 'customise', 'arrange', 'personalize', 'quick'],
  view_notifications: ['notification', 'alert', 'pending', 'approval', 'bell'],
  buy_stocks: ['stock', 'invest', 'share', 'portfolio', 'trading', 'buy'],
  exchange_currency: ['exchange', 'currency', 'forex', 'convert', 'usd', 'foreign']
};

function matchIntentByKeywords(query) {
  const lowerQuery = query.toLowerCase();
  let bestMatch = null;
  let highestScore = 0;

  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        score += keyword.length; // Longer matches = higher score
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = intent;
    }
  }

  return bestMatch ? { intent: bestMatch, confidence: Math.min(0.9, highestScore / 15) } : null;
}

// POST /api/help-intent - Classify user help queries
app.post('/api/help-intent', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Please ask a question about how to use the app.' 
      });
    }

    console.log(`🎤 Help intent query: "${query}"`);

    let classification = null;

    // Try AI classification first, fall back to keywords
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const prompt = `You are a banking app help assistant. Classify this user question into exactly ONE of these intents:

Available intents:
- transfer_money (sending money, PayNow, payments, transfers)
- emergency_cash (emergency cash withdrawal, OTP, urgent cash)
- check_balance (viewing balance, account, how much money)
- use_chatbot (AI assistant, bot, get help, chatbot tutorial, features)
- view_rewards (rewards, coins, prizes, spin wheel, points)
- shared_access (sharing account, family access, helpers, caregivers)
- remote_atm (ATM withdrawal, cardless, cash without card)
- customize_shortcuts (personalize, arrange shortcuts, quick access)
- view_notifications (alerts, notifications, pending, approvals)
- buy_stocks (invest, stocks, shares, portfolio, trading)
- exchange_currency (forex, currency exchange, convert money)

User question: "${query}"

Respond with ONLY a JSON object in this exact format, no other text:
{"intent": "intent_name", "confidence": 0.95}

If the question doesn't match any intent well, use:
{"intent": "unknown", "confidence": 0.0}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      console.log(`🤖 AI classification: ${responseText}`);

      // Parse the AI response
      const jsonMatch = responseText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0]);
        console.log(`✅ AI matched intent: ${classification.intent}`);
      }
    } catch (aiError) {
      console.warn('⚠️ AI classification failed, using keyword fallback:', aiError.message);
      // Fall back to keyword matching
      classification = matchIntentByKeywords(query);
      if (classification) {
        console.log(`📝 Keyword matched intent: ${classification.intent}`);
      }
    }

    // If no classification from AI or keywords, try keyword fallback
    if (!classification || classification.intent === 'unknown') {
      classification = matchIntentByKeywords(query);
    }

    // Check if we have a valid match
    if (!classification || !helpGuidanceConfig[classification.intent]) {
      return res.json({
        success: false,
        message: "I'm not sure how to help with that. Try asking about transfers, balance, rewards, or the chatbot!"
      });
    }

    const guidance = helpGuidanceConfig[classification.intent];
    
    console.log(`✅ Matched intent: ${classification.intent} (${(classification.confidence * 100).toFixed(0)}% confidence)`);

    res.json({
      success: true,
      intent: classification.intent,
      confidence: classification.confidence,
      title: guidance.title,
      steps: guidance.steps
    });

  } catch (error) {
    console.error('Help intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});

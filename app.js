'use strict';

/* ═══ FIREBASE CONFIG - YOUR VALUES ═══ */
const firebaseConfig = {
  apiKey: "AIzaSyBBixvE5SQjOePUrvNLTsBEcQAChU9dvLQ",
  authDomain: "tradevault-pro-7421d.firebaseapp.com",
  projectId: "tradevault-pro-7421d",
  storageBucket: "tradevault-pro-7421d.firebasestorage.app",
  messagingSenderId: "168832794255",
  appId: "1:168832794255:web:c288d9c78809941dfe7afa",
  measurementId: "G-E1BNCY4F9J"
};

/* ═══ GLOBAL VARIABLES ═══ */
let db, auth, currentUserId;
let trades = [];
let syncEnabled = false;
const STORE_KEY = 'tradevault_v2';
const DEPOSIT_KEY = 'tradevault_deposit';
const TRADES_COLLECTION = 'trades';
const SETTINGS_COLLECTION = 'user_settings';

/* ═══ INITIALIZE FIREBASE ═══ */
function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase SDK not loaded!');
    showToast('Firebase not loaded. Please check your internet connection.', 'error');
    return false;
  }
  
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    
    // ✅ FIXED: Use new cache settings instead of deprecated enablePersistence
    db.settings({
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
      experimentalForceLongPolling: true // Helps with firewall/proxy issues
    });
    
    // Enable offline persistence with proper error handling
    db.enablePersistence().catch(err => {
      if (err.code === 'failed-precondition') {
        console.log('⚠️ Multiple tabs open - persistence disabled');
      } else if (err.code === 'unimplemented') {
        console.log('⚠️ Browser doesn\'t support persistence');
      } else {
        console.log('Persistence error:', err);
      }
    });
    
    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
      if (user) {
        currentUserId = user.uid;
        console.log('👤 User authenticated:', currentUserId);
        syncEnabled = true;
        updateSyncStatus('connected');
        
        // Load data from cloud FIRST, then fallback to local
        setupRealtimeSync();
        loadUserSettings();
        
        // Show dashboard after a small delay to allow sync
        setTimeout(() => {
          showDashboard();
          renderAll();
        }, 500);
      } else {
        console.log('👤 No user - showing login');
        syncEnabled = false;
        currentUserId = null;
        updateSyncStatus('offline');
        showLoginScreen();
      }
    });
    
    // Handle auth errors globally
    auth.onIdTokenChanged(user => {
      if (!user && currentUserId) {
        console.log('🔄 Token expired or user signed out');
        showToast('Session expired. Please sign in again.', 'error');
      }
    });
    
    return true;
  } catch (e) {
    console.error('Firebase init error:', e);
    showToast('Failed to connect to server. Please check your internet.', 'error');
    return false;
  }
}

/* ═══ AUTHENTICATION FUNCTIONS ═══ */
function showLoginScreen() {
  // Remove existing login overlay if any
  const existing = document.getElementById('loginOverlay');
  if (existing) existing.remove();
  
  const loginHTML = `
    <div id="loginOverlay" style="position:fixed;inset:0;background:rgba(7,8,12,0.95);backdrop-filter:blur(10px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:40px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="width:60px;height:60px;background:linear-gradient(135deg,var(--cyan),#007799);border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <svg viewBox="0 0 24 24" style="width:32px;height:32px;fill:none;stroke:#fff;stroke-width:2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h2 style="font-family:'Outfit',sans-serif;font-size:24px;margin-bottom:8px;color:var(--text);">TradeVault</h2>
          <p style="color:var(--text3);font-size:13px;">Sign in to sync your trading journal across devices</p>
        </div>
        
        <div style="margin-bottom:20px;">
          <label style="display:block;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Email Address</label>
          <input type="email" id="loginEmail" placeholder="your@email.com" style="width:100%;padding:12px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;margin-bottom:16px;outline:none;" />
          
          <label style="display:block;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Password</label>
          <input type="password" id="loginPassword" placeholder="••••••••" style="width:100%;padding:12px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;margin-bottom:8px;outline:none;" />
          
          <div id="loginError" style="color:var(--rose);font-size:11px;margin-bottom:12px;display:none;padding:8px;background:rgba(255,77,109,0.1);border-radius:6px;border:1px solid rgba(255,77,109,0.2);"></div>
        </div>
        
        <button id="loginBtn" onclick="handleLogin()" style="width:100%;padding:12px;background:var(--cyan);border:none;border-radius:8px;color:#07080C;font-family:'Outfit',sans-serif;font-weight:700;font-size:14px;cursor:pointer;margin-bottom:12px;transition:all 0.2s;">Sign In</button>
        <button id="signupBtn" onclick="handleSignup()" style="width:100%;padding:12px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--text2);font-family:'DM Mono',monospace;font-size:12px;cursor:pointer;transition:all 0.2s;">Create New Account</button>
        
        <div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
          <p style="font-size:11px;color:var(--text3);">🔐 Your data is encrypted & synced securely</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', loginHTML);
  
  // Add enter key support
  document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  
  if (!email || !password) {
    showError(errorDiv, 'Please enter both email and password');
    return;
  }
  
  if (!isValidEmail(email)) {
    showError(errorDiv, 'Please enter a valid email address');
    return;
  }
  
  // Show loading state
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';
  errorDiv.style.display = 'none';
  
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log('✅ Login successful:', userCredential.user.uid);
      document.getElementById('loginOverlay')?.remove();
      showToast('Welcome back! ✓', 'success');
    })
    .catch(error => {
      console.error('❌ Login error:', error.code, error.message);
      
      let message = error.message;
      switch(error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email. Please sign up first.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your internet connection.';
          break;
      }
      
      showError(errorDiv, message);
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    });
}

function handleSignup() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  const signupBtn = document.getElementById('signupBtn');
  
  if (!email || !password) {
    showError(errorDiv, 'Please enter both email and password');
    return;
  }
  
  if (!isValidEmail(email)) {
    showError(errorDiv, 'Please enter a valid email address');
    return;
  }
  
  if (password.length < 6) {
    showError(errorDiv, 'Password must be at least 6 characters');
    return;
  }
  
  // Show loading state
  signupBtn.disabled = true;
  signupBtn.textContent = 'Creating account...';
  errorDiv.style.display = 'none';
  
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log('✅ Signup successful:', userCredential.user.uid);
      document.getElementById('loginOverlay')?.remove();
      showToast('Account created successfully! ✓', 'success');
      
      // Initialize user settings in Firestore
      initializeUserSettings(userCredential.user.uid);
    })
    .catch(error => {
      console.error('❌ Signup error:', error.code, error.message);
      
      let message = error.message;
      switch(error.code) {
        case 'auth/email-already-in-use':
          message = 'This email is already registered. Please sign in instead.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address format.';
          break;
        case 'auth/operation-not-allowed':
          message = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/weak-password':
          message = 'Password is too weak. Please use at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your internet connection.';
          break;
      }
      
      showError(errorDiv, message);
      signupBtn.disabled = false;
      signupBtn.textContent = 'Create New Account';
    });
}

// Helper functions for auth
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(element, message) {
  element.textContent = message;
  element.style.display = 'block';
}

function showDashboard() {
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.remove();
  
  // Ensure we're showing the dashboard view
  if (document.getElementById('view-dashboard')) {
    switchView('dashboard', document.querySelector('[data-view="dashboard"]'));
  }
}

function handleLogout() {
  if (confirm('Are you sure you want to logout? Your data will remain synced for next login.')) {
    auth.signOut().then(() => {
      console.log('✅ Logged out');
      currentUserId = null;
      syncEnabled = false;
      trades = [];
      showToast('Logged out successfully', 'success');
      // Small delay before reload to ensure cleanup
      setTimeout(() => location.reload(), 300);
    }).catch(error => {
      console.error('❌ Logout error:', error);
      showToast('Logout failed: ' + error.message, 'error');
    });
  }
}

// Initialize default settings for new user
async function initializeUserSettings(userId) {
  if (!db) return;
  try {
    await db.collection(SETTINGS_COLLECTION).doc(userId).set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      theme: 'dark',
      depositedCapital: 0,
      currency: 'INR'
    }, { merge: true });
  } catch (e) {
    console.log('Settings init skipped (will retry on next load)');
  }
}

/* ═══ SYNC STATUS INDICATOR ═══ */
function updateSyncStatus(status) {
  const indicator = document.getElementById('syncStatus');
  if (!indicator) return;
  
  let html, title;
  
  switch(status) {
    case 'connected':
      if (navigator.onLine) {
        html = '<span style="color:var(--emerald)">● Synced</span>';
        title = 'Real-time sync active • Data saved to cloud';
      } else {
        html = '<span style="color:var(--amber)">● Offline</span>';
        title = 'Working offline • Changes will sync when connected';
      }
      break;
    case 'syncing':
      html = '<span style="color:var(--cyan)">● Syncing...</span>';
      title = 'Syncing data with cloud...';
      break;
    case 'error':
      html = '<span style="color:var(--rose)">● Error</span>';
      title = 'Sync failed • Using local data';
      break;
    default: // offline/local
      html = '<span style="color:var(--amber)">● Local</span>';
      title = 'Data saved locally only • Sign in to enable sync';
  }
  
  indicator.innerHTML = html;
  indicator.title = title;
}

/* ═══ REAL-TIME SYNC LISTENER ═══ */
function setupRealtimeSync() {
  if (!currentUserId || !db) {
    console.log('⚠️ Cannot setup sync: no user or db');
    return;
  }
  
  console.log('🔄 Setting up realtime sync for user:', currentUserId);
  updateSyncStatus('syncing');
  
  const query = db.collection(TRADES_COLLECTION)
    .where('userId', '==', currentUserId)
    .orderBy('createdAt', 'desc');
  
  const unsubscribe = query.onSnapshot(
    snapshot => {
      console.log(`📥 Received ${snapshot.size} trades from cloud`);
      
      trades = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Ensure we have the firebase ID for future updates/deletes
        trades.push({ firebaseId: doc.id, ...data });
      });
      
      // Backup to localStorage for offline safety
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(trades));
      } catch (e) {
        console.warn('Could not backup to localStorage:', e);
      }
      
      // Update UI if views are active
      if (document.querySelector('.view.active')) {
        renderAll();
        updateSidebarCapital();
      }
      
      updateSyncStatus('connected');
    },
    error => {
      console.error('🔥 Sync listener error:', error.code, error.message);
      
      if (error.code === 'permission-denied') {
        showToast('❌ Access denied. Please check Firestore security rules.', 'error');
        updateSyncStatus('error');
      } else if (error.code === 'unavailable') {
        console.log('⚠️ Firestore temporarily unavailable - using cached data');
        updateSyncStatus('offline');
      } else {
        showToast('⚠️ Sync paused - using local data', 'error');
        updateSyncStatus('error');
      }
      
      // Fallback: load from localStorage
      loadFromLocalStorage();
    }
  );
  
  // Store unsubscribe for cleanup if needed
  window._syncUnsubscribe = unsubscribe;
}

// Fallback loader
function loadFromLocalStorage() {
  try {
    const data = localStorage.getItem(STORE_KEY);
    if (data) {
      trades = JSON.parse(data);
      console.log(`📦 Loaded ${trades.length} trades from localStorage`);
      renderAll();
    }
  } catch (e) {
    console.warn('Error loading from localStorage:', e);
  }
}

/* ═══ CLOUD OPERATIONS ═══ */
async function syncTradeToCloud(trade) {
  if (!syncEnabled || !currentUserId || !db) {
    // Fallback to localStorage only
    saveTrades(trades);
    return;
  }
  
  updateSyncStatus('syncing');
  
  try {
    // ✅ CRITICAL: Always include userId for security rules
    const tradeData = {
      ...trade,
      userId: currentUserId,  // This is essential!
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (trade.firebaseId) {
      // Update existing trade
      await db.collection(TRADES_COLLECTION)
        .doc(trade.firebaseId)
        .update(tradeData);
      console.log('✅ Trade updated in cloud:', trade.firebaseId);
    } else {
      // Create new trade
      tradeData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection(TRADES_COLLECTION).add(tradeData);
      trade.firebaseId = docRef.id;
      console.log('✅ Trade added to cloud:', docRef.id);
    }
    
    // Update local copy with firebaseId
    saveTrades(trades);
    updateSyncStatus('connected');
    
  } catch (error) {
    console.error('❌ Cloud sync failed:', error.code, error.message);
    
    // Fallback: save to localStorage
    saveTrades(trades);
    
    if (error.code === 'permission-denied') {
      showToast('❌ Cannot save: Check Firestore rules', 'error');
    } else if (error.code === 'unavailable') {
      showToast('⚠️ Offline - saved locally, will sync later', 'error');
    } else {
      showToast('⚠️ Saved locally (sync failed)', 'error');
    }
    
    updateSyncStatus('error');
  }
}

async function deleteTradeFromCloud(firebaseId) {
  if (!firebaseId || !syncEnabled || !currentUserId || !db) return;
  
  try {
    await db.collection(TRADES_COLLECTION).doc(firebaseId).delete();
    console.log('✅ Trade deleted from cloud:', firebaseId);
  } catch (error) {
    console.error('❌ Cloud delete failed:', error);
    // Don't show toast here - UI will update from snapshot listener
  }
}

async function saveUserSettings(settings) {
  if (!syncEnabled || !currentUserId || !db) return;
  
  try {
    await db.collection(SETTINGS_COLLECTION).doc(currentUserId).set({
      ...settings,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.log('Settings sync skipped:', e.message);
  }
}

function loadUserSettings() {
  if (!syncEnabled || !currentUserId || !db) return;
  
  db.collection(SETTINGS_COLLECTION).doc(currentUserId).get()
    .then(doc => {
      if (doc.exists) {
        const settings = doc.data();
        if (settings.theme) applyTheme(settings.theme);
        if (settings.depositedCapital !== undefined) {
          setDepositedCapital(settings.depositedCapital);
        }
        console.log('📥 User settings loaded');
      }
    })
    .catch(e => console.log('Settings load skipped:', e.message));
}

/* ═══ LOCAL STORAGE FUNCTIONS (FALLBACK) ═══ */
function loadTrades() {
  // If synced, realtime listener handles it
  if (syncEnabled && currentUserId) {
    return [];
  }
  
  try { 
    const r = localStorage.getItem(STORE_KEY); 
    if (r) {
      const parsed = JSON.parse(r);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch(e) {
    console.warn('Error loading trades from localStorage:', e);
  }
  return [];
}

function saveTrades(data) { 
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch(e) {
    console.warn('Error saving to localStorage:', e);
  }
}

/* ═══ CAPITAL MANAGEMENT ═══ */
function getDepositedCapital() {
  const val = localStorage.getItem(DEPOSIT_KEY);
  return val ? parseFloat(val) : 0;
}

function setDepositedCapital(amount) {
  localStorage.setItem(DEPOSIT_KEY, amount.toString());
  
  // Sync to cloud settings
  if (syncEnabled && currentUserId) {
    saveUserSettings({ depositedCapital: amount });
  }
  
  updateSidebarCapital();
  renderDashboard();
}

function getCurrentCapital() {
  const deposited = getDepositedCapital();
  const rich = trades.map(enrich);
  const closed = rich.filter(t => t.result !== 'open');
  const totalPnl = closed.reduce((a, t) => a + (t.pnl || 0), 0);
  return deposited + totalPnl;
}

function updateSidebarCapital() {
  const deposited = getDepositedCapital();
  const totalInvested = trades.reduce((sum, t) => sum + (t.capital || 0), 0);
  const currentCapital = getCurrentCapital();
  
  set('sideCapital', fmt.currency(currentCapital, 0));
  set('sideCapSub', `₹${fmt.currency(totalInvested,0)} invested • ${trades.length} trades`);
  set('kpiCap', fmt.currency(currentCapital, 0));
}

/* ═══ FORMULAS ═══ */
function isNum(v) { return v !== null && v !== undefined && v !== '' && !isNaN(Number(v)); }

function calcSLSize(e, sl) {
  if (!isNum(e) || !isNum(sl)) return null;
  return Math.abs(e - sl);
}

function calcPoints(e, ex, sl) {
  if (!isNum(e)) return null;
  const ev = isNum(ex) ? Number(ex) : (isNum(sl) ? Number(sl) : null);
  if (ev === null) return null;
  return ev - Number(e);
}

function calcProfitLoss(e, ex, sl, cap) {
  const pts = calcPoints(e, ex, sl);
  if (pts === null || !isNum(e) || !isNum(cap) || Number(e) === 0) return null;
  return (pts / Number(e)) * Number(cap);
}

function calcPctReturn(e, ex, sl) {
  const pts = calcPoints(e, ex, sl);
  if (pts === null || !isNum(e) || Number(e) === 0) return null;
  return pts / Number(e);
}

function calcRR(e, sl, t1) {
  if (!isNum(e) || !isNum(sl) || !isNum(t1)) return null;
  const risk = Math.abs(Number(e) - Number(sl));
  const reward = Math.abs(Number(t1) - Number(e));
  if (risk === 0) return null;
  return reward / risk;
}

function tradeResult(pnl) {
  if (pnl === null) return 'open';
  return pnl >= 0 ? 'win' : 'loss';
}

function enrich(t) {
  const {entryPrice:e, stopLoss:sl, exitPrice:ex, capital:c, target1:t1} = t;
  const slSize = calcSLSize(e,sl);
  const points = calcPoints(e,ex,sl);
  const pnl    = calcProfitLoss(e,ex,sl,c);
  const pct    = calcPctReturn(e,ex,sl);
  const rr     = calcRR(e,sl,t1);
  const result = tradeResult(pnl);
  return {...t, slSize, points, pnl, pct, rr, result};
}

/* ═══ THEME MANAGEMENT ═══ */
const THEME_KEY = 'tradevault_theme';

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  
  // Sync theme preference
  if (syncEnabled && currentUserId) {
    saveUserSettings({ theme });
  }
  
  setTimeout(() => {
    if (typeof renderDashboard === 'function' &&
    document.getElementById('view-dashboard')?.classList.contains('active')) {
      renderDashboard();
    }
    if (typeof renderAnalytics === 'function' &&
    document.getElementById('view-report')?.classList.contains('active')) {
      renderAnalytics();
    }
  }, 100);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  if (typeof showToast === 'function') {
    showToast(`Switched to ${next} mode`, 'success');
  }
}

/* ═══ TARGET CALCULATION ═══ */
function calcTargets(entry, sl, tradeType) {
  if (!isNum(entry) || !isNum(sl)) {
    return { t1: null, t2: null, t3: null, t4: null };
  }
  const e = Number(entry), s = Number(sl);
  const risk = Math.abs(e - s);
  const isBuy = tradeType === 'Buy Trade';
  return {
    t1: isBuy ? e + risk : e - risk,
    t2: isBuy ? e + 2 * risk : e - 2 * risk,
    t3: isBuy ? e + 3 * risk : e - 3 * risk,
    t4: isBuy ? e + 4 * risk : e - 4 * risk
  };
}

/* ═══ CAPITAL FUNCTIONS ═══ */
function editDepositedCapital() {
  const current = getDepositedCapital();
  const newAmount = prompt('Enter your total initial deposited capital (₹):\n(Display will update with P&L)', current);
  if (newAmount === null) return;
  const amount = parseFloat(newAmount);
  if (isNaN(amount) || amount < 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }
  setDepositedCapital(amount);
  showToast(`Initial Capital updated to ${fmt.currency(amount, 0)}`, 'success');
  validateFormCapital();
}

function validateFormCapital() {
  const currentCapital = getCurrentCapital();
  const invested = parseFloat(getv('fCapital'));
  const warningEl = document.getElementById('capitalWarning');
  if (!warningEl) return;
  
  if (currentCapital <= 0) {
    warningEl.innerHTML = `<span style="color:var(--amber)">⚠️ Set your deposited capital first</span>`;
    warningEl.style.display = 'block';
    return;
  }
  if (isNaN(invested) || invested <= 0) {
    warningEl.style.display = 'none';
    return;
  }
  const percent = (invested / currentCapital) * 100;
  if (invested > currentCapital) {
    warningEl.innerHTML = `
    <span style="color:var(--rose)">
    ⚠️ Investment (₹${fmt.currency(invested,0)}) exceeds current capital (₹${fmt.currency(currentCapital,0)})
    <br><small>Reduce amount or increase capital</small>
    </span>`;
    warningEl.style.display = 'block';
    warningEl.className = 'capital-warning danger';
  } else {
    const color = percent > 80 ? 'var(--amber)' : 'var(--emerald)';
    const cls = percent > 80 ? 'warning' : (percent > 50 ? 'warning' : '');
    warningEl.innerHTML = `
    <span style="color:${color}">
    ✓ Using ${percent.toFixed(1)}% of current capital
    <br><small>₹${fmt.currency(currentCapital - invested, 0)} remaining</small>
    </span>`;
    warningEl.style.display = 'block';
    warningEl.className = `capital-warning ${cls}`;
  }
}

/* ═══ FORMATTERS ═══ */
const fmt = {
  currency(v, d=0) {
    if (v===null||v===undefined||isNaN(v)) return '—';
    const n=Number(v), abs=Math.abs(n).toLocaleString('en-IN',{maximumFractionDigits:d});
    return (n<0?'−₹':'₹')+abs;
  },
  pct(v) { if (v===null||isNaN(v)) return '—'; return (v*100).toFixed(2)+'%'; },
  num(v,d=2) { if (v===null||isNaN(v)) return '—'; return Number(v).toFixed(d); },
  date(s) {
    if (!s) return '—';
    const d=new Date(s); if(isNaN(d)) return s;
    return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  },
  monthKey(s) {
    if (!s) return '—';
    const d=new Date(s); if(isNaN(d)) return '—';
    return d.toLocaleDateString('en-IN',{month:'short',year:'numeric'});
  },
};

function pnlCls(v) { if(v===null||isNaN(v)) return ''; return v>0?'pos':v<0?'neg':'zero'; }
function pnlClr(v) { if(v>0) return 'var(--emerald)'; if(v<0) return 'var(--rose)'; return ''; }

/* ═══ EMPTY STATE HANDLERS ═══ */
function showEmptyState(elementId, message, subMessage = '') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `
    <div style="text-align:center;padding:40px 20px;color:var(--text3)">
      <div style="font-size:32px;margin-bottom:12px">📭</div>
      <div style="font-family:'Outfit',sans-serif;font-size:14px;color:var(--text2);margin-bottom:6px">
        ${message}
      </div>
      ${subMessage ? `<div style="font-size:11px">${subMessage}</div>` : ''}
    </div>
  `;
}

function renderEmptyDashboard() {
  set('kpiPnl', '₹0'); cls('kpiPnl', '');
  set('kpiWin', '0%');
  set('kpiTrades', '0');
  set('kpiAvg', '₹0'); cls('kpiAvg', '');
  set('kpiRR', '0');
  set('kpiCap', fmt.currency(getDepositedCapital(), 0));
  set('kpiPnlSub', 'No trades yet');
  set('kpiWinSub', 'Start adding trades');
  set('kpiTradesSub', 'Your journey begins here');
  
  ['equityChart','winLossChart','symbolChart','typeChart','monthChart'].forEach(id => {
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
  showEmptyState('recentTbody', 'No trades recorded', 'Click "Add Trade" to log your first trade');
  const now = new Date();
  set('dashDate', `Last updated: ${now.toLocaleDateString('en-IN')}`);
}

function renderEmptyJournal() {
  showEmptyState('journalTbody', 'Your journal is empty', 'Add your first trade to start tracking');
  document.getElementById('journalPagination').innerHTML = '';
}

function renderEmptyAnalytics() {
  const grid = document.getElementById('statsGrid');
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3)">
        <div style="font-size:32px;margin-bottom:12px">📊</div>
        <div style="font-family:'Outfit',sans-serif;font-size:14px;color:var(--text2)">
          No data to analyze yet
        </div>
        <div style="font-size:11px;margin-top:6px">Add trades to see performance metrics</div>
      </div>
    `;
  }
  ['rrChart','entryDisciplineChart','slPlacementChart','exitQualityChart','pnlByExecutionChart'].forEach(id => {
    destroyChart(id);
  });
}

/* ═══ CHARTS ═══ */
const CHARTS = {};
function destroyChart(id) { if(CHARTS[id]){CHARTS[id].destroy();delete CHARTS[id];} }

const CF = {
  text2: '#7B84A3', grid: '#1E2235',
  cyan: '#00D4FF', emerald: '#00C896', rose: '#FF4D6D', amber: '#F59E0B', violet: '#8B5CF6',
  perfect: '#00C896', early: '#F59E0B', late: '#FF4D6D',
  system: '#00D4FF', emotional: '#FF4D6D',
  plan: '#00C896', panic: '#FF4D6D', greed: '#F59E0B',
};

function baseOpts(xRot=0) {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      tooltip:{
        backgroundColor:'#181C2A', borderColor:'#2E3450', borderWidth:1,
        titleColor:'#E6EAF8', bodyColor:'#7B84A3',
        titleFont:{family:"'DM Mono',monospace",size:11},
        bodyFont:{family:"'DM Mono',monospace",size:10},
      }
    },
    scales:{
      x:{ticks:{color:CF.text2,font:{family:"'DM Mono',monospace",size:10},maxRotation:xRot,minRotation:xRot},grid:{color:CF.grid}},
      y:{ticks:{color:CF.text2,font:{family:"'DM Mono',monospace",size:10}},grid:{color:CF.grid}},
    }
  };
}

/* ═══ DASHBOARD ═══ */
function renderDashboard() {
  if (trades.length === 0) {
    renderEmptyDashboard();
    return;
  }
  
  const rich = trades.map(enrich);
  const closed = rich.filter(t=>t.result!=='open');
  const wins   = rich.filter(t=>t.result==='win');
  const losses = rich.filter(t=>t.result==='loss');
  const total  = wins.length + losses.length;
  const totalPnl = closed.reduce((a,t)=>a+(t.pnl||0),0);
  const winRate  = total>0 ? wins.length/total : 0;
  const avgPnl   = total>0 ? totalPnl/total : 0;
  const rrVals   = rich.map(t=>t.rr).filter(v=>v!==null);
  const avgRR    = rrVals.length ? rrVals.reduce((a,b)=>a+b,0)/rrVals.length : 0;
  const totalInvested = rich.reduce((a,t)=>a+(t.capital||0),0);
  
  set('kpiPnl',  fmt.currency(totalPnl,0)); cls('kpiPnl',pnlCls(totalPnl));
  set('kpiWin',  fmt.pct(winRate));
  set('kpiTrades', rich.length);
  set('kpiAvg',  fmt.currency(avgPnl,0));   cls('kpiAvg',pnlCls(avgPnl));
  set('kpiRR',   fmt.num(avgRR,2));
  
  const currentCapital = getCurrentCapital();
  set('kpiCap', fmt.currency(currentCapital, 0));
  set('kpiPnlSub', `${wins.length}W / ${losses.length}L / ${rich.filter(t=>t.result==='open').length} Open`);
  set('kpiWinSub', `${wins.length} wins of ${total} closed`);
  set('kpiTradesSub', `${rich.length} total logged`);
  
  const deposited = getDepositedCapital();
  set('sideCapital', fmt.currency(currentCapital, 0));
  set('sideCapSub', `₹${fmt.currency(totalInvested,0)} invested • ${trades.length} trades`);
  
  // Equity Chart
  destroyChart('equityChart');
  const sorted = [...rich].filter(t=>t.date&&t.result!=='open').sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (sorted.length > 0) {
    let running = 0;
    const eqLabels = sorted.map(t=>fmt.date(t.date));
    const eqData   = sorted.map(t=>{running+=(t.pnl||0); return +running.toFixed(2);});
    CHARTS.equityChart = new Chart(document.getElementById('equityChart'), {
      type:'line',
      data:{labels:eqLabels,datasets:[{
        label:'Cumulative P&L (₹)',data:eqData,
        borderColor:CF.cyan,backgroundColor:'rgba(0,212,255,0.06)',
        fill:true,tension:0.4,pointRadius:3,pointHoverRadius:5,
        pointBackgroundColor:CF.cyan,borderWidth:2,
      }]},
      options:baseOpts(30),
    });
  }
  
  // Win/Loss Chart
  destroyChart('winLossChart');
  const openCount = rich.filter(t=>t.result==='open').length;
  CHARTS.winLossChart = new Chart(document.getElementById('winLossChart'), {
    type:'doughnut',
    data:{
      labels:['Win','Loss','Open'],
      datasets:[{data:[wins.length,losses.length,openCount],
      backgroundColor:[CF.emerald,CF.rose,CF.amber],
      borderColor:'#0D0F17',borderWidth:3,
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'68%',
      plugins:{
        legend:{labels:{color:CF.text2,font:{family:"'DM Mono',monospace",size:10},padding:14}},
        tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.raw} trades`}},
      }
    }
  });
  
  // Symbol Chart
  destroyChart('symbolChart');
  const bySymbol = {};
  rich.forEach(t=>{ if(!t.symbol) return; bySymbol[t.symbol]=(bySymbol[t.symbol]||0)+(t.pnl||0); });
  if (Object.keys(bySymbol).length > 0) {
    CHARTS.symbolChart = new Chart(document.getElementById('symbolChart'), {
      type:'bar',
      data:{
        labels:Object.keys(bySymbol),
        datasets:[{
          label:'P&L (₹)',data:Object.values(bySymbol),
          backgroundColor:Object.values(bySymbol).map(v=>v>=0?'rgba(0,200,150,0.65)':'rgba(255,77,109,0.65)'),
          borderRadius:4,
        }]
      },
      options:{...baseOpts(),plugins:{...baseOpts().plugins,tooltip:{...baseOpts().plugins.tooltip,callbacks:{label:ctx=>` ${fmt.currency(ctx.raw,0)}`}}}},
    });
  }
  
  // Type Chart
  destroyChart('typeChart');
  const byType = {};
  rich.forEach(t=>{ const k=t.tradeType||'Unknown'; byType[k]=(byType[k]||0)+1; });
  CHARTS.typeChart = new Chart(document.getElementById('typeChart'), {
    type:'doughnut',
    data:{
      labels:Object.keys(byType),
      datasets:[{data:Object.values(byType),
      backgroundColor:[CF.cyan,CF.violet,CF.amber],
      borderColor:'#0D0F17',borderWidth:3,
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'60%',
      plugins:{
        legend:{labels:{color:CF.text2,font:{family:"'DM Mono',monospace",size:10},padding:12}},
        tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.raw}`}},
      }
    }
  });
  
  // Month Chart
  destroyChart('monthChart');
  const byMonth = {};
  rich.forEach(t=>{ const k=fmt.monthKey(t.date); byMonth[k]=(byMonth[k]||0)+(t.pnl||0); });
  if (Object.keys(byMonth).length > 0) {
    CHARTS.monthChart = new Chart(document.getElementById('monthChart'), {
      type:'bar',
      data:{
        labels:Object.keys(byMonth),
        datasets:[{
          label:'Monthly P&L (₹)',data:Object.values(byMonth),
          backgroundColor:Object.values(byMonth).map(v=>v>=0?'rgba(0,200,150,0.65)':'rgba(255,77,109,0.65)'),
          borderRadius:4,
        }]
      },
      options:{...baseOpts(20),plugins:{...baseOpts().plugins,tooltip:{...baseOpts().plugins.tooltip,callbacks:{label:ctx=>` ${fmt.currency(ctx.raw,0)}`}}}},
    });
  }
  
  renderRecentTable();
  const now = new Date();
  set('dashDate', `Updated ${now.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}`);
}

function renderRecentTable() {
  if (trades.length === 0) {
    showEmptyState('recentTbody', 'No trades yet', 'Add your first trade to see it here');
    return;
  }
  const q    = (document.getElementById('dashSearch')?.value||'').toLowerCase();
  const rich = trades.map((t,i)=>({...enrich(t),_i:i}));
  const filt = rich.filter(t=>
    !q || (t.symbol||'').toLowerCase().includes(q) || (t.date||'').includes(q) || (t.reason||'').toLowerCase().includes(q)
  );
  const tbody = document.getElementById('recentTbody'); if(!tbody) return;
  
  if (filt.length === 0) {
    showEmptyState('recentTbody', 'No matching trades', 'Try different search terms');
    return;
  }
  tbody.innerHTML = filt.slice(-20).reverse().map((t,n)=>tradeRow(t,n+1)).join('');
}

/* ═══ JOURNAL ═══ */
const PAGE_SIZE = 15;
let jPage = 1;

function renderJournal() { 
  if (trades.length === 0) {
    renderEmptyJournal();
    populateFilters();
    return;
  }
  jPage=1; renderJournalPage(); populateFilters(); 
}

function renderJournalPage() {
  const q   = (document.getElementById('journalSearch')?.value||'').toLowerCase();
  const fM  = document.getElementById('filterMonth')?.value||'';
  const fS  = document.getElementById('filterSymbol')?.value||'';
  const fR  = document.getElementById('filterResult')?.value||'';
  
  const rich = trades.map((t,i)=>({...enrich(t),_i:i}));
  const filt = rich.filter(t=>{
    if(q&&!((t.symbol||'').toLowerCase().includes(q)||(t.date||'').includes(q)||(t.reason||'').toLowerCase().includes(q))) return false;
    if(fM && fmt.monthKey(t.date)!==fM) return false;
    if(fS && t.symbol!==fS) return false;
    if(fR && t.result!==fR) return false;
    return true;
  });
  
  const deleteBtn = document.getElementById('deleteFilteredBtn');
  if(deleteBtn) {
    const hasFilters = q || fM || fS || fR;
    deleteBtn.style.display = (hasFilters && filt.length > 0) ? 'flex' : 'none';
  }
  
  if (filt.length === 0) {
    showEmptyState('journalTbody', 'No trades match your filters', 'Clear filters or add new trades');
    document.getElementById('journalPagination').innerHTML = '';
    return;
  }
  
  const total=filt.length, pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  if(jPage>pages) jPage=pages;
  const slice = filt.slice((jPage-1)*PAGE_SIZE, jPage*PAGE_SIZE);
  const tbody = document.getElementById('journalTbody'); if(!tbody) return;
  tbody.innerHTML = slice.map((t,n)=>journalRow(t,(jPage-1)*PAGE_SIZE+n+1)).join('');
  
  const pg = document.getElementById('journalPagination'); if(!pg) return;
  let html = '';
  for(let p=1;p<=pages;p++) html+=`<button class="pg-btn${p===jPage?' active':''}" onclick="goPage(${p})">${p}</button>`;
  html += `<span class="pg-info">${total} trade${total!==1?'s':''}</span>`;
  pg.innerHTML = html;
}

function goPage(p) { jPage=p; renderJournalPage(); }

function populateFilters() {
  const months  = [...new Set(trades.map(t=>fmt.monthKey(t.date)).filter(Boolean))];
  const symbols = [...new Set(trades.map(t=>t.symbol).filter(Boolean))];
  const mSel=document.getElementById('filterMonth'), sSel=document.getElementById('filterSymbol');
  if(!mSel||!sSel) return;
  const curM=mSel.value, curS=sSel.value;
  mSel.innerHTML = '<option value="">All Months</option>' + months.map(m=>`<option value="${m}"${m===curM?' selected':''}>${m}</option>`).join('');
  sSel.innerHTML = '<option value="">All Symbols</option>' + symbols.map(s=>`<option value="${s}"${s===curS?' selected':''}>${s}</option>`).join('');
}

/* ═══ ROW BUILDERS ═══ */
function tradeRow(t, n) {
  const pc = pnlCls(t.pnl);
  return `<tr>
  <td style="color:var(--text3)">${n}</td>
  <td>${fmt.date(t.date)}</td>
  <td class="col-main">${t.symbol||'—'}</td>
  <td><span class="badge ${t.tradeType==='Buy Trade'?'badge-buy':'badge-sell'}">${t.tradeType||'—'}</span></td>
  <td>${fmt.num(t.entryPrice,2)}</td>
  <td>${isNum(t.exitPrice)?fmt.num(t.exitPrice,2):'<span style="color:var(--text3)">Open</span>'}</td>
  <td>${fmt.num(t.stopLoss,2)}</td>
  <td class="${pnlCls(t.points)}">${fmt.num(t.points,2)}</td>
  <td class="${pc}">${fmt.currency(t.pnl,0)}</td>
  <td class="${pc}">${fmt.pct(t.pct)}</td>
  <td>${fmt.currency(t.capital,0)}</td>
  <td>${fmt.num(t.rr,2)}</td>
  <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${t.reason||'—'}</td>
  <td><span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-open'}">${t.result==='open'?'Open':t.result==='win'?'Win':'Loss'}</span></td>
  </tr>`;
}

function journalRow(t, n) {
  const pc = pnlCls(t.pnl);
  return `<tr>
  <td style="color:var(--text3)">${n}</td>
  <td>${fmt.date(t.date)}</td>
  <td class="col-main">${t.symbol||'—'}</td>
  <td><span class="badge ${t.tradeType==='Buy Trade'?'badge-buy':'badge-sell'}">${t.tradeType||'—'}</span></td>
  <td>${fmt.num(t.entryPrice,2)}</td>
  <td>${isNum(t.exitPrice)?fmt.num(t.exitPrice,2):'<span style="color:var(--text3)">Open</span>'}</td>
  <td>${fmt.num(t.stopLoss,2)}</td>
  <td>${fmt.num(t.slSize,2)}</td>
  <td>${fmt.num(t.target1,2)}</td>
  <td>${fmt.num(t.target2,2)}</td>
  <td>${fmt.num(t.target3,2)}</td>
  <td>${fmt.num(t.target4,2)}</td>
  <td class="${pnlCls(t.points)}">${fmt.num(t.points,2)}</td>
  <td class="${pc}">${fmt.currency(t.pnl,0)}</td>
  <td class="${pc}">${fmt.pct(t.pct)}</td>
  <td>${fmt.currency(t.capital,0)}</td>
  <td>${fmt.num(t.rr,2)}</td>
  <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis">${t.reason||'—'}</td>
  <td><span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-open'}">${t.result==='open'?'Open':t.result==='win'?'Win':'Loss'}</span></td>
  <td>
  <button class="btn-edit-sm" onclick="openEditView(${t._i})">Edit</button>
  <button class="btn-del-sm"  onclick="deleteTrade(${t._i})">Del</button>
  </td>
  </tr>`;
}

/* ═══ FORM FUNCTIONS ═══ */
function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

function setRadioValue(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if(el) el.checked = true;
}

function openEditView(idx) {
  const t = trades[idx]; if(!t) return;
  switchView('add', document.querySelector('[data-view="add"]'));
  document.getElementById('formTitle').textContent = 'Edit Trade';
  document.getElementById('editIndex').value = idx;
  setv('fDate',t.date||''); setv('fSymbol',t.symbol||''); setv('fType',t.tradeType||'');
  setv('fCapital',t.capital??''); setv('fEntry',t.entryPrice??''); setv('fSL',t.stopLoss??'');
  setv('fExit',t.exitPrice??''); setv('fT1',t.target1??''); setv('fT2',t.target2??'');
  setv('fT3',t.target3??''); setv('fT4',t.target4??'');
  setv('fReason',t.reason||''); setv('fObjective',t.objective||'');
  setRadioValue('fEntryDiscipline', t.entryDiscipline || 'perfect');
  setRadioValue('fSLPlacement', t.slPlacement || 'system');
  setRadioValue('fExitQuality', t.exitQuality || 'plan');
  calcPnl();
}

function cancelEdit() { clearForm(); switchView('journal',document.querySelector('[data-view="journal"]')); }

function clearForm() {
  ['fDate','fSymbol','fType','fCapital','fEntry','fSL','fExit','fT1','fT2','fT3','fT4','fReason','fObjective'].forEach(id=>setv(id,''));
  document.getElementById('editIndex').value = '-1';
  document.getElementById('formTitle').textContent = 'Add New Trade';
  ['calcSLSize','calcPoints','calcPnL','calcPct','calcRR'].forEach(id=>{ const e=document.getElementById(id); if(e){e.textContent='—';e.style.color='';} });
  setRadioValue('fEntryDiscipline', 'perfect');
  setRadioValue('fSLPlacement', 'system');
  setRadioValue('fExitQuality', 'plan');
}

/* ═══ SAVE TRADE - FIXED FOR FIREBASE SYNC ═══ */
function saveTrade() {
  const date=getv('fDate'), symbol=getv('fSymbol').trim(), type=getv('fType');
  const cap=parseFloat(getv('fCapital')), entry=parseFloat(getv('fEntry')), sl=parseFloat(getv('fSL'));
  if(!date)       return showToast('Please enter a date.','error');
  if(!symbol)     return showToast('Please enter a stock symbol.','error');
  if(!type)       return showToast('Please select a trade type.','error');
  if(isNaN(entry))return showToast('Please enter a valid entry price.','error');
  if(isNaN(sl))   return showToast('Please enter a valid stop loss.','error');
  
  const currentCapital = getCurrentCapital();
  const invested = parseFloat(getv('fCapital'));
  let totalInvested = trades.reduce((sum, t) => sum + (t.capital || 0), 0);
  const editIdx = parseInt(document.getElementById('editIndex').value);
  
  if (editIdx >= 0 && trades[editIdx]?.capital) {
    totalInvested -= trades[editIdx].capital;
  }
  
  if (currentCapital > 0 && (totalInvested + invested) > currentCapital) {
    if (!confirm(`⚠️ Total invested capital will exceed current capital.
Current Capital: ₹${fmt.currency(currentCapital,0)}
After this trade: ₹${fmt.currency(totalInvested + invested,0)}
Continue anyway?`)) {
      return;
    }
  }
  
  const targets = calcTargets(entry, sl, type);
  const trade = {
    date, symbol, tradeType:type,
    capital:isNaN(cap)?null:cap, entryPrice:entry, stopLoss:sl,
    exitPrice:parseFloat(getv('fExit'))||null,
    target1: targets.t1, target2: targets.t2, target3: targets.t3, target4: targets.t4,
    reason:getv('fReason'), objective:getv('fObjective'),
    entryDiscipline: getRadioValue('fEntryDiscipline'),
    slPlacement: getRadioValue('fSLPlacement'),
    exitQuality: getRadioValue('fExitQuality'),
  };
  
  const idx = parseInt(document.getElementById('editIndex').value);
  if(idx>=0) { 
    trades[idx] = {...trade, firebaseId: trades[idx].firebaseId}; 
    showToast('Trade updated! ✓', 'success'); 
  } else { 
    trades.push(trade); 
    showToast('Trade added! ✓', 'success'); 
  }
  
  // 🔄 SYNC TO FIREBASE (with userId)
  syncTradeToCloud(trade);
  
  clearForm(); 
  // renderAll() will be called by realtime listener automatically
  switchView('journal',document.querySelector('[data-view="journal"]'));
}

/* ═══ DELETE TRADE - FIXED FOR FIREBASE ═══ */
function deleteTrade(idx) {
  if(!confirm('Delete this trade permanently? This cannot be undone.')) return;
  
  const trade = trades[idx];
  const firebaseId = trade.firebaseId;
  
  // Remove from local array first for immediate UI update
  trades.splice(idx, 1);
  
  // 🔄 DELETE FROM FIREBASE
  if (firebaseId && syncEnabled && currentUserId) {
    deleteTradeFromCloud(firebaseId);
  }
  
  // Backup to localStorage
  saveTrades(trades);
  
  showToast('Trade deleted ✓', 'success');
  // renderAll() will be called by realtime listener
}

/* ═══ CALC PNL ═══ */
function calcPnl() {
  const entry = parseFloat(getv('fEntry'));
  const sl = parseFloat(getv('fSL'));
  const exit = parseFloat(getv('fExit'));
  const cap = parseFloat(getv('fCapital'));
  const tradeType = getv('fType');
  const targets = calcTargets(entry, sl, tradeType);
  
  setv('fT1', targets.t1 !== null ? targets.t1.toFixed(2) : '');
  setv('fT2', targets.t2 !== null ? targets.t2.toFixed(2) : '');
  setv('fT3', targets.t3 !== null ? targets.t3.toFixed(2) : '');
  setv('fT4', targets.t4 !== null ? targets.t4.toFixed(2) : '');
  
  const slSize = calcSLSize(entry, sl);
  const points = calcPoints(entry, isNaN(exit) ? null : exit, isNaN(sl) ? null : sl);
  const pnl = calcProfitLoss(entry, isNaN(exit) ? null : exit, isNaN(sl) ? null : sl, cap);
  const pct = calcPctReturn(entry, isNaN(exit) ? null : exit, isNaN(sl) ? null : sl);
  const rr = calcRR(entry, sl, targets.t1);
  
  const setCalc = (id, val, fmt_fn, clr_fn) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.textContent = val !== null ? fmt_fn(val) : '—';
    e.style.color = val !== null && clr_fn ? clr_fn(val) : 'var(--cyan)';
  };
  
  setCalc('calcSLSize', slSize, v => fmt.num(v, 2), null);
  setCalc('calcPoints', points, v => fmt.num(v, 2), pnlClr);
  setCalc('calcPnL', pnl, v => fmt.currency(v, 0), pnlClr);
  setCalc('calcPct', pct, v => fmt.pct(v), pnlClr);
  setCalc('calcRR', rr, v => fmt.num(v, 2), null);
}

/* ═══ ANALYTICS ═══ */
function renderAnalytics() {
  if (trades.length === 0) {
    renderEmptyAnalytics();
    initCalendar();
    return;
  }
  
  const rich   = trades.map(enrich);
  const wins   = rich.filter(t=>t.result==='win');
  const losses = rich.filter(t=>t.result==='loss');
  const closed = wins.length + losses.length;
  const totalPnl = rich.reduce((a,t)=>a+(t.pnl||0),0);
  const winRate  = closed>0 ? wins.length/closed : 0;
  const avgWin   = wins.length   ? wins.reduce((a,t)=>a+(t.pnl||0),0)/wins.length : 0;
  const avgLoss  = losses.length ? losses.reduce((a,t)=>a+(t.pnl||0),0)/losses.length : 0;
  const rrVals   = rich.map(t=>t.rr).filter(v=>v!==null);
  const avgRR    = rrVals.length ? rrVals.reduce((a,b)=>a+b,0)/rrVals.length : 0;
  const maxWin   = wins.length   ? Math.max(...wins.map(t=>t.pnl))   : 0;
  const maxLoss  = losses.length ? Math.min(...losses.map(t=>t.pnl)) : 0;
  const totalInvested = rich.reduce((a,t)=>a+(t.capital||0),0);
  const expectancy = winRate*avgWin + (1-winRate)*avgLoss;
  
  const currentCapital = getCurrentCapital();
  
  let streak=0,maxStreak=0,curStreak=0;
  rich.filter(t=>t.result!=='open').forEach(t=>{
    if(t.result==='win'){streak++;maxStreak=Math.max(maxStreak,streak);}else streak=0;
    curStreak=streak;
  });
  const profitFactor = losses.length && Math.abs(avgLoss)>0 ? Math.abs(avgWin*wins.length / (avgLoss*losses.length)) : null;
  
  const data = [
    {label:'Total Trades Logged', val:rich.length, clr:''},
    {label:'Closed Trades',       val:closed, clr:''},
    {label:'Open Positions',      val:rich.filter(t=>t.result==='open').length, clr:'var(--amber)'},
    {label:'Win Rate',            val:fmt.pct(winRate), clr:winRate>=.5?'var(--emerald)':'var(--rose)'},
    {label:'Total P&L',           val:fmt.currency(totalPnl,0), clr:pnlClr(totalPnl)},
    {label:'Expectancy / Trade',  val:fmt.currency(expectancy,0), clr:pnlClr(expectancy)},
    {label:'Avg Win',             val:fmt.currency(avgWin,0), clr:'var(--emerald)'},
    {label:'Avg Loss',            val:fmt.currency(avgLoss,0), clr:'var(--rose)'},
    {label:'Best Trade',          val:fmt.currency(maxWin,0), clr:'var(--emerald)'},
    {label:'Worst Trade',         val:fmt.currency(maxLoss,0), clr:'var(--rose)'},
    {label:'Avg R:R Ratio',       val:fmt.num(avgRR,2), clr:avgRR>=1?'var(--emerald)':'var(--amber)'},
    {label:'Profit Factor',       val:profitFactor!==null?profitFactor.toFixed(2):'—', clr:profitFactor>=1?'var(--emerald)':'var(--rose)'},
    {label:'Max Win Streak',      val:maxStreak, clr:'var(--cyan)'},
    {label:'Current Capital',     val:fmt.currency(currentCapital,0), clr:pnlClr(currentCapital - getDepositedCapital())},
  ];
  
  const grid=document.getElementById('statsGrid'); if(grid){
    grid.innerHTML = data.map(s=>`
    <div class="stat-card">
    <div class="stat-label">${s.label}</div>
    <div class="stat-val" style="color:${s.clr||'var(--text)'}">${s.val}</div>
    </div>`).join('');
  }
  
  const tbody=document.getElementById('reportTbody'); if(tbody){
    const rows=[];
    for(let i=0;i<data.length;i+=2){
      const a=data[i],b=data[i+1]||{};
      rows.push(`<tr>
      <td style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.08em">${a.label}</td>
      <td style="font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;color:${a.clr||'var(--text)'}">${a.val}</td>
      <td style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.08em">${b.label||''}</td>
      <td style="font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;color:${b.clr||'var(--text)'}">${b.val||''}</td>
      </tr>`);
    }
    tbody.innerHTML = rows.join('');
  }
  
  destroyChart('rrChart');
  const buckets=[0,0.5,1,1.5,2,2.5,3];
  const counts=new Array(buckets.length).fill(0);
  rrVals.forEach(v=>{ for(let i=buckets.length-1;i>=0;i--){ if(v>=buckets[i]){counts[i]++;break;} } });
  CHARTS.rrChart = new Chart(document.getElementById('rrChart'),{
    type:'bar',
    data:{
      labels:buckets.map((b,i)=>`${b}${i<buckets.length-1?'–'+buckets[i+1]:'+'}`),
      datasets:[{label:'# Trades',data:counts,backgroundColor:'rgba(0,212,255,0.55)',borderRadius:4}]
    },
    options:baseOpts(),
  });
  
  renderExecutionQualityCharts(rich);
  initCalendar();
}

/* ═══ EXECUTION QUALITY CHARTS ═══ */
function renderExecutionQualityCharts(rich) {
  destroyChart('entryDisciplineChart');
  const entryData = { perfect:0, early:0, late:0 };
  rich.forEach(t => { if(t.entryDiscipline) entryData[t.entryDiscipline]++; });
  const entryCtx = document.getElementById('entryDisciplineChart');
  if(entryCtx) {
    CHARTS.entryDisciplineChart = new Chart(entryCtx, {
      type: 'doughnut',
      data: {
        labels: ['Perfect', 'Early', 'Late'],
        datasets: [{
          data: [entryData.perfect, entryData.early, entryData.late],
          backgroundColor: [CF.perfect, CF.early, CF.late],
          borderColor: '#0D0F17',
          borderWidth: 3,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: CF.text2, font: { family: "'DM Mono', monospace", size: 9 }, padding: 10 }},
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} trades` }}
        }
      }
    });
  }
  
  destroyChart('slPlacementChart');
  const slData = { system:0, emotional:0 };
  rich.forEach(t => { if(t.slPlacement) slData[t.slPlacement]++; });
  const slCtx = document.getElementById('slPlacementChart');
  if(slCtx) {
    CHARTS.slPlacementChart = new Chart(slCtx, {
      type: 'doughnut',
      data: {
        labels: ['As per system', 'Emotional'],
        datasets: [{
          data: [slData.system, slData.emotional],
          backgroundColor: [CF.system, CF.emotional],
          borderColor: '#0D0F17',
          borderWidth: 3,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: CF.text2, font: { family: "'DM Mono', monospace", size: 9 }, padding: 10 }},
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} trades` }}
        }
      }
    });
  }
  
  destroyChart('exitQualityChart');
  const exitData = { plan:0, panic:0, greed:0 };
  rich.forEach(t => { if(t.exitQuality) exitData[t.exitQuality]++; });
  const exitCtx = document.getElementById('exitQualityChart');
  if(exitCtx) {
    CHARTS.exitQualityChart = new Chart(exitCtx, {
      type: 'doughnut',
      data: {
        labels: ['As per plan', 'Panic exit', 'Greed hold'],
        datasets: [{
          data: [exitData.plan, exitData.panic, exitData.greed],
          backgroundColor: [CF.plan, CF.panic, CF.greed],
          borderColor: '#0D0F17',
          borderWidth: 3,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: CF.text2, font: { family: "'DM Mono', monospace", size: 9 }, padding: 10 }},
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} trades` }}
        }
      }
    });
  }
  
  destroyChart('pnlByExecutionChart');
  const pnlByEntry = { perfect: [], early: [], late: [] };
  rich.filter(t => t.result !== 'open').forEach(t => {
    if(t.entryDiscipline && t.pnl !== null) pnlByEntry[t.entryDiscipline].push(t.pnl);
  });
  const avgPnlByEntry = {
    perfect: pnlByEntry.perfect.length ? pnlByEntry.perfect.reduce((a,b)=>a+b,0)/pnlByEntry.perfect.length : 0,
    early: pnlByEntry.early.length ? pnlByEntry.early.reduce((a,b)=>a+b,0)/pnlByEntry.early.length : 0,
    late: pnlByEntry.late.length ? pnlByEntry.late.reduce((a,b)=>a+b,0)/pnlByEntry.late.length : 0,
  };
  const pnlCtx = document.getElementById('pnlByExecutionChart');
  if(pnlCtx) {
    CHARTS.pnlByExecutionChart = new Chart(pnlCtx, {
      type: 'bar',
      data: {
        labels: ['Perfect Entry', 'Early Entry', 'Late Entry'],
        datasets: [{
          label: 'Avg P&L (₹)',
          data: [avgPnlByEntry.perfect, avgPnlByEntry.early, avgPnlByEntry.late],
          backgroundColor: [
            avgPnlByEntry.perfect >= 0 ? 'rgba(0,200,150,0.7)' : 'rgba(255,77,109,0.7)',
            avgPnlByEntry.early >= 0 ? 'rgba(245,158,11,0.7)' : 'rgba(255,77,109,0.7)',
            avgPnlByEntry.late >= 0 ? 'rgba(0,212,255,0.7)' : 'rgba(255,77,109,0.7)',
          ],
          borderRadius: 4,
        }]
      },
      options: {
        ...baseOpts(),
        plugins: {
          ...baseOpts().plugins,
          tooltip: { callbacks: { label: ctx => ` ${fmt.currency(ctx.raw, 0)}` }}
        }
      }
    });
  }
  renderExecutionQualitySummary(rich);
}

function renderExecutionQualitySummary(rich) {
  const summary = document.getElementById('execQualitySummary');
  if(!summary) return;
  
  const getWinRate = (field, value) => {
    const filtered = rich.filter(t => t[field] === value && t.result !== 'open');
    const wins = filtered.filter(t => t.result === 'win').length;
    return filtered.length > 0 ? ((wins / filtered.length) * 100).toFixed(1) : '—';
  };
  
  const getAvgPnl = (field, value) => {
    const filtered = rich.filter(t => t[field] === value && t.result !== 'open' && t.pnl !== null);
    return filtered.length > 0 ? fmt.currency(filtered.reduce((a,t)=>a+t.pnl,0)/filtered.length, 0) : '—';
  };
  
  summary.innerHTML = `
  <div class="exec-summary-grid">
  <div class="exec-summary-item">
  <div class="exec-summary-label">Perfect Entry Win Rate</div>
  <div class="exec-summary-value profit">${getWinRate('entryDiscipline', 'perfect')}%</div>
  </div>
  <div class="exec-summary-item">
  <div class="exec-summary-label">System SL Win Rate</div>
  <div class="exec-summary-value profit">${getWinRate('slPlacement', 'system')}%</div>
  </div>
  <div class="exec-summary-item">
  <div class="exec-summary-label">Planned Exit Win Rate</div>
  <div class="exec-summary-value profit">${getWinRate('exitQuality', 'plan')}%</div>
  </div>
  <div class="exec-summary-item">
  <div class="exec-summary-label">Perfect Entry Avg P&L</div>
  <div class="exec-summary-value">${getAvgPnl('entryDiscipline', 'perfect')}</div>
  </div>
  <div class="exec-summary-item">
  <div class="exec-summary-label">System SL Avg P&L</div>
  <div class="exec-summary-value">${getAvgPnl('slPlacement', 'system')}</div>
  </div>
  <div class="exec-summary-item">
  <div class="exec-summary-label">Planned Exit Avg P&L</div>
  <div class="exec-summary-value">${getAvgPnl('exitQuality', 'plan')}</div>
  </div>
  </div>`;
}

/* ═══ EXPORT - EXCEL COMPATIBLE ═══ */
function exportCSV() {
  const headers = ['Date','Symbol','Trade Type','Entry Price','Stop Loss','SL Size','Exit Price',
  'Points','Target 1','Target 2','Target 3','Target 4','Capital (INR)','P&L (INR)','Return %','R:R Ratio',
  'Reason','Notes','Result','Entry Discipline','SL Placement','Exit Quality'];
  
  const rows = trades.map(t=>{
    const r=enrich(t);
    return [r.date,r.symbol,r.tradeType,r.entryPrice,r.stopLoss,
    r.slSize!==null?r.slSize.toFixed(2):'',r.exitPrice??'',
    r.points!==null?r.points.toFixed(2):'',
    r.target1??'',r.target2??'',r.target3??'',r.target4??'',
    r.capital??'',r.pnl!==null?r.pnl.toFixed(2):'',
    r.pct!==null?(r.pct*100).toFixed(4):'',r.rr!==null?r.rr.toFixed(2):'',
    r.reason??'',r.objective??'',r.result,
    r.entryDiscipline??'',r.slPlacement??'',r.exitQuality??'',
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',');
  });
  
  // Add UTF-8 BOM for Excel compatibility
  const csv = '\uFEFF' + [headers.join(','),...rows].join('\n');
  
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`TradeVault_Export_${new Date().toISOString().substring(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  showToast('Excel-ready CSV exported! 📊','success');
}

/* ═══ VIEW ROUTING ═══ */
const VIEW_META = {
  dashboard:{title:'Dashboard',badge:'Overview'},
  journal:  {title:'Trade Journal',badge:'All Trades'},
  add:      {title:'Add Trade',badge:'New Entry'},
  report:   {title:'Analytics',badge:'Performance'},
};

function switchView(name, navEl) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const v=document.getElementById(`view-${name}`); if(v) v.classList.add('active');
  const nav=navEl||document.querySelector(`[data-view="${name}"]`); if(nav) nav.classList.add('active');
  const meta=VIEW_META[name]||{title:name,badge:''};
  set('topbarTitle',meta.title); set('topbarBadge',meta.badge);
  if(window.innerWidth<900) document.getElementById('sidebar').classList.remove('open');
  if(name==='dashboard') renderDashboard();
  if(name==='journal')   renderJournal();
  if(name==='report')    renderAnalytics();
  return false;
}

/* ═══ MODAL ═══ */
function openModal(idx) {
  const t=enrich({...trades[idx],_i:idx});
  document.getElementById('modalTitle').innerHTML = `<span style="color:var(--cyan)">${t.symbol||'—'}</span> &nbsp;·&nbsp; ${fmt.date(t.date)}`;
  const fields = [
  ['Date',t.date?fmt.date(t.date):'—'],['Symbol',t.symbol||'—'],
  ['Trade Type',t.tradeType||'—'],['Result',`<span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-open'}">${t.result==='open'?'Open':t.result==='win'?'Win':'Loss'}</span>`],
  ['Entry Price',fmt.num(t.entryPrice,2)],['Exit Price',isNum(t.exitPrice)?fmt.num(t.exitPrice,2):'Open'],
  ['Stop Loss',fmt.num(t.stopLoss,2)],['SL Size',fmt.num(t.slSize,2)],
  ['Points',`<span class="${pnlCls(t.points)}">${fmt.num(t.points,2)}</span>`],
  ['P&L (₹)',`<span class="${pnlCls(t.pnl)}">${fmt.currency(t.pnl,0)}</span>`],
  ['Return %',`<span class="${pnlCls(t.pct)}">${fmt.pct(t.pct)}</span>`],
  ['Capital',fmt.currency(t.capital,0)],['R:R Ratio',fmt.num(t.rr,2)],['Target 1',fmt.num(t.target1,2)],
  ['Target 2',fmt.num(t.target2,2)],['Target 3',fmt.num(t.target3,2)],
  ['Entry Discipline', t.entryDiscipline ? t.entryDiscipline.charAt(0).toUpperCase() + t.entryDiscipline.slice(1) : '—'],
  ['SL Placement', t.slPlacement ? t.slPlacement === 'system' ? 'As per system' : t.slPlacement.charAt(0).toUpperCase() + t.slPlacement.slice(1) : '—'],
  ['Exit Quality', t.exitQuality ? t.exitQuality === 'plan' ? 'As per plan' : t.exitQuality.charAt(0).toUpperCase() + t.exitQuality.slice(1) : '—'],
  ];
  document.getElementById('modalBody').innerHTML = `<div class="modal-grid">${fields.map(([l,v])=>`<div><div class="modal-field-label">${l}</div><div class="modal-field-val">${v}</div></div>`).join('')}</div>`;
  document.getElementById('modalDeleteBtn').onclick = ()=>{ closeModal(); deleteTrade(idx); };
  document.getElementById('modalEditBtn').onclick   = ()=>{ closeModal(); openEditView(idx); };
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

/* ═══ SIDEBAR ═══ */
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

/* ═══ TOAST ═══ */
let toastTimer;
function showToast(msg, type='') {
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg; t.className=`toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

// Alias for backward compatibility
function toast(msg, type='') { showToast(msg, type); }

/* ═══ HELPERS ═══ */
function el(id) { return document.getElementById(id); }
function set(id,val) { const e=el(id); if(e) e.textContent=val; }
function cls(id,c) { const e=el(id); if(e){ e.className=''; if(c) e.classList.add(c); } }
function setv(id,val) { const e=el(id); if(e) e.value=val; }
function getv(id) { const e=el(id); return e?e.value:''; }

function renderAll() {
  const a=document.querySelector('.view.active'); if(!a) return;
  const n=a.id.replace('view-','');
  if(n==='dashboard') renderDashboard();
  if(n==='journal')   renderJournal();
  if(n==='report')    renderAnalytics();
}

/* ═══ CALENDAR FUNCTIONS ═══ */
let calendarPeriod = 'month';
let currentDate = new Date();

function setCalendarPeriod(period) {
  calendarPeriod = period;
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === period);
  });
  renderCalendar();
}

function navigateCalendar(direction) {
  if (direction === 0) {
    currentDate = new Date();
  } else {
    const newDate = new Date(currentDate);
    switch(calendarPeriod) {
      case 'day': newDate.setDate(newDate.getDate() + direction); break;
      case 'week': newDate.setDate(newDate.getDate() + (direction * 7)); break;
      case 'month': newDate.setMonth(newDate.getMonth() + direction); break;
      case 'quarter': newDate.setMonth(newDate.getMonth() + (direction * 3)); break;
      case 'year': newDate.setFullYear(newDate.getFullYear() + direction); break;
    }
    currentDate = newDate;
  }
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const label = document.getElementById('currentPeriodLabel');
  if (!grid) return;
  grid.className = 'calendar-grid ' + calendarPeriod + '-view';
  let cells = [], periodLabel = '';
  
  switch(calendarPeriod) {
    case 'day':
      cells = renderDayView();
      periodLabel = currentDate.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
      break;
    case 'week':
      cells = renderWeekView();
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      periodLabel = `Week of ${weekStart.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} - ${weekEnd.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`;
      break;
    case 'month':
      cells = renderMonthView();
      periodLabel = currentDate.toLocaleDateString('en-IN', { month:'long', year:'numeric' });
      break;
    case 'quarter':
      cells = renderQuarterView();
      const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
      periodLabel = `Q${quarter} ${currentDate.getFullYear()}`;
      break;
    case 'year':
      cells = renderYearView();
      periodLabel = currentDate.getFullYear().toString();
      break;
  }
  label.textContent = periodLabel;
  grid.innerHTML = cells.join('');
  renderCalendarSummary();
}

function renderDayView() {
  const cells = [];
  const dateKey = formatDateKey(currentDate);
  const dayData = getDayData(dateKey);
  const isToday = isSameDay(currentDate, new Date());
  const cellClass = getCellClass(dayData.pnl);
  cells.push(`
  <div class="calendar-cell ${cellClass} ${isToday?'today':''}" onclick="showDayDetails('${dateKey}')">
  <div class="cell-header">
  <span class="cell-date">${currentDate.getDate()}</span>
  <span>${currentDate.toLocaleDateString('en-IN',{weekday:'short'})}</span>
  </div>
  ${dayData.pnl!==null?`<div class="cell-pnl ${dayData.pnl>=0?'profit':'loss'}">${fmt.currency(dayData.pnl,0)}</div><div class="cell-trades">${dayData.trades} trade${dayData.trades!==1?'s':''}</div>`:'<div class="cell-empty">No trades</div>'}
  </div>`);
  return cells;
}

function renderWeekView() {
  const cells = [], weekStart = getWeekStart(currentDate);
  for(let i=0;i<7;i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateKey = formatDateKey(date);
    const dayData = getDayData(dateKey);
    const isToday = isSameDay(date, new Date());
    const cellClass = getCellClass(dayData.pnl);
    cells.push(`
    <div class="calendar-cell ${cellClass} ${isToday?'today':''}" onclick="showDayDetails('${dateKey}')">
    <div class="cell-header">
    <span class="cell-date">${date.getDate()}</span>
    <span>${date.toLocaleDateString('en-IN',{weekday:'short'})}</span>
    </div>
    ${dayData.pnl!==null?`<div class="cell-pnl ${dayData.pnl>=0?'profit':'loss'}">${fmt.currency(dayData.pnl,0)}</div><div class="cell-trades">${dayData.trades}T</div>`:'<div class="cell-empty">-</div>'}
    </div>`);
  }
  return cells;
}

function renderMonthView() {
  const cells = [];
  const year = currentDate.getFullYear(), month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1), lastDay = new Date(year, month+1, 0);
  const startingDay = firstDay.getDay(), totalDays = lastDay.getDate();
  for(let i=0;i<startingDay;i++) cells.push('<div class="calendar-cell neutral"><div class="cell-empty"></div></div>');
  for(let day=1;day<=totalDays;day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const dayData = getDayData(dateKey);
    const isToday = isSameDay(date, new Date());
    const cellClass = getCellClass(dayData.pnl);
    cells.push(`
    <div class="calendar-cell ${cellClass} ${isToday?'today':''}" onclick="showDayDetails('${dateKey}')">
    <div class="cell-header"><span class="cell-date">${day}</span></div>
    ${dayData.pnl!==null?`<div class="cell-pnl ${dayData.pnl>=0?'profit':'loss'}">${fmt.currency(dayData.pnl,0)}</div><div class="cell-trades">${dayData.trades}T</div>`:'<div class="cell-empty">-</div>'}
    </div>`);
  }
  return cells;
}

function renderQuarterView() {
  const cells = [];
  const year = currentDate.getFullYear();
  const startMonth = Math.floor(currentDate.getMonth()/3)*3;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for(let i=0;i<3;i++) {
    const month = startMonth + i;
    const monthData = getMonthData(year, month);
    const cellClass = getCellClass(monthData.pnl);
    cells.push(`
    <div class="calendar-cell ${cellClass}" onclick="showMonthDetails(${year},${month})">
    <div class="cell-header"><span class="cell-date">${months[month]}</span></div>
    ${monthData.pnl!==null?`<div class="cell-pnl ${monthData.pnl>=0?'profit':'loss'}">${fmt.currency(monthData.pnl,0)}</div><div class="cell-trades">${monthData.trades} trades</div>`:'<div class="cell-empty">No trades</div>'}
    </div>`);
  }
  return cells;
}

function renderYearView() {
  const cells = [];
  const year = currentDate.getFullYear();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for(let month=0;month<12;month++) {
    const monthData = getMonthData(year, month);
    const cellClass = getCellClass(monthData.pnl);
    cells.push(`
    <div class="calendar-cell ${cellClass}" onclick="showMonthDetails(${year},${month})">
    <div class="cell-header"><span class="cell-date">${months[month]}</span></div>
    ${monthData.pnl!==null?`<div class="cell-pnl ${monthData.pnl>=0?'profit':'loss'}">${fmt.currency(monthData.pnl,0)}</div><div class="cell-trades">${monthData.trades} trades</div>`:'<div class="cell-empty">No trades</div>'}
    </div>`);
  }
  return cells;
}

function getDayData(dateKey) {
  const dayTrades = trades.filter(t => t.date === dateKey);
  const enriched = dayTrades.map(enrich);
  const pnl = enriched.reduce((sum, t) => sum + (t.pnl || 0), 0);
  return { pnl: dayTrades.length > 0 ? pnl : null, trades: dayTrades.length };
}

function getMonthData(year, month) {
  const monthTrades = trades.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const enriched = monthTrades.map(enrich);
  const pnl = enriched.reduce((sum, t) => sum + (t.pnl || 0), 0);
  return { pnl: monthTrades.length > 0 ? pnl : null, trades: monthTrades.length };
}

function getCellClass(pnl) {
  if (pnl === null) return 'neutral';
  return pnl >= 0 ? 'profit' : 'loss';
}

function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function renderCalendarSummary() {
  const summary = document.getElementById('calendarSummary');
  if (!summary) return;
  
  const periodTrades = getPeriodTrades();
  if (periodTrades.length === 0) {
    summary.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text3);font-size:11px">
    No trades in this period
    </div>`;
    return;
  }
  
  let stats = { totalPnl:0, totalTrades:0, wins:0, losses:0, winRate:0 };
  
  switch(calendarPeriod) {
    case 'day':
      const dayData = getDayData(formatDateKey(currentDate));
      stats.totalPnl = dayData.pnl || 0;
      stats.totalTrades = dayData.trades;
      break;
    case 'week':
      const weekStart = getWeekStart(currentDate);
      for(let i=0;i<7;i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dayData = getDayData(formatDateKey(date));
        if(dayData.pnl !== null) {
          stats.totalPnl += dayData.pnl;
          stats.totalTrades += dayData.trades;
        }
      }
      break;
    case 'month':
      const year = currentDate.getFullYear(), month = currentDate.getMonth();
      const monthData = getMonthData(year, month);
      stats.totalPnl = monthData.pnl || 0;
      stats.totalTrades = monthData.trades;
      break;
    case 'quarter':
      const qYear = currentDate.getFullYear();
      const startMonth = Math.floor(currentDate.getMonth()/3)*3;
      for(let i=0;i<3;i++) {
        const mData = getMonthData(qYear, startMonth+i);
        if(mData.pnl !== null) {
          stats.totalPnl += mData.pnl;
          stats.totalTrades += mData.trades;
        }
      }
      break;
    case 'year':
      const yYear = currentDate.getFullYear();
      for(let m=0;m<12;m++) {
        const mData = getMonthData(yYear, m);
        if(mData.pnl !== null) {
          stats.totalPnl += mData.pnl;
          stats.totalTrades += mData.trades;
        }
      }
      break;
  }
  
  const wins = periodTrades.filter(t => t.result === 'win').length;
  const losses = periodTrades.filter(t => t.result === 'loss').length;
  stats.wins = wins;
  stats.losses = losses;
  stats.winRate = (wins+losses) > 0 ? ((wins/(wins+losses))*100).toFixed(1) : 0;
  
  summary.innerHTML = `
  <div class="summary-stat"><div class="summary-label">Total P&L</div><div class="summary-value ${stats.totalPnl>=0?'profit':'loss'}">${fmt.currency(stats.totalPnl,0)}</div></div>
  <div class="summary-stat"><div class="summary-label">Total Trades</div><div class="summary-value">${stats.totalTrades}</div></div>
  <div class="summary-stat"><div class="summary-label">Wins</div><div class="summary-value profit">${stats.wins}</div></div>
  <div class="summary-stat"><div class="summary-label">Losses</div><div class="summary-value loss">${stats.losses}</div></div>
  <div class="summary-stat"><div class="summary-label">Win Rate</div><div class="summary-value">${stats.winRate}%</div></div>`;
}

function getPeriodTrades() {
  const enriched = trades.map(enrich);
  switch(calendarPeriod) {
    case 'day': return enriched.filter(t => t.date === formatDateKey(currentDate));
    case 'week':
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return enriched.filter(t => { const d = new Date(t.date); return d >= weekStart && d <= weekEnd; });
    case 'month': return enriched.filter(t => { const d = new Date(t.date); return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth(); });
    case 'quarter':
      const startMonth = Math.floor(currentDate.getMonth()/3)*3;
      return enriched.filter(t => { const d = new Date(t.date); return d.getFullYear() === currentDate.getFullYear() && d.getMonth() >= startMonth && d.getMonth() < startMonth+3; });
    case 'year': return enriched.filter(t => { const d = new Date(t.date); return d.getFullYear() === currentDate.getFullYear(); });
    default: return [];
  }
}

/* ═══ DELETE FILTERED TRADES ═══ */
function deleteFilteredTrades() {
  const q = (document.getElementById('journalSearch')?.value || '').toLowerCase();
  const fM = document.getElementById('filterMonth')?.value || '';
  const fS = document.getElementById('filterSymbol')?.value || '';
  const fR = document.getElementById('filterResult')?.value || '';
  
  const rich = trades.map((t, i) => ({...enrich(t), _i: i}));
  const filtered = rich.filter(t => {
    if(q && !((t.symbol||'').toLowerCase().includes(q) || (t.date||'').includes(q) || (t.reason||'').toLowerCase().includes(q))) return false;
    if(fM && fmt.monthKey(t.date) !== fM) return false;
    if(fS && t.symbol !== fS) return false;
    if(fR && t.result !== fR) return false;
    return true;
  });
  
  if(filtered.length === 0) {
    showToast('No trades to delete', 'error');
    return;
  }
  
  const confirmMsg = `Delete ${filtered.length} trade${filtered.length !== 1 ? 's' : ''}? This cannot be undone.`;
  if(!confirm(confirmMsg)) return;
  
  const indicesToDelete = filtered.map(t => t._i).sort((a, b) => b - a);
  indicesToDelete.forEach(idx => {
    const trade = trades[idx];
    if (trade.firebaseId && syncEnabled && currentUserId) {
      deleteTradeFromCloud(trade.firebaseId);
    }
    trades.splice(idx, 1);
  });
  
  saveTrades(trades);
  showToast(`${filtered.length} trade${filtered.length !== 1 ? 's' : ''} deleted successfully`, 'success');
  
  document.getElementById('journalSearch').value = '';
  document.getElementById('filterMonth').value = '';
  document.getElementById('filterSymbol').value = '';
  document.getElementById('filterResult').value = '';
  
  renderJournal();
  renderDashboard();
  
  const deleteBtn = document.getElementById('deleteFilteredBtn');
  if(deleteBtn) deleteBtn.style.display = 'none';
}

function showDayDetails(dateKey) {
  const dayTrades = trades.filter(t => t.date === dateKey);
  if(dayTrades.length === 0) { showToast('No trades on this day', 'error'); return; }
  switchView('journal', document.querySelector('[data-view="journal"]'));
  document.getElementById('journalSearch').value = dateKey;
  renderJournal();
}

function showMonthDetails(year, month) {
  switchView('journal', document.querySelector('[data-view="journal"]'));
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabel = `${monthNames[month]} ${year}`;
  setTimeout(() => {
    const select = document.getElementById('filterMonth');
    if(select) { select.value = monthLabel; renderJournal(); }
  }, 100);
}

function initCalendar() {
  renderCalendar();
}

/* ═══ CONNECTION HANDLERS ═══ */
window.addEventListener('online', () => {
  console.log('🌐 Back online');
  updateSyncStatus('connected');
  if (syncEnabled && currentUserId && db) {
    // Re-setup sync listener when back online
    if (window._syncUnsubscribe) {
      window._syncUnsubscribe();
    }
    setupRealtimeSync();
    showToast('🔄 Reconnected - syncing data...', 'success');
  }
});

window.addEventListener('offline', () => {
  console.log('✈️ Offline mode');
  updateSyncStatus('offline');
  showToast('⚠️ Offline - changes will sync when back online', 'error');
});

// Handle page visibility for better sync management
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && syncEnabled && currentUserId) {
    console.log('👁️ Page visible - refreshing data');
    // Optionally refresh data when tab becomes visible
  }
});

/* ═══ INIT ═══ */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Firebase first
  const firebaseOk = initFirebase();
  
  if (!firebaseOk) {
    console.error('Firebase failed to initialize');
    showToast('Failed to connect to server. Please refresh the page.', 'error');
    return;
  }
  
  const today = new Date().toISOString().substring(0,10);
  const fd = document.getElementById('fDate'); if(fd) fd.value=today;
  
  // Initial render (will be updated by realtime listener if synced)
  if (!syncEnabled) {
    // Load from localStorage for offline mode
    trades = loadTrades();
    renderDashboard();
    populateFilters();
  }
  
  updateSidebarCapital();
  updateSyncStatus(syncEnabled ? 'connected' : 'offline');
  
  if (document.getElementById('view-add')) {
    document.getElementById('fCapital')?.addEventListener('input', validateFormCapital);
  }
  
  // Periodic localStorage backup (every 30 seconds)
  setInterval(() => {
    if (trades.length > 0) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(trades));
      } catch(e) {
        console.warn('Backup failed:', e);
      }
    }
  }, 30000);
  
  // Apply saved theme on load
  const savedTheme = getPreferredTheme();
  if (savedTheme) {
    applyTheme(savedTheme);
  }
});
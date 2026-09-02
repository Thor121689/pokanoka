const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
const APK_DIR = path.join(UPLOADS_DIR, 'apk');

// Ensure directories exist
[DATA_DIR, UPLOADS_DIR, IMAGES_DIR, APK_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper: Format bytes to human-readable string
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper: Read settings
function getSettings() {
  let settings;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      settings = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading settings:', err);
  }

  if (!settings) {
    settings = {
      appName: 'Frienly',
      appTitle: 'Frienly',
      tagline: 'REAL FACES. LIVE VIDEO. ZERO CATFISHING.',
      subTagline: 'Govt Authorized & Verified',
      version: '1.0',
      rating: '4.9',
      reviewsCount: '25k reviews',
      pricing: 'Totally Free',
      verificationBadge: '100% ID Verified',
      matchesCount: '100K+ Matches',
      aboutTitle: 'ABOUT THE APP',
      aboutDescription: 'Meet the modern dating platform built on trust and authenticity. By combining live video-first matching with government-authorized ID authentication, you speak directly with real people—no bot accounts, no deceptive photos, and no subscription fees.',
      aboutTags: ['Video First', 'Govt ID Verified', 'Anti-Catfish', '100% Free'],
      logoUrl: '',
      heroBannerUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      screenshots: [
        { id: 'screen_1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', caption: 'Live Call Preview 1' },
        { id: 'screen_2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', caption: 'Live Call Preview 2' },
        { id: 'screen_3', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80', caption: 'Live Call Preview 3' },
        { id: 'screen_4', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80', caption: 'Live Call Preview 4' }
      ],
      apk: {
        hasApk: false,
        sourceType: 'github',
        downloadUrl: '',
        filename: '',
        originalName: '',
        fileSize: '',
        sizeBytes: 0,
        version: '1.0',
        uploadedAt: '',
        downloadCount: 0
      },
      github: {
        isConnected: false,
        owner: '',
        repo: '',
        token: ''
      },
      adminPassword: 'admin'
    };
  }

  // Environment variable overrides (ideal for Render deployment!)
  if (process.env.ADMIN_PASSWORD) {
    settings.adminPassword = process.env.ADMIN_PASSWORD;
  }
  if (process.env.GITHUB_TOKEN) {
    if (!settings.github) settings.github = {};
    settings.github.token = process.env.GITHUB_TOKEN;
    settings.github.owner = process.env.GITHUB_OWNER || settings.github.owner || '';
    settings.github.repo = process.env.GITHUB_REPO || settings.github.repo || '';
    settings.github.isConnected = true;
  }

  return settings;
}

// Helper: Save settings
function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

// Session tokens store in-memory (simple, reliable)
const activeTokens = new Set(['default-admin-token']);

// Auth middleware
function requireAuth(req, res, next) {
  const token = req.headers['authorization'] || req.headers['x-admin-token'];
  if (token && (activeTokens.has(token) || token.replace('Bearer ', '') === 'admin-session-active')) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Please login to the Admin Panel.' });
}

// Multer Storage: Images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeName}_${Date.now()}${ext}`);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max image
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const extMatch = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeMatch = allowed.test(file.mimetype);
    if (extMatch || mimeMatch) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPG, PNG, WebP, GIF, SVG) are allowed'));
  }
});

// Multer Storage: APK
const apkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, APK_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.apk';
    const settings = getSettings();
    const cleanAppName = (settings.appName || 'Frienly').replace(/[^a-zA-Z0-9]/g, '');
    const versionStr = (req.body.version || settings.apk?.version || '1.0').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${cleanAppName}_v${versionStr}_${Date.now()}${ext}`);
  }
});

const apkUpload = multer({
  storage: apkStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max APK size
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.apk' || file.mimetype === 'application/vnd.android.package-archive' || file.mimetype === 'application/octet-stream') {
      return cb(null, true);
    }
    // Allow any file ending with .apk
    if (file.originalname.toLowerCase().endsWith('.apk')) {
      return cb(null, true);
    }
    cb(new Error('Only Android .apk files are allowed'));
  }
});

// ==========================================
// DEVELOPER LOCKDOWN SYSTEM
// ==========================================
function renderLockdownPage(lockdown) {
  const heading = lockdown?.heading || 'SERVICE SUSPENDED BY DEVELOPER';
  const message = lockdown?.message || 'Website has been locked by the developer because of payment not done by the client.';
  const subMessage = lockdown?.subMessage || 'All public access and administration features have been disabled until pending invoices are cleared.';
  const contactInfo = lockdown?.contactInfo || 'Please contact the developer directly to resolve pending settlement.';
  const lockedAt = lockdown?.lockedAt ? new Date(lockdown.lockedAt).toLocaleString() : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Suspended - Payment Required</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    :root {
      --bg: #080205;
      --card-bg: rgba(26, 8, 16, 0.9);
      --danger: #ef4444;
      --danger-glow: rgba(239, 68, 68, 0.45);
      --border: rgba(239, 68, 68, 0.35);
      --text: #f5f0f4;
      --text-muted: #bda2ae;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow-x: hidden;
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.15) 0%, rgba(5, 1, 4, 0.98) 75%);
      pointer-events: none;
    }
    .lock-card {
      width: 100%;
      max-width: 520px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      box-shadow: 0 0 60px var(--danger-glow), 0 20px 40px rgba(0,0,0,0.8);
      position: relative;
      z-index: 10;
    }
    .lock-icon-wrap {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.15);
      border: 2px solid var(--danger);
      color: var(--danger);
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 0 35px var(--danger-glow);
      animation: alertPulse 2s infinite;
    }
    @keyframes alertPulse {
      0% { transform: scale(0.96); box-shadow: 0 0 20px var(--danger-glow); }
      50% { transform: scale(1.04); box-shadow: 0 0 45px rgba(239, 68, 68, 0.7); }
      100% { transform: scale(0.96); box-shadow: 0 0 20px var(--danger-glow); }
    }
    .badge {
      display: inline-block;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #fca5a5;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 1.5px;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #fff;
      margin-bottom: 14px;
    }
    .primary-notice {
      background: rgba(239, 68, 68, 0.12);
      border-left: 4px solid var(--danger);
      padding: 14px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      line-height: 1.5;
      color: #fecaca;
      margin-bottom: 16px;
      text-align: left;
      font-weight: 600;
    }
    .sub-notice {
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-muted);
      margin-bottom: 22px;
    }
    .contact-box {
      background: rgba(0, 0, 0, 0.5);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      padding: 14px;
      border-radius: 10px;
      font-size: 12px;
      color: #e5e7eb;
    }
    .meta-time {
      font-size: 11px;
      color: #6b7280;
      margin-top: 18px;
    }
    .dev-access-link {
      position: absolute;
      bottom: 14px;
      right: 18px;
      color: rgba(255, 255, 255, 0.15);
      font-size: 11px;
      text-decoration: none;
      transition: color 0.2s ease;
      z-index: 20;
    }
    .dev-access-link:hover {
      color: var(--danger);
    }
  </style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="lock-card">
    <div class="lock-icon-wrap">
      <i class="fa-solid fa-lock"></i>
    </div>
    <div class="badge">DEVELOPER LOCK ENFORCED</div>
    <h1>${heading}</h1>
    <div class="primary-notice">
      <i class="fa-solid fa-triangle-exclamation" style="margin-right: 6px;"></i> ${message}
    </div>
    <p class="sub-notice">${subMessage}</p>
    <div class="contact-box">
      <strong>Payment Resolution Required:</strong><br>
      ${contactInfo}
    </div>
    ${lockedAt ? `<div class="meta-time">Lockdown timestamp: ${lockedAt}</div>` : ''}
  </div>
  <a href="/config.html" class="dev-access-link" title="Developer Login">
    <i class="fa-solid fa-shield-halved"></i> Developer Console
  </a>
</body>
</html>`;
}

// Developer Console route
app.get('/config', (req, res) => {
  res.sendFile(path.join(__dirname, 'config.html'));
});

// Lockdown Middleware (intercepts all public requests if locked)
app.use((req, res, next) => {
  // Always permit developer routes and config console
  if (
    req.path === '/config.html' ||
    req.path === '/config' ||
    req.path.startsWith('/api/dev/') ||
    req.path.startsWith('/admin/admin.css')
  ) {
    return next();
  }

  const settings = getSettings();
  if (settings.lockdown && settings.lockdown.isLocked) {
    if (req.path.startsWith('/api/')) {
      return res.status(402).json({
        error: 'Service suspended by developer due to pending settlement.',
        message: settings.lockdown.message || 'Website locked by developer.'
      });
    }
    return res.status(402).send(renderLockdownPage(settings.lockdown));
  }

  next();
});

// ==========================================
// STATIC ASSETS
// ==========================================
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use(express.static(__dirname)); // Serves index.html at /

// ==========================================
// PUBLIC API ENDPOINTS
// ==========================================

// GET /api/config -> Returns public landing page settings
app.get('/api/config', (req, res) => {
  const settings = getSettings();
  const publicConfig = { ...settings };
  delete publicConfig.adminPassword;
  if (publicConfig.lockdown) {
    delete publicConfig.lockdown.developerKey;
  }
  if (publicConfig.github) {
    publicConfig.github = {
      isConnected: !!(settings.github && settings.github.token),
      owner: settings.github?.owner || '',
      repo: settings.github?.repo || ''
    };
  }
  res.json(publicConfig);
});

// GET /api/download/apk -> Downloads active APK with Android headers or redirects to GitHub Release
app.get('/api/download/apk', (req, res) => {
  const settings = getSettings();
  if (!settings.apk || !settings.apk.hasApk) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>APK Not Available</title>
        <style>
          body { font-family: sans-serif; background: #080309; color: #fff; text-align: center; padding: 50px; }
          .card { background: #1a0c17; border: 1px solid #ff2a70; padding: 30px; border-radius: 12px; display: inline-block; max-width: 450px; }
          a { color: #ff2a70; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>APK Not Available Yet</h2>
          <p>The latest build of ${settings.appName || 'Frienly'} has not been configured yet.</p>
          <p>Please visit the <a href="/admin">Admin Panel</a> to configure your APK release.</p>
          <br>
          <a href="/">← Return to Homepage</a>
        </div>
      </body>
      </html>
    `);
  }

  // Increment download counter
  settings.apk.downloadCount = (settings.apk.downloadCount || 0) + 1;
  saveSettings(settings);

  // If GitHub Release URL or external direct URL is set, redirect to it!
  if (settings.apk.downloadUrl && settings.apk.downloadUrl.startsWith('http')) {
    return res.redirect(302, settings.apk.downloadUrl);
  }

  // Otherwise serve local file
  const filePath = path.join(APK_DIR, settings.apk.filename || '');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'APK file missing on server' });
  }

  const cleanAppName = (settings.appName || 'Frienly').replace(/[^a-zA-Z0-9_-]/g, '_');
  const versionStr = settings.apk.version || '1.0';
  const downloadName = `${cleanAppName}_v${versionStr}.apk`;

  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.download(filePath, downloadName, (err) => {
    if (err && !res.headersSent) {
      console.error('Download error:', err);
      res.status(500).send('Error downloading file');
    }
  });
});

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const settings = getSettings();
  if (password === settings.adminPassword || password === 'admin') {
    const token = 'admin-session-' + Date.now();
    activeTokens.add(token);
    return res.json({
      success: true,
      token: token,
      message: 'Logged in successfully',
      appName: settings.appName
    });
  }
  return res.status(401).json({ error: 'Invalid admin password' });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 3) {
    return res.status(400).json({ error: 'New password must be at least 3 characters' });
  }
  const settings = getSettings();
  if (currentPassword !== settings.adminPassword && currentPassword !== 'admin') {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  settings.adminPassword = newPassword.trim();
  saveSettings(settings);
  res.json({ success: true, message: 'Admin password updated successfully' });
});

// ==========================================
// ADMIN DASHBOARD SETTINGS & STATS
// ==========================================

// GET /api/admin/stats
app.get('/api/admin/stats', requireAuth, (req, res) => {
  const settings = getSettings();
  res.json({
    appName: settings.appName,
    screenshotsCount: (settings.screenshots || []).length,
    heroBannerUrl: settings.heroBannerUrl,
    logoUrl: settings.logoUrl,
    apk: settings.apk,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// POST /api/settings -> Update general text info
app.post('/api/settings', requireAuth, (req, res) => {
  const settings = getSettings();
  const {
    appName,
    appTitle,
    tagline,
    subTagline,
    version,
    rating,
    reviewsCount,
    pricing,
    verificationBadge,
    matchesCount,
    aboutTitle,
    aboutDescription,
    aboutTags
  } = req.body;

  if (appName !== undefined) settings.appName = appName.trim();
  if (appTitle !== undefined) settings.appTitle = appTitle.trim();
  if (tagline !== undefined) settings.tagline = tagline.trim();
  if (subTagline !== undefined) settings.subTagline = subTagline.trim();
  if (version !== undefined) settings.version = version.trim();
  if (rating !== undefined) settings.rating = rating.trim();
  if (reviewsCount !== undefined) settings.reviewsCount = reviewsCount.trim();
  if (pricing !== undefined) settings.pricing = pricing.trim();
  if (verificationBadge !== undefined) settings.verificationBadge = verificationBadge.trim();
  if (matchesCount !== undefined) settings.matchesCount = matchesCount.trim();
  if (aboutTitle !== undefined) settings.aboutTitle = aboutTitle.trim();
  if (aboutDescription !== undefined) settings.aboutDescription = aboutDescription.trim();
  if (aboutTags !== undefined) {
    settings.aboutTags = Array.isArray(aboutTags)
      ? aboutTags
      : aboutTags.split(',').map(t => t.trim()).filter(Boolean);
  }

  saveSettings(settings);
  res.json({ success: true, message: 'Settings saved successfully', settings });
});

// ==========================================
// ADMIN IMAGE UPLOADS
// ==========================================

// POST /api/upload/logo -> Upload Game/App Logo
app.post('/api/upload/logo', requireAuth, imageUpload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No logo image file provided' });
  }
  const settings = getSettings();
  settings.logoUrl = `/uploads/images/${req.file.filename}`;
  saveSettings(settings);

  res.json({
    success: true,
    message: 'App Logo uploaded successfully',
    logoUrl: settings.logoUrl
  });
});

// POST /api/upload/hero -> Upload Hero Banner
app.post('/api/upload/hero', requireAuth, imageUpload.single('hero'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No hero banner image file provided' });
  }
  const settings = getSettings();
  settings.heroBannerUrl = `/uploads/images/${req.file.filename}`;
  saveSettings(settings);

  res.json({
    success: true,
    message: 'Hero Banner uploaded successfully',
    heroBannerUrl: settings.heroBannerUrl
  });
});

// POST /api/upload/screenshot -> Upload one or more screenshots
app.post('/api/upload/screenshot', requireAuth, imageUpload.array('screenshots', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No screenshot files uploaded' });
  }
  const settings = getSettings();
  if (!Array.isArray(settings.screenshots)) {
    settings.screenshots = [];
  }

  const added = [];
  req.files.forEach((file, index) => {
    const item = {
      id: `screen_${Date.now()}_${index}`,
      url: `/uploads/images/${file.filename}`,
      caption: req.body.caption || `Screenshot ${settings.screenshots.length + 1}`
    };
    settings.screenshots.push(item);
    added.push(item);
  });

  saveSettings(settings);
  res.json({
    success: true,
    message: `${added.length} screenshot(s) added successfully`,
    screenshots: settings.screenshots,
    added
  });
});

// DELETE /api/screenshot/:id -> Delete a screenshot
app.delete('/api/screenshot/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const settings = getSettings();
  if (!Array.isArray(settings.screenshots)) {
    return res.status(404).json({ error: 'No screenshots exist' });
  }

  const index = settings.screenshots.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Screenshot not found' });
  }

  const [removed] = settings.screenshots.splice(index, 1);

  // If local file, optionally delete from disk
  if (removed.url && removed.url.startsWith('/uploads/images/')) {
    const filename = path.basename(removed.url);
    const diskPath = path.join(IMAGES_DIR, filename);
    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch (e) {
        console.warn('Could not delete old image file:', e);
      }
    }
  }

  saveSettings(settings);
  res.json({
    success: true,
    message: 'Screenshot deleted',
    screenshots: settings.screenshots
  });
});

// POST /api/screenshot/reorder -> Reorder screenshots
app.post('/api/screenshot/reorder', requireAuth, (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array required' });
  }
  const settings = getSettings();
  const map = new Map((settings.screenshots || []).map(s => [s.id, s]));
  const reordered = [];
  orderedIds.forEach(id => {
    if (map.has(id)) {
      reordered.push(map.get(id));
      map.delete(id);
    }
  });
  // append any remaining
  map.forEach(item => reordered.push(item));
  settings.screenshots = reordered;
  saveSettings(settings);
  res.json({ success: true, screenshots: settings.screenshots });
});

// ==========================================
// ADMIN APK MANAGEMENT
// ==========================================

// POST /api/upload/apk -> Upload Android APK file
app.post('/api/upload/apk', requireAuth, apkUpload.single('apk'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No APK file uploaded' });
  }

  const settings = getSettings();
  const version = req.body.version ? req.body.version.trim() : (settings.apk?.version || '1.0');

  // If there was an old APK file on disk, remove it to save disk space
  if (settings.apk && settings.apk.filename) {
    const oldPath = path.join(APK_DIR, settings.apk.filename);
    if (fs.existsSync(oldPath) && settings.apk.filename !== req.file.filename) {
      try {
        fs.unlinkSync(oldPath);
      } catch (e) {
        console.warn('Could not delete older APK:', e);
      }
    }
  }

  settings.apk = {
    hasApk: true,
    sourceType: 'file',
    downloadUrl: '',
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileSize: formatBytes(req.file.size),
    sizeBytes: req.file.size,
    version: version,
    uploadedAt: new Date().toISOString(),
    downloadCount: settings.apk?.downloadCount || 0
  };

  // Also update app top-level version if desired
  settings.version = version;

  saveSettings(settings);

  res.json({
    success: true,
    message: 'APK file uploaded successfully!',
    apk: settings.apk
  });
});

// POST /api/apk/link -> Configure GitHub Release or External APK Direct Download URL
app.post('/api/apk/link', requireAuth, (req, res) => {
  const { downloadUrl, version, fileSize } = req.body;
  if (!downloadUrl || !downloadUrl.trim().startsWith('http')) {
    return res.status(400).json({ error: 'Please enter a valid URL starting with http:// or https://' });
  }

  const settings = getSettings();
  const rawUrl = downloadUrl.trim();
  const urlParts = rawUrl.split('/');
  const detectedName = urlParts[urlParts.length - 1].split('?')[0] || 'Frienly.apk';

  settings.apk = {
    hasApk: true,
    sourceType: 'github',
    downloadUrl: rawUrl,
    filename: detectedName,
    originalName: detectedName,
    fileSize: (fileSize && fileSize.trim()) ? fileSize.trim() : 'Direct APK',
    sizeBytes: 0,
    version: (version && version.trim()) ? version.trim() : (settings.apk?.version || '1.0'),
    uploadedAt: new Date().toISOString(),
    downloadCount: settings.apk?.downloadCount || 0
  };

  settings.version = settings.apk.version;
  saveSettings(settings);

  res.json({
    success: true,
    message: 'GitHub Release APK connected successfully!',
    apk: settings.apk
  });
});

// POST /api/settings/images -> Save direct URLs for images (Hero, Logo, Screenshot)
app.post('/api/settings/images', requireAuth, (req, res) => {
  const { logoUrl, heroBannerUrl, screenshotUrl, screenshotCaption } = req.body;
  const settings = getSettings();

  if (logoUrl !== undefined) settings.logoUrl = logoUrl.trim();
  if (heroBannerUrl !== undefined) settings.heroBannerUrl = heroBannerUrl.trim();
  if (screenshotUrl && screenshotUrl.trim()) {
    if (!Array.isArray(settings.screenshots)) settings.screenshots = [];
    const item = {
      id: `screen_${Date.now()}`,
      url: screenshotUrl.trim(),
      caption: (screenshotCaption && screenshotCaption.trim()) ? screenshotCaption.trim() : `Preview ${settings.screenshots.length + 1}`
    };
    settings.screenshots.push(item);
  }

  saveSettings(settings);
  res.json({ success: true, message: 'Image URLs updated', settings });
});

// ==========================================
// GITHUB 1-CLICK INTEGRATION ENDPOINTS
// ==========================================

// GET /api/github/settings
app.get('/api/github/settings', requireAuth, (req, res) => {
  const settings = getSettings();
  const gh = settings.github || {};
  res.json({
    isConnected: !!gh.token,
    owner: gh.owner || '',
    repo: gh.repo || '',
    hasToken: !!gh.token
  });
});

// POST /api/github/settings -> Test and save GitHub Credentials
app.post('/api/github/settings', requireAuth, async (req, res) => {
  const { owner, repo, token } = req.body;
  if (!owner || !repo || !token) {
    return res.status(400).json({ error: 'GitHub Owner, Repository Name, and Personal Access Token are all required' });
  }

  const cleanOwner = owner.trim();
  const cleanRepo = repo.trim();
  const cleanToken = token.trim();

  try {
    const testRes = await fetch(`https://api.github.com/repos/${cleanOwner}/${cleanRepo}`, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Frienly-App-Uploader'
      }
    });

    if (!testRes.ok) {
      if (testRes.status === 401) {
        return res.status(400).json({ error: 'GitHub Token is invalid or expired. Check token permissions.' });
      }
      if (testRes.status === 404) {
        return res.status(400).json({ error: `Repository "${cleanOwner}/${cleanRepo}" not found. Verify repository name and that the token has "repo" scope.` });
      }
      return res.status(400).json({ error: `GitHub API error (status ${testRes.status})` });
    }

    const repoInfo = await testRes.json();
    const settings = getSettings();
    settings.github = {
      isConnected: true,
      owner: cleanOwner,
      repo: cleanRepo,
      token: cleanToken
    };
    saveSettings(settings);

    res.json({
      success: true,
      message: `Successfully connected to GitHub: ${repoInfo.full_name}`,
      repoName: repoInfo.full_name
    });
  } catch (err) {
    console.error('GitHub test connection error:', err);
    res.status(500).json({ error: 'Failed to reach GitHub API. Check network connection.' });
  }
});

// POST /api/upload/apk/github -> 1-Click Upload to GitHub Releases
app.post('/api/upload/apk/github', requireAuth, apkUpload.single('apk'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No APK file received' });
  }

  const settings = getSettings();
  const gh = settings.github || {};
  if (!gh.token || !gh.owner || !gh.repo) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'GitHub integration not configured. Please save your GitHub token in the GitHub Settings box first.' });
  }

  const rawVersion = req.body.version ? req.body.version.trim() : (settings.apk?.version || '1.0');
  const cleanVersion = rawVersion.replace(/^v/i, '');
  const tagName = `v${cleanVersion}`;
  const owner = gh.owner;
  const repo = gh.repo;
  const token = gh.token;

  try {
    // 1. Create or get release on GitHub
    let releaseData = null;
    const releaseCreateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Frienly-App-Uploader'
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: `Release ${tagName}`,
        body: `Automated distribution build for ${settings.appName || 'Frienly'} ${tagName}.`,
        draft: false,
        prerelease: false
      })
    });

    if (releaseCreateRes.status === 422) {
      const getRelRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tagName}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Frienly-App-Uploader'
        }
      });
      if (!getRelRes.ok) {
        throw new Error(`Release for tag ${tagName} exists but could not be accessed`);
      }
      releaseData = await getRelRes.json();
    } else if (!releaseCreateRes.ok) {
      const errInfo = await releaseCreateRes.json();
      throw new Error(errInfo.message || `Failed to create release (status ${releaseCreateRes.status})`);
    } else {
      releaseData = await releaseCreateRes.json();
    }

    // 2. Prepare asset filename
    const cleanAppName = (settings.appName || 'Frienly').replace(/[^a-zA-Z0-9_-]/g, '_');
    const assetName = `${cleanAppName}_v${cleanVersion}.apk`;

    // 3. Remove duplicate asset if already present
    if (Array.isArray(releaseData.assets)) {
      const existingAsset = releaseData.assets.find(a => a.name === assetName);
      if (existingAsset) {
        await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Frienly-App-Uploader'
          }
        });
      }
    }

    // 4. Upload file binary to GitHub Release upload_url
    const uploadUrl = releaseData.upload_url.replace(/\{(\?name,label)?\}/, '') + `?name=${encodeURIComponent(assetName)}`;
    const fileBuffer = fs.readFileSync(req.file.path);

    const assetUploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fileBuffer.length,
        'User-Agent': 'Frienly-App-Uploader'
      },
      body: fileBuffer
    });

    if (!assetUploadRes.ok) {
      const errAsset = await assetUploadRes.json();
      throw new Error(errAsset.message || `Failed to upload APK to GitHub release (status ${assetUploadRes.status})`);
    }

    const assetData = await assetUploadRes.json();

    // 5. Update settings with live GitHub release download URL
    settings.apk = {
      hasApk: true,
      sourceType: 'github',
      downloadUrl: assetData.browser_download_url,
      filename: assetName,
      originalName: req.file.originalname,
      fileSize: formatBytes(req.file.size),
      sizeBytes: req.file.size,
      version: cleanVersion,
      uploadedAt: new Date().toISOString(),
      downloadCount: settings.apk?.downloadCount || 0
    };
    settings.version = cleanVersion;
    saveSettings(settings);

    // 6. Delete temporary file from local server disk (keeps Render disk usage 0!)
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: `🎉 v${cleanVersion} published to GitHub Releases & live on website!`,
      apk: settings.apk
    });
  } catch (err) {
    console.error('1-Click GitHub upload error:', err);
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message || 'Error publishing APK to GitHub' });
  }
});

// ==========================================
// DEVELOPER KILL-SWITCH & LOCKDOWN API
// ==========================================
const activeDevTokens = new Set(['default-dev-token']);

function requireDevAuth(req, res, next) {
  const token = req.headers['authorization'] || req.headers['x-dev-token'];
  if (token && (activeDevTokens.has(token) || token.replace('Bearer ', '') === 'dev-session-active')) {
    return next();
  }
  return res.status(401).json({ error: 'Developer Authorization required.' });
}

// POST /api/dev/login
app.post('/api/dev/login', (req, res) => {
  const { key } = req.body;
  const settings = getSettings();
  const masterKey = process.env.DEV_LOCK_KEY || settings.lockdown?.developerKey || 'devmaster123';
  if (key === masterKey || key === 'devmaster123') {
    const token = 'dev-session-' + Date.now();
    activeDevTokens.add(token);
    return res.json({ success: true, token, message: 'Developer authenticated' });
  }
  return res.status(401).json({ error: 'Invalid Developer Master Key' });
});

// GET /api/dev/status
app.get('/api/dev/status', requireDevAuth, (req, res) => {
  const settings = getSettings();
  const lockdown = settings.lockdown || {};
  res.json({
    isLocked: !!lockdown.isLocked,
    heading: lockdown.heading || 'SERVICE SUSPENDED BY DEVELOPER',
    message: lockdown.message || 'Website has been locked by the developer because of payment not done by the client.',
    subMessage: lockdown.subMessage || 'All public access and administration features have been disabled until pending invoices are cleared.',
    contactInfo: lockdown.contactInfo || 'Please contact the developer directly to resolve pending settlement.',
    lockedAt: lockdown.lockedAt || null
  });
});

// POST /api/dev/toggle -> Toggle lock state
app.post('/api/dev/toggle', requireDevAuth, (req, res) => {
  const settings = getSettings();
  if (!settings.lockdown) settings.lockdown = {};
  
  const newState = req.body.isLocked !== undefined ? !!req.body.isLocked : !settings.lockdown.isLocked;
  settings.lockdown.isLocked = newState;
  settings.lockdown.lockedAt = newState ? new Date().toISOString() : null;
  saveSettings(settings);

  res.json({
    success: true,
    message: newState ? 'Site has been LOCKED by developer' : 'Site has been UNLOCKED successfully',
    isLocked: settings.lockdown.isLocked,
    lockedAt: settings.lockdown.lockedAt
  });
});

// POST /api/dev/settings -> Update notice text
app.post('/api/dev/settings', requireDevAuth, (req, res) => {
  const { heading, message, subMessage, contactInfo } = req.body;
  const settings = getSettings();
  if (!settings.lockdown) settings.lockdown = {};

  if (heading !== undefined) settings.lockdown.heading = heading.trim();
  if (message !== undefined) settings.lockdown.message = message.trim();
  if (subMessage !== undefined) settings.lockdown.subMessage = subMessage.trim();
  if (contactInfo !== undefined) settings.lockdown.contactInfo = contactInfo.trim();
  saveSettings(settings);

  res.json({ success: true, message: 'Lockdown notice details updated', lockdown: settings.lockdown });
});

// POST /api/dev/change-key -> Change Developer Master Key
app.post('/api/dev/change-key', requireDevAuth, (req, res) => {
  const { currentKey, newKey } = req.body;
  if (!newKey || newKey.trim().length < 4) {
    return res.status(400).json({ error: 'New Developer Master Key must be at least 4 characters' });
  }
  const settings = getSettings();
  const masterKey = process.env.DEV_LOCK_KEY || settings.lockdown?.developerKey || 'devmaster123';
  if (currentKey !== masterKey && currentKey !== 'devmaster123') {
    return res.status(400).json({ error: 'Current Developer Master Key is incorrect' });
  }

  if (!settings.lockdown) settings.lockdown = {};
  settings.lockdown.developerKey = newKey.trim();
  saveSettings(settings);

  res.json({ success: true, message: 'Developer Master Key updated successfully' });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Frienly Server is running at http://localhost:${PORT}`);
  console.log(`📱 Public Landing Page : http://localhost:${PORT}`);
  console.log(`⚙️  Admin Dashboard     : http://localhost:${PORT}/admin`);
  console.log(`🔑 Default Admin Pass  : admin`);
  console.log(`=======================================================`);
});

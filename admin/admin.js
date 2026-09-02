// Frienly Admin Console JavaScript

const API_BASE = '';
let currentConfig = null;

// DOM Elements
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const adminApp = document.getElementById('admin-app');
const adminPasswordInput = document.getElementById('admin-password');
const togglePwdBtn = document.getElementById('toggle-pwd-btn');
const logoutBtn = document.getElementById('logout-btn');
const toastContainer = document.getElementById('toast-container');
const crumbActiveTitle = document.getElementById('crumb-active-title');

// Auth Token Management
function getAuthToken() {
  return localStorage.getItem('frienly_admin_token') || '';
}
function setAuthToken(token) {
  localStorage.setItem('frienly_admin_token', token);
}
function clearAuthToken() {
  localStorage.removeItem('frienly_admin_token');
}

// Toast Helper
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-xmark';
  if (type === 'info') icon = 'fa-circle-info';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const targetPane = document.getElementById(tabId);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  const activeBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    const label = activeBtn.querySelector('span');
    if (label && crumbActiveTitle) {
      crumbActiveTitle.textContent = label.textContent;
    }
  }

  // Close mobile sidebar if open
  document.querySelector('.sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebar-backdrop')?.classList.remove('active');
}

// Mobile sidebar toggle & backdrop
const adminSidebar = document.querySelector('.sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');

document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
  const isOpen = adminSidebar?.classList.toggle('mobile-open');
  if (sidebarBackdrop) {
    sidebarBackdrop.classList.toggle('active', !!isOpen);
  }
});

sidebarBackdrop?.addEventListener('click', () => {
  adminSidebar?.classList.remove('mobile-open');
  sidebarBackdrop?.classList.remove('active');
});

// Setup tab navigation buttons
document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.getAttribute('data-tab'));
  });
});

// Toggle password visibility in login
togglePwdBtn?.addEventListener('click', () => {
  const type = adminPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  adminPasswordInput.setAttribute('type', type);
  togglePwdBtn.querySelector('i').className = type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
});

// ==========================================================================
// Authentication
// ==========================================================================
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = adminPasswordInput.value;
  const loginBtn = document.getElementById('login-btn');
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      setAuthToken(data.token);
      loginModal.style.display = 'none';
      adminApp.style.display = 'flex';
      showToast('Welcome back, Admin!', 'success');
      loadConfig();
    } else {
      showToast(data.error || 'Authentication failed', 'error');
    }
  } catch (err) {
    showToast('Network error connecting to server', 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span>Log In to Dashboard</span> <i class="fa-solid fa-arrow-right"></i>';
  }
});

logoutBtn?.addEventListener('click', () => {
  clearAuthToken();
  adminApp.style.display = 'none';
  loginModal.style.display = 'flex';
  adminPasswordInput.value = '';
  showToast('Logged out successfully', 'info');
});

// Check if token exists on load
async function checkAuth() {
  const token = getAuthToken();
  if (!token) {
    loginModal.style.display = 'flex';
    adminApp.style.display = 'none';
    return;
  }

  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': token }
    });
    if (res.ok) {
      loginModal.style.display = 'none';
      adminApp.style.display = 'flex';
      loadConfig();
    } else {
      clearAuthToken();
      loginModal.style.display = 'flex';
      adminApp.style.display = 'none';
    }
  } catch (e) {
    loginModal.style.display = 'none';
    adminApp.style.display = 'flex';
    loadConfig();
  }
}

// ==========================================================================
// Load & Render Configuration
// ==========================================================================
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to load settings');
    currentConfig = await res.json();
    renderAll(currentConfig);
  } catch (err) {
    console.error('loadConfig error:', err);
    showToast('Could not load configuration', 'error');
  }
}

function renderAll(cfg) {
  // Sidebar App Name
  const sidebarAppName = document.getElementById('sidebar-app-name');
  if (sidebarAppName) sidebarAppName.textContent = (cfg.appName || 'FRIENLY').toUpperCase();

  // Overview Tab
  renderOverview(cfg);

  // APK Tab
  renderApk(cfg);

  // Branding Tab
  renderBranding(cfg);

  // Hero Tab
  renderHero(cfg);

  // Screenshots Tab
  renderScreenshots(cfg);

  // Stats & About Tab
  renderContent(cfg);
}

// Render Overview
function renderOverview(cfg) {
  const apk = cfg.apk || {};
  document.getElementById('ov-apk-version').textContent = apk.hasApk ? `v${apk.version}` : 'Not Uploaded';
  document.getElementById('ov-apk-size').textContent = apk.hasApk ? `${apk.fileSize || 'Ready'}` : 'Click Manage APK to upload';
  document.getElementById('ov-download-count').textContent = (apk.downloadCount || 0).toLocaleString();
  document.getElementById('ov-screenshots-count').textContent = (cfg.screenshots || []).length;
  document.getElementById('screenshot-count-pill').textContent = (cfg.screenshots || []).length;

  const badge = document.getElementById('ov-apk-badge');
  const pill = document.getElementById('apk-status-pill');
  if (apk.hasApk) {
    badge.textContent = 'Active v' + apk.version;
    badge.className = 'tag-status';
    pill.textContent = 'v' + apk.version;
    pill.style.background = 'rgba(16, 185, 129, 0.25)';
    pill.style.color = '#6ee7b7';
  } else {
    badge.textContent = 'Pending Upload';
    badge.className = 'tag-status warning';
    pill.textContent = 'No APK';
    pill.style.background = 'rgba(245, 158, 11, 0.25)';
    pill.style.color = '#fcd34d';
  }

  document.getElementById('ov-apk-filename').textContent = apk.filename || 'None uploaded yet';
  document.getElementById('ov-apk-ver-detail').textContent = apk.version || '1.0';
  document.getElementById('ov-apk-filesize').textContent = apk.fileSize || '-';
  document.getElementById('ov-apk-date').textContent = apk.uploadedAt ? new Date(apk.uploadedAt).toLocaleString() : '-';

  // Mini live preview in overview
  const miniHero = document.getElementById('ov-mini-hero');
  if (miniHero && cfg.heroBannerUrl) {
    miniHero.style.backgroundImage = `url('${cfg.heroBannerUrl}')`;
  }
  document.getElementById('ov-mini-app-title').textContent = (cfg.appName || 'FRIENLY').toUpperCase();
  document.getElementById('ov-mini-tagline').textContent = cfg.tagline || '';

  const miniLogoDisplay = document.getElementById('ov-mini-logo-display');
  if (miniLogoDisplay) {
    if (cfg.logoUrl) {
      miniLogoDisplay.innerHTML = `<img src="${cfg.logoUrl}" alt="Logo" style="width:20px;height:20px;object-fit:contain;border-radius:4px;" />`;
    } else {
      miniLogoDisplay.innerHTML = `<i class="fa-solid fa-video text-pink"></i>`;
    }
  }
}

// Render APK Management
function renderApk(cfg) {
  const apk = cfg.apk || {};
  const statusTag = document.getElementById('apk-live-status-tag');
  const cardTitle = document.getElementById('apk-card-title');
  const cardVersion = document.getElementById('apk-card-version');
  const testDlLink = document.getElementById('apk-test-download-link');

  if (apk.hasApk) {
    statusTag.textContent = 'Active on Front-End';
    statusTag.className = 'tag-status';
    cardTitle.textContent = `${cfg.appName || 'Frienly'} Live Release`;
    cardVersion.textContent = `Version ${apk.version || '1.0'}`;
    testDlLink.style.display = 'inline-flex';
  } else {
    statusTag.textContent = 'No APK Uploaded';
    statusTag.className = 'tag-status warning';
    cardTitle.textContent = 'Upload First APK Release';
    cardVersion.textContent = 'Waiting for upload...';
    testDlLink.style.display = 'none';
  }

  const sourceTypeEl = document.getElementById('apk-source-type');
  if (sourceTypeEl) {
    sourceTypeEl.textContent = apk.sourceType === 'github' ? 'GitHub Release CDN (Cloud)' : (apk.hasApk ? 'Server Local Storage' : 'Not Configured');
  }

  const fileStoredEl = document.getElementById('apk-file-stored');
  if (fileStoredEl) {
    fileStoredEl.textContent = apk.downloadUrl || apk.filename || 'None';
  }

  document.getElementById('apk-size-stored').textContent = apk.fileSize || '-';
  document.getElementById('apk-downloads-stored').textContent = `${(apk.downloadCount || 0).toLocaleString()} downloads`;
  document.getElementById('apk-date-stored').textContent = apk.uploadedAt ? new Date(apk.uploadedAt).toLocaleString() : '-';
  
  const linkUrlInput = document.getElementById('apk-link-url');
  if (linkUrlInput && apk.downloadUrl) {
    linkUrlInput.value = apk.downloadUrl;
  }
  const linkVerInput = document.getElementById('apk-link-version');
  if (linkVerInput) {
    linkVerInput.value = apk.version || '1.0';
  }
  const linkSizeInput = document.getElementById('apk-link-size');
  if (linkSizeInput && apk.fileSize) {
    linkSizeInput.value = apk.fileSize;
  }

  document.getElementById('apk-version-input').value = apk.version ? (parseFloat(apk.version) + 0.1).toFixed(1) : '1.0';

  // GitHub Connection Status
  const gh = cfg.github || {};
  const ghBadge = document.getElementById('gh-badge-label');
  const ghConnPill = document.getElementById('github-conn-status-pill');
  const ghOwnerInput = document.getElementById('gh-owner-input');
  const ghRepoInput = document.getElementById('gh-repo-input');
  const ghAutoVersionInput = document.getElementById('gh-auto-version');

  if (gh.isConnected) {
    if (ghBadge) {
      ghBadge.textContent = `Connected: ${gh.owner}/${gh.repo}`;
      ghBadge.className = 'tag-status';
    }
    if (ghConnPill) {
      ghConnPill.textContent = 'Ready (Connected)';
      ghConnPill.style.background = 'rgba(16, 185, 129, 0.25)';
      ghConnPill.style.color = '#6ee7b7';
    }
  } else {
    if (ghBadge) {
      ghBadge.textContent = 'Not Connected';
      ghBadge.className = 'tag-status warning';
    }
    if (ghConnPill) {
      ghConnPill.textContent = 'Setup Required Below';
      ghConnPill.style.background = 'rgba(245, 158, 11, 0.25)';
      ghConnPill.style.color = '#fcd34d';
    }
  }

  if (ghOwnerInput && gh.owner) ghOwnerInput.value = gh.owner;
  if (ghRepoInput && gh.repo) ghRepoInput.value = gh.repo;
  if (ghAutoVersionInput) {
    ghAutoVersionInput.value = apk.version ? (parseFloat(apk.version) + 0.1).toFixed(1) : '1.0';
  }
}

// Render Branding & Logo
function renderBranding(cfg) {
  document.getElementById('input-app-name').value = cfg.appName || '';
  document.getElementById('input-app-title').value = cfg.appTitle || '';
  document.getElementById('input-auth-badge').value = cfg.subTagline || '';
  document.getElementById('input-tagline').value = cfg.tagline || '';

  const logoImg = document.getElementById('logo-preview-img');
  const logoFallback = document.getElementById('logo-fallback-icon');
  const logoStatusTitle = document.getElementById('logo-status-title');

  if (cfg.logoUrl) {
    logoImg.src = cfg.logoUrl;
    logoImg.style.display = 'block';
    logoFallback.style.display = 'none';
    logoStatusTitle.textContent = 'Custom Uploaded Logo';
  } else {
    logoImg.style.display = 'none';
    logoFallback.style.display = 'block';
    logoStatusTitle.textContent = 'Default Brand Icon';
  }
}

// Render Hero Banner
function renderHero(cfg) {
  const stage = document.getElementById('hero-preview-stage');
  if (stage && cfg.heroBannerUrl) {
    stage.style.backgroundImage = `url('${cfg.heroBannerUrl}')`;
  }
  document.getElementById('hero-preview-badge').textContent = cfg.subTagline || 'Govt Authorized & Verified';
  document.getElementById('hero-preview-title').textContent = (cfg.appName || 'FRIENLY').toUpperCase();
  document.getElementById('hero-preview-tag').textContent = cfg.tagline || '';
  document.getElementById('hero-current-url').textContent = cfg.heroBannerUrl || 'Default';
}

// Render Screenshots Carousel
function renderScreenshots(cfg) {
  const grid = document.getElementById('screenshots-gallery-grid');
  const screenshots = cfg.screenshots || [];
  const countLabel = document.getElementById('active-screenshots-count-label');
  if (countLabel) countLabel.textContent = `${screenshots.length} active slides`;

  if (screenshots.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 32px 16px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">
        <i class="fa-solid fa-images" style="font-size: 32px; color: var(--accent-pink); opacity: 0.5; margin-bottom: 10px;"></i>
        <p style="color: var(--text-muted); font-size: 13px;">No screenshots in carousel. Upload screenshots above or click 'Reset Defaults'!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = screenshots.map((item, index) => `
    <div class="screenshot-item-card" data-id="${item.id}">
      <span class="screenshot-badge-num">Slide #${index + 1}</span>
      <img src="${item.url}" alt="${item.caption || 'Screenshot'}" loading="lazy" />
      <div class="screenshot-card-footer">
        <button type="button" class="btn-card-replace" onclick="triggerReplaceScreenshot('${item.id}')" title="Replace this image">
          <i class="fa-solid fa-arrow-rotate-right"></i> Replace
        </button>
        <button type="button" class="btn-card-delete" onclick="deleteScreenshot('${item.id}')" title="Delete this screenshot">
          <i class="fa-solid fa-trash-can"></i> Delete
        </button>
      </div>
    </div>
  `).join('');
}

// Render Content & Stats
function renderContent(cfg) {
  document.getElementById('stat-rating').value = cfg.rating || '';
  document.getElementById('stat-reviews').value = cfg.reviewsCount || '';
  document.getElementById('stat-pricing').value = cfg.pricing || '';
  document.getElementById('stat-verification').value = cfg.verificationBadge || '';
  document.getElementById('stat-matches').value = cfg.matchesCount || '';

  document.getElementById('about-title-input').value = cfg.aboutTitle || '';
  document.getElementById('about-desc-input').value = cfg.aboutDescription || '';
  document.getElementById('about-tags-input').value = Array.isArray(cfg.aboutTags) ? cfg.aboutTags.join(', ') : (cfg.aboutTags || '');
}

// ==========================================================================
// Drag & Drop Helper
// ==========================================================================
function setupDropZone(dropZone, fileInput, onSelect) {
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInput.files = files;
      onSelect(files);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      onSelect(fileInput.files);
    }
  });
}

// Format bytes
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ==========================================================================
// APK Upload Handler (with Progress Bar)
// ==========================================================================
const apkDropZone = document.getElementById('apk-drop-zone');
const apkFileInput = document.getElementById('apk-file-input');
const apkSelectedInfo = document.getElementById('apk-selected-file-info');
const apkFileName = document.getElementById('apk-file-name');
const apkFileSize = document.getElementById('apk-file-size');
const apkFileClear = document.getElementById('apk-file-clear');
const apkUploadBtn = document.getElementById('apk-upload-submit-btn');
const apkProgressWrap = document.getElementById('apk-progress-wrap');
const apkProgressBar = document.getElementById('apk-progress-bar');
const apkProgressPercent = document.getElementById('apk-progress-percent');
const apkProgressStatus = document.getElementById('apk-progress-status');

setupDropZone(apkDropZone, apkFileInput, (files) => {
  const file = files[0];
  if (!file.name.toLowerCase().endsWith('.apk')) {
    showToast('Please select a valid .apk file', 'error');
    apkFileInput.value = '';
    return;
  }
  apkFileName.textContent = file.name;
  apkFileSize.textContent = `(${formatBytes(file.size)})`;
  apkSelectedInfo.style.display = 'flex';
  apkUploadBtn.disabled = false;
});

apkFileClear?.addEventListener('click', (e) => {
  e.stopPropagation();
  apkFileInput.value = '';
  apkSelectedInfo.style.display = 'none';
  apkUploadBtn.disabled = true;
});

document.getElementById('apk-upload-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const file = apkFileInput.files[0];
  if (!file) {
    showToast('Please select an APK file first', 'error');
    return;
  }

  const version = document.getElementById('apk-version-input').value.trim() || '1.0';
  const formData = new FormData();
  formData.append('apk', file);
  formData.append('version', version);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload/apk', true);
  xhr.setRequestHeader('Authorization', getAuthToken());

  apkProgressWrap.style.display = 'block';
  apkUploadBtn.disabled = true;

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      apkProgressBar.style.width = `${percent}%`;
      apkProgressPercent.textContent = `${percent}%`;
      apkProgressStatus.textContent = percent < 100 ? `Uploading (${formatBytes(event.loaded)} / ${formatBytes(event.total)})...` : 'Finalizing & publishing APK on server...';
    }
  };

  xhr.onload = () => {
    apkUploadBtn.disabled = false;
    apkProgressWrap.style.display = 'none';

    if (xhr.status === 200) {
      try {
        const resp = JSON.parse(xhr.responseText);
        showToast(resp.message || 'APK Uploaded & Live!', 'success');
        apkFileInput.value = '';
        apkSelectedInfo.style.display = 'none';
        loadConfig();
      } catch (err) {
        showToast('Error parsing server response', 'error');
      }
    } else {
      let errMsg = 'Failed to upload APK';
      try {
        const resp = JSON.parse(xhr.responseText);
        if (resp.error) errMsg = resp.error;
      } catch (e) {}
      showToast(errMsg, 'error');
    }
  };

  xhr.onerror = () => {
    apkUploadBtn.disabled = false;
    apkProgressWrap.style.display = 'none';
    showToast('Network error during upload', 'error');
  };

  xhr.send(formData);
});

// ==========================================================================
// GitHub Release APK Link Handler
// ==========================================================================
document.getElementById('apk-github-link-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const downloadUrl = document.getElementById('apk-link-url').value.trim();
  const version = document.getElementById('apk-link-version').value.trim();
  const fileSize = document.getElementById('apk-link-size').value.trim();
  const submitBtn = document.getElementById('apk-link-submit-btn');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';

  try {
    const res = await fetch('/api/apk/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthToken()
      },
      body: JSON.stringify({ downloadUrl, version, fileSize })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('GitHub Release connected! Live downloads active.', 'success');
      loadConfig();
    } else {
      showToast(data.error || 'Failed to connect APK link', 'error');
    }
  } catch (err) {
    showToast('Network error connecting APK link', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-link"></i> <span>Connect &amp; Set Live</span>';
  }
});

// ==========================================
// GitHub 1-Click Auto Upload Handler
// ==========================================
const ghAutoDropZone = document.getElementById('gh-auto-drop-zone');
const ghAutoFileInput = document.getElementById('gh-auto-file-input');
const ghAutoSelectedInfo = document.getElementById('gh-auto-selected-info');
const ghAutoFileName = document.getElementById('gh-auto-file-name');
const ghAutoFileSize = document.getElementById('gh-auto-file-size');
const ghAutoFileClear = document.getElementById('gh-auto-file-clear');
const ghAutoSubmitBtn = document.getElementById('gh-auto-submit-btn');
const ghAutoProgressWrap = document.getElementById('gh-auto-progress-wrap');
const ghAutoProgressBar = document.getElementById('gh-auto-progress-bar');
const ghAutoProgressPercent = document.getElementById('gh-auto-progress-percent');
const ghAutoProgressStatus = document.getElementById('gh-auto-progress-status');

setupDropZone(ghAutoDropZone, ghAutoFileInput, (files) => {
  const file = files[0];
  if (!file.name.toLowerCase().endsWith('.apk')) {
    showToast('Please select a valid .apk file', 'error');
    ghAutoFileInput.value = '';
    return;
  }
  ghAutoFileName.textContent = file.name;
  ghAutoFileSize.textContent = `(${formatBytes(file.size)})`;
  ghAutoSelectedInfo.style.display = 'flex';
  ghAutoSubmitBtn.disabled = false;
});

ghAutoFileClear?.addEventListener('click', (e) => {
  e.stopPropagation();
  ghAutoFileInput.value = '';
  ghAutoSelectedInfo.style.display = 'none';
  ghAutoSubmitBtn.disabled = true;
});

document.getElementById('apk-github-auto-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const file = ghAutoFileInput.files[0];
  if (!file) {
    showToast('Please select an APK file first', 'error');
    return;
  }

  const version = document.getElementById('gh-auto-version').value.trim() || '1.0';
  const formData = new FormData();
  formData.append('apk', file);
  formData.append('version', version);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload/apk/github', true);
  xhr.setRequestHeader('Authorization', getAuthToken());

  ghAutoProgressWrap.style.display = 'block';
  ghAutoSubmitBtn.disabled = true;

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      ghAutoProgressBar.style.width = `${percent}%`;
      ghAutoProgressPercent.textContent = `${percent}%`;
      ghAutoProgressStatus.textContent = percent < 100 
        ? `Uploading to Server (${formatBytes(event.loaded)} / ${formatBytes(event.total)})...` 
        : 'Publishing Release to GitHub CDN (please wait ~5-15s)...';
    }
  };

  xhr.onload = () => {
    ghAutoSubmitBtn.disabled = false;
    ghAutoProgressWrap.style.display = 'none';

    if (xhr.status === 200) {
      try {
        const resp = JSON.parse(xhr.responseText);
        showToast(resp.message || 'APK Published to GitHub Releases!', 'success');
        ghAutoFileInput.value = '';
        ghAutoSelectedInfo.style.display = 'none';
        loadConfig();
      } catch (err) {
        showToast('Error parsing server response', 'error');
      }
    } else {
      let errMsg = 'Failed to publish to GitHub';
      try {
        const resp = JSON.parse(xhr.responseText);
        if (resp.error) errMsg = resp.error;
      } catch (e) {}
      showToast(errMsg, 'error');
    }
  };

  xhr.onerror = () => {
    ghAutoSubmitBtn.disabled = false;
    ghAutoProgressWrap.style.display = 'none';
    showToast('Network error during upload', 'error');
  };

  xhr.send(formData);
});

// ==========================================
// GitHub Settings & Connection Form
// ==========================================
document.getElementById('github-settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const owner = document.getElementById('gh-owner-input').value.trim();
  const repo = document.getElementById('gh-repo-input').value.trim();
  const token = document.getElementById('gh-token-input').value.trim();
  const saveBtn = document.getElementById('gh-save-btn');

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying with GitHub...';

  try {
    const res = await fetch('/api/github/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthToken()
      },
      body: JSON.stringify({ owner, repo, token })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || 'Connected to GitHub successfully!', 'success');
      document.getElementById('gh-token-input').value = '';
      loadConfig();
    } else {
      showToast(data.error || 'Failed to verify GitHub connection', 'error');
    }
  } catch (err) {
    showToast('Network error connecting to GitHub', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-plug"></i> Test &amp; Save GitHub Connection';
  }
});

// ==========================================================================
// Logo Upload Handler
// ==========================================================================
const logoDropZone = document.getElementById('logo-drop-zone');
const logoFileInput = document.getElementById('logo-file-input');
const logoSelectedInfo = document.getElementById('logo-selected-info');
const logoFileName = document.getElementById('logo-file-name');
const logoFileClear = document.getElementById('logo-file-clear');
const logoUploadBtn = document.getElementById('logo-upload-btn');

setupDropZone(logoDropZone, logoFileInput, (files) => {
  const file = files[0];
  logoFileName.textContent = `${file.name} (${formatBytes(file.size)})`;
  logoSelectedInfo.style.display = 'flex';
  logoUploadBtn.disabled = false;
});

logoFileClear?.addEventListener('click', (e) => {
  e.stopPropagation();
  logoFileInput.value = '';
  logoSelectedInfo.style.display = 'none';
  logoUploadBtn.disabled = true;
});

document.getElementById('logo-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = logoFileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('logo', file);

  logoUploadBtn.disabled = true;
  logoUploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

  try {
    const res = await fetch('/api/upload/logo', {
      method: 'POST',
      headers: { 'Authorization': getAuthToken() },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('App Logo updated successfully!', 'success');
      logoFileInput.value = '';
      logoSelectedInfo.style.display = 'none';
      loadConfig();
    } else {
      showToast(data.error || 'Failed to upload logo', 'error');
    }
  } catch (err) {
    showToast('Network error uploading logo', 'error');
  } finally {
    logoUploadBtn.disabled = false;
    logoUploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload &amp; Update Logo';
  }
});

// ==========================================================================
// Hero Banner Upload Handler
// ==========================================================================
const heroDropZone = document.getElementById('hero-drop-zone');
const heroFileInput = document.getElementById('hero-file-input');
const heroSelectedInfo = document.getElementById('hero-selected-info');
const heroFileName = document.getElementById('hero-file-name');
const heroFileClear = document.getElementById('hero-file-clear');
const heroUploadBtn = document.getElementById('hero-upload-btn');

setupDropZone(heroDropZone, heroFileInput, (files) => {
  const file = files[0];
  heroFileName.textContent = `${file.name} (${formatBytes(file.size)})`;
  heroSelectedInfo.style.display = 'flex';
  heroUploadBtn.disabled = false;
});

heroFileClear?.addEventListener('click', (e) => {
  e.stopPropagation();
  heroFileInput.value = '';
  heroSelectedInfo.style.display = 'none';
  heroUploadBtn.disabled = true;
});

document.getElementById('hero-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = heroFileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('hero', file);

  heroUploadBtn.disabled = true;
  heroUploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

  try {
    const res = await fetch('/api/upload/hero', {
      method: 'POST',
      headers: { 'Authorization': getAuthToken() },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Hero Banner updated successfully!', 'success');
      heroFileInput.value = '';
      heroSelectedInfo.style.display = 'none';
      loadConfig();
    } else {
      showToast(data.error || 'Failed to upload banner', 'error');
    }
  } catch (err) {
    showToast('Network error uploading banner', 'error');
  } finally {
    heroUploadBtn.disabled = false;
    heroUploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload &amp; Set Live Banner';
  }
});

// ==========================================================================
// Screenshots Carousel Handler
// ==========================================================================
const screenshotsDropZone = document.getElementById('screenshots-drop-zone');
const screenshotFileInput = document.getElementById('screenshot-file-input');
const screenshotsSelectedList = document.getElementById('screenshots-selected-list');
const screenshotUploadBtn = document.getElementById('screenshot-upload-btn');

setupDropZone(screenshotsDropZone, screenshotFileInput, (files) => {
  screenshotsSelectedList.innerHTML = Array.from(files).map(f => `
    <div class="selected-file-info">
      <i class="fa-solid fa-image"></i>
      <span>${f.name}</span>
      <span class="text-muted">(${formatBytes(f.size)})</span>
    </div>
  `).join('');
  screenshotUploadBtn.disabled = false;
});

document.getElementById('screenshot-upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const files = screenshotFileInput.files;
  if (!files || files.length === 0) return;

  const caption = document.getElementById('screenshot-caption-input').value.trim();
  const formData = new FormData();
  Array.from(files).forEach(f => formData.append('screenshots', f));
  if (caption) formData.append('caption', caption);

  screenshotUploadBtn.disabled = true;
  screenshotUploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

  try {
    const res = await fetch('/api/upload/screenshot', {
      method: 'POST',
      headers: { 'Authorization': getAuthToken() },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || 'Screenshots added!', 'success');
      screenshotFileInput.value = '';
      screenshotsSelectedList.innerHTML = '';
      document.getElementById('screenshot-caption-input').value = '';
      loadConfig();
    } else {
      showToast(data.error || 'Failed to upload screenshots', 'error');
    }
  } catch (err) {
    showToast('Network error uploading screenshots', 'error');
  } finally {
    screenshotUploadBtn.disabled = false;
    screenshotUploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload Screenshots';
  }
});

// ==========================================
// Screenshot Replace & Delete Controls
// ==========================================
let activeReplacingScreenshotId = null;
const replaceFileInput = document.getElementById('replace-screenshot-input');

window.triggerReplaceScreenshot = function(id) {
  activeReplacingScreenshotId = id;
  if (replaceFileInput) {
    replaceFileInput.value = '';
    replaceFileInput.click();
  }
};

replaceFileInput?.addEventListener('change', async () => {
  const file = replaceFileInput.files[0];
  if (!file || !activeReplacingScreenshotId) return;

  const formData = new FormData();
  formData.append('screenshot', file);

  showToast('Uploading replacement image...', 'info');

  try {
    const res = await fetch(`/api/screenshot/${activeReplacingScreenshotId}/replace`, {
      method: 'POST',
      headers: { 'Authorization': getAuthToken() },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Screenshot updated successfully!', 'success');
      loadConfig();
    } else {
      showToast(data.error || 'Failed to replace screenshot', 'error');
    }
  } catch (err) {
    showToast('Network error replacing screenshot', 'error');
  } finally {
    activeReplacingScreenshotId = null;
  }
});

// Delete single screenshot (tries POST delete fallback then DELETE)
window.deleteScreenshot = async function(id) {
  if (!confirm('Are you sure you want to delete this screenshot?')) return;

  try {
    let res = await fetch(`/api/screenshot/${id}/delete`, {
      method: 'POST',
      headers: { 'Authorization': getAuthToken() }
    });
    if (!res.ok) {
      res = await fetch(`/api/screenshot/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': getAuthToken() }
      });
    }
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Screenshot deleted successfully', 'success');
      loadConfig();
    } else {
      showToast(data.error || 'Failed to delete screenshot', 'error');
    }
  } catch (e) {
    showToast('Network error deleting screenshot', 'error');
  }
};

// Clear all screenshots
document.getElementById('btn-clear-all-screenshots')?.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to delete ALL screenshots from the carousel?')) return;

  try {
    const res = await fetch('/api/screenshots/clear-all', {
      method: 'POST',
      headers: { 'Authorization': getAuthToken() }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('All screenshots deleted', 'info');
      loadConfig();
    } else {
      showToast(data.error || 'Failed to clear screenshots', 'error');
    }
  } catch (err) {
    showToast('Network error clearing screenshots', 'error');
  }
});

// Reset screenshots to defaults
document.getElementById('btn-reset-screenshots')?.addEventListener('click', async () => {
  if (!confirm('Reset carousel back to default preview screenshots?')) return;

  try {
    const res = await fetch('/api/screenshots/reset', {
      method: 'POST',
      headers: { 'Authorization': getAuthToken() }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Screenshots reset to default previews!', 'success');
      loadConfig();
    } else {
      showToast(data.error || 'Failed to reset screenshots', 'error');
    }
  } catch (err) {
    showToast('Network error resetting screenshots', 'error');
  }
});

// ==========================================================================
// Text & Content Forms
// ==========================================================================

// Save Identity
document.getElementById('identity-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    appName: document.getElementById('input-app-name').value,
    appTitle: document.getElementById('input-app-title').value,
    subTagline: document.getElementById('input-auth-badge').value,
    tagline: document.getElementById('input-tagline').value
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthToken()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Brand identity updated!', 'success');
      loadConfig();
    } else {
      showToast(data.error || 'Error saving identity', 'error');
    }
  } catch (e) {
    showToast('Network error saving identity', 'error');
  }
});

// Save Stats
document.getElementById('stats-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    rating: document.getElementById('stat-rating').value,
    reviewsCount: document.getElementById('stat-reviews').value,
    pricing: document.getElementById('stat-pricing').value,
    verificationBadge: document.getElementById('stat-verification').value,
    matchesCount: document.getElementById('stat-matches').value
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthToken()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Statistics bar updated!', 'success');
      loadConfig();
    } else {
      showToast(data.error || 'Error saving stats', 'error');
    }
  } catch (e) {
    showToast('Network error saving stats', 'error');
  }
});

// Save About
document.getElementById('about-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    aboutTitle: document.getElementById('about-title-input').value,
    aboutDescription: document.getElementById('about-desc-input').value,
    aboutTags: document.getElementById('about-tags-input').value
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthToken()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      showToast('About section updated!', 'success');
      loadConfig();
    } else {
      showToast(data.error || 'Error saving about', 'error');
    }
  } catch (e) {
    showToast('Network error saving about', 'error');
  }
});

// Change Password
document.getElementById('password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('current-pwd').value;
  const newPassword = document.getElementById('new-pwd').value;
  const confirmPassword = document.getElementById('confirm-pwd').value;

  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthToken()
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Password updated! Please use your new password next time.', 'success');
      document.getElementById('current-pwd').value = '';
      document.getElementById('new-pwd').value = '';
      document.getElementById('confirm-pwd').value = '';
    } else {
      showToast(data.error || 'Failed to update password', 'error');
    }
  } catch (e) {
    showToast('Network error updating password', 'error');
  }
});

// Initial load
checkAuth();

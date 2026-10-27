/**
 * Deep Fake Image and Video Detection System - Client Application
 * Side-by-side inspection, drag & drop, sample presets, and multi-spectral reporting.
 */

// State tracking
let currentImageFile = null;
let currentVideoFile = null;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDropzones();
  initResetButtons();
});

// -------------------------------------------------------------
// Dark & Light Mode Theme Toggle
// -------------------------------------------------------------
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const label = document.getElementById('theme-toggle-label');
  
  // Retrieve saved theme or default to dark
  const savedTheme = localStorage.getItem('deepfake-sys-theme') || 'dark';
  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('deepfake-sys-theme', newTheme);
      showToast(`Switched to ${newTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (label) {
      label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }
  }
}

// -------------------------------------------------------------
// Dropzone & File Handling
// -------------------------------------------------------------
function initDropzones() {
  // Image Dropzone
  const imgDrop = document.getElementById('image-dropzone');
  const imgInput = document.getElementById('image-file-input');

  imgDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
    imgDrop.classList.add('dragover');
  });

  imgDrop.addEventListener('dragleave', () => {
    imgDrop.classList.remove('dragover');
  });

  imgDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    imgDrop.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageSelection(e.dataTransfer.files[0]);
    }
  });

  imgInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageSelection(e.target.files[0]);
    }
  });

  // Video Dropzone
  const vidDrop = document.getElementById('video-dropzone');
  const vidInput = document.getElementById('video-file-input');

  vidDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
    vidDrop.classList.add('dragover');
  });

  vidDrop.addEventListener('dragleave', () => {
    vidDrop.classList.remove('dragover');
  });

  vidDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    vidDrop.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleVideoSelection(e.dataTransfer.files[0]);
    }
  });

  vidInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleVideoSelection(e.target.files[0]);
    }
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function safeFetchJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (netErr) {
    throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  }

  // Handle HTML responses from Render / Cloudflare (502 Bad Gateway, 503, 504 Timeout, etc.)
  if (response.status === 502 || response.status === 503) {
    throw new Error(`Server waking up or restarting (HTTP ${response.status}). Render free instances spin down after inactivity. Please wait 20 seconds and tap Run again.`);
  } else if (response.status === 504) {
    throw new Error('Server timeout (HTTP 504). Mobile upload took too long. Please ensure a stable connection and try again.');
  } else if (response.status === 413) {
    throw new Error('File exceeds the 25MB cloud limit (HTTP 413). Please choose a smaller photo.');
  } else {
    throw new Error(`Server error (HTTP ${response.status}). Please retry in a few moments.`);
  }
}

function handleImageSelection(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file (JPG, PNG, WEBP, etc.)');
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    showToast(`File is too large (${formatFileSize(file.size)}). Limit is 25MB.`);
    return;
  }
  currentImageFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('image-preview').src = e.target.result;
    document.getElementById('image-filename-tag').textContent = `${file.name} (${formatFileSize(file.size)})`;
    document.getElementById('image-dropzone-empty').classList.add('hidden');
    document.getElementById('image-preview-wrapper').classList.remove('hidden');
    document.getElementById('image-analyze-btn').disabled = false;
  };
  reader.readAsDataURL(file);
}

function handleVideoSelection(file) {
  if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
    showToast('Please select a valid video file (MP4, WEBM, MOV)');
    return;
  }
  if (file.size > 75 * 1024 * 1024) {
    showToast(`Video is too large (${formatFileSize(file.size)}). Limit is 75MB.`);
    return;
  }
  currentVideoFile = file;

  const url = URL.createObjectURL(file);
  const videoElem = document.getElementById('video-preview');
  videoElem.src = url;
  document.getElementById('video-filename-tag').textContent = `${file.name} (${formatFileSize(file.size)})`;
  document.getElementById('video-dropzone-empty').classList.add('hidden');
  document.getElementById('video-preview-wrapper').classList.remove('hidden');
  document.getElementById('video-analyze-btn').disabled = false;
}

// -------------------------------------------------------------
// Quick Test Samples Loader
// -------------------------------------------------------------
async function loadSample(type, sampleFilename) {
  try {
    showToast(`Loading sample: ${sampleFilename}...`);
    
    if (type === 'image') {
      const sampleUrl = `/samples/${sampleFilename}`;
      document.getElementById('image-preview').src = sampleUrl;
      document.getElementById('image-filename-tag').textContent = sampleFilename;
      document.getElementById('image-dropzone-empty').classList.add('hidden');
      document.getElementById('image-preview-wrapper').classList.remove('hidden');
      document.getElementById('image-analyze-btn').disabled = true;

      // Call test endpoint directly
      setButtonLoading('image-analyze-btn', true, 'Forensic Scanning...');
      const res = await safeFetchJson(`/api/test-sample/${sampleFilename}`);
      setButtonLoading('image-analyze-btn', false, '<i class="fa-solid fa-microscope"></i> Run Forensic Analysis');
      document.getElementById('image-analyze-btn').disabled = false;

      if (res.ok && res.data.status === 'success') {
        renderImageResults(res.data);
      } else {
        showToast('Error analyzing sample: ' + ((res.data && res.data.message) || 'Unknown error'));
      }

    } else if (type === 'video') {
      const sampleUrl = `/samples/${sampleFilename}`;
      const videoElem = document.getElementById('video-preview');
      videoElem.src = sampleUrl;
      document.getElementById('video-filename-tag').textContent = sampleFilename;
      document.getElementById('video-dropzone-empty').classList.add('hidden');
      document.getElementById('video-preview-wrapper').classList.remove('hidden');
      document.getElementById('video-analyze-btn').disabled = true;

      setButtonLoading('video-analyze-btn', true, 'Forensic Scanning...');
      const res = await safeFetchJson(`/api/test-sample/${sampleFilename}`);
      setButtonLoading('video-analyze-btn', false, '<i class="fa-solid fa-microscope"></i> Run Forensic Analysis');
      document.getElementById('video-analyze-btn').disabled = false;

      if (res.ok && res.data.status === 'success') {
        renderVideoResults(res.data);
      } else {
        showToast('Error analyzing video sample: ' + ((res.data && res.data.message) || 'Unknown error'));
      }
    }
  } catch (err) {
    showToast(err.message);
    if (type === 'image') setButtonLoading('image-analyze-btn', false, '<i class="fa-solid fa-microscope"></i> Run Forensic Analysis');
    if (type === 'video') setButtonLoading('video-analyze-btn', false, '<i class="fa-solid fa-microscope"></i> Run Forensic Analysis');
  }
}

// -------------------------------------------------------------
// Image Analysis Submission
// -------------------------------------------------------------
async function analyzeUploadedImage() {
  if (!currentImageFile) return;

  const btn = document.getElementById('image-analyze-btn');
  setButtonLoading('image-analyze-btn', true, 'Forensic Scanning...');

  try {
    const formData = new FormData();
    formData.append('file', currentImageFile);

    const res = await safeFetchJson('/api/analyze/image', {
      method: 'POST',
      body: formData
    });

    setButtonLoading('image-analyze-btn', false, '<i class="fa-solid fa-microscope"></i> Run Forensic Analysis');

    if (res.ok && res.data.status === 'success') {
      renderImageResults(res.data);
      showToast('Analysis complete!');
    } else {
      showToast('Error: ' + ((res.data && res.data.message) || 'Failed to inspect image'));
    }
  } catch (err) {
    setButtonLoading('image-analyze-btn', false, '<i class="fa-solid fa-microscope"></i> Run Forensic Analysis');
    showToast(err.message);
  }
}

// -------------------------------------------------------------
// Video Analysis Submission
// -------------------------------------------------------------
async function analyzeUploadedVideo() {
  if (!currentVideoFile) return;

  setButtonLoading('video-analyze-btn', true, 'Temporal Scanning...');

  try {
    const formData = new FormData();
    formData.append('file', currentVideoFile);

    const res = await safeFetchJson('/api/analyze/video', {
      method: 'POST',
      body: formData
    });

    setButtonLoading('video-analyze-btn', false, '<i class="fa-solid fa-microscope"></i> Run Forensic Analysis');

    if (res.ok && res.data.status === 'success') {
      renderVideoResults(res.data);
      showToast('Video analysis complete!');
    } else {
      showToast('Error: ' + ((res.data && res.data.message) || 'Failed to inspect video'));
    }
  } catch (err) {
    setButtonLoading('video-analyze-btn', false, '<i class="fa-solid fa-microscope"></i> Run Forensic Analysis');
    showToast(err.message);
  }
}

// -------------------------------------------------------------
// Render Results
// -------------------------------------------------------------
function renderImageResults(res) {
  const resultBox = document.getElementById('image-result-box');
  const banner = document.getElementById('image-verdict-banner');
  const icon = document.getElementById('image-verdict-icon');
  const catLabel = document.getElementById('image-category-label');
  const verdictText = document.getElementById('image-verdict-text');
  const confidence = document.getElementById('image-confidence-val');
  const reasonsList = document.getElementById('image-reasons-list');

  // Reset banner classes
  banner.className = 'verdict-banner';
  banner.classList.add(res.badge_type);

  // Set icon & text
  if (res.badge_type === 'success') {
    icon.innerHTML = '<i class="fa-solid fa-camera"></i>';
  } else if (res.badge_type === 'danger') {
    icon.innerHTML = '<i class="fa-solid fa-robot"></i>';
  } else {
    icon.innerHTML = '<i class="fa-solid fa-share-nodes"></i>';
  }

  catLabel.textContent = res.category_label.toUpperCase();
  verdictText.textContent = res.verdict_text;
  confidence.textContent = `${res.confidence}%`;

  // Populate reasons
  reasonsList.innerHTML = '';
  res.reasons.forEach(r => {
    const li = document.createElement('li');
    li.textContent = r;
    reasonsList.appendChild(li);
  });

  // Populate Forensic Visuals
  if (res.forensics) {
    if (res.forensics.fft_vis_b64) {
      document.getElementById('image-fft-img').src = `data:image/jpeg;base64,${res.forensics.fft_vis_b64}`;
      document.getElementById('image-fft-peaks').textContent = res.forensics.fft_peaks;
      document.getElementById('image-fft-ratio').textContent = res.forensics.fft_high_freq_ratio;
    }
    if (res.forensics.ela_vis_b64) {
      document.getElementById('image-ela-img').src = `data:image/jpeg;base64,${res.forensics.ela_vis_b64}`;
      document.getElementById('image-ela-mean').textContent = res.forensics.ela_mean;
      document.getElementById('image-ela-var').textContent = res.forensics.ela_variance;
    }
    if (res.forensics.noise_vis_b64) {
      document.getElementById('image-noise-img').src = `data:image/jpeg;base64,${res.forensics.noise_vis_b64}`;
      document.getElementById('image-noise-var').textContent = res.forensics.sensor_noise_var;
    }
  }

  // Populate Metadata Table
  const metaTable = document.getElementById('image-meta-table');
  metaTable.innerHTML = '';
  if (res.metadata) {
    const metaEntries = [
      ['Filename', res.metadata.filename || '-'],
      ['Dimensions', res.metadata.dimensions || '-'],
      ['Camera Hardware', (res.metadata.camera_make ? `${res.metadata.camera_make} ${res.metadata.camera_model || ''}` : 'Not Detected / Stripped')],
      ['Capture Timestamp', res.metadata.date_time_original || 'Missing (Stripped)'],
      ['Hardware EXIF Present', res.metadata.has_exif ? 'Yes (Authentic)' : 'No (Stripped / Web Standard)'],
      ['AI Engine Detected', res.metadata.ai_tool_detected || 'None Detected'],
      ['Reshared Indicator', res.metadata.reshared_hint || 'None']
    ];

    metaEntries.forEach(([key, val]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<th>${key}</th><td>${val}</td>`;
      metaTable.appendChild(tr);
    });
  }

  resultBox.classList.remove('hidden');
}

function renderVideoResults(res) {
  const resultBox = document.getElementById('video-result-box');
  const banner = document.getElementById('video-verdict-banner');
  const icon = document.getElementById('video-verdict-icon');
  const catLabel = document.getElementById('video-category-label');
  const verdictText = document.getElementById('video-verdict-text');
  const confidence = document.getElementById('video-confidence-val');
  const reasonsList = document.getElementById('video-reasons-list');

  banner.className = 'verdict-banner';
  banner.classList.add(res.badge_type);

  if (res.badge_type === 'success') {
    icon.innerHTML = '<i class="fa-solid fa-video"></i>';
  } else if (res.badge_type === 'danger') {
    icon.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i>';
  } else {
    icon.innerHTML = '<i class="fa-solid fa-share-nodes"></i>';
  }

  catLabel.textContent = res.category_label.toUpperCase();
  verdictText.textContent = res.verdict_text;
  confidence.textContent = `${res.confidence}%`;

  reasonsList.innerHTML = '';
  res.reasons.forEach(r => {
    const li = document.createElement('li');
    li.textContent = r;
    reasonsList.appendChild(li);
  });

  // Render Keyframes
  const keyframesRow = document.getElementById('video-keyframes-row');
  keyframesRow.innerHTML = '';
  if (res.forensics && res.forensics.sample_thumbnails_b64) {
    res.forensics.sample_thumbnails_b64.forEach((b64, idx) => {
      const img = document.createElement('img');
      img.src = `data:image/jpeg;base64,${b64}`;
      img.alt = `Keyframe ${idx + 1}`;
      keyframesRow.appendChild(img);
    });
  }

  // Populate Metrics
  if (res.metadata) {
    document.getElementById('video-total-frames').textContent = res.metadata.total_frames || '-';
    document.getElementById('video-fps').textContent = res.metadata.fps || '-';
  }
  if (res.forensics) {
    document.getElementById('video-noise-std').textContent = res.forensics.temporal_noise_std || '-';
    document.getElementById('video-motion-diff').textContent = res.forensics.mean_frame_diff || '-';
  }

  resultBox.classList.remove('hidden');
}

// -------------------------------------------------------------
// UI Utilities
// -------------------------------------------------------------
function switchVisualTab(panel, tabName) {
  const container = document.getElementById(`${panel}-studio`);
  const buttons = container.querySelectorAll('.visual-tabs .tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));

  // Highlight active
  event.currentTarget.classList.add('active');

  // Hide all panels
  ['fft', 'ela', 'noise', 'meta'].forEach(name => {
    const el = document.getElementById(`${panel}-visual-${name}`);
    if (el) el.classList.add('hidden');
  });

  // Show target
  const target = document.getElementById(`${panel}-visual-${tabName}`);
  if (target) target.classList.remove('hidden');
}

function initResetButtons() {
  document.getElementById('image-clear-btn').addEventListener('click', () => {
    currentImageFile = null;
    document.getElementById('image-file-input').value = '';
    document.getElementById('image-preview').src = '';
    document.getElementById('image-preview-wrapper').classList.add('hidden');
    document.getElementById('image-dropzone-empty').classList.remove('hidden');
    document.getElementById('image-result-box').classList.add('hidden');
    document.getElementById('image-analyze-btn').disabled = true;
    showToast('Image studio reset');
  });

  document.getElementById('video-clear-btn').addEventListener('click', () => {
    currentVideoFile = null;
    document.getElementById('video-file-input').value = '';
    const videoElem = document.getElementById('video-preview');
    videoElem.pause();
    videoElem.src = '';
    document.getElementById('video-preview-wrapper').classList.add('hidden');
    document.getElementById('video-dropzone-empty').classList.remove('hidden');
    document.getElementById('video-result-box').classList.add('hidden');
    document.getElementById('video-analyze-btn').disabled = true;
    showToast('Video studio reset');
  });
}

function setButtonLoading(btnId, isLoading, defaultHtml) {
  const btn = document.getElementById(btnId);
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
  } else {
    btn.innerHTML = defaultHtml;
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

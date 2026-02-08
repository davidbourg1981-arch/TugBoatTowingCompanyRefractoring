/*
==========================================================
Tugboat Towing Co. â€” Refactor Pass 1 (non-breaking)
==========================================================
Goal: improve readability + make future refactors safer WITHOUT
changing gameplay behavior.
 
What changed in this pass:
- Added a table-of-contents + section headers (comments only).
- Added a small window.GameAPI export at the bottom for debugging
  / future modularization (no gameplay changes).
 
Next safe refactor steps (optional):
1) Consolidate globals under a single Game object (keep aliases).
2) Split update() into updateWeather/updateAI/updatePhysics/updateJobs.
3) Move save/load + options into their own module file.
 
----------------------------------------------------------
TABLE OF CONTENTS (JS)
----------------------------------------------------------
00) Polyfills / Canvas setup
01) Constants & enums (WORLD, ZONE, JOB_TYPES, etc.)
02) Core state (game, tugboat, career, licenses, options)
03) Utilities (math, random, helpers)
04) Audio (initAudio, playSound, engine)
05) Map & collision (rivers/harbor/ocean, isInWater, zones)
06) Weather & region features
07) UI (panels, HUD, messages, leaderboard, store)
08) Jobs (spawning, timers, completion/fail)
09) AI activeCompetitors (spawn, update, anti-stuck)
10) Player physics & towing
11) Camera & rendering (drawWorld, minimap)
12) Input (keyboard/gamepad/touch)
13) Save/Load (profiles, slots)
14) Game loop (update, render, start/reset)
==========================================================
*/
// Sound Effects System moved to audio.js

// Game options
// Game options moved to state.js

// =========================
// Stage 3: Camera Shake
// =========================
// Camera Shake state moved to state.js
// Logic remains here for now

function addCameraShake(strength = 6, durationSec = 0.18) {
  cameraShake.s = Math.max(cameraShake.s, strength);
  cameraShake.dur = Math.max(0.001, durationSec);
  cameraShake.t = cameraShake.dur;
}

function updateCameraShake(dtSec) {
  if (cameraShake.t <= 0) { cameraShake.x = 0; cameraShake.y = 0; cameraShake.s = 0; return; }
  cameraShake.t -= dtSec;
  const k = Math.max(0, cameraShake.t / cameraShake.dur);
  // random jitter with falloff
  const amp = cameraShake.s * k;
  cameraShake.x = (Math.random() * 2 - 1) * amp;
  cameraShake.y = (Math.random() * 2 - 1) * amp;
  if (cameraShake.t <= 0) { cameraShake.x = 0; cameraShake.y = 0; cameraShake.s = 0; }
}


// Game state
// Game state moved to state.js

// [Functions showDifficultySelect/closeDifficultySelect moved to ui.js]

// startGameWithDifficulty is defined in game-ctrl.js

function startGame() {
  gameStarted = true;
  document.getElementById('startScreen').classList.add('hidden');
  initAudio();
  startEngine();
  playSound('horn');
  generateRegionFeatures();
}

// Toggle cargo attachment/detachment
function toggleAttachment() {
  if (!gameStarted) return;

  // If already attached, release cargo
  if (tugboat.attached) {
    if (typeof addRipple === 'function') addRipple(tugboat.attached.x, tugboat.attached.y, 30);
    if (typeof playSound === 'function') playSound('splash');
    tugboat.attached = null;
    return;
  }

  // Try to attach to current job cargo
  if (!currentJob || currentJob.pickedUp) return;

  // Get all cargo for this job
  const cargos = currentJob.allCargo || [currentJob.cargo];
  if (!cargos || cargos.length === 0) return;

  // Check if close enough to first cargo (or any cargo for tandem)
  const mainCargo = cargos[0];
  const dist = Math.hypot(tugboat.x - mainCargo.x, tugboat.y - mainCargo.y);
  const attachRange = 80;

  if (dist < attachRange) {
    // Attach!
    tugboat.attached = mainCargo;
    currentJob.pickedUp = true;
    if (typeof addRipple === 'function') addRipple(tugboat.x, tugboat.y, 30);
    if (typeof playSound === 'function') playSound('attach');
    if (typeof showEvent === 'function') {
      showEvent('success', currentJob.jobType.icon + ' Cargo Attached!', 'Delivering to ' + (currentJob.delivery?.name || 'destination'));
    }
  }
}

function cycleQuality() {
  const qualities = ['Low', 'Medium', 'High'];
  const currentIdx = qualities.indexOf(options.quality);
  options.quality = qualities[(currentIdx + 1) % qualities.length];
  document.getElementById('qualityBtn').textContent = options.quality;

  // Apply quality presets
  if (options.quality === 'Low') {
    options.waves = false;
    options.particles = false;
    options.weatherSystemFx = false;
  } else if (options.quality === 'Medium') {
    options.waves = true;
    options.particles = false;
    options.weatherSystemFx = true;
  } else {
    options.waves = true;
    options.particles = true;
    options.weatherSystemFx = true;
  }
  updateOptionsUI();
}

// Display options
// ASPECT_RATIOS moved to constants.js
let currentAspect = 0;
let isFullscreen = false;

function cycleAspect() {
  currentAspect = (currentAspect + 1) % ASPECT_RATIOS.length;
  applyAspectRatio();
}

function applyAspectRatio() {
  const aspect = ASPECT_RATIOS[currentAspect];
  const container = document.getElementById('gameContainer');
  const canvas = document.getElementById('gameCanvas');

  // Update VIEW constants
  VIEW.width = aspect.width;
  VIEW.height = aspect.height;

  // Update canvas size
  canvas.width = aspect.width;
  canvas.height = aspect.height;

  // Update container size (only if not fullscreen and not on mobile)
  if (!isFullscreen) {
    const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (!isMobile) {
      container.style.width = aspect.width + 'px';
      container.style.height = aspect.height + 'px';
    } else {
      container.style.width = '100vw';
      container.style.height = '100vh';
    }
  }

  // Update button text
  document.getElementById('aspectBtn').textContent = aspect.name;
}

function toggleFullscreen() {
  const container = document.getElementById('gameContainer');
  const canvas = document.getElementById('gameCanvas');

  if (!isFullscreen) {
    // Enter fullscreen
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    } else if (container.mozRequestFullScreen) {
      container.mozRequestFullScreen();
    }
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    }
  }
}

// Handle fullscreen changes
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);

function handleFullscreenChange() {
  const container = document.getElementById('gameContainer');
  const canvas = document.getElementById('gameCanvas');
  const btn = document.getElementById('fullscreenToggle');

  isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);

  if (isFullscreen) {
    // Scale to fill screen while maintaining aspect ratio
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const aspect = ASPECT_RATIOS[currentAspect];
    const scale = Math.min(screenW / aspect.width, screenH / aspect.height);

    container.style.width = '100vw';
    container.style.height = '100vh';
    canvas.style.width = (aspect.width * scale) + 'px';
    canvas.style.height = (aspect.height * scale) + 'px';

    btn.textContent = 'ON';
    btn.classList.add('active');
  } else {
    // Restore normal size
    const aspect = ASPECT_RATIOS[currentAspect];
    const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    if (!isMobile) {
      container.style.width = aspect.width + 'px';
      container.style.height = aspect.height + 'px';
    } else {
      container.style.width = '100vw';
      container.style.height = '100vh';
    }
    canvas.style.width = '';
    canvas.style.height = '';

    btn.textContent = 'OFF';
    btn.classList.remove('active');
  }
}

function updateOptionsUI() {
  document.getElementById('wavesToggle').textContent = options.waves ? 'ON' : 'OFF';
  document.getElementById('wavesToggle').classList.toggle('active', options.waves);
  document.getElementById('particlesToggle').textContent = options.particles ? 'ON' : 'OFF';
  document.getElementById('particlesToggle').classList.toggle('active', options.particles);
  document.getElementById('weatherSystemFxToggle').textContent = options.weatherSystemFx ? 'ON' : 'OFF';
  document.getElementById('weatherSystemFxToggle').classList.toggle('active', options.weatherSystemFx);
}

// Keybinding system
// defaultKeybinds moved to constants.js

// currentKeybinds moved to state.js
// remapTarget moved to state.js

// [Function openRemapPanel() moved to input.js]
// [Function closeRemapPanel() moved to input.js]
// [Function startRemap() moved to input.js]
// [Function getKeyDisplayName() moved to input.js]
// [Function updateRemapUI() moved to input.js]
// [Function resetKeybinds() moved to input.js]
// [Function isKeyBound() moved to input.js]

function quitToMenu() {
  hideOptions();
  gameStarted = false;
  gameWon = false;
  gameLost = false;
  currentDifficulty = DIFFICULTY.normal;
  document.getElementById('startScreen').classList.remove('hidden');
  if (engineRunning) stopEngine();
  // Reset game state
  game.money = 100; game.jobsDone = 0; game.time = 0; game.paused = false;
  // Reset boat
  tugboat.x = 500; tugboat.y = 2000; tugboat.angle = 0;
  tugboat.vx = 0; tugboat.vy = 0; tugboat.angularVel = 0;
  tugboat.attached = null; tugboat.fuel = 100;
  tugboat.health = 100;
  tugboat.currentBoat = 0;
  tugboat.ownedBoats = [true, false, false, false, false, false, false];
  // Reset licenses
  licenses.owned = [];
  licenses.rushJobs = 0;
  licenses.fragileJobs = 0;
  licenses.rescueJobs = 0;
  licenses.salvageJobs = 0;
  waterParticles = []; ripples = [];
  activeCompetitors = []; competitorJobs = [];
  lastPlayerRank = 1; lastLeaderName = 'You'; eventCooldown = 0;
  chainCount = 0; lastDeliveryTime = 0;
  cargos = []; currentJob = null; availableJobs = [];
  // Reset career (keep nothing)
  career.currentRegion = 0;
  career.unlockedRegions = [true, false, false, false, false];
  career.totalDeliveries = 0;
  career.totalEarnings = 0;
  career.regionDeliveries = [0, 0, 0, 0, 0];
  // Reset player tier (new progression system)
  playerTier = 0;
  // Reset weatherSystem
  initCurrents();
  weatherSystem.current = WEATHER_TYPES.CLEAR;
  weatherSystem.raindrops = [];
  // Reset tide
  TIDE.phase = 0;
  // Hide job board if showing
  document.getElementById('jobBoardPanel').classList.remove('show');
  document.getElementById('leaderboard').style.display = 'none';
  // DON'T spawn jobs here - wait until game actually starts
  updateUI();
  updateRegionUI();
}

// [Orphans/buyBoat/selectBoat moved to ui.js]

// Audio init moved to audio.js

// Engine and Sound functions moved to audio.js
// Polyfill moved to utils.js
// WORLD moved to constants.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

// VIEW and Camera moved to state.js


// ==========================================
// NEW MAP SYSTEM - Rivers, Harbor, Ocean
// ==========================================

// Zone types for collision
// MAP CONSTANTS moved to constants.js

// Job tiers (replaces regions)
// JOB_TIERS moved to constants.js

// Player's current tier
// Player Tier / Unlock logic moved to world.js

// Zoom system
// View logic retained, globals moved to state.js

// Weather System
// WEATHER_TYPES moved to constants.js

// weatherSystem state moved to state.js

// initCurrents moved to world.js

// changeWeather moved to weather.js

// updateWeather moved to weather.js

// applyWeatherPhysics moved to weather.js

// drawWeatherEffects moved to weather.js

// drawCurrents moved to weather.js

// drawWindIndicator moved to weather.js

function drawZoomIndicator() {
  const indicator = document.getElementById('zoomIndicator');
  const text = document.getElementById('zoomText');

  // Only show if not at default zoom (70%)
  if (Math.abs(zoom.level - 0.7) < 0.05) {
    indicator.style.display = 'none';
    return;
  }

  indicator.style.display = 'block';
  text.textContent = `ðŸ” ${Math.round(zoom.level * 100)}%`;
}

// updateWeatherUI moved to weather.js

// ==========================================
// NEW MAP COLLISION SYSTEM
// ==========================================

// Check if a point is in navigable water (river or ocean)
// World/Map logic moved to world.js

// getCurrentRegion is defined earlier with the new map system

function getAvailableDocks() {
  // In new system, all docks are available
  // Job difficulty is controlled by tier, not dock access
  return docks;
}

// [Function checkRegionUnlocks moved to ui.js]

// unlockRegion is now handled by unlockTier (defined earlier)

// [Function selectRegion moved to ui.js]

// Job types
// JOB_TYPES moved to constants.js

// Boat types you can buy
// BOATS moved to constants.js

// License System - themed around river/harbor/ocean progression
// LICENSES moved to constants.js

// licenses moved to state.js

// [Functions hasLicense/canBuyLicense/getRequirementProgress/buyLicense moved to ui.js]

// tugboat moved to state.js

// cargoTypes moved to constants.js

// Collections and input state moved to state.js

// --- Gamepad (controller) support ---
// Gamepad state moved to state.js
// Auto-focus first focusable element when a panel opens (helps controller nav)
const _gpPanelObserver = new MutationObserver(() => {
  // if current focused element is hidden, refresh focus
  if (gpFocusedEl && !_gpIsVisible(gpFocusedEl)) gpFocusedEl = null;
  // if a modal just opened, focus first element
  const scopeEls = _gpGetFocusableEls();
  if (!gpFocusedEl && scopeEls.length) _gpSetFocused(scopeEls[0]);
});
try { _gpPanelObserver.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] }); } catch (e) { }


// Simple UI focus for controller navigation
// UI/Input helpers moved to state.js

function _gpIsVisible(el) {
  if (!el) return false;
  if (el.disabled) return false;
  // offsetParent is null when display:none or not in DOM flow
  return el.offsetParent !== null;
}

function _gpGetFocusableEls() {
  // Prefer buttons/inputs that are currently visible
  const rootPanels = [
    document.getElementById('startScreen'),
    document.getElementById('optionsPanel'),
    document.getElementById('licensePanel'),
    document.getElementById('boatShopPanel'),
    document.getElementById('careerPanel'),
    document.getElementById('jobBoardPanel'),
    document.getElementById('difficultyPanel'),
    document.getElementById('profilePanel'),
    document.getElementById('leaderboardPanel'),
    document.body
  ].filter(Boolean);

  // Choose the top-most active panel if possible
  let scope = document.body;
  const top = (typeof UI_NAV !== 'undefined') ? UI_NAV.getTopPanel() : null;
  if (top) {
    const el = document.getElementById(top.id);
    if (el) scope = el;
  } else {
    scope = rootPanels.find(p => p.classList && (p.classList.contains('show') || (!p.classList.contains('hidden') && p.id === 'startScreen'))) || document.body;
  }

  const els = Array.from(scope.querySelectorAll('button, [role="button"], input, select, textarea, a[href], .difficulty-card, .license-item, .boat-item, .region-item, [data-gp], [onclick]'))
    .filter(_gpIsVisible);
  els.forEach(_gpEnhanceClickable);

  return els;
}


// =========================
// Stage 1: Unified UI Navigation Layer (Panels + Focus + A/B)
// =========================
const UI_NAV = {
  // Highest priority first (top-most modal wins)
  panelOrder: [
    { id: 'remapPanel', close: () => (typeof closeRemapPanel === 'function' ? closeRemapPanel() : _hidePanel('remapPanel')) },
    { id: 'profilePanel', close: () => (typeof hideProfiles === 'function' ? hideProfiles() : _hidePanel('profilePanel')) },
    { id: 'difficultyPanel', close: () => (typeof closeDifficultySelect === 'function' ? closeDifficultySelect() : _hidePanel('difficultyPanel')) },
    { id: 'jobBoardPanel', close: () => _hidePanel('jobBoardPanel') },
    { id: 'questPanel', close: () => _hidePanel('questPanel') },
    { id: 'careerPanel', close: () => (typeof closeCareer === 'function' ? closeCareer() : _hidePanel('careerPanel')) },
    { id: 'boatShopPanel', close: () => (typeof closeBoatShop === 'function' ? closeBoatShop() : _hidePanel('boatShopPanel')) },
    { id: 'licensePanel', close: () => (typeof closeLicenses === 'function' ? closeLicenses() : _hidePanel('licensePanel')) },
    { id: 'howToPlayPanel', close: () => (typeof closeHowToPlay === 'function' ? closeHowToPlay() : _hidePanel('howToPlayPanel')) },
    { id: 'optionsPanel', close: () => (typeof hideOptions === 'function' ? hideOptions() : _hidePanel('optionsPanel')) },
    // Start screen is special: no "close" if game not started.
    { id: 'startScreen', close: null },
  ],
  getTopPanel() {
    for (const p of this.panelOrder) {
      const el = document.getElementById(p.id);
      if (el && _gpIsPanelOpen(el)) return p;
    }
    return null;
  },
  anyOpen() { return !!this.getTopPanel(); },
  back() {
    const top = this.getTopPanel();
    if (!top) return;
    if (top.id === 'startScreen') return; // don't close start screen from B
    if (top.close) top.close();
    else _hidePanel(top.id);
  }
};


function _handleEscapeAction() {
  if (document.getElementById('remapPanel').classList.contains('show')) {
    closeRemapPanel();
  } else if (document.getElementById('profilePanel').classList.contains('show')) {
    hideProfiles();
  } else if (document.getElementById('difficultyPanel').classList.contains('show')) {
    closeDifficultySelect();
  } else if (document.getElementById('howToPlayPanel').classList.contains('show')) {
    closeHowToPlay();
  } else if (document.getElementById('jobBoardPanel').classList.contains('show')) {
    closeJobBoard();
  } else if (document.getElementById('optionsPanel').classList.contains('show')) {
    hideOptions();
  } else if (document.getElementById('licensePanel').classList.contains('show')) {
    closeLicenses();
  } else if (document.getElementById('boatShopPanel').classList.contains('show')) {
    closeBoatShop();
  } else if (document.getElementById('careerPanel').classList.contains('show')) {
    closeCareer();
  } else if (typeof gameStarted !== 'undefined' && gameStarted) {
    showOptions();
  }
}
window.handleEscapeAction = _handleEscapeAction;

function _hidePanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('show');
  el.style.display = (id === 'startScreen') ? '' : el.style.display;
}

function _gpIsPanelOpen(el) {
  if (!el) return false;
  if (el.id === 'startScreen') {
    // Start screen is "open" if visible
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }
  return el.classList && el.classList.contains('show');
}

// When panels open/close, keep focus valid.
const _uiNavObserver = new MutationObserver(() => {
  try {
    if (typeof _gpGetFocusableEls !== 'function') return;
    if (gpFocusedEl && !_gpIsVisible(gpFocusedEl)) gpFocusedEl = null;
    const els = _gpGetFocusableEls();
    if (!gpFocusedEl && els && els.length) _gpSetFocused(els[0]);
  } catch (e) { }
});
try { _uiNavObserver.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] }); } catch (e) { }

function _gpEnhanceClickable(el) {
  if (!el) return;
  // Make non-button clickable divs focusable for controller UI nav
  const cls = el.classList;
  const isCard =
    (cls && (cls.contains('difficulty-card') || cls.contains('job-card') || cls.contains('license-item') || cls.contains('boat-item') || cls.contains('region-item')));
  const isClickable = isCard || el.hasAttribute('onclick') || el.getAttribute('role') === 'button';
  if (isClickable) {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  }
}


function _gpSetFocused(el) {
  if (gpFocusedEl && gpFocusedEl.classList) gpFocusedEl.classList.remove('gp-focus');
  gpFocusedEl = el;
  if (gpFocusedEl && gpFocusedEl.classList) gpFocusedEl.classList.add('gp-focus');
  if (gpFocusedEl && gpFocusedEl.focus) {
    try { gpFocusedEl.focus({ preventScroll: true }); } catch (_) { gpFocusedEl.focus(); }
  }
}

function _gpMoveFocus(dir) {
  const els = _gpGetFocusableEls();
  if (!els.length) return;
  gpFocusIndex = ((gpFocusIndex + dir) % els.length + els.length) % els.length;
  _gpSetFocused(els[gpFocusIndex]);
  try { playSound('uiMove'); } catch (e) { }
}

function _gpClickFocused() {
  try { playSound('uiSelect'); } catch (e) { }

  const els = _gpGetFocusableEls();
  if (!els.length) return;
  if (!gpFocusedEl || !_gpIsVisible(gpFocusedEl)) {
    gpFocusIndex = Math.min(gpFocusIndex, els.length - 1);
    _gpSetFocused(els[gpFocusIndex]);
    try { playSound('uiMove'); } catch (e) { }
  }
  if (!gpFocusedEl) return;

  // If focus is on a container card, try clicking its primary enabled button first.
  const tag = (gpFocusedEl.tagName || '').toUpperCase();
  if (tag !== 'BUTTON' && tag !== 'A' && !gpFocusedEl.hasAttribute('onclick')) {
    const btn = gpFocusedEl.querySelector('button:not([disabled])');
    if (btn) { btn.click(); return; }
  }

  gpFocusedEl.click();
}

function _applyDeadzone(v, dz) {
  if (Math.abs(v) < dz) return 0;
  // rescale outside deadzone to keep full range
  const sign = Math.sign(v);
  const mag = (Math.abs(v) - dz) / (1 - dz);
  return sign * Math.min(1, Math.max(0, mag));
}

function handleGamepad(delta = 1) {
  gamepadState.justPressed.clear();

  // Wrap in try-catch - getGamepads may be blocked by permissions policy
  let pads = [];
  try {
    pads = navigator.getGamepads ? navigator.getGamepads() : [];
  } catch (e) {
    // Gamepad API blocked - silently ignore
    gamepadState.connected = false;
    return;
  }

  const gp = pads && pads[0] ? pads[0] : null;
  gamepadState.connected = !!gp;
  if (!gp) return;

  // Axes (Xbox layout)
  const lx = gp.axes[0] ?? 0; // left stick X
  const ly = gp.axes[1] ?? 0; // left stick Y
  const rx = gp.axes[2] ?? 0; // right stick X
  const ry = gp.axes[3] ?? 0; // right stick Y

  // Steering on LEFT stick (requested)
  gamepadState.steer = _applyDeadzone(lx, gamepadState.deadzoneStick);

  // Left stick Y not used for throttle (triggers only)
  const stickThrottle = 0;

  // Triggers (standard mapping often on axes 2/5 OR buttons 6/7)
  const b6 = gp.buttons[6]?.value ?? 0; // LT
  const b7 = gp.buttons[7]?.value ?? 0; // RT
  gamepadState.lt = b6 > gamepadState.deadzoneTrigger ? b6 : 0;
  gamepadState.rt = b7 > gamepadState.deadzoneTrigger ? b7 : 0;

  // If triggers used, override stick throttle
  if (gamepadState.rt > 0 || gamepadState.lt > 0) {
    // match keyboard: forward up to 1, reverse up to -0.5
    gamepadState.throttle = Math.min(1, gamepadState.rt) - 0.5 * Math.min(1, gamepadState.lt);
  } else {
    // No trigger input -> no throttle (prevents accidental stick driving)
    gamepadState.throttle = 0;
  }

  // Buttons edge detection
  const btns = gp.buttons || [];
  if (!gamepadState.buttonsPrev.length) gamepadState.buttonsPrev = btns.map(b => !!b.pressed);

  for (let i = 0; i < btns.length; i++) {
    const pressed = !!btns[i].pressed;
    const prev = !!gamepadState.buttonsPrev[i];
    if (pressed && !prev) gamepadState.justPressed.add(i);
    gamepadState.buttonsPrev[i] = pressed;
  }

  // --- UI navigation (works even when game isn't started) ---
  // D-pad: 12 up, 13 down, 14 left, 15 right (Xbox standard)
  const uiPrevT = gamepadState._uiNavT || 0;
  // Analog menu navigation (left stick) with repeat delay
  if (gamepadState._uiNextRepeat == null) gamepadState._uiNextRepeat = 0;

  const now = performance.now();
  const navRepeatDelay = 220;   // ms initial repeat
  const navRepeatRate = 120;   // ms subsequent repeats
  const navThreshold = 0.65;

  const navX = _applyDeadzone(lx, gamepadState.deadzoneStick);
  const navY = _applyDeadzone(ly, gamepadState.deadzoneStick);

  let navDir = 0;
  // Prefer D-pad discrete presses first
  if (gamepadState.justPressed.has(12) || gamepadState.justPressed.has(14)) navDir = -1;
  if (gamepadState.justPressed.has(13) || gamepadState.justPressed.has(15)) navDir = 1;

  // If no d-pad press, allow stick to navigate (up/down)
  if (!navDir) {
    if (navY <= -navThreshold) navDir = -1; // up
    else if (navY >= navThreshold) navDir = 1; // down
  }

  if (navDir) {
    // repeat gating
    if (now >= gamepadState._uiNextRepeat) {
      _gpMoveFocus(navDir);
      // set next repeat time
      const first = (gamepadState._uiHeldDir !== navDir);
      gamepadState._uiHeldDir = navDir;
      gamepadState._uiNextRepeat = now + (first ? navRepeatDelay : navRepeatRate);
    }
  } else {
    gamepadState._uiHeldDir = 0;
    gamepadState._uiNextRepeat = 0;
  }

  // Confirm/Click: support A (0) and also X (2) for controllers that map differently
  if (gamepadState.justPressed.has(0) || gamepadState.justPressed.has(2)) {
    const anyPanelOpen = (typeof UI_NAV !== 'undefined' && UI_NAV.anyOpen()) || !gameStarted;

    // Allow opening the in-game bottom menu tabs even when no modal panel is open
    const hudMenu = document.querySelector('.bottom-menu');
    const hudMenuFocused = !!(gpFocusedEl && gpFocusedEl.closest && gpFocusedEl.closest('.bottom-menu'));
    const hudMenuOpen = !!(gameStarted && hudMenu && _gpIsVisible(hudMenu) && hudMenuFocused);

    if (anyPanelOpen || hudMenuOpen) _gpClickFocused();
  }

  // Back/Escape: unified
  if (gamepadState.justPressed.has(1) || gamepadState.justPressed.has(3)) {
    try { playSound('uiBack'); } catch (e) { }
    if (typeof UI_NAV !== 'undefined' && UI_NAV.anyOpen()) {
      UI_NAV.back();
    } else if (gameStarted) {
      showOptions();
    }
  }

  // Start = pause/options toggle
  if (gamepadState.justPressed.has(9)) {
    if (document.getElementById('optionsPanel')?.classList.contains('show')) hideOptions();
    else if (gameStarted) showOptions();
  }
}

// Competitor AI tugboats
const COMPETITOR_COLORS = [
  { name: 'Red Rival', color1: '#c0392b', color2: '#a93226', color3: '#922b21' },
  { name: 'Blue Baron', color1: '#2980b9', color2: '#2471a3', color3: '#1a5276' },
  { name: 'Green Machine', color1: '#27ae60', color2: '#229954', color3: '#1e8449' },
  { name: 'Purple Pirate', color1: '#8e44ad', color2: '#7d3c98', color3: '#6c3483' }
];

// activeCompetitors and competitorJobs are defined in state.js

// Calculate AI difficulty scaling based on player tier
function getAIDifficultyLevel() {
  // Primary factor is player's career tier (0-4 maps to 0-1)
  const tierFactor = playerTier / (JOB_TIERS.length - 1);

  // Secondary factors
  const jobFactor = Math.min(game.jobsDone / 50, 1); // 0-1 based on 50 jobs
  const boatFactor = tugboat.currentBoat / (BOATS.length - 1);

  // Combined difficulty (0 = easiest, 1 = hardest)
  // Tier is the main driver
  return Math.min(1, (tierFactor * 0.5 + jobFactor * 0.3 + boatFactor * 0.2));
}

function createCompetitor(index) {
  const colorScheme = COMPETITOR_COLORS[index % COMPETITOR_COLORS.length];
  const tier = getCurrentTier();

  // Spawn AI in appropriate zone for current tier
  let startX, startY;
  if (tier.spawnZone === 'harbor' || tier.spawnZone === 'harbor_edge') {
    // Early tiers: AI starts in harbor
    startX = 300 + Math.random() * 400;
    startY = 800 + Math.random() * 2400;
  } else if (tier.spawnZone === 'river_mid') {
    // Mid tier: AI starts in river
    const rivers = Object.values(RIVERS);
    const river = rivers[Math.floor(Math.random() * rivers.length)];
    const pathIdx = Math.floor(river.path.length / 3);
    startX = river.path[pathIdx].x;
    startY = river.path[pathIdx].y + (Math.random() - 0.5) * 100;
  } else {
    // High tier: AI starts further out
    startX = OCEAN.x - 800 + Math.random() * 600;
    startY = 600 + Math.random() * (WORLD.height - 1200);
  }

  // Get current difficulty level (0-1)
  const difficulty = getAIDifficultyLevel();

  // Apply game difficulty modifier
  const diffMult = currentDifficulty.aiSpeedMult || 1.0;

  // Scale AI stats based on player tier - start gentle, get challenging
  // Rookie tier AI should be slower than starter tug
  // Harbor Master tier AI should be competitive
  const baseSpeed = (2.5 + difficulty * 2.0) * diffMult;      // 2.5 to 4.5
  const baseAccel = (0.08 + difficulty * 0.07) * diffMult;    // 0.08 to 0.15 (doubled!)
  const baseTurn = (0.015 + difficulty * 0.015) * diffMult;   // 0.015 to 0.03

  // Add some variation so AI aren't identical
  const variation = 0.15;

  return {
    x: startX,
    y: startY,
    angle: Math.random() * Math.PI * 2,
    vx: 0,
    vy: 0,
    angularVel: 0,
    ...colorScheme,
    speed: baseSpeed * (1 + (Math.random() - 0.5) * variation),
    acceleration: baseAccel * (1 + (Math.random() - 0.5) * variation),
    turnSpeed: baseTurn * (1 + (Math.random() - 0.5) * variation),
    skillLevel: difficulty,
    attached: null,
    job: null,
    state: 'seeking',
    waitTimer: 3 + Math.random() * 10, // Start working fast!
    deliveries: 0,
    stuckTimer: 0,
    lastX: startX,
    lastY: startY
  };
}

// Update existing activeCompetitors when player tier changes
function updateCompetitorDifficulty() {
  const difficulty = getAIDifficultyLevel();

  for (const comp of activeCompetitors) {
    // Gradually improve AI if player has progressed
    if (difficulty > comp.skillLevel + 0.1) {
      const boost = (difficulty - comp.skillLevel) * 0.3;
      comp.speed = Math.min(4.5, comp.speed * (1 + boost * 0.15));
      comp.acceleration = Math.min(0.1, comp.acceleration * (1 + boost * 0.1));
      comp.turnSpeed = Math.min(0.025, comp.turnSpeed * (1 + boost * 0.1));
      comp.skillLevel = difficulty;
    }
  }
}

function initCompetitors() {
  activeCompetitors = [];
  competitorJobs = [];
  const numCompetitors = Math.min(3, Math.floor(game.jobsDone / 5) + 1);
  for (let i = 0; i < numCompetitors; i++) {
    activeCompetitors.push(createCompetitor(i));
  }
}

function spawnCompetitorJob(competitor) {
  // AI cargo tier scales with their skill level
  const maxTier = Math.min(4, 1 + Math.floor(competitor.skillLevel * 3));
  const available = cargoTypes.filter(c => c.tier <= maxTier && !c.requiresLicense);
  const cargoType = available[Math.floor(Math.random() * available.length)];

  const tier = getCurrentTier();
  let pickupDock, deliveryDock;

  // AI jobs match player's current tier zone
  if (tier.spawnZone === 'harbor' || tier.spawnZone === 'harbor_edge') {
    // Early tiers: AI starts in harbor
    startX = 300 + Math.random() * 400;
    startY = 800 + Math.random() * 2400;
  } else if (tier.spawnZone === 'river_mid') {
    // Mid tier: AI starts in river
    const rivers = Object.values(RIVERS);
    const river = rivers[Math.floor(Math.random() * rivers.length)];
    const pathIdx = Math.floor(river.path.length / 3);
    startX = river.path[pathIdx].x;
    startY = river.path[pathIdx].y + (Math.random() - 0.5) * 100;
  } else {
    // High tier: AI starts further out
    startX = OCEAN.x - 800 + Math.random() * 600;
    startY = 600 + Math.random() * (WORLD.height - 1200);
  }

  // Get current difficulty level (0-1)
  const difficulty = getAIDifficultyLevel();

  // Apply game difficulty modifier
  const diffMult = currentDifficulty.aiSpeedMult || 1.0;

  // Scale AI stats based on player tier - start gentle, get challenging
  // Rookie tier AI should be slower than starter tug
  // Harbor Master tier AI should be competitive
  const baseSpeed = (2.5 + difficulty * 2.0) * diffMult;      // 2.5 to 4.5
  const baseAccel = (0.08 + difficulty * 0.07) * diffMult;    // 0.08 to 0.15 (doubled!)
  const baseTurn = (0.015 + difficulty * 0.015) * diffMult;   // 0.015 to 0.03

  // Add some variation so AI aren't identical
  const variation = 0.15;

  return {
    x: startX,
    y: startY,
    angle: Math.random() * Math.PI * 2,
    vx: 0,
    vy: 0,
    angularVel: 0,
    ...colorScheme,
    speed: baseSpeed * (1 + (Math.random() - 0.5) * variation),
    acceleration: baseAccel * (1 + (Math.random() - 0.5) * variation),
    turnSpeed: baseTurn * (1 + (Math.random() - 0.5) * variation),
    skillLevel: difficulty,
    attached: null,
    job: null,
    state: 'seeking',
    waitTimer: 3 + Math.random() * 10, // Start working fast!
    deliveries: 0,
    stuckTimer: 0,
    lastX: startX,
    lastY: startY
  };
}

// Update existing activeCompetitors when player tier changes
function updateCompetitorDifficulty() {
  const difficulty = getAIDifficultyLevel();

  for (const comp of activeCompetitors) {
    // Gradually improve AI if player has progressed
    if (difficulty > comp.skillLevel + 0.1) {
      const boost = (difficulty - comp.skillLevel) * 0.3;
      comp.speed = Math.min(4.5, comp.speed * (1 + boost * 0.15));
      comp.acceleration = Math.min(0.1, comp.acceleration * (1 + boost * 0.1));
      comp.turnSpeed = Math.min(0.025, comp.turnSpeed * (1 + boost * 0.1));
      comp.skillLevel = difficulty;
    }
  }
}

function initCompetitors() {
  activeCompetitors = [];
  competitorJobs = [];
  const numCompetitors = Math.min(3, Math.floor(game.jobsDone / 5) + 1);
  for (let i = 0; i < numCompetitors; i++) {
    activeCompetitors.push(createCompetitor(i));
  }
}

function spawnCompetitorJob(competitor) {
  // AI cargo tier scales with their skill level
  const maxTier = Math.min(4, 1 + Math.floor(competitor.skillLevel * 3));
  const available = cargoTypes.filter(c => c.tier <= maxTier && !c.requiresLicense);
  const cargoType = available[Math.floor(Math.random() * available.length)];

  const tier = getCurrentTier();
  let pickupDock, deliveryDock;

  // AI jobs match player's current tier zone
  if (tier.spawnZone === 'harbor' || tier.spawnZone === 'harbor_edge') {
    // Early tiers: harbor-to-harbor jobs like player
    const harborDocks = docks.filter(d => d.x < HARBOR.width + (tier.spawnZone === 'harbor_edge' ? 800 : 200));
    pickupDock = harborDocks[Math.floor(Math.random() * harborDocks.length)];

    // Find a different delivery dock
    let attempts = 0;
    do {
      deliveryDock = harborDocks[Math.floor(Math.random() * harborDocks.length)];
      attempts++;
    } while (deliveryDock === pickupDock && attempts < 10);

    // If still same dock, just pick any other harbor dock
    if (deliveryDock === pickupDock && harborDocks.length > 1) {
      deliveryDock = harborDocks.find(d => d !== pickupDock) || harborDocks[0];
    }
  } else {
    // Higher tiers: pickup from zone, deliver to harbor
    const harborDocks = docks.filter(d => d.x < HARBOR.width + 200);
    deliveryDock = harborDocks[Math.floor(Math.random() * harborDocks.length)];
    pickupDock = getPickupDock(tier.spawnZone);

    // Make sure they're different
    let attempts = 0;
    while (pickupDock === deliveryDock && attempts < 10) {
      pickupDock = getPickupDock(tier.spawnZone);
      attempts++;
    }
  }

  const cargo = {
    ...cargoType,
    x: pickupDock.x + pickupDock.width / 2 + 50,
    y: pickupDock.y + pickupDock.height / 2,
    angle: 0, vx: 0, vy: 0,
    isCompetitorCargo: true,
    owner: competitor
  };

  competitor.job = {
    cargo,
    pickup: pickupDock,
    delivery: deliveryDock,
    pickedUp: false
  };
  competitor.state = 'picking';
  competitorJobs.push(cargo);
}

// NEW MAP: Docks are primarily in the harbor (left side)
const docks = [
  // === HARBOR DOCKS (Left side - inside harbor basin polygon) ===
  // North Harbor
  { x: 150, y: 500, width: 80, height: 40, name: 'North Pier A', hasFuel: true, hasRepair: true },
  { x: 150, y: 700, width: 80, height: 40, name: 'North Pier B', hasFuel: false, hasRepair: false },

  // Central Harbor (main area) - positioned along the left edge
  { x: 120, y: 1000, width: 90, height: 45, name: 'Central Marina', hasFuel: true, hasRepair: true },
  { x: 120, y: 1250, width: 90, height: 45, name: 'Cargo Terminal A', hasFuel: false, hasRepair: false },
  { x: 120, y: 1500, width: 90, height: 45, name: 'Cargo Terminal B', hasFuel: true, hasRepair: false },
  { x: 120, y: 1750, width: 90, height: 45, name: 'Main Dock', hasFuel: false, hasRepair: false },
  { x: 120, y: 2000, width: 90, height: 45, name: 'Shipyard', hasFuel: true, hasRepair: true },
  { x: 120, y: 2250, width: 90, height: 45, name: 'Fuel Depot', hasFuel: true, hasRepair: false },

  // South Harbor
  { x: 150, y: 2600, width: 80, height: 40, name: 'South Pier A', hasFuel: true, hasRepair: false },
  { x: 150, y: 2850, width: 80, height: 40, name: 'Repair Bay', hasFuel: false, hasRepair: true },
  { x: 150, y: 3100, width: 80, height: 40, name: 'South Depot', hasFuel: true, hasRepair: false },
  { x: 150, y: 3350, width: 80, height: 40, name: 'Fishermans Wharf', hasFuel: false, hasRepair: false },

  // === NORTH CHANNEL RIVER STOPS ===
  { x: 1400, y: 650, width: 60, height: 30, name: 'North Bend Fuel', hasFuel: true, hasRepair: false },
  { x: 2800, y: 620, width: 60, height: 30, name: 'Channel Waypoint', hasFuel: false, hasRepair: false },
  { x: 4200, y: 600, width: 60, height: 30, name: 'North Bridge Stop', hasFuel: true, hasRepair: true },
  { x: 5600, y: 750, width: 60, height: 30, name: 'Channel East', hasFuel: true, hasRepair: false },

  // === MAIN RIVER STOPS ===
  { x: 1200, y: 1750, width: 60, height: 30, name: 'River Landing', hasFuel: true, hasRepair: false },
  { x: 2400, y: 1650, width: 60, height: 30, name: 'Midway Dock', hasFuel: false, hasRepair: true },
  { x: 3600, y: 1800, width: 60, height: 30, name: 'Bridge Station', hasFuel: true, hasRepair: false },
  { x: 5000, y: 1500, width: 60, height: 30, name: 'River East Fuel', hasFuel: true, hasRepair: false },

  // === SOUTH PASSAGE STOPS ===
  { x: 1100, y: 3000, width: 60, height: 30, name: 'South Bend', hasFuel: true, hasRepair: false },
  { x: 2200, y: 3250, width: 60, height: 30, name: 'Passage Waypoint', hasFuel: false, hasRepair: false },
  { x: 3500, y: 2900, width: 60, height: 30, name: 'South Bridge Fuel', hasFuel: true, hasRepair: true },
  { x: 4800, y: 3050, width: 60, height: 30, name: 'Passage East', hasFuel: true, hasRepair: false },

  // === OCEAN PICKUP POINTS (Right side - in ocean zone x > 6000) ===
  { x: 6300, y: 900, width: 70, height: 35, name: 'Ocean Buoy North', hasFuel: false, hasRepair: false },
  { x: 6600, y: 1400, width: 70, height: 35, name: 'Offshore Platform A', hasFuel: true, hasRepair: false },
  { x: 6800, y: 1900, width: 70, height: 35, name: 'Ocean Hub', hasFuel: true, hasRepair: true },
  { x: 6600, y: 2400, width: 70, height: 35, name: 'Offshore Platform B', hasFuel: true, hasRepair: false },
  { x: 6300, y: 2900, width: 70, height: 35, name: 'Ocean Buoy South', hasFuel: false, hasRepair: false },

  // === FAR OCEAN (for higher tier jobs) ===
  { x: 7200, y: 1200, width: 70, height: 35, name: 'Deep Water Alpha', hasFuel: true, hasRepair: false },
  { x: 7500, y: 2000, width: 70, height: 35, name: 'Far Ocean Station', hasFuel: true, hasRepair: true },
  { x: 7200, y: 2800, width: 70, height: 35, name: 'Deep Water Beta', hasFuel: true, hasRepair: false }
];

// No more islands - replaced with riverbanks and coastline
const islands = [];

// Bridge locations for visual rendering
const bridges = [
  { x: RIVERS.north.bridgeAt, river: 'north', name: 'North Bridge' },
  { x: RIVERS.main.bridgeAt, river: 'main', name: 'Main Crossing' },
  { x: RIVERS.south.bridgeAt, river: 'south', name: 'South Bridge' }
];

// Helper to check if a point is near any island (legacy - now always returns false)
function isNearIsland(x, y, margin) {
  return false; // No more islands
}

// NEW: Check if position would cause a collision
function checkCollision(x, y, radius = 25) {
  const zone = getZoneAt(x, y);
  return zone === ZONE.LAND || zone === ZONE.SHALLOWS;
}

// NEW: Handle map boundary collision
function handleMapCollision(entity, radius = 25) {
  const zone = getZoneAt(entity.x, entity.y);

  if (zone === ZONE.LAND) {
    // Hard collision with land - stop and damage
    const speed = Math.hypot(entity.vx, entity.vy);
    if (speed > 1.5) {  // Only trigger collision at meaningful speed
      // Bounce back
      entity.vx *= -0.3;
      entity.vy *= -0.3;

      // Only damage player tugboat
      if (entity === tugboat) {
        handleCollision();
        addCameraShake(8, 0.2);
      }
    }

    // Push out of land - find nearest water
    const pushDir = findNearestWaterDirection(entity.x, entity.y);
    entity.x += pushDir.x * 8;
    entity.y += pushDir.y * 8;

    return true;
  }

  return false;
}

// Find direction to nearest water from a land position
function findNearestWaterDirection(x, y) {
  // Sample 8 directions
  const directions = [];
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const testX = x + Math.cos(a) * 50;
    const testY = y + Math.sin(a) * 50;
    if (isInWater(testX, testY)) {
      directions.push({ x: Math.cos(a), y: Math.sin(a) });
    }
  }

  if (directions.length > 0) {
    // Average the valid directions
    const avg = { x: 0, y: 0 };
    for (const d of directions) {
      avg.x += d.x;
      avg.y += d.y;
    }
    const len = Math.hypot(avg.x, avg.y);
    return len > 0 ? { x: avg.x / len, y: avg.y / len } : { x: 0, y: -1 };
  }

  // Default: push toward harbor (left)
  return { x: -1, y: 0 };
}



function updateCompetitors(delta) {
  activeCompetitors.forEach(comp => {
    if (!comp.job) {
      if (Math.random() < 0.01) spawnCompetitorJob(comp);
      return;
    }

    // specific AI logic would go here - simplified for restoration
    // Move towards target
    let target = null;
    if (comp.state === 'picking' && comp.job.pickup) {
      target = { x: comp.job.pickup.x + comp.job.pickup.width / 2, y: comp.job.pickup.y + comp.job.pickup.height / 2 };
    } else if (comp.state === 'delivering' && comp.job.delivery) {
      target = { x: comp.job.delivery.x + comp.job.delivery.width / 2, y: comp.job.delivery.y + comp.job.delivery.height / 2 };
    }

    if (target) {
      const dx = target.x - comp.x;
      const dy = target.y - comp.y;
      const dist = Math.hypot(dx, dy);

      // Turn
      const desiredAngle = Math.atan2(dy, dx);
      let diff = desiredAngle - comp.angle;
      while (diff <= -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (Math.abs(diff) > 0.1) {
        comp.angle += Math.sign(diff) * comp.turnSpeed * delta;
      }

      // Thrust
      if (Math.abs(diff) < 1.0) {
        const speed = Math.hypot(comp.vx, comp.vy);
        if (speed < comp.speed) {
          comp.vx += Math.cos(comp.angle) * comp.acceleration * delta;
          comp.vy += Math.sin(comp.angle) * comp.acceleration * delta;
        }
      }
    }

    // Drag
    comp.vx *= 0.96;
    comp.vy *= 0.96;

    // Move
    comp.x += comp.vx * delta;
    comp.y += comp.vy * delta;

    // Collision
    if (typeof handleMapCollision === 'function') handleMapCollision(comp);
  });
}

function init() {
  // setupDevToolsUI removed

  // Stage 3: UI click sounds for mouse taps
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t) return;
    if (t.closest && (t.closest('button') || t.closest('[role="button"]'))) {
      try { playSound('uiSelect'); } catch (_) { }
    }
  }, true);

  tugboat.fuel = tugboat.maxFuel;
  document.addEventListener('keydown', e => {
    // Handle key remapping
    if (remapTarget && document.getElementById('remapPanel').classList.contains('show')) {
      e.preventDefault();
      if (e.code !== 'Escape') {
        currentKeybinds[remapTarget] = e.code;
        updateRemapUI();
      }
      remapTarget = null;
      document.querySelectorAll('.remap-btn').forEach(btn => btn.classList.remove('listening'));
      return;
    }

    // Initialize audio on first keypress
    if (!audioCtx && gameStarted) {
      initAudio();
      startEngine();
    }
    keys[e.code] = true;

    // Handle currentKeybinds
    if ((e.code === currentKeybinds.attach || e.code === 'Space') && gameStarted) {
      e.preventDefault();
      toggleAttachment();
    }
    if (e.code === 'Escape') {
      _handleEscapeAction();
    }
    if ((e.code === currentKeybinds.refuel || e.code === 'KeyF') && gameStarted) refuel();
    if ((e.code === currentKeybinds.repair || e.code === 'KeyR') && gameStarted) repair();
    if ((e.code === currentKeybinds.horn || e.code === 'KeyH') && gameStarted) playSound('horn');
    if ((e.code === currentKeybinds.leaderboard || e.code === 'KeyL') && gameStarted) toggleLeaderboard();

    // Zoom controls
    if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      zoom.target = Math.min(zoom.max, zoom.target + 0.1);
    }
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      zoom.target = Math.max(zoom.min, zoom.target - 0.1);
    }
    if (e.code === 'Digit0' || e.code === 'Numpad0') {
      zoom.target = 0.7; // Reset zoom to default
    }
  });
  document.addEventListener('keyup', e => keys[e.code] = false);

  // Scroll wheel zoom
  canvas.addEventListener('wheel', e => {
    if (!gameStarted) return;
    e.preventDefault();

    const zoomSpeed = 0.1;
    if (e.deltaY < 0) {
      // Scroll up = zoom in
      zoom.target = Math.min(zoom.max, zoom.target + zoomSpeed);
    } else {
      // Scroll down = zoom out
      zoom.target = Math.max(zoom.min, zoom.target - zoomSpeed);
    }
  }, { passive: false });

  // Also init audio on click
  document.addEventListener('click', () => {
    if (!audioCtx && gameStarted) {
      initAudio();
      startEngine();
    }
  }, { once: false });

  // Initialize first region's activeCompetitors
  const startRegion = getCurrentRegion();
  for (let i = 0; i < startRegion.aiCount; i++) {
    activeCompetitors.push(createCompetitor(i));
  }

  // Initialize weatherSystem system
  initCurrents();
  changeWeather();

  spawnNewJob();
  updateUI();
  updateRegionUI();
  initMobileControls();
  requestAnimationFrame(gameLoop);
}

// Mobile Controls
function restartGame() {
  game.money = 100; game.jobsDone = 0; game.time = 0;
  tugboat.x = 500; tugboat.y = 2000; tugboat.angle = 0;
  tugboat.vx = 0; tugboat.vy = 0; tugboat.angularVel = 0;
  tugboat.attached = null; tugboat.fuel = tugboat.maxFuel;
  tugboat.health = tugboat.maxHealth;
  waterParticles = []; ripples = [];
  activeCompetitors = []; competitorJobs = [];
  lastPlayerRank = 1; lastLeaderName = 'You'; eventCooldown = 0;
  initCurrents();
  changeWeather();
  spawnNewJob(); updateUI(); updateLeaderboard();
}

// [Job, AI, and Game Logic moved to jobs.js]


function updateCamera(delta = 1) {
  // Smooth zoom transition
  zoom.level += (zoom.target - zoom.level) * zoom.speed * delta;

  // Calculate view size based on zoom
  const viewW = VIEW.width / zoom.level;
  const viewH = VIEW.height / zoom.level;

  const targetX = tugboat.x - viewW / 2;
  const targetY = tugboat.y - viewH / 2;
  const camSmooth = 1 - Math.pow(1 - 0.08, delta);
  camera.x += (targetX - camera.x) * camSmooth;
  camera.y += (targetY - camera.y) * camSmooth;
  camera.x = Math.max(0, Math.min(WORLD.width - viewW, camera.x));
  camera.y = Math.max(0, Math.min(WORLD.height - viewH, camera.y));
}

function updateEnvironment(delta) {
  // Update weatherSystem
  updateWeather(delta);

  // Update region features (seagulls, etc.)
  updateRegionFeatures(delta);

  // Decrease event cooldown
  if (eventCooldown > 0) eventCooldown -= delta;

  // Update leaderboard periodically (every ~30 frames / 0.5 sec)
  if (Math.floor(game.time) % 30 === 0 && Math.floor(game.time - delta) % 30 !== 0) {
    updateLeaderboard();
  }


}

// [Function updateJobRules moved to jobs.js]

// [Mobile vars moved to input.js]

// [Function initMobileControls() moved to input.js]

// [Function computeControls(delta) moved to input.js]

// [Function updateEngineAndFuel(delta, thrust) moved to physics.js]

// [Function updatePhysicsStep(delta, thrust, turn) moved to physics.js]

// [Function updatePostPhysics(delta, tugSpeed) moved to physics.js]

function updateDeliveryAndMeta(delta) {
  if (tugboat.attached && currentJob && currentJob.pickedUp && !currentJob.failed) {
    const dest = currentJob.delivery;
    // For tandem tow, check last cargo in chain
    const cargoToCheck = currentJob.jobType === JOB_TYPES.TANDEM && currentJob.allCargo
      ? currentJob.allCargo[currentJob.allCargo.length - 1]
      : tugboat.attached;
    const dist = Math.hypot(cargoToCheck.x - (dest.x + dest.width / 2), cargoToCheck.y - (dest.y + dest.height / 2));
    if (dist < 70) completeJob();
  }

  updateCamera(delta);
  updateUI();
  updateRefuelButton();
  updateRepairButton();
  updateCompetitors(delta);

  // Update AI difficulty every ~5 seconds (300 frames)
  if (Math.floor(game.time) % 300 === 0 && Math.floor(game.time - delta) % 300 !== 0) {
    updateCompetitorDifficulty();
  }

  // Check win/lose conditions periodically (~1 sec)
  if (Math.floor(game.time) % 60 === 0 && Math.floor(game.time - delta) % 60 !== 0) {
    checkVictory();
    checkBankruptcy();
  }

}

function update(delta = 1) {
  if (game.paused || !gameStarted) return;
  if (document.getElementById('optionsPanel').classList.contains('show')) return;
  game.time += delta; waveOffset += 0.012 * delta;


  updateEnvironment(delta);
  updateJobRules(delta);
  const controls = computeControls(delta);
  updateEngineAndFuel(delta, controls.thrust);
  const tugSpeed = updatePhysicsStep(delta, controls.thrust, controls.turn);
  updatePostPhysics(delta, tugSpeed);
  updateDeliveryAndMeta(delta);
}

// [Function updateRope(delta) moved to physics.js]
// [Function updateCargo(delta) moved to physics.js]


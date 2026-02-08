/* ==========================================
   GAME CONTROLLER
   UI Logic, Initialization, and Main Update Loop
   ========================================== */

// --- UI Functions ---

function showDifficultySelect() {
    if (gameStarted) return;
    const el = document.getElementById('difficultyPanel');
    if (el) el.classList.add('show');
}

function closeDifficultySelect() {
    const el = document.getElementById('difficultyPanel');
    if (el) el.classList.remove('show');
}

function startGameWithDifficulty(diffKey) {
    if (DIFFICULTY && DIFFICULTY[diffKey]) {
        currentDifficulty = DIFFICULTY[diffKey];
        _selectedDifficultyKey = diffKey;
    }
    closeDifficultySelect();
    document.getElementById('startScreen').style.display = 'none';
    initGame();
}

function continueGame() {
    if (!hasSaveInSlot(activeSaveSlot)) return;
    if (loadFromSlot(activeSaveSlot)) {
        closeDifficultySelect();
        document.getElementById('startScreen').style.display = 'none';
        initGame(true); // true = loaded
    }
}

function showProfiles() {
    const el = document.getElementById('profilePanel');
    if (el) {
        el.classList.add('show');
        if (typeof updateProfileUI === 'function') updateProfileUI();
    }
}

function hideProfiles() {
    const el = document.getElementById('profilePanel');
    if (el) el.classList.remove('show');
}

function showHowToPlay() {
    const el = document.getElementById('howToPlayPanel');
    if (el) el.classList.add('show');
}

function closeHowToPlay() {
    const el = document.getElementById('howToPlayPanel');
    if (el) el.classList.remove('show');
}

function showOptions() {
    const el = document.getElementById('optionsPanel');
    if (el) {
        el.classList.add('show');
        // Init sliders if needed
        if (typeof updateOptionsUI === 'function') updateOptionsUI();
    }
}

function hideOptions() {
    const el = document.getElementById('optionsPanel');
    if (el) el.classList.remove('show');
}

function closeJobBoard() {
    const el = document.getElementById('jobBoardPanel');
    if (el) {
        el.classList.remove('show');
        if (window.Game && Game.ui && Game.ui.unlockModal) Game.ui.unlockModal('jobBoard');
        else game.paused = false;
    }
}

// --- Initialization ---

function initGame(isLoaded = false) {
    if (gameStarted) return;

    // Canvas setup
    if (typeof canvas !== 'undefined' && canvas) {
        // If screen is smaller than view, scale down
        const aspect = VIEW.width / VIEW.height;
        // We keep internal resolution fixed at 900x600 for logic simplicity
        // game-render.js handles drawing
    }

    // Audio
    if (typeof initAudio === 'function') initAudio();

    // Initialize keyboard handlers (from main.js)
    if (typeof init === 'function') init();

    // World Generation
    if (!isLoaded) {
        // New Game Setup
        tugboat.x = 500;
        tugboat.y = 2000;
        tugboat.fuel = tugboat.maxFuel;
        tugboat.health = tugboat.maxHealth;
        game.time = 0;
        game.money = 100;
        game.jobsDone = 0;

        if (typeof generateRegionFeatures === 'function') generateRegionFeatures();
        if (typeof initCurrents === 'function') initCurrents();
        if (typeof spawnNewJob === 'function') spawnNewJob();
    } else {
        // Loaded game - just ensure features exist
        if (typeof generateRegionFeatures === 'function') generateRegionFeatures();
        if (typeof initCurrents === 'function') initCurrents();
        // Job state should be loaded
    }

    // AI
    if (typeof createCompetitor === 'function') {
        activeCompetitors = [];
        const region = getCurrentTier ? getCurrentTier() : { aiCount: 2 };
        for (let i = 0; i < region.aiCount; i++) {
            activeCompetitors.push(createCompetitor(i));
        }
    }

    gameStarted = true;
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);

    // Music
    if (isLoaded) playSound('engineStart');
    else playSound('jobAccept');
}



// --- Missing Input Helpers ---
// keys object is in state.js
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    keys[e.code] = true;
    if (e.key === 'Escape') handleEscapeAction();
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    keys[e.code] = false;
});

// Expose functions globally
window.showDifficultySelect = showDifficultySelect;
window.closeDifficultySelect = closeDifficultySelect;
window.startGameWithDifficulty = startGameWithDifficulty;
window.continueGame = continueGame;
window.showProfiles = showProfiles;
window.hideProfiles = hideProfiles;
window.showHowToPlay = showHowToPlay;
window.closeHowToPlay = closeHowToPlay;
window.showOptions = showOptions;
window.hideOptions = hideOptions;
window.closeJobBoard = closeJobBoard;
window.initGame = initGame;
// Note: update() is defined in main.js, not here

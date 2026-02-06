/* ==========================================
   STATE MODULE
   Global state containers
   ========================================== */

// Game loop state
const game = {
    money: 100,
    jobsDone: 0,
    time: 0,
    paused: false
};

// Game settings
const options = {
    sound: true,
    engineSound: true,
    volume: 70,
    waves: true,
    particles: true,
    weatherFx: true,
    minimap: true,
    quality: 'High'
};

// Visual state
let zoom = {
    level: 0.7,
    min: 0.5,
    max: 2.0,
    target: 0.7,
    speed: 0.1
};

const cameraShake = { t: 0, dur: 0.001, s: 0, x: 0, y: 0 };
let VIEW = { width: 900, height: 600 };
const camera = { x: 0, y: 0 };

// Progression state
const career = {
    currentRegion: 0,
    unlockedRegions: [true, false, false, false, false],
    totalDeliveries: 0,
    totalEarnings: 0,
    regionDeliveries: [0, 0, 0, 0, 0]
};

const licenses = {
    owned: [],
    rushJobs: 0,
    fragileJobs: 0,
    rescueJobs: 0,
    salvageJobs: 0
};

// Player entity state
const tugboat = {
    x: 500, y: 2000, angle: 0, vx: 0, vy: 0, angularVel: 0, fuel: 100,
    health: 100,
    currentBoat: 0,
    ownedBoats: [true, false, false, false, false, false, false],
    get boat() { return BOATS[this.currentBoat]; },
    get maxHealth() { return this.boat.maxHealth; },
    get maxFuel() { return this.boat.maxFuel; },
    get power() { return this.boat.power; },
    get maxSpeed() {
        const base = this.boat.speed;
        return (window.hasLicense && hasLicense('speedDemon')) ? base * 1.15 : base;
    },
    get turnSpeed() { return this.boat.turnSpeed; },
    get towStrength() { return this.boat.towStrength; },
    get ropeLength() { return this.boat.ropeLength; },
    get armorRating() { return this.boat.armor; },
    get fuelEfficiency() {
        const base = this.boat.fuelEfficiency;
        return (window.hasLicense && hasLicense('speedDemon')) ? base * 1.1 : base;
    },
    get cargoTier() { return this.boat.cargoTier; },
    drag: 0.985, angularDrag: 0.88, attached: null
};

// Global flags
let gameStarted = false;
let gameWon = false;
let gameLost = false;
let currentDifficulty = DIFFICULTY.normal; // Depends on constants.js
let activeSaveSlot = 0;

// Collections
let cargos = [];
let currentJob = null;
let availableJobs = [];
let competitors = [];
let competitorJobs = [];
let waterParticles = [];
let ripples = [];

// Input state
const keys = {};
const gamepadState = {
    connected: false,
    steer: 0,
    throttle: 0,
    lt: 0,
    rt: 0,
    buttons: [],
    buttonsPrev: [],
    justPressed: new Set(),
    deadzoneStick: 0.15,
    deadzoneTrigger: 0.05
};

// Helper for UI/Input state
let gpFocusIndex = 0;
let gpFocusedEl = null; // Added back commonly used globals to avoid ref error
let remapTarget = null;
let keybinds = { ...defaultKeybinds }; // constants.js

// Leaderboard state
let lastPlayerRank = 1;
let lastLeaderName = 'You';
let eventCooldown = 0;
let leaderboardVisible = false;

// Chain bonus
let lastDeliveryTime = 0;
let chainCount = 0;

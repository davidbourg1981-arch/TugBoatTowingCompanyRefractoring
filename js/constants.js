/*
==========================================================
Tugboat Towing Co. — Constants
==========================================================
*/

// Difficulty levels
const DIFFICULTY = {
    easy: {
        name: 'Casual',
        payMult: 1.25,
        fuelMult: 0.7,
        aiSpeedMult: 0.8,
        timerMult: 1.3,
        repairCostMult: 0.8
    },
    normal: {
        name: 'Standard',
        payMult: 1.0,
        fuelMult: 1.0,
        aiSpeedMult: 1.0,
        timerMult: 1.0,
        repairCostMult: 1.0
    },
    hard: {
        name: "Captain's Challenge",
        payMult: 0.8,
        fuelMult: 1.15,
        aiSpeedMult: 1.3,
        timerMult: 0.8,
        repairCostMult: 1.3
    },
    endless: {
        name: 'Endless',
        payMult: 1.0,
        fuelMult: 1.0,
        aiSpeedMult: 1.0,
        timerMult: 1.0,
        repairCostMult: 1.0,
        noVictory: true
    }
};

// Key bindings defaults
const defaultKeybinds = {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    attach: 'Space',
    refuel: 'KeyF',
    repair: 'KeyR',
    horn: 'KeyH',
    leaderboard: 'KeyL'
};

// Display Aspect Ratios
const ASPECT_RATIOS = [
    { name: '3:2', width: 900, height: 600 },
    { name: '16:9', width: 960, height: 540 },
    { name: '16:10', width: 900, height: 562 },
    { name: '4:3', width: 800, height: 600 },
    { name: '21:9', width: 1050, height: 450 }
];

// World dimensions
const WORLD = { width: 8000, height: 4000 };

// Tide system
const TIDE = {
    phase: 0,
    cycleLength: 600, // 10 minutes for a full tide cycle

    update(deltaSec) {
        this.phase = (this.phase + deltaSec / this.cycleLength) % 1;
    },

    isHighTide() {
        // High tide when phase is between 0.25 and 0.75
        return this.phase >= 0.25 && this.phase < 0.75;
    },

    getCurrentMultiplier() {
        // Returns 0.8 to 1.2 based on tide
        // High tide = faster currents, low tide = slower
        const tideFactor = Math.sin(this.phase * Math.PI * 2);
        return 1 + tideFactor * 0.2;
    }
};

// Zone types for collision
const ZONE = {
    WATER: 0,      // Safe navigation (ocean, river)
    SHALLOWS: 1,   // Slow + minor damage over time
    LAND: 2,       // Hard collision - stop + major damage
    DOCK: 3        // Special - can dock if slow, damage if fast
};

// River definitions
const RIVERS = {
    north: {
        name: 'North Channel',
        width: 280,
        currentStrength: 0.15,
        payBonus: 1.0,
        path: [
            { x: 200, y: 700 },
            { x: 500, y: 750 },
            { x: 900, y: 780 },
            { x: 1400, y: 750 },
            { x: 2000, y: 700 },
            { x: 2800, y: 720 },
            { x: 3600, y: 680 },
            { x: 4400, y: 700 },
            { x: 5200, y: 750 },
            { x: 6000, y: 850 },
            { x: 6600, y: 1000 }
        ],
        bridgeAt: 4400
    },
    main: {
        name: 'Main River',
        width: 220,
        currentStrength: 0.25,
        payBonus: 1.15,
        path: [
            { x: 200, y: 1900 },
            { x: 500, y: 1850 },
            { x: 900, y: 1800 },
            { x: 1400, y: 1700 },
            { x: 2000, y: 1650 },
            { x: 2600, y: 1750 },
            { x: 3200, y: 1850 },
            { x: 3800, y: 1800 },
            { x: 4400, y: 1650 },
            { x: 5000, y: 1550 },
            { x: 5600, y: 1500 },
            { x: 6200, y: 1550 },
            { x: 6800, y: 1700 }
        ],
        bridgeAt: 3400
    },
    south: {
        name: 'South Passage',
        width: 170,
        currentStrength: 0.4,
        payBonus: 1.5,
        path: [
            { x: 200, y: 3100 },
            { x: 500, y: 3000 },
            { x: 900, y: 2950 },
            { x: 1300, y: 3050 },
            { x: 1700, y: 3200 },
            { x: 2100, y: 3300 },
            { x: 2500, y: 3250 },
            { x: 2900, y: 3100 },
            { x: 3300, y: 2950 },
            { x: 3700, y: 2900 },
            { x: 4100, y: 2950 },
            { x: 4500, y: 3050 },
            { x: 4900, y: 3100 },
            { x: 5300, y: 3000 },
            { x: 5700, y: 2850 },
            { x: 6100, y: 2700 },
            { x: 6500, y: 2650 },
            { x: 6900, y: 2750 }
        ],
        bridgeAt: 3300
    }
};

// Harbor area
const HARBOR = {
    x: 0,
    y: 0,
    width: 1200,
    height: WORLD.height,
    dockZone: { x: 80, y: 350, width: 980, height: 3300 }
};

// Ocean area
const OCEAN = {
    x: 6200,
    y: 0,
    width: 1800,
    height: WORLD.height
};

// Job Tiers
const JOB_TIERS = [
    {
        name: 'Rookie',
        icon: '<span class="icon icon-casual"></span>',
        description: 'Harbor-only jobs, learn the ropes',
        unlockCost: 0,
        jobsRequired: 0,
        payMultiplier: 1.0,
        cargoSize: 'small',
        spawnZone: 'harbor',
        maxDistance: 800,
        aiCount: 1
    },
    {
        name: 'Deckhand',
        icon: '<span class="icon icon-anchor"></span>',
        description: 'Near-harbor and river entrance',
        unlockCost: 400,
        jobsRequired: 8,
        payMultiplier: 1.2,
        cargoSize: 'small',
        spawnZone: 'harbor_edge',
        maxDistance: 1500,
        aiCount: 1
    },
    {
        name: 'Skipper',
        icon: '<span class="icon icon-boat"></span>',
        description: 'River routes, medium cargo',
        unlockCost: 1500,
        jobsRequired: 20,
        payMultiplier: 1.4,
        cargoSize: 'medium',
        spawnZone: 'river_mid',
        maxDistance: 3000,
        aiCount: 2
    },
    {
        name: 'Captain',
        icon: '<span class="icon icon-trophy"></span>',
        description: 'Full river + near ocean',
        unlockCost: 4000,
        jobsRequired: 40,
        payMultiplier: 1.7,
        cargoSize: 'large',
        spawnZone: 'river_mouth',
        maxDistance: 5000,
        aiCount: 3
    },
    {
        name: 'Harbor Master',
        icon: '<span class="icon icon-star"></span>',
        description: 'Ocean runs, VIP, Hazmat',
        unlockCost: 10000,
        jobsRequired: 75,
        payMultiplier: 2.0,
        cargoSize: 'huge',
        spawnZone: 'ocean',
        maxDistance: 8000,
        aiCount: 4
    }
];

// Weather Types
const WEATHER_TYPES = {
    CLEAR: {
        name: 'Clear',
        icon: '<span class="icon icon-sun"></span>',
        visibility: 1.0,
        windStrength: 0,
        currentStrength: 0,
        payBonus: 1.0,
        duration: [1800, 3600]
    },
    WIND: {
        name: 'Windy',
        icon: '<span class="icon icon-wind"></span>',
        visibility: 1.0,
        windStrength: 0.015,
        currentStrength: 0,
        payBonus: 1.15,
        duration: [1200, 2400]
    },
    FOG: {
        name: 'Foggy',
        icon: '<span class="icon icon-fog"></span>',
        visibility: 0.3,
        windStrength: 0,
        currentStrength: 0,
        payBonus: 1.25,
        duration: [1200, 2400]
    },
    RAIN: {
        name: 'Rain',
        icon: '<span class="icon icon-rain"></span>',
        visibility: 0.7,
        windStrength: 0.008,
        currentStrength: 0.005,
        payBonus: 1.2,
        duration: [1200, 2400]
    },
    STORM: {
        name: 'Storm',
        icon: '<span class="icon icon-storm"></span>',
        visibility: 0.5,
        windStrength: 0.025,
        currentStrength: 0.012,
        payBonus: 1.5,
        duration: [900, 1800]
    }
};

// Job Types
const JOB_TYPES = {
    STANDARD: { name: 'Standard Tow', icon: '<span class="icon icon-box"></span>', color: '#ffd700', class: 'job-standard', payMult: 1 },
    RUSH: { name: 'Rush Delivery', icon: '<span class="icon icon-rush"></span>', color: '#e74c3c', class: 'job-rush', payMult: 1.5, hasTimer: true, timePerDist: 0.09, requiresLicense: 'express' },
    FRAGILE: { name: 'Fragile Cargo', icon: '<span class="icon icon-fragile"></span>', color: '#9b59b6', class: 'job-fragile', payMult: 1.8, noCollision: true, requiresLicense: 'fragile' },
    RESCUE: { name: 'Rescue Mission', icon: '<span class="icon icon-rescue"></span>', color: '#3498db', class: 'job-rescue', payMult: 3, hasTimer: true, fixedTime: 60, sinking: true, requiresLicense: 'rescue' },
    SALVAGE: { name: 'Salvage Op', icon: '<span class="icon icon-salvage"></span>', color: '#1abc9c', class: 'job-salvage', payMult: 2.2, floating: true, hasTimer: true, fixedTime: 90, requiresLicense: 'salvageExpert' },
    VIP: { name: 'VIP Transport', icon: '<span class="icon icon-vip"></span>', color: '#f39c12', class: 'job-vip', payMult: 3, noCollision: true, hasTimer: true, timePerDist: 0.15, minSpeed: true, requiresLicense: 'vip' },
    TANDEM: { name: 'Tandem Tow', icon: '<span class="icon icon-tandem"></span>', color: '#e67e22', class: 'job-tandem', payMult: 2.5, multiCargo: true, minCargo: 2, maxCargo: 3, requiresLicense: 'tandem' }
};

// Boat Types
const BOATS = [
    {
        name: 'Starter Tug',
        icon: '<span class="icon icon-boat-starter"></span>',
        color1: '#ff7043', color2: '#f4511e', color3: '#d84315',
        price: 0,
        speed: 3.0,
        power: 0.07,
        turnSpeed: 0.016,
        maxFuel: 150,
        maxHealth: 100,
        towStrength: 0.8,
        ropeLength: 70,
        armor: 1.0,
        fuelEfficiency: 1.0,
        cargoTier: 1,
        description: 'Basic tug. Gets the job done.'
    },
    {
        name: 'Harbor Runner',
        icon: '<span class="icon icon-boat-harbor"></span>',
        color1: '#42a5f5', color2: '#1e88e5', color3: '#1565c0',
        price: 800,
        speed: 3.5,
        power: 0.09,
        turnSpeed: 0.020,
        maxFuel: 180,
        maxHealth: 120,
        towStrength: 0.95,
        ropeLength: 75,
        armor: 0.95,
        fuelEfficiency: 0.9,
        cargoTier: 2,
        description: 'Fast & nimble. Better fuel economy.'
    },
    {
        name: 'Coastal Hauler',
        icon: '<span class="icon icon-boat-coastal"></span>',
        color1: '#66bb6a', color2: '#43a047', color3: '#2e7d32',
        price: 2500,
        speed: 3.9,
        power: 0.10,
        turnSpeed: 0.018,
        maxFuel: 220,
        maxHealth: 150,
        towStrength: 1.25,
        ropeLength: 85,
        armor: 0.85,
        fuelEfficiency: 0.85,
        cargoTier: 3,
        description: 'Reliable workhorse. Good balance.'
    },
    {
        name: 'Bay Bruiser',
        icon: '<span class="icon icon-boat-bruiser"></span>',
        color1: '#ab47bc', color2: '#8e24aa', color3: '#6a1b9a',
        price: 5000,
        speed: 3.8,
        power: 0.11,
        turnSpeed: 0.019,
        maxFuel: 280,
        maxHealth: 180,
        towStrength: 1.35,
        ropeLength: 95,
        armor: 0.75,
        fuelEfficiency: 0.8,
        cargoTier: 3,
        description: 'Strong towing power. Built tough.'
    },
    {
        name: 'Sea Master',
        icon: '<span class="icon icon-boat-master"></span>',
        color1: '#78909c', color2: '#546e7a', color3: '#37474f',
        price: 9000,
        speed: 4.2,
        power: 0.12,
        turnSpeed: 0.021,
        maxFuel: 350,
        maxHealth: 220,
        towStrength: 1.5,
        ropeLength: 105,
        armor: 0.7,
        fuelEfficiency: 0.75,
        cargoTier: 4,
        description: 'Professional grade. Long range.'
    },
    {
        name: 'Storm Chaser',
        icon: '<span class="icon icon-boat-storm"></span>',
        color1: '#5c6bc0', color2: '#3f51b5', color3: '#303f9f',
        price: 15000,
        speed: 4.5,
        power: 0.13,
        turnSpeed: 0.023,
        maxFuel: 420,
        maxHealth: 260,
        towStrength: 1.65,
        ropeLength: 115,
        armor: 0.6,
        fuelEfficiency: 0.7,
        cargoTier: 5,
        description: 'Weather resistant. High performance.'
    },
    {
        name: 'Ocean Titan',
        icon: '<span class="icon icon-boat-titan"></span>',
        color1: '#ffd54f', color2: '#ffb300', color3: '#ff8f00',
        price: 25000,
        speed: 5.0,
        power: 0.15,
        turnSpeed: 0.025,
        maxFuel: 500,
        maxHealth: 320,
        towStrength: 1.9,
        ropeLength: 130,
        armor: 0.5,
        fuelEfficiency: 0.65,
        cargoTier: 5,
        description: 'The ultimate tugboat. Haul anything.'
    }
];

// Licenses
const LICENSES = {
    riverPilot: {
        id: 'riverPilot',
        name: 'River Pilot License',
        icon: '<span class="icon icon-river"></span>',
        description: 'Navigate river currents like a pro',
        cost: 600,
        requirement: { type: 'deliveries', value: 10 },
        effect: '50% less current push when traveling upstream'
    },
    dockMaster: {
        id: 'dockMaster',
        name: 'Dock Master Cert',
        icon: '<span class="icon icon-dock"></span>',
        description: 'Precision docking expertise',
        cost: 800,
        requirement: { type: 'deliveries', value: 15 },
        effect: 'Larger dock detection radius for deliveries'
    },
    express: {
        id: 'express',
        name: 'Express Courier Cert',
        icon: '<span class="icon icon-rush"></span>',
        description: 'More time on rush deliveries',
        cost: 1000,
        requirement: { type: 'deliveries', value: 12 },
        effect: '+30 seconds on rush delivery timers'
    },
    fragile: {
        id: 'fragile',
        name: 'Fragile Goods Handler',
        icon: '<span class="icon icon-fragile"></span>',
        description: 'Handle delicate cargo with care',
        cost: 1200,
        requirement: { type: 'deliveries', value: 18 },
        effect: 'Survive 1 minor collision on fragile cargo'
    },
    rescue: {
        id: 'rescue',
        name: 'River Rescue License',
        icon: '<span class="icon icon-rescue"></span>',
        description: 'Emergency rescue operations',
        cost: 1500,
        requirement: { type: 'deliveries', value: 22 },
        effect: 'Sinking boats sink 40% slower'
    },
    salvageExpert: {
        id: 'salvageExpert',
        name: 'Salvage Diver Cert',
        icon: '<span class="icon icon-salvage"></span>',
        description: 'Master of cargo recovery',
        cost: 1500,
        requirement: { type: 'deliveries', value: 28 },
        effect: 'Salvage cargo drifts 50% slower, easier to spot'
    },
    heavy: {
        id: 'heavy',
        name: 'Heavy Haul License',
        icon: '<span class="icon icon-heavy"></span>',
        description: 'Tow the big stuff',
        cost: 2000,
        requirement: { type: 'deliveries', value: 30 },
        effect: 'Unlocks Container Ships & Oil Tankers'
    },
    hazmat: {
        id: 'hazmat',
        name: 'Hazmat Certification',
        icon: '<span class="icon icon-hazmat"></span>',
        description: 'Transport dangerous chemicals',
        cost: 2500,
        requirement: { type: 'deliveries', value: 35 },
        effect: 'Unlocks Chemical Barge (high pay, no collisions!)'
    },
    storm: {
        id: 'storm',
        name: 'Storm Runner Permit',
        icon: '<span class="icon icon-storm"></span>',
        description: 'Brave the worst weather',
        cost: 2000,
        requirement: { type: 'deliveries', value: 25 },
        effect: '+100% weather bonus (instead of +25%)'
    },
    oceanClass: {
        id: 'oceanClass',
        name: 'Ocean Class License',
        icon: '<span class="icon icon-salvage"></span>',
        description: 'Deep water operations certified',
        cost: 3500,
        requirement: { type: 'deliveries', value: 50 },
        effect: '+20% pay on all ocean pickups'
    },
    speedDemon: {
        id: 'speedDemon',
        name: 'Speed Demon Cert',
        icon: '<span class="icon icon-speed"></span>',
        description: 'Need for speed on the water',
        cost: 3000,
        requirement: { type: 'earnings', value: 20000 },
        effect: '+15% boat speed, +10% fuel consumption'
    },
    tandem: {
        id: 'tandem',
        name: 'Tandem Tow License',
        icon: '<span class="icon icon-tandem"></span>',
        description: 'Tow multiple barges at once',
        cost: 4000,
        requirement: { type: 'deliveries', value: 45 },
        effect: 'Unlocks Tandem Tow jobs (2-3 barges)'
    },
    vip: {
        id: 'vip',
        name: 'VIP Transport License',
        icon: '<span class="icon icon-vip"></span>',
        description: 'Handle high-value clients',
        cost: 5000,
        requirement: { type: 'earnings', value: 30000 },
        effect: 'Unlocks VIP jobs (huge pay, no stops allowed)'
    },
    harborLegend: {
        id: 'harborLegend',
        name: 'Harbor Legend Status',
        icon: '<span class="icon icon-trophy"></span>',
        description: 'The highest honor on 3 Rivers',
        cost: 8000,
        requirement: { type: 'deliveries', value: 80 },
        effect: '+15% pay on ALL jobs, AI gives you priority'
    }
};

// Cargo Types
const cargoTypes = [
    { name: 'Small Barge', icon: '<span class="icon icon-barge"></span>', color: '#6d4c2a', accent: '#8b5a2b', width: 40, height: 20, basePay: 40, tier: 1, weight: 1, type: 'barge' },
    { name: 'Fishing Boat', icon: '<span class="icon icon-fishing"></span>', color: '#2471a3', accent: '#3498db', width: 38, height: 18, basePay: 50, tier: 1, weight: 1, type: 'fishing' },
    { name: 'Yacht', icon: '<span class="icon icon-yacht"></span>', color: '#ecf0f1', accent: '#bdc3c7', width: 50, height: 22, basePay: 80, tier: 2, weight: 1.5, type: 'yacht' },
    { name: 'Cargo Barge', icon: '<span class="icon icon-cargo-barge"></span>', color: '#5d4037', accent: '#795548', width: 65, height: 32, basePay: 120, tier: 3, weight: 2, type: 'barge' },
    { name: 'Container Ship', icon: '<span class="icon icon-container"></span>', color: '#c0392b', accent: '#e74c3c', width: 80, height: 30, basePay: 180, tier: 4, weight: 2.5, type: 'container' },
    { name: 'Oil Tanker', icon: '<span class="icon icon-tanker"></span>', color: '#1a252f', accent: '#2c3e50', width: 95, height: 36, basePay: 280, tier: 5, weight: 3, type: 'tanker' },
    { name: 'Chemical Barge', icon: '<span class="icon icon-hazmat"></span>', color: '#8e44ad', accent: '#9b59b6', width: 70, height: 28, basePay: 350, tier: 3, weight: 2, type: 'hazmat', requiresLicense: 'hazmat' }
];

// ==========================================
// JOB SYSTEM
// Job generation, lifecycle, and completion
// ==========================================

// Job board system
let availableJobs = [];
const MAX_AVAILABLE_JOBS = 3;

function getAvailableCargo() {
    return cargoTypes.filter(c => {
        // Check boat tier
        let maxTier = tugboat.cargoTier;
        // Heavy license allows tier 4-5 regardless of boat
        if (typeof hasLicense === 'function' && hasLicense('heavy') && c.tier <= 5) maxTier = Math.max(maxTier, 5);
        if (c.tier > maxTier) return false;

        // Check if requires special license
        if (c.requiresLicense && typeof hasLicense === 'function' && !hasLicense(c.requiresLicense)) return false;

        return true;
    });
}

function pickJobType() {
    // Weighted probability system
    const weights = [
        { type: JOB_TYPES.STANDARD, weight: 30 },
        { type: JOB_TYPES.RUSH, weight: 15 },
        { type: JOB_TYPES.FRAGILE, weight: 13 },
        { type: JOB_TYPES.RESCUE, weight: 12 },
        { type: JOB_TYPES.SALVAGE, weight: 12 },
        { type: JOB_TYPES.TANDEM, weight: 10 },
        { type: JOB_TYPES.VIP, weight: 8 }
    ];

    // Filter by licenses
    const validJobs = weights.filter(item => {
        const job = item.type;
        return !job.requiresLicense || (typeof hasLicense === 'function' && hasLicense(job.requiresLicense));
    });

    // Calculate total weight
    const totalWeight = validJobs.reduce((sum, item) => sum + item.weight, 0);

    // Pick random
    let rand = Math.random() * totalWeight;
    for (const item of validJobs) {
        if (rand < item.weight) return item.type;
        rand -= item.weight;
    }

    return JOB_TYPES.STANDARD;
}

function generateJob() {
    const available = getAvailableCargo();
    const jobType = pickJobType();
    const tier = getCurrentTier();
    let cargoType;
    let tandemCount = null;

    if (jobType === JOB_TYPES.TANDEM) {
        // Tandem tow uses only tier 1-2 cargo (smaller barges)
        const smallCargo = available.filter(c => c.tier <= 2);
        cargoType = smallCargo.length > 0 ? smallCargo[Math.floor(Math.random() * smallCargo.length)] : available[0];
        tandemCount = jobType.minCargo + Math.floor(Math.random() * (jobType.maxCargo - jobType.minCargo + 1));
    } else {
        cargoType = available[Math.floor(Math.random() * available.length)];
    }

    // Get pickup and delivery based on spawn zone
    let pickupDock = null;
    let deliveryDock = null;
    let salvagePos = null;

    // For harbor/harbor_edge tiers, both pickup and delivery are in harbor area
    const isHarborTier = tier.spawnZone === 'harbor' || tier.spawnZone === 'harbor_edge';

    if (isHarborTier) {
        // Harbor-to-harbor jobs for early tiers
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

        // Pickup location depends on tier's spawn zone
        if (jobType === JOB_TYPES.SALVAGE) {
            salvagePos = getSpawnPosition(tier.spawnZone);
            pickupDock = null;
        } else {
            pickupDock = getPickupDock(tier.spawnZone);

            // Make sure pickup and delivery are different
            let attempts = 0;
            while (pickupDock === deliveryDock && attempts < 10) {
                pickupDock = getPickupDock(tier.spawnZone);
                attempts++;
            }
        }
    }

    // Calculate distance and pay
    const pickupX = salvagePos ? salvagePos.x : (pickupDock ? pickupDock.x : 0);
    const pickupY = salvagePos ? salvagePos.y : (pickupDock ? pickupDock.y : 0);
    const dist = Math.hypot(deliveryDock.x - pickupX, deliveryDock.y - pickupY);
    const distBonus = Math.floor(dist / 100) * 10;
    let basePay = cargoType.basePay + distBonus;

    // Tandem tow multiplies pay by cargo count
    if (jobType === JOB_TYPES.TANDEM && tandemCount) {
        basePay *= tandemCount;
    }

    // Apply tier pay multiplier and difficulty modifier
    const pay = Math.floor(basePay * jobType.payMult * tier.payMultiplier * currentDifficulty.payMult);

    // Calculate time limit for timed jobs
    let timeLimit = null;
    if (jobType.hasTimer) {
        if (jobType.fixedTime) {
            timeLimit = Math.floor(jobType.fixedTime * currentDifficulty.timerMult);
            if (jobType.sinking && typeof hasLicense === 'function' && hasLicense('rescue')) {
                timeLimit = Math.floor(timeLimit * 1.4);
            }
        } else {
            // More time for longer distances
            timeLimit = Math.max(45, Math.floor(dist * 0.025));
            if (jobType === JOB_TYPES.RUSH && typeof hasLicense === 'function' && hasLicense('express')) {
                timeLimit += 30;
            }
        }
    }

    return {
        cargoType,
        pickup: pickupDock,
        delivery: deliveryDock,
        pay,
        jobType,
        timeLimit,
        dist,
        salvagePos,
        tandemCount
    };
}

// Get a pickup dock based on spawn zone
function getPickupDock(spawnZone) {
    let candidates = [];

    switch (spawnZone) {
        case 'harbor':
            // Harbor docks only (Rookie tier)
            candidates = docks.filter(d => d.x < HARBOR.width);
            break;
        case 'harbor_edge':
            // Harbor + very close river docks (Deckhand)
            candidates = docks.filter(d => d.x < HARBOR.width + 800);
            break;
        case 'river_mid':
            // River docks in middle section (Skipper)
            candidates = docks.filter(d => d.x > HARBOR.width && d.x < OCEAN.x - 1000);
            break;
        case 'river_mouth':
            // River docks near ocean (Captain)
            candidates = docks.filter(d => d.x > HARBOR.width && d.x < OCEAN.x + 500);
            break;
        case 'ocean':
            // All ocean docks (Harbor Master)
            candidates = docks.filter(d => d.x >= OCEAN.x - 500);
            break;
        default:
            candidates = docks.filter(d => d.x < HARBOR.width);
    }

    // Fallback to harbor docks if no candidates
    if (candidates.length === 0) {
        candidates = docks.filter(d => d.x < HARBOR.width);
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
}

// Get a spawn position for salvage jobs
function getSpawnPosition(spawnZone) {
    let x, y;
    let attempts = 0;

    do {
        switch (spawnZone) {
            case 'harbor':
                // Inside harbor basin
                x = 300 + Math.random() * 600;
                y = 800 + Math.random() * 2400;
                break;
            case 'harbor_edge':
                // Harbor or just outside
                x = 400 + Math.random() * 1000;
                y = 600 + Math.random() * 2800;
                break;
            case 'river_mid':
                // Middle of a random river
                const rivers = Object.values(RIVERS);
                const river = rivers[Math.floor(Math.random() * rivers.length)];
                const pathIdx = Math.floor(river.path.length / 2);
                x = river.path[pathIdx].x + (Math.random() - 0.5) * 200;
                y = river.path[pathIdx].y + (Math.random() - 0.5) * (river.width * 0.5);
                break;
            case 'river_mouth':
                // Near where rivers meet ocean
                x = OCEAN.x - 600 + Math.random() * 500;
                y = 800 + Math.random() * (WORLD.height - 1600);
                break;
            case 'ocean':
                // Open ocean
                x = OCEAN.x + 200 + Math.random() * 1200;
                y = 400 + Math.random() * (WORLD.height - 800);
                break;
            default:
                // Default to harbor
                x = 400 + Math.random() * 500;
                y = 1000 + Math.random() * 2000;
        }
        attempts++;
    } while (typeof isInWater === 'function' && !isInWater(x, y) && attempts < 20);

    // Final fallback - put in harbor
    if (typeof isInWater === 'function' && !isInWater(x, y)) {
        x = 500;
        y = WORLD.height / 2;
    }

    return { x, y };
}

function spawnJobBoard() {
    availableJobs = [];
    for (let i = 0; i < MAX_AVAILABLE_JOBS; i++) {
        availableJobs.push(generateJob());
    }
    if (typeof updateJobBoardUI === 'function') updateJobBoardUI();
}

function selectJob(index) {
    if (typeof playSound === 'function') try { playSound('jobAccept'); } catch (e) { }
    if (typeof addCameraShake === 'function') try { addCameraShake(7, 0.15); } catch (e) { }
    if (index < 0 || index >= availableJobs.length) return;

    const jobData = availableJobs[index];
    const jt = jobData.jobType;

    // Determine cargo spawn position
    let cargoX, cargoY;
    if (jt === JOB_TYPES.SALVAGE && jobData.salvagePos) {
        // Salvage: cargo floating in open water
        cargoX = jobData.salvagePos.x;
        cargoY = jobData.salvagePos.y;
    } else {
        // Normal: cargo at pickup dock
        cargoX = jobData.pickup.x + jobData.pickup.width / 2 + 50;
        cargoY = jobData.pickup.y + jobData.pickup.height / 2;
    }

    // Create cargo(s) based on job type
    if (jt === JOB_TYPES.TANDEM && jobData.tandemCount) {
        // Tandem tow: multiple connected cargo
        cargos = [];
        for (let i = 0; i < jobData.tandemCount; i++) {
            cargos.push({
                ...jobData.cargoType,
                x: cargoX + i * 60,
                y: cargoY,
                angle: 0, vx: 0, vy: 0,
                tandemIndex: i,
                sinkTimer: null
            });
        }
    } else {
        // Single cargo
        const cargo = {
            ...jobData.cargoType,
            x: cargoX,
            y: cargoY,
            angle: 0, vx: 0, vy: 0,
            sinkTimer: jt.sinking ? jobData.timeLimit : null,
            driftAngle: jt === JOB_TYPES.SALVAGE ? Math.random() * Math.PI * 2 : null
        };
        cargos = [cargo];
    }

    currentJob = {
        cargo: cargos[0],
        allCargo: cargos, // For tandem tow
        pickup: jobData.pickup,
        delivery: jobData.delivery,
        pay: jobData.pay,
        jobType: jt,
        pickedUp: false,
        timeLimit: jobData.timeLimit,
        timeRemaining: jobData.timeLimit,
        collisionCount: 0,
        failed: false,
        salvagePos: jobData.salvagePos,
        tandemCount: jobData.tandemCount,
        vipSpeedWarnings: 0 // For VIP min speed tracking
    };

    availableJobs = [];
    document.getElementById('jobBoardPanel').classList.remove('show');
    // Close hard-modal lock for Job Board
    if (window.Game && Game.ui && Game.ui.unlockModal) Game.ui.unlockModal('jobBoard');
    else game.paused = false;
    if (typeof updateJobUI === 'function') updateJobUI();
}

function reopenJobBoard() {
    // Hard modal: Job Board (pause + block other panels)
    if (window.Game && Game.ui && Game.ui.lockModal) {
        if (!Game.ui.lockModal('jobBoard')) return;
    } else {
        game.paused = true;
    }

    // If we have jobs, just show them. If not, generate new ones.
    if (!availableJobs || availableJobs.length === 0) {
        spawnJobBoard();
    } else {
        if (typeof updateJobBoardUI === 'function') updateJobBoardUI();
    }

    document.getElementById('jobBoardPanel').classList.add('show');

    // Controller: focus first job option
    try {
        gpFocusIndex = 0;
        setTimeout(() => {
            const els = _gpGetFocusableEls ? _gpGetFocusableEls() : [];
            if (els && els.length && typeof _gpSetFocused === 'function') _gpSetFocused(els[0]);
        }, 0);
    } catch (_) { }
}
window.reopenJobBoard = reopenJobBoard;

function spawnNewJob() {
    // Hard modal: Job Board (pause + block other panels)
    if (window.Game && Game.ui && Game.ui.lockModal) {
        if (!Game.ui.lockModal('jobBoard')) return;
    } else {
        game.paused = true;
    }
    // Show job board with choices
    spawnJobBoard();
    document.getElementById('jobBoardPanel').classList.add('show');
    // Controller: focus first job option
    try {
        gpFocusIndex = 0;
        setTimeout(() => {
            const els = _gpGetFocusableEls ? _gpGetFocusableEls() : [];
            if (els && els.length && typeof _gpSetFocused === 'function') _gpSetFocused(els[0]);
        }, 0);
    } catch (_) { }
}

function closeJobBoard() {
    document.getElementById('jobBoardPanel').classList.remove('show');
    if (window.Game && Game.ui && Game.ui.unlockModal) Game.ui.unlockModal('jobBoard');
    else game.paused = false;
}

function failJob(reason) {
    if (!currentJob || currentJob.failed) return;
    currentJob.failed = true;

    if (typeof playSound === 'function') playSound('fail');

    // Camera shake on failure - jarring!
    if (typeof addCameraShake === 'function') addCameraShake(6, 0.2);

    const msg = document.getElementById('message');
    const msgTitle = document.getElementById('messageTitle');
    const msgText = document.getElementById('messageText');

    msg.className = 'message fail';
    msgTitle.textContent = 'Job Failed!';
    msgText.textContent = reason;
    msg.classList.add('show');

    tugboat.attached = null;

    setTimeout(() => { msg.classList.remove('show'); setTimeout(spawnNewJob, 400); }, 1500);
}

function completeJob() {
    let pay = currentJob.pay;
    let bonusText = '';

    // Rush delivery time bonus
    if (currentJob.jobType === JOB_TYPES.RUSH && currentJob.timeRemaining > 0) {
        const timeBonus = Math.floor(currentJob.timeRemaining * 2);
        pay += timeBonus;
        bonusText = ` (+$${timeBonus} speed!)`;
        licenses.rushJobs++;
    }

    // Track fragile and rescue jobs for licenses
    if (currentJob.jobType === JOB_TYPES.FRAGILE) {
        licenses.fragileJobs++;
    }
    if (currentJob.jobType === JOB_TYPES.RESCUE) {
        licenses.rescueJobs++;
    }
    if (currentJob.jobType === JOB_TYPES.SALVAGE) {
        licenses.salvageJobs++;
    }

    // Salvage time bonus - faster recovery = more pay
    if (currentJob.jobType === JOB_TYPES.SALVAGE && currentJob.timeRemaining > 0) {
        const salvageBonus = Math.floor(currentJob.timeRemaining * 1.5);
        pay += salvageBonus;
        bonusText += ` (+$${salvageBonus} quick salvage!)`;
    }

    // VIP perfect delivery bonus
    if (currentJob.jobType === JOB_TYPES.VIP && currentJob.timeRemaining > 0) {
        const vipBonus = Math.floor(currentJob.timeRemaining * 3);
        pay += vipBonus;
        bonusText += ` (+$${vipBonus} VIP satisfied!)`;
    }

    // Tandem tow completion bonus
    if (currentJob.jobType === JOB_TYPES.TANDEM) {
        const tandemBonus = Math.floor(pay * 0.15);
        pay += tandemBonus;
        bonusText += ` (+$${tandemBonus} all delivered!)`;
    }

    // Harbor Legend license bonus - +15% on all jobs
    if (typeof hasLicense === 'function' && hasLicense('harborLegend')) {
        const legendBonus = Math.floor(pay * 0.15);
        pay += legendBonus;
        bonusText += ` (+$${legendBonus} Legend)`;
    }

    // Ocean Class license bonus - +20% on ocean pickups
    if (typeof hasLicense === 'function' && hasLicense('oceanClass') && currentJob.pickup && currentJob.pickup.x >= OCEAN.x - 500) {
        const oceanBonus = Math.floor(pay * 0.2);
        pay += oceanBonus;
        bonusText += ` (+$${oceanBonus} Ocean)`;
    }

    // Weather bonus - enhanced with storm license
    if (weatherSystem.current.payBonus > 1) {
        let weatherSystemMult = weatherSystem.current.payBonus - 1;
        // Storm operations license doubles storm bonus
        if (typeof hasLicense === 'function' && hasLicense('storm') && weatherSystem.current === WEATHER_TYPES.STORM) {
            weatherSystemMult *= 2;
        }
        const weatherSystemBonus = Math.floor(pay * weatherSystemMult);
        pay += weatherSystemBonus;
        bonusText += ` (+$${weatherSystemBonus} Weather)`;
    }

    // Chain bonus - deliver within 45 seconds of last delivery
    const timeSinceLast = (game.time - lastDeliveryTime) / 60;
    if (lastDeliveryTime > 0 && timeSinceLast < 45) {
        chainCount++;
        if (chainCount >= 2) {
            const chainBonus = Math.floor(pay * 0.1 * Math.min(chainCount, 5));
            pay += chainBonus;
            bonusText += ` (+$${chainBonus} x${chainCount} chain!)`;
        }
    } else {
        chainCount = 1;
    }
    lastDeliveryTime = game.time;

    game.money += pay; game.jobsDone++;

    // Track career stats
    career.totalDeliveries++;
    career.totalEarnings += pay;
    career.regionDeliveries[career.currentRegion]++;

    // Check for region unlocks
    if (typeof checkRegionUnlocks === 'function') checkRegionUnlocks();

    if (typeof playSound === 'function') {
        playSound('success');
        setTimeout(() => playSound('money'), 300);
    }

    // Camera shake on delivery - celebratory!
    if (typeof addCameraShake === 'function') addCameraShake(3, 0.12);

    // Ripple effect
    if (typeof addRipple === 'function') {
        for (let i = 0; i < 4; i++) addRipple(tugboat.attached.x + (Math.random() - 0.5) * 30, tugboat.attached.y + (Math.random() - 0.5) * 30, 18);
    }

    const msg = document.getElementById('message');
    const msgTitle = document.getElementById('messageTitle');
    const msgText = document.getElementById('messageText');

    msg.className = 'message success';
    msgTitle.textContent = chainCount >= 2 ? `🔥 ${chainCount}x Chain!` : 'Delivery Complete!';
    msgText.textContent = `+$${pay}${bonusText}`;
    msg.classList.add('show');

    tugboat.attached = null;
    const timerBar = document.getElementById('timerBar');
    if (timerBar) timerBar.style.display = 'none';
    const timerLabel = document.querySelector('.timer-label');
    if (timerLabel) timerLabel.classList.remove('warning');

    if (typeof updateUI === 'function') updateUI();
    if (typeof updateLeaderboard === 'function') updateLeaderboard();
    if (typeof checkMilestones === 'function') checkMilestones();

    setTimeout(() => { msg.classList.remove('show'); setTimeout(spawnNewJob, 400); }, 1200);
}

// Victory / Game Over logic
function checkVictory() {
    if (gameWon || gameLost) return;

    // No victory in endless mode
    if (currentDifficulty.noVictory) return;

    // Victory conditions: Own all boats + reach max tier + all licenses + $100,000
    const allBoatsOwned = tugboat.ownedBoats.every(owned => owned);
    const maxTierReached = playerTier >= JOB_TIERS.length - 1; // Harbor Master
    const allLicensesOwned = Object.keys(LICENSES).every(id => hasLicense(id));
    const hasEnoughMoney = game.money >= 100000;

    if (allBoatsOwned && maxTierReached && allLicensesOwned && hasEnoughMoney) {
        triggerVictory();
    }
}

function checkBankruptcy() {
    if (gameWon || gameLost) return;

    // Stranded: No fuel and not at a fuel dock = game over
    // (Even with money, you can't get fuel if you can't reach a dock)
    const noFuel = tugboat.fuel <= 1;
    const notTowing = !tugboat.attached;

    if (noFuel && notTowing) {
        // Check if at a fuel dock
        let atFuelDock = false;
        for (const dock of docks) {
            if (!dock.hasFuel) continue;
            const dx = tugboat.x - (dock.x + dock.width / 2);
            const dy = tugboat.y - (dock.y + dock.height / 2);
            if (Math.hypot(dx, dy) < 100) {
                atFuelDock = true;
                break;
            }
        }

        // If at fuel dock but can't afford fuel - also game over
        if (atFuelDock && game.money < 5) {
            triggerGameOver();
        }
        // If not at fuel dock - stranded, game over
        else if (!atFuelDock) {
            triggerGameOver();
        }
    }
}

function triggerVictory() {
    gameWon = true;
    game.paused = true;

    // Calculate play time
    const playMinutes = Math.floor(game.time / 60 / 60);
    const playSeconds = Math.floor((game.time / 60) % 60);

    // Build stats
    const statsHtml = `
        <div><span><span class="icon icon-money"></span> Total Earnings</span><span>$${career.totalEarnings.toLocaleString()}</span></div>
        <div><span><span class="icon icon-box"></span> Deliveries</span><span>${career.totalDeliveries}</span></div>
        <div><span><span class="icon icon-boat"></span> Boats Owned</span><span>${tugboat.ownedBoats.filter(b => b).length}/7</span></div>
        <div><span><span class="icon icon-trophy"></span> Regions Unlocked</span><span>${career.unlockedRegions.filter(r => r).length}/5</span></div>
        <div><span><span class="icon icon-star"></span> Licenses</span><span>${licenses.owned.length}/${Object.keys(LICENSES).length}</span></div>
        <div><span><span class="icon icon-rush"></span> Play Time</span><span>${playMinutes}m ${playSeconds}s</span></div>
      `;
    document.getElementById('victoryStats').innerHTML = statsHtml;
    document.getElementById('victoryModal').classList.add('show');

    if (typeof playSound === 'function') {
        playSound('success');
        setTimeout(() => playSound('money'), 200);
        setTimeout(() => playSound('success'), 400);
    }
}

function triggerGameOver() {
    gameLost = true;
    game.paused = true;

    // Calculate play time
    const playMinutes = Math.floor(game.time / 60 / 60);
    const playSeconds = Math.floor((game.time / 60) % 60);

    // Determine cause
    let cause = 'Stranded at sea!';
    if (game.money < 5) {
        cause = 'Out of fuel & money';
    }

    // Build stats
    const statsHtml = `
        <div><span><span class="icon icon-money"></span> Peak Earnings</span><span>$${career.totalEarnings.toLocaleString()}</span></div>
        <div><span><span class="icon icon-box"></span> Deliveries</span><span>${career.totalDeliveries}</span></div>
        <div><span><span class="icon icon-boat"></span> Boats Owned</span><span>${tugboat.ownedBoats.filter(b => b).length}/7</span></div>
        <div><span><span class="icon icon-trophy"></span> Regions Unlocked</span><span>${career.unlockedRegions.filter(r => r).length}/5</span></div>
        <div><span><span class="icon icon-rush"></span> Play Time</span><span>${playMinutes}m ${playSeconds}s</span></div>
        <div><span><span class="icon icon-repair"></span> Cause</span><span>${cause}</span></div>
      `;
    document.getElementById('gameOverStats').innerHTML = statsHtml;
    document.getElementById('gameOverModal').classList.add('show');

    if (typeof playSound === 'function') playSound('fail');
}

function continueAfterVictory() {
    document.getElementById('victoryModal').classList.remove('show');
    game.paused = false;
    // Keep playing with gameWon = true (won't trigger again)
}

function returnToMenuFromEnd() {
    document.getElementById('victoryModal').classList.remove('show');
    document.getElementById('gameOverModal').classList.remove('show');
    gameWon = false;
    gameLost = false;
    if (typeof quitToMenu === 'function') quitToMenu();
}

function tryAgain() {
    document.getElementById('gameOverModal').classList.remove('show');
    gameWon = false;
    gameLost = false;

    // Reset everything and restart with same difficulty
    game.money = 100; game.jobsDone = 0; game.time = 0; game.paused = false;
    career.currentRegion = 0;
    career.unlockedRegions = [true, false, false, false, false];
    career.totalDeliveries = 0;
    career.totalEarnings = 0;
    career.regionDeliveries = [0, 0, 0, 0, 0];
    licenses.owned = [];
    licenses.rushJobs = 0; licenses.fragileJobs = 0; licenses.rescueJobs = 0; licenses.salvageJobs = 0;
    tugboat.x = 500; tugboat.y = 2000; tugboat.angle = 0;
    tugboat.vx = 0; tugboat.vy = 0; tugboat.angularVel = 0;
    tugboat.fuel = 100; tugboat.health = 100;
    tugboat.currentBoat = 0;
    tugboat.ownedBoats = [true, false, false, false, false, false, false];
    tugboat.attached = null;
    playerTier = 0;

    // Clear transient state
    currentJob = null;
    availableJobs = [];
    cargos = [];
    activeCompetitors = [];
    competitorJobs = [];
    waterParticles = [];
    ripples = [];

    // Spawn AI and jobs
    const region = getCurrentRegion();
    for (let i = 0; i < region.aiCount; i++) {
        if (typeof createCompetitor === 'function') activeCompetitors.push(createCompetitor(i));
    }
    spawnNewJob();
    if (typeof updateUI === 'function') updateUI();
    if (typeof updateRegionUI === 'function') updateRegionUI();
}

function updateJobRules(delta) {
    // Update job timers and special job mechanics
    if (currentJob && !currentJob.failed) {
        const jt = currentJob.jobType;

        // Salvage cargo drifts with currents when not attached
        if (jt === JOB_TYPES.SALVAGE && !currentJob.pickedUp) {
            // Salvage Expert license reduces drift by 50%
            const driftMult = (typeof hasLicense === 'function' && hasLicense('salvageExpert')) ? 0.5 : 1.0;
            for (const cargo of cargos) {
                if (cargo.driftAngle !== null) {
                    // Drift with wind and currents
                    const driftSpeed = (0.3 + weatherSystem.current.windStrength * 0.2) * driftMult * delta;
                    cargo.x += Math.cos(weatherSystem.windAngle) * driftSpeed;
                    cargo.y += Math.sin(weatherSystem.windAngle) * driftSpeed;
                    // Also drift with currents
                    if (typeof weatherSystem.currents !== 'undefined') {
                        for (const current of weatherSystem.currents) {
                            const dx = cargo.x - current.x;
                            const dy = cargo.y - current.y;
                            const dist = Math.hypot(dx, dy);
                            if (dist < current.radius) {
                                const strength = (1 - dist / current.radius) * current.strength * 0.5 * driftMult * delta;
                                cargo.x += Math.cos(current.angle) * strength;
                                cargo.y += Math.sin(current.angle) * strength;
                            }
                        }
                    }
                    // Bob slightly
                    cargo.angle = Math.sin(game.time * 0.03 + cargo.x * 0.01) * 0.15;
                    // Keep in bounds
                    cargo.x = Math.max(100, Math.min(WORLD.width - 100, cargo.x));
                    cargo.y = Math.max(100, Math.min(WORLD.height - 100, cargo.y));
                }
            }
        }

        // VIP minimum speed check - fail if stopped too long while carrying
        if (jt === JOB_TYPES.VIP && currentJob.pickedUp) {
            const speed = Math.hypot(tugboat.vx, tugboat.vy);
            if (speed < 0.5) {
                currentJob.vipStoppedFrames = (currentJob.vipStoppedFrames || 0) + delta;
                // Warning at 2 seconds (120 frames), fail at 4 seconds (240 frames)
                if (currentJob.vipStoppedFrames >= 120 && currentJob.vipStoppedFrames < 120 + delta * 2) {
                    if (typeof showEvent === 'function') showEvent('rival', '🚨 VIP Warning!', 'Keep moving! VIP is getting impatient!');
                }
                if (currentJob.vipStoppedFrames >= 240) {
                    if (typeof failJob === 'function') failJob('VIP got impatient - you stopped too long!');
                    return;
                }
            } else {
                currentJob.vipStoppedFrames = 0;
            }
        }

        // Timer countdown for timed jobs
        if (currentJob.timeLimit) {
            // Rescue and Salvage timers count down even before pickup
            const countBeforePickup = jt === JOB_TYPES.RESCUE || jt === JOB_TYPES.SALVAGE;
            if (countBeforePickup || currentJob.pickedUp) {
                currentJob.timeRemaining -= delta / 60; // delta/60 since delta=1 means 1/60th second
                if (currentJob.cargo.sinkTimer !== null) {
                    currentJob.cargo.sinkTimer = currentJob.timeRemaining;
                }
                if (typeof updateTimerUI === 'function') updateTimerUI();
                if (currentJob.timeRemaining <= 0) {
                    if (jt === JOB_TYPES.RESCUE) {
                        if (typeof failJob === 'function') failJob('The boat sank!');
                    } else if (jt === JOB_TYPES.SALVAGE) {
                        if (typeof failJob === 'function') failJob('Cargo drifted away!');
                    } else {
                        if (typeof failJob === 'function') failJob('Time ran out!');
                    }
                    return;
                }
            }
        }
    }
}

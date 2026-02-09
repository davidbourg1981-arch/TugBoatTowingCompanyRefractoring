// ==========================================
// UI SYSTEM
// HUD, Panels, Leaderboards, DevTools
// ==========================================

// HUD Update
// showDifficultySelect and closeDifficultySelect are defined in game-ctrl.js

function updateUI() {
    document.getElementById('money').textContent = game.money;
    document.getElementById('jobsDone').textContent = game.jobsDone;
    document.getElementById('boatName').textContent = BOATS[tugboat.currentBoat].name.split(' ')[0];

    const fuelPercent = Math.round((tugboat.fuel / tugboat.maxFuel) * 100);
    const fuelEl = document.getElementById('fuelPercent');
    fuelEl.textContent = fuelPercent;
    fuelEl.className = 'stat-value' + (fuelPercent <= 20 ? ' warning' : fuelPercent >= 80 ? ' good' : '');

    const healthPercent = Math.round((tugboat.health / tugboat.maxHealth) * 100);
    const healthEl = document.getElementById('healthPercent');
    healthEl.textContent = healthPercent;
    healthEl.className = 'stat-value' + (healthPercent <= 30 ? ' warning' : healthPercent >= 80 ? ' good' : '');
}

function updateTimerUI() {
    if (!currentJob || !currentJob.timeLimit) return;
    const timerLabel = document.getElementById('timerLabel');
    const timerFill = document.getElementById('timerFill');
    const timerValue = document.getElementById('timerValue');
    const pct = (currentJob.timeRemaining / currentJob.timeLimit) * 100;

    timerValue.textContent = Math.ceil(currentJob.timeRemaining);
    timerFill.style.width = pct + '%';

    // Color based on time remaining
    if (pct > 50) {
        timerFill.style.background = '#2ecc71';
    } else if (pct > 25) {
        timerFill.style.background = '#f39c12';
    } else {
        timerFill.style.background = '#e74c3c';
        timerLabel.classList.add('warning');
    }
}

function updateJobUI() {
    const panel = document.getElementById('questPanel');
    const titleEl = document.getElementById('questTitle');
    const descEl = document.getElementById('questDesc');
    const timerBar = document.getElementById('timerBar');
    const job = currentJob;
    const jt = job.jobType;

    panel.className = 'panel quest-panel ' + jt.class;
    titleEl.innerHTML = `${jt.icon} ${jt.name}`;

    // Pickup location text
    const pickupText = jt === JOB_TYPES.SALVAGE
        ? '🌊 Open Water'
        : `<span class="icon icon-pickup"></span> ${job.pickup.name}`;

    let desc = `<strong>${job.cargo.name}</strong><br>${pickupText}<br><span class="icon icon-dock"></span> ${job.delivery.name}<br><span class="icon icon-money"></span> <span style="color:${jt.color}">$${job.pay}</span>`;

    if (jt === JOB_TYPES.FRAGILE) {
        desc += `<br><span style="color:#9b59b6"><span class="icon icon-fragile"></span> No collisions allowed!</span>`;
    }
    if (jt === JOB_TYPES.RESCUE) {
        desc += `<br><span style="color:#3498db"><span class="icon icon-rescue"></span> Boat is sinking!</span>`;
    }
    if (jt === JOB_TYPES.SALVAGE) {
        desc += `<br><span style="color:#1abc9c"><span class="icon icon-search"></span> Find floating cargo!</span>`;
    }
    if (jt === JOB_TYPES.VIP) {
        desc += `<br><span style="color:#f39c12"><span class="icon icon-vip"></span> Keep moving! No collisions!</span>`;
    }
    if (jt === JOB_TYPES.TANDEM && currentJob.tandemCount) {
        desc += `<br><span style="color:#e67e22"><span class="icon icon-tandem"></span> Towing ${currentJob.tandemCount} barges</span>`;
    }

    descEl.innerHTML = desc;

    // Timer bar
    if (job.timeLimit) {
        timerBar.style.display = 'block';
        updateTimerUI();
    } else {
        timerBar.style.display = 'none';
    }
}


// Job Board UI - populates job choices
function updateJobBoardUI() {
    const list = document.getElementById('jobBoardList');
    if (!list) return;
    list.innerHTML = '';

    if (!availableJobs || availableJobs.length === 0) {
        list.innerHTML = '<div class="job-option" style="text-align: center; opacity: 0.7;">No jobs available</div>';
        return;
    }

    availableJobs.forEach((job, index) => {
        const jt = job.jobType;
        const div = document.createElement('div');
        div.className = 'job-option ' + jt.class;
        div.setAttribute('tabindex', '0');
        div.setAttribute('data-gp-focusable', 'true');

        // Pickup location text
        const pickupText = jt === JOB_TYPES.SALVAGE
            ? '<span class="icon icon-search"></span> Open Water'
            : `<span class="icon icon-pickup"></span> ${job.pickup ? job.pickup.name : 'Unknown'}`;

        // Build special requirement text
        let specialText = '';
        if (jt === JOB_TYPES.FRAGILE) specialText = '<span class="job-special fragile"><span class="icon icon-fragile"></span> No collisions!</span>';
        if (jt === JOB_TYPES.RESCUE) specialText = '<span class="job-special rescue"><span class="icon icon-rescue"></span> Sinking!</span>';
        if (jt === JOB_TYPES.SALVAGE) specialText = '<span class="job-special salvage"><span class="icon icon-search"></span> Find cargo</span>';
        if (jt === JOB_TYPES.VIP) specialText = '<span class="job-special vip"><span class="icon icon-vip"></span> Keep moving!</span>';
        if (jt === JOB_TYPES.TANDEM && job.tandemCount) specialText = `<span class="job-special tandem"><span class="icon icon-tandem"></span> ${job.tandemCount} barges</span>`;

        // Timer text
        let timerText = '';
        if (job.timeLimit) {
            timerText = `<span class="job-timer"><span class="icon icon-rush"></span> ${Math.ceil(job.timeLimit)}s</span>`;
        }

        div.innerHTML = `
            <div class="job-header">
                <span class="job-type" style="color: ${jt.color}">${jt.icon} ${jt.name}</span>
                <span class="job-pay"><span class="icon icon-money"></span> $${job.pay}</span>
            </div>
            <div class="job-cargo"><span class="icon icon-box"></span> ${job.cargoType.name}</div>
            <div class="job-route">
                ${pickupText}<br>
                <span class="icon icon-dock"></span> ${job.delivery ? job.delivery.name : 'Harbor'}
            </div>
            <div class="job-extras">${specialText}${timerText}</div>
        `;

        div.onclick = () => selectJob(index);
        list.appendChild(div);
    });
}

// Interaction Helpers (Fuel/Repair)
function getNearbyFuelDock() {
    for (const dock of docks) {
        if (dock.hasFuel) {
            const dist = Math.hypot(tugboat.x - (dock.x + dock.width / 2), tugboat.y - (dock.y + dock.height / 2 + 30));
            if (dist < 100) return dock;
        }
    }
    return null;
}

function getNearbyRepairDock() {
    for (const dock of docks) {
        if (dock.hasRepair) {
            const dist = Math.hypot(tugboat.x - (dock.x + dock.width / 2), tugboat.y - (dock.y + dock.height / 2 + 30));
            if (dist < 100) return dock;
        }
    }
    return null;
}

function getRefuelCost() {
    const needed = tugboat.maxFuel - tugboat.fuel;
    return Math.ceil(needed * 0.3);
}

function getRepairCost() {
    const needed = tugboat.maxHealth - tugboat.health;
    return Math.ceil(needed * 0.8);
}

function updateRefuelButton() {
    const dock = getNearbyFuelDock();
    const btn = document.getElementById('refuelBtn');
    const costSpan = document.getElementById('refuelCost');
    if (dock && tugboat.fuel < tugboat.maxFuel) {
        const cost = getRefuelCost();
        costSpan.textContent = cost;
        btn.classList.add('show');
        btn.disabled = game.money < cost;
        btn.style.opacity = game.money < cost ? '0.5' : '1';
    } else {
        btn.classList.remove('show');
    }
}

function updateRepairButton() {
    const dock = getNearbyRepairDock();
    const btn = document.getElementById('repairBtn');
    const costSpan = document.getElementById('repairCost');
    if (dock && tugboat.health < tugboat.maxHealth) {
        const cost = getRepairCost();
        costSpan.textContent = cost;
        btn.classList.add('show');
        btn.disabled = game.money < cost;
        btn.style.opacity = game.money < cost ? '0.5' : '1';
    } else {
        btn.classList.remove('show');
    }
}

function tryRefuel() { refuel(); }
function tryRepair() { repair(); }

function refuel() {
    const dock = getNearbyFuelDock();
    if (dock && tugboat.fuel < tugboat.maxFuel) {
        const cost = getRefuelCost();
        if (game.money >= cost) {
            game.money -= cost;
            tugboat.fuel = tugboat.maxFuel;
            if (typeof addRipple === 'function') addRipple(tugboat.x, tugboat.y, 30);
            if (typeof playSound === 'function') playSound('refuel');
            updateUI();
            updateRefuelButton();
        }
    }
}

function repair() {
    const dock = getNearbyRepairDock();
    if (dock && tugboat.health < tugboat.maxHealth) {
        const cost = getRepairCost();
        if (game.money >= cost) {
            game.money -= cost;
            tugboat.health = tugboat.maxHealth;
            if (typeof addRipple === 'function') addRipple(tugboat.x, tugboat.y, 30);
            if (typeof playSound === 'function') playSound('success');
            updateUI();
            updateRepairButton();
        }
    }
}


// Boat Shop
function openBoatShop() {
    if (!window.Game || !Game.ui || !Game.ui.lockModal) { game.paused = true; }
    if (window.Game && Game.ui && Game.ui.lockModal && !Game.ui.lockModal('boatShop')) return;
    document.getElementById('boatShopPanel').classList.add('show');
    updateBoatShopUI();
}

function closeBoatShop() {
    document.getElementById('boatShopPanel').classList.remove('show');
    if (window.Game && Game.ui && Game.ui.unlockModal) Game.ui.unlockModal('boatShop');
    else game.paused = false;
}

function updateBoatShopUI() {
    const list = document.getElementById('boatList');
    list.innerHTML = '';

    BOATS.forEach((boat, i) => {
        const owned = tugboat.ownedBoats[i];
        const selected = tugboat.currentBoat === i;
        const canAfford = game.money >= boat.price;

        const div = document.createElement('div');
        div.className = 'boat-item' + (owned ? ' owned' : '') + (selected ? ' selected' : '');

        // Calculate relative stats (compared to max boat)
        const maxBoat = BOATS[BOATS.length - 1];
        const speedPct = Math.round((boat.speed / maxBoat.speed) * 100);
        const towPct = Math.round((boat.towStrength / maxBoat.towStrength) * 100);
        const fuelPct = Math.round((boat.maxFuel / maxBoat.maxFuel) * 100);
        const healthPct = Math.round((boat.maxHealth / maxBoat.maxHealth) * 100);

        div.innerHTML = `
          <div class="boat-icon">${boat.icon}</div>
          <div class="boat-info">
            <h3>${boat.name}</h3>
            <div class="boat-stats-row"><span>Speed</span><div class="stat-bar"><div class="fill" style="width:${speedPct}%"></div></div></div>
            <div class="boat-stats-row"><span>Power</span><div class="stat-bar"><div class="fill" style="width:${towPct}%"></div></div></div>
            <div class="boat-stats-row"><span>Fuel</span><div class="stat-bar"><div class="fill" style="width:${fuelPct}%"></div></div></div>
            <div class="boat-stats-row"><span>Armor</span><div class="stat-bar"><div class="fill" style="width:${healthPct}%"></div></div></div>
          </div>
          <div class="boat-action">
            ${selected ? '<button disabled>Selected</button>' :
                owned ? `<button onclick="selectBoat(${i})">Select</button>` :
                    `<button class="buy-btn" onclick="buyBoat(${i})" ${canAfford ? '' : 'disabled'}>$${boat.price}</button>`}
          </div>
        `;
        list.appendChild(div);
    });
}

function buyBoat(index) {
    console.log('buyBoat called with index:', index);
    const boat = BOATS[index];
    if (game.money >= boat.price) {
        game.money -= boat.price;
        tugboat.ownedBoats[index] = true;
        if (typeof playSound === 'function') playSound('cash');
        selectBoat(index);
        updateBoatShopUI();
        updateUI();
    } else {
        if (typeof playSound === 'function') playSound('error');
    }
}

function selectBoat(index) {
    console.log('selectBoat called with index:', index, 'owned:', tugboat.ownedBoats[index]);
    if (!tugboat.ownedBoats[index]) return;
    tugboat.currentBoat = index;
    const boat = BOATS[index];

    // Apply stats
    tugboat.maxSpeed = boat.speed;
    tugboat.power = boat.acceleration;
    tugboat.turnSpeed = boat.turnSpeed;
    tugboat.maxFuel = boat.maxFuel;
    tugboat.maxHealth = boat.maxHealth;
    tugboat.armorRating = boat.armorRating || 1.0;
    tugboat.towStrength = boat.towStrength || 100;
    tugboat.cargoTier = boat.cargoTier || 1;
    tugboat.drag = boat.drag || 0.96;
    tugboat.angularDrag = boat.angularDrag || 0.92;
    tugboat.fuelEfficiency = boat.fuelEfficiency || 1.0;

    // Heal and refuel on switch
    tugboat.health = tugboat.maxHealth;
    tugboat.fuel = tugboat.maxFuel;

    if (typeof playSound === 'function') playSound('uiSelect');
    updateBoatShopUI();
    updateUI();
}


// Career & Licenses
function openCareer() {
    if (!window.Game || !Game.ui || !Game.ui.lockModal) { game.paused = true; }
    if (window.Game && Game.ui && Game.ui.lockModal && !Game.ui.lockModal('career')) return;
    document.getElementById('careerPanel').classList.add('show');
    updateCareerUI();
}
function closeCareer() {
    document.getElementById('careerPanel').classList.remove('show');
    if (window.Game && Game.ui && Game.ui.unlockModal) Game.ui.unlockModal('career');
    else game.paused = false;
}

function updateCareerUI() {
    // Update stats
    document.getElementById('careerDeliveries').textContent = career.totalDeliveries;
    document.getElementById('careerEarnings').textContent = '$' + career.totalEarnings;
    document.getElementById('careerRegions').textContent = `${getCurrentTier().name}`;

    // Build tier list
    const list = document.getElementById('regionList');
    list.innerHTML = '';

    JOB_TIERS.forEach((tier, i) => {
        const unlocked = i <= playerTier;
        const current = i === playerTier;
        const isNext = i === playerTier + 1;
        const canUnlock = isNext && canUnlockTier(i);
        const meetsJobs = game.jobsDone >= tier.jobsRequired;
        const canAfford = game.money >= tier.unlockCost;

        const div = document.createElement('div');
        div.className = 'region-item' +
            (unlocked ? ' unlocked' : ' locked') +
            (current ? ' current' : '');

        let buttonHtml = '';
        let reqHtml = '';

        if (current) {
            buttonHtml = '<button class="region-unlock-btn" disabled style="background: #27ae60; color: #fff;">Current Tier</button>';
        } else if (unlocked) {
            buttonHtml = '<button class="region-unlock-btn" disabled style="background: #3498db; color: #fff;"><span class="icon icon-check"></span> Unlocked</button>';
        } else if (canUnlock) {
            buttonHtml = `<button class="region-unlock-btn can-unlock" onclick="unlockTier(${i})">Unlock $${tier.unlockCost}</button>`;
        } else if (isNext) {
            buttonHtml = `<button class="region-unlock-btn cannot-unlock" disabled>$${tier.unlockCost}</button>`;
            let reqs = [];
            if (!meetsJobs) reqs.push(`Need ${tier.jobsRequired} jobs (${game.jobsDone}/${tier.jobsRequired})`);
            if (!canAfford && meetsJobs) reqs.push(`Need $${tier.unlockCost}`);
            reqHtml = `<div class="region-unlock-req">${reqs.join(' &bull; ')}</div>`;
        } else {
            buttonHtml = '<button class="region-unlock-btn cannot-unlock" disabled><span class="icon icon-lock"></span> Locked</button>';
            reqHtml = `<div class="region-unlock-req">Unlock previous tier first</div>`;
        }

        // Spawn zone display names
        const zoneNames = {
            'harbor': 'Harbor Only',
            'harbor_edge': 'Near Harbor',
            'river_mid': 'River Routes',
            'river_mouth': 'River + Coast',
            'ocean': 'Full Ocean'
        };

        div.innerHTML = `
          <div class="region-icon">${tier.icon}</div>
          <div class="region-info">
            <h3>${tier.name} ${current ? '<span class="icon icon-check"></span>' : ''}</h3>
            <div class="region-desc">${tier.description}</div>
            <div class="region-stats">
              <span><span class="icon icon-money"></span> ${Math.round(tier.payMultiplier * 100)}% pay</span>
              <span><span class="icon icon-anchor"></span> ${zoneNames[tier.spawnZone] || tier.spawnZone}</span>
              <span><span class="icon icon-casual"></span> ${tier.aiCount} rivals</span>
            </div>
            ${reqHtml}
          </div>
          ${buttonHtml}
        `;

        list.appendChild(div);
    });
}
function updateRegionUI() {
    const tier = getCurrentTier();
    document.getElementById('currentRegion').innerHTML = `${tier.icon} ${tier.name}`;
}

// License Helpers (global scope)
function hasLicense(id) {
    if (typeof licenses === 'undefined') return false;
    return licenses.owned && licenses.owned.includes(id);
}

function canBuyLicense(id) {
    if (typeof LICENSES === 'undefined') return false;
    const lic = LICENSES[id];
    if (!lic) return false;
    if (hasLicense(id)) return false;
    if (game.money < lic.cost) return false;

    const progress = getRequirementProgress(id);
    return progress.met;
}

function getRequirementProgress(id) {
    if (typeof LICENSES === 'undefined') return { met: false, current: 0, required: 0 };
    const lic = LICENSES[id];
    if (!lic) return { met: false, current: 0, required: 0 };

    const req = lic.requirement;
    let current = 0;
    let required = req.value;

    switch (req.type) {
        case 'deliveries': current = career.totalDeliveries; break;
        case 'rushJobs': current = licenses.rushJobs || 0; break;
        case 'fragileJobs': current = licenses.fragileJobs || 0; break;
        case 'rescueJobs': current = licenses.rescueJobs || 0; break;
        case 'salvageJobs': current = licenses.salvageJobs || 0; break;
        case 'earnings': current = career.totalEarnings; break;
    }

    return { met: current >= required, current, required };
}

function buyLicense(id) {
    if (!canBuyLicense(id)) return;
    const lic = LICENSES[id];
    game.money -= lic.cost;
    if (!licenses.owned) licenses.owned = [];
    licenses.owned.push(id);
    if (typeof playSound === 'function') playSound('success');
    if (typeof updateLicenseUI === 'function') updateLicenseUI();
    if (typeof updateUI === 'function') updateUI();
}

function openLicenses() {
    if (!window.Game || !Game.ui || !Game.ui.lockModal) { game.paused = true; }
    if (window.Game && Game.ui && Game.ui.lockModal && !Game.ui.lockModal('licenses')) return;
    document.getElementById('licensePanel').classList.add('show');
    updateLicenseUI();
}
function closeLicenses() {
    document.getElementById('licensePanel').classList.remove('show');
    if (window.Game && Game.ui && Game.ui.unlockModal) Game.ui.unlockModal('licenses');
    else game.paused = false;
}

function updateLicenseUI() {
    const container = document.getElementById('licenseList');
    let html = '';

    Object.values(LICENSES).forEach(lic => {
        const owned = typeof hasLicense === 'function' ? hasLicense(lic.id) : false;
        const progress = typeof getRequirementProgress === 'function' ? getRequirementProgress(lic.id) : { met: false };
        const canBuy = typeof canBuyLicense === 'function' ? canBuyLicense(lic.id) : false;
        const canAfford = game.money >= lic.cost;

        let statusClass = owned ? 'owned' : (progress.met ? (canAfford ? 'available' : 'locked') : 'locked');
        let reqText = '';

        switch (lic.requirement.type) {
            case 'deliveries': reqText = `${progress.current}/${progress.required} deliveries`; break;
            case 'rushJobs': reqText = `${progress.current}/${progress.required} rush jobs`; break;
            case 'fragileJobs': reqText = `${progress.current}/${progress.required} fragile jobs`; break;
            case 'rescueJobs': reqText = `${progress.current}/${progress.required} rescues`; break;
            case 'earnings': reqText = `$${progress.current}/$${progress.required} earned`; break;
        }

        html += `
          <div class="license-item ${statusClass}">
            <div class="license-icon">${lic.icon}</div>
            <div class="license-info">
              <h3>${lic.name}</h3>
              <p>${lic.description}</p>
              <div class="license-req ${progress.met ? 'met' : ''}">${reqText}</div>
            </div>
            <div class="license-right">
              ${owned ? '<span class="license-owned"><span class="icon icon-check"></span> OWNED</span>' :
                `<button class="upgrade-buy-btn" onclick="buyLicense('${lic.id}')" ${canBuy ? '' : 'disabled'}>$${lic.cost}</button>`}
            </div>
          </div>
        `;
    });

    container.innerHTML = html;
}


// Options
// showOptions, hideOptions, showHowToPlay, closeHowToPlay are defined in game-ctrl.js
function toggleSoundOption() {
    options.sound = !options.sound;
    soundEnabled = options.sound;
    const btn = document.getElementById('soundToggle');
    btn.textContent = options.sound ? 'ON' : 'OFF';
    btn.classList.toggle('active', options.sound);
    if (!options.sound && engineRunning && typeof stopEngine === 'function') stopEngine();
    if (options.sound && gameStarted && !engineRunning && typeof startEngine === 'function') startEngine();
}
function toggleEngineOption() {
    options.engineSound = !options.engineSound;
    const btn = document.getElementById('engineToggle');
    btn.textContent = options.engineSound ? 'ON' : 'OFF';
    btn.classList.toggle('active', options.engineSound);
    if (!options.engineSound && engineRunning && typeof stopEngine === 'function') stopEngine();
    if (options.engineSound && gameStarted && soundEnabled && !engineRunning && typeof startEngine === 'function') startEngine();
}
function updateVolume() {
    options.volume = parseInt(document.getElementById('volumeSlider').value);
    masterVolume = options.volume / 100;
    document.getElementById('volumeValue').textContent = options.volume + '%';
}
function toggleWavesOption() {
    options.waves = !options.waves;
    const btn = document.getElementById('wavesToggle');
    btn.textContent = options.waves ? 'ON' : 'OFF';
    btn.classList.toggle('active', options.waves);
}
function toggleMinimapOption() {
    options.minimap = !options.minimap;
    const btn = document.getElementById('minimapToggle');
    btn.textContent = options.minimap ? 'ON' : 'OFF';
    btn.classList.toggle('active', options.minimap);
    document.getElementById('minimap').style.display = options.minimap ? 'block' : 'none';
}


// Leaderboard & Milestones
function toggleLeaderboard() {
    leaderboardVisible = !leaderboardVisible;
    const lb = document.getElementById('leaderboard');
    if (leaderboardVisible && activeCompetitors.length > 0) {
        lb.classList.add('show');
        updateLeaderboard();
    } else {
        lb.classList.remove('show');
    }
}

function getLeaderboardData() {
    const entries = [
        { name: 'You', deliveries: game.jobsDone, isPlayer: true, color: '#ff5722' }
    ];

    for (const comp of activeCompetitors) {
        entries.push({
            name: comp.name,
            deliveries: comp.deliveries,
            isPlayer: false,
            color: comp.color1
        });
    }

    // Sort by deliveries descending
    entries.sort((a, b) => b.deliveries - a.deliveries);

    return entries;
}

function updateLeaderboard() {
    const entries = getLeaderboardData();
    const container = document.getElementById('leaderboardEntries');

    // Find player rank
    const playerRank = entries.findIndex(e => e.isPlayer) + 1;
    const leader = entries[0];

    // Check for events
    if (eventCooldown <= 0) {
        // Player lost the lead
        if (lastPlayerRank === 1 && playerRank > 1 && game.jobsDone > 0) {
            showEvent('rival', '\u{1F620} Overtaken!', `${leader.name} has taken the lead!`);
            showTaunt(leader.name);
            eventCooldown = 600; // 10 seconds
        }
        // Player reclaimed the lead
        else if (lastPlayerRank > 1 && playerRank === 1) {
            showEvent('comeback', '\u{1F389} Back on Top!', 'You reclaimed the lead!');
            eventCooldown = 600;
        }
        // Competitor getting close
        else if (playerRank === 1 && entries.length > 1 && entries[1].deliveries === game.jobsDone - 1 && game.jobsDone > 2) {
            showEvent('rival', '\u26A0\uFE0F Close Race!', `${entries[1].name} is right behind you!`);
            eventCooldown = 900; // 15 seconds
        }
        // Player falling behind
        else if (playerRank > 1 && leader.deliveries >= game.jobsDone + 3 && game.jobsDone > 0) {
            showEvent('rival', '\u{1F4C9} Falling Behind!', `${leader.name} leads by ${leader.deliveries - game.jobsDone}!`);
            showTaunt(leader.name);
            eventCooldown = 900;
        }
    }

    lastPlayerRank = playerRank;
    lastLeaderName = leader.name;

    // Update AI tier display
    const difficulty = typeof getAIDifficultyLevel === 'function' ? getAIDifficultyLevel() : 0.5;
    const difficultyTier = Math.floor(difficulty * 5.99); // 0-5
    const tierNames = ['Rookie', 'Novice', 'Skilled', 'Expert', 'Master', 'Elite'];
    const tierEmojis = ['<span class="icon icon-rookie"></span>', '<span class="icon icon-novice"></span>', '<span class="icon icon-skilled"></span>', '<span class="icon icon-expert"></span>', '<span class="icon icon-master"></span>', '<span class="icon icon-elite"></span>'];
    const tierClasses = ['rookie', 'novice', 'skilled', 'expert', 'master', 'elite'];

    const aiTierEl = document.getElementById('aiTier');
    aiTierEl.innerHTML = `${tierEmojis[difficultyTier]} AI: ${tierNames[difficultyTier]}`;
    aiTierEl.className = 'ai-tier ' + tierClasses[difficultyTier];

    // Build HTML
    let html = '';
    entries.forEach((entry, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'other';
        const entryClass = entry.isPlayer ? 'player' : (rank === 1 ? 'first' : '');

        html += `
          <div class="leaderboard-entry ${entryClass}">
            <div class="leaderboard-rank ${rankClass}">${rank}</div>
            <span class="leaderboard-name" style="color: ${entry.isPlayer ? '#4dff88' : entry.color}">${entry.name}</span>
            <span class="leaderboard-score"><span class="icon icon-star"></span>${entry.deliveries}</span>
          </div>
        `;
    });

    container.innerHTML = html;

    // Only show if toggled on and has activeCompetitors
    const lb = document.getElementById('leaderboard');
    if (leaderboardVisible && activeCompetitors.length > 0) {
        lb.classList.add('show');
    } else {
        lb.classList.remove('show');
    }
}

function showEvent(type, title, text) {
    const notif = document.getElementById('eventNotification');
    const titleEl = document.getElementById('eventTitle');
    const textEl = document.getElementById('eventText');

    notif.className = 'event-notification ' + type;
    titleEl.innerHTML = title;
    textEl.innerHTML = text;
    notif.classList.add('show');

    // Play sound
    if (typeof playSound === 'function') {
        if (type === 'rival') {
            playSound('warning');
        } else if (type === 'comeback') {
            playSound('success');
        }
    }

    setTimeout(() => notif.classList.remove('show'), 2500);
}

const TAUNTS = [
    "Too slow, captain! <span class=\"icon icon-fish\"></span>",
    "Try to keep up! <span class=\"icon icon-speed\"></span>",
    "Is that all you've got?",
    "The sea is mine! <span class=\"icon icon-wave\"></span>",
    "Better luck next time!",
    "You call that towing? <span class=\"icon icon-face-neutral\"></span>",
    "Watch and learn!",
    "I own these waters!"
];

function showTaunt(competitorName) {
    const bubble = document.getElementById('tauntBubble');
    const taunt = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];

    // Find the competitor
    const comp = activeCompetitors.find(c => c.name === competitorName);
    if (!comp) return;

    // Position bubble above competitor (convert world to screen coords)
    const screenX = comp.x - camera.x;
    const screenY = comp.y - camera.y - 40;

    // Only show if competitor is on screen
    if (screenX > 0 && screenX < VIEW.width && screenY > 0 && screenY < VIEW.height) {
        bubble.style.left = screenX + 'px';
        bubble.style.top = screenY + 'px';
        bubble.innerHTML = taunt; // Use innerHTML for icons
        bubble.classList.add('show');

        setTimeout(() => bubble.classList.remove('show'), 2000);
    }
}

function checkMilestones() {
    // Delivery milestones
    const deliveryMilestones = {
        1: { title: '<span class="icon icon-rocket"></span> First Delivery!', text: 'The competition begins!' },
        3: { title: '<span class="icon icon-box"></span> Getting Started!', text: '3 deliveries down!' },
        5: { title: '<span class="icon icon-star"></span> Rising Star!', text: '5 successful deliveries!' },
        10: { title: '<span class="icon icon-trophy"></span> Harbor Hero!', text: '10 deliveries completed!' },
        15: { title: '<span class="icon icon-captain"></span> Seasoned Captain!', text: '15 deliveries - impressive!' },
        20: { title: '<span class="icon icon-king"></span> Shipping King!', text: '20 deliveries! You rule the harbor!' },
        25: { title: '<span class="icon icon-legend"></span> Sea Legend!', text: '25 deliveries! Legendary status!' },
        30: { title: '<span class="icon icon-diamond"></span> Diamond Captain!', text: '30 deliveries! Unstoppable!' },
        40: { title: '<span class="icon icon-wave"></span> Ocean Master!', text: '40 deliveries! The sea bows to you!' },
        50: { title: '<span class="icon icon-anchor"></span> Admiral!', text: '50 deliveries! Supreme commander!' },
        75: { title: '<span class="icon icon-pirate"></span> Pirate Lord!', text: '75 deliveries! You own these waters!' },
        100: { title: '<span class="icon icon-god"></span> Tugboat God!', text: '100 deliveries! Immortal!' }
    };

    if (deliveryMilestones[game.jobsDone]) {
        const m = deliveryMilestones[game.jobsDone];
        showEvent('comeback', m.title, m.text);
        eventCooldown = 300;
        return;
    }

    // Money milestones
    const moneyMilestones = {
        500: { title: '<span class="icon icon-money"></span> First Savings!', text: 'You have $500!' },
        1000: { title: '<span class="icon icon-money"></span> Thousandaire!', text: 'You hit $1,000!' },
        2500: { title: '<span class="icon icon-diamond"></span> Big Money!', text: '$2,500 in the bank!' },
        5000: { title: '<span class="icon icon-money"></span> Rich Captain!', text: '$5,000! Rolling in it!' },
        10000: { title: '<span class="icon icon-tycoon"></span> Tycoon!', text: '$10,000! Shipping magnate!' }
    };

    if (currentJob) {
        for (const [amount, milestone] of Object.entries(moneyMilestones)) {
            const amt = parseInt(amount);
            // Check if we just crossed this threshold
            if (game.money >= amt && game.money - currentJob.pay < amt) {
                showEvent('comeback', milestone.title, milestone.text);
                eventCooldown = 300;
                return;
            }
        }
    }

    // Special achievements
    // First win against AI
    if (game.jobsDone === 1 && activeCompetitors.length > 0) {
        const leadingComp = activeCompetitors.find(c => c.deliveries > 0);
        if (!leadingComp) {
            showEvent('comeback', '<span class="icon icon-first"></span> First Blood!', 'First delivery before the AI!');
            eventCooldown = 300;
            return;
        }
    }

    // Comeback - was behind, now leading
    const entries = getLeaderboardData();
    const playerRank = entries.findIndex(e => e.isPlayer) + 1;
    if (playerRank === 1 && lastPlayerRank > 2 && activeCompetitors.length > 0) {
        showEvent('comeback', '<span class="icon icon-fire"></span> Epic Comeback!', `From #${lastPlayerRank} to #1!`);
        eventCooldown = 300;
        return;
    }

    // Dominant lead - 5+ ahead of second place
    if (playerRank === 1 && entries.length > 1) {
        const gap = game.jobsDone - entries[1].deliveries;
        if (gap === 5) {
            showEvent('comeback', '<span class="icon icon-strength"></span> Dominant!', '5 deliveries ahead!');
            eventCooldown = 600;
        } else if (gap === 10) {
            showEvent('comeback', '<span class="icon icon-rocket"></span> Unstoppable!', '10 deliveries ahead!');
            eventCooldown = 600;
        }
    }
}


// Dev Tools
// __fatalError is defined in state.js
let __debugHudEnabled = false;
let __safeMode = false;
const __safeModePrev = { particles: null, weatherSystemFx: null, waves: null };

function setupDevToolsUI() {
    // Crash overlay buttons
    const overlay = document.getElementById('crashOverlay');
    const textEl = document.getElementById('crashText');
    const copyBtn = document.getElementById('crashCopyBtn');
    const reloadBtn = document.getElementById('crashReloadBtn');
    const closeBtn = document.getElementById('crashCloseBtn');

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                const txt = (textEl && textEl.textContent) ? textEl.textContent : '';
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(txt);
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => (copyBtn.textContent = 'Copy error'), 1200);
                } else {
                    // Fallback
                    const ta = document.createElement('textarea');
                    ta.value = txt;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => (copyBtn.textContent = 'Copy error'), 1200);
                }
            } catch (e) {
                // ignore
            }
        });
    }
    if (reloadBtn) reloadBtn.addEventListener('click', () => location.reload());
    if (closeBtn) closeBtn.addEventListener('click', () => { if (overlay) overlay.style.display = 'none'; });

    // Keybinds: F3 debug HUD, F4 safe mode
    window.addEventListener('keydown', (e) => {
        if (e.code === 'F3') {
            e.preventDefault();
            __debugHudEnabled = !__debugHudEnabled;
            const hud = document.getElementById('debugHud');
            if (hud) hud.style.display = __debugHudEnabled ? 'block' : 'none';
        }
        if (e.code === 'F4') {
            e.preventDefault();
            toggleSafeMode();
        }
    });

    // Inject Safe Mode toggle into Options panel (if it exists)
    const optionsPanel = document.getElementById('optionsPanel');
    if (optionsPanel && !document.getElementById('safeModeToggleRow')) {
        const row = document.createElement('div');
        row.id = 'safeModeToggleRow';
        row.style.marginTop = '10px';
        row.style.paddingTop = '10px';
        row.style.borderTop = '1px solid rgba(255,255,255,0.08)';
        row.innerHTML = `
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;">
            <input id="safeModeToggle" type="checkbox" />
            <span><strong>Safe Mode</strong> <span style="opacity:.8;">(disables fog/storm/rain particles + waves)</span></span>
          </label>
          <div style="opacity:.75;font-size:12px;margin-top:6px;">Shortcut: <strong>F4</strong></div>
        `;
        optionsPanel.appendChild(row);

        const cb = document.getElementById('safeModeToggle');
        if (cb) {
            cb.checked = __safeMode;
            cb.addEventListener('change', () => {
                setSafeMode(cb.checked);
            });
        }
    }
}

function setSafeMode(enabled) {
    __safeMode = !!enabled;
    // Remember previous values on enable
    if (__safeMode) {
        if (__safeModePrev.particles === null) __safeModePrev.particles = options.particles;
        if (__safeModePrev.weatherSystemFx === null) __safeModePrev.weatherSystemFx = options.weatherSystemFx;
        if (__safeModePrev.waves === null) __safeModePrev.waves = options.waves;

        options.particles = false;
        options.weatherSystemFx = false;
        options.waves = false;
    } else {
        // Restore previous values if we captured them
        if (__safeModePrev.particles !== null) options.particles = __safeModePrev.particles;
        if (__safeModePrev.weatherSystemFx !== null) options.weatherSystemFx = __safeModePrev.weatherSystemFx;

        function selectRegion(index) {
            if (!career.unlockedRegions[index]) return;
            career.currentRegion = index;

            // Reset activeCompetitors for new region
            activeCompetitors = [];
            competitorJobs = [];

            // Spawn appropriate number of AI for this region
            const region = getCurrentRegion();
            for (let i = 0; i < region.aiCount; i++) {
                activeCompetitors.push(createCompetitor(i));
            }

            if (typeof playSound === 'function') playSound('attach');
            if (typeof spawnNewJob === 'function') spawnNewJob();
            updateUI();
            updateRegionUI();
        }

        // License Helpers
        function hasLicense(id) {
            if (typeof licenses === 'undefined') return false;
            return licenses.owned.includes(id);
        }

        function canBuyLicense(id) {
            if (typeof LICENSES === 'undefined') return false;
            const lic = LICENSES[id];
            if (hasLicense(id)) return false;
            if (game.money < lic.cost) return false;

            const req = lic.requirement;
            switch (req.type) {
                case 'deliveries': return career.totalDeliveries >= req.value;
                case 'rushJobs': return licenses.rushJobs >= req.value;
                case 'fragileJobs': return licenses.fragileJobs >= req.value;
                case 'rescueJobs': return licenses.rescueJobs >= req.value;
                case 'salvageJobs': return licenses.salvageJobs >= req.value;
                case 'earnings': return career.totalEarnings >= req.value;
                default: return true;
            }
        }

        function getRequirementProgress(id) {
            if (typeof LICENSES === 'undefined') return { current: 0, required: 999, met: false };
            const lic = LICENSES[id];
            const req = lic.requirement;
            let current = 0;
            switch (req.type) {
                case 'deliveries': current = career.totalDeliveries; break;
                case 'rushJobs': current = licenses.rushJobs; break;
                case 'fragileJobs': current = licenses.fragileJobs; break;
                case 'rescueJobs': current = licenses.rescueJobs; break;
                case 'earnings': current = career.totalEarnings; break;
            }
            return { current, required: req.value, met: current >= req.value };
        }

        function buyLicense(id) {
            if (!canBuyLicense(id)) return false;
            if (typeof LICENSES === 'undefined') return false;
            const lic = LICENSES[id];
            game.money -= lic.cost;
            licenses.owned.push(id);
            if (typeof playSound === 'function') playSound('success');
            if (typeof addCameraShake === 'function') addCameraShake(4, 0.15); // License acquired shake
            showEvent('comeback', `${lic.icon} License Acquired!`, lic.name);
            updateUI();
            updateLicenseUI();
            return true;
        }

        function checkRegionUnlocks() {
            // Check if player can unlock next tier
            if (typeof playerTier === 'undefined' || typeof JOB_TIERS === 'undefined') return;
            if (playerTier < JOB_TIERS.length - 1) {
                const nextTier = JOB_TIERS[playerTier + 1];
                if (game.jobsDone >= nextTier.jobsRequired && game.money >= nextTier.unlockCost) {
                    // Logic handled by UI buttons, but we could show a notification here
                    // For now, it's just a passive check
                }
            }
        }
        if (__safeModePrev.waves !== null) options.waves = __safeModePrev.waves;
    }

    const cb = document.getElementById('safeModeToggle');
    if (cb) cb.checked = __safeMode;
}

function toggleSafeMode() { setSafeMode(!__safeMode); }

function formatErrorPayload(kind, msg, source, line, col, stack) {
    const parts = [];
    parts.push(`[${kind}] ${msg}`);
    if (source) parts.push(`Source: ${source}:${line || 0}:${col || 0}`);
    if (stack) parts.push(`\nStack:\n${stack}`);
    // Add small runtime context (best-effort)
    try {
        parts.push(`\nContext: started=${gameStarted} paused=${game.paused} money=${game.money} jobsDone=${game.jobsDone}`);
    } catch (_) { }
    return parts.join('\n');
}

function showCrashOverlay(text) {
    const overlay = document.getElementById('crashOverlay');
    const textEl = document.getElementById('crashText');
    if (textEl) textEl.textContent = text || 'Unknown error';
    if (overlay) overlay.style.display = 'flex';
}

// Global error handlers
window.addEventListener('error', (event) => {
    const payload = formatErrorPayload(
        'error',
        event && event.message ? event.message : 'Unknown error',
        event && event.filename ? event.filename : '',
        event && event.lineno ? event.lineno : 0,
        event && event.colno ? event.colno : 0,
        event && event.error && event.error.stack ? event.error.stack : ''
    );
    __fatalError = payload;
    showCrashOverlay(payload);
});

window.addEventListener('unhandledrejection', (event) => {
    const reason = event && event.reason ? event.reason : 'Unknown rejection';
    const stack = (reason && reason.stack) ? reason.stack : '';
    const payload = formatErrorPayload(
        'unhandledrejection',
        (reason && reason.message) ? reason.message : String(reason),
        '',
        0,
        0,
        stack
    );
    __fatalError = payload;
    showCrashOverlay(payload);
});

// Debug HUD: cheap stats collector (best-effort; never throws)
const __hud = { fps: 0, fpsSmoothed: 0, dt: 0, lastUpdate: 0 };
function updateDebugHud(deltaMs, deltaNorm) {
    if (!__debugHudEnabled) return;
    const hudEl = document.getElementById('debugHud');
    if (!hudEl) return;

    __hud.dt = deltaMs;
    const fpsNow = deltaMs > 0 ? (1000 / deltaMs) : 0;
    __hud.fpsSmoothed = __hud.fpsSmoothed ? (__hud.fpsSmoothed * 0.9 + fpsNow * 0.1) : fpsNow;

    // Best-effort counts (these names exist in your code)
    const jobCount = (typeof availableJobs !== 'undefined' && availableJobs && availableJobs.length != null) ? availableJobs.length : 0;
    const hasCurrentJob = (typeof currentJob !== 'undefined' && currentJob) ? 1 : 0;
    const aiCount = (typeof activeCompetitors !== 'undefined' && activeCompetitors && activeCompetitors.length != null) ? activeCompetitors.length : 0;
    const particleCount = (typeof waterParticles !== 'undefined' && waterParticles && waterParticles.length != null) ? waterParticles.length : 0;
    const rippleCount = (typeof ripples !== 'undefined' && ripples && ripples.length != null) ? ripples.length : 0;

    const zoomLevel = (typeof zoom !== 'undefined' && zoom && typeof zoom.level === 'number') ? zoom.level : (typeof camera !== 'undefined' && camera && typeof camera.zoom === 'number' ? camera.zoom : 1);
    const weatherSystemName = (typeof weatherSystem !== 'undefined' && weatherSystem && weatherSystem.current && weatherSystem.current.name) ? weatherSystem.current.name : 'Unknown';

    // Zone diagnostics (helps catch "phantom collisions")
    const bx = (typeof tugboat !== 'undefined' && tugboat) ? tugboat.x : 0;
    const by = (typeof tugboat !== 'undefined' && tugboat) ? tugboat.y : 0;
    let zoneName = 'N/A', riverName = '-', dockName = '-';
    if (typeof getZoneAt === 'function') {
        const z = getZoneAt(bx, by);
        zoneName = (z === ZONE.WATER) ? 'WATER' : (z === ZONE.SHALLOWS) ? 'SHALLOWS' : (z === ZONE.LAND) ? 'LAND' : (z === ZONE.DOCK) ? 'DOCK' : String(z);
    }
    if (typeof isInRiver === 'function') {
        const r = isInRiver(bx, by);
        riverName = r && r.name ? r.name : '-';
    }
    if (typeof docks !== 'undefined' && docks) {
        for (const d of docks) {
            const pad = 10;
            if (bx >= d.x - pad && bx <= d.x + d.width + pad && by >= d.y - pad && by <= d.y + d.height + pad) { dockName = d.name || 'Dock'; break; }
        }
    }

    hudEl.innerHTML = `
        <div><strong>FPS</strong>: ${__hud.fpsSmoothed.toFixed(0)} <span class="muted">(dt ${deltaMs.toFixed(1)}ms / \u0394 ${deltaNorm.toFixed(2)})</span></div>
        <div><strong>Zoom</strong>: ${zoomLevel.toFixed(2)} <span class="muted">Weather: ${weatherSystemName}${__safeMode ? ' <span class="warn">SAFE</span>' : ''}</span></div>
        <div><strong>Zone</strong>: ${zoneName} | <strong>River</strong>: ${riverName} | <strong>Dock</strong>: ${dockName}</div>
        <div><strong>Pos</strong>: ${bx.toFixed(0)}, ${by.toFixed(0)} | <strong>Tier</strong>: ${typeof playerTier !== 'undefined' ? JOB_TIERS[playerTier].name : 'N/A'}</div>
        <div><strong>Entities</strong>: AI ${aiCount} | particles ${particleCount} | ripples ${rippleCount}</div>
        <div><strong>Jobs</strong>: board ${jobCount} | active ${hasCurrentJob} | done ${game && game.jobsDone != null ? game.jobsDone : 0}</div>
      `;
}

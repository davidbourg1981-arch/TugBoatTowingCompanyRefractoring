// ==========================================
// PHYSICS SYSTEM
// Movement, Collision, Rope Physics
// ==========================================

function updatePhysicsStep(delta, thrust, turn) {
    // Physics with delta-time
    tugboat.vx += Math.cos(tugboat.angle) * thrust * tugboat.power * delta;
    tugboat.vy += Math.sin(tugboat.angle) * thrust * tugboat.power * delta;
    tugboat.angularVel += turn * tugboat.turnSpeed * delta;

    // Clamp spin so it feels weighty (prevents ridiculous pirouettes)
    const maxAngular = tugboat.turnSpeed * 2.2;
    tugboat.angularVel = Math.max(-maxAngular, Math.min(maxAngular, tugboat.angularVel));

    // Apply drag (framerate-independent using pow)
    const dragFactor = Math.pow(tugboat.drag, delta);
    const angularDragFactor = Math.pow(tugboat.angularDrag, delta);
    tugboat.vx *= dragFactor; tugboat.vy *= dragFactor;
    tugboat.angularVel *= angularDragFactor;

    // Apply weatherSystem effects (wind and currents)
    if (typeof applyWeatherPhysics === 'function') {
        applyWeatherPhysics(tugboat, delta);
    }

    // Lateral slip control (drift at speed): damp sideways velocity more when slow
    const headingX = Math.cos(tugboat.angle);
    const headingY = Math.sin(tugboat.angle);
    const fwd = tugboat.vx * headingX + tugboat.vy * headingY;
    const side = -tugboat.vx * headingY + tugboat.vy * headingX;
    // sideDamp: strong at low speed, looser at high speed
    const sideDamp = 0.35 + 0.55 * (1 - Math.max(0, Math.min(1, Math.hypot(tugboat.vx, tugboat.vy) / (tugboat.maxSpeed || 12))));
    const newSide = side * Math.pow(sideDamp, delta);
    tugboat.vx = fwd * headingX + (-newSide) * headingY;
    tugboat.vy = fwd * headingY + (newSide) * headingX;

    const tugSpeed = Math.hypot(tugboat.vx, tugboat.vy);
    if (tugSpeed > tugboat.maxSpeed) {
        tugboat.vx = (tugboat.vx / tugSpeed) * tugboat.maxSpeed;
        tugboat.vy = (tugboat.vy / tugSpeed) * tugboat.maxSpeed;
    }
    tugboat.angularVel = Math.max(-0.04, Math.min(0.04, tugboat.angularVel));

    if (tugboat.attached) {
        // Calculate total weight for tandem tow
        let totalWeight = tugboat.attached.weight;
        if (typeof currentJob !== 'undefined' && currentJob && currentJob.jobType === JOB_TYPES.TANDEM && currentJob.allCargo) {
            totalWeight = currentJob.allCargo.reduce((sum, c) => sum + c.weight, 0);
        }
        const towDragBase = 1 - (0.04 * totalWeight / tugboat.towStrength);
        const towDragFactor = Math.pow(Math.max(0.88, towDragBase), delta);
        tugboat.vx *= towDragFactor;
        tugboat.vy *= towDragFactor;
    }

    // Position update with delta
    tugboat.x += tugboat.vx * delta; tugboat.y += tugboat.vy * delta; tugboat.angle += tugboat.angularVel * delta;
    tugboat.x = Math.max(30, Math.min(WORLD.width - 30, tugboat.x));
    tugboat.y = Math.max(30, Math.min(WORLD.height - 30, tugboat.y));

    // NEW: Apply river current (reduced effect when towing)
    // getRiverCurrentAt is in world.js
    if (typeof getRiverCurrentAt === 'function') {
        const current = getRiverCurrentAt(tugboat.x, tugboat.y);
        if (current.x !== 0 || current.y !== 0) {
            // Current has more effect at low speeds (can't fight it when stopped)
            const speedFactor = 1.0 - Math.min(0.5, tugSpeed / 6);
            // Towing reduces current effect
            const towingReduction = tugboat.attached ? 0.6 : 1.0;
            // River Pilot license reduces current push by 50%
            const pilotBonus = (typeof hasLicense === 'function' && hasLicense('riverPilot')) ? 0.5 : 1.0;
            // Apply current force - gentle but noticeable
            const currentForce = 1.2 * speedFactor * towingReduction * pilotBonus;
            tugboat.vx += current.x * delta * currentForce;
            tugboat.vy += current.y * delta * currentForce;
        }
    }

    // Soft Collision with AI Competitors (to prevent clipping/hard bumps)
    if (typeof activeCompetitors !== 'undefined') {
        for (const comp of activeCompetitors) {
            // Skip collision if AI is trying to recover (needs to move freely)
            if (comp.state === 'RECOVER') continue;

            const dx = tugboat.x - comp.x;
            const dy = tugboat.y - comp.y;
            const dist = Math.hypot(dx, dy);
            const minSpace = 65; // Increased buffer slightly

            if (dist < minSpace && dist > 0) {
                // Gentle push away
                const overlap = minSpace - dist;
                const push = overlap * 0.015 * delta; // Much softer spring
                const nx = dx / dist;
                const ny = dy / dist;

                tugboat.vx += nx * push;
                tugboat.vy += ny * push;

                // Apply reciprocal force to AI
                comp.vx -= nx * push * 0.5;
                comp.vy -= ny * push * 0.5;
            }
        }
    }

    return tugSpeed;
}

function updatePostPhysics(delta, tugSpeed) {
    // NEW: Map collision (land, shallows)
    handleMapCollision(tugboat);

    // Update tide
    if (typeof TIDE !== 'undefined') {
        TIDE.update(delta / 60); // Convert to seconds
    }

    if (tugboat.attached) { updateRope(delta); updateCargo(delta); }

    if (tugSpeed > 0.5 && tugboat.fuel > 0) {
        const wakeAngle = tugboat.angle + Math.PI;
        if (typeof waterParticles !== 'undefined') {
            waterParticles.push({
                x: tugboat.x + Math.cos(wakeAngle) * 25, y: tugboat.y + Math.sin(wakeAngle) * 25,
                vx: Math.cos(wakeAngle) * tugSpeed * 0.25, vy: Math.sin(wakeAngle) * tugSpeed * 0.25,
                life: 1, size: 2 + Math.random() * 2
            });
        }
    }

    if (typeof waterParticles !== 'undefined') {
        waterParticles = waterParticles.filter(p => {
            p.x += p.vx * delta; p.y += p.vy * delta;
            const particleDrag = Math.pow(0.97, delta);
            p.vx *= particleDrag; p.vy *= particleDrag;
            p.life -= 0.025 * delta;
            return p.life > 0;
        });
    }
    if (typeof ripples !== 'undefined') {
        ripples = ripples.filter(r => { r.radius += 1.5 * delta; r.opacity -= 0.03 * delta; return r.opacity > 0; });
    }
}

function updateEngineAndFuel(delta, thrust) {
    // Update engine sound
    const tugSpeedForSound = Math.hypot(tugboat.vx, tugboat.vy);
    if (typeof updateEngineSound === 'function') {
        updateEngineSound(Math.abs(thrust), tugSpeedForSound);
    }

    // Low fuel warning (every ~60 frames / 1 sec when below 20%)
    const fuelPercent = (tugboat.fuel / tugboat.maxFuel) * 100;
    if (fuelPercent <= 20 && fuelPercent > 0 && Math.floor(game.time) % 60 === 0 && Math.floor(game.time - delta) % 60 !== 0) {
        if (typeof playSound === 'function') playSound('warning');
    }

    if (thrust !== 0 && tugboat.fuel > 0) {
        tugboat.fuel -= 0.03 * Math.abs(thrust) * tugboat.fuelEfficiency * currentDifficulty.fuelMult * delta;
        if (tugboat.attached) {
            // Tandem tow uses more fuel
            let totalWeight = tugboat.attached.weight;
            if (typeof currentJob !== 'undefined' && currentJob && currentJob.jobType === JOB_TYPES.TANDEM && currentJob.allCargo) {
                totalWeight = currentJob.allCargo.reduce((sum, c) => sum + c.weight, 0);
            }
            tugboat.fuel -= 0.01 * totalWeight * currentDifficulty.fuelMult * delta;
        }
        tugboat.fuel = Math.max(0, tugboat.fuel);
    }
}

function updateRope(delta = 1) {
    const cargo = tugboat.attached;
    const sternX = tugboat.x - Math.cos(tugboat.angle) * 28;
    const sternY = tugboat.y - Math.sin(tugboat.angle) * 28;
    const bowX = cargo.x + Math.cos(cargo.angle) * (cargo.width / 2);
    const bowY = cargo.y + Math.sin(cargo.angle) * (cargo.width / 2);
    const dx = bowX - sternX, dy = bowY - sternY, dist = Math.hypot(dx, dy);
    if (dist > tugboat.ropeLength) {
        const pullAmount = (dist - tugboat.ropeLength) * 0.22 * delta;
        cargo.x -= (dx / dist) * pullAmount;
        cargo.y -= (dy / dist) * pullAmount;
    }

    // Tandem tow - update rope between tandem cargo
    if (typeof currentJob !== 'undefined' && currentJob && currentJob.jobType === JOB_TYPES.TANDEM && currentJob.allCargo) {
        const chainCargo = currentJob.allCargo;
        for (let i = 1; i < chainCargo.length; i++) {
            const leader = chainCargo[i - 1];
            const follower = chainCargo[i];
            // Rope from back of leader to front of follower
            const leaderBackX = leader.x - Math.cos(leader.angle) * (leader.width / 2);
            const leaderBackY = leader.y - Math.sin(leader.angle) * (leader.width / 2);
            const followerFrontX = follower.x + Math.cos(follower.angle) * (follower.width / 2);
            const followerFrontY = follower.y + Math.sin(follower.angle) * (follower.width / 2);
            const cdx = followerFrontX - leaderBackX;
            const cdy = followerFrontY - leaderBackY;
            const cdist = Math.hypot(cdx, cdy);
            const chainRopeLen = 40; // Short rope between tandem cargo
            if (cdist > chainRopeLen) {
                const pullAmt = (cdist - chainRopeLen) * 0.25 * delta;
                follower.x -= (cdx / cdist) * pullAmt;
                follower.y -= (cdy / cdist) * pullAmt;
            }
        }
    }
}

function updateCargo(delta = 1) {
    const cargo = tugboat.attached;
    const sternX = tugboat.x - Math.cos(tugboat.angle) * 28;
    const sternY = tugboat.y - Math.sin(tugboat.angle) * 28;
    const targetAngle = Math.atan2(sternY - cargo.y, sternX - cargo.x);
    let angleDiff = targetAngle - cargo.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    cargo.angle += angleDiff * 0.022 * delta;

    // Apply weatherSystem to cargo (wind affects bigger cargo more)
    if (typeof applyWeatherPhysics === 'function') applyWeatherPhysics(cargo, delta);

    // Extra wind effect on cargo based on size
    if (typeof weatherSystem !== 'undefined' && weatherSystem.current.windStrength > 0) {
        const sizeBonus = cargo.width * 0.0003;
        cargo.vx += Math.cos(weatherSystem.windAngle) * weatherSystem.current.windStrength * sizeBonus * 20 * delta;
        cargo.vy += Math.sin(weatherSystem.windAngle) * weatherSystem.current.windStrength * sizeBonus * 20 * delta;
    }

    // Apply river current to cargo (bigger cargo = more affected)
    if (typeof getRiverCurrentAt === 'function') {
        const cargoCurrent = getRiverCurrentAt(cargo.x, cargo.y);
        if (cargoCurrent.x !== 0 || cargoCurrent.y !== 0) {
            const cargoCurrentForce = 0.8 * (cargo.weight || 1);
            cargo.vx += cargoCurrent.x * delta * cargoCurrentForce;
            cargo.vy += cargoCurrent.y * delta * cargoCurrentForce;
        }
    }

    const cargoDrag = Math.pow(0.93, delta);
    cargo.vx *= cargoDrag; cargo.vy *= cargoDrag;
    cargo.x += cargo.vx * delta; cargo.y += cargo.vy * delta;
    cargo.x = Math.max(60, Math.min(WORLD.width - 60, cargo.x));
    cargo.y = Math.max(60, Math.min(WORLD.height - 60, cargo.y));

    // Tandem tow - update tandem cargo physics
    if (typeof currentJob !== 'undefined' && currentJob && currentJob.jobType === JOB_TYPES.TANDEM && currentJob.allCargo) {
        const chainCargo = currentJob.allCargo;
        for (let i = 1; i < chainCargo.length; i++) {
            const leader = chainCargo[i - 1];
            const follower = chainCargo[i];

            // Follower turns to follow leader
            const leaderBackX = leader.x - Math.cos(leader.angle) * (leader.width / 2);
            const leaderBackY = leader.y - Math.sin(leader.angle) * (leader.width / 2);
            const followAngle = Math.atan2(leaderBackY - follower.y, leaderBackX - follower.x);
            let fAngleDiff = followAngle - follower.angle;
            while (fAngleDiff > Math.PI) fAngleDiff -= Math.PI * 2;
            while (fAngleDiff < -Math.PI) fAngleDiff += Math.PI * 2;
            follower.angle += fAngleDiff * 0.018 * delta; // Slower turn = more swing

            // Apply weatherSystem
            if (typeof applyWeatherPhysics === 'function') applyWeatherPhysics(follower, delta);

            if (typeof weatherSystem !== 'undefined' && weatherSystem.current.windStrength > 0) {
                const sizeBonus = follower.width * 0.0004;
                follower.vx += Math.cos(weatherSystem.windAngle) * weatherSystem.current.windStrength * sizeBonus * 20 * delta;
                follower.vy += Math.sin(weatherSystem.windAngle) * weatherSystem.current.windStrength * sizeBonus * 20 * delta;
            }

            // Apply river current to tandem cargo
            if (typeof getRiverCurrentAt === 'function') {
                const tandemCurrent = getRiverCurrentAt(follower.x, follower.y);
                if (tandemCurrent.x !== 0 || tandemCurrent.y !== 0) {
                    const tandemCurrentForce = 0.6 * (follower.weight || 1);
                    follower.vx += tandemCurrent.x * delta * tandemCurrentForce;
                    follower.vy += tandemCurrent.y * delta * tandemCurrentForce;
                }
            }

            const followerDrag = Math.pow(0.91, delta);
            follower.vx *= followerDrag; follower.vy *= followerDrag;
            follower.x += follower.vx * delta; follower.y += follower.vy * delta;
            follower.x = Math.max(60, Math.min(WORLD.width - 60, follower.x));
            follower.y = Math.max(60, Math.min(WORLD.height - 60, follower.y));
        }
    }
}

// Collisions
function showCollisionFlash() {
    const flash = document.getElementById('collisionFlash');
    flash.classList.add('show');
    if (typeof playSound === 'function') playSound('collision');
    setTimeout(() => flash.classList.remove('show'), 150);
    if (typeof updateUI === 'function') updateUI(); // Update health display
}

function handleCollision() {
    // Take damage on collision, reduced by armor upgrade
    const baseDamage = 5 + Math.random() * 5;
    const damage = baseDamage * tugboat.armorRating;
    tugboat.health = Math.max(0, tugboat.health - damage);
    showCollisionFlash();

    // Camera shake on collision - stronger for more damage
    if (typeof addCameraShake === 'function') addCameraShake(4 + damage * 0.5, 0.15);

    // Fragile cargo - license allows 1 bump
    if (currentJob && currentJob.jobType === JOB_TYPES.FRAGILE && currentJob.pickedUp) {
        currentJob.collisionCount++;
        const allowedBumps = (typeof hasLicense === 'function' && hasLicense('fragile')) ? 1 : 0;
        if (currentJob.collisionCount > allowedBumps) {
            if (typeof failJob === 'function') failJob('Fragile cargo damaged!');
        } else if (allowedBumps > 0) {
            if (typeof showEvent === 'function') showEvent('rival', '<span class="icon icon-fragile"></span> Close Call!', 'Fragile specialist saved the cargo!');
        }
    }

    // VIP - no collisions allowed at all
    if (currentJob && currentJob.jobType === JOB_TYPES.VIP && currentJob.pickedUp) {
        if (typeof failJob === 'function') failJob('VIP was disturbed by collision!');
    }

    // Boat destroyed
    if (tugboat.health <= 0) {
        if (typeof failJob === 'function') failJob('Your boat was destroyed!');
        if (typeof addCameraShake === 'function') addCameraShake(12, 0.3); // Big shake for destruction
        tugboat.health = 20; // Give some health back (soft fail)
    }
}

// Ensure handleMapCollision exists - uses world.js helpers
function handleMapCollision(entity) {
    // If not in water, find nearest water and shove it there
    if (typeof isInWater === 'function' && !isInWater(entity.x, entity.y)) {
        // If logic is in world.js, use it
        if (typeof __clampToWater === 'function') {
            if (__clampToWater(entity, 0.25)) {
                // Succeeded in clamping
                // Trigger collision penalty if moving fast enough
                const speed = Math.hypot(entity.vx, entity.vy);
                if (speed > 1.0) {
                    handleCollision();
                }
            }
        } else {
            // Fallback minimal clamp if __clampToWater missing
            entity.vx *= -0.5;
            entity.vy *= -0.5;
        }
    }
}

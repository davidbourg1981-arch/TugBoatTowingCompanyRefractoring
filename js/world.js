/* ==========================================
   WORLD MODULE
   Map generation, zones, collision, and currents
   ========================================== */

// Player's current tier (Progression)
let playerTier = 0;

function getCurrentTier() {
    return JOB_TIERS[playerTier];
}

function canUnlockTier(tierIndex) {
    if (tierIndex <= playerTier) return false;
    if (tierIndex > playerTier + 1) return false; // Can only unlock next tier
    const tier = JOB_TIERS[tierIndex];
    return game.jobsDone >= tier.jobsRequired && game.money >= tier.unlockCost;
}

function unlockTier(tierIndex) {
    if (!canUnlockTier(tierIndex)) return false;
    const tier = JOB_TIERS[tierIndex];
    game.money -= tier.unlockCost;
    playerTier = tierIndex;
    playSound('success');
    addCameraShake(5, 0.2);
    showEvent('comeback', `${tier.icon} ${tier.name} Unlocked!`, tier.description);

    // Update UI if available
    if (typeof updateUI === 'function') updateUI();
    if (typeof updateRegionUI === 'function') updateRegionUI();
    if (typeof updateCareerUI === 'function') updateCareerUI();

    return true;
}

// Legacy compatibility - maps to new tier system
function getCurrentRegion() {
    return {
        name: getCurrentTier().name,
        icon: getCurrentTier().icon,
        payMultiplier: getCurrentTier().payMultiplier,
        aiCount: getCurrentTier().aiCount
    };
}

// Checks if player can unlock next tier (helper for UI)
function checkRegionUnlocks() {
    if (playerTier < JOB_TIERS.length - 1) {
        const nextTier = JOB_TIERS[playerTier + 1];
        if (game.jobsDone >= nextTier.jobsRequired && game.money >= nextTier.unlockCost) {
            // Logic handled by UI usually
        }
    }
}

// Initialize current zones
function initCurrents() {
    // Create current zones across the expanded map
    weatherSystem.currents = [
        // Northern currents
        { x: 500, y: 400, radius: 180, angle: Math.PI * 0.25, strength: 0.012 },
        { x: 1500, y: 350, radius: 200, angle: Math.PI * 1.75, strength: 0.015 },
        { x: 2500, y: 400, radius: 170, angle: Math.PI * 0.5, strength: 0.013 },
        { x: 3300, y: 350, radius: 160, angle: Math.PI, strength: 0.011 },

        // Middle currents
        { x: 300, y: 850, radius: 200, angle: Math.PI * 1.5, strength: 0.014 },
        { x: 1100, y: 900, radius: 180, angle: Math.PI * 0.75, strength: 0.012 },
        { x: 1900, y: 850, radius: 190, angle: Math.PI * 1.25, strength: 0.015 },
        { x: 2700, y: 900, radius: 170, angle: Math.PI * 0.25, strength: 0.013 },

        // Southern currents
        { x: 600, y: 1400, radius: 200, angle: Math.PI * 1.8, strength: 0.014 },
        { x: 1400, y: 1450, radius: 180, angle: Math.PI * 0.5, strength: 0.012 },
        { x: 2200, y: 1400, radius: 190, angle: Math.PI * 1.0, strength: 0.015 },
        { x: 3000, y: 1450, radius: 170, angle: Math.PI * 1.5, strength: 0.013 },

        // Far south currents
        { x: 500, y: 2000, radius: 200, angle: Math.PI * 0.3, strength: 0.014 },
        { x: 1700, y: 2050, radius: 220, angle: Math.PI * 1.7, strength: 0.016 },
        { x: 2900, y: 2000, radius: 180, angle: Math.PI * 0.8, strength: 0.013 }
    ];
}

// ==========================================
// MAP COLLISION SYSTEM
// ==========================================

// Harbor basin polygon MUST match drawHarbor()
function getHarborPolygon() {
    const w = HARBOR.width;
    return [
        { x: 0, y: 300 },
        { x: w, y: 400 },
        { x: w + 100, y: 600 },
        { x: w + 100, y: 3400 },
        { x: w, y: 3600 },
        { x: 0, y: 3700 }
    ];
}

function isPointInHarborBasin(x, y) {
    // Use the actual polygon to match visual water exactly
    return pointInPolygon(x, y, getHarborPolygon());
}

// Check if a point is in navigable water (river or ocean)
function isInWater(x, y) {
    if (x >= OCEAN.x - 200) return true;
    if (isPointInHarborBasin(x, y)) return true;
    return isInRiver(x, y) !== null;
}

// Check which river a point is in (returns river object or null)
function isInRiver(x, y) {
    // Harbor overrides river logic
    if (x < HARBOR.width + 100) return null;

    for (const key in RIVERS) {
        const river = RIVERS[key];
        if (isPointInRiverPath(x, y, river)) {
            return river;
        }
    }
    return null;
}

// Check if point is within a river's path
function isPointInRiverPath(x, y, river) {
    const path = river.path;
    if (!path || path.length < 2 || !path[0] || !path[path.length - 1]) return false;
    const baseHalfWidth = river.width / 2;

    // Widen the river near endpoints so mouths/harbor approaches don't create "phantom land"
    const mouthLen = 800;       // widening distance from endpoints (increased)
    const mouthExtra = 200;     // extra half-width at endpoints (increased)

    const dStart = Math.hypot(x - path[0].x, y - path[0].y);
    const dEnd = Math.hypot(x - path[path.length - 1].x, y - path[path.length - 1].y);
    const startBoost = dStart < mouthLen ? (1 - (dStart / mouthLen)) : 0;
    const endBoost = dEnd < mouthLen ? (1 - (dEnd / mouthLen)) : 0;
    const endpointBoost = Math.max(startBoost, endBoost);

    const halfWidth = baseHalfWidth + mouthExtra * endpointBoost;

    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const dist = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (dist < halfWidth) return true;
    }
    return false;
}

// Get the zone type at a position
function getZoneAt(x, y) {
    // Check docks first
    // NOTE: dock.x / dock.y are TOP-LEFT
    for (const dock of docks) {
        const pad = 20;
        if (x >= dock.x - pad && x <= dock.x + dock.width + pad &&
            y >= dock.y - pad && y <= dock.y + dock.height + pad) {
            return ZONE.DOCK;
        }
    }
    // Check if in water - simplified, no shallows
    if (isInWater(x, y)) {
        return ZONE.WATER;
    }

    return ZONE.LAND;
}

// Get distance to the center of a river at a given point
function getDistanceToRiverCenter(x, y, river) {
    const path = river.path;
    let minDist = Infinity;

    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const dist = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (dist < minDist) minDist = dist;
    }

    return minDist;
}

// Get river current at a position (returns {x, y} velocity)
function getRiverCurrentAt(x, y) {
    if (x < HARBOR.width) return { x: 0, y: 0 };
    const river = isInRiver(x, y);
    if (!river) return { x: 0, y: 0 };

    // Find which segment we're in
    const path = river.path;
    let closestSegment = 0;
    let minDist = Infinity;

    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const dist = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (dist < minDist) {
            minDist = dist;
            closestSegment = i;
        }
    }

    // Current flows toward ocean (increasing X)
    const p1 = path[closestSegment];
    const p2 = path[closestSegment + 1];
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    // Apply tide multiplier - noticeable push that requires effort to fight
    // High tide = weaker current (0.5x), Low tide = stronger current (1.5x)
    const tideMultiplier = TIDE.getCurrentMultiplier();
    const strength = river.currentStrength * tideMultiplier * 0.15;

    return {
        x: Math.cos(angle) * strength,
        y: Math.sin(angle) * strength
    };
}

// Get area details for UI display (name, icon, color)
function getAreaDetails(x, y) {
    if (x >= OCEAN.x) return { name: 'Open Ocean', icon: '<span class="icon icon-salvage"></span>', color: '#0d4a6f' };
    if (x <= HARBOR.width) return { name: 'Harbor', icon: '<span class="icon icon-anchor"></span>', color: '#1a8aaa' };

    const river = isInRiver(x, y);
    if (river) {
        const areaName = river.name;
        if (areaName.includes('Ocean')) {
            return { name: 'Open Ocean', icon: '<span class="icon icon-salvage"></span>', color: '#0d4a6f' };
        } else if (areaName.includes('Harbor')) {
            return { name: 'Harbor', icon: '<span class="icon icon-anchor"></span>', color: '#1a8aaa' };
        } else if (areaName.includes('North')) {
            return { name: 'North Channel', icon: '<span class="icon icon-boat"></span>', color: '#2ecc71' };
        } else if (areaName.includes('Main')) {
            return { name: 'Main River', icon: '<span class="icon icon-boat"></span>', color: '#3498db' };
        } else if (areaName.includes('South')) {
            return { name: 'South Passage', icon: '<span class="icon icon-boat"></span>', color: '#9b59b6' };
        } else {
            return { name: 'Coastline', icon: '<span class="icon icon-casual"></span>', color: '#2d5a27' };
        }
    }

    return { name: 'Coastline', icon: '<span class="icon icon-casual"></span>', color: '#2d5a27' };
}

// Get area name for UI display
function getAreaName(x, y) {
    const details = getAreaDetails(x, y);
    return `${details.icon} ${details.name}`;
}

// ================================
// AI WATER SAFETY HELPERS
// ================================

// Find a nearby water point (used to keep AI from "tracking" across land).
function __findNearestWaterPoint(x, y, maxRadius = 700, step = 25) {
    if (isInWater(x, y)) return { x, y };
    // Spiral-ish sampling
    for (let r = step; r <= maxRadius; r += step) {
        // 12 directions per ring (cheap + good enough)
        const n = 12;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (isInWater(px, py)) return { x: px, y: py };
        }
    }
    // Absolute fallback: shove toward ocean band
    return { x: Math.max(x, OCEAN.x - 180), y };
}

// Clamp an entity to water; returns true if it was moved.
function __clampToWater(entity, bounce = 0.25) {
    if (isInWater(entity.x, entity.y)) return false;
    const p = __findNearestWaterPoint(entity.x, entity.y);
    const dx = p.x - entity.x;
    const dy = p.y - entity.y;
    entity.x = p.x;
    entity.y = p.y;
    // Damp and nudge velocity away from land so it doesn't re-stick instantly
    if (typeof entity.vx === 'number') entity.vx = (entity.vx || 0) * -bounce;
    if (typeof entity.vy === 'number') entity.vy = (entity.vy || 0) * -bounce;
    // Rotate away from the push direction a bit
    if (typeof entity.angle === 'number') entity.angle = Math.atan2(dy, dx);
    return true;
}

// Find closest point on a river centerline (for "get me back into the channel" logic).
function __nearestRiverCenterPoint(x, y) {
    let best = null;
    for (const key in RIVERS) {
        const r = RIVERS[key];
        const path = r.path;
        for (let i = 0; i < path.length - 1; i++) {
            const x1 = path[i].x, y1 = path[i].y;
            const x2 = path[i + 1].x, y2 = path[i + 1].y;
            // Project point onto segment
            const vx = x2 - x1, vy = y2 - y1;
            const wx = x - x1, wy = y - y1;
            const c1 = vx * wx + vy * wy;
            const c2 = vx * vx + vy * vy;
            let t = c2 > 0 ? c1 / c2 : 0;
            t = Math.max(0, Math.min(1, t));
            const px = x1 + vx * t, py = y1 + vy * t;
            const d2 = (x - px) * (x - px) + (y - py) * (y - py);
            if (!best || d2 < best.d2) best = { x: px, y: py, d2, river: r, segIndex: i };
        }
    }
    return best;
}

function __snapPointToRiver(px, py, river) {
    const path = river.path;
    let best = { x: path[0].x, y: path[0].y, d2: Infinity };
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i], p2 = path[i + 1];
        const n = __nearestPointOnSegment(px, py, p1.x, p1.y, p2.x, p2.y); // using utils.js
        const dx = px - n.x, dy = py - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best.d2) best = { x: n.x, y: n.y, d2 };
    }
    return best;
}

function __placeInWater(preferredX, preferredY, maxTries = 40) {
    // 1) keep preferred if already valid water
    if (isInWater(preferredX, preferredY)) return { x: preferredX, y: preferredY };

    // 2) snap to nearest river centerline (best for "random buoy on land" issues)
    let best = null;
    for (const key in RIVERS) {
        const river = RIVERS[key];
        const snapped = __snapPointToRiver(preferredX, preferredY, river);
        if (!best || snapped.d2 < best.d2) best = { river, snapped };
    }
    if (best) {
        // jitter inside safe river core
        const r = best.river;
        const jitter = (r.width * 0.25);
        for (let i = 0; i < 10; i++) {
            const x = best.snapped.x + (Math.random() - 0.5) * jitter;
            const y = best.snapped.y + (Math.random() - 0.5) * jitter;
            if (isInWater(x, y)) return { x, y };
        }
        // worst-case: exact snapped point
        if (isInWater(best.snapped.x, best.snapped.y)) return { x: best.snapped.x, y: best.snapped.y };
    }

    // 3) random fallback in ocean/harbor until we find water
    for (let i = 0; i < maxTries; i++) {
        const x = (Math.random() < 0.5)
            ? (HARBOR.width * 0.5 + Math.random() * (HARBOR.width * 0.45))
            : (OCEAN.x + 200 + Math.random() * (OCEAN.width - 400));
        const y = 200 + Math.random() * (WORLD.height - 400);
        if (isInWater(x, y)) return { x, y };
    }

    // last resort: put it in middle of harbor water
    return { x: HARBOR.width * 0.5, y: WORLD.height * 0.5 };
}

// Environmental objects generated per area
let regionFeatures = [];

function generateRegionFeatures() {
    regionFeatures = [];

    // Just a few buoys - spread out for bigger map
    const buoyPositions = [
        { x: 2500, y: 2000 }, { x: 3500, y: 2100 },
        { x: 3700, y: 2900 }, { x: 2400, y: 3000 },
        { x: 1700, y: 2500 }, { x: 4300, y: 2500 }
    ];
    buoyPositions.forEach((pos, i) => {
        const p = __placeInWater(pos.x, pos.y);
        regionFeatures.push({
            type: 'buoy',
            x: p.x,
            y: p.y,
            color: i % 2 === 0 ? '#e74c3c' : '#27ae60'
        });
    });

    // 2 oil platforms in industrial zone
    regionFeatures.push({ type: 'oilPlatform', x: 1500, y: 1200, hasFlame: true });
    regionFeatures.push({ type: 'oilPlatform', x: 4500, y: 3600, hasFlame: true });

    // 2 lighthouses at edges
    regionFeatures.push({ type: 'lighthouse', x: 500, y: 600 });
    regionFeatures.push({ type: 'lighthouse', x: 5500, y: 3400 });
}

// Alias for compatibility
const REGIONS = JOB_TIERS;

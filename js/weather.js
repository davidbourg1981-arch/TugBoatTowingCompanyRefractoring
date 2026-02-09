/* ==========================================
   WEATHER MODULE
   Weather cycles, physics effects, and rendering
   ========================================== */

function changeWeather() {
    console.log('changeWeather called, WEATHER_TYPES:', typeof WEATHER_TYPES, WEATHER_TYPES);
    const weatherSystemTypes = Object.values(WEATHER_TYPES);
    const region = getCurrentRegion(); // Depends on world.js

    // Weight weatherSystem by region - later regions have worse weatherSystem
    let weights;
    if (career.currentRegion === 0) {
        weights = [0.6, 0.2, 0.15, 0.05, 0]; // Starter: mostly clear
    } else if (career.currentRegion <= 2) {
        weights = [0.35, 0.25, 0.2, 0.15, 0.05]; // Mid: mixed
    } else {
        weights = [0.2, 0.2, 0.2, 0.25, 0.15]; // Late: more storms
    }

    // Pick weatherSystem based on weights
    const rand = Math.random();
    let sum = 0;
    let newWeather = WEATHER_TYPES.CLEAR;
    for (let i = 0; i < weatherSystemTypes.length; i++) {
        sum += weights[i];
        if (rand < sum) {
            newWeather = weatherSystemTypes[i];
            break;
        }
    }

    weatherSystem.current = newWeather;
    weatherSystem.windAngle = Math.random() * Math.PI * 2;
    weatherSystem.windTarget = weatherSystem.windAngle;

    const [minDur, maxDur] = newWeather.duration;
    weatherSystem.timeRemaining = minDur + Math.random() * (maxDur - minDur);

    // Initialize raindrops if raining
    if (newWeather === WEATHER_TYPES.RAIN || newWeather === WEATHER_TYPES.STORM) {
        weatherSystem.raindrops = [];
        const count = newWeather === WEATHER_TYPES.STORM ? 150 : 80;
        for (let i = 0; i < count; i++) {
            weatherSystem.raindrops.push({
                x: Math.random() * VIEW.width,
                y: Math.random() * VIEW.height,
                speed: 8 + Math.random() * 6,
                length: 10 + Math.random() * 15
            });
        }
    } else {
        weatherSystem.raindrops = [];
    }

    // Show weatherSystem change notification
    if (gameStarted && newWeather !== WEATHER_TYPES.CLEAR) {
        showEvent('rival', `${newWeather.icon} ${newWeather.name} Weather!`,
            `${Math.round((newWeather.payBonus - 1) * 100)}% bonus pay`);
    }

    if (typeof updateWeatherUI === 'function') updateWeatherUI();
}

function updateWeather(delta = 1) {
    weatherSystem.timeRemaining -= delta;

    if (weatherSystem.timeRemaining <= 0) {
        changeWeather();
    }

    // Slowly shift wind direction
    if (Math.random() < 0.01 * delta) {
        weatherSystem.windTarget = weatherSystem.windAngle + (Math.random() - 0.5) * 0.5;
    }
    weatherSystem.windAngle += (weatherSystem.windTarget - weatherSystem.windAngle) * 0.01 * delta;

    // Lightning flashes in storms
    if (weatherSystem.current === WEATHER_TYPES.STORM) {
        if (weatherSystem.lightning > 0) weatherSystem.lightning -= delta;
        if (Math.random() < 0.003 * delta) {
            weatherSystem.lightning = 8;
            // Thunder sound could go here
        }
    }

    // Update raindrops
    for (const drop of weatherSystem.raindrops) {
        drop.y += drop.speed * delta;
        drop.x += weatherSystem.current.windStrength * 100 * delta;
        if (drop.y > VIEW.height) {
            drop.y = -drop.length;
            drop.x = Math.random() * VIEW.width;
        }
        if (drop.x > VIEW.width) drop.x = 0;
        if (drop.x < 0) drop.x = VIEW.width;
    }
}

function applyWeatherPhysics(obj, delta = 1) {
    const w = weatherSystem.current;

    // Apply wind
    if (w.windStrength > 0) {
        obj.vx += Math.cos(weatherSystem.windAngle) * w.windStrength * delta;
        obj.vy += Math.sin(weatherSystem.windAngle) * w.windStrength * delta;
    }

    // Apply currents
    for (const current of weatherSystem.currents) {
        const dx = obj.x - current.x;
        const dy = obj.y - current.y;
        const dist = Math.hypot(dx, dy);

        if (dist < current.radius) {
            // Stronger effect toward center
            const strength = current.strength * (1 - dist / current.radius);
            // Weather multiplies current strength
            const weatherSystemMult = 1 + w.currentStrength * 10;
            obj.vx += Math.cos(current.angle) * strength * weatherSystemMult * delta;
            obj.vy += Math.sin(current.angle) * strength * weatherSystemMult * delta;
        }
    }
}

function drawWeatherEffects() {
    if (__safeMode) return;
    if (!options.weatherSystemFx) return;
    const w = weatherSystem.current;

    // Fog overlay
    if (w.visibility < 1.0) {
        const fogAlpha = 1 - w.visibility;

        // Create radial gradient centered on player for fog
        const playerScreenX = tugboat.x - camera.x;
        const playerScreenY = tugboat.y - camera.y;

        const gradient = ctx.createRadialGradient(
            playerScreenX, playerScreenY, 50,
            playerScreenX, playerScreenY, 250
        );
        gradient.addColorStop(0, `rgba(180, 200, 220, 0)`);
        gradient.addColorStop(0.5, `rgba(180, 200, 220, ${fogAlpha * 0.5})`);
        gradient.addColorStop(1, `rgba(180, 200, 220, ${fogAlpha * 0.85})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }

    // Rain
    if (weatherSystem.raindrops.length > 0) {
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const drop of weatherSystem.raindrops) {
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x - weatherSystem.current.windStrength * 30, drop.y + drop.length);
        }
        ctx.stroke();
    }

    // Lightning flash
    if (weatherSystem.lightning > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${weatherSystem.lightning * 0.08})`;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }

    // Darken screen slightly for rain/storm
    if (w === WEATHER_TYPES.RAIN) {
        ctx.fillStyle = 'rgba(0, 20, 40, 0.15)';
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    } else if (w === WEATHER_TYPES.STORM) {
        ctx.fillStyle = 'rgba(0, 10, 30, 0.25)';
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
}

function drawCurrents() {
    // Calculate visible area accounting for zoom
    const viewW = VIEW.width / zoom.level;
    const viewH = VIEW.height / zoom.level;

    // Draw current indicators on water (in world space)
    ctx.globalAlpha = 0.3;
    for (const current of weatherSystem.currents) {
        // Skip if off screen
        if (current.x < camera.x - current.radius || current.x > camera.x + viewW + current.radius ||
            current.y < camera.y - current.radius || current.y > camera.y + viewH + current.radius) continue;

        // Draw flow arrows in world coordinates
        const arrowCount = 5;
        for (let i = 0; i < arrowCount; i++) {
            const angle = (i / arrowCount) * Math.PI * 2;
            const dist = current.radius * 0.5;
            const ax = current.x + Math.cos(angle) * dist;
            const ay = current.y + Math.sin(angle) * dist;

            // Animated offset based on time
            const offset = (game.time * 0.05) % 30;
            const arrowX = ax + Math.cos(current.angle) * offset;
            const arrowY = ay + Math.sin(current.angle) * offset;

            ctx.save();
            ctx.translate(arrowX, arrowY);
            ctx.rotate(current.angle);

            ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.lineTo(8, 0);
            ctx.lineTo(4, -4);
            ctx.moveTo(8, 0);
            ctx.lineTo(4, 4);
            ctx.stroke();

            ctx.restore();
        }
    }
    ctx.globalAlpha = 1;
}

function drawWindIndicator() {
    const indicator = document.getElementById('windIndicator');
    const arrow = document.getElementById('windArrow');
    const icon = document.getElementById('windIcon');

    if (weatherSystem.current.windStrength <= 0) {
        indicator.style.display = 'none';
        return;
    }

    indicator.style.display = 'flex';
    // Convert radians to degrees for CSS rotation
    const degrees = (weatherSystem.windAngle * 180 / Math.PI);
    arrow.style.transform = `rotate(${degrees}deg)`;
    icon.innerHTML = weatherSystem.current.icon;
}

function updateWeatherUI() {
    const el = document.getElementById('weatherSystemDisplay');
    if (el) {
        el.innerHTML = `${weatherSystem.current.icon} ${weatherSystem.current.name}`;
        el.style.color = weatherSystem.current.payBonus > 1 ? '#ffd700' : '#7aa8cc';
    }
}

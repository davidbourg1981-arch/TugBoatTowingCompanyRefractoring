// ==========================================
// INPUT SYSTEM
// Handles Keyboard, Touch, and Gamepad
// ==========================================

// Initialize listeners
function initInput() {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mobile controls
    if (typeof initMobileControls === 'function') {
        initMobileControls();
    }
}

// Keyboard Generators used in computeControls are checking this global 'keys' object
// We need to ensure 'keys' is globally available or exported from state.js
// It seems 'keys' was a global. We should check state.js or define it here if it's transient.

// Handle Key Down
function handleKeyDown(e) {
    if (e.repeat) return;
    // Prevent scrolling with arrows/space if game is focused
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }

    keys[e.code] = true;

    // Global toggles
    if (e.code === 'KeyM') toggleMinimapOption();
    if (e.code === 'KeyP') game.paused = !game.paused;
    // F3 Debug moved to main loop or kept here?
    if (e.code === 'F3') {
        e.preventDefault();
        debugMode = !debugMode;
        document.getElementById('debugHud').style.display = debugMode ? 'block' : 'none';
    }
}

function handleKeyUp(e) {
    keys[e.code] = false;

    if (!gameStarted) return;

    // Actions on release or press? Usually press, but let's see.
    // The original code likely checked 'keys' array in the loop.
    // But we have 'justPressed' logic for Gamepad. 
    // For keyboard, we usually check valid inputs in the loop.

    // Checking keybinds for actions that are "trigger" based (like attach)
    // Usually handled in computeControls or a specific check function.

    if (isKeyBound('attach')(e.code)) toggleAttachment();
    if (isKeyBound('horn')(e.code)) playSound('horn');
    if (isKeyBound('refuel')(e.code)) refuel();
    if (isKeyBound('repair')(e.code)) repair();
    if (isKeyBound('leaderboard')(e.code)) toggleLeaderboard();
}


// Mobile Input State
let mobileThrust = 0;
let mobileTurn = 0;
let joystickActive = false;
let joystickTouchId = null; // Track specific finger

function initMobileControls() {
    const base = document.getElementById('joystickBase');
    const knob = document.getElementById('joystickKnob');
    if (!base || !knob) return;

    const baseRect = base.getBoundingClientRect();
    const centerX = baseRect.width / 2;
    const centerY = baseRect.height / 2;
    const maxRadius = baseRect.width / 2;

    function handleJoystick(e) {
        if (!joystickActive) return;

        // Find the touch that started the joystick interaction
        let touch = null;
        if (e.touches) {
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === joystickTouchId) {
                    touch = e.touches[i];
                    break;
                }
            }
        } else {
            touch = e; // Mouse fallback
        }

        if (!touch) return; // Our finger isn't here anymore?

        if (e.preventDefault && typeof e.preventDefault === 'function') {
            e.preventDefault(); // Stop scrolling
        }

        // Update rect in case of scroll/resize (though it should be fixed)
        const rect = base.getBoundingClientRect();
        const x = touch.clientX - rect.left - centerX;
        const y = touch.clientY - rect.top - centerY;

        const dist = Math.hypot(x, y);
        const angle = Math.atan2(y, x);
        const clampedDist = Math.min(dist, maxRadius);

        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

        // Convert to thrust/turn
        // y is negative for forward (up)

        // DEADZONE: Ignore small movements near center (15% of radius)
        const deadzone = 0.15;
        const normalizedDist = clampedDist / maxRadius;

        if (normalizedDist < deadzone) {
            mobileThrust = 0;
            mobileTurn = 0;
        } else {
            // Scale output from 0 to 1 starting AFTER deadzone
            const scaledDist = (normalizedDist - deadzone) / (1 - deadzone);

            // Calculate components based on angle and scaled distance
            // We re-calculate based on angle to keep direction accurate
            const normY = (Math.sin(angle) * scaledDist); // -1 to 1
            const normX = (Math.cos(angle) * scaledDist); // -1 to 1

            mobileThrust = -normY;
            mobileThrust = Math.max(-0.5, Math.min(1, mobileThrust));

            mobileTurn = normX;
            mobileTurn = Math.max(-1, Math.min(1, mobileTurn));
        }
    }

    base.addEventListener('touchstart', (e) => {
        e.preventDefault();
        // Use the first changed touch as the joystick controller
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        joystickActive = true;

        handleJoystick({ touches: [touch] }); // Artificial event to update immediately

        if (typeof audioCtx !== 'undefined' && !audioCtx && gameStarted) {
            if (typeof initAudio === 'function') initAudio();
            if (typeof startEngine === 'function') startEngine();
        }
    }, { passive: false });

    window.addEventListener('touchmove', handleJoystick, { passive: false });

    window.addEventListener('touchend', (e) => {
        if (!joystickActive) return;

        // Check if our joystick finger lifted
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId) {
                joystickActive = false;
                joystickTouchId = null;
                mobileThrust = 0;
                mobileTurn = 0;
                knob.style.transform = 'translate(-50%, -50%)';
                break;
            }
        }
    });

    // Action Buttons
    document.getElementById('mobileAttach')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameStarted) toggleAttachment();
    });
    document.getElementById('mobileHorn')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameStarted) playSound('horn');
    });
    document.getElementById('mobileRefuel')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameStarted) refuel();
    });
    document.getElementById('mobileRepair')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameStarted) repair();
    });
    // Fullscreen button
    document.getElementById('mobileFullscreen')?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleFullscreen();
    });


    // Auto-show mobile controls if touch device detected
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.getElementById('mobileControls')?.classList.add('show');
    }
}

function computeControls(delta) {
    let thrust = 0, turn = 0;

    // Keyboard input
    const pressUp = (keys[currentKeybinds.up] || keys['ArrowUp']);
    const pressDown = (keys[currentKeybinds.down] || keys['ArrowDown']);

    if (pressUp && pressDown) thrust = 0;
    else if (pressUp && tugboat.fuel > 0) thrust = 1;
    else if (pressDown && tugboat.fuel > 0) thrust = -0.5;
    if (keys[currentKeybinds.left] || keys['ArrowLeft']) turn = -1;
    if (keys[currentKeybinds.right] || keys['ArrowRight']) turn = 1;

    // Merge with mobile input
    if (Math.abs(mobileThrust) > Math.abs(thrust)) thrust = mobileThrust;
    if (Math.abs(mobileTurn) > Math.abs(turn)) turn = mobileTurn;

    // Gamepad input (merged with keyboard)
    if (gamepadState && gamepadState.connected && tugboat.fuel > 0) {
        thrust = Math.abs(gamepadState.throttle) > 0.001 ? gamepadState.throttle : thrust;
        turn = Math.abs(gamepadState.steer) > 0.001 ? gamepadState.steer : turn;

        // Gameplay buttons (only when game is running and no modal panels are open)
        const modalOpen =
            document.getElementById('optionsPanel')?.classList.contains('show') ||
            document.getElementById('licensePanel')?.classList.contains('show') ||
            document.getElementById('boatShopPanel')?.classList.contains('show') ||
            document.getElementById('careerPanel')?.classList.contains('show') ||
            document.getElementById('remapPanel')?.classList.contains('show');

        if (!modalOpen && gameStarted) {
            // A = tow attach/detach
            if (gamepadState.justPressed.has(0)) toggleAttachment();
            // X = horn
            if (gamepadState.justPressed.has(2)) playSound('horn');
            // Y = leaderboard toggle
            if (gamepadState.justPressed.has(3)) toggleLeaderboard();
            // LB/RB = refuel/repair
            if (gamepadState.justPressed.has(4)) refuel();
            if (gamepadState.justPressed.has(5)) repair();
        }
    }

    // Input smoothing (ramp throttle & steer so it feels expensive)
    const dtSec = delta / 60;
    if (tugboat.ctrlThrust === undefined) tugboat.ctrlThrust = 0;
    if (tugboat.ctrlTurn === undefined) tugboat.ctrlTurn = 0;

    const thrustUpRate = 2.5;   // units per second
    const thrustDownRate = 4.0; // faster release
    const turnRate = 7.0;       // units per second

    const desiredThrust = Math.max(-0.5, Math.min(1, thrust));
    const desiredTurn = Math.max(-1, Math.min(1, turn));

    const thrustRate = Math.abs(desiredThrust) > Math.abs(tugboat.ctrlThrust) ? thrustUpRate : thrustDownRate;
    const thrustStep = thrustRate * dtSec;
    tugboat.ctrlThrust += Math.max(-thrustStep, Math.min(thrustStep, desiredThrust - tugboat.ctrlThrust));

    const turnStep = turnRate * dtSec;
    tugboat.ctrlTurn += Math.max(-turnStep, Math.min(turnStep, desiredTurn - tugboat.ctrlTurn));

    // Tugboat feel: pivot harder at low speed, allow more drift at speed
    const speed = Math.hypot(tugboat.vx, tugboat.vy);
    const speed01 = Math.max(0, Math.min(1, speed / (tugboat.maxSpeed || 12)));

    // stronger turning when slow, softer at high speed
    const lowSpeedPivotBoost = 1.25 - 0.45 * speed01; // ~1.25 at 0 speed, ~0.8 at max
    thrust = tugboat.ctrlThrust;
    // Throttle curve: finer control near center, still hits full power at max
    const thrustMag = Math.min(1, Math.abs(thrust));
    thrust = Math.sign(thrust) * Math.pow(thrustMag, 1.35);

    turn = tugboat.ctrlTurn * lowSpeedPivotBoost;
    // Steering curve: soften tiny inputs so it doesn't feel twitchy
    const turnMag = Math.min(1, Math.abs(turn));
    turn = Math.sign(turn) * Math.pow(turnMag, 1.15);

    // "Prop wash": more steering authority when pushing water (thrust applied)
    turn *= (0.78 + 0.42 * Math.min(1, Math.abs(thrust)));

    // Pivot assist: tugboats spin hard at low speed, even with low throttle
    if (speed < 0.9 && Math.abs(thrust) < 0.12) {
        turn *= 1.35;
    }

    // Reverse feels heavier/less responsive (optional realism)
    if (thrust < -0.05) {
        turn *= 0.85;
    }

    return { thrust, turn };
}

// Remap Logic (extracted from game-lib)
function openRemapPanel() {
    if (window.Game && Game.ui && Game.ui.isModalOpen && Game.ui.isModalOpen()) return;
    document.getElementById('remapPanel').classList.add('show');
    updateRemapUI();
}

function closeRemapPanel() {
    document.getElementById('remapPanel').classList.remove('show');
    remapTarget = null;
    document.querySelectorAll('.remap-btn').forEach(btn => btn.classList.remove('listening'));
}

function startRemap(action) {
    remapTarget = action;
    document.querySelectorAll('.remap-btn').forEach(btn => btn.classList.remove('listening'));
    document.getElementById('remap' + action.charAt(0).toUpperCase() + action.slice(1)).classList.add('listening');
}

function getKeyDisplayName(code) {
    if (code === 'Space') return 'SPACE';
    if (code.startsWith('Key')) return code.substring(3);
    if (code.startsWith('Arrow')) return 'â†‘â†“â† â†’'['UpDownLeftRight'.indexOf(code.substring(5)) / 2] || code.substring(5);
    if (code.startsWith('Digit')) return code.substring(5);
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
    if (code === 'ControlLeft' || code === 'ControlRight') return 'CTRL';
    if (code === 'AltLeft' || code === 'AltRight') return 'ALT';
    return code;
}

function updateRemapUI() {
    document.getElementById('remapUp').textContent = getKeyDisplayName(currentKeybinds.up);
    document.getElementById('remapDown').textContent = getKeyDisplayName(currentKeybinds.down);
    document.getElementById('remapLeft').textContent = getKeyDisplayName(currentKeybinds.left);
    document.getElementById('remapRight').textContent = getKeyDisplayName(currentKeybinds.right);
    document.getElementById('remapAttach').textContent = getKeyDisplayName(currentKeybinds.attach);
    document.getElementById('remapRefuel').textContent = getKeyDisplayName(currentKeybinds.refuel);
    document.getElementById('remapRepair').textContent = getKeyDisplayName(currentKeybinds.repair);
    document.getElementById('remapHorn').textContent = getKeyDisplayName(currentKeybinds.horn);
    document.getElementById('remapLeaderboard').textContent = getKeyDisplayName(currentKeybinds.leaderboard);

    // Update controls display in options
    document.getElementById('keyUp').textContent = getKeyDisplayName(currentKeybinds.up);
    document.getElementById('keyDown').textContent = getKeyDisplayName(currentKeybinds.down);
    document.getElementById('keyLeft').textContent = getKeyDisplayName(currentKeybinds.left);
    document.getElementById('keyRight').textContent = getKeyDisplayName(currentKeybinds.right);
    document.getElementById('keyAttach').textContent = getKeyDisplayName(currentKeybinds.attach);
    document.getElementById('keyRefuel').textContent = getKeyDisplayName(currentKeybinds.refuel);
    document.getElementById('keyRepair').textContent = getKeyDisplayName(currentKeybinds.repair);
    document.getElementById('keyHorn').textContent = getKeyDisplayName(currentKeybinds.horn);
    document.getElementById('keyLeaderboard').textContent = getKeyDisplayName(currentKeybinds.leaderboard);
}

function resetKeybinds() {
    currentKeybinds = { ...defaultKeybinds };
    updateRemapUI();
}

function isKeyBound(action) {
    return (code) => code === currentKeybinds[action] ||
        (action === 'up' && code === 'ArrowUp') ||
        (action === 'down' && code === 'ArrowDown') ||
        (action === 'left' && code === 'ArrowLeft') ||
        (action === 'right' && code === 'ArrowRight');
}

// Initialize input immediately
initInput();

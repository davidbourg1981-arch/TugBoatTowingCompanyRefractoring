/* ==========================================
   AUDIO MODULE
   Sound effects and engine noise
   ========================================== */

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = true;
let masterVolume = 0.7;

// Engine sound state
let engineOsc = null;
let engineGain = null;
let engineRunning = false;

function initAudio() {
    try {
        if (!audioCtx) {
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(err => {
                console.log('Audio resume deferred:', err);
            });
        }
    } catch (e) {
        console.warn('Audio initialization failed:', e);
    }
}

function startEngine() {
    if (!soundEnabled || (window.options && !options.engineSound) || !audioCtx || engineRunning) return;
    engineOsc = audioCtx.createOscillator();
    engineGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(45, audioCtx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, audioCtx.currentTime);
    engineGain.gain.setValueAtTime(0, audioCtx.currentTime);

    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
    engineRunning = true;
}

function updateEngineSound(throttle, speed) {
    if (!engineGain || !engineOsc || !soundEnabled || (window.options && !options.engineSound)) return;
    const targetGain = throttle > 0 ? 0.08 * masterVolume : 0;
    const targetFreq = 40 + speed * 8 + throttle * 15;
    try {
        engineGain.gain.linearRampToValueAtTime(targetGain, audioCtx.currentTime + 0.1);
        engineOsc.frequency.linearRampToValueAtTime(targetFreq, audioCtx.currentTime + 0.1);
    } catch (e) { }
}

function stopEngine() {
    if (engineOsc) {
        try {
            engineGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
        } catch (e) { }
        setTimeout(() => {
            if (engineOsc) {
                try { engineOsc.stop(); } catch (e) { }
                engineOsc = null;
                engineRunning = false;
            }
        }, 250);
    }
}

function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    if (window.options && !options.sound) return; // double check option

    const vol = masterVolume;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    switch (type) {
        case 'attach':
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
            gain.gain.setValueAtTime(0.15 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;

        case 'detach':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.1 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
            break;

        case 'money':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.setValueAtTime(1000, now + 0.05);
            osc.frequency.setValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.1 * vol, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;

        case 'horn':
            // Dual tone horn
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);

            osc.type = 'sawtooth';
            osc2.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now);
            osc2.frequency.setValueAtTime(165, now); // perfect fifth

            gain.gain.setValueAtTime(0.25 * vol, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.8);
            gain2.gain.setValueAtTime(0.2 * vol, now);
            gain2.gain.linearRampToValueAtTime(0, now + 0.8);

            osc.start(now);
            osc.stop(now + 0.8);
            osc2.start(now);
            osc2.stop(now + 0.8);
            break;

        case 'collision':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
            gain.gain.setValueAtTime(0.2 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;

        case 'fail':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.4);
            gain.gain.setValueAtTime(0.15 * vol, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;

        case 'refuel':
            // Liquid sound simulation using filter
            const noise = audioCtx.createBufferSource();
            const bufferSize = audioCtx.sampleRate * 0.5;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            noise.buffer = buffer;

            const noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(400, now);
            noiseFilter.frequency.linearRampToValueAtTime(800, now + 0.5);

            noise.connect(noiseFilter);
            noiseFilter.connect(gain);
            gain.gain.setValueAtTime(0.15 * vol, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);

            noise.start(now);
            break;

        case 'success':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554, now + 0.1); // C#
            osc.frequency.setValueAtTime(659, now + 0.2); // E
            gain.gain.setValueAtTime(0.1 * vol, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;

        case 'warning':
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(0, now + 0.1); // Pulse
            osc.frequency.setValueAtTime(440, now + 0.2);
            gain.gain.setValueAtTime(0.1 * vol, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;

        case 'splash':
            // White noise burst
            const sBuff = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
            const sData = sBuff.getChannelData(0);
            for (let i = 0; i < sBuff.length; i++) sData[i] = (Math.random() * 2 - 1) * (1 - i / sBuff.length);
            const sSrc = audioCtx.createBufferSource();
            sSrc.buffer = sBuff;
            const sFilt = audioCtx.createBiquadFilter();
            sFilt.type = 'lowpass';
            sFilt.frequency.value = 1000;
            sSrc.connect(sFilt);
            sFilt.connect(gain);
            gain.gain.value = 0.15 * vol;
            sSrc.start(now);
            break;

        case 'uiSelect':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            gain.gain.setValueAtTime(0.05 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;

        case 'uiMove':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.02 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.03);
            break;

        case 'uiBack':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(330, now);
            gain.gain.setValueAtTime(0.05 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
            break;
    }
}

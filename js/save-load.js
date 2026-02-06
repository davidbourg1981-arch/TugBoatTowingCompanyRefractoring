/* ==========================================
   SAVE/LOAD MODULE
   Persistence using localStorage
   ========================================== */

const SAVE_PREFIX = 'tugboat_save_';

// Save system configuration (used by game-render.js for profiles)
const SAVE_SYS = {
    version: 2,           // Save data format version
    slots: 4,             // Number of save slots available
    activeKey: 'tugboat_active_slot'  // localStorage key for active slot
};

function saveToSlot(slotIndex = 0) {
    const saveObj = {
        version: 1,
        timestamp: Date.now(),
        difficulty: _selectedDifficultyKey || 'normal',
        game: {
            money: game.money,
            jobsDone: game.jobsDone,
            time: game.time
        },
        career: { ...career },
        licenses: { ...licenses },
        tugboat: {
            currentBoat: tugboat.currentBoat,
            ownedBoats: tugboat.ownedBoats,
            fuel: tugboat.fuel,
            health: tugboat.health,
            // We don't save position to avoid stuck-on-load issues, starts at harbor
        },
        options: { ...options }
    };

    try {
        localStorage.setItem(SAVE_PREFIX + slotIndex, JSON.stringify(saveObj));
        // console.log('Game saved to slot ' + slotIndex);
        if (typeof showEvent === 'function') {
            // Optional: show event 'Game Saved'
        }
    } catch (e) {
        console.error('Save failed:', e);
    }
}

function loadFromSlot(slotIndex = 0) {
    try {
        const json = localStorage.getItem(SAVE_PREFIX + slotIndex);
        if (!json) return false;

        const data = JSON.parse(json);

        // Restore difficulty
        if (data.difficulty && DIFFICULTY[data.difficulty]) {
            currentDifficulty = DIFFICULTY[data.difficulty];
            // If variable exists in global scope
            if (typeof _selectedDifficultyKey !== 'undefined') _selectedDifficultyKey = data.difficulty;
        }

        // Restore game Stats
        if (data.game) {
            game.money = data.game.money;
            game.jobsDone = data.game.jobsDone;
            game.time = data.game.time;
        }

        // Restore career
        if (data.career) {
            Object.assign(career, data.career);
        }

        // Restore licenses
        if (data.licenses) {
            Object.assign(licenses, data.licenses);
        }

        // Restore tugboat
        if (data.tugboat) {
            tugboat.currentBoat = data.tugboat.currentBoat;
            if (data.tugboat.ownedBoats) tugboat.ownedBoats = data.tugboat.ownedBoats;
            tugboat.fuel = data.tugboat.fuel;
            tugboat.health = data.tugboat.health;
        }

        // Restore options
        if (data.options) {
            Object.assign(options, data.options);
            // Trigger update UI for options if needed
            if (typeof updateOptionsUI === 'function') updateOptionsUI();
        }

        return true;
    } catch (e) {
        console.error('Load failed:', e);
        return false;
    }
}

function hasSaveInSlot(slotIndex = 0) {
    return !!localStorage.getItem(SAVE_PREFIX + slotIndex);
}

function deleteSaveSlot(slotIndex = 0) {
    localStorage.removeItem(SAVE_PREFIX + slotIndex);
}

function resetProgress() {
    deleteSaveSlot(0);
    location.reload();
}

// Internal helper for usage in game-render.js
function _saveKey(slot) { return SAVE_PREFIX + slot; }

// Get profile name for a slot
function getProfileName(slot) {
    try {
        const json = localStorage.getItem(SAVE_PREFIX + slot);
        if (json) {
            const data = JSON.parse(json);
            if (data.profileName) return data.profileName;
        }
    } catch (e) { }
    return `Profile ${slot}`;
}

// Wrap important progression functions to autosave after changes.
function _wrapAutosave(fnName, reason) {
    try {
        const fn = window[fnName];
        if (typeof fn !== 'function') return;
        if (fn.__autosaveWrapped) return;
        const wrapped = function (...args) {
            const r = fn.apply(this, args);
            // defer so any state changes finish first
            setTimeout(() => {
                if (typeof triggerAutosave === 'function') triggerAutosave(reason || fnName);
                else if (typeof saveToSlot === 'function' && typeof activeSaveSlot !== 'undefined') saveToSlot(activeSaveSlot);
            }, 0);
            return r;
        };
        wrapped.__autosaveWrapped = true;
        window[fnName] = wrapped;
    } catch (e) { }
}

const STORAGE_KEY = 'primal-ruin.settings.v1';
const QUARANTINE_KEY = 'primal-ruin.settings.quarantine';
const SETTINGS_VERSION = 1;
const SPEEDS = [0, 0.5, 1, 2];
const DEFAULTS = { audio: true, animationSpeed: 1 };
const KNOWN_KEYS = new Set(['version', 'audio', 'animationSpeed']);
let settings = { ...DEFAULTS };

export function readSettingsPayload(serialized) {
    if (!serialized) {
        return {
            ok: true,
            empty: true,
            settings: { ...DEFAULTS },
            version: SETTINGS_VERSION,
            extras: {}
        };
    }
    let stored;
    try {
        stored = JSON.parse(serialized);
    } catch {
        return { ok: false, reason: 'json' };
    }
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
        return { ok: false, reason: 'shape' };
    }
    const version = Object.hasOwn(stored, 'version') ? stored.version : SETTINGS_VERSION;
    if (!Number.isInteger(version) || version < 1) return { ok: false, reason: 'version' };
    const extras = {};
    for (const [key, value] of Object.entries(stored)) {
        if (!KNOWN_KEYS.has(key)) extras[key] = value;
    }
    return {
        ok: true,
        empty: false,
        settings: {
            audio: typeof stored.audio === 'boolean' ? stored.audio : DEFAULTS.audio,
            animationSpeed: SPEEDS.includes(stored.animationSpeed)
                ? stored.animationSpeed
                : DEFAULTS.animationSpeed
        },
        version: Math.max(version, SETTINGS_VERSION),
        extras
    };
}

export function serializeSettingsRecord(version, current, extras = {}) {
    return JSON.stringify({
        version,
        ...extras,
        audio: current.audio,
        animationSpeed: current.animationSpeed
    });
}

function quarantineSettings(serialized, reason) {
    if (!serialized) return;
    try {
        localStorage.setItem(
            QUARANTINE_KEY,
            JSON.stringify({
                quarantinedAt: new Date().toISOString(),
                reason,
                payload: serialized
            })
        );
    } catch (error) {
        console.error('Impossibile mettere da parte le impostazioni illeggibili.', error);
    }
}

export function getSettings() {
    return settings;
}

export function initSettings() {
    const audioToggle = document.getElementById('settings-audio');
    const speedSelect = document.getElementById('settings-animation-speed');
    const status = document.getElementById('settings-status');
    let record = {
        settings: { ...DEFAULTS },
        version: SETTINGS_VERSION,
        extras: {}
    };
    let warning = '';
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        const parsed = readSettingsPayload(serialized);
        if (!parsed.ok) {
            quarantineSettings(serialized, parsed.reason);
            warning =
                'Impostazioni salvate illeggibili; uso i valori predefiniti. La copia precedente è stata messa da parte.';
        } else {
            record = parsed;
        }
    } catch (error) {
        console.error('Impossibile leggere le impostazioni salvate.', error);
        warning = 'Impostazioni salvate illeggibili; uso i valori predefiniti.';
    }
    settings = { ...record.settings };

    function persist(announce) {
        settings = {
            audio: audioToggle.checked,
            animationSpeed: Number(speedSelect.value)
        };
        document.documentElement.style.setProperty(
            '--animation-duration',
            `${settings.animationSpeed * 180}ms`
        );
        try {
            localStorage.setItem(
                STORAGE_KEY,
                serializeSettingsRecord(record.version, settings, record.extras)
            );
            if (announce) status.textContent = 'Impostazioni salvate.';
        } catch (error) {
            status.textContent = `Impossibile salvare le impostazioni: ${error.message}`;
            console.error('Impossibile salvare le impostazioni.', error);
        }
    }

    audioToggle.checked = settings.audio;
    speedSelect.value = String(settings.animationSpeed);
    if (warning) status.textContent = warning;
    persist(false);
    audioToggle.addEventListener('change', () => persist(true));
    speedSelect.addEventListener('change', () => persist(true));
}

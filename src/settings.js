const STORAGE_KEY = 'primal-ruin.settings.v1';
const DEFAULTS = { audio: true, animationSpeed: 1 };
let settings = { ...DEFAULTS };

export function getSettings() {
    return settings;
}

export function initSettings() {
    const audioToggle = document.getElementById('settings-audio');
    const speedSelect = document.getElementById('settings-animation-speed');
    const status = document.getElementById('settings-status');
    let stored;
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        stored = serialized ? JSON.parse(serialized) : null;
    } catch (error) {
        console.error('Impossibile leggere le impostazioni salvate.', error);
        status.textContent = 'Impostazioni salvate illeggibili; uso i valori predefiniti.';
    }
    if (stored && typeof stored === 'object') {
        settings = {
            audio: typeof stored.audio === 'boolean' ? stored.audio : DEFAULTS.audio,
            animationSpeed: [0, 0.5, 1, 2].includes(stored.animationSpeed)
                ? stored.animationSpeed : DEFAULTS.animationSpeed
        };
    }

    function apply() {
        settings = {
            audio: audioToggle.checked,
            animationSpeed: Number(speedSelect.value)
        };
        document.documentElement.style.setProperty(
            '--animation-duration',
            `${settings.animationSpeed * 180}ms`
        );
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            status.textContent = 'Impostazioni salvate.';
        } catch (error) {
            status.textContent = `Impossibile salvare le impostazioni: ${error.message}`;
            console.error('Impossibile salvare le impostazioni.', error);
        }
    }

    audioToggle.checked = settings.audio;
    speedSelect.value = String(settings.animationSpeed);
    apply();
    audioToggle.addEventListener('change', apply);
    speedSelect.addEventListener('change', apply);
}

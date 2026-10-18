const SCREENS = ['intro', 'deck', 'match'];

function screenId(name) {
    if (name === 'match') return 'tavolo';
    return `screen-${name}`;
}

function currentScreen() {
    const hash = location.hash.replace(/^#/, '');
    if (hash === 'tavolo') return 'match';
    return SCREENS.includes(hash) ? hash : 'intro';
}

export function showScreen(name) {
    const target = SCREENS.includes(name) ? name : 'intro';
    for (const screen of SCREENS) {
        const element = document.getElementById(screenId(screen));
        if (!element) continue;
        element.hidden = screen !== target;
    }
    if (location.hash.replace(/^#/, '') !== target) {
        history.replaceState(null, '', `#${target}`);
    }
    if (target === 'match') {
        document.getElementById('tavolo')?.focus({ preventScroll: true });
    }
    return target;
}

export function initScreens() {
    showScreen(currentScreen());
    window.addEventListener('hashchange', () => showScreen(currentScreen()));
}

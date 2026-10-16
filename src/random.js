let state = 1;

export function seedRandom(seed) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
        throw new RangeError('Il seme casuale deve essere un intero unsigned a 32 bit.');
    }
    state = seed || 1;
}

export function nextRandom() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
}

export function getRandomState() {
    return state;
}

export function restoreRandomState(savedState) {
    seedRandom(savedState);
}

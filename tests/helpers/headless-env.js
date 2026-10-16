// Ambiente minimo per importare ed esercitare l'engine (`game.js`) sotto
// `node --test`, senza browser.
//
// Nota: questo harness NON replica il DOM. Fornisce soltanto i globali che
// l'engine tocca durante il setup di una partita (`document.getElementById`
// difensivo, `localStorage`, `crypto.getRandomValues`). L'engine non accede
// al DOM a livello di modulo, quindi l'import non innesca rendering.

class MemoryStorage {
    #values = new Map();

    get length() {
        return this.#values.size;
    }

    getItem(key) {
        return this.#values.has(key) ? this.#values.get(key) : null;
    }

    setItem(key, value) {
        this.#values.set(String(key), String(value));
    }

    removeItem(key) {
        this.#values.delete(key);
    }

    clear() {
        this.#values.clear();
    }

    key(index) {
        return [...this.#values.keys()][index] ?? null;
    }
}

/**
 * Installa i globali minimi richiesti dall'engine e restituisce un controllo
 * sul seed, così che `GameState.reset()` sia riproducibile nei test.
 *
 * @param {{ seed?: number }} [options]
 */
export function installHeadlessEnvironment({ seed = 1 } = {}) {
    let currentSeed = seed >>> 0;

    // `crypto` e `localStorage` sono proprietà con solo getter nei Node recenti:
    // vanno ridefinite con `defineProperty`, non assegnate.
    const define = (name, value) => Object.defineProperty(globalThis, name, {
        value,
        writable: true,
        configurable: true
    });

    define('localStorage', new MemoryStorage());
    define('window', globalThis);
    define('document', {
        getElementById: () => null,
        createElement: () => ({
            style: {},
            classList: { add() {}, remove() {}, toggle() {} },
            appendChild() {},
            append() {},
            setAttribute() {},
            addEventListener() {},
            getContext: () => null
        })
    });
    define('crypto', {
        getRandomValues(target) {
            target[0] = currentSeed;
            return target;
        }
    });

    return {
        Storage: MemoryStorage,
        setSeed(next) {
            currentSeed = next >>> 0;
        }
    };
}

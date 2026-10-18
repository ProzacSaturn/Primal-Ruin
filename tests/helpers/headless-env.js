// Ambiente headless per importare ed esercitare l'engine (`game.js`) sotto
// `node --test`, senza browser.
//
// L'engine non accede al DOM a livello di modulo, ma `UIRenderer.refresh()`
// scrive su decine di elementi, quindi i test di flusso hanno bisogno di un DOM
// finto che regga letture e scritture. Il DOM qui sotto NON disegna nulla: le
// canvas restituiscono `getContext() === null` e `drawCardPixelArt` esce
// subito (vedi `src/pixel-art.js`).

class FakeClassList {
    #element;

    constructor(element) {
        this.#element = element;
    }

    #tokens() {
        return new Set(this.#element.className.split(/\s+/).filter(Boolean));
    }

    #write(tokens) {
        this.#element.className = [...tokens].join(' ');
    }

    add(...names) {
        const tokens = this.#tokens();
        names.forEach(name => tokens.add(name));
        this.#write(tokens);
    }

    remove(...names) {
        const tokens = this.#tokens();
        names.forEach(name => tokens.delete(name));
        this.#write(tokens);
    }

    contains(name) {
        return this.#tokens().has(name);
    }

    toggle(name, force) {
        const tokens = this.#tokens();
        const enabled = force === undefined ? !tokens.has(name) : Boolean(force);
        if (enabled) tokens.add(name);
        else tokens.delete(name);
        this.#write(tokens);
        return enabled;
    }
}

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = String(tagName).toUpperCase();
        this.id = '';
        this.className = '';
        this.title = '';
        this.type = '';
        this.value = '';
        this.hidden = false;
        this.disabled = false;
        this.tabIndex = 0;
        this.width = 0;
        this.height = 0;
        this.scrollTop = 0;
        this.scrollHeight = 0;
        this.style = {};
        this.dataset = {};
        this.attributes = new Map();
        this.listeners = new Map();
        this.childNodes = [];
        this.parentNode = null;
        this.classList = new FakeClassList(this);
        this.#text = '';
    }

    #text;

    get textContent() {
        return this.#text;
    }

    // Nel DOM reale assegnare `textContent` elimina i figli: qui si replica,
    // perché `renderSlot` alterna `textContent` e `append`.
    set textContent(value) {
        this.#text = String(value);
        this.childNodes = [];
    }

    get children() {
        return this.childNodes;
    }

    get firstElementChild() {
        return this.childNodes[0] ?? null;
    }

    append(...nodes) {
        nodes.forEach(node => this.appendChild(node));
    }

    appendChild(node) {
        if (node && typeof node === 'object') node.parentNode = this;
        this.childNodes.push(node);
        return node;
    }

    replaceChildren(...nodes) {
        this.childNodes = [];
        this.append(...nodes);
    }

    remove() {
        if (!this.parentNode) return;
        const index = this.parentNode.childNodes.indexOf(this);
        if (index >= 0) this.parentNode.childNodes.splice(index, 1);
        this.parentNode = null;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.has(name) ? this.attributes.get(name) : null;
    }

    hasAttribute(name) {
        return this.attributes.has(name);
    }

    removeAttribute(name) {
        this.attributes.delete(name);
    }

    addEventListener(type, handler) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(handler);
    }

    removeEventListener(type, handler) {
        this.listeners.get(type)?.delete(handler);
    }

    dispatchEvent(event) {
        for (const handler of this.listeners.get(event?.type) ?? []) handler(event);
        return true;
    }

    click() {
        return this.dispatchEvent({ type: 'click' });
    }

    focus() {}

    blur() {}

    querySelector() {
        return null;
    }

    querySelectorAll() {
        return [];
    }

    // Nessuna canvas reale: `drawCardPixelArt` esce senza disegnare.
    getContext() {
        return null;
    }
}

class FakeDocument {
    constructor() {
        this.elements = new Map();
        this.body = new FakeElement('body');
    }

    createElement(tagName) {
        return new FakeElement(tagName);
    }

    createTextNode(text) {
        return { textContent: String(text) };
    }

    // Gli elementi sono memorizzati per id: l'engine legge selettori di setup e
    // pannelli interattivi che i test possono preimpostare.
    getElementById(id) {
        if (!this.elements.has(id)) {
            const element = new FakeElement('div');
            element.id = id;
            this.elements.set(id, element);
        }
        return this.elements.get(id);
    }

    querySelector() {
        return null;
    }

    querySelectorAll() {
        return [];
    }

    addEventListener() {}

    removeEventListener() {}
}

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
 * Installa i globali richiesti dall'engine e restituisce un controllo su seed,
 * DOM e `localStorage`, così che i test siano riproducibili e ispezionabili.
 *
 * @param {{ seed?: number }} [options]
 */
export function installHeadlessEnvironment({ seed = 1 } = {}) {
    let currentSeed = Number(seed) >>> 0;

    // `crypto` e `localStorage` sono proprietà con solo getter nei Node recenti:
    // vanno ridefinite con `defineProperty`, non assegnate.
    const define = (name, value) => Object.defineProperty(globalThis, name, {
        value,
        writable: true,
        configurable: true
    });

    const document = new FakeDocument();
    const storage = new MemoryStorage();

    define('localStorage', storage);
    define('document', document);
    define('window', globalThis);
    // `window` è `globalThis`: i dialoghi nativi devono esistere per i percorsi
    // che li consultano (es. `resetWithDeck`).
    define('confirm', () => true);
    define('alert', () => {});
    define('crypto', {
        getRandomValues(target) {
            target[0] = currentSeed;
            return target;
        }
    });

    return {
        Storage: MemoryStorage,
        document,
        storage,

        setSeed(next) {
            currentSeed = Number(next) >>> 0;
        },

        setElementValue(id, value) {
            document.getElementById(id).value = String(value);
        },

        elementText(id) {
            return document.getElementById(id).textContent;
        },

        logLines() {
            return document.getElementById('log').childNodes.map(node => node.textContent);
        }
    };
}

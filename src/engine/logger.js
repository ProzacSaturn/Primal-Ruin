const Logger = {
    clear() {
        const logEl = document.getElementById('log');
        if (logEl) logEl.replaceChildren();
    },

    log(message, type = '') {
        const logEl = document.getElementById('log');
        if (!logEl) return;
        const line = document.createElement('div');
        line.textContent = `> ${message}`;
        if (type === 'ferocity') line.style.color = '#ff2a6d';
        logEl.appendChild(line);
        while (logEl.children.length > 100) logEl.firstElementChild.remove();
        logEl.scrollTop = logEl.scrollHeight;
    }
};

export { Logger };

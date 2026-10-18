const PALETTES = {
    'set-1': { sky: '#301a3c', light: '#f5d300', ground: '#8b3f34', shadow: '#180f27', creature: '#ee7652' },
    'set-2': { sky: '#171d3d', light: '#05d9e8', ground: '#464b70', shadow: '#0c1228', creature: '#9da9d6' },
    'set-3': { sky: '#103339', light: '#75f2bd', ground: '#345e46', shadow: '#0a1d25', creature: '#b9eb91' },
    'set-4': { sky: '#1b2448', light: '#f3e6b3', ground: '#6d5a32', shadow: '#10162e', creature: '#f7f1dc' }
};

function hashText(text) {
    let hash = 2166136261;
    for (const character of text) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function randomFrom(seed) {
    let state = seed || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 0x100000000;
    };
}

export function drawCardPixelArt(canvas, card) {
    const context = canvas.getContext('2d');
    if (!context) return false;
    const palette = PALETTES[card.setId] || PALETTES['set-1'];
    const random = randomFrom(hashText(card.catalogId || card.id));
    const width = canvas.width;
    const height = canvas.height;
    context.imageSmoothingEnabled = false;
    context.fillStyle = palette.sky;
    context.fillRect(0, 0, width, height);

    context.fillStyle = palette.light;
    context.fillRect(48 + Math.floor(random() * 7), 5 + Math.floor(random() * 5), 7, 7);
    for (let i = 0; i < 16; i++) {
        context.fillStyle = i % 3 === 0 ? palette.light : '#b8c1e0';
        context.fillRect(Math.floor(random() * width), Math.floor(random() * 25), 1, 1);
    }

    context.fillStyle = palette.shadow;
    context.fillRect(0, 34, width, 14);
    context.fillStyle = palette.ground;
    context.fillRect(0, 39, width, 9);

    if (card.category !== 'unit') {
        context.fillStyle = palette.creature;
        if (card.category === 'tactic') {
            context.fillRect(34, 11, 7, 6);
            context.fillRect(29, 17, 8, 6);
            context.fillRect(25, 23, 8, 6);
            context.fillRect(22, 29, 8, 7);
            context.fillStyle = palette.light;
            context.fillRect(35, 12, 4, 3);
            context.fillRect(30, 18, 4, 3);
            context.fillRect(26, 24, 4, 3);
        } else if (card.category === 'equipment') {
            context.fillRect(31, 9, 6, 22);
            context.fillRect(27, 29, 14, 4);
            context.fillRect(32, 33, 4, 8);
            context.fillStyle = palette.light;
            context.fillRect(32, 11, 4, 17);
        } else if (card.category === 'site') {
            context.fillRect(18, 21, 28, 18);
            context.fillRect(22, 15, 6, 7);
            context.fillRect(30, 15, 6, 7);
            context.fillRect(38, 15, 6, 7);
            context.fillStyle = palette.shadow;
            context.fillRect(29, 29, 7, 10);
            context.fillRect(22, 25, 4, 4);
            context.fillRect(38, 25, 4, 4);
        } else {
            context.fillRect(11, 31, 18, 12);
            context.fillRect(25, 24, 20, 19);
            context.fillRect(39, 29, 15, 14);
            context.fillStyle = palette.light;
            context.fillRect(30, 28, 5, 3);
            context.fillRect(44, 33, 4, 3);
        }
        canvas.setAttribute('aria-label', `Illustrazione pixel art generata per ${card.name}`);
        return true;
    }

    const center = 31 + Math.floor(random() * 5);
    context.fillStyle = palette.creature;
    context.fillRect(center - 13, 21, 22, 11);
    context.fillRect(center + 7, 17, 8, 8);
    context.fillRect(center + 11, 19, 7, 4);
    context.fillRect(center - 20, 22, 8, 4);
    context.fillRect(center - 7, 30, 4, 9);
    context.fillRect(center + 3, 30, 4, 9);
    context.fillStyle = palette.shadow;
    context.fillRect(center + 12, 19, 2, 2);
    context.fillRect(center + 15, 22, 3, 1);
    context.fillStyle = palette.light;
    context.fillRect(center - 7, 24, 5, 2);

    canvas.setAttribute('aria-label', `Illustrazione pixel art generata per ${card.name}`);
    return true;
}

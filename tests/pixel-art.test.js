import test from 'node:test';
import assert from 'node:assert/strict';
import { drawCardPixelArt } from '../src/pixel-art.js';

function installDocument() {
    const buffers = [];
    globalThis.document = {
        createElement() {
            return createCanvas(buffers);
        }
    };
    return buffers;
}

function createCanvas(bucket) {
    const calls = { fillRect: 0, drawImage: 0 };
    const canvas = {
        width: 64,
        height: 48,
        attributes: {},
        calls,
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        getContext() {
            return {
                imageSmoothingEnabled: false,
                fillStyle: '',
                fillRect() {
                    calls.fillRect += 1;
                },
                drawImage() {
                    calls.drawImage += 1;
                }
            };
        }
    };
    bucket?.push(canvas);
    return canvas;
}

const unit = {
    id: 'set-1-001',
    catalogId: 'set-1-001',
    setId: 'set-1',
    category: 'unit',
    name: 'Cucciolo'
};

test('draws the same card from cache on the second request', () => {
    const buffers = installDocument();
    const canvas = createCanvas();

    assert.equal(drawCardPixelArt(canvas, unit), true);
    const painted = buffers[0].calls.fillRect;
    assert.ok(painted > 10);
    assert.equal(canvas.calls.fillRect, 0);
    assert.equal(canvas.calls.drawImage, 1);
    assert.equal(canvas.attributes['aria-label'], 'Illustrazione pixel art generata per Cucciolo');

    assert.equal(drawCardPixelArt(canvas, unit), true);
    assert.equal(buffers.length, 1);
    assert.equal(buffers[0].calls.fillRect, painted);
    assert.equal(canvas.calls.drawImage, 2);
});

test('paints again when the same card is requested at another size', () => {
    installDocument();
    const canvas = createCanvas();
    drawCardPixelArt(canvas, { ...unit, catalogId: 'set-1-002', id: 'set-1-002' });
    const paintedOnce = canvas.calls.drawImage;
    canvas.height = 72;
    drawCardPixelArt(canvas, { ...unit, catalogId: 'set-1-002', id: 'set-1-002' });
    assert.equal(canvas.calls.drawImage, paintedOnce + 1);
});

test('returns false when the canvas cannot be drawn on', () => {
    installDocument();
    const canvas = {
        width: 64,
        height: 48,
        getContext() {
            return null;
        },
        setAttribute() {}
    };
    assert.equal(drawCardPixelArt(canvas, unit), false);
});

test('forgets the oldest picture once the cache is full', () => {
    const buffers = installDocument();
    const canvas = createCanvas();
    for (let index = 0; index < 49; index += 1) {
        drawCardPixelArt(canvas, {
            ...unit,
            id: `cache-${index}`,
            catalogId: `cache-${index}`,
            name: `Carta ${index}`
        });
    }
    const created = buffers.length;
    drawCardPixelArt(canvas, { ...unit, id: 'cache-48', catalogId: 'cache-48', name: 'Carta 48' });
    assert.equal(buffers.length, created);
    drawCardPixelArt(canvas, { ...unit, id: 'cache-0', catalogId: 'cache-0', name: 'Carta 0' });
    assert.equal(buffers.length, created + 1);
});

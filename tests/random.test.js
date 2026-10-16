import test from 'node:test';
import assert from 'node:assert/strict';
import { getRandomState, nextRandom, restoreRandomState, seedRandom } from '../src/random.js';

test('seeded random sequence is repeatable and state can be restored', () => {
    seedRandom(12345);
    const first = [nextRandom(), nextRandom(), nextRandom()];
    const saved = getRandomState();
    const afterSave = nextRandom();
    restoreRandomState(saved);
    assert.equal(nextRandom(), afterSave);
    seedRandom(12345);
    assert.deepEqual([nextRandom(), nextRandom(), nextRandom()], first);
});

test('random seed validates its supported numeric range', () => {
    assert.throws(() => seedRandom(-1), RangeError);
    assert.throws(() => seedRandom(2 ** 32), RangeError);
});

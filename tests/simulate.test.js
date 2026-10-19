import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateMatches } from '../src/ai/simulate.js';

test(
    'tre partite con lo stesso seme finiscono senza errori e si ripetono',
    { timeout: 180000 },
    async () => {
        const first = await simulateMatches({ games: 3, seed: 42, turnLimit: 120 });
        assert.equal(first.partite, 3);
        assert.equal(first.errori.length, 0);
        assert.equal(first.completate, 3);
        assert.equal(first.partiteAlLimite.length, 0);
        assert.ok(first.durataMediaTurni > 0);

        const second = await simulateMatches({ games: 1, seed: 42, turnLimit: 120 });
        assert.equal(second.partiteDettaglio[0].vincitore, first.partiteDettaglio[0].vincitore);
        assert.equal(second.partiteDettaglio[0].turni, first.partiteDettaglio[0].turni);
        assert.equal(second.partiteDettaglio[0].seme, first.partiteDettaglio[0].seme);
        assert.equal(
            second.partiteDettaglio[0].mazzoVincente,
            first.partiteDettaglio[0].mazzoVincente
        );
    }
);

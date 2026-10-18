import { expect, test } from '@playwright/test';

const CARD_NAME = 'Cucciolo Artigliofendente';

test.beforeEach(async ({ page }) => {
    await page.goto('/#match');
});

test('il prototipo si avvia sulla schermata del tavolo', async ({ page }) => {
    await expect(page).toHaveTitle('PRIMAL RUIN - Core 1.0');
    await expect(page.locator('#phase-label')).toHaveText('PREPARAZIONE');
    await expect(page.locator('#log')).toContainText(
        'Partita preparata: 40 carte Esercito e 20 Domini per giocatore.'
    );
    await expect(page.locator('#log')).toContainText(
        'Mano iniziale: 5 carte. Puoi effettuare un Mulligan prima di iniziare.'
    );
    await expect(page.locator('#log')).toContainText('è il primo giocatore.');
    await expect(page.locator('#btn-start')).toBeVisible();
    await expect(page.locator('#player-commander-select option')).not.toHaveCount(0);
    await expect(page.locator('#player-commander-name')).not.toBeEmpty();
    await page.goto('/#deck');
    await expect(page.locator('#catalog-grid article.library-card').first()).toBeVisible();
    await expect(page.locator('#library-count')).toContainText(/^\d+ di \d+ carte$/);
});

test('il deck builder mostra le carte e segnala un mazzo incompleto', async ({ page }) => {
    await page.goto('/#deck');
    const builder = page.locator('#deck-builder');
    await expect(builder).toHaveJSProperty('open', false);

    await builder.locator('summary').click();
    await expect(builder).toHaveJSProperty('open', true);
    await expect(page.locator('#builder-catalog .builder-card').first()).toBeVisible();

    await page.locator('#builder-search').fill(CARD_NAME);
    await expect(page.locator('#builder-catalog .builder-card')).toHaveCount(1);
    await page.getByRole('button', { name: `Aggiungi ${CARD_NAME} al mazzo` }).click();

    await expect(page.locator('#builder-deck')).toContainText(`1× ${CARD_NAME}`);
    await expect(page.locator('#builder-count')).toHaveText('1/40 carte');
    await expect(page.locator('#builder-status')).toHaveText(
        'Il mazzo deve contenere 40 carte (ora: 1).'
    );
    await expect(page.locator('#builder-save')).toBeDisabled();
    await expect(page.locator('#builder-use')).toBeDisabled();
});

test('si può costruire e salvare un mazzo da 40 carte', async ({ page }) => {
    await page.goto('/#deck');
    const builder = page.locator('#deck-builder');
    await builder.locator('summary').click();
    await page.locator('#builder-search').fill(CARD_NAME);

    const add = page.getByRole('button', { name: `Aggiungi ${CARD_NAME} al mazzo` });
    for (let copy = 0; copy < 40; copy += 1) await add.click();

    await expect(add).toBeDisabled();
    await expect(page.locator('#builder-count')).toHaveText('40/40 carte');
    await expect(page.locator('#builder-status')).toContainText('Mazzo valido: 40 carte.');
    await expect(page.locator('#builder-save')).toBeEnabled();
    await expect(page.locator('#builder-use')).toBeEnabled();

    await page.locator('#builder-save').click();
    await expect(page.locator('#builder-status')).toHaveText('Mazzo salvato in questo browser.');
    await expect
        .poll(() => page.evaluate(() => localStorage.getItem('primal-ruin.custom-deck.v1')))
        .toBeTruthy();
});

test('il tavolo resta nel viewport su desktop e su telefono', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() !== 'error') return;
        if (message.text().includes('favicon')) return;
        errors.push(message.text());
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/#match');
    await expect(page.locator('#phase-label')).toHaveText('PREPARAZIONE');
    await expectNoHorizontalOverflow(page);
    const desktopGap = await page.evaluate(() => {
        const enemy = document.getElementById('opp-fronti-area')?.getBoundingClientRect();
        const own = document.getElementById('player-fronti-area')?.getBoundingClientRect();
        if (!enemy || !own) return Number.POSITIVE_INFINITY;
        return own.top - enemy.bottom;
    });
    expect(desktopGap).toBeLessThan(120);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#match');
    await expect(page.locator('#phase-label')).toHaveText('PREPARAZIONE');
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
});

test('archivio e salvataggio mostrano gli errori di interfaccia già previsti', async ({ page }) => {
    await page.goto('/#deck');
    await page.locator('#library-search').fill('carta-che-non-esiste-nel-catalogo');
    await expect(page.locator('#catalog-grid .library-empty')).toHaveText(
        'Nessuna carta corrisponde ai filtri.'
    );
    await expect(page.locator('#library-count')).toHaveText(/^0 di \d+ carte$/);

    const builder = page.locator('#deck-builder');
    await builder.locator('summary').click();
    await page.locator('#builder-search').fill(CARD_NAME);
    const add = page.getByRole('button', { name: `Aggiungi ${CARD_NAME} al mazzo` });
    for (let copy = 0; copy < 40; copy += 1) await add.click();

    await page.evaluate(() => {
        localStorage.setItem = () => {
            throw new Error('quota di prova');
        };
    });
    await page.locator('#builder-save').click();
    await expect(page.locator('#builder-status')).toHaveText(
        'Salvataggio non riuscito: quota di prova'
    );
});

test('la roadmap si apre e la parte aggiornata si prepara dal tavolo', async ({ page }) => {
    await page.goto('/#deck');
    const roadmap = page.locator('#roadmap-panel');
    await expect(roadmap).toHaveJSProperty('open', false);
    await roadmap.locator('summary').click();
    await expect(roadmap).toContainText('Equipaggiamenti');
    await expect(page.locator('#deck-selection')).toContainText('22 Unità, 12 Tattiche');

    await page.goto('/#match');
    await page.locator('#btn-open-archive').click();
    await expect(page.locator('#screen-deck')).toBeVisible();
    await expect(page.locator('#library-search')).toBeFocused();

    await page.goto('/#match');
    await page.locator('#btn-updated-deck').click();
    await expect(page.locator('#log')).toContainText('Mazzo della parte aggiornata pronto');
    await expect(page.locator('#phase-label')).toHaveText('PREPARAZIONE');
    await expect(page.locator('#screen-deck')).toBeVisible();
    await expect(roadmap).toHaveJSProperty('open', true);
});

test('le schermate intro, mazzi e tavolo restano separate', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#screen-intro')).toBeVisible();
    await expect(page.locator('#screen-deck')).toBeHidden();
    await expect(page.locator('#tavolo')).toBeHidden();

    await page.locator('#btn-intro-deck').click();
    await expect(page.locator('#screen-deck')).toBeVisible();
    await expect(page.locator('#screen-intro')).toBeHidden();

    await page.locator('#btn-deck-match').click();
    await expect(page.locator('#tavolo')).toBeVisible();
    await expect(page.locator('#opp-fronti-area')).toBeVisible();
    await expect(page.locator('#player-fronti-area')).toBeVisible();
});

async function expectNoHorizontalOverflow(page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
}

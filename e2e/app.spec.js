import { expect, test } from '@playwright/test';

const CARD_NAME = 'Cucciolo Artigliofendente';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
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
    await expect(page.locator('#catalog-grid article.library-card').first()).toBeVisible();
    await expect(page.locator('#library-count')).toContainText(/^\d+ di \d+ carte$/);
});

test('il deck builder mostra le carte e segnala un mazzo incompleto', async ({ page }) => {
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
    await page.goto('/');
    await expect(page.locator('#phase-label')).toHaveText('PREPARAZIONE');
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('#phase-label')).toHaveText('PREPARAZIONE');
    await expect(page.locator('#btn-start')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator('#btn-start').focus();
    await expect(page.locator('#btn-start')).toBeFocused();
    const startBox = await page.locator('#btn-start').boundingBox();
    expect(startBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.locator('#deck-builder summary').click();
    await expect(page.locator('#builder-catalog .builder-card').first()).toBeVisible();
    await page.locator('#builder-search').fill(CARD_NAME);
    await expect(page.locator('#builder-catalog .builder-card')).toHaveCount(1);
    expect(errors).toEqual([]);
});

async function expectNoHorizontalOverflow(page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
}

test('archivio e salvataggio mostrano gli errori di interfaccia già previsti', async ({ page }) => {
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

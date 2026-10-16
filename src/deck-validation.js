export function validateDeckIds(cardIds, knownCardIds) {
    if (!Array.isArray(cardIds) || cardIds.length !== 40) {
        return { valid: false, message: `Il mazzo deve contenere 40 carte (ora: ${cardIds?.length ?? 0}).` };
    }
    const unknownCard = cardIds.find(id => !knownCardIds.has(id));
    if (unknownCard) {
        return { valid: false, message: `Carta sconosciuta nel mazzo: ${unknownCard}.` };
    }
    return { valid: true, message: 'Mazzo valido: 40 carte.' };
}

const STANDARD_ASCENSION =
    'Quando questa Unità vince un Fronte o riceve un potenziamento';
const keywordPatternCache = new Map();

function keywordPattern(name) {
    let pattern = keywordPatternCache.get(name);
    if (!pattern) {
        pattern = new RegExp(`^${name}\\b`, 'i');
        keywordPatternCache.set(name, pattern);
    }
    return pattern;
}

export function keywordValue(keywords, name, fallback = 1) {
    const match = (keywords || []).find((keyword) => keywordPattern(name).test(keyword));
    if (!match) return 0;
    return Number(match.match(/\((\d+)\)/)?.[1] || fallback);
}

export function hasKeyword(keywords, name) {
    return (keywords || []).some((keyword) => keywordPattern(name).test(keyword));
}

function equipmentGrantsAscension(unit) {
    const id = unit?.equipment?.catalogId || unit?.equipment?.id;
    return id === 'set-2-084' || id === 'set-2-090';
}

export function hasAscension(unit) {
    if (!unit) return false;
    return equipmentGrantsAscension(unit) ||
        hasKeyword(unit.keywords, 'Ascensione') ||
        /\bAscensione\b/i.test(unit.rulesText || '');
}

// La condizione stampata dal set divino. Una parentesi diversa («Ascensione (Se …)»)
// resta sulla carta e non usa questo innesco.
function usesStandardAscension(rulesText = '', keywords = []) {
    const text = rulesText || '';
    const mentioned = hasKeyword(keywords, 'Ascensione') || /\bAscensione\b/i.test(text);
    if (!mentioned) return false;
    if (new RegExp(`Ascensione\\s*\\((?!${STANDARD_ASCENSION})`, 'i').test(text)) return false;
    if (text.includes(STANDARD_ASCENSION)) return true;
    if (/\bAscensione\s*\(/i.test(text)) return false;
    return hasKeyword(keywords, 'Ascensione') || /\bAscensione\b/i.test(text);
}

export function grantDivinityAscension(unit) {
    if (!unit || unit._ascending) return false;
    unit._ascending = true;
    const printed = Number.isFinite(unit.force) ? unit.force : (unit.currentForce || 0);
    unit.force = printed + 1;
    unit.currentForce = (unit.currentForce || 0) + 1;
    unit.keywords = unit.keywords || [];
    if (!unit.keywords.includes('Divinità')) unit.keywords.push('Divinità');
    if (!/\bDivinità\b/i.test(unit.type || '')) {
        unit.type = unit.type ? `${unit.type} – Divinità` : 'Divinità';
    }
    unit._ascending = false;
    return true;
}

export function applyStandardAscension(unit) {
    if (!equipmentGrantsAscension(unit) &&
        !usesStandardAscension(unit?.rulesText, unit?.keywords)) return false;
    return grantDivinityAscension(unit);
}

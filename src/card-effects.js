import {
    getTacticChoices as getRegisteredTacticChoices,
    isRegisteredTactic,
    resolveRegisteredTactic
} from './tactics.js';
import { isProtectedFromEnemyTactic } from './unit-triggers.js';

const IMMEDIATE_TACTICS = new Set([
    'set-1-063',
    'set-1-075',
    'set-2-069',
    'set-2-076',
    'set-3-059',
    'set-3-069'
]);

export const registeredEquipmentIds = new Set([
    'set-1-079',
    'set-1-080',
    'set-1-081',
    'set-1-082',
    'set-1-083',
    'set-1-084',
    'set-1-085',
    'set-1-086',
    'set-1-087',
    'set-1-088',
    'set-1-089',
    'set-1-090',
    'set-2-105',
    'set-2-106',
    'set-2-107',
    'set-2-108',
    'set-2-109',
    'set-2-110',
    'set-2-111',
    'set-2-112',
    'set-3-105',
    'set-3-106',
    'set-3-107',
    'set-3-108',
    'set-3-109',
    'set-3-110',
    'set-3-111',
    'set-3-112'
]);

export const registeredSiteIds = new Set([
    ...Array.from({ length: 20 }, (_, index) => `set-1-${String(index + 91).padStart(3, '0')}`),
    ...Array.from({ length: 26 }, (_, index) => `set-2-${String(index + 79).padStart(3, '0')}`),
    ...Array.from({ length: 24 }, (_, index) => `set-3-${String(index + 81).padStart(3, '0')}`)
]);

export const registeredFieldIds = new Set([
    ...Array.from({ length: 10 }, (_, index) => `set-1-${String(index + 111).padStart(3, '0')}`),
    ...Array.from({ length: 8 }, (_, index) => `set-2-${String(index + 113).padStart(3, '0')}`),
    ...Array.from({ length: 8 }, (_, index) => `set-3-${String(index + 113).padStart(3, '0')}`)
]);

export const registeredUnitEffectIds = new Set([
    'set-1-006',
    'set-1-008',
    'set-1-009',
    'set-1-014',
    'set-1-018',
    'set-1-020',
    'set-1-022',
    'set-1-026',
    'set-1-027',
    'set-1-029',
    'set-1-030',
    'set-1-031',
    'set-1-033',
    'set-1-036',
    'set-1-037',
    'set-1-039',
    'set-1-041',
    'set-1-043',
    'set-1-044',
    'set-1-047',
    'set-1-048',
    'set-1-049',
    'set-1-051',
    'set-1-046',
    'set-1-038',
    'set-1-053',
    'set-1-054',
    'set-1-045',
    'set-1-052',
    'set-1-056',
    'set-1-055',
    'set-1-060',
    'set-1-058',
    'set-2-010',
    'set-2-014',
    'set-2-018',
    'set-2-016',
    'set-2-023',
    'set-2-009',
    'set-2-013',
    'set-2-020',
    'set-2-027',
    'set-2-029',
    'set-2-031',
    'set-2-035',
    'set-2-039',
    'set-2-040',
    'set-2-043',
    'set-2-026',
    'set-2-028',
    'set-2-049',
    'set-2-032',
    'set-2-034',
    'set-2-042',
    'set-3-001',
    'set-3-007',
    'set-3-009',
    'set-3-012',
    'set-3-022',
    'set-3-025',
    'set-3-028',
    'set-3-032',
    'set-3-033',
    'set-3-040',
    'set-3-046',
    'set-3-016',
    'set-3-002',
    'set-3-026',
    'set-3-036',
    'set-3-014',
    'set-3-011',
    'set-3-023',
    'set-3-019',
    'set-3-006',
    'set-3-020',
    'set-3-030',
    'set-3-039',
    'set-3-035',
    'set-3-042',
    'set-3-044',
    'set-3-045',
    'set-3-047',
    'set-3-049',
    'set-3-053',
    'set-3-052',
    'set-3-051',
    'set-3-050',
    'set-3-055'
]);

function catalogId(card) {
    return card.catalogId || card.id;
}

export function applyTemporaryForce(unit, modifier) {
    const previousForce = unit.currentForce;
    unit.currentForce = Math.max(0, previousForce + modifier);
    const appliedModifier = unit.currentForce - previousForce;
    unit.temporaryForce = (unit.temporaryForce || 0) + appliedModifier;
    if (appliedModifier < 0) {
        unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) - appliedModifier;
    }
    return appliedModifier;
}

export function restoreTemporaryForce(unit) {
    if (!unit?.temporaryForce) return false;
    unit.currentForce = Math.max(0, unit.currentForce - unit.temporaryForce);
    unit.temporaryForce = 0;
    return unit.currentForce <= 0;
}

export function isImmediateTacticSupported(card) {
    return card.category === 'tactic' &&
        (IMMEDIATE_TACTICS.has(catalogId(card)) || isRegisteredTactic(card));
}

export function resolveImmediateTactic(card, player, opponent, choice = null, context = {}) {
    if (isRegisteredTactic(card)) {
        return resolveRegisteredTactic(card, choice, player, opponent, context);
    }
    if (catalogId(card) === 'set-1-063' || catalogId(card) === 'set-1-075') {
        let affected = 0;
        for (const front of Object.values(player.fronts)) {
            if (!front.line) continue;
            applyTemporaryForce(front.line, 1);
            affected++;
        }
        return `${card.name}: ${affected} Linee ottengono +1 Forza fino alla fine dello Scontro.`;
    }
    if (catalogId(card) === 'set-2-069' || catalogId(card) === 'set-2-076') {
        const modifier = catalogId(card) === 'set-2-069' ? -1 : -2;
        let affected = 0;
        for (const front of Object.values(opponent.fronts)) {
            if (!front.line) continue;
            const applied = applyTemporaryForce(front.line, modifier);
            if (applied < 0) context.onForceLoss?.(opponent, front.line, -applied);
            affected++;
        }
        return `${card.name}: ${affected} Linee avversarie perdono ${Math.abs(modifier)} Forza fino alla fine dello Scontro.`;
    }
    if (catalogId(card) === 'set-3-059') {
        opponent.parasites++;
        return 'Infiltrazione Silente: 1 Parassita assegnato al Comandante avversario.';
    }
    if (catalogId(card) === 'set-3-069') {
        if (opponent.parasites === 0) opponent.parasites++;
        return 'Invasione Strisciante: 1 Parassita assegnato al Comandante avversario se non ne aveva.';
    }
    throw new Error(`Nessun risolutore registrato per la Tattica ${catalogId(card)}.`);
}

export function getTacticChoices(card, player, opponent) {
    if (isRegisteredTactic(card)) {
        const choices = getRegisteredTacticChoices(card, player, opponent);
        return choices.filter(choice => {
            if (choice.value.owner === 'opponent' && choice.value.slotName === 'line') {
                const target = opponent.fronts[choice.value.frontName]?.line;
                if (isProtectedFromEnemyTactic(target, 'line', card.cost)) return false;
            }
            if (card.cost > 2) return true;
            const target = choice.value.owner === 'player'
                ? player
                : choice.value.owner === 'opponent' ? opponent : null;
            if (!target || choice.value.slotName !== 'line' ||
                !target.sites?.some(site => catalogId(site) === 'set-2-091')) {
                return true;
            }
            return !Object.values(target.fronts).some(front => front.supA || front.supB);
        });
    }
    if (card.category === 'tactic' && IMMEDIATE_TACTICS.has(catalogId(card))) return [];
    return null;
}

export function getCardExecutionStatus(card) {
    if (card.category === 'unit' && registeredUnitEffectIds.has(catalogId(card))) {
        return {
            label: 'Implementata',
            detail: 'Abilità statica o passiva registrata e applicata dal motore.'
        };
    }
    if (card.category !== 'unit') {
        if (isImmediateTacticSupported(card)) {
            return {
                label: 'Implementata',
                detail: 'Effetto testuale risolto dal motore.'
            };
        }
        if (card.category === 'equipment' && registeredEquipmentIds.has(catalogId(card))) {
            return {
                label: 'Implementata',
                detail: 'Abilità statiche e trigger gestiti dal motore; gli effetti facoltativi scelgono automaticamente l’opzione legale.'
            };
        }
        if (card.category === 'site' && registeredSiteIds.has(catalogId(card))) {
            return {
                label: 'Implementata',
                detail: 'Abilità statiche, trigger e attivazioni gestiti dal motore; le scelte facoltative usano una risoluzione automatica deterministica.'
            };
        }
        if (card.category === 'field' && registeredFieldIds.has(catalogId(card))) {
            return {
                label: 'Implementata',
                detail: 'Abilità statiche e trigger gestiti dal motore; le scelte facoltative usano una risoluzione automatica deterministica.'
            };
        }
        if (['equipment', 'site', 'field'].includes(card.category)) {
            return {
                label: 'Parziale',
                detail: 'La carta è giocabile; alcune abilità passive o trigger possono non essere ancora risolti.'
            };
        }
        return {
            label: 'Non eseguibile',
            detail: 'Categoria non supportata dal motore attuale.'
        };
    }
    if (/^Nessuna abilità\.?$/i.test(card.rulesText.trim())) {
        return {
            label: 'Unità base',
            detail: 'Nessuna abilità testuale da risolvere.'
        };
    }
    const supportedKeywords = [
        /\bFerocia\b/giu,
        /\bAssalto\b/giu,
        /\bSorvolo\b/giu,
        /\bMente Collettiva\b/giu,
        /\bPosizione Difensiva\b/giu,
        /\bLogorare\s*\(\d+\)/giu,
        /\bEco Spettrale\b/giu,
        /\bTormento\s*\(\d+\)/giu,
        /\bAscensione\s*\(\d+\)/giu,
        /\bDivinità\b/giu,
        /\bInfiltrazione\s*\(\d+\)/giu
    ];
    const keywordReminders = [
        /\bFerocia\s*\(Durante lo Scontro, questa Unità ottiene \+1 Forza se controlli meno Unità(?: complessive)? dell’avversario\)/giu,
        /\bAssalto\s*\(Può essere messo in posizione Linea nel turno in cui entra in gioco\)/giu,
        /\bPosizione Difensiva\s*\(Se possibile, deve essere messo in posizione Linea quando entra in gioco\)/giu,
        /\bSorvolo\s*\(Quando questa Unità viene assegnata allo Scontro, puoi spostarla in un Fronte adiacente\. Se lo fai, entra in Supporto nel nuovo Fronte\)/giu,
        /\bLogorare\s*\((\d+)\)\.?\s*\(Quando questa Unità è in Linea durante lo Scontro, la Linea avversaria nello stesso Fronte perde \1 Forza fino alla fine dello Scontro\.?\)/giu
    ];
    let remainingRulesText = card.rulesText;
    for (const pattern of keywordReminders) {
        remainingRulesText = remainingRulesText.replace(pattern, '');
    }
    for (const pattern of supportedKeywords) {
        remainingRulesText = remainingRulesText.replace(pattern, '');
    }
    if (remainingRulesText.replace(/[\s.,;:()[\]-]/gu, '') === '') {
        return {
            label: 'Keyword implementata',
            detail: 'Le keyword riconosciute sono gestite dal motore.'
        };
    }
    return {
        label: 'Parziale',
        detail: 'Il motore applica solo alcune keyword Core; gli altri effetti testuali non sono eseguiti.'
    };
}

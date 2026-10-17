import { getTacticChoices as getRegisteredTacticChoices } from '../card-effects.js';
import { FRONT_NAMES } from './board.js';
import { CombatResolver } from './combat.js';

function getTacticChoices(card, player, opponent) {
    const choices = getRegisteredTacticChoices(card, player, opponent);
    if (!choices || card.cost > 2) return choices;
    return choices.filter(choice => {
        if (choice.value.owner !== 'opponent' || choice.value.slotName !== 'line' ||
            opponent.field?.catalogId !== 'set-1-116') return true;
        const targetStrength = CombatResolver.strength(opponent, choice.value.frontName, null);
        const highestStrength = FRONT_NAMES.reduce((highest, frontName) =>
            Math.max(highest, CombatResolver.strength(opponent, frontName, null)), 0);
        return targetStrength < highestStrength;
    });
}

export { getTacticChoices };

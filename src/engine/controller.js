import { combatMethods } from './controller-combat.js';
import { commanderMethods } from './controller-commander.js';
import { matchMethods } from './controller-match.js';
import { playMethods } from './controller-play.js';
import { tacticMethods } from './controller-tactics.js';

const GameController = {
    ...matchMethods,
    ...commanderMethods,
    ...playMethods,
    ...tacticMethods,
    ...combatMethods
};

export { GameController };

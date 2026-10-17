import cardCatalog from '../data/cards.json' with { type: 'json' };

const FRONT_NAMES = ['left', 'center', 'right'];
const FRONT_LABELS = { left: 'SINISTRA', center: 'CENTRO', right: 'DESTRA' };
const SLOT_NAMES = ['line', 'supA', 'supB'];
const CARD_DATA = cardCatalog.cards;
const SETS = cardCatalog.sets;

export { CARD_DATA, FRONT_LABELS, FRONT_NAMES, SETS, SLOT_NAMES };

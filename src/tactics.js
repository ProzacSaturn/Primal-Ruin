import { isProtectedFromEnemyMovement, isProtectedFromEffectDestruction } from './unit-triggers.js';

const IMPLEMENTED_TACTICS = new Set([
    'set-1-061',
    'set-1-062',
    'set-1-064',
    'set-1-065',
    'set-1-066',
    'set-1-069',
    'set-1-070',
    'set-1-071',
    'set-1-067',
    'set-1-068',
    'set-1-072',
    'set-1-076',
    'set-1-077',
    'set-1-078',
    'set-1-073',
    'set-2-053',
    'set-2-054',
    'set-2-057',
    'set-2-061',
    'set-2-062',
    'set-2-064',
    'set-2-065',
    'set-2-056',
    'set-2-067',
    'set-2-068',
    'set-2-058',
    'set-2-060',
    'set-2-063',
    'set-2-072',
    'set-2-071',
    'set-2-066',
    'set-2-077',
    'set-2-055',
    'set-2-073',
    'set-1-074',
    'set-2-059',
    'set-2-070',
    'set-2-074',
    'set-2-075',
    'set-2-078',
    'set-3-072',
    'set-3-075',
    'set-3-058',
    'set-3-057',
    'set-3-061',
    'set-3-063',
    'set-3-066',
    'set-3-065',
    'set-3-078',
    'set-3-067',
    'set-3-071',
    'set-3-074',
    'set-3-060',
    'set-3-062',
    'set-3-064',
    'set-3-068',
    'set-3-070',
    'set-3-073',
    'set-3-076',
    'set-3-077',
    'set-3-079',
    'set-3-080',
]);

const FRONT_NAMES = ['left', 'center', 'right'];
const FRONT_LABELS = { left: 'SINISTRA', center: 'CENTRO', right: 'DESTRA' };
const SLOTS = ['line', 'supA', 'supB'];
const TACTICS_REQUIRING_CHOICE = new Set([
    'set-1-061', 'set-1-062', 'set-1-064', 'set-1-065', 'set-1-066',
    'set-1-068', 'set-1-069', 'set-1-070', 'set-1-071', 'set-1-073', 'set-1-076',
    'set-2-053', 'set-2-054', 'set-2-057', 'set-2-061', 'set-2-062',
    'set-2-056', 'set-2-058', 'set-2-060', 'set-2-063', 'set-2-064',
    'set-2-065', 'set-2-066', 'set-2-067', 'set-2-068', 'set-2-071',
    'set-3-074',
    'set-3-057', 'set-3-058', 'set-3-060', 'set-3-061', 'set-3-062',
    'set-3-063', 'set-3-064', 'set-3-065', 'set-3-066', 'set-3-076', 'set-3-077',
    'set-3-067', 'set-3-071', 'set-3-078',
    'set-3-080',
    'set-1-074', 'set-2-070', 'set-2-074', 'set-2-075',
    'set-2-078', 'set-3-072', 'set-3-075'
]);

function idOf(card) {
    return card.catalogId || card.id;
}

function unitsIn(player, frontName) {
    return SLOTS
        .map(slotName => ({ frontName, slotName, unit: player.fronts[frontName][slotName] }))
        .filter(target => target.unit);
}

function lineChoices(player, side, owner) {
    return FRONT_NAMES
        .filter(frontName => player.fronts[frontName].line)
        .map(frontName => ({
            label: `${side} · ${FRONT_LABELS[frontName]} · ${player.fronts[frontName].line.name}`,
            value: { frontName, slotName: 'line', owner }
        }));
}

function supportChoices(player, side, filter = () => true) {
    return FRONT_NAMES.filter(frontName => player.fronts[frontName]).flatMap(frontName => {
        const front = player.fronts[frontName];
        return ['supA', 'supB']
            .filter(slotName => front[slotName] && filter(front[slotName], frontName))
            .map(slotName => ({
                label: `${side} · ${FRONT_LABELS[frontName]} · Supporto ${slotName === 'supA' ? 'A' : 'B'} · ${front[slotName].name}`,
                value: { frontName, slotName }
            }));
    });
}

export function isRegisteredTactic(card) {
    return card.category === 'tactic' && IMPLEMENTED_TACTICS.has(idOf(card));
}

export function tacticRequiresChoice(card) {
    return TACTICS_REQUIRING_CHOICE.has(idOf(card));
}

// I file in sets/ non stampano la velocità. Si legge solo se il testo della
// carta dice Istantanea/Reazione oppure Standard. Altrimenti la velocità è assente.
export function tacticTiming(card) {
    const text = `${card?.name || ''} ${card?.type || ''} ${card?.rulesText || ''}`;
    const instant = /\bistantane\w*\b|\breazion\w*\b/i.test(text);
    const standard = /\bstandard\b/i.test(text);
    if (instant === standard) return null;
    return instant ? 'instant' : 'standard';
}

function anyLineChoices(player, opponent) {
    return [
        ...lineChoices(player, 'Tua Linea', 'player'),
        ...lineChoices(opponent, 'Linea avversaria', 'opponent')
    ];
}

export function getTacticChoices(card, player, opponent) {
    const id = idOf(card);
    if (!isRegisteredTactic(card)) return null;

    if (id === 'set-1-061' || id === 'set-1-064') {
        return lineChoices(player, 'Tua Linea', 'player');
    }
    if (id === 'set-1-062') {
        return lineChoices(opponent, 'Linea avversaria', 'opponent');
    }
    if (id === 'set-1-065' || id === 'set-3-057') {
        const playerFrontIndexes = Object.fromEntries(FRONT_NAMES.map((name, index) => [name, index]));
        return supportChoices(player, 'Tuo Supporto').flatMap(choice =>
            FRONT_NAMES
                .filter(frontName => Math.abs(
                    playerFrontIndexes[frontName] - playerFrontIndexes[choice.value.frontName]
                ) === 1)
                .flatMap(frontName => {
                    const target = player.fronts[frontName];
                    const choices = ['supA', 'supB']
                        .filter(slotName => !target[slotName])
                        .map(slotName => ({
                            label: `${FRONT_LABELS[frontName]} · Supporto ${slotName === 'supA' ? 'A' : 'B'}`,
                            value: { ...choice.value, targetFront: frontName, targetSlot: slotName }
                        }));
                    if (!target.line && id === 'set-1-065') {
                        choices.push({
                            label: `${FRONT_LABELS[frontName]} · Linea`,
                            value: { ...choice.value, targetFront: frontName, targetSlot: 'line' }
                        });
                    }
                    return choices;
                })
        );
    }
    if (id === 'set-1-066') {
        return FRONT_NAMES.flatMap(frontName => {
            const front = player.fronts[frontName];
            return SLOTS.filter(slotName =>
                front[slotName]?.keywords.includes('Ferocia')
            ).map(slotName => ({
                label: `${FRONT_LABELS[frontName]} · ${front[slotName].name}`,
                value: { frontName, slotName }
            }));
        });
    }
    if (id === 'set-1-069') {
        const discardCards = player.hand.filter(item => item.id !== card.id);
        return FRONT_NAMES.flatMap(frontName => {
            const line = player.fronts[frontName].line;
            return line ? discardCards.map(discard => ({
                label: `Scarta ${discard.name} · +${Math.min(4, countUnits(player))} Forza a ${line.name}`,
                value: { frontName, discardId: discard.id }
            })) : [];
        });
    }
    if (id === 'set-1-070') {
        return FRONT_NAMES.flatMap(frontName => {
            const ownLine = player.fronts[frontName].line;
            const enemyLine = opponent.fronts[frontName].line;
            return ownLine && enemyLine ? [{
                label: `${FRONT_LABELS[frontName]} · ${ownLine.name} contro ${enemyLine.name}`,
                value: { frontName }
            }] : [];
        });
    }
    if (id === 'set-1-071') {
        return FRONT_NAMES.flatMap(frontName =>
            unitsIn(player, frontName).map(({ slotName, unit }) => ({
                label: `${FRONT_LABELS[frontName]} · ${unit.name} (danno: ${Math.min(5, unit.currentForce)})`,
                value: { frontName, slotName }
            }))
        );
    }
    if (id === 'set-1-073') {
        return FRONT_NAMES.flatMap(frontName =>
            player.fronts[frontName].line
                ? supportChoices(
                    { fronts: { [frontName]: opponent.fronts[frontName] } },
                    `${FRONT_LABELS[frontName]} avversario`,
                    unit => !unit.keywords.includes('Divinità')
                ).map(choice => ({ ...choice, value: { ...choice.value, frontName } }))
                : []
        );
    }
    if (id === 'set-2-053' || id === 'set-2-054' || id === 'set-2-061' || id === 'set-2-062') {
        const choices = anyLineChoices(player, opponent);
        return id === 'set-2-061'
            ? choices.filter(choice => {
                const owner = choice.value.owner === 'player' ? player : opponent;
                return !owner.fronts[choice.value.frontName].line.keywords.includes('Divinità');
            })
            : choices;
    }
    if (id === 'set-2-065') {
        return anyLineChoices(player, opponent).filter(choice => {
            const owner = choice.value.owner === 'player' ? player : opponent;
            const unit = owner.fronts[choice.value.frontName].line;
            return unit.currentForce <= 2 && !unit.keywords.includes('Divinità');
        });
    }
    if (id === 'set-2-066') return anyLineChoices(player, opponent);
    if (id === 'set-2-070') {
        return player.discard
            .filter(unit => unit.category === 'unit' && unit.keywords.includes('Eco Spettrale'))
            .flatMap(unit => FRONT_NAMES.flatMap(frontName => {
                const front = player.fronts[frontName];
                const slots = ['supA', 'supB'].filter(slotName => !front[slotName]);
                if (!front.line && (unit.keywords.includes('Assalto') ||
                    unit.keywords.includes('Posizione Difensiva'))) slots.push('line');
                return slots.map(slotName => ({
                    label: `${unit.name} · ${FRONT_LABELS[frontName]} · ${slotName === 'line' ? 'Linea' : `Supporto ${slotName === 'supA' ? 'A' : 'B'}`} · costo ${unit.cost}`,
                    value: { cardId: unit.id, frontName, slotName }
                }));
            }))
            .filter(choice => player.domains.filter(domain => !domain.tapped).length >=
                card.cost + (player.discard.find(unit => unit.id === choice.value.cardId)?.cost || 0));
    }
    if (id === 'set-2-056') {
        return anyLineChoices(player, opponent).filter(choice => {
            const owner = choice.value.owner === 'player' ? player : opponent;
            return (owner.fronts[choice.value.frontName].line.forceLostThisTurn || 0) > 0;
        });
    }
    if (id === 'set-1-068') {
        return lineChoices(player, 'Tua Linea', 'player').filter(choice =>
            (player.fronts[choice.value.frontName].line.damageThisTurn || 0) > 0
        );
    }
    if (id === 'set-1-076') {
        return FRONT_NAMES
            .filter(frontName => player.fronts[frontName].line?.currentForce >= 7 &&
                !player.fronts[frontName].line.keywords.includes('Divinità'))
            .map(frontName => ({
                label: `${FRONT_LABELS[frontName]} · ${player.fronts[frontName].line.name} (Forza ${player.fronts[frontName].line.currentForce})`,
                value: { frontName }
            }));
    }
    if (id === 'set-2-057' || id === 'set-2-064') {
        return player.discard
            .filter(unit => unit.keywords.includes('Eco Spettrale'))
            .map(unit => ({
                label: `${unit.name} · ${id === 'set-2-057' ? 'metti in cima al mazzo' : 'aggiungi alla mano'}`,
                value: { cardId: unit.id }
            }));
    }
    if (id === 'set-2-067') {
        return [
            ...player.discard.map(unit => ({
                label: `Esilia dai tuoi scarti · ${unit.name}`,
                value: { owner: 'player', cardId: unit.id }
            })),
            ...opponent.discard.map(unit => ({
                label: `Esilia dagli scarti avversari · ${unit.name}`,
                value: { owner: 'opponent', cardId: unit.id }
            }))
        ];
    }
    if (id === 'set-2-068') {
        return player.armyDeck.slice(-4).map(unit => ({
            label: `Aggiungi alla mano · ${unit.name}`,
            value: { cardId: unit.id }
        }));
    }
    if (id === 'set-3-058') return lineChoices(opponent, 'Linea avversaria', 'opponent');
    if (id === 'set-3-060' || id === 'set-3-064') {
        const keyword = id === 'set-3-060' ? 'Mente Collettiva' : 'Sorvolo';
        return FRONT_NAMES.flatMap(frontName => {
            const front = player.fronts[frontName];
            return SLOTS.filter(slotName => front[slotName]?.keywords.includes(keyword))
                .map(slotName => ({
                    label: `${FRONT_LABELS[frontName]} · ${front[slotName].name}`,
                    value: { frontName, slotName }
                }));
        });
    }
    if (id === 'set-3-062') {
        return FRONT_NAMES.flatMap(frontName => {
            const ownFront = player.fronts[frontName];
            const collectiveCount = SLOTS.filter(slotName =>
                ownFront[slotName]?.keywords.includes('Mente Collettiva')
            ).length;
            if (collectiveCount < 2) return [];
            const enemyFront = opponent.fronts[frontName];
            return ['supA', 'supB']
                .filter(slotName => enemyFront[slotName] &&
                    !enemyFront[slotName].keywords.includes('Divinità'))
                .map(slotName => ({
                    label: `${FRONT_LABELS[frontName]} avversario · Supporto ${slotName === 'supA' ? 'A' : 'B'} · ${enemyFront[slotName].name}`,
                    value: { frontName, slotName }
                }));
        });
    }
    if (id === 'set-2-058' || id === 'set-3-061' || id === 'set-3-066') {
        return FRONT_NAMES.flatMap(frontName => {
            const front = player.fronts[frontName];
            if (!front.line || front.line.cannotMoveThisTurn) return [];
            return ['supA', 'supB'].filter(slotName => front[slotName])
                .map(slotName => ({
                    label: `${FRONT_LABELS[frontName]} · scambia Linea con Supporto ${slotName === 'supA' ? 'A' : 'B'}`,
                    value: { frontName, slotName }
                }));
        });
    }
    if (id === 'set-2-060' || id === 'set-3-063') {
        const choices = opponent.hand
            .filter(item => item.category !== 'unit')
            .map(item => ({
                label: `${item.name} · rimetti in cima al mazzo avversario`,
                value: { cardId: item.id }
            }));
        if (id === 'set-3-063') {
            choices.push({ label: 'Non scegliere una carta', value: { skip: true } });
        }
        return choices;
    }
    if (id === 'set-2-063') {
        return FRONT_NAMES.flatMap(frontName =>
            SLOTS
                .filter(slotName => {
                    const unit = opponent.fronts[frontName][slotName];
                    return unit && !unit.keywords?.includes('Divinità');
                })
                .map(slotName => ({
                    label: `${FRONT_LABELS[frontName]} avversario · ${opponent.fronts[frontName][slotName].name}`,
                    value: { frontName, slotName, owner: 'opponent' }
                }))
        );
    }
    if (id === 'set-2-071') {
        return [
            { owner: 'opponent', player: opponent, label: 'Comandante avversario' },
            { owner: 'player', player, label: 'Il tuo Comandante' }
        ]
            .map(target => ({
                label: `${target.label} · -${Math.min(3, Math.floor(target.player.discard.length / 2))} Forza alle Linee`,
                value: { owner: target.owner }
            }))
            .filter(choice => {
                const target = choice.value.owner === 'player' ? player : opponent;
                return Math.min(3, Math.floor(target.discard.length / 2)) > 0;
            });
    }
    if (id === 'set-1-074' || id === 'set-2-075') {
        return [
            ...(player.sites || []).map(site => ({
                label: `Tuo Sito · ${site.name} (${site.ruins || 0} Rovine)`,
                value: { owner: 'player', siteId: site.id }
            })),
            ...(opponent.sites || []).map(site => ({
                label: `Sito avversario · ${site.name} (${site.ruins || 0} Rovine)`,
                value: { owner: 'opponent', siteId: site.id }
            }))
        ];
    }
    if (id === 'set-2-074' || id === 'set-3-075') {
        return lineChoices(opponent, 'Linea avversaria', 'opponent')
            .filter(target => {
                const line = opponent.fronts[target.value.frontName].line;
                return !line.keywords.includes('Divinità') && !line.cannotMoveThisTurn &&
                    !isProtectedFromEnemyMovement(opponent, line, target.value.frontName);
            })
            .flatMap(target => FRONT_NAMES
                .filter(targetFront => !player.fronts[targetFront].line)
                .map(targetFront => ({
                    label: `${target.label} → tua Linea ${FRONT_LABELS[targetFront]}`,
                    value: { frontName: target.value.frontName, targetFront }
                })));
    }
    if (id === 'set-3-072') {
        return supportChoices(opponent, 'Supporto avversario', (unit, frontName) =>
            !unit.keywords.includes('Divinità') &&
            !isProtectedFromEnemyMovement(opponent, unit, frontName)
        )
            .flatMap(target => FRONT_NAMES.flatMap(targetFront =>
                ['supA', 'supB']
                    .filter(targetSlot => !player.fronts[targetFront][targetSlot])
                    .map(targetSlot => ({
                        label: `${target.label} → tuo Supporto ${targetSlot === 'supA' ? 'A' : 'B'} in ${FRONT_LABELS[targetFront]}`,
                        value: {
                            frontName: target.value.frontName,
                            sourceSlot: target.value.slotName,
                            targetFront,
                            targetSlot
                        }
                    }))));
    }
    if (id === 'set-2-078') {
        return FRONT_NAMES.flatMap(ownFrontName =>
            FRONT_NAMES.filter(enemyFrontName =>
                player.fronts[ownFrontName].line && opponent.fronts[enemyFrontName].line
            ).map(enemyFrontName => ({
                label: `Sacrifica la tua Linea ${FRONT_LABELS[ownFrontName]} e la Linea avversaria ${FRONT_LABELS[enemyFrontName]}`,
                value: { ownFrontName, enemyFrontName }
            }))
        );
    }
    if (id === 'set-3-065') {
        return FRONT_NAMES.flatMap(frontName =>
            ['supA', 'supB']
                .filter(slotName => !player.fronts[frontName][slotName] &&
                    countUnits(player) < 3 * FRONT_NAMES.length)
                .map(slotName => ({
                    label: `${FRONT_LABELS[frontName]} · Supporto ${slotName === 'supA' ? 'A' : 'B'}`,
                    value: { frontName, slotName }
                }))
        );
    }
    if (id === 'set-3-078') {
        return [player, opponent].flatMap((owner, ownerIndex) => {
            const side = ownerIndex === 0 ? 'Tuo' : 'Avversario';
            return FRONT_NAMES.flatMap((first, index) =>
                FRONT_NAMES.slice(index + 1).map(second => ({
                    label: `${side} · ${FRONT_LABELS[first]} ↔ ${FRONT_LABELS[second]}`,
                    value: { owner: ownerIndex === 0 ? 'player' : 'opponent', first, second }
                })).filter(choice => ownerIndex === 0 ||
                    [choice.value.first, choice.value.second].every(frontName =>
                        ['line', 'supA', 'supB'].every(slotName => {
                            const unit = owner.fronts[frontName][slotName];
                            return !unit ||
                                !isProtectedFromEnemyMovement(owner, unit, frontName);
                        })
                    ))
            );
        });
    }
    if (id === 'set-3-067') {
        return FRONT_NAMES.flatMap((frontName, index) => {
            const line = opponent.fronts[frontName].line;
            if (!line || line.cannotMoveThisTurn ||
                isProtectedFromEnemyMovement(opponent, line, frontName)) return [];
            return [index - 1, index + 1]
                .filter(adjacentIndex => FRONT_NAMES[adjacentIndex] &&
                    !opponent.fronts[FRONT_NAMES[adjacentIndex]].line)
                .map(adjacentIndex => ({
                    label: `${line.name} · ${FRONT_LABELS[frontName]} → ${FRONT_LABELS[FRONT_NAMES[adjacentIndex]]}`,
                    value: { frontName, targetFront: FRONT_NAMES[adjacentIndex] }
                }));
        });
    }
    if (id === 'set-3-071') {
        return FRONT_NAMES.flatMap((frontName, index) => {
            const source = opponent.fronts[frontName];
            if (!source.line || source.line.cannotMoveThisTurn ||
                isProtectedFromEnemyMovement(opponent, source.line, frontName)) return [];
            const destinations = [index - 1, index + 1]
                .filter(adjacentIndex => FRONT_NAMES[adjacentIndex] &&
                    !opponent.fronts[FRONT_NAMES[adjacentIndex]].line);
            return ['supA', 'supB']
                .filter(slotName => source[slotName] &&
                    !source[slotName].keywords.includes('Divinità'))
                .flatMap(slotName => destinations.map(adjacentIndex => ({
                    label: `${source[slotName].name}; sposta ${source.line.name} da ${FRONT_LABELS[frontName]} a ${FRONT_LABELS[FRONT_NAMES[adjacentIndex]]}`,
                    value: { frontName, slotName, targetFront: FRONT_NAMES[adjacentIndex] }
                })));
        });
    }
    if (id === 'set-3-076') {
        return FRONT_NAMES
            .filter(frontName => SLOTS.some(slotName =>
                player.fronts[frontName][slotName]?.keywords.includes('Mente Collettiva')
            ) || SLOTS.some(slotName =>
                opponent.fronts[frontName][slotName]?.keywords.includes('Mente Collettiva')
            ))
            .map(frontName => ({
                label: `${FRONT_LABELS[frontName]} · Unità con Mente Collettiva`,
                value: { frontName }
            }));
    }
    if (id === 'set-3-077') {
        return [
            { label: `Comandante avversario · ${opponent.parasites} Parassiti`, value: { owner: 'opponent' } },
            { label: `Il tuo Comandante · ${player.parasites} Parassiti`, value: { owner: 'player' } }
        ];
    }
    if (id === 'set-3-074') {
        return [
            { commander: 'opponent', target: opponent, label: 'Comandante avversario' },
            { commander: 'player', target: player, label: 'Il tuo Comandante' }
        ].flatMap(({ commander, target, label }) => {
            if (target.parasites + 1 < 2) {
                return [{ label: `${label} · aggiungi 1 Parassita`, value: { commander } }];
            }
            const lines = anyLineChoices(player, opponent).filter(line => {
                const owner = line.value.owner === 'player' ? player : opponent;
                return !owner.fronts[line.value.frontName].line.keywords.includes('Divinità');
            });
            if (lines.length === 0) {
                return [{ label: `${label} · aggiungi 1 Parassita`, value: { commander } }];
            }
            return lines.map(line => ({
                label: `${label} · aggiungi 1 Parassita; -2 Forza a ${line.label}`,
                value: {
                    commander,
                    lineOwner: line.value.owner,
                    frontName: line.value.frontName
                }
            }));
        });
    }
    if (id === 'set-3-080') {
        return lineChoices(opponent, 'Linea avversaria', 'opponent').filter(choice => {
            const unit = opponent.fronts[choice.value.frontName].line;
            return unit.currentForce <= 4 && !unit.keywords.includes('Divinità');
        });
    }
    return [];
}

function countUnits(player) {
    return FRONT_NAMES.reduce((count, frontName) =>
        count + SLOTS.filter(slotName => player.fronts[frontName][slotName]).length, 0);
}

function removeUnit(player, frontName, slotName) {
    const front = player.fronts[frontName];
    const unit = front[slotName];
    if (!unit) return null;
    if (isProtectedFromEffectDestruction(unit, slotName)) return null;
    front[slotName] = null;
    if (slotName === 'line') {
        const next = front.supA ? 'supA' : front.supB ? 'supB' : null;
        if (next) {
            front.line = front[next];
            front.line.position = 'line';
            front[next] = next === 'supA' ? front.supB : null;
            if (next === 'supA') front.supB = null;
        }
    }
    if (unit.equipment) {
        player.discard.push(unit.equipment);
        unit.equipment = null;
    }
    if (unit.keywords.includes('Divinità')) player.discard.push(unit);
    else if (unit.keywords.includes('Eco Spettrale')) player.exile.push(unit);
    else player.discard.push(unit);
    return unit;
}

function assertEnemyUnitCanBeMoved(owner, unit, frontName) {
    if (isProtectedFromEnemyMovement(owner, unit, frontName)) {
        throw new Error(`${unit.name} non può essere spostata da effetti avversari.`);
    }
}

function destroyUnit(player, frontName, slotName) {
    const unit = player.fronts[frontName][slotName];
    if (!unit || unit.keywords.includes('Divinità')) return null;
    return removeUnit(player, frontName, slotName);
}

function moveSupport(player, choice) {
    const source = player.fronts[choice.frontName];
    const target = player.fronts[choice.targetFront];
    const unit = source[choice.slotName];
    source[choice.slotName] = null;
    target[choice.targetSlot] = unit;
    unit.front = choice.targetFront;
    unit.position = choice.targetSlot;
}

function defaultDamageLine(player, frontName, amount, onForceLoss = () => {}) {
    let remaining = amount;
    const front = player.fronts[frontName];
    while (remaining > 0 && front.line) {
        const line = front.line;
        const dealt = Math.min(remaining, Math.max(0, line.currentForce));
        line.currentForce -= dealt;
        line.damage = (line.damage || 0) + dealt;
        if (dealt > 0) onForceLoss(player, line, dealt);
        remaining -= dealt;
        if (line.currentForce <= 0) {
            removeUnit(player, frontName, 'line');
        }
    }
}

export function resolveRegisteredTactic(card, choice, player, opponent, context = {}) {
    const id = idOf(card);
    if (!isRegisteredTactic(card)) {
        throw new Error(`Nessun risolutore registrato per la Tattica ${id}.`);
    }
    const onForceLoss = context.onForceLoss || ((owner, unit, amount) => {
        if (!player.tacticEffects?.drawOnForceLoss || amount <= 0) return;
        const drawn = player.armyDeck?.pop();
        if (drawn) player.hand.push(drawn);
    });
    const damageLine = context.damageLine ||
        ((owner, frontName, amount) => defaultDamageLine(owner, frontName, amount, onForceLoss));
    const remove = context.removeUnit || removeUnit;
    const destroy = context.destroyUnit || destroyUnit;

    if (id === 'set-1-061') {
        const unit = player.fronts[choice.frontName].line;
        unit.currentForce += 2;
        unit.temporaryForce = (unit.temporaryForce || 0) + 2;
        return `${card.name}: ${unit.name} ottiene +2 Forza fino alla fine dello Scontro.`;
    }
    if (id === 'set-1-062') {
        damageLine(opponent, choice.frontName, 2);
        return `${card.name}: infligge 2 danni alla Linea avversaria in ${FRONT_LABELS[choice.frontName]}.`;
    }
    if (id === 'set-1-064') {
        const unit = player.fronts[choice.frontName].line;
        unit.damageShield = (unit.damageShield || 0) + 2;
        return `${card.name}: ${unit.name} riduce di 2 il prossimo danno che subisce in questo turno.`;
    }
    if (id === 'set-1-065') {
        moveSupport(player, choice);
        return `${card.name}: un Supporto si sposta in ${FRONT_LABELS[choice.targetFront]}.`;
    }
    if (id === 'set-2-066') {
        const owner = choice.owner === 'player' ? player : opponent;
        owner.fronts[choice.frontName].line.cannotMoveThisTurn = true;
        return `${card.name}: la Linea in ${FRONT_LABELS[choice.frontName]} non può essere spostata fino alla fine del turno.`;
    }
    if (id === 'set-3-057') {
        moveSupport(player, choice);
        return `${card.name}: un Supporto si sposta in ${FRONT_LABELS[choice.targetFront]}.`;
    }
    if (id === 'set-2-058' || id === 'set-3-061' || id === 'set-3-066') {
        const front = player.fronts[choice.frontName];
        const line = front.line;
        front.line = front[choice.slotName];
        front[choice.slotName] = line;
        front.line.position = 'line';
        front[choice.slotName].position = choice.slotName;
        return `${card.name}: Linea e Supporto si scambiano di posizione in ${FRONT_LABELS[choice.frontName]}.`;
    }
    if (id === 'set-1-066') {
        const unit = player.fronts[choice.frontName][choice.slotName];
        unit.keywords.push('Assalto');
        unit.temporaryKeywords ||= [];
        unit.temporaryKeywords.push('Assalto');
        return `${card.name}: ${unit.name} ottiene Assalto fino alla fine del turno.`;
    }
    if (id === 'set-1-069') {
        const discardIndex = player.hand.findIndex(item => item.id === choice.discardId);
        if (discardIndex < 0) throw new Error('La carta da scartare non è più in mano.');
        const [discard] = player.hand.splice(discardIndex, 1);
        player.discard.push(discard);
        const unit = player.fronts[choice.frontName].line;
        const bonus = Math.min(4, countUnits(player));
        unit.currentForce += bonus;
        unit.temporaryForce = (unit.temporaryForce || 0) + bonus;
        return `${card.name}: scarti ${discard.name}; ${unit.name} ottiene +${bonus} Forza.`;
    }
    if (id === 'set-1-070') {
        const ownLine = player.fronts[choice.frontName].line;
        const enemyLine = opponent.fronts[choice.frontName].line;
        const ownDamage = Math.max(0, ownLine.currentForce);
        const enemyDamage = Math.max(0, enemyLine.currentForce);
        damageLine(opponent, choice.frontName, ownDamage);
        damageLine(player, choice.frontName, enemyDamage);
        return `${card.name}: le Linee di ${FRONT_LABELS[choice.frontName]} si infliggono danno simultaneamente.`;
    }
    if (id === 'set-1-071') {
        const unit = player.fronts[choice.frontName][choice.slotName];
        const damage = Math.min(5, Math.max(0, unit.currentForce));
        remove(player, choice.frontName, choice.slotName);
        opponent.pc = Math.max(0, opponent.pc - damage);
        return `${card.name}: sacrifichi ${unit.name} e infliggi ${damage} danni al Comandante avversario.`;
    }
    if (id === 'set-1-073') {
        const unit = destroy(opponent, choice.frontName, choice.slotName);
        if (!unit) throw new Error('Il Supporto bersaglio non è più distruttibile.');
        return `${card.name}: ${unit.name} viene distrutto.`;
    }
    if (id === 'set-1-074') {
        const owner = choice.owner === 'player' ? player : opponent;
        const siteIndex = (owner.sites || []).findIndex(site => site.id === choice.siteId);
        if (siteIndex < 0) throw new Error('Il Sito scelto non è più in gioco.');
        const site = owner.sites[siteIndex];
        site.ruins = (site.ruins || 0) + 1;
        if (site.ruins >= 2) {
            owner.sites.splice(siteIndex, 1);
            owner.discard.push(site);
            return `${card.name}: ${site.name} raggiunge 2 Rovine e viene distrutto.`;
        }
        return `${card.name}: ${site.name} riceve 1 segnalino Rovina.`;
    }
    if (id === 'set-2-059') {
        player.tacticEffects ||= {};
        player.tacticEffects.drawOnForceLoss = true;
        return `${card.name}: peschi 1 carta ogni volta che una Linea perde Forza in questo turno.`;
    }
    if (id === 'set-1-067') {
        player.tacticEffects ||= {};
        player.tacticEffects.breakthrough = (player.tacticEffects.breakthrough || 0) + 1;
        return `${card.name}: la tua Linea infligge 1 danno aggiuntivo se supera la Linea avversaria nello stesso Fronte.`;
    }
    if (id === 'set-1-068') {
        const unit = player.fronts[choice.frontName].line;
        const bonus = unit.damageThisTurn || 0;
        unit.currentForce += bonus;
        unit.temporaryForce = (unit.temporaryForce || 0) + bonus;
        return `${card.name}: ${unit.name} ottiene +${bonus} Forza in base ai danni subiti in questo turno.`;
    }
    if (id === 'set-1-072' || id === 'set-3-070') {
        player.tacticEffects ||= {};
        player.tacticEffects.supportBonus = 2;
        return `${card.name}: ogni Supporto fornisce +2 Forza, fino a +3 per Fronte, in questo Scontro.`;
    }
    if (id === 'set-1-076') {
        const sacrificed = remove(player, choice.frontName, 'line');
        if (!sacrificed) throw new Error('La Linea da sacrificare non è più presente.');
        const enemyFront = opponent.fronts[choice.frontName];
        const victimIds = SLOTS.map(slotName => enemyFront[slotName]?.id).filter(Boolean);
        for (const victimId of victimIds) {
            const slotName = SLOTS.find(slot => enemyFront[slot]?.id === victimId);
            if (slotName) destroy(opponent, choice.frontName, slotName);
        }
        return `${card.name}: sacrifichi ${sacrificed.name}; le Unità nemiche non protette di ${FRONT_LABELS[choice.frontName]} vengono distrutte.`;
    }
    if (id === 'set-1-077') {
        player.sacrificeAfterCombat ||= [];
        let affected = 0;
        for (const frontName of FRONT_NAMES) {
            const unit = player.fronts[frontName].line;
            if (!unit) continue;
            unit.keywords.push('Assalto');
            unit.temporaryKeywords ||= [];
            unit.temporaryKeywords.push('Assalto');
            if (!player.sacrificeAfterCombat.includes(unit.id)) {
                player.sacrificeAfterCombat.push(unit.id);
            }
            affected++;
        }
        return `${card.name}: ${affected} Linee ottengono Assalto e saranno sacrificate a fine Scontro.`;
    }
    if (id === 'set-1-078') {
        player.tacticEffects ||= {};
        player.tacticEffects.doubleCentralDamage = true;
        return `${card.name}: raddoppia il danno al Comandante inflitto nel Fronte Centrale in questo turno.`;
    }
    if (id === 'set-2-056') {
        const owner = choice.owner === 'player' ? player : opponent;
        const unit = owner.fronts[choice.frontName].line;
        const amount = unit.forceLostThisTurn || 0;
        damageLine(owner, choice.frontName, amount);
        return `${card.name}: ${unit.name} subisce ${amount} danni, pari alla Forza persa in questo turno.`;
    }
    if (id === 'set-2-053' || id === 'set-2-054' || id === 'set-2-062') {
        const owner = choice.owner === 'player' ? player : opponent;
        const unit = owner.fronts[choice.frontName].line;
        const amount = id === 'set-2-053' ? 1 : id === 'set-2-054' ? 2 : 3;
        const applied = Math.min(amount, Math.max(0, unit.currentForce));
        unit.currentForce -= applied;
        unit.temporaryForce = (unit.temporaryForce || 0) - applied;
        unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) + applied;
        onForceLoss(owner, unit, applied);
        return `${card.name}: ${unit.name} perde ${amount} Forza fino alla fine dello Scontro.`;
    }
    if (id === 'set-2-057' || id === 'set-2-064') {
        const index = player.discard.findIndex(unit => unit.id === choice.cardId);
        if (index < 0) throw new Error('La carta Eco Spettrale non è più negli scarti.');
        const [unit] = player.discard.splice(index, 1);
        if (id === 'set-2-057') player.armyDeck.push(unit);
        else player.hand.push(unit);
        return id === 'set-2-057'
            ? `${card.name}: ${unit.name} viene messa in cima al mazzo.`
            : `${card.name}: ${unit.name} viene aggiunta alla mano.`;
    }
    if (id === 'set-2-061') {
        const owner = choice.owner === 'player' ? player : opponent;
        const unit = owner.fronts[choice.frontName].line;
        unit.force = Math.max(0, unit.force - 1);
        unit.currentForce = Math.max(0, unit.currentForce - 1);
        unit.damage = Math.max(0, (unit.damage || 0) - 1);
        onForceLoss(owner, unit, 1);
        return `${card.name}: ${unit.name} perde 1 Forza permanente.`;
    }
    if (id === 'set-2-065') {
        const owner = choice.owner === 'player' ? player : opponent;
        const unit = destroy(owner, choice.frontName, 'line');
        if (!unit) throw new Error('La Linea bersaglio non è più distruttibile.');
        return `${card.name}: ${unit.name} viene distrutta.`;
    }
    if (id === 'set-2-070') {
        const index = player.discard.findIndex(unit =>
            unit.id === choice.cardId && unit.keywords.includes('Eco Spettrale')
        );
        if (index < 0) throw new Error('L’Unità Eco Spettrale non è più negli scarti.');
        const unit = player.discard[index];
        const cost = Math.max(0, unit.cost || 0);
        const available = player.domains.filter(domain => !domain.tapped);
        if (available.length < cost) throw new Error(`Domini insufficienti per Risveglio Oscuro: servono ${cost}.`);
        const front = player.fronts[choice.frontName];
        if (front[choice.slotName]) throw new Error('La posizione di schieramento non è più libera.');
        available.slice(0, cost).forEach(domain => { domain.tapped = true; });
        player.discard.splice(index, 1);
        unit.currentForce = unit.force;
        unit.front = choice.frontName;
        unit.position = choice.slotName;
        front[choice.slotName] = unit;
        context.onUnitPlayed?.(player, unit);
        return `${card.name}: ${unit.name} viene giocata dagli scarti pagando ${cost} Domini.`;
    }
    if (id === 'set-2-067') {
        const owner = choice.owner === 'player' ? player : opponent;
        const index = owner.discard.findIndex(unit => unit.id === choice.cardId);
        if (index < 0) throw new Error('La carta scelta non è più negli scarti.');
        const [unit] = owner.discard.splice(index, 1);
        owner.exile.push(unit);
        const drawn = player.armyDeck.pop();
        if (drawn) player.hand.push(drawn);
        return `${card.name}: ${unit.name} viene esiliata${drawn ? `; peschi ${drawn.name}` : ', ma il mazzo è vuoto'}.`;
    }
    if (id === 'set-2-068') {
        const count = Math.min(4, player.armyDeck.length);
        const lookedAt = Array.from({ length: count }, () => player.armyDeck.pop());
        const selectedIndex = lookedAt.findIndex(unit => unit.id === choice.cardId);
        if (selectedIndex < 0) throw new Error('La carta scelta non è più tra le prime quattro.');
        const [selected] = lookedAt.splice(selectedIndex, 1);
        player.hand.push(selected);
        player.armyDeck.unshift(...lookedAt.reverse());
        return `${card.name}: ${selected.name} viene aggiunta alla mano; le altre carte guardate tornano in fondo al mazzo.`;
    }
    if (id === 'set-2-060' || id === 'set-3-063') {
        if (choice.skip) return `${card.name}: nessuna carta avversaria viene scelta.`;
        const index = opponent.hand.findIndex(item =>
            item.id === choice.cardId && item.category !== 'unit'
        );
        if (index < 0) throw new Error('La carta non-Unità scelta non è più nella mano avversaria.');
        const [selected] = opponent.hand.splice(index, 1);
        opponent.armyDeck.push(selected);
        return `${card.name}: ${selected.name} viene rimessa in cima al mazzo avversario.`;
    }
    if (id === 'set-2-063') {
        const unit = opponent.fronts[choice.frontName]?.[choice.slotName];
        if (!unit || unit.keywords?.includes('Divinità')) {
            throw new Error('L’Unità scelta non può ricevere Tormento.');
        }
        unit.tormentTurns = 2;
        return `${card.name}: ${unit.name} subisce 1 danno all'inizio di ogni turno per 2 turni.`;
    }
    if (id === 'set-2-072') {
        const victims = FRONT_NAMES.flatMap(frontName =>
            SLOTS.map(slotName => opponent.fronts[frontName][slotName])
                .filter(unit => unit && unit.currentForce <= 3 && !unit.keywords.includes('Divinità'))
                .map(unit => ({ frontName, id: unit.id }))
        );
        let destroyed = 0;
        for (const victim of victims) {
            const slotName = SLOTS.find(slot =>
                opponent.fronts[victim.frontName][slot]?.id === victim.id
            );
            if (slotName && destroy(opponent, victim.frontName, slotName)) destroyed++;
        }
        return `${card.name}: ${destroyed} Unità avversarie con Forza 3 o inferiore vengono distrutte.`;
    }
    if (id === 'set-2-074' || id === 'set-3-075') {
        const source = opponent.fronts[choice.frontName];
        const unit = source.line;
        const target = player.fronts[choice.targetFront];
        if (!unit || unit.cannotMoveThisTurn || target.line) {
            throw new Error('La Linea avversaria o la tua Linea di destinazione non sono valide.');
        }
        assertEnemyUnitCanBeMoved(opponent, unit, choice.frontName);
        source.line = null;
        target.line = unit;
        unit.front = choice.targetFront;
        unit.position = 'line';
        player.controlledUnits ||= [];
        player.controlledUnits.push({
            unitId: unit.id,
            ownerId: opponent.id,
            ownerFront: choice.frontName,
            ownerSlot: 'line'
        });
        return `${card.name}: ${unit.name} è sotto il tuo controllo fino alla fine dello Scontro.`;
    }
    if (id === 'set-2-075') {
        const owner = choice.owner === 'player' ? player : opponent;
        const index = (owner.sites || []).findIndex(site => site.id === choice.siteId);
        if (index < 0) throw new Error('Il Sito bersaglio non è più in gioco.');
        const [site] = owner.sites.splice(index, 1);
        owner.discard.push(site);
        const drawn = owner.armyDeck?.pop();
        if (drawn) owner.hand.push(drawn);
        return `${card.name}: ${site.name} viene distrutto; ${drawn ? `${owner.name || 'il suo controllore'} pesca 1 carta` : 'il suo controllore non ha carte da pescare'}.`;
    }
    if (id === 'set-2-078') {
        for (const [owner, frontName] of [
            [player, choice.ownFrontName],
            [opponent, choice.enemyFrontName]
        ]) {
            if (!owner.fronts[frontName].line) throw new Error('Una Linea scelta non è più presente.');
            remove(owner, frontName, 'line');
        }
        const recover = (owner, selection) => {
            if (selection === null) return false;
            const unit = selection
                ? owner.discard?.find(item => item.id === selection.cardId && item.category === 'unit')
                : owner.discard?.filter(item => item.category === 'unit')
                    .sort((left, right) => (right.force || 0) - (left.force || 0))[0];
            if (!unit && selection) throw new Error('L’Unità scelta non è più negli scarti.');
            if (!unit) return false;
            const destination = selection
                ? { frontName: selection.frontName, slotName: selection.slotName }
                : FRONT_NAMES.flatMap(frontName =>
                    ['supA', 'supB'].map(slotName => ({ frontName, slotName }))
                ).find(({ frontName, slotName }) => !owner.fronts[frontName][slotName]);
            if (!destination || !['supA', 'supB'].includes(destination.slotName) ||
                !owner.fronts[destination.frontName] ||
                owner.fronts[destination.frontName][destination.slotName]) {
                if (selection) throw new Error('La posizione Supporto scelta non è più disponibile.');
                return false;
            }
            owner.discard.splice(owner.discard.indexOf(unit), 1);
            unit.front = destination.frontName;
            unit.position = destination.slotName;
            owner.fronts[destination.frontName][destination.slotName] = unit;
            return true;
        };
        const playerRecovery = Object.hasOwn(choice, 'playerRecovery')
            ? choice.playerRecovery : undefined;
        const opponentRecovery = Object.hasOwn(choice, 'opponentRecovery')
            ? choice.opponentRecovery : undefined;
        const recovered = Number(recover(player, playerRecovery)) +
            Number(recover(opponent, opponentRecovery));
        return `${card.name}: entrambi i giocatori sacrificano la Linea scelta; ${recovered} Unità vengono recuperate in Supporto dove possibile.`;
    }
    if (id === 'set-3-072') {
        const unit = opponent.fronts[choice.frontName][choice.sourceSlot];
        const own = player.fronts[choice.targetFront];
        if (!unit || unit.keywords.includes('Divinità') || own[choice.targetSlot]) {
            throw new Error('Il Supporto bersaglio o la posizione non sono più validi.');
        }
        assertEnemyUnitCanBeMoved(opponent, unit, choice.frontName);
        opponent.fronts[choice.frontName][choice.sourceSlot] = null;
        own[choice.targetSlot] = unit;
        unit.front = choice.targetFront;
        unit.position = choice.targetSlot;
        player.controlledUnits ||= [];
        player.controlledUnits.push({
            unitId: unit.id,
            ownerId: opponent.id,
            ownerFront: choice.frontName,
            ownerSlot: choice.sourceSlot,
        });
        return `${card.name}: ${unit.name} è sotto il tuo controllo fino alla fine dello Scontro.`;
    }
    if (id === 'set-3-067') {
        const source = opponent.fronts[choice.frontName];
        const target = opponent.fronts[choice.targetFront];
        const unit = source.line;
        if (!unit || unit.cannotMoveThisTurn || target.line) {
            throw new Error('La Linea o il Fronte di destinazione non sono più validi.');
        }
        assertEnemyUnitCanBeMoved(opponent, unit, choice.frontName);
        source.line = null;
        target.line = unit;
        unit.front = choice.targetFront;
        unit.position = 'line';
        return `${card.name}: ${unit.name} viene spostata da ${FRONT_LABELS[choice.frontName]} a ${FRONT_LABELS[choice.targetFront]}.`;
    }
    if (id === 'set-3-071') {
        const source = opponent.fronts[choice.frontName];
        const target = opponent.fronts[choice.targetFront];
        if (!source.line || source.line.cannotMoveThisTurn || target.line) {
            throw new Error('La Linea o il Fronte di destinazione non sono più validi.');
        }
        assertEnemyUnitCanBeMoved(opponent, source.line, choice.frontName);
        const support = destroy(opponent, choice.frontName, choice.slotName);
        if (!support) throw new Error('Il Supporto bersaglio non è più distruttibile.');
        const line = source.line;
        source.line = null;
        target.line = line;
        line.front = choice.targetFront;
        line.position = 'line';
        return `${card.name}: ${support.name} viene distrutto e ${line.name} si sposta in ${FRONT_LABELS[choice.targetFront]}.`;
    }
    if (id === 'set-2-071') {
        const target = choice.owner === 'player' ? player : opponent;
        const loss = Math.min(3, Math.floor(target.discard.length / 2));
        let affected = 0;
        for (const frontName of FRONT_NAMES) {
            const unit = target.fronts[frontName].line;
            if (!unit) continue;
            const applied = Math.min(loss, Math.max(0, unit.currentForce));
            unit.currentForce -= applied;
            unit.temporaryForce = (unit.temporaryForce || 0) - applied;
            unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) + applied;
            onForceLoss(target, unit, applied);
            affected++;
        }
        return `${card.name}: ${affected} Linee perdono fino a ${loss} Forza in base agli scarti del giocatore scelto.`;
    }
    if (id === 'set-2-077') {
        player.tacticLimitActive = true;
        opponent.tacticLimitActive = true;
        return `${card.name}: ogni giocatore può giocare al massimo una Tattica per turno.`;
    }
    if (id === 'set-2-055' || id === 'set-2-073') {
        const drawCount = id === 'set-2-055' ? 1 : 3;
        const drawn = [];
        for (let index = 0; index < drawCount && player.armyDeck.length > 0; index++) {
            const unit = player.armyDeck.pop();
            player.hand.push(unit);
            drawn.push(unit);
        }
        const discarded = [...player.hand]
            .sort((left, right) => (right.cost || 0) - (left.cost || 0) ||
                String(left.id).localeCompare(String(right.id)))[0];
        if (discarded) {
            player.hand.splice(player.hand.findIndex(unit => unit.id === discarded.id), 1);
            player.discard.push(discarded);
        }
        return `${card.name}: peschi ${drawn.length}${discarded ? ` e scarti ${discarded.name}` : '; non hai carte da scartare'}.`;
    }
    if (id === 'set-3-058') {
        const unit = opponent.fronts[choice.frontName].line;
        const applied = Math.min(1, Math.max(0, unit.currentForce));
        unit.currentForce -= applied;
        unit.temporaryForce = (unit.temporaryForce || 0) - applied;
        unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) + applied;
        onForceLoss(opponent, unit, applied);
        return `${card.name}: ${unit.name} perde 1 Forza fino alla fine dello Scontro.`;
    }
    if (id === 'set-3-060' || id === 'set-3-064') {
        const unit = player.fronts[choice.frontName][choice.slotName];
        const bonus = id === 'set-3-060' ? 2 : 1;
        unit.currentForce += bonus;
        unit.temporaryForce = (unit.temporaryForce || 0) + bonus;
        return `${card.name}: ${unit.name} ottiene +${bonus} Forza fino alla fine dello Scontro.`;
    }
    if (id === 'set-3-065') {
        const unit = {
            id: `swarm-token-${player.tokenCounter || 0}`,
            catalogId: null,
            name: 'Pedina Sciame',
            category: 'unit',
            type: 'Sciame',
            force: 1,
            currentForce: 1,
            damage: 0,
            damageThisTurn: 0,
            damageShield: 0,
            temporaryForce: 0,
            keywords: [],
            temporaryKeywords: [],
            front: choice.frontName,
            position: choice.slotName,
            owner: player.id
        };
        player.tokenCounter = (player.tokenCounter || 0) + 1;
        player.fronts[choice.frontName][choice.slotName] = unit;
        return `${card.name}: una Pedina Sciame con Forza 1 entra in Supporto in ${FRONT_LABELS[choice.frontName]}.`;
    }
    if (id === 'set-3-062') {
        const unit = destroy(opponent, choice.frontName, choice.slotName);
        if (!unit) throw new Error('Il Supporto bersaglio non è più distruttibile.');
        return `${card.name}: ${unit.name} viene distrutto.`;
    }
    if (id === 'set-3-068' || id === 'set-3-079') {
        const bonus = id === 'set-3-068' ? 1 : 2;
        let affected = 0;
        for (const frontName of FRONT_NAMES) {
            for (const slotName of SLOTS) {
                const unit = player.fronts[frontName][slotName];
                if (!unit?.keywords.includes('Mente Collettiva')) continue;
                unit.currentForce += bonus;
                unit.temporaryForce = (unit.temporaryForce || 0) + bonus;
                affected++;
            }
        }
        return `${card.name}: ${affected} Unità con Mente Collettiva ottengono +${bonus} Forza fino alla fine dello Scontro.`;
    }
    if (id === 'set-3-073') {
        player.tacticEffects ||= {};
        player.tacticEffects.collectiveOverrun = (player.tacticEffects.collectiveOverrun || 0) + 1;
        return `${card.name}: infligge 1 danno aggiuntivo vincendo un Fronte con almeno 2 Unità con Mente Collettiva.`;
    }
    if (id === 'set-3-076') {
        const frontName = choice.frontName;
        let destroyed = 0;
        for (const owner of [player, opponent]) {
            const victimIds = SLOTS
                .map(slotName => owner.fronts[frontName][slotName])
                .filter(unit => unit?.keywords.includes('Mente Collettiva') &&
                    !unit.keywords.includes('Divinità'))
                .map(unit => unit.id);
            for (const victimId of victimIds) {
                const slotName = SLOTS.find(slot =>
                    owner.fronts[frontName][slot]?.id === victimId
                );
                if (slotName && destroy(owner, frontName, slotName)) destroyed++;
            }
        }
        return `${card.name}: ${destroyed} Unità con Mente Collettiva vengono distrutte in ${FRONT_LABELS[frontName]}.`;
    }
    if (id === 'set-3-077') {
        const target = choice.owner === 'player' ? player : opponent;
        target.parasites += 2;
        if (target.parasites >= 3) target.pc = Math.max(0, target.pc - 2);
        const targetName = target.name || (target === player ? 'il tuo Comandante' : 'il Comandante avversario');
        return `${card.name}: 2 Parassiti assegnati a ${targetName}${target.parasites >= 3 ? '; perde 2 PC' : ''}.`;
    }
    if (id === 'set-3-074') {
        const target = choice.commander === 'player' ? player : opponent;
        target.parasites += 1;
        if (target.parasites < 2 || !choice.frontName) {
            return `${card.name}: 1 Parassita assegnato al Comandante scelto.`;
        }
        const lineOwner = choice.lineOwner === 'player' ? player : opponent;
        const line = lineOwner.fronts[choice.frontName].line;
        if (!line) throw new Error('La Linea scelta non è più presente.');
        const applied = Math.min(2, Math.max(0, line.currentForce));
        line.currentForce -= applied;
        line.temporaryForce = (line.temporaryForce || 0) - applied;
        line.forceLostThisTurn = (line.forceLostThisTurn || 0) + applied;
        onForceLoss(lineOwner, line, applied);
        return `${card.name}: aggiunge 1 Parassita; ${line.name} perde ${applied} Forza fino alla fine dello Scontro.`;
    }
    if (id === 'set-3-078') {
        const owner = choice.owner === 'player' ? player : opponent;
        if (owner === opponent) {
            for (const frontName of [choice.first, choice.second]) {
                for (const slotName of SLOTS) {
                    const unit = owner.fronts[frontName][slotName];
                    if (unit) assertEnemyUnitCanBeMoved(owner, unit, frontName);
                }
            }
        }
        const firstFront = owner.fronts[choice.first];
        owner.fronts[choice.first] = owner.fronts[choice.second];
        owner.fronts[choice.second] = firstFront;
        for (const frontName of [choice.first, choice.second]) {
            for (const slotName of SLOTS) {
                const unit = owner.fronts[frontName][slotName];
                if (unit) {
                    unit.front = frontName;
                    unit.position = slotName;
                }
            }
        }
        return `${card.name}: i Fronti ${FRONT_LABELS[choice.first]} e ${FRONT_LABELS[choice.second]} si scambiano.`;
    }
    if (id === 'set-3-080') {
        const ownFront = player.fronts[choice.frontName];
        const collectiveCount = SLOTS.filter(slotName =>
            ownFront[slotName]?.keywords.includes('Mente Collettiva')
        ).length;
        const unit = destroy(opponent, choice.frontName, 'line');
        if (!unit) throw new Error('La Linea bersaglio non è più distruttibile.');
        if (collectiveCount >= 2) {
            const drawn = player.armyDeck.pop();
            if (drawn) player.hand.push(drawn);
        }
        return `${card.name}: ${unit.name} viene distrutta${collectiveCount >= 2 ? '; peschi una carta se disponibile' : ''}.`;
    }
    throw new Error(`Risolutore non completo per la Tattica ${id}.`);
}

export const registeredTacticIds = Object.freeze([...IMPLEMENTED_TACTICS]);

export function restoreControlledUnits(players) {
    const restored = [];
    for (const controller of players) {
        for (const control of [...(controller.controlledUnits || [])]) {
            const owner = players.find(player => player.id === control.ownerId);
            if (!owner) {
                throw new Error(`Proprietario mancante per l’Unità controllata ${control.unitId}.`);
            }
            let unit = null;
            let location = null;
            for (const [frontName, front] of Object.entries(controller.fronts)) {
                const slotName = SLOTS.find(slot => front[slot]?.id === control.unitId);
                if (!slotName) continue;
                unit = front[slotName];
                location = { front, frontName, slotName };
                break;
            }
            if (location) {
                location.front[location.slotName] = null;
                if (location.slotName === 'line') {
                    const next = location.front.supA ? 'supA' :
                        location.front.supB ? 'supB' : null;
                    if (next) {
                        location.front.line = location.front[next];
                        location.front.line.position = 'line';
                        location.front[next] = next === 'supA' ? location.front.supB : null;
                        if (next === 'supA') location.front.supB = null;
                    }
                }
            } else {
                for (const zone of ['discard', 'exile']) {
                    const index = controller[zone].findIndex(card => card.id === control.unitId);
                    if (index < 0) continue;
                    [unit] = controller[zone].splice(index, 1);
                    break;
                }
            }
            if (!unit) {
                throw new Error(`Unità controllata ${control.unitId} non trovata durante il ripristino.`);
            }
            if (unit.equipment && !location) {
                owner.discard.push(unit.equipment);
                unit.equipment = null;
            }
            if (location) {
                if (owner.fronts[control.ownerFront][control.ownerSlot]) {
                    throw new Error(`Posizione d’origine occupata durante il ripristino di ${unit.name}.`);
                }
                owner.fronts[control.ownerFront][control.ownerSlot] = unit;
                unit.front = control.ownerFront;
                unit.position = control.ownerSlot;
            } else if (unit.keywords.includes('Eco Spettrale')) {
                owner.exile.push(unit);
            } else {
                owner.discard.push(unit);
            }
            controller.controlledUnits = controller.controlledUnits.filter(
                entry => entry.unitId !== control.unitId
            );
            restored.push(unit);
        }
    }
    return restored;
}

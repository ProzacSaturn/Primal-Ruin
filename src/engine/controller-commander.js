import { applyTemporaryForce } from '../card-effects.js';
import { evaluateCommanderAbility, getCommander } from '../commanders.js';
import { grantDivinityAscension, hasAscension, hasKeyword } from '../keywords.js';
import { createToken, getUnitKeywords } from '../permanent-effects.js';
import { FRONT_NAMES, SLOT_NAMES } from './board.js';
import { FX } from './fx.js';
import { Logger } from './logger.js';
import { UIRenderer } from './renderer.js';
import { GameState } from './state.js';

const FRONT_LABELS = { left: 'Sinistra', center: 'Centro', right: 'Destra' };

function slotLabel(slotName) {
    if (slotName === 'line') return 'Linea';
    return slotName === 'supA' ? 'Supporto A' : 'Supporto B';
}

const commanderMethods = {
    applyCommanderEffects(actor, effects) {
        const opponentOf = player => GameState.players.find(candidate => candidate !== player);
        const descriptions = [];
        for (const effect of effects) {
            const target = effect.target === 'opponent' ? opponentOf(actor) : actor;
            if (!target) continue;
            if (effect.kind === 'gainEcho') {
                target.echo += effect.amount;
                descriptions.push(`${target.name} guadagna ${effect.amount} Echo`);
            } else if (effect.kind === 'addMadness') {
                target.follia = Math.min(10, target.follia + effect.amount);
                descriptions.push(`${target.name} guadagna ${effect.amount} Follia`);
            } else if (effect.kind === 'addParasite') {
                GameState.addParasites(actor, target, effect.amount);
                descriptions.push(`${effect.amount} Parassita a ${target.name}`);
            } else if (effect.kind === 'drawArmy') {
                this.drawCards(target, effect.amount, 'Comandante');
                descriptions.push(`${target.name} pesca ${effect.amount} carta`);
            } else if (effect.kind === 'announce' || effect.kind === 'note') {
                descriptions.push('effetto passivo, il tavolo non cambia ora');
            } else if (effect.kind === 'swarmOrParasite') {
                descriptions.push(this.placeSwarmOrParasite(actor));
            } else if (effect.kind === 'grantFerocity' || effect.kind === 'grantLogorare' ||
                effect.kind === 'collectiveBurst' || effect.kind === 'ascendOrTorment') {
                descriptions.push(effect.kind);
            }
        }
        return descriptions.join('; ');
    },

    placeSwarmOrParasite(actor) {
        const opponent = GameState.players.find(candidate => candidate !== actor);
        for (const frontName of FRONT_NAMES) {
            for (const slotName of ['supA', 'supB']) {
                if (!actor.fronts[frontName][slotName]) {
                    createToken(actor, frontName, slotName, 'Pedina Sciame', 1);
                    return `una pedina Sciame entra in Supporto su ${FRONT_LABELS[frontName]}`;
                }
            }
        }
        if (opponent) GameState.addParasites(actor, opponent, 1);
        return '1 Parassita sul Comandante avversario';
    },

    canPayCommander(player, commander) {
        const cost = commander.activation?.cost;
        if (!cost) return true;
        if (cost.pc) return player.pc >= cost.pc;
        if (cost.domains) {
            return player.domains.filter(domain => !domain.tapped).length >= cost.domains;
        }
        return true;
    },

    payCommander(player, commander) {
        const cost = commander.activation?.cost;
        if (!cost) return;
        if (cost.pc) {
            player.pc -= cost.pc;
            Logger.log(`${commander.name}: paghi ${cost.pc} PC.`);
            return;
        }
        if (cost.domains) {
            player.domains.filter(domain => !domain.tapped)
                .slice(0, cost.domains)
                .forEach(domain => { domain.tapped = true; });
            Logger.log(`${commander.name}: paghi ${cost.domains} Domini.`);
        }
    },

    commanderChoices(player, kind) {
        const ownLines = () => FRONT_NAMES.flatMap(frontName => {
            const unit = player.fronts[frontName].line;
            if (!unit) return [];
            return [{
                label: `${FRONT_LABELS[frontName]} · ${unit.name}`,
                value: { ownerId: player.id, frontName, slotName: 'line', unitId: unit.id }
            }];
        });
        if (kind === 'grantFerocity' || kind === 'grantLogorare') return ownLines();
        if (kind === 'collectiveBurst') {
            return FRONT_NAMES.flatMap(frontName => SLOT_NAMES.flatMap(slotName => {
                const unit = player.fronts[frontName][slotName];
                if (!unit || !hasKeyword(getUnitKeywords(player, unit, frontName, slotName), 'Mente Collettiva')) {
                    return [];
                }
                return [{
                    label: `${unit.name} · ${FRONT_LABELS[frontName]} · ${slotLabel(slotName)}`,
                    value: { ownerId: player.id, frontName, slotName, unitId: unit.id }
                }];
            }));
        }
        if (kind === 'ascendOrTorment') {
            const ordered = [...GameState.players.filter(owner => owner === player),
                ...GameState.players.filter(owner => owner !== player)];
            const choices = ordered.flatMap(owner => FRONT_NAMES.flatMap(frontName =>
                SLOT_NAMES.flatMap(slotName => {
                    const unit = owner.fronts[frontName][slotName];
                    if (!unit || unit.infiltrated && owner === player) return [];
                    return [{
                        label: `${unit.name} · ${owner === player ? 'tua' : 'avversaria'} · ${FRONT_LABELS[frontName]}`,
                        value: { ownerId: owner.id, frontName, slotName, unitId: unit.id }
                    }];
                })
            ));
            return choices.sort((left, right) => {
                const leftUnit = this.commanderUnit(left.value);
                const rightUnit = this.commanderUnit(right.value);
                return Number(hasAscension(rightUnit)) - Number(hasAscension(leftUnit));
            });
        }
        return [];
    },

    commanderUnit(choice) {
        const owner = GameState.players.find(candidate => candidate.id === choice?.ownerId);
        const unit = owner?.fronts[choice.frontName]?.[choice.slotName];
        if (!unit || unit.id !== choice.unitId) return null;
        return unit;
    },

    resolveCommanderRifornimento(player) {
        const commander = getCommander(player.commanderId);
        if (!commander?.rifornimento) return;
        const result = evaluateCommanderAbility(commander.rifornimento, { self: player });
        if (!result.ok) {
            Logger.log(`${commander.name}: abilità di Rifornimento non si attiva (${result.reason}).`);
            return;
        }
        const summary = this.applyCommanderEffects(player, result.effects);
        Logger.log(`${commander.name} — Rifornimento: ${summary || 'nessun effetto'}.`);
    },

    activateCommanderAbility() {
        this.startCommanderActivation(GameState.players[0], false);
    },

    activateAutomaticCommander(player) {
        this.startCommanderActivation(player, true);
    },

    startCommanderActivation(player, automatic) {
        if (!player || player.commanderAbilityUsed || GameState.gameOver) return;
        if (!automatic) {
            if (GameState.phase !== 'principale' || GameState.currentIndex !== 0) return;
            if (GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment) return;
        }
        const commander = getCommander(player.commanderId);
        if (!commander?.activation) return;
        const kind = commander.activation.ops?.[0]?.type;
        if (!this.canPayCommander(player, commander)) {
            if (!automatic) Logger.log(`${commander.name}: costo non disponibile.`);
            return;
        }
        const choices = this.commanderChoices(player, kind);
        if (choices.length === 0) {
            if (!automatic) Logger.log(`${commander.name}: nessun bersaglio legale.`);
            return;
        }
        if (!automatic && player === GameState.players[0] && choices.length > 1) {
            GameState.pendingTactic = {
                mode: 'commander',
                kind,
                card: { name: commander.activation.name, id: commander.id },
                choices
            };
            UIRenderer.renderControls();
            document.getElementById('tactic-choice')?.focus();
            return;
        }
        this.commitCommanderActivation(player, kind, choices[0].value);
    },

    commitCommanderActivation(player, kind, choice) {
        const commander = getCommander(player.commanderId);
        if (!commander || player.commanderAbilityUsed) return;
        if (!this.canPayCommander(player, commander)) {
            Logger.log(`${commander.name}: costo non più disponibile.`);
            UIRenderer.refresh();
            return;
        }
        const unit = this.commanderUnit(choice);
        if (!unit) {
            Logger.log(`${commander.name}: il bersaglio non è più in gioco.`);
            UIRenderer.refresh();
            return;
        }
        this.payCommander(player, commander);
        player.commanderAbilityUsed = true;
        const owner = GameState.players.find(candidate => candidate.id === choice.ownerId);
        const opponent = GameState.players.find(candidate => candidate !== player);
        if (kind === 'grantFerocity') {
            const keywords = getUnitKeywords(owner, unit, choice.frontName, choice.slotName);
            if (hasKeyword(keywords, 'Ferocia')) {
                applyTemporaryForce(unit, 1);
                Logger.log(`${unit.name} ha già Ferocia: +1 Forza fino alla fine del turno.`);
            } else {
                unit.keywords = unit.keywords || [];
                unit.temporaryKeywords = unit.temporaryKeywords || [];
                unit.keywords.push('Ferocia');
                unit.temporaryKeywords.push('Ferocia');
                Logger.log(`${unit.name} ottiene Ferocia fino alla fine del turno.`);
            }
        } else if (kind === 'grantLogorare') {
            const keywords = getUnitKeywords(owner, unit, choice.frontName, choice.slotName);
            if (hasKeyword(keywords, 'Logorare')) {
                const enemyLine = opponent?.fronts[choice.frontName].line;
                if (enemyLine) {
                    applyTemporaryForce(enemyLine, -1);
                    Logger.log(`Logorare già presente: la Linea avversaria perde 1 Forza.`);
                } else {
                    Logger.log('Logorare già presente, ma il Fronte avversario non ha una Linea.');
                }
            } else {
                unit.keywords = unit.keywords || [];
                unit.temporaryKeywords = unit.temporaryKeywords || [];
                unit.keywords.push('Logorare');
                unit.temporaryKeywords.push('Logorare');
                Logger.log(`${unit.name} ottiene Logorare fino alla fine del turno.`);
            }
        } else if (kind === 'collectiveBurst') {
            applyTemporaryForce(unit, 2);
            if (opponent) GameState.addParasites(player, opponent, 1);
            Logger.log(`${unit.name} ottiene +2 Forza e applica 1 Parassita.`);
        } else if (kind === 'ascendOrTorment') {
            if (hasAscension(unit)) {
                grantDivinityAscension(unit);
                Logger.log(`${unit.name} subisce Ascensione: +1 Forza permanente e il tipo Divinità.`);
            } else if (opponent) {
                opponent.tormentCounters = (opponent.tormentCounters || 0) + 1;
                Logger.log(`${opponent.name} riceve 1 segnalino Tormento.`);
            }
        }
        FX.play('play');
        if (GameState.checkVictory()) return;
        UIRenderer.refresh();
    }
};

export { commanderMethods };

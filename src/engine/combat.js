import {
    calculateUnitCombatStrength,
    compareCombatStrengths,
    defaultPromotionSlot,
    shouldUseTorment
} from '../game-rules.js';
import {
    createToken,
    getDamageReduction,
    getFerocityBonus,
    getSupportBonus,
    getUnitForceBonus,
    getUnitKeywords,
    playerUnits
} from '../permanent-effects.js';
import { restoreControlledUnits } from '../tactics.js';
import {
    getCommanderVictoryDamageEffects,
    getUnitDestructionEffects,
    getUnitDestructionReactions,
    getUnitLineDestructionEffects,
    isProtectedFromEffectDestruction,
    isProtectedFromEnemyMovement,
    shouldDestroySupportOnUnitLineWin
} from '../unit-triggers.js';
import { FRONT_LABELS, FRONT_NAMES, SLOT_NAMES } from './board.js';
import { GameController } from './controller.js';
import { FX } from './fx.js';
import { Logger } from './logger.js';
import { UIRenderer } from './renderer.js';
import { GameState } from './state.js';

const CombatResolver = {
    async resolveAll() {
        Logger.log('=== FASE DI SCONTRO: SINISTRA → CENTRO → DESTRA ===');
        FX.play('attack');
        for (const frontName of FRONT_NAMES) {
            if (GameState.gameOver) break;
            await this.resolveFront(frontName);
        }
        GameState.checkVictory();
        UIRenderer.refresh();
    },

    strength(player, frontName, enemyLine) {
        const front = player.fronts[frontName];
        if (!front.line) return 0;
        const collective = SLOT_NAMES.map(slot => front[slot])
            .filter(unit => unit?.keywords.includes('Mente Collettiva')).length;
        const opponentPlayer = player === GameState.players[0]
            ? GameState.players[1] : GameState.players[0];
        const wearMatch = enemyLine && getUnitKeywords(
            opponentPlayer, enemyLine, frontName, 'line'
        ).find(keyword => keyword.startsWith('Logorare'));
        const wearPenalty = wearMatch ? Number(wearMatch.match(/\((\d+)\)/)?.[1] || 1) : 0;
        const keywords = getUnitKeywords(player, front.line, frontName, 'line');
        const effectiveLine = {
            ...front.line,
            currentForce: front.line.currentForce +
                getUnitForceBonus(player, front.line, frontName, 'line',
                    player === GameState.players[0] ? GameState.players[1] : GameState.players[0]),
            keywords
        };
        const staticSupport = getSupportBonus(player, frontName);
        const supportBonus = player.tacticEffects?.supportBonus
            ? Math.min(3, Number(Boolean(front.supA)) * player.tacticEffects.supportBonus +
                Number(Boolean(front.supB)) * player.tacticEffects.supportBonus)
            : staticSupport;
        return calculateUnitCombatStrength({
            line: effectiveLine,
            supportCount: supportBonus,
            supportBonusPerUnit: 1,
            supportBonusCap: 3,
            collectiveCount: collective,
            fewerUnits: GameState.countUnits(player) < GameState.countUnits(
                opponentPlayer
            ),
            logorare: wearPenalty,
            ferocityBonus: getFerocityBonus(player, front.line, frontName, 'line',
                GameState.countUnits(player) < GameState.countUnits(opponentPlayer))
        });
    },

    commanderDamage(winner, loser, frontName, margin) {
        const effects = winner.tacticEffects || {};
        const ownFront = winner.fronts[frontName];
        const opposingFront = loser.fronts[frontName];
        let bonus = 0;
        if (effects.breakthrough && ownFront.line && opposingFront.line &&
            ownFront.line.currentForce > opposingFront.line.currentForce) {
            bonus += effects.breakthrough;
        }
        if (effects.collectiveOverrun) {
            const collectiveCount = SLOT_NAMES.filter(slot =>
                ownFront[slot]?.keywords.includes('Mente Collettiva')
            ).length;
            if (collectiveCount >= 2) bonus += effects.collectiveOverrun;
        }
        const winningLine = ownFront.line;
        if (winningLine && getUnitKeywords(winner, winningLine, frontName, 'line')
            .some(keyword => keyword.startsWith('Logorare')) &&
            winner.sites?.some(site => site.catalogId === 'set-2-097')) {
            bonus++;
        }
        const unitDamage = getCommanderVictoryDamageEffects(
            playerUnits(winner).map(entry => entry.unit),
            winningLine,
            winner.frontWinsThisTurn || 0,
            GameState.turnNumber,
            !opposingFront.line
        );
        bonus += unitDamage.amount;
        for (const unit of unitDamage.oncePerTurnSources) {
            unit.lastWinDamageTurn = GameState.turnNumber;
        }
        if (winner.frontWinsThisTurn >= 2 && winner.field?.catalogId === 'set-1-119' &&
            winner.field.lastExtraDamageTurn !== GameState.turnNumber) {
            winner.field.lastExtraDamageTurn = GameState.turnNumber;
            bonus++;
        }
        const damage = margin + bonus;
        return frontName === 'center' && effects.doubleCentralDamage
            ? damage * 2
            : damage;
    },

    resolveUnitLineWinEffects(loser, frontName, winningLine) {
        if (!shouldDestroySupportOnUnitLineWin(winningLine)) return;
        const slotName = ['supA', 'supB'].find(slotName =>
            loser.fronts[frontName][slotName] &&
            !loser.fronts[frontName][slotName].keywords.includes('Divinità')
        );
        if (slotName) {
            CombatResolver.destroyUnit(loser, frontName, slotName, 'effect-destroy');
        }
    },

    async resolveFront(frontName) {
        const attacker = GameState.current;
        const defender = GameState.opponent;
        const attackFront = attacker.fronts[frontName];
        const defendFront = defender.fronts[frontName];
        if (!attackFront.line && !defendFront.line) {
            Logger.log(`${FRONT_LABELS[frontName]}: nessuna Linea, nessuno scontro.`);
            return;
        }
        if (!attackFront.line && defendFront.line) {
            defender.frontWinsThisTurn = (defender.frontWinsThisTurn || 0) + 1;
            Logger.log(`${FRONT_LABELS[frontName]}: fronte scoperto.`);
            this.resolveUnitLineWinEffects(
                attacker,
                frontName,
                defendFront.line
            );
            const damage = this.commanderDamage(
                defender, attacker, frontName, this.strength(defender, frontName, null)
            );
            await this.dealCommanderDamage(attacker, frontName, damage);
            GameState.checkVictory();
            return;
        }
        if (!attackFront.line) return;
        const attackStrength = this.strength(attacker, frontName, defendFront.line);
        if (!defendFront.line) {
            attacker.frontWinsThisTurn = (attacker.frontWinsThisTurn || 0) + 1;
            this.resolveUnitLineWinEffects(
                defender,
                frontName,
                attackFront.line
            );
            const damage = this.commanderDamage(attacker, defender, frontName, attackStrength);
            Logger.log(`${FRONT_LABELS[frontName]} scoperto: ${damage} danni al Comandante.`);
            await this.dealCommanderDamage(defender, frontName, damage);
            GameState.checkVictory();
            UIRenderer.refresh();
            return;
        }
        const defendStrength = this.strength(defender, frontName, attackFront.line);
        Logger.log(`${FRONT_LABELS[frontName]}: ${attackStrength} vs ${defendStrength}.`);
        const comparison = compareCombatStrengths(attackStrength, defendStrength);
        if (comparison.result === 'tie') {
            Logger.log('Parità: entrambe le Linee subiscono 1 danno.');
            await this.damageLine(attacker, frontName, 1);
            await this.damageLine(defender, frontName, 1);
            return;
        }
        const winner = comparison.result === 'left-wins' ? attacker : defender;
        const loser = winner === attacker ? defender : attacker;
        winner.frontWinsThisTurn = (winner.frontWinsThisTurn || 0) + 1;
        const difference = comparison.margin;
        const commanderDamage = this.commanderDamage(winner, loser, frontName, difference);
        const winningLine = winner.fronts[frontName].line;
        this.resolveUnitLineWinEffects(loser, frontName, winningLine);
        Logger.log(`${winner.name} vince il Fronte di ${difference}.`);
        if (winningLine.keywords.some(keyword => keyword.startsWith('Tormento'))) {
            const value = Number(winningLine.keywords.find(keyword => keyword.startsWith('Tormento')).match(/\((\d+)\)/)?.[1] || 1);
            const useTorment = await this.chooseTorment(winner, loser, frontName, commanderDamage, value);
            if (useTorment) {
                loser.follia = Math.min(10, loser.follia + value);
                Logger.log(`Tormento: ${loser.name} riceve ${value} Follia invece dei danni al Comandante.`);
            } else {
                await this.dealCommanderDamage(loser, frontName, commanderDamage);
            }
        } else {
            await this.dealCommanderDamage(loser, frontName, commanderDamage);
        }
        if (!GameState.gameOver) await this.damageLine(loser, frontName, difference, winner);
        GameState.checkVictory();
        UIRenderer.refresh();
    },

    async chooseTorment(winner, loser, frontName, commanderDamage, torment) {
        if (winner !== GameState.players[0]) {
            const useTorment = shouldUseTorment({
                commanderPc: loser.pc,
                madness: loser.follia,
                commanderDamage,
                torment
            });
            Logger.log(
                `L’avversario sceglie ${useTorment ? 'Tormento' : 'il danno al Comandante'} sul Fronte ${FRONT_LABELS[frontName]}.`
            );
            return useTorment;
        }
        UIRenderer.renderControls();
        return new Promise(resolve => {
            GameState.pendingTorment = {
                winnerName: winner.name,
                frontName,
                commanderDamage,
                torment,
                resolve
            };
            UIRenderer.renderControls();
            document.getElementById('btn-torment-madness').focus();
        });
    },

    chooseTormentOutcome(useTorment) {
        const pending = GameState.pendingTorment;
        if (!pending) return;
        GameState.pendingTorment = null;
        Logger.log(
            `Scegli ${useTorment ? `${pending.torment} Follia` : `${pending.commanderDamage} danni al Comandante`} con Tormento.`
        );
        pending.resolve(useTorment);
        UIRenderer.renderControls();
    },

    async dealCommanderDamage(defender, frontName, amount) {
        if (defender === GameState.players[1] && amount > 0) {
            const units = GameState.unitsInFront(defender, frontName)
                .filter(unit => unit.currentForce > 0)
                .sort((a, b) => a.currentForce - b.currentForce || a.name.localeCompare(b.name));
            const totalSacrifice = units.reduce((sum, unit) => sum + unit.currentForce, 0);
            const shouldSacrifice = defender.pc <= 8 || amount >= 4;
            if (shouldSacrifice && totalSacrifice >= amount) {
                let prevented = 0;
                for (const unit of units) {
                    if (prevented >= amount) break;
                    prevented += unit.currentForce;
                    CombatResolver.removeUnit(
                        defender,
                        frontName,
                        unit.position
                    );
                }
                amount = Math.max(0, amount - prevented);
                Logger.log(`L’avversario sacrifica Unità per prevenire ${prevented} danni al Comandante.`);
            }
        }
        if (defender !== GameState.players[0] || amount <= 0 ||
            GameState.unitsInFront(defender, frontName).length === 0) {
            defender.pc = Math.max(0, defender.pc - amount);
            Logger.log(`${defender.name} perde ${amount} PC.`);
            return;
        }
        GameState.sacrifice = { frontName, remaining: amount, resolve: null };
        Logger.log(`Puoi sacrificare Unità in ${FRONT_LABELS[frontName]} per prevenire danni al Comandante, oppure confermare.`);
        UIRenderer.refresh();
        await new Promise(resolve => { GameState.sacrifice.resolve = resolve; });
        if (GameState.sacrifice.remaining > 0) {
            defender.pc = Math.max(0, defender.pc - GameState.sacrifice.remaining);
            Logger.log(`${defender.name} perde ${GameState.sacrifice.remaining} PC.`);
        } else {
            Logger.log('Tutto il danno al Comandante è stato prevenuto.');
        }
        GameState.sacrifice = null;
        UIRenderer.refresh();
    },

    removeUnit(player, frontName, slotName, reason = 'removed', sourcePlayer = null, promotionSlot = null) {
        const front = player.fronts[frontName];
        const unit = front[slotName];
        if (!unit) return;
        if (reason === 'effect-destroy' &&
            isProtectedFromEffectDestruction(unit, slotName)) {
            Logger.log(`${unit.name} non può essere distrutta da effetti mentre è in Linea.`);
            return null;
        }
        front[slotName] = null;
        const controller = GameState.players.find(candidate =>
            candidate.controlledUnits?.some(control => control.unitId === unit.id)
        );
        const controlIndex = controller?.controlledUnits.findIndex(control =>
            control.unitId === unit.id
        ) ?? -1;
        const control = controlIndex >= 0 ? controller.controlledUnits[controlIndex] : null;
        const owner = control
            ? GameState.players.find(candidate => candidate.id === control.ownerId) || player
            : player;
        if (control) controller.controlledUnits.splice(controlIndex, 1);
        if (unit.keywords.includes('Divinità')) {
            owner.discard.push(unit);
            Logger.log(`${unit.name} viene Sigillata e va negli scarti.`);
        } else if (unit.keywords.includes('Eco Spettrale')) {
            owner.exile.push(unit);
            Logger.log(`${unit.name} viene esiliata (Eco Spettrale).`);
        } else {
            owner.discard.push(unit);
            Logger.log(`${unit.name} va negli scarti.`);
        }
        this.onUnitRemoved(player, unit, frontName, reason, sourcePlayer);
        if (slotName === 'line') this.promoteSupport(front, player, frontName, promotionSlot);
        const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
        if (slotName === 'line' && !front.line && enemy.field?.catalogId === 'set-1-117') {
            player.pc = Math.max(0, player.pc - 1);
            Logger.log(`${enemy.field.name}: ${player.name} perde 1 PC perché un Fronte diventa scoperto.`);
            GameState.checkVictory();
        }
    },

    destroyUnit(player, frontName, slotName, reason = 'effect-destroy') {
        const unit = player.fronts[frontName]?.[slotName];
        if (!unit || unit.keywords.includes('Divinità')) return null;
        this.removeUnit(player, frontName, slotName, reason);
        return unit;
    },

    onUnitRemoved(owner, unit, frontName, reason, sourcePlayer = null) {
        if (unit.keywords.includes('Eco Spettrale') &&
            owner.sites?.some(site => site.catalogId === 'set-2-099')) {
            GameController.drawCards(owner, 1, 'Santuario della Seconda Morte');
        }
        const destroyed = reason === 'combat-destroy' || reason === 'effect-destroy';
        const enemy = owner === GameState.players[0] ? GameState.players[1] : GameState.players[0];
        if (!destroyed) return;
        for (const effect of getUnitDestructionEffects(unit)) {
            if (effect.type === 'damage-enemy-line-in-front' &&
                enemy.fronts[frontName].line) {
                this.damageLine(enemy, frontName, effect.amount, owner, true);
            }
        }
        if (reason === 'combat-destroy' && owner.sites?.some(site => site.catalogId === 'set-1-096')) {
            const target = FRONT_NAMES.find(name => enemy.fronts[name].line);
            if (target) this.damageLine(enemy, target, 1, owner, true);
        }
        if (owner.sites?.some(site => site.catalogId === 'set-2-080')) {
            GameController.drawCards(owner, 1, 'Pozzo delle Anime');
            const siteIndex = owner.sites.findIndex(site => site.catalogId === 'set-2-080');
            owner.discard.push(...owner.sites.splice(siteIndex, 1));
        }
        if (unit.keywords.includes('Mente Collettiva') &&
            owner.sites?.some(site => site.catalogId === 'set-3-095')) {
            const frontName = FRONT_NAMES.find(name =>
                owner.fronts[name].line && (!owner.fronts[name].supA || !owner.fronts[name].supB)
            );
            if (frontName) {
                const front = owner.fronts[frontName];
                createToken(owner, frontName, front.supA ? 'supB' : 'supA');
            }
        }
        if (destroyed) {
            const destroyedKeywords = getUnitKeywords(owner, unit, frontName, unit.position);
            const reactions = getUnitDestructionReactions(
                playerUnits(owner).map(entry => entry.unit),
                { ...unit, keywords: destroyedKeywords },
                GameState.turnNumber
            );
            for (const reaction of reactions) {
                if (reaction.type === 'draw-card') {
                    reaction.source.lastDestroyedDrawTurn = GameState.turnNumber;
                    GameController.drawCards(owner, 1, reaction.source.name);
                } else if (reaction.type === 'create-support-token') {
                    const targetFront = FRONT_NAMES.find(name =>
                        owner.fronts[name].line &&
                        (!owner.fronts[name].supA || !owner.fronts[name].supB)
                    );
                    if (targetFront) {
                        const front = owner.fronts[targetFront];
                        createToken(owner, targetFront, front.supA ? 'supB' : 'supA');
                    }
                }
            }
        }
        if (unit.catalogId === 'set-2-014' && destroyed) {
            owner.pc = Math.max(0, owner.pc - 1);
            Logger.log(`${unit.name}: perdi 1 PC quando viene distrutto.`);
            GameState.checkVictory();
        }
        if (reason === 'combat-destroy' && enemy.sites?.some(site => site.catalogId === 'set-2-092')) {
            GameController.drawCards(enemy, 1, 'Santuario delle Ombre');
        }
        if (reason !== 'combat-destroy' || !sourcePlayer || unit.position !== 'line') return;
        const activeLine = sourcePlayer.fronts[frontName].line;
        const equipmentId = activeLine?.equipment?.catalogId;
        for (const effect of getUnitLineDestructionEffects(activeLine)) {
            if (effect.type === 'commander-damage') {
                owner.pc = Math.max(0, owner.pc - effect.amount);
                Logger.log(`${activeLine.name}: ${owner.name} perde ${effect.amount} PC aggiuntivi.`);
                GameState.checkVictory();
            } else if (effect.type === 'draw-card') {
                GameController.drawCards(sourcePlayer, 1, activeLine.name);
            } else if (effect.type === 'add-parasite') {
                GameState.addParasites(sourcePlayer, owner, 1);
            } else if (effect.type === 'exile-from-discard') {
                const discardOwner = [sourcePlayer, owner].find(candidate => candidate.discard.length);
                if (discardOwner) {
                    const [exiled] = discardOwner.discard.splice(0, 1);
                    discardOwner.exile.push(exiled);
                    Logger.log(`${activeLine.name}: ${exiled.name} viene esiliata dagli scarti.`);
                }
            } else if (effect.type === 'put-spectral-card-on-top') {
                const index = sourcePlayer.discard.findIndex(card =>
                    card.keywords?.some(keyword => keyword.startsWith('Eco Spettrale'))
                );
                if (index >= 0) {
                    const [recovered] = sourcePlayer.discard.splice(index, 1);
                    sourcePlayer.armyDeck.push(recovered);
                    Logger.log(`${activeLine.name}: ${recovered.name} viene messa in cima al mazzo.`);
                }
            } else if (effect.type === 'destroy-enemy-support-in-front') {
                const slotName = ['supA', 'supB'].find(slot =>
                    enemy.fronts[frontName][slot] &&
                    !enemy.fronts[frontName][slot].keywords.includes('Divinità')
                );
                if (slotName) {
                    this.destroyUnit(enemy, frontName, slotName, 'effect-destroy');
                }
            } else if (effect.type === 'temporary-force') {
                activeLine.currentForce += effect.amount;
                activeLine.temporaryForce = (activeLine.temporaryForce || 0) + effect.amount;
                Logger.log(`${activeLine.name}: ottiene +${effect.amount} Forza fino alla fine del turno.`);
            }
        }
        if (sourcePlayer.sites?.some(site => site.catalogId === 'set-3-100')) {
            const movedFrom = FRONT_NAMES.find((name, index) => {
                const unit = enemy.fronts[name].line;
                if (name === frontName || !unit ||
                    isProtectedFromEnemyMovement(enemy, unit, name)) return false;
                return [index - 1, index + 1].some(targetIndex =>
                    FRONT_NAMES[targetIndex] && !enemy.fronts[FRONT_NAMES[targetIndex]].line
                );
            });
            if (movedFrom) {
                const sourceIndex = FRONT_NAMES.indexOf(movedFrom);
                const targetIndex = [sourceIndex - 1, sourceIndex + 1].find(index =>
                    FRONT_NAMES[index] && !enemy.fronts[FRONT_NAMES[index]].line
                );
                const movedUnit = enemy.fronts[movedFrom].line;
                enemy.fronts[movedFrom].line = null;
                this.promoteSupport(enemy.fronts[movedFrom], enemy, movedFrom);
                enemy.fronts[FRONT_NAMES[targetIndex]].line = movedUnit;
                movedUnit.front = FRONT_NAMES[targetIndex];
                movedUnit.position = 'line';
                GameState.onUnitMoved(enemy, movedUnit, movedFrom, FRONT_NAMES[targetIndex], true);
                Logger.log(`${sourcePlayer.sites.find(site => site.catalogId === 'set-3-100').name}: ${movedUnit.name} si sposta in ${FRONT_LABELS[FRONT_NAMES[targetIndex]]}.`);
            }
        }
        if (equipmentId === 'set-3-108') GameState.addParasites(sourcePlayer, owner, 1);
        if (equipmentId === 'set-2-108') {
            const slot = ['supA', 'supB'].find(name => {
                const unit = enemy.fronts[frontName][name];
                return unit && !isProtectedFromEnemyMovement(enemy, unit, frontName);
            });
            if (slot) {
                const moved = enemy.fronts[frontName][slot];
                const destination = FRONT_NAMES.flatMap(targetFront => ['supA', 'supB']
                    .filter(targetSlot => !enemy.fronts[targetFront][targetSlot])
                    .map(targetSlot => ({ targetFront, targetSlot })))
                    .find(entry => entry.targetFront !== frontName);
                if (destination) {
                    enemy.fronts[frontName][slot] = null;
                    enemy.fronts[destination.targetFront][destination.targetSlot] = moved;
                    moved.front = destination.targetFront;
                    moved.position = destination.targetSlot;
                    GameState.onUnitMoved(
                        enemy,
                        moved,
                        frontName,
                        destination.targetFront
                    );
                }
            }
        }
        if (sourcePlayer.sites?.some(site => site.catalogId === 'set-2-102')) {
            const index = owner.discard.findIndex(card => card.id === unit.id);
            if (index >= 0) {
                const [destroyedUnit] = owner.discard.splice(index, 1);
                sourcePlayer.discard.push(destroyedUnit);
            }
        }
        if (sourcePlayer.field?.catalogId === 'set-1-114' ||
            (sourcePlayer.field?.catalogId === 'set-2-116' &&
                getUnitKeywords(sourcePlayer, activeLine, frontName, 'line')
                    .some(keyword => keyword.startsWith('Logorare')) ) ||
            (sourcePlayer.field?.catalogId === 'set-3-118' &&
                getUnitKeywords(sourcePlayer, activeLine, frontName, 'line')
                    .some(keyword => keyword.startsWith('Mente Collettiva')))) {
            GameController.drawCards(sourcePlayer, 1, sourcePlayer.field.name);
        }
        if (sourcePlayer.sites?.some(site => site.catalogId === 'set-1-106') &&
            sourcePlayer.sites.find(site => site.catalogId === 'set-1-106').lastKillTurn !== GameState.turnNumber) {
            sourcePlayer.sites.find(site => site.catalogId === 'set-1-106').lastKillTurn = GameState.turnNumber;
            owner.pc = Math.max(0, owner.pc - 1);
        }
        if (equipmentId === 'set-1-084') owner.pc = Math.max(0, owner.pc - 1);
        if (sourcePlayer.sites?.some(site => site.catalogId === 'set-1-106') || equipmentId === 'set-1-084') {
            Logger.log(`${sourcePlayer.name} infligge 1 danno aggiuntivo per la Linea distrutta.`);
        }
    },

    onForceLoss(owner, unit, amount, sourcePlayer, triggerEquipment = true) {
        for (const player of GameState.players) {
            if (!player.tacticEffects?.drawOnForceLoss) continue;
            const drawn = player.armyDeck.pop();
            if (drawn) {
                player.hand.push(drawn);
                Logger.log(`${player.name} pesca 1 carta per Eco del Dolore.`);
            }
        }
        if (amount > 0) {
            const victimFront = unit.front;
            if (sourcePlayer?.sites?.some(site => site.catalogId === 'set-2-084') &&
                sourcePlayer.sites.every(site =>
                    site.catalogId !== 'set-2-084' || site.lastDamageTriggerTurn !== GameState.turnNumber
                )) {
                const site = sourcePlayer.sites.find(item => item.catalogId === 'set-2-084');
                if (site) {
                    site.lastDamageTriggerTurn = GameState.turnNumber;
                    owner.pc = Math.max(0, owner.pc - 1);
                }
            }
            if (triggerEquipment && amount > 0 &&
                unit.equipment?.catalogId === 'set-2-110') {
                const targetPlayer = owner === GameState.players[0]
                    ? GameState.players[1] : GameState.players[0];
                GameState.applyForceLoss(
                    targetPlayer,
                    unit.front,
                    1,
                    unit.equipment.name,
                    owner,
                    false
                );
            }
            const fieldOwner = GameState.players.find(player =>
                player !== owner && player.field?.catalogId === 'set-2-118'
            );
            if (fieldOwner && fieldOwner.field.lastTriggerTurn !== GameState.turnNumber) {
                fieldOwner.field.lastTriggerTurn = GameState.turnNumber;
                owner.pc = Math.max(0, owner.pc - 1);
                Logger.log(`${fieldOwner.field.name}: ${owner.name} perde 1 PC.`);
                GameState.checkVictory();
            }
            if (owner.sites?.some(site => site.catalogId === 'set-2-098') &&
                (unit.forceLostThisTurn || 0) >= 2) {
                const slot = ['supA', 'supB'].find(name => owner.fronts[victimFront][name]);
                if (slot) this.destroyUnit(owner, victimFront, slot);
            }
        }
    },

    restoreControlledUnits() {
        for (const unit of restoreControlledUnits(GameState.players)) {
            Logger.log(`${unit.name} torna sotto il controllo del suo proprietario.`);
        }
    },

    promoteSupport(front, player, frontName, slot = null) {
        const next = slot || (front.supA ? 'supA' : front.supB ? 'supB' : null);
        if (!next || !front[next]) return;
        front.line = front[next];
        front.line.position = 'line';
        front[next] = next === 'supA' ? front.supB : null;
        if (next === 'supA') front.supB = null;
        if (front.supA) front.supA.position = 'supA';
        GameState.onEquipmentPositionEntry(player, front.line, 'line');
        Logger.log(`${front.line.name} viene promosso a Linea.`);
    },

    // Apre il prompt con cui il giocatore umano sceglie quale Supporto diventa la
    // nuova Linea quando la Linea viene distrutta e ci sono due Supporti.
    promptPromotionSlot(player, frontName) {
        return new Promise(resolve => {
            GameState.pendingPromotion = {
                frontName,
                supports: ['supA', 'supB'].filter(slot => player.fronts[frontName][slot]),
                resolve
            };
            Logger.log(`Scegli quale Supporto diventa la nuova Linea di ${FRONT_LABELS[frontName]}.`);
            UIRenderer.renderControls();
            document.getElementById('promotion-choice').focus();
        });
    },

    choosePromotionSlot(slot) {
        const pending = GameState.pendingPromotion;
        if (!pending || !pending.supports.includes(slot)) return;
        GameState.pendingPromotion = null;
        pending.resolve(slot);
        UIRenderer.renderControls();
    },

    async damageLine(player, frontName, amount, sourcePlayer = null, reflected = false) {
        const front = player.fronts[frontName];
        let remaining = amount;
        while (remaining > 0 && front.line) {
            const line = front.line;
            if (line.damageShield > 0) {
                const prevented = Math.min(remaining, line.damageShield);
                line.damageShield = 0;
                remaining -= prevented;
                Logger.log(`${line.name} previene ${prevented} danni.`);
                if (remaining === 0) break;
            }
            const slotName = 'line';
            const reduction = getDamageReduction(player, line, frontName, slotName);
            const prevented = Math.min(remaining, reduction);
            remaining -= prevented;
            if (prevented) Logger.log(`${line.name} previene ${prevented} danni grazie all’Equipaggiamento/Sito.`);
            if (!remaining) break;
            const dealt = Math.min(remaining, line.currentForce);
            line.currentForce -= dealt;
            line.damage += dealt;
            line.damageThisTurn = (line.damageThisTurn || 0) + dealt;
            remaining -= dealt;
            if (dealt > 0) this.onForceLoss(player, line, dealt, sourcePlayer);
            if (dealt > 0 && !reflected && GameState.phase === 'scontro' &&
                line.equipment?.catalogId === 'set-1-089') {
                const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
                const enemyLine = enemy.fronts[frontName].line;
                if (enemyLine) await this.damageLine(enemy, frontName, 1, player, true);
            }
            Logger.log(`${line.name} subisce ${dealt} danno.`);
            if (line.currentForce <= 0) {
                const promotionSlot = front.supA && front.supB
                    ? (player === GameState.players[0]
                        ? await this.promptPromotionSlot(player, frontName)
                        : defaultPromotionSlot(front))
                    : null;
                this.removeUnit(
                    player, frontName, 'line',
                    GameState.phase === 'scontro' ? 'combat-destroy' : 'effect-destroy',
                    null,
                    promotionSlot
                );
            }
        }
        UIRenderer.renderBoard();
    },

    sacrifice(frontName, slotName) {
        if (!GameState.sacrifice || GameState.sacrifice.frontName !== frontName) return;
        const player = GameState.players[0];
        const unit = player.fronts[frontName][slotName];
        if (!unit) return;
        GameState.sacrifice.remaining = Math.max(0, GameState.sacrifice.remaining - unit.currentForce);
        Logger.log(`Sacrificio: ${unit.name} previene fino a ${unit.currentForce} danni.`);
        this.removeUnit(player, frontName, slotName);
        UIRenderer.refresh();
    },

    finishSacrifice() {
        const resolve = GameState.sacrifice?.resolve;
        if (resolve) resolve();
    }
};

export { CombatResolver };

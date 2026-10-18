import {
    calculateUnitCombatStrength,
    compareCombatStrengths,
    defaultPromotionSlot,
    shouldUseTorment
} from '../game-rules.js';
import { applyStandardAscension, keywordValue } from '../keywords.js';
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
        GameState.resolveReactions = true;
        try {
            for (const frontName of FRONT_NAMES) {
                if (GameState.gameOver) break;
                await this.resolveFront(frontName);
            }
        } finally {
            GameState.resolveReactions = false;
            GameState.reactionWindow = null;
        }
        GameState.checkVictory();
        UIRenderer.refresh();
    },

    strength(player, frontName, enemyLine) {
        void enemyLine;
        const front = player.fronts[frontName];
        if (!front.line) return 0;
        const collective = SLOT_NAMES.map(slot => front[slot])
            .filter(unit => unit?.keywords.includes('Mente Collettiva')).length;
        const opponentPlayer = player === GameState.players[0]
            ? GameState.players[1] : GameState.players[0];
        const keywords = getUnitKeywords(player, front.line, frontName, 'line');
        const effectiveLine = {
            ...front.line,
            currentForce: front.line.currentForce +
                getUnitForceBonus(player, front.line, frontName, 'line',
                    player === GameState.players[0] ? GameState.players[1] : GameState.players[0]),
            keywords
        };
        const fewerUnits = GameState.countUnits(player) < GameState.countUnits(opponentPlayer);
        const staticSupport = getSupportBonus(player, frontName);
        const supportBonus = player.tacticEffects?.supportBonus
            ? Math.min(3, Number(Boolean(front.supA) && !front.supA.infiltrated) * player.tacticEffects.supportBonus +
                Number(Boolean(front.supB) && !front.supB.infiltrated) * player.tacticEffects.supportBonus)
            : staticSupport;
        const base = calculateUnitCombatStrength({
            line: effectiveLine,
            supportCount: supportBonus,
            supportBonusPerUnit: 1,
            supportBonusCap: 3,
            collectiveCount: collective,
            fewerUnits,
            logorare: 0,
            ferocityBonus: getFerocityBonus(player, front.line, frontName, 'line', fewerUnits)
        });
        const packInstinct = player.commanderId === 'cmd-1-01' && fewerUnits ? 1 : 0;
        return base + packInstinct;
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
        if (this.collectOpeningWear(frontName).length) await this.applyOpeningWear(frontName);
        if (!attackFront.line && !defendFront.line) {
            Logger.log(`${FRONT_LABELS[frontName]}: le Linee cadono prima dello scontro.`);
            return;
        }
        if (!attackFront.line) {
            Logger.log(`${FRONT_LABELS[frontName]}: nessuna Linea attaccante.`);
            return;
        }
        if (GameState.resolveReactions) {
            await GameController.offerReactionWindow(frontName);
            if (GameState.gameOver) return;
            if (!attackFront.line) {
                Logger.log(`${FRONT_LABELS[frontName]}: nessuna Linea attaccante.`);
                return;
            }
        }
        const attackStrength = this.strength(attacker, frontName, defendFront.line);
        if (!defendFront.line) {
            attacker.frontWinsThisTurn = (attacker.frontWinsThisTurn || 0) + 1;
            this.resolveUnitLineWinEffects(
                defender,
                frontName,
                attackFront.line
            );
            const damage = this.commanderDamage(attacker, defender, frontName, attackStrength);
            this.noteAscension(attackFront.line);
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
        this.noteAscension(winningLine);
        Logger.log(`${winner.name} vince il Fronte di ${difference}.`);
        await this.dealCommanderDamage(loser, frontName, commanderDamage);
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
        let owner = control
            ? GameState.players.find(candidate => candidate.id === control.ownerId) || player
            : player;
        if (unit.infiltrated) {
            owner = GameState.players.find(candidate => candidate.id === unit.owner) || owner;
        }
        if (control) controller.controlledUnits.splice(controlIndex, 1);
        const hadSpectralEcho = getUnitKeywords(player, unit, frontName, slotName)
            .some(keyword => keyword.startsWith('Eco Spettrale'));
        if (unit.equipment) {
            const equipment = unit.equipment;
            unit.equipment = null;
            owner.discard.push(equipment);
            Logger.log(`${equipment.name} va negli scarti.`);
        }
        const destroyed = reason === 'combat-destroy' || reason === 'effect-destroy';
        owner.discard.push(unit);
        if (unit.keywords?.includes('Divinità') && reason === 'combat-destroy') {
            Logger.log(`${unit.name} viene Sigillata e va negli scarti.`);
        } else {
            Logger.log(`${unit.name} va negli scarti.`);
        }
        this.onUnitRemoved(player, unit, frontName, reason, sourcePlayer);
        if (slotName === 'line') this.promoteSupport(front, player, frontName, promotionSlot);
        if (destroyed && hadSpectralEcho) {
            this.trySpectralReturn(owner, unit, frontName);
        }
        const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
        if (slotName === 'line' && !front.line && enemy.field?.catalogId === 'set-1-117') {
            player.pc = Math.max(0, player.pc - 1);
            Logger.log(`${enemy.field.name}: ${player.name} perde 1 PC perché un Fronte diventa scoperto.`);
            GameState.checkVictory();
        }
        return unit;
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
        if (reason === 'combat-destroy' && sourcePlayer) {
            const killer = sourcePlayer.fronts[frontName]?.line;
            const killerEquipment = killer?.equipment?.catalogId || killer?.equipment?.id;
            if (killerEquipment === 'set-2-087') {
                GameController.drawCards(sourcePlayer, 1, killer.equipment.name);
            }
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
            } else if (effect.type === 'move-enemy-support-adjacent') {
                const targetPlayer = sourcePlayer === GameState.players[0]
                    ? GameState.players[1]
                    : GameState.players[0];
                const slot = ['supA', 'supB'].find(name => {
                    const support = targetPlayer.fronts[frontName][name];
                    return support && !isProtectedFromEnemyMovement(targetPlayer, support, frontName);
                });
                if (!slot) continue;
                const moved = targetPlayer.fronts[frontName][slot];
                const sourceIndex = FRONT_NAMES.indexOf(frontName);
                const destination = [sourceIndex - 1, sourceIndex + 1]
                    .filter(index => FRONT_NAMES[index])
                    .flatMap(index => ['supA', 'supB']
                        .filter(targetSlot => !targetPlayer.fronts[FRONT_NAMES[index]][targetSlot])
                        .map(targetSlot => ({
                            targetFront: FRONT_NAMES[index],
                            targetSlot
                        })))[0];
                if (!destination) continue;
                targetPlayer.fronts[frontName][slot] = null;
                targetPlayer.fronts[destination.targetFront][destination.targetSlot] = moved;
                moved.front = destination.targetFront;
                moved.position = destination.targetSlot;
                GameState.onUnitMoved(
                    targetPlayer,
                    moved,
                    frontName,
                    destination.targetFront
                );
                Logger.log(`${activeLine.name}: ${moved.name} si sposta in ${FRONT_LABELS[destination.targetFront]}.`);
            }
        }
        if (sourcePlayer.sites?.some(site => site.catalogId === 'set-3-108')) {
            const targetPlayer = sourcePlayer === GameState.players[0]
                ? GameState.players[1]
                : GameState.players[0];
            const movedFrom = FRONT_NAMES.find((name, index) => {
                const line = targetPlayer.fronts[name].line;
                if (name === frontName || !line ||
                    isProtectedFromEnemyMovement(targetPlayer, line, name)) return false;
                return [index - 1, index + 1].some(targetIndex =>
                    FRONT_NAMES[targetIndex] && !targetPlayer.fronts[FRONT_NAMES[targetIndex]].line
                );
            });
            if (movedFrom) {
                const sourceIndex = FRONT_NAMES.indexOf(movedFrom);
                const targetIndex = [sourceIndex - 1, sourceIndex + 1].find(index =>
                    FRONT_NAMES[index] && !targetPlayer.fronts[FRONT_NAMES[index]].line
                );
                const movedUnit = targetPlayer.fronts[movedFrom].line;
                targetPlayer.fronts[movedFrom].line = null;
                this.promoteSupport(targetPlayer.fronts[movedFrom], targetPlayer, movedFrom);
                targetPlayer.fronts[FRONT_NAMES[targetIndex]].line = movedUnit;
                movedUnit.front = FRONT_NAMES[targetIndex];
                movedUnit.position = 'line';
                GameState.onUnitMoved(targetPlayer, movedUnit, movedFrom, FRONT_NAMES[targetIndex], true);
                Logger.log(`${sourcePlayer.sites.find(site => site.catalogId === 'set-3-108').name}: ${movedUnit.name} si sposta in ${FRONT_LABELS[FRONT_NAMES[targetIndex]]}.`);
            }
        }
        if (equipmentId === 'set-3-084') GameState.addParasites(sourcePlayer, owner, 1);
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
            (sourcePlayer.field?.catalogId === 'set-3-117' &&
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
        const eligible = name => front[name] && !front[name].infiltrated;
        const next = slot && eligible(slot)
            ? slot
            : eligible('supA') ? 'supA' : eligible('supB') ? 'supB' : null;
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
    },

    noteAscension(unit) {
        if (!applyStandardAscension(unit)) return;
        Logger.log(`${unit.name} subisce Ascensione: +1 Forza permanente e il tipo Divinità.`);
    },

    collectOpeningWear(frontName) {
        const pairs = [
            [GameState.current, GameState.opponent],
            [GameState.opponent, GameState.current]
        ];
        const pending = [];
        for (const [owner, enemy] of pairs) {
            const line = owner.fronts[frontName].line;
            if (!line || !enemy.fronts[frontName].line) continue;
            const keywords = getUnitKeywords(owner, line, frontName, 'line');
            const amount = keywordValue(keywords, 'Logorare', 1);
            if (!amount) continue;
            pending.push({ enemy, amount, owner });
        }
        return pending;
    },

    async applyOpeningWear(frontName) {
        const pending = this.collectOpeningWear(frontName);
        for (const hit of pending) {
            if (!hit.enemy.fronts[frontName].line) continue;
            Logger.log(`Logorare: la Linea di ${FRONT_LABELS[frontName]} subisce ${hit.amount} danni.`);
            await this.damageLine(hit.enemy, frontName, hit.amount, hit.owner);
        }
    },

    trySpectralReturn(owner, unit, frontName) {
        const cost = unit.cost ?? 0;
        const available = (owner.domains || []).filter(domain => !domain.tapped);
        if (available.length < cost) return false;
        const fronts = [frontName, ...FRONT_NAMES.filter(name => name !== frontName)];
        const spot = fronts.flatMap(name =>
            ['supA', 'supB']
                .filter(slot => owner.fronts[name] && !owner.fronts[name][slot])
                .map(slot => ({ name, slot }))
        )[0];
        if (!spot) return false;
        available.slice(0, cost).forEach(domain => { domain.tapped = true; });
        const index = owner.discard.findIndex(card => card.id === unit.id);
        if (index >= 0) owner.discard.splice(index, 1);
        unit.currentForce = 1;
        unit.damage = Math.max(0, (unit.force || 1) - 1);
        unit.front = spot.name;
        unit.position = spot.slot;
        owner.fronts[spot.name][spot.slot] = unit;
        Logger.log(`${unit.name} torna in Supporto a Forza 1 (Eco Spettrale).`);
        return true;
    },

    applyTormentAtTurnStart(player) {
        const entries = [];
        for (const board of GameState.players) {
            for (const frontName of FRONT_NAMES) {
                for (const slotName of SLOT_NAMES) {
                    const unit = board.fronts[frontName][slotName];
                    if (unit?.tormentTurns > 0) entries.push({ board, frontName, slotName, unit });
                }
            }
        }
        for (const entry of entries) {
            const { board, frontName, slotName, unit } = entry;
            if (board.fronts[frontName][slotName] === unit) {
                if (slotName === 'line') {
                    this.damageLine(board, frontName, 1);
                } else {
                    unit.currentForce = Math.max(0, (unit.currentForce || 0) - 1);
                    Logger.log(`Tormento: ${unit.name} subisce 1 danno.`);
                    if (unit.currentForce <= 0) {
                        this.removeUnit(board, frontName, slotName, 'effect-destroy');
                    }
                }
            }
            unit.tormentTurns = Math.max(0, (unit.tormentTurns || 0) - 1);
        }
        const opponent = GameState.players.find(candidate => candidate !== player);
        if (!opponent) return;
        for (const frontName of FRONT_NAMES) {
            const line = player.fronts[frontName].line;
            if (!line) continue;
            const amount = keywordValue(
                getUnitKeywords(player, line, frontName, 'line'),
                'Tormento',
                1
            );
            if (!amount) continue;
            opponent.pc = Math.max(0, opponent.pc - amount);
            Logger.log(`Tormento: ${line.name} infligge ${amount} danni a ${opponent.name}.`);
            if (player.commanderId === 'cmd-2-01' &&
                FRONT_NAMES.some(name => player.fronts[name].line)) {
                GameController.drawCards(player, 1, 'Malakor');
            }
        }
    }
};

export { CombatResolver };

import {
    isImmediateTacticSupported,
    resolveImmediateTactic,
    restoreTemporaryForce
} from '../card-effects.js';
import { markCardCostDiscountUsed } from '../card-costs.js';
import { evaluateCommanderAbility, getCommander } from '../commanders.js';
import { checkDeployment } from '../game-rules.js';
import { tacticRequiresChoice } from '../tactics.js';
import { FRONT_LABELS, FRONT_NAMES, SLOT_NAMES } from './board.js';
import { CombatResolver } from './combat.js';
import { Logger } from './logger.js';
import { UIRenderer } from './renderer.js';
import { GameState } from './state.js';
import { getTacticChoices } from './tactic-choices.js';

const combatMethods = {
    async resolveCombat() {
        if (GameState.phase !== 'principale' || GameState.currentIndex !== 0 || GameState.sacrifice) return;
        GameState.phase = 'scontro';
        GameState.sorvoloUsed.clear();
        if (UIRenderer.getSorvoloOptions().length > 0) {
            GameState.pendingSorvolo = true;
            Logger.log('Sorvolo: puoi spostare Unità in un Fronte adiacente come Supporto.');
            UIRenderer.refresh();
            return;
        }
        await this.continueCombat();
    },

    useSorvolo() {
        const options = UIRenderer.getSorvoloOptions();
        const option = options[Number(document.getElementById('sorvolo-choice').value)];
        if (!option) return;
        const player = GameState.players[0];
        const source = player.fronts[option.frontName];
        const target = player.fronts[option.targetFront];
        source[option.slotName] = null;
        if (option.slotName === 'line') {
            CombatResolver.promoteSupport(source, player, option.frontName);
        }
        target[option.targetSlot] = option.unit;
        option.unit.front = option.targetFront;
        option.unit.position = option.targetSlot;
        GameState.onUnitMoved(player, option.unit, option.frontName, option.targetFront,
            option.slotName === 'line', true);
        GameState.sorvoloUsed.add(option.unit.id);
        Logger.log(`${option.unit.name} usa Sorvolo: entra in Supporto a ${FRONT_LABELS[option.targetFront]}.`);
        if (UIRenderer.getSorvoloOptions().length === 0) this.skipSorvolo();
        else UIRenderer.refresh();
    },

    skipSorvolo() {
        GameState.pendingSorvolo = false;
        UIRenderer.refresh();
        this.continueCombat();
    },

    async continueCombat() {
        GameState.pendingSorvolo = false;
        UIRenderer.renderControls();
        GameState.resolvePermanentCombatStart(GameState.currentIndex);
        await CombatResolver.resolveAll();
        this.removeCombatBonuses();
        if (!GameState.gameOver) {
            GameState.phase = 'finale';
            UIRenderer.refresh();
            Logger.log('Scontro terminato. Premi FINE TURNO per concludere.');
        }
    },

    async runEnemyTurn() {
        if (GameState.gameOver) return;
        const enemy = GameState.players[1];
        Logger.log('L’avversario pianifica le mosse.');
        const enemyCommander = getCommander(enemy.commanderId);
        if (enemyCommander?.activation && !enemy.commanderAbilityUsed) {
            const result = evaluateCommanderAbility(enemyCommander.activation, { self: enemy });
            if (result.ok) {
                enemy.commanderAbilityUsed = true;
                const summary = this.applyCommanderEffects(enemy, result.effects);
                Logger.log(`${enemyCommander.name} — ${enemyCommander.activation.name}: ${summary || 'nessun effetto'}.`);
            }
        }
        while (!GameState.gameOver) {
            const domains = enemy.domains.filter(domain => !domain.tapped);
            const candidates = enemy.hand
                .map((card, index) => ({ card, index }))
                .filter(({ card }) => {
                    if (card.category !== 'unit' && !isImmediateTacticSupported(card)) return false;
                    if (card.category === 'tactic') {
                        const siteTacticLimit = GameState.players.some(owner =>
                            owner.sites?.some(site => site.catalogId === 'set-2-095')
                        );
                        if ((enemy.tacticLimitActive || siteTacticLimit) &&
                            enemy.tacticsPlayedThisTurn >= 1) return false;
                        const choices = getTacticChoices(card, enemy, GameState.players[0]);
                        if (choices === null || (tacticRequiresChoice(card) && choices.length === 0)) {
                            return false;
                        }
                    }
                    const ascension = card.keywords.find(keyword => keyword.startsWith('Ascensione'));
                    const echoCost = ascension ? Number(ascension.match(/\((\d+)\)/)?.[1] || 0) : 0;
                    return this.getCardCost(enemy, card) <= domains.length && echoCost <= enemy.echo;
                })
                .map(candidate => {
                    if (candidate.card.category !== 'unit') {
                        const choices = getTacticChoices(candidate.card, enemy, GameState.players[0]);
                        return {
                            ...candidate,
                            tactic: true,
                            tacticChoice: choices?.[0]?.value ?? null,
                            deployment: null,
                            score: 3 + (enemy.parasites === 0 ? 1 : 0) -
                                this.getCardCost(enemy, candidate.card) * 0.1
                        };
                    }
                    return {
                        ...candidate,
                        tactic: false,
                        deployment: this.findEnemySlot(enemy, candidate.card),
                        score: this.scoreEnemyPlay(enemy, candidate.card, domains.length)
                    };
                })
                .filter(candidate => candidate.tactic || candidate.deployment)
                .sort((a, b) => b.score - a.score ||
                    a.card.id.localeCompare(b.card.id) ||
                    FRONT_NAMES.indexOf(a.deployment?.frontName) - FRONT_NAMES.indexOf(b.deployment?.frontName));
            if (candidates.length === 0) break;
            const candidate = candidates[0];
            const cost = this.getCardCost(enemy, candidate.card);
            domains.slice(0, cost).forEach(domain => { domain.tapped = true; });
            enemy.hand.splice(candidate.index, 1);
            if (candidate.tactic) {
                enemy.discard.push(candidate.card);
                enemy.tacticsPlayedThisTurn = (enemy.tacticsPlayedThisTurn || 0) + 1;
                Logger.log(`Avversario gioca ${candidate.card.name}.`);
                Logger.log(resolveImmediateTactic(
                    candidate.card,
                    enemy,
                    GameState.players[0],
                    candidate.tacticChoice,
                    {
                        damageLine: (target, frontName, amount) =>
                            CombatResolver.damageLine(target, frontName, amount, enemy),
                        onForceLoss: (target, unit, amount) =>
                            CombatResolver.onForceLoss(target, unit, amount, enemy),
                        onUnitPlayed: (owner, unit) => {
                            const frontName = unit.front;
                            const slotName = unit.position;
                            GameState.onUnitEntry(owner, unit, frontName, slotName, true);
                        },
                        removeUnit: (target, frontName, slotName) =>
                            CombatResolver.removeUnit(target, frontName, slotName, 'sacrifice'),
                        destroyUnit: (target, frontName, slotName) => {
                            return CombatResolver.destroyUnit(target, frontName, slotName);
                        }
                    }
                ));
                continue;
            }
            const deployment = candidate.deployment;
            const unit = candidate.card;
            markCardCostDiscountUsed(enemy, unit, GameState.turnNumber);
            const ascension = unit.keywords.find(keyword => keyword.startsWith('Ascensione'));
            if (ascension) enemy.echo -= Number(ascension.match(/\((\d+)\)/)?.[1] || 0);
            unit.currentForce = unit.force;
            if (deployment.assaultSwap) {
                const front = enemy.fronts[deployment.frontName];
                const supportSlot = front.supA === null ? 'supA' : 'supB';
                front[supportSlot] = front.line;
                front[supportSlot].position = supportSlot;
            }
            unit.front = deployment.frontName;
            unit.position = deployment.slotName;
            enemy.fronts[deployment.frontName][deployment.slotName] = unit;
            Logger.log(`Avversario gioca ${unit.name} in ${FRONT_LABELS[deployment.frontName]}.`);
            GameState.onUnitEntry(enemy, unit, deployment.frontName, deployment.slotName);
        }
        if (GameState.gameOver) return;
        UIRenderer.refresh();
        await CombatResolver.resolveAll();
        this.removeCombatBonuses();
        if (GameState.gameOver) return;
        GameState.phase = 'finale';
        enemy.echo = 0;
        while (enemy.hand.length > 7) enemy.discard.push(enemy.hand.pop());
        Logger.log('Turno avversario terminato.');
        UIRenderer.refresh();
    },

    removeCombatBonuses() {
        CombatResolver.restoreControlledUnits();
        for (const player of GameState.players) {
            for (const [frontName, front] of Object.entries(player.fronts)) {
                for (const slotName of SLOT_NAMES) {
                    restoreTemporaryForce(front[slotName]);
                    const unit = front[slotName];
                    if (unit) unit.cannotMoveThisTurn = false;
                    if (unit?.temporaryKeywords?.length) {
                        for (const keyword of unit.temporaryKeywords) {
                            const index = unit.keywords.lastIndexOf(keyword);
                            if (index >= 0) unit.keywords.splice(index, 1);
                        }
                        unit.temporaryKeywords = [];
                    }
                }
                while (front.line?.currentForce <= 0) {
                    CombatResolver.removeUnit(player, frontName, 'line');
                }
                for (const slotName of ['supA', 'supB']) {
                    if (front[slotName]?.currentForce <= 0) {
                        CombatResolver.removeUnit(player, frontName, slotName);
                    }
                }
                for (const unitId of player.sacrificeAfterCombat || []) {
                    for (const [frontName, front] of Object.entries(player.fronts)) {
                        const slotName = SLOT_NAMES.find(slot => front[slot]?.id === unitId);
                        if (!slotName) continue;
                        CombatResolver.removeUnit(player, frontName, slotName);
                        break;
                    }
                }
                player.sacrificeAfterCombat = [];
                player.tacticEffects = {};
                player.tacticLimitActive = false;
            }
        }
        UIRenderer.refresh();
    },

    findEnemySlot(enemy, card) {
        const opponent = GameState.players[0];
        const keywords = [...card.keywords];
        if (enemy.field?.catalogId === 'set-1-113' &&
            GameState.countUnits(enemy) < GameState.countUnits(opponent) &&
            !keywords.includes('Assalto')) keywords.push('Assalto');
        for (const frontName of FRONT_NAMES) {
            const front = enemy.fronts[frontName];
            const defensive = keywords.includes('Posizione Difensiva');
            const assault = keywords.includes('Assalto');
            const deploymentUnit = { ...card, keywords };
            const rules = {
                ownSites: enemy.sites,
                opposingSites: opponent.sites
            };
            const lineDeployment = checkDeployment(
                deploymentUnit,
                front,
                'line',
                rules
            );
            if (lineDeployment.legal && (!front.line || lineDeployment.assaultSwap) &&
                (defensive || assault)) {
                return {
                    frontName,
                    slotName: 'line',
                    assaultSwap: lineDeployment.assaultSwap
                };
            }
            if (defensive && !front.line) continue;
            for (const slotName of ['supA', 'supB']) {
                if (checkDeployment(deploymentUnit, front, slotName, rules).legal) {
                    return { frontName, slotName };
                }
            }
        }
        return null;
    },

    scoreEnemyPlay(enemy, card, availableDomains) {
        const deployment = this.findEnemySlot(enemy, card);
        if (!deployment) return Number.NEGATIVE_INFINITY;
        const front = enemy.fronts[deployment.frontName];
        const enemyFront = GameState.players[0].fronts[deployment.frontName];
        const cost = this.getCardCost(enemy, card);
        const score = card.force / cost * 2 +
            Number(card.keywords.includes('Assalto')) * 1.5 +
            Number(card.keywords.some(keyword => keyword.startsWith('Tormento'))) +
            Number(card.keywords.some(keyword => keyword.startsWith('Infiltrazione'))) +
            Number(card.keywords.includes('Ferocia')) * 0.5 +
            Number(card.keywords.includes('Mente Collettiva')) * 0.5 +
            Number(card.keywords.includes('Logorare')) * 0.5 +
            (deployment.slotName === 'line' ? 2.5 : 0) +
            (deployment.slotName !== 'line' && front.line ? 1.5 : 0) +
            (!enemyFront.line && deployment.slotName === 'line' ? 1 : 0) -
            Math.max(0, availableDomains - card.cost) * 0.1;
        return score;
    }
};

export { combatMethods };

import { evaluateCommanderAbility, getCommander } from '../commanders.js';
import { FX } from './fx.js';
import { Logger } from './logger.js';
import { UIRenderer } from './renderer.js';
import { GameState } from './state.js';

const commanderMethods = {
    // Applica gli effetti di un'abilità del Comandante e ritorna una descrizione.
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
            }
        }
        return descriptions.join('; ');
    },

    // Abilità di Rifornimento: si attiva automaticamente a inizio turno dell'attore.
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

    // Abilità attivabile del Comandante del giocatore: una sola volta per turno.
    activateCommanderAbility() {
        if (GameState.phase !== 'principale' || GameState.currentIndex !== 0 || GameState.gameOver) return;
        if (GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment) return;
        const player = GameState.players[0];
        if (player.commanderAbilityUsed) return;
        const commander = getCommander(player.commanderId);
        if (!commander?.activation) return;
        const result = evaluateCommanderAbility(commander.activation, { self: player });
        if (!result.ok) {
            Logger.log(`${commander.name}: abilità non disponibile (${result.reason}).`);
            return;
        }
        player.commanderAbilityUsed = true;
        const summary = this.applyCommanderEffects(player, result.effects);
        Logger.log(`${commander.name} — ${commander.activation.name}: ${summary || 'nessun effetto'}.`);
        FX.play('play');
        if (GameState.checkVictory()) return;
        UIRenderer.refresh();
    }
};

export { commanderMethods };

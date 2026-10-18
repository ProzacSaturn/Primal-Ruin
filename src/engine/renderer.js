import { getCardExecutionStatus, isImmediateTacticSupported } from '../card-effects.js';
import { getCommander } from '../commanders.js';
import { checkDeployment } from '../game-rules.js';
import { getUnitKeywords } from '../permanent-effects.js';
import { drawCardPixelArt } from '../pixel-art.js';
import { persistGame } from '../save-store.js';
import { tacticTiming } from '../tactics.js';
import { FRONT_LABELS, FRONT_NAMES, SLOT_NAMES } from './board.js';
import { GameController } from './controller.js';
import { GameState } from './state.js';

const UIRenderer = {
    updateStats() {
        const player = GameState.players[0];
        const opponent = GameState.players[1];
        document.getElementById('player-pc').textContent = player.pc;
        document.getElementById('player-follia').textContent = player.follia;
        document.getElementById('player-echo').textContent = player.echo;
        document.getElementById('player-parassiti').textContent = player.parasites;
        document.getElementById('player-deck').textContent = player.armyDeck.length;
        document.getElementById('opp-pc').textContent = opponent.pc;
        document.getElementById('opp-follia').textContent = opponent.follia;
        document.getElementById('opp-echo').textContent = opponent.echo;
        document.getElementById('opp-parassiti').textContent = opponent.parasites;
        document.getElementById('opp-deck').textContent = opponent.armyDeck.length;
        document.getElementById('player-domini-count').textContent =
            `${player.domains.filter(domain => !domain.tapped).length}/${player.domains.length}`;
        this.renderCommander();
    },

    renderCommander() {
        const [player, opponent] = GameState.players;
        if (!player) return;
        const playerCommander = getCommander(player.commanderId);
        const opponentCommander = opponent ? getCommander(opponent.commanderId) : null;
        document.getElementById('player-commander-name').textContent =
            playerCommander?.name || 'IL TUO COMANDANTE';
        document.getElementById('player-commander-ability').textContent = playerCommander
            ? `${playerCommander.activation.name} · ${player.commanderAbilityUsed ? 'già usata' : 'pronta'} — ${playerCommander.activation.text}`
            : '';
        if (opponent) {
            document.getElementById('opp-commander-name').textContent =
                opponentCommander?.name || 'COMANDANTE NEMICO';
            document.getElementById('opp-commander-ability').textContent = opponentCommander
                ? opponentCommander.activation.text
                : '';
        }
    },

    renderDomains(player, containerId) {
        const area = document.getElementById(containerId);
        const title = area.querySelector('.zone-title');
        area.replaceChildren(title);
        player.domains.forEach(domain => {
            const element = document.createElement('div');
            element.className = `siti-slot occupied${domain.tapped ? ' tapped' : ''}`;
            element.textContent = domain.name;
            area.appendChild(element);
        });
        (player.sites || []).forEach(site => {
            const element = document.createElement('div');
            element.className = 'siti-slot occupied permanent-card';
            element.textContent = `${site.name}${site.decay != null ? ` · Decadenza ${site.decay}` : ''}${site.ruins ? ` · ${site.ruins} Rovina` : ''}`;
            element.title = site.rulesText;
            if (player === GameState.players[0] && GameController.canActivateSite(site)) {
                element.tabIndex = 0;
                element.setAttribute('role', 'button');
                element.addEventListener('click', () => GameController.activateSite(site));
                element.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        GameController.activateSite(site);
                    }
                });
            }
            area.appendChild(element);
        });
        if (player.field) {
            const element = document.createElement('div');
            element.className = 'siti-slot occupied permanent-card field-card';
            element.textContent = `Campo: ${player.field.name}`;
            element.title = player.field.rulesText;
            area.appendChild(element);
        }
    },

    renderSlot(prefix, frontName, slotName, unit) {
        const element = document.getElementById(`${prefix}-${frontName}-${slotName}`);
        if (!element) return;
        element.replaceChildren();
        const side = prefix === 'p' ? 'tuo' : 'avversario';
        const label = FRONT_LABELS[frontName];
        const slotLabel = slotName === 'line' ? 'Linea' : `Supporto ${slotName === 'supA' ? 'A' : 'B'}`;
        if (!unit) {
            element.textContent = 'Vuoto';
            element.setAttribute('aria-label', `Fronte ${label}, ${slotLabel} ${side}: vuoto`);
            element.setAttribute('role', 'button');
            element.tabIndex = prefix === 'p' ? 0 : -1;
            element.classList.remove('sacrifice-target');
            return;
        }
        element.setAttribute(
            'aria-label',
            `Fronte ${label}, ${slotLabel} ${side}: ${unit.name}, Forza ${unit.currentForce}`
        );
        element.setAttribute('role', 'button');
        element.tabIndex = prefix === 'p' ? 0 : -1;
        const icon = document.createElement('span');
        icon.className = 'slot-icon';
        icon.textContent = unit.icon;
        const details = document.createElement('div');
        details.className = 'slot-details';
        const name = document.createElement('div');
        name.className = 'slot-name';
        name.textContent = unit.name;
        const keywords = document.createElement('span');
        keywords.className = 'slot-keyword';
        const owner = GameState.players[prefix === 'p' ? 0 : 1];
        keywords.textContent = [
            ...getUnitKeywords(owner, unit, frontName, slotName),
            ...(unit.equipment ? [`Equip: ${unit.equipment.name}`] : [])
        ].join(', ');
        details.append(name, keywords);
        const force = document.createElement('span');
        force.className = 'slot-force';
        force.textContent = Number.isFinite(unit.force)
            ? `${unit.currentForce}/${unit.force}`
            : 'In gioco';
        element.append(icon, details, force);
        element.classList.toggle('sacrifice-target',
            GameState.sacrifice?.frontName === frontName && prefix === 'p');
    },

    renderBoard() {
        for (const frontName of FRONT_NAMES) {
            for (const slotName of SLOT_NAMES) {
                this.renderSlot('p', frontName, slotName, GameState.players[0].fronts[frontName][slotName]);
                this.renderSlot('opp', frontName, slotName, GameState.players[1].fronts[frontName][slotName]);
            }
        }
        this.renderDomains(GameState.players[0], 'player-siti-area');
        this.renderDomains(GameState.players[1], 'opp-siti-area');
        this.updateStats();
        this.renderControls();
        this.updateBoardInteractivity();
    },

    renderHand() {
        const area = document.getElementById('hand-area');
        area.replaceChildren();
        if (!GameState.players.length) {
            area.textContent = 'La tua mano iniziale contiene 5 carte.';
            return;
        }
        const player = GameState.players[0];
        const mulliganSetup = GameState.phase === 'setup';
        if (!mulliganSetup && player.hand.length === 0) {
            area.textContent = 'Mano vuota.';
            return;
        }
        if (mulliganSetup) {
            const hint = document.createElement('div');
            hint.className = 'hand-hint';
            hint.textContent = 'Mulligan parziale (§5): seleziona le carte da rimpiazzare, poi premi MULLIGAN.';
            area.appendChild(hint);
        }
        const renderCard = card => {
            const marked = mulliganSetup && GameState.mulliganMarks.has(card.id);
            const element = document.createElement('button');
            element.type = 'button';
            element.className = 'card' +
                `${marked ? ' mulligan-marked' : ''}` +
                `${GameState.selectedCard?.id === card.id ? ' selected' : ''}`;
            const reaction = GameState.reactionWindow?.playerIndex === 0;
            element.disabled = mulliganSetup ? false : reaction
                ? Boolean(GameState.pendingTactic || GameState.sacrifice ||
                    GameState.pendingTorment || GameState.pendingPromotion) ||
                    !isImmediateTacticSupported(card) || tacticTiming(card) === 'standard'
                : GameState.currentIndex !== 0 ||
                GameState.phase !== 'principale' ||
                GameState.sacrifice !== null || GameState.pendingTorment !== null ||
                GameState.pendingTactic !== null ||
                (card.category !== 'unit' && !['site', 'field', 'equipment'].includes(card.category) &&
                    !isImmediateTacticSupported(card));
            const cost = document.createElement('span');
            cost.className = 'card-cost';
            cost.textContent = card.category === 'equipment'
                ? String(card.cost + (card.equipCost || 0))
                : card.cost;
            const name = document.createElement('span');
            name.className = 'card-name';
            name.textContent = card.name;
            const art = document.createElement('canvas');
            art.className = 'card-art card-art-canvas';
            art.width = 64;
            art.height = 48;
            drawCardPixelArt(art, card);
            const stats = document.createElement('span');
            stats.className = 'card-stats';
            const executionStatus = getCardExecutionStatus(card);
            const tacticSpeed = card.category === 'tactic'
                ? (tacticTiming(card) === 'instant' ? 'Istantanea' : 'Standard')
                : '';
            stats.textContent = card.category === 'unit'
                ? `Forza ${card.force} · ${card.type}`
                : card.category === 'tactic'
                    ? `Tattica ${tacticSpeed} · ${executionStatus.label}`
                    : ['site', 'field', 'equipment'].includes(card.category)
                        ? `${card.category} · ${executionStatus.label}`
                        : `${card.category} · ${executionStatus.label}`;
            const rules = document.createElement('span');
            rules.className = 'card-rules';
            rules.textContent = card.category === 'unit'
                ? `${executionStatus.label}: ${card.rulesText}`
                : card.category === 'site'
                    ? `${executionStatus.label}: ${card.rulesText}`
                    : `${executionStatus.label}: ${executionStatus.detail}`;
            element.title = card.rulesText;
            element.append(cost, name, art, stats, rules);
            element.addEventListener('click', () => {
                if (mulliganSetup) {
                    GameController.toggleMulliganMark(card);
                    return;
                }
                GameController.selectCard(card);
            });
            area.appendChild(element);
        };
        player.hand.forEach(card => renderCard(card));
    },

    updateBoardInteractivity() {
        for (const frontName of FRONT_NAMES) {
            for (const slotName of SLOT_NAMES) {
                const element = document.getElementById(`p-${frontName}-${slotName}`);
                if (!element) continue;
                const canDeploy = GameState.phase === 'principale' && GameState.currentIndex === 0 &&
                    GameState.selectedCard && !GameState.sacrifice && !GameState.pendingTorment;
                const player = GameState.players[0];
                const opponent = GameState.players[1];
                const front = player.fronts[frontName];
                const keywords = GameState.selectedCard
                    ? getUnitKeywords(player, GameState.selectedCard, frontName, slotName)
                    : [];
                if (player.field?.catalogId === 'set-1-113' &&
                    GameState.countUnits(player) < GameState.countUnits(opponent) &&
                    !keywords.includes('Assalto')) keywords.push('Assalto');
                const deployment = GameState.selectedCard
                    ? checkDeployment(
                        { ...GameState.selectedCard, keywords },
                        front,
                        slotName,
                        {
                            ownSites: player.sites,
                            opposingSites: opponent.sites,
                            ownField: player.field
                        }
                    )
                    : { legal: false };
                element.classList.toggle('selectable',
                    Boolean(canDeploy && deployment.legal) ||
                    Boolean(GameState.retreatMode && slotName !== 'line' &&
                        player.fronts[frontName][slotName] &&
                        !player.fronts[frontName][slotName].infiltrated));
                element.classList.toggle('sacrifice-target',
                    Boolean(GameState.sacrifice?.frontName === frontName &&
                        GameState.players[0].fronts[frontName][slotName]));
            }
            const opponent = GameState.players[1];
            for (const slotName of ['supA', 'supB']) {
                const element = document.getElementById(`opp-${frontName}-${slotName}`);
                if (!element || !opponent) continue;
                const card = GameState.selectedCard;
                const canInfiltrate = GameState.phase === 'principale' &&
                    GameState.currentIndex === 0 && card &&
                    !GameState.sacrifice && !GameState.pendingTorment &&
                    card.keywords?.some(keyword => keyword.startsWith('Infiltrazione')) &&
                    !opponent.fronts[frontName].line &&
                    !opponent.fronts[frontName][slotName];
                element.classList.toggle('selectable', Boolean(canInfiltrate));
            }
        }
    },

    renderControls() {
        const setup = GameState.phase === 'setup';
        const playerTurn = GameState.currentIndex === 0 && !GameState.gameOver;
        document.getElementById('player-set-select').disabled = !setup;
        document.getElementById('opponent-set-select').disabled = !setup;
        document.getElementById('player-commander-select').disabled = !setup;
        const commanderBtn = document.getElementById('btn-commander');
        commanderBtn.hidden = !playerTurn || GameState.phase !== 'principale';
        commanderBtn.disabled = Boolean(GameState.players[0]?.commanderAbilityUsed) ||
            GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment ||
            GameState.pendingPromotion;
        const retreatBtn = document.getElementById('btn-retreat');
        retreatBtn.hidden = !playerTurn || GameState.phase !== 'principale';
        retreatBtn.disabled = Boolean(GameState.sacrifice || GameState.pendingTactic ||
            GameState.pendingTorment || GameState.pendingPromotion || GameState.pendingSorvolo);
        retreatBtn.textContent = GameState.retreatMode ? '↩ SCEGLI IL SUPPORTO' : '↩ RITIRATA';
        const purgeBtn = document.getElementById('btn-purge');
        purgeBtn.hidden = !playerTurn || GameState.phase !== 'principale';
        purgeBtn.disabled = Boolean(GameState.sacrifice || GameState.pendingTactic ||
            GameState.pendingTorment || GameState.pendingPromotion || GameState.pendingSorvolo);
        const mulliganBtn = document.getElementById('btn-mulligan');
        mulliganBtn.hidden = !setup || GameState.mulliganUsed;
        if (!mulliganBtn.hidden) {
            const marked = GameState.mulliganMarks.size;
            mulliganBtn.textContent = marked === 0
                ? '🔁 MULLIGAN'
                : `🔁 MULLIGAN (${marked} da rimpiazzare)`;
        }
        document.getElementById('btn-start').hidden = !setup;
        document.getElementById('btn-principale').hidden = !playerTurn || GameState.phase !== 'rifornimento';
        document.getElementById('btn-attack').hidden = !playerTurn || GameState.phase !== 'principale';
        document.getElementById('btn-finale').hidden = !playerTurn || GameState.phase !== 'finale';
        document.getElementById('btn-canala').hidden =
            !playerTurn || GameState.phase !== 'rifornimento' || GameState.players[0].follia === 0;
        document.getElementById('btn-sacrifice-end').hidden = !GameState.sacrifice;
        document.getElementById('sorvolo-panel').hidden = !GameState.pendingSorvolo;
        document.getElementById('torment-panel').hidden = !GameState.pendingTorment;
        document.getElementById('tactic-panel').hidden = !GameState.pendingTactic;
        const reaction = GameState.reactionWindow?.playerIndex === 0;
        const reactionPanel = document.getElementById('reaction-panel');
        reactionPanel.hidden = !reaction;
        if (reaction) {
            document.getElementById('reaction-label').textContent =
                `Finestra di reazione · ${FRONT_LABELS[GameState.reactionWindow.frontName]}. Gioca una Tattica Istantanea o passa.`;
            document.getElementById('btn-reaction-pass').disabled = Boolean(GameState.pendingTactic);
        }
        document.getElementById('promotion-panel').hidden = !GameState.pendingPromotion;
        if (GameState.pendingPromotion) {
            const promotionChoice = document.getElementById('promotion-choice');
            promotionChoice.replaceChildren();
            GameState.pendingPromotion.supports.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = slot === 'supA' ? 'Supporto A' : 'Supporto B';
                promotionChoice.appendChild(option);
            });
        }
        const tacticChoice = document.getElementById('tactic-choice');
        tacticChoice.replaceChildren();
        if (GameState.pendingTactic) {
            GameState.pendingTactic.choices.forEach((choice, index) => {
                const option = document.createElement('option');
                option.value = String(index);
                option.textContent = choice.label;
                tacticChoice.appendChild(option);
            });
            document.getElementById('tactic-choice-label').textContent =
                GameState.pendingTactic.mode === 'discard'
                    ? `Scegli una carta da scartare per ${GameState.pendingTactic.card.name}:`
                    : GameState.pendingTactic.mode === 'shadow-recovery'
                        ? 'Scegli facoltativamente un’Unità dagli scarti da mettere in Supporto:'
                    : GameState.pendingTactic.mode === 'equipment'
                        ? `Scegli l’Unità da equipaggiare con ${GameState.pendingTactic.card.name}:`
                    : GameState.pendingTactic.mode === 'permanent-replace'
                        ? `Scegli quale permanente distruggere per giocare ${GameState.pendingTactic.card.name}:`
                    : GameState.pendingTactic.mode === 'active-site'
                        ? `Scegli l’effetto di ${GameState.pendingTactic.card.name}:`
                    : GameState.pendingTactic.mode === 'site-support-move'
                        ? 'Scegli un Supporto avversario da spostare in un Fronte adiacente:'
                    : `Scegli un bersaglio per ${GameState.pendingTactic.card.name}:`;
        }
        document.getElementById('btn-tactic-cancel').hidden =
            GameState.pendingTactic?.mode === 'discard';
        document.getElementById('btn-tactic-confirm').textContent =
            GameState.pendingTactic?.mode === 'discard' ? 'SCARTA CARTA' :
                GameState.pendingTactic?.mode === 'shadow-recovery' ? 'CONFERMA RECUPERO' :
                    GameState.pendingTactic?.mode === 'equipment' ? 'EQUIPAGGIA' :
                        GameState.pendingTactic?.mode === 'permanent-replace' ? 'SOSTITUISCI E GIOCA' :
                            GameState.pendingTactic?.mode === 'active-site' ? 'ATTIVA' :
                                GameState.pendingTactic?.mode === 'site-support-move' ? 'SPOSTA SUPPORTO' :
                                    'RISOLVI TATTICA';
        if (GameState.pendingTorment) {
            const pending = GameState.pendingTorment;
            document.getElementById('torment-choice').textContent =
                `${pending.winnerName}: infliggi ${pending.commanderDamage} danni al Comandante oppure assegna ${pending.torment} Follia?`;
        }
        const sorvoloChoice = document.getElementById('sorvolo-choice');
        sorvoloChoice.replaceChildren();
        this.getSorvoloOptions().forEach((option, index) => {
            const element = document.createElement('option');
            element.value = String(index);
            element.textContent = option.label;
            sorvoloChoice.appendChild(element);
        });
        document.getElementById('btn-attack').disabled =
            Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingTactic ||
                GameState.pendingPromotion);
        document.getElementById('btn-finale').disabled =
            Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingTactic ||
                GameState.pendingPromotion);
        document.getElementById('btn-new-game').disabled =
            Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingPromotion);
        document.getElementById('btn-demo-decks').disabled =
            Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingPromotion);
        const phase = GameState.phase === 'setup' ? 'PREPARAZIONE' :
            ({ rifornimento: 'RIFORNIMENTO', principale: 'FASE PRINCIPALE', scontro: 'SCONTRO', finale: 'FASE FINALE', gameover: 'PARTITA TERMINATA' }[GameState.phase]);
        document.getElementById('phase-label').textContent = phase;
        document.getElementById('turn-label').textContent = GameState.players.length
            ? `Turno ${GameState.turnNumber || '—'} · ${GameState.current.name}`
            : '';
    },

    showGameOver(winner) {
        this.renderBoard();
        document.getElementById('game-result').textContent = `${winner.name} vince!`;
        document.getElementById('game-result').hidden = false;
    },

    refresh() {
        this.renderBoard();
        this.renderHand();
        if (!GameState.sacrifice && !GameState.pendingSorvolo && !GameState.pendingTactic &&
            !GameState.pendingTorment && !GameState.pendingPromotion && GameState.phase !== 'scontro') {
            persistGame(GameState.snapshot());
        }
    },

    getSorvoloOptions() {
        if (!GameState.players.length) return [];
        const player = GameState.players[0];
        const options = [];
        FRONT_NAMES.forEach((frontName, index) => {
            SLOT_NAMES.forEach(slotName => {
                const unit = player.fronts[frontName][slotName];
                if (!unit || !getUnitKeywords(player, unit, frontName, slotName).includes('Sorvolo') || unit.cannotMoveThisTurn ||
                    GameState.sorvoloUsed.has(unit.id)) return;
                [index - 1, index + 1].forEach(adjacentIndex => {
                    const adjacentFront = FRONT_NAMES[adjacentIndex];
                    if (!adjacentFront) return;
                    const target = player.fronts[adjacentFront];
                    const canEnterLine = !target.line &&
                        player.sites?.some(site =>
                            site.catalogId === 'set-1-104' || site.catalogId === 'set-3-107'
                        );
                    const targetSlots = canEnterLine
                        ? ['line', ...(target.supA === null ? ['supA'] : []),
                            ...(target.supB === null ? ['supB'] : [])]
                        : [target.supA === null ? 'supA' : target.supB === null ? 'supB' : null]
                            .filter(Boolean);
                    for (const targetSlot of targetSlots) {
                        options.push({
                            frontName,
                            slotName,
                            targetFront: adjacentFront,
                            targetSlot,
                            unit,
                            label: `${unit.name}: ${FRONT_LABELS[frontName]} → ${FRONT_LABELS[adjacentFront]} (${targetSlot === 'line' ? 'Linea' : 'Supporto'})`
                        });
                    }
                });
                if (player.sites?.some(site => site.catalogId === 'set-2-086')) {
                    FRONT_NAMES.filter(targetFront => targetFront !== frontName &&
                        ![index - 1, index + 1].some(adjacentIndex =>
                            FRONT_NAMES[adjacentIndex] === targetFront
                        )).forEach(targetFront => {
                        const target = player.fronts[targetFront];
                        const targetSlot = target.supA === null ? 'supA' :
                            target.supB === null ? 'supB' : null;
                        if (!targetSlot) return;
                        options.push({
                            frontName,
                            slotName,
                            targetFront,
                            targetSlot,
                            unit,
                            label: `${unit.name}: ${FRONT_LABELS[frontName]} → ${FRONT_LABELS[targetFront]} (Supporto)`
                        });
                    });
                }
            });
        });
        return options;
    }
};

export { UIRenderer };

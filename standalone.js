(function() {
	//#region src/unit-triggers.js
	function cardId$1(card) {
		return card?.catalogId || card?.id;
	}
	function getUnitLineDestructionEffects(line) {
		if (!line || line.position !== "line") return [];
		const id = cardId$1(line);
		const effects = [];
		if ([
			"set-1-006",
			"set-1-038",
			"set-1-045",
			"set-3-047"
		].includes(id)) effects.push({
			type: "commander-damage",
			amount: 1
		});
		else if (id === "set-1-055") effects.push({
			type: "commander-damage",
			amount: 2
		});
		if ([
			"set-2-028",
			"set-2-039",
			"set-3-016",
			"set-3-036"
		].includes(id)) effects.push({ type: "draw-card" });
		if (id === "set-3-026") effects.push({ type: "add-parasite" });
		if (["set-2-035", "set-2-049"].includes(id)) effects.push({ type: "exile-from-discard" });
		if (id === "set-2-043") effects.push({ type: "put-spectral-card-on-top" });
		if (id === "set-3-045") effects.push({ type: "destroy-enemy-support-in-front" });
		if (id === "set-3-004") effects.push({ type: "move-enemy-support-adjacent" });
		if (id === "set-1-052") effects.push({
			type: "temporary-force",
			amount: 2
		});
		return effects;
	}
	function getUnitDestructionEffects(unit) {
		if (cardId$1(unit) === "set-3-006" && unit.position === "line") return [{
			type: "damage-enemy-line-in-front",
			amount: 1
		}];
		return [];
	}
	function getUnitEntryEffects(unit, slotName, fromDiscard = false) {
		const id = cardId$1(unit);
		const effects = [];
		if (id === "set-1-027") effects.push({
			type: "destroy-enemy-support-in-front",
			when: "line"
		});
		if (id === "set-2-016") effects.push({ type: "recover-spectral-card" });
		if (id === "set-2-027") effects.push({
			type: "recover-unit-cost-at-most",
			cost: 3
		});
		if (id === "set-2-009" && slotName === "line") effects.push({
			type: "weaken-enemy-line-in-front",
			amount: 1
		});
		if (id === "set-2-013" && slotName !== "line") effects.push({
			type: "weaken-enemy-line-in-front",
			amount: 1
		});
		if (["set-2-029", "set-2-040"].includes(id) && slotName === "line") effects.push({
			type: "weaken-enemy-line-in-front",
			amount: 2
		});
		if (["set-2-020", "set-2-031"].includes(id) && fromDiscard) effects.push({
			type: "weaken-enemy-line-in-front",
			amount: 1
		});
		if (["set-3-002", "set-3-014"].includes(id)) effects.push({
			type: "add-opponent-parasite",
			amount: 1
		});
		if (id === "set-3-020") effects.push({
			type: "create-support-token",
			force: 1
		});
		if (id === "set-3-030") effects.push({
			type: "create-support-token",
			force: 2
		});
		if (id === "set-3-039") effects.push({
			type: "create-support-token",
			force: 2,
			when: "line"
		});
		if (id === "set-3-044") effects.push({
			type: "add-opponent-parasite",
			amount: 2
		});
		if (id === "set-3-050") effects.push({
			type: "add-opponent-parasite",
			amount: 1
		});
		if (id === "set-3-011" && slotName === "line") effects.push({
			type: "weaken-enemy-line-in-front",
			amount: 1
		});
		if (id === "set-3-023" && slotName !== "line") effects.push({
			type: "weaken-enemy-line-in-front",
			amount: 1
		});
		return effects;
	}
	function getSorvoloEntryEffects(unit) {
		const id = cardId$1(unit);
		if (id === "set-1-031" || id === "set-1-048") return [{
			type: "boost-own-line",
			amount: 1
		}];
		if (id === "set-1-037") return [{
			type: "damage-enemy-line-in-front",
			amount: 1
		}];
		if (id === "set-3-035") return [{ type: "add-opponent-parasite" }];
		if (id === "set-3-042") return [{
			type: "weaken-enemy-line",
			amount: 2
		}];
		if (id === "set-3-052") return [{
			type: "destroy-weak-enemy-line",
			maximumForce: 3
		}];
		return [];
	}
	function getUnitDestructionReactions(units, destroyedUnit, turnNumber) {
		const reactions = [];
		const destroyedKeywords = destroyedUnit?.keywords || [];
		for (const unit of units) {
			const id = cardId$1(unit);
			if (id === "set-2-018" && unit.lastDestroyedDrawTurn !== turnNumber) reactions.push({
				type: "draw-card",
				source: unit
			});
			if (id === "set-3-053" && destroyedKeywords.some((keyword) => keyword.startsWith("Mente Collettiva"))) reactions.push({
				type: "create-support-token",
				source: unit
			});
		}
		return reactions;
	}
	function getCommanderVictoryDamageEffects(units, winningLine, frontWinsThisTurn, turnNumber, opposingLineUncovered) {
		let amount = 0;
		const oncePerTurnSources = [];
		const lineId = cardId$1(winningLine);
		if (["set-1-018", "set-1-046"].includes(lineId)) amount++;
		if (lineId === "set-1-026" && opposingLineUncovered) amount++;
		for (const unit of units) {
			const id = cardId$1(unit);
			if (id === "set-1-056" && unit.lastWinDamageTurn !== turnNumber) {
				amount++;
				oncePerTurnSources.push(unit);
			}
			if (id === "set-1-060" && frontWinsThisTurn >= 2) amount += 3;
		}
		return {
			amount,
			oncePerTurnSources
		};
	}
	function shouldDestroySupportOnUnitLineWin(winningLine) {
		return cardId$1(winningLine) === "set-1-044";
	}
	function hasSeminatoreSilente(units) {
		return units.some((unit) => cardId$1(unit) === "set-3-050");
	}
	function isProtectedFromEffectDestruction(unit, slotName) {
		if (unit?.keywords?.includes("Divinità")) return true;
		return cardId$1(unit) === "set-1-057" && slotName === "line";
	}
	function isProtectedFromEnemyTactic(unit, slotName, tacticCost) {
		if (unit?.keywords?.includes("Divinità")) return true;
		return slotName === "line" && (cardId$1(unit) === "set-1-051" || cardId$1(unit) === "set-3-032" && tacticCost === 1);
	}
	function isProtectedFromEnemyMovement(owner, unit, frontName) {
		if (Object.values(owner.fronts).some((front) => cardId$1(front.line) === "set-3-051")) return true;
		const front = owner.fronts[frontName];
		return [
			"line",
			"supA",
			"supB"
		].some((slotName) => cardId$1(front[slotName]) === "set-3-038") && unit.keywords?.some((keyword) => keyword.startsWith("Mente Collettiva"));
	}
	//#endregion
	//#region src/tactics.js
	const IMPLEMENTED_TACTICS = /* @__PURE__ */ new Set([
		"set-1-061",
		"set-1-062",
		"set-1-064",
		"set-1-065",
		"set-1-066",
		"set-1-069",
		"set-1-070",
		"set-1-071",
		"set-1-067",
		"set-1-068",
		"set-1-072",
		"set-1-076",
		"set-1-077",
		"set-1-078",
		"set-1-073",
		"set-2-053",
		"set-2-054",
		"set-2-057",
		"set-2-061",
		"set-2-062",
		"set-2-064",
		"set-2-065",
		"set-2-056",
		"set-2-067",
		"set-2-068",
		"set-2-058",
		"set-2-060",
		"set-2-063",
		"set-2-072",
		"set-2-071",
		"set-2-066",
		"set-2-077",
		"set-2-055",
		"set-2-073",
		"set-1-074",
		"set-2-059",
		"set-2-070",
		"set-2-074",
		"set-2-075",
		"set-2-078",
		"set-3-072",
		"set-3-075",
		"set-3-058",
		"set-3-057",
		"set-3-061",
		"set-3-063",
		"set-3-066",
		"set-3-065",
		"set-3-078",
		"set-3-067",
		"set-3-071",
		"set-3-074",
		"set-3-060",
		"set-3-062",
		"set-3-064",
		"set-3-068",
		"set-3-070",
		"set-3-073",
		"set-3-076",
		"set-3-077",
		"set-3-079",
		"set-3-080"
	]);
	const FRONT_NAMES$2 = [
		"left",
		"center",
		"right"
	];
	const FRONT_LABELS$2 = {
		left: "SINISTRA",
		center: "CENTRO",
		right: "DESTRA"
	};
	const SLOTS$1 = [
		"line",
		"supA",
		"supB"
	];
	const TACTICS_REQUIRING_CHOICE = /* @__PURE__ */ new Set([
		"set-1-061",
		"set-1-062",
		"set-1-064",
		"set-1-065",
		"set-1-066",
		"set-1-068",
		"set-1-069",
		"set-1-070",
		"set-1-071",
		"set-1-073",
		"set-1-076",
		"set-2-053",
		"set-2-054",
		"set-2-057",
		"set-2-061",
		"set-2-062",
		"set-2-056",
		"set-2-058",
		"set-2-060",
		"set-2-063",
		"set-2-064",
		"set-2-065",
		"set-2-066",
		"set-2-067",
		"set-2-068",
		"set-2-071",
		"set-3-074",
		"set-3-057",
		"set-3-058",
		"set-3-060",
		"set-3-061",
		"set-3-062",
		"set-3-063",
		"set-3-064",
		"set-3-065",
		"set-3-066",
		"set-3-076",
		"set-3-077",
		"set-3-067",
		"set-3-071",
		"set-3-078",
		"set-3-080",
		"set-1-074",
		"set-2-070",
		"set-2-074",
		"set-2-075",
		"set-2-078",
		"set-3-072",
		"set-3-075"
	]);
	function idOf(card) {
		return card.catalogId || card.id;
	}
	function unitsIn(player, frontName) {
		return SLOTS$1.map((slotName) => ({
			frontName,
			slotName,
			unit: player.fronts[frontName][slotName]
		})).filter((target) => target.unit);
	}
	function lineChoices(player, side, owner) {
		return FRONT_NAMES$2.filter((frontName) => player.fronts[frontName].line).map((frontName) => ({
			label: `${side} · ${FRONT_LABELS$2[frontName]} · ${player.fronts[frontName].line.name}`,
			value: {
				frontName,
				slotName: "line",
				owner
			}
		}));
	}
	function supportChoices(player, side, filter = () => true) {
		return FRONT_NAMES$2.filter((frontName) => player.fronts[frontName]).flatMap((frontName) => {
			const front = player.fronts[frontName];
			return ["supA", "supB"].filter((slotName) => front[slotName] && filter(front[slotName], frontName)).map((slotName) => ({
				label: `${side} · ${FRONT_LABELS$2[frontName]} · Supporto ${slotName === "supA" ? "A" : "B"} · ${front[slotName].name}`,
				value: {
					frontName,
					slotName
				}
			}));
		});
	}
	function isRegisteredTactic(card) {
		return card.category === "tactic" && IMPLEMENTED_TACTICS.has(idOf(card));
	}
	function tacticRequiresChoice(card) {
		return TACTICS_REQUIRING_CHOICE.has(idOf(card));
	}
	const INSTANT_TACTICS = /* @__PURE__ */ new Set([
		"set-1-061",
		"set-1-062",
		"set-1-063",
		"set-1-064",
		"set-1-066",
		"set-1-067",
		"set-1-068",
		"set-1-070",
		"set-1-071",
		"set-1-072",
		"set-1-073",
		"set-1-076",
		"set-1-077",
		"set-1-078",
		"set-2-061",
		"set-2-064",
		"set-2-066",
		"set-2-069",
		"set-2-070",
		"set-2-073",
		"set-2-077",
		"set-3-058",
		"set-3-060",
		"set-3-062",
		"set-3-064",
		"set-3-068",
		"set-3-070",
		"set-3-071",
		"set-3-072",
		"set-3-073",
		"set-3-074",
		"set-3-075",
		"set-3-076",
		"set-3-079",
		"set-3-080",
		"set-4-057",
		"set-4-061",
		"set-4-062",
		"set-4-065",
		"set-4-068",
		"set-4-069",
		"set-4-070",
		"set-4-073",
		"set-4-074",
		"set-4-076",
		"set-4-077",
		"set-4-078",
		"set-4-080",
		"set-4-081",
		"set-4-082"
	]);
	function tacticTiming(card) {
		if (card?.category !== "tactic") return null;
		return INSTANT_TACTICS.has(idOf(card)) ? "instant" : "standard";
	}
	function anyLineChoices(player, opponent) {
		return [...lineChoices(player, "Tua Linea", "player"), ...lineChoices(opponent, "Linea avversaria", "opponent")];
	}
	function getTacticChoices$2(card, player, opponent) {
		const id = idOf(card);
		if (!isRegisteredTactic(card)) return null;
		if (id === "set-1-061" || id === "set-1-064") return lineChoices(player, "Tua Linea", "player");
		if (id === "set-1-062") return lineChoices(opponent, "Linea avversaria", "opponent");
		if (id === "set-1-065" || id === "set-3-057") {
			const playerFrontIndexes = Object.fromEntries(FRONT_NAMES$2.map((name, index) => [name, index]));
			return supportChoices(player, "Tuo Supporto").flatMap((choice) => FRONT_NAMES$2.filter((frontName) => Math.abs(playerFrontIndexes[frontName] - playerFrontIndexes[choice.value.frontName]) === 1).flatMap((frontName) => {
				const target = player.fronts[frontName];
				const choices = ["supA", "supB"].filter((slotName) => !target[slotName]).map((slotName) => ({
					label: `${FRONT_LABELS$2[frontName]} · Supporto ${slotName === "supA" ? "A" : "B"}`,
					value: {
						...choice.value,
						targetFront: frontName,
						targetSlot: slotName
					}
				}));
				if (!target.line && id === "set-1-065") choices.push({
					label: `${FRONT_LABELS$2[frontName]} · Linea`,
					value: {
						...choice.value,
						targetFront: frontName,
						targetSlot: "line"
					}
				});
				return choices;
			}));
		}
		if (id === "set-1-066") return FRONT_NAMES$2.flatMap((frontName) => {
			const front = player.fronts[frontName];
			return SLOTS$1.filter((slotName) => front[slotName]?.keywords.includes("Ferocia")).map((slotName) => ({
				label: `${FRONT_LABELS$2[frontName]} · ${front[slotName].name}`,
				value: {
					frontName,
					slotName
				}
			}));
		});
		if (id === "set-1-069") {
			const discardCards = player.hand.filter((item) => item.id !== card.id);
			return FRONT_NAMES$2.flatMap((frontName) => {
				const line = player.fronts[frontName].line;
				return line ? discardCards.map((discard) => ({
					label: `Scarta ${discard.name} · +${Math.min(4, countUnits$1(player))} Forza a ${line.name}`,
					value: {
						frontName,
						discardId: discard.id
					}
				})) : [];
			});
		}
		if (id === "set-1-070") return FRONT_NAMES$2.flatMap((frontName) => {
			const ownLine = player.fronts[frontName].line;
			const enemyLine = opponent.fronts[frontName].line;
			return ownLine && enemyLine ? [{
				label: `${FRONT_LABELS$2[frontName]} · ${ownLine.name} contro ${enemyLine.name}`,
				value: { frontName }
			}] : [];
		});
		if (id === "set-1-071") return FRONT_NAMES$2.flatMap((frontName) => unitsIn(player, frontName).map(({ slotName, unit }) => ({
			label: `${FRONT_LABELS$2[frontName]} · ${unit.name} (danno: ${Math.min(5, unit.currentForce)})`,
			value: {
				frontName,
				slotName
			}
		})));
		if (id === "set-1-073") return FRONT_NAMES$2.flatMap((frontName) => player.fronts[frontName].line ? supportChoices({ fronts: { [frontName]: opponent.fronts[frontName] } }, `${FRONT_LABELS$2[frontName]} avversario`, (unit) => !unit.keywords.includes("Divinità")).map((choice) => ({
			...choice,
			value: {
				...choice.value,
				frontName
			}
		})) : []);
		if (id === "set-2-053" || id === "set-2-054" || id === "set-2-061" || id === "set-2-062") {
			const choices = anyLineChoices(player, opponent);
			return id === "set-2-061" ? choices.filter((choice) => {
				return !(choice.value.owner === "player" ? player : opponent).fronts[choice.value.frontName].line.keywords.includes("Divinità");
			}) : choices;
		}
		if (id === "set-2-065") return anyLineChoices(player, opponent).filter((choice) => {
			const unit = (choice.value.owner === "player" ? player : opponent).fronts[choice.value.frontName].line;
			return unit.currentForce <= 2 && !unit.keywords.includes("Divinità");
		});
		if (id === "set-2-066") return anyLineChoices(player, opponent);
		if (id === "set-2-070") return player.discard.filter((unit) => unit.category === "unit" && unit.keywords.includes("Eco Spettrale")).flatMap((unit) => FRONT_NAMES$2.flatMap((frontName) => {
			const front = player.fronts[frontName];
			const slots = ["supA", "supB"].filter((slotName) => !front[slotName]);
			if (!front.line && (unit.keywords.includes("Assalto") || unit.keywords.includes("Posizione Difensiva"))) slots.push("line");
			return slots.map((slotName) => ({
				label: `${unit.name} · ${FRONT_LABELS$2[frontName]} · ${slotName === "line" ? "Linea" : `Supporto ${slotName === "supA" ? "A" : "B"}`} · costo ${unit.cost}`,
				value: {
					cardId: unit.id,
					frontName,
					slotName
				}
			}));
		})).filter((choice) => player.domains.filter((domain) => !domain.tapped).length >= card.cost + (player.discard.find((unit) => unit.id === choice.value.cardId)?.cost || 0));
		if (id === "set-2-056") return anyLineChoices(player, opponent).filter((choice) => {
			return ((choice.value.owner === "player" ? player : opponent).fronts[choice.value.frontName].line.forceLostThisTurn || 0) > 0;
		});
		if (id === "set-1-068") return lineChoices(player, "Tua Linea", "player").filter((choice) => (player.fronts[choice.value.frontName].line.damageThisTurn || 0) > 0);
		if (id === "set-1-076") return FRONT_NAMES$2.filter((frontName) => player.fronts[frontName].line?.currentForce >= 7 && !player.fronts[frontName].line.keywords.includes("Divinità")).map((frontName) => ({
			label: `${FRONT_LABELS$2[frontName]} · ${player.fronts[frontName].line.name} (Forza ${player.fronts[frontName].line.currentForce})`,
			value: { frontName }
		}));
		if (id === "set-2-057" || id === "set-2-064") return player.discard.filter((unit) => unit.keywords.includes("Eco Spettrale")).map((unit) => ({
			label: `${unit.name} · ${id === "set-2-057" ? "metti in cima al mazzo" : "aggiungi alla mano"}`,
			value: { cardId: unit.id }
		}));
		if (id === "set-2-067") return [...player.discard.map((unit) => ({
			label: `Esilia dai tuoi scarti · ${unit.name}`,
			value: {
				owner: "player",
				cardId: unit.id
			}
		})), ...opponent.discard.map((unit) => ({
			label: `Esilia dagli scarti avversari · ${unit.name}`,
			value: {
				owner: "opponent",
				cardId: unit.id
			}
		}))];
		if (id === "set-2-068") return player.armyDeck.slice(-4).map((unit) => ({
			label: `Aggiungi alla mano · ${unit.name}`,
			value: { cardId: unit.id }
		}));
		if (id === "set-3-058") return lineChoices(opponent, "Linea avversaria", "opponent");
		if (id === "set-3-060" || id === "set-3-064") {
			const keyword = id === "set-3-060" ? "Mente Collettiva" : "Sorvolo";
			return FRONT_NAMES$2.flatMap((frontName) => {
				const front = player.fronts[frontName];
				return SLOTS$1.filter((slotName) => front[slotName]?.keywords.includes(keyword)).map((slotName) => ({
					label: `${FRONT_LABELS$2[frontName]} · ${front[slotName].name}`,
					value: {
						frontName,
						slotName
					}
				}));
			});
		}
		if (id === "set-3-062") return FRONT_NAMES$2.flatMap((frontName) => {
			const ownFront = player.fronts[frontName];
			if (SLOTS$1.filter((slotName) => ownFront[slotName]?.keywords.includes("Mente Collettiva")).length < 2) return [];
			const enemyFront = opponent.fronts[frontName];
			return ["supA", "supB"].filter((slotName) => enemyFront[slotName] && !enemyFront[slotName].keywords.includes("Divinità")).map((slotName) => ({
				label: `${FRONT_LABELS$2[frontName]} avversario · Supporto ${slotName === "supA" ? "A" : "B"} · ${enemyFront[slotName].name}`,
				value: {
					frontName,
					slotName
				}
			}));
		});
		if (id === "set-2-058" || id === "set-3-061" || id === "set-3-066") return FRONT_NAMES$2.flatMap((frontName) => {
			const front = player.fronts[frontName];
			if (!front.line || front.line.cannotMoveThisTurn) return [];
			return ["supA", "supB"].filter((slotName) => front[slotName]).map((slotName) => ({
				label: `${FRONT_LABELS$2[frontName]} · scambia Linea con Supporto ${slotName === "supA" ? "A" : "B"}`,
				value: {
					frontName,
					slotName
				}
			}));
		});
		if (id === "set-2-060" || id === "set-3-063") {
			const choices = opponent.hand.filter((item) => item.category !== "unit").map((item) => ({
				label: `${item.name} · rimetti in cima al mazzo avversario`,
				value: { cardId: item.id }
			}));
			if (id === "set-3-063") choices.push({
				label: "Non scegliere una carta",
				value: { skip: true }
			});
			return choices;
		}
		if (id === "set-2-063") return FRONT_NAMES$2.flatMap((frontName) => SLOTS$1.filter((slotName) => {
			const unit = opponent.fronts[frontName][slotName];
			return unit && !unit.keywords?.includes("Divinità");
		}).map((slotName) => ({
			label: `${FRONT_LABELS$2[frontName]} avversario · ${opponent.fronts[frontName][slotName].name}`,
			value: {
				frontName,
				slotName,
				owner: "opponent"
			}
		})));
		if (id === "set-2-071") return [{
			owner: "opponent",
			player: opponent,
			label: "Comandante avversario"
		}, {
			owner: "player",
			player,
			label: "Il tuo Comandante"
		}].map((target) => ({
			label: `${target.label} · -${Math.min(3, Math.floor(target.player.discard.length / 2))} Forza alle Linee`,
			value: { owner: target.owner }
		})).filter((choice) => {
			const target = choice.value.owner === "player" ? player : opponent;
			return Math.min(3, Math.floor(target.discard.length / 2)) > 0;
		});
		if (id === "set-1-074" || id === "set-2-075") return [...(player.sites || []).map((site) => ({
			label: `Tuo Sito · ${site.name} (${site.ruins || 0} Rovine)`,
			value: {
				owner: "player",
				siteId: site.id
			}
		})), ...(opponent.sites || []).map((site) => ({
			label: `Sito avversario · ${site.name} (${site.ruins || 0} Rovine)`,
			value: {
				owner: "opponent",
				siteId: site.id
			}
		}))];
		if (id === "set-2-074" || id === "set-3-075") return lineChoices(opponent, "Linea avversaria", "opponent").filter((target) => {
			const line = opponent.fronts[target.value.frontName].line;
			return !line.keywords.includes("Divinità") && !line.cannotMoveThisTurn && !isProtectedFromEnemyMovement(opponent, line, target.value.frontName);
		}).flatMap((target) => FRONT_NAMES$2.filter((targetFront) => !player.fronts[targetFront].line).map((targetFront) => ({
			label: `${target.label} → tua Linea ${FRONT_LABELS$2[targetFront]}`,
			value: {
				frontName: target.value.frontName,
				targetFront
			}
		})));
		if (id === "set-3-072") return supportChoices(opponent, "Supporto avversario", (unit, frontName) => !unit.keywords.includes("Divinità") && !isProtectedFromEnemyMovement(opponent, unit, frontName)).flatMap((target) => FRONT_NAMES$2.flatMap((targetFront) => ["supA", "supB"].filter((targetSlot) => !player.fronts[targetFront][targetSlot]).map((targetSlot) => ({
			label: `${target.label} → tuo Supporto ${targetSlot === "supA" ? "A" : "B"} in ${FRONT_LABELS$2[targetFront]}`,
			value: {
				frontName: target.value.frontName,
				sourceSlot: target.value.slotName,
				targetFront,
				targetSlot
			}
		}))));
		if (id === "set-2-078") return FRONT_NAMES$2.flatMap((ownFrontName) => FRONT_NAMES$2.filter((enemyFrontName) => player.fronts[ownFrontName].line && opponent.fronts[enemyFrontName].line).map((enemyFrontName) => ({
			label: `Sacrifica la tua Linea ${FRONT_LABELS$2[ownFrontName]} e la Linea avversaria ${FRONT_LABELS$2[enemyFrontName]}`,
			value: {
				ownFrontName,
				enemyFrontName
			}
		})));
		if (id === "set-3-065") return FRONT_NAMES$2.flatMap((frontName) => ["supA", "supB"].filter((slotName) => !player.fronts[frontName][slotName] && countUnits$1(player) < 3 * FRONT_NAMES$2.length).map((slotName) => ({
			label: `${FRONT_LABELS$2[frontName]} · Supporto ${slotName === "supA" ? "A" : "B"}`,
			value: {
				frontName,
				slotName
			}
		})));
		if (id === "set-3-078") return [player, opponent].flatMap((owner, ownerIndex) => {
			const side = ownerIndex === 0 ? "Tuo" : "Avversario";
			return FRONT_NAMES$2.flatMap((first, index) => FRONT_NAMES$2.slice(index + 1).map((second) => ({
				label: `${side} · ${FRONT_LABELS$2[first]} ↔ ${FRONT_LABELS$2[second]}`,
				value: {
					owner: ownerIndex === 0 ? "player" : "opponent",
					first,
					second
				}
			})).filter((choice) => ownerIndex === 0 || [choice.value.first, choice.value.second].every((frontName) => [
				"line",
				"supA",
				"supB"
			].every((slotName) => {
				const unit = owner.fronts[frontName][slotName];
				return !unit || !isProtectedFromEnemyMovement(owner, unit, frontName);
			}))));
		});
		if (id === "set-3-067") return FRONT_NAMES$2.flatMap((frontName, index) => {
			const line = opponent.fronts[frontName].line;
			if (!line || line.cannotMoveThisTurn || isProtectedFromEnemyMovement(opponent, line, frontName)) return [];
			return [index - 1, index + 1].filter((adjacentIndex) => FRONT_NAMES$2[adjacentIndex] && !opponent.fronts[FRONT_NAMES$2[adjacentIndex]].line).map((adjacentIndex) => ({
				label: `${line.name} · ${FRONT_LABELS$2[frontName]} → ${FRONT_LABELS$2[FRONT_NAMES$2[adjacentIndex]]}`,
				value: {
					frontName,
					targetFront: FRONT_NAMES$2[adjacentIndex]
				}
			}));
		});
		if (id === "set-3-071") return FRONT_NAMES$2.flatMap((frontName, index) => {
			const source = opponent.fronts[frontName];
			if (!source.line || source.line.cannotMoveThisTurn || isProtectedFromEnemyMovement(opponent, source.line, frontName)) return [];
			const destinations = [index - 1, index + 1].filter((adjacentIndex) => FRONT_NAMES$2[adjacentIndex] && !opponent.fronts[FRONT_NAMES$2[adjacentIndex]].line);
			return ["supA", "supB"].filter((slotName) => source[slotName] && !source[slotName].keywords.includes("Divinità")).flatMap((slotName) => destinations.map((adjacentIndex) => ({
				label: `${source[slotName].name}; sposta ${source.line.name} da ${FRONT_LABELS$2[frontName]} a ${FRONT_LABELS$2[FRONT_NAMES$2[adjacentIndex]]}`,
				value: {
					frontName,
					slotName,
					targetFront: FRONT_NAMES$2[adjacentIndex]
				}
			})));
		});
		if (id === "set-3-076") return FRONT_NAMES$2.filter((frontName) => SLOTS$1.some((slotName) => player.fronts[frontName][slotName]?.keywords.includes("Mente Collettiva")) || SLOTS$1.some((slotName) => opponent.fronts[frontName][slotName]?.keywords.includes("Mente Collettiva"))).map((frontName) => ({
			label: `${FRONT_LABELS$2[frontName]} · Unità con Mente Collettiva`,
			value: { frontName }
		}));
		if (id === "set-3-077") return [{
			label: `Comandante avversario · ${opponent.parasites} Parassiti`,
			value: { owner: "opponent" }
		}, {
			label: `Il tuo Comandante · ${player.parasites} Parassiti`,
			value: { owner: "player" }
		}];
		if (id === "set-3-074") return [{
			commander: "opponent",
			target: opponent,
			label: "Comandante avversario"
		}, {
			commander: "player",
			target: player,
			label: "Il tuo Comandante"
		}].flatMap(({ commander, target, label }) => {
			if (target.parasites + 1 < 2) return [{
				label: `${label} · aggiungi 1 Parassita`,
				value: { commander }
			}];
			const lines = anyLineChoices(player, opponent).filter((line) => {
				return !(line.value.owner === "player" ? player : opponent).fronts[line.value.frontName].line.keywords.includes("Divinità");
			});
			if (lines.length === 0) return [{
				label: `${label} · aggiungi 1 Parassita`,
				value: { commander }
			}];
			return lines.map((line) => ({
				label: `${label} · aggiungi 1 Parassita; -2 Forza a ${line.label}`,
				value: {
					commander,
					lineOwner: line.value.owner,
					frontName: line.value.frontName
				}
			}));
		});
		if (id === "set-3-080") return lineChoices(opponent, "Linea avversaria", "opponent").filter((choice) => {
			const unit = opponent.fronts[choice.value.frontName].line;
			return unit.currentForce <= 4 && !unit.keywords.includes("Divinità");
		});
		return [];
	}
	function countUnits$1(player) {
		return FRONT_NAMES$2.reduce((count, frontName) => count + SLOTS$1.filter((slotName) => player.fronts[frontName][slotName]).length, 0);
	}
	function removeUnit(player, frontName, slotName) {
		const front = player.fronts[frontName];
		const unit = front[slotName];
		if (!unit) return null;
		if (isProtectedFromEffectDestruction(unit, slotName)) return null;
		front[slotName] = null;
		if (slotName === "line") {
			const next = front.supA ? "supA" : front.supB ? "supB" : null;
			if (next) {
				front.line = front[next];
				front.line.position = "line";
				front[next] = next === "supA" ? front.supB : null;
				if (next === "supA") front.supB = null;
			}
		}
		if (unit.equipment) {
			player.discard.push(unit.equipment);
			unit.equipment = null;
		}
		if (unit.keywords.includes("Divinità")) player.discard.push(unit);
		else if (unit.keywords.includes("Eco Spettrale")) player.exile.push(unit);
		else player.discard.push(unit);
		return unit;
	}
	function assertEnemyUnitCanBeMoved(owner, unit, frontName) {
		if (isProtectedFromEnemyMovement(owner, unit, frontName)) throw new Error(`${unit.name} non può essere spostata da effetti avversari.`);
	}
	function destroyUnit(player, frontName, slotName) {
		const unit = player.fronts[frontName][slotName];
		if (!unit || unit.keywords.includes("Divinità")) return null;
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
			if (line.currentForce <= 0) removeUnit(player, frontName, "line");
		}
	}
	function resolveRegisteredTactic(card, choice, player, opponent, context = {}) {
		const id = idOf(card);
		if (!isRegisteredTactic(card)) throw new Error(`Nessun risolutore registrato per la Tattica ${id}.`);
		const onForceLoss = context.onForceLoss || ((owner, unit, amount) => {
			if (!player.tacticEffects?.drawOnForceLoss || amount <= 0) return;
			const drawn = player.armyDeck?.pop();
			if (drawn) player.hand.push(drawn);
		});
		const damageLine = context.damageLine || ((owner, frontName, amount) => defaultDamageLine(owner, frontName, amount, onForceLoss));
		const remove = context.removeUnit || removeUnit;
		const destroy = context.destroyUnit || destroyUnit;
		if (id === "set-1-061") {
			const unit = player.fronts[choice.frontName].line;
			unit.currentForce += 2;
			unit.temporaryForce = (unit.temporaryForce || 0) + 2;
			return `${card.name}: ${unit.name} ottiene +2 Forza fino alla fine dello Scontro.`;
		}
		if (id === "set-1-062") {
			damageLine(opponent, choice.frontName, 2);
			return `${card.name}: infligge 2 danni alla Linea avversaria in ${FRONT_LABELS$2[choice.frontName]}.`;
		}
		if (id === "set-1-064") {
			const unit = player.fronts[choice.frontName].line;
			unit.damageShield = (unit.damageShield || 0) + 2;
			return `${card.name}: ${unit.name} riduce di 2 il prossimo danno che subisce in questo turno.`;
		}
		if (id === "set-1-065") {
			moveSupport(player, choice);
			return `${card.name}: un Supporto si sposta in ${FRONT_LABELS$2[choice.targetFront]}.`;
		}
		if (id === "set-2-066") {
			const owner = choice.owner === "player" ? player : opponent;
			owner.fronts[choice.frontName].line.cannotMoveThisTurn = true;
			return `${card.name}: la Linea in ${FRONT_LABELS$2[choice.frontName]} non può essere spostata fino alla fine del turno.`;
		}
		if (id === "set-3-057") {
			moveSupport(player, choice);
			return `${card.name}: un Supporto si sposta in ${FRONT_LABELS$2[choice.targetFront]}.`;
		}
		if (id === "set-2-058" || id === "set-3-061" || id === "set-3-066") {
			const front = player.fronts[choice.frontName];
			const line = front.line;
			front.line = front[choice.slotName];
			front[choice.slotName] = line;
			front.line.position = "line";
			front[choice.slotName].position = choice.slotName;
			return `${card.name}: Linea e Supporto si scambiano di posizione in ${FRONT_LABELS$2[choice.frontName]}.`;
		}
		if (id === "set-1-066") {
			const unit = player.fronts[choice.frontName][choice.slotName];
			unit.keywords.push("Assalto");
			unit.temporaryKeywords ||= [];
			unit.temporaryKeywords.push("Assalto");
			return `${card.name}: ${unit.name} ottiene Assalto fino alla fine del turno.`;
		}
		if (id === "set-1-069") {
			const discardIndex = player.hand.findIndex((item) => item.id === choice.discardId);
			if (discardIndex < 0) throw new Error("La carta da scartare non è più in mano.");
			const [discard] = player.hand.splice(discardIndex, 1);
			player.discard.push(discard);
			const unit = player.fronts[choice.frontName].line;
			const bonus = Math.min(4, countUnits$1(player));
			unit.currentForce += bonus;
			unit.temporaryForce = (unit.temporaryForce || 0) + bonus;
			return `${card.name}: scarti ${discard.name}; ${unit.name} ottiene +${bonus} Forza.`;
		}
		if (id === "set-1-070") {
			const ownLine = player.fronts[choice.frontName].line;
			const enemyLine = opponent.fronts[choice.frontName].line;
			const ownDamage = Math.max(0, ownLine.currentForce);
			const enemyDamage = Math.max(0, enemyLine.currentForce);
			damageLine(opponent, choice.frontName, ownDamage);
			damageLine(player, choice.frontName, enemyDamage);
			return `${card.name}: le Linee di ${FRONT_LABELS$2[choice.frontName]} si infliggono danno simultaneamente.`;
		}
		if (id === "set-1-071") {
			const unit = player.fronts[choice.frontName][choice.slotName];
			const damage = Math.min(5, Math.max(0, unit.currentForce));
			remove(player, choice.frontName, choice.slotName);
			opponent.pc = Math.max(0, opponent.pc - damage);
			return `${card.name}: sacrifichi ${unit.name} e infliggi ${damage} danni al Comandante avversario.`;
		}
		if (id === "set-1-073") {
			const unit = destroy(opponent, choice.frontName, choice.slotName);
			if (!unit) throw new Error("Il Supporto bersaglio non è più distruttibile.");
			return `${card.name}: ${unit.name} viene distrutto.`;
		}
		if (id === "set-1-074") {
			const owner = choice.owner === "player" ? player : opponent;
			const siteIndex = (owner.sites || []).findIndex((site) => site.id === choice.siteId);
			if (siteIndex < 0) throw new Error("Il Sito scelto non è più in gioco.");
			const site = owner.sites[siteIndex];
			site.ruins = (site.ruins || 0) + 1;
			if (site.ruins >= 2) {
				owner.sites.splice(siteIndex, 1);
				owner.discard.push(site);
				return `${card.name}: ${site.name} raggiunge 2 Rovine e viene distrutto.`;
			}
			return `${card.name}: ${site.name} riceve 1 segnalino Rovina.`;
		}
		if (id === "set-2-059") {
			player.tacticEffects ||= {};
			player.tacticEffects.drawOnForceLoss = true;
			return `${card.name}: peschi 1 carta ogni volta che una Linea perde Forza in questo turno.`;
		}
		if (id === "set-1-067") {
			player.tacticEffects ||= {};
			player.tacticEffects.breakthrough = (player.tacticEffects.breakthrough || 0) + 1;
			return `${card.name}: la tua Linea infligge 1 danno aggiuntivo se supera la Linea avversaria nello stesso Fronte.`;
		}
		if (id === "set-1-068") {
			const unit = player.fronts[choice.frontName].line;
			const bonus = unit.damageThisTurn || 0;
			unit.currentForce += bonus;
			unit.temporaryForce = (unit.temporaryForce || 0) + bonus;
			return `${card.name}: ${unit.name} ottiene +${bonus} Forza in base ai danni subiti in questo turno.`;
		}
		if (id === "set-1-072" || id === "set-3-070") {
			player.tacticEffects ||= {};
			player.tacticEffects.supportBonus = 2;
			return `${card.name}: ogni Supporto fornisce +2 Forza, fino a +3 per Fronte, in questo Scontro.`;
		}
		if (id === "set-1-076") {
			const sacrificed = remove(player, choice.frontName, "line");
			if (!sacrificed) throw new Error("La Linea da sacrificare non è più presente.");
			const enemyFront = opponent.fronts[choice.frontName];
			const victimIds = SLOTS$1.map((slotName) => enemyFront[slotName]?.id).filter(Boolean);
			for (const victimId of victimIds) {
				const slotName = SLOTS$1.find((slot) => enemyFront[slot]?.id === victimId);
				if (slotName) destroy(opponent, choice.frontName, slotName);
			}
			return `${card.name}: sacrifichi ${sacrificed.name}; le Unità nemiche non protette di ${FRONT_LABELS$2[choice.frontName]} vengono distrutte.`;
		}
		if (id === "set-1-077") {
			player.sacrificeAfterCombat ||= [];
			let affected = 0;
			for (const frontName of FRONT_NAMES$2) {
				const unit = player.fronts[frontName].line;
				if (!unit) continue;
				unit.keywords.push("Assalto");
				unit.temporaryKeywords ||= [];
				unit.temporaryKeywords.push("Assalto");
				if (!player.sacrificeAfterCombat.includes(unit.id)) player.sacrificeAfterCombat.push(unit.id);
				affected++;
			}
			return `${card.name}: ${affected} Linee ottengono Assalto e saranno sacrificate a fine Scontro.`;
		}
		if (id === "set-1-078") {
			player.tacticEffects ||= {};
			player.tacticEffects.doubleCentralDamage = true;
			return `${card.name}: raddoppia il danno al Comandante inflitto nel Fronte Centrale in questo turno.`;
		}
		if (id === "set-2-056") {
			const owner = choice.owner === "player" ? player : opponent;
			const unit = owner.fronts[choice.frontName].line;
			const amount = unit.forceLostThisTurn || 0;
			damageLine(owner, choice.frontName, amount);
			return `${card.name}: ${unit.name} subisce ${amount} danni, pari alla Forza persa in questo turno.`;
		}
		if (id === "set-2-053" || id === "set-2-054" || id === "set-2-062") {
			const owner = choice.owner === "player" ? player : opponent;
			const unit = owner.fronts[choice.frontName].line;
			const amount = id === "set-2-053" ? 1 : id === "set-2-054" ? 2 : 3;
			const applied = Math.min(amount, Math.max(0, unit.currentForce));
			unit.currentForce -= applied;
			unit.temporaryForce = (unit.temporaryForce || 0) - applied;
			unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) + applied;
			onForceLoss(owner, unit, applied);
			return `${card.name}: ${unit.name} perde ${amount} Forza fino alla fine dello Scontro.`;
		}
		if (id === "set-2-057" || id === "set-2-064") {
			const index = player.discard.findIndex((unit) => unit.id === choice.cardId);
			if (index < 0) throw new Error("La carta Eco Spettrale non è più negli scarti.");
			const [unit] = player.discard.splice(index, 1);
			if (id === "set-2-057") player.armyDeck.push(unit);
			else player.hand.push(unit);
			return id === "set-2-057" ? `${card.name}: ${unit.name} viene messa in cima al mazzo.` : `${card.name}: ${unit.name} viene aggiunta alla mano.`;
		}
		if (id === "set-2-061") {
			const owner = choice.owner === "player" ? player : opponent;
			const unit = owner.fronts[choice.frontName].line;
			unit.force = Math.max(0, unit.force - 1);
			unit.currentForce = Math.max(0, unit.currentForce - 1);
			unit.damage = Math.max(0, (unit.damage || 0) - 1);
			onForceLoss(owner, unit, 1);
			return `${card.name}: ${unit.name} perde 1 Forza permanente.`;
		}
		if (id === "set-2-065") {
			const unit = destroy(choice.owner === "player" ? player : opponent, choice.frontName, "line");
			if (!unit) throw new Error("La Linea bersaglio non è più distruttibile.");
			return `${card.name}: ${unit.name} viene distrutta.`;
		}
		if (id === "set-2-070") {
			const index = player.discard.findIndex((unit) => unit.id === choice.cardId && unit.keywords.includes("Eco Spettrale"));
			if (index < 0) throw new Error("L’Unità Eco Spettrale non è più negli scarti.");
			const unit = player.discard[index];
			const cost = Math.max(0, unit.cost || 0);
			const available = player.domains.filter((domain) => !domain.tapped);
			if (available.length < cost) throw new Error(`Domini insufficienti per Risveglio Oscuro: servono ${cost}.`);
			const front = player.fronts[choice.frontName];
			if (front[choice.slotName]) throw new Error("La posizione di schieramento non è più libera.");
			available.slice(0, cost).forEach((domain) => {
				domain.tapped = true;
			});
			player.discard.splice(index, 1);
			unit.currentForce = unit.force;
			unit.front = choice.frontName;
			unit.position = choice.slotName;
			front[choice.slotName] = unit;
			context.onUnitPlayed?.(player, unit);
			return `${card.name}: ${unit.name} viene giocata dagli scarti pagando ${cost} Domini.`;
		}
		if (id === "set-2-067") {
			const owner = choice.owner === "player" ? player : opponent;
			const index = owner.discard.findIndex((unit) => unit.id === choice.cardId);
			if (index < 0) throw new Error("La carta scelta non è più negli scarti.");
			const [unit] = owner.discard.splice(index, 1);
			owner.exile.push(unit);
			const drawn = player.armyDeck.pop();
			if (drawn) player.hand.push(drawn);
			return `${card.name}: ${unit.name} viene esiliata${drawn ? `; peschi ${drawn.name}` : ", ma il mazzo è vuoto"}.`;
		}
		if (id === "set-2-068") {
			const count = Math.min(4, player.armyDeck.length);
			const lookedAt = Array.from({ length: count }, () => player.armyDeck.pop());
			const selectedIndex = lookedAt.findIndex((unit) => unit.id === choice.cardId);
			if (selectedIndex < 0) throw new Error("La carta scelta non è più tra le prime quattro.");
			const [selected] = lookedAt.splice(selectedIndex, 1);
			player.hand.push(selected);
			player.armyDeck.unshift(...lookedAt.reverse());
			return `${card.name}: ${selected.name} viene aggiunta alla mano; le altre carte guardate tornano in fondo al mazzo.`;
		}
		if (id === "set-2-060" || id === "set-3-063") {
			if (choice.skip) return `${card.name}: nessuna carta avversaria viene scelta.`;
			const index = opponent.hand.findIndex((item) => item.id === choice.cardId && item.category !== "unit");
			if (index < 0) throw new Error("La carta non-Unità scelta non è più nella mano avversaria.");
			const [selected] = opponent.hand.splice(index, 1);
			opponent.armyDeck.push(selected);
			return `${card.name}: ${selected.name} viene rimessa in cima al mazzo avversario.`;
		}
		if (id === "set-2-063") {
			const unit = opponent.fronts[choice.frontName]?.[choice.slotName];
			if (!unit || unit.keywords?.includes("Divinità")) throw new Error("L’Unità scelta non può ricevere Tormento.");
			unit.tormentTurns = 2;
			return `${card.name}: ${unit.name} subisce 1 danno all'inizio di ogni turno per 2 turni.`;
		}
		if (id === "set-2-072") {
			const victims = FRONT_NAMES$2.flatMap((frontName) => SLOTS$1.map((slotName) => opponent.fronts[frontName][slotName]).filter((unit) => unit && unit.currentForce <= 3 && !unit.keywords.includes("Divinità")).map((unit) => ({
				frontName,
				id: unit.id
			})));
			let destroyed = 0;
			for (const victim of victims) {
				const slotName = SLOTS$1.find((slot) => opponent.fronts[victim.frontName][slot]?.id === victim.id);
				if (slotName && destroy(opponent, victim.frontName, slotName)) destroyed++;
			}
			return `${card.name}: ${destroyed} Unità avversarie con Forza 3 o inferiore vengono distrutte.`;
		}
		if (id === "set-2-074" || id === "set-3-075") {
			const source = opponent.fronts[choice.frontName];
			const unit = source.line;
			const target = player.fronts[choice.targetFront];
			if (!unit || unit.cannotMoveThisTurn || target.line) throw new Error("La Linea avversaria o la tua Linea di destinazione non sono valide.");
			assertEnemyUnitCanBeMoved(opponent, unit, choice.frontName);
			source.line = null;
			target.line = unit;
			unit.front = choice.targetFront;
			unit.position = "line";
			player.controlledUnits ||= [];
			player.controlledUnits.push({
				unitId: unit.id,
				ownerId: opponent.id,
				ownerFront: choice.frontName,
				ownerSlot: "line"
			});
			return `${card.name}: ${unit.name} è sotto il tuo controllo fino alla fine dello Scontro.`;
		}
		if (id === "set-2-075") {
			const owner = choice.owner === "player" ? player : opponent;
			const index = (owner.sites || []).findIndex((site) => site.id === choice.siteId);
			if (index < 0) throw new Error("Il Sito bersaglio non è più in gioco.");
			const [site] = owner.sites.splice(index, 1);
			owner.discard.push(site);
			const drawn = owner.armyDeck?.pop();
			if (drawn) owner.hand.push(drawn);
			return `${card.name}: ${site.name} viene distrutto; ${drawn ? `${owner.name || "il suo controllore"} pesca 1 carta` : "il suo controllore non ha carte da pescare"}.`;
		}
		if (id === "set-2-078") {
			for (const [owner, frontName] of [[player, choice.ownFrontName], [opponent, choice.enemyFrontName]]) {
				if (!owner.fronts[frontName].line) throw new Error("Una Linea scelta non è più presente.");
				remove(owner, frontName, "line");
			}
			const recover = (owner, selection) => {
				if (selection === null) return false;
				const unit = selection ? owner.discard?.find((item) => item.id === selection.cardId && item.category === "unit") : owner.discard?.filter((item) => item.category === "unit").sort((left, right) => (right.force || 0) - (left.force || 0))[0];
				if (!unit && selection) throw new Error("L’Unità scelta non è più negli scarti.");
				if (!unit) return false;
				const destination = selection ? {
					frontName: selection.frontName,
					slotName: selection.slotName
				} : FRONT_NAMES$2.flatMap((frontName) => ["supA", "supB"].map((slotName) => ({
					frontName,
					slotName
				}))).find(({ frontName, slotName }) => !owner.fronts[frontName][slotName]);
				if (!destination || !["supA", "supB"].includes(destination.slotName) || !owner.fronts[destination.frontName] || owner.fronts[destination.frontName][destination.slotName]) {
					if (selection) throw new Error("La posizione Supporto scelta non è più disponibile.");
					return false;
				}
				owner.discard.splice(owner.discard.indexOf(unit), 1);
				unit.front = destination.frontName;
				unit.position = destination.slotName;
				owner.fronts[destination.frontName][destination.slotName] = unit;
				return true;
			};
			const playerRecovery = Object.hasOwn(choice, "playerRecovery") ? choice.playerRecovery : void 0;
			const opponentRecovery = Object.hasOwn(choice, "opponentRecovery") ? choice.opponentRecovery : void 0;
			const recovered = Number(recover(player, playerRecovery)) + Number(recover(opponent, opponentRecovery));
			return `${card.name}: entrambi i giocatori sacrificano la Linea scelta; ${recovered} Unità vengono recuperate in Supporto dove possibile.`;
		}
		if (id === "set-3-072") {
			const unit = opponent.fronts[choice.frontName][choice.sourceSlot];
			const own = player.fronts[choice.targetFront];
			if (!unit || unit.keywords.includes("Divinità") || own[choice.targetSlot]) throw new Error("Il Supporto bersaglio o la posizione non sono più validi.");
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
				ownerSlot: choice.sourceSlot
			});
			return `${card.name}: ${unit.name} è sotto il tuo controllo fino alla fine dello Scontro.`;
		}
		if (id === "set-3-067") {
			const source = opponent.fronts[choice.frontName];
			const target = opponent.fronts[choice.targetFront];
			const unit = source.line;
			if (!unit || unit.cannotMoveThisTurn || target.line) throw new Error("La Linea o il Fronte di destinazione non sono più validi.");
			assertEnemyUnitCanBeMoved(opponent, unit, choice.frontName);
			source.line = null;
			target.line = unit;
			unit.front = choice.targetFront;
			unit.position = "line";
			return `${card.name}: ${unit.name} viene spostata da ${FRONT_LABELS$2[choice.frontName]} a ${FRONT_LABELS$2[choice.targetFront]}.`;
		}
		if (id === "set-3-071") {
			const source = opponent.fronts[choice.frontName];
			const target = opponent.fronts[choice.targetFront];
			if (!source.line || source.line.cannotMoveThisTurn || target.line) throw new Error("La Linea o il Fronte di destinazione non sono più validi.");
			assertEnemyUnitCanBeMoved(opponent, source.line, choice.frontName);
			const support = destroy(opponent, choice.frontName, choice.slotName);
			if (!support) throw new Error("Il Supporto bersaglio non è più distruttibile.");
			const line = source.line;
			source.line = null;
			target.line = line;
			line.front = choice.targetFront;
			line.position = "line";
			return `${card.name}: ${support.name} viene distrutto e ${line.name} si sposta in ${FRONT_LABELS$2[choice.targetFront]}.`;
		}
		if (id === "set-2-071") {
			const target = choice.owner === "player" ? player : opponent;
			const loss = Math.min(3, Math.floor(target.discard.length / 2));
			let affected = 0;
			for (const frontName of FRONT_NAMES$2) {
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
		if (id === "set-2-077") {
			player.tacticLimitActive = true;
			opponent.tacticLimitActive = true;
			return `${card.name}: ogni giocatore può giocare al massimo una Tattica per turno.`;
		}
		if (id === "set-2-055" || id === "set-2-073") {
			const drawCount = id === "set-2-055" ? 1 : 3;
			const drawn = [];
			for (let index = 0; index < drawCount && player.armyDeck.length > 0; index++) {
				const unit = player.armyDeck.pop();
				player.hand.push(unit);
				drawn.push(unit);
			}
			const discarded = [...player.hand].sort((left, right) => (right.cost || 0) - (left.cost || 0) || String(left.id).localeCompare(String(right.id)))[0];
			if (discarded) {
				player.hand.splice(player.hand.findIndex((unit) => unit.id === discarded.id), 1);
				player.discard.push(discarded);
			}
			return `${card.name}: peschi ${drawn.length}${discarded ? ` e scarti ${discarded.name}` : "; non hai carte da scartare"}.`;
		}
		if (id === "set-3-058") {
			const unit = opponent.fronts[choice.frontName].line;
			const applied = Math.min(1, Math.max(0, unit.currentForce));
			unit.currentForce -= applied;
			unit.temporaryForce = (unit.temporaryForce || 0) - applied;
			unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) + applied;
			onForceLoss(opponent, unit, applied);
			return `${card.name}: ${unit.name} perde 1 Forza fino alla fine dello Scontro.`;
		}
		if (id === "set-3-060" || id === "set-3-064") {
			const unit = player.fronts[choice.frontName][choice.slotName];
			const bonus = id === "set-3-060" ? 2 : 1;
			unit.currentForce += bonus;
			unit.temporaryForce = (unit.temporaryForce || 0) + bonus;
			return `${card.name}: ${unit.name} ottiene +${bonus} Forza fino alla fine dello Scontro.`;
		}
		if (id === "set-3-065") {
			const unit = {
				id: `swarm-token-${player.tokenCounter || 0}`,
				catalogId: null,
				name: "Pedina Sciame",
				category: "unit",
				type: "Sciame",
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
			return `${card.name}: una Pedina Sciame con Forza 1 entra in Supporto in ${FRONT_LABELS$2[choice.frontName]}.`;
		}
		if (id === "set-3-062") {
			const unit = destroy(opponent, choice.frontName, choice.slotName);
			if (!unit) throw new Error("Il Supporto bersaglio non è più distruttibile.");
			return `${card.name}: ${unit.name} viene distrutto.`;
		}
		if (id === "set-3-068" || id === "set-3-079") {
			const bonus = id === "set-3-068" ? 1 : 2;
			let affected = 0;
			for (const frontName of FRONT_NAMES$2) for (const slotName of SLOTS$1) {
				const unit = player.fronts[frontName][slotName];
				if (!unit?.keywords.includes("Mente Collettiva")) continue;
				unit.currentForce += bonus;
				unit.temporaryForce = (unit.temporaryForce || 0) + bonus;
				affected++;
			}
			return `${card.name}: ${affected} Unità con Mente Collettiva ottengono +${bonus} Forza fino alla fine dello Scontro.`;
		}
		if (id === "set-3-073") {
			player.tacticEffects ||= {};
			player.tacticEffects.collectiveOverrun = (player.tacticEffects.collectiveOverrun || 0) + 1;
			return `${card.name}: infligge 1 danno aggiuntivo vincendo un Fronte con almeno 2 Unità con Mente Collettiva.`;
		}
		if (id === "set-3-076") {
			const frontName = choice.frontName;
			let destroyed = 0;
			for (const owner of [player, opponent]) {
				const victimIds = SLOTS$1.map((slotName) => owner.fronts[frontName][slotName]).filter((unit) => unit?.keywords.includes("Mente Collettiva") && !unit.keywords.includes("Divinità")).map((unit) => unit.id);
				for (const victimId of victimIds) {
					const slotName = SLOTS$1.find((slot) => owner.fronts[frontName][slot]?.id === victimId);
					if (slotName && destroy(owner, frontName, slotName)) destroyed++;
				}
			}
			return `${card.name}: ${destroyed} Unità con Mente Collettiva vengono distrutte in ${FRONT_LABELS$2[frontName]}.`;
		}
		if (id === "set-3-077") {
			const target = choice.owner === "player" ? player : opponent;
			target.parasites += 2;
			if (target.parasites >= 3) target.pc = Math.max(0, target.pc - 2);
			const targetName = target.name || (target === player ? "il tuo Comandante" : "il Comandante avversario");
			return `${card.name}: 2 Parassiti assegnati a ${targetName}${target.parasites >= 3 ? "; perde 2 PC" : ""}.`;
		}
		if (id === "set-3-074") {
			const target = choice.commander === "player" ? player : opponent;
			target.parasites += 1;
			if (target.parasites < 2 || !choice.frontName) return `${card.name}: 1 Parassita assegnato al Comandante scelto.`;
			const lineOwner = choice.lineOwner === "player" ? player : opponent;
			const line = lineOwner.fronts[choice.frontName].line;
			if (!line) throw new Error("La Linea scelta non è più presente.");
			const applied = Math.min(2, Math.max(0, line.currentForce));
			line.currentForce -= applied;
			line.temporaryForce = (line.temporaryForce || 0) - applied;
			line.forceLostThisTurn = (line.forceLostThisTurn || 0) + applied;
			onForceLoss(lineOwner, line, applied);
			return `${card.name}: aggiunge 1 Parassita; ${line.name} perde ${applied} Forza fino alla fine dello Scontro.`;
		}
		if (id === "set-3-078") {
			const owner = choice.owner === "player" ? player : opponent;
			if (owner === opponent) for (const frontName of [choice.first, choice.second]) for (const slotName of SLOTS$1) {
				const unit = owner.fronts[frontName][slotName];
				if (unit) assertEnemyUnitCanBeMoved(owner, unit, frontName);
			}
			const firstFront = owner.fronts[choice.first];
			owner.fronts[choice.first] = owner.fronts[choice.second];
			owner.fronts[choice.second] = firstFront;
			for (const frontName of [choice.first, choice.second]) for (const slotName of SLOTS$1) {
				const unit = owner.fronts[frontName][slotName];
				if (unit) {
					unit.front = frontName;
					unit.position = slotName;
				}
			}
			return `${card.name}: i Fronti ${FRONT_LABELS$2[choice.first]} e ${FRONT_LABELS$2[choice.second]} si scambiano.`;
		}
		if (id === "set-3-080") {
			const ownFront = player.fronts[choice.frontName];
			const collectiveCount = SLOTS$1.filter((slotName) => ownFront[slotName]?.keywords.includes("Mente Collettiva")).length;
			const unit = destroy(opponent, choice.frontName, "line");
			if (!unit) throw new Error("La Linea bersaglio non è più distruttibile.");
			if (collectiveCount >= 2) {
				const drawn = player.armyDeck.pop();
				if (drawn) player.hand.push(drawn);
			}
			return `${card.name}: ${unit.name} viene distrutta${collectiveCount >= 2 ? "; peschi una carta se disponibile" : ""}.`;
		}
		throw new Error(`Risolutore non completo per la Tattica ${id}.`);
	}
	Object.freeze([...IMPLEMENTED_TACTICS]);
	function restoreControlledUnits(players) {
		const restored = [];
		for (const controller of players) for (const control of [...controller.controlledUnits || []]) {
			const owner = players.find((player) => player.id === control.ownerId);
			if (!owner) throw new Error(`Proprietario mancante per l’Unità controllata ${control.unitId}.`);
			let unit = null;
			let location = null;
			for (const [frontName, front] of Object.entries(controller.fronts)) {
				const slotName = SLOTS$1.find((slot) => front[slot]?.id === control.unitId);
				if (!slotName) continue;
				unit = front[slotName];
				location = {
					front,
					frontName,
					slotName
				};
				break;
			}
			if (location) {
				location.front[location.slotName] = null;
				if (location.slotName === "line") {
					const next = location.front.supA ? "supA" : location.front.supB ? "supB" : null;
					if (next) {
						location.front.line = location.front[next];
						location.front.line.position = "line";
						location.front[next] = next === "supA" ? location.front.supB : null;
						if (next === "supA") location.front.supB = null;
					}
				}
			} else for (const zone of ["discard", "exile"]) {
				const index = controller[zone].findIndex((card) => card.id === control.unitId);
				if (index < 0) continue;
				[unit] = controller[zone].splice(index, 1);
				break;
			}
			if (!unit) throw new Error(`Unità controllata ${control.unitId} non trovata durante il ripristino.`);
			if (unit.equipment && !location) {
				owner.discard.push(unit.equipment);
				unit.equipment = null;
			}
			if (location) {
				if (owner.fronts[control.ownerFront][control.ownerSlot]) throw new Error(`Posizione d’origine occupata durante il ripristino di ${unit.name}.`);
				owner.fronts[control.ownerFront][control.ownerSlot] = unit;
				unit.front = control.ownerFront;
				unit.position = control.ownerSlot;
			} else if (unit.keywords.includes("Eco Spettrale")) owner.exile.push(unit);
			else owner.discard.push(unit);
			controller.controlledUnits = controller.controlledUnits.filter((entry) => entry.unitId !== control.unitId);
			restored.push(unit);
		}
		return restored;
	}
	//#endregion
	//#region src/keywords.js
	const STANDARD_ASCENSION = "Quando questa Unità vince un Fronte o riceve un potenziamento";
	const keywordPatternCache = /* @__PURE__ */ new Map();
	function keywordPattern(name) {
		let pattern = keywordPatternCache.get(name);
		if (!pattern) {
			pattern = new RegExp(`^${name}\\b`, "i");
			keywordPatternCache.set(name, pattern);
		}
		return pattern;
	}
	function keywordValue(keywords, name, fallback = 1) {
		const match = (keywords || []).find((keyword) => keywordPattern(name).test(keyword));
		if (!match) return 0;
		return Number(match.match(/\((\d+)\)/)?.[1] || fallback);
	}
	function hasKeyword(keywords, name) {
		return (keywords || []).some((keyword) => keywordPattern(name).test(keyword));
	}
	function equipmentGrantsAscension(unit) {
		const id = unit?.equipment?.catalogId || unit?.equipment?.id;
		return id === "set-2-084" || id === "set-2-090";
	}
	function hasAscension(unit) {
		if (!unit) return false;
		return equipmentGrantsAscension(unit) || hasKeyword(unit.keywords, "Ascensione") || /\bAscensione\b/i.test(unit.rulesText || "");
	}
	function usesStandardAscension(rulesText = "", keywords = []) {
		const text = rulesText || "";
		if (!(hasKeyword(keywords, "Ascensione") || /\bAscensione\b/i.test(text))) return false;
		if (new RegExp(`Ascensione\\s*\\((?!${STANDARD_ASCENSION})`, "i").test(text)) return false;
		if (text.includes(STANDARD_ASCENSION)) return true;
		if (/\bAscensione\s*\(/i.test(text)) return false;
		return hasKeyword(keywords, "Ascensione") || /\bAscensione\b/i.test(text);
	}
	function grantDivinityAscension(unit) {
		if (!unit || unit._ascending) return false;
		unit._ascending = true;
		unit.force = (Number.isFinite(unit.force) ? unit.force : unit.currentForce || 0) + 1;
		unit.currentForce = (unit.currentForce || 0) + 1;
		unit.keywords = unit.keywords || [];
		if (!unit.keywords.includes("Divinità")) unit.keywords.push("Divinità");
		if (!/\bDivinità\b/i.test(unit.type || "")) unit.type = unit.type ? `${unit.type} – Divinità` : "Divinità";
		unit._ascending = false;
		return true;
	}
	function applyStandardAscension(unit) {
		if (!equipmentGrantsAscension(unit) && !usesStandardAscension(unit?.rulesText, unit?.keywords)) return false;
		return grantDivinityAscension(unit);
	}
	//#endregion
	//#region src/card-effects.js
	const IMMEDIATE_TACTICS = /* @__PURE__ */ new Set([
		"set-1-063",
		"set-1-075",
		"set-2-069",
		"set-2-076",
		"set-3-059",
		"set-3-069"
	]);
	const registeredEquipmentIds = /* @__PURE__ */ new Set([
		"set-1-079",
		"set-1-080",
		"set-1-081",
		"set-1-082",
		"set-1-083",
		"set-1-084",
		"set-1-085",
		"set-1-086",
		"set-1-087",
		"set-1-088",
		"set-1-089",
		"set-1-090",
		"set-2-079",
		"set-2-080",
		"set-2-081",
		"set-2-082",
		"set-2-083",
		"set-2-084",
		"set-2-085",
		"set-2-086",
		"set-2-087",
		"set-2-088",
		"set-2-089",
		"set-2-090",
		"set-3-081",
		"set-3-082",
		"set-3-083",
		"set-3-084",
		"set-3-085",
		"set-3-086",
		"set-3-087",
		"set-3-088"
	]);
	const registeredSiteIds = /* @__PURE__ */ new Set([
		...Array.from({ length: 20 }, (_, index) => `set-1-${String(index + 91).padStart(3, "0")}`),
		...Array.from({ length: 26 }, (_, index) => `set-2-${String(index + 79).padStart(3, "0")}`),
		"set-2-108",
		...Array.from({ length: 24 }, (_, index) => `set-3-${String(index + 81).padStart(3, "0")}`),
		"set-3-107",
		"set-3-108",
		"set-3-109"
	]);
	const registeredFieldIds = /* @__PURE__ */ new Set([
		...Array.from({ length: 10 }, (_, index) => `set-1-${String(index + 111).padStart(3, "0")}`),
		...Array.from({ length: 8 }, (_, index) => `set-2-${String(index + 113).padStart(3, "0")}`),
		"set-3-112",
		...Array.from({ length: 8 }, (_, index) => `set-3-${String(index + 113).padStart(3, "0")}`)
	]);
	const registeredUnitEffectIds = /* @__PURE__ */ new Set([
		"set-1-006",
		"set-1-008",
		"set-1-009",
		"set-1-014",
		"set-1-018",
		"set-1-020",
		"set-1-022",
		"set-1-026",
		"set-1-027",
		"set-1-029",
		"set-1-030",
		"set-1-031",
		"set-1-033",
		"set-1-036",
		"set-1-037",
		"set-1-039",
		"set-1-041",
		"set-1-043",
		"set-1-044",
		"set-1-047",
		"set-1-048",
		"set-1-049",
		"set-1-051",
		"set-1-046",
		"set-1-038",
		"set-1-053",
		"set-1-054",
		"set-1-045",
		"set-1-052",
		"set-1-056",
		"set-1-055",
		"set-1-060",
		"set-1-058",
		"set-2-010",
		"set-2-014",
		"set-2-018",
		"set-2-016",
		"set-2-023",
		"set-2-009",
		"set-2-013",
		"set-2-020",
		"set-2-027",
		"set-2-029",
		"set-2-031",
		"set-2-035",
		"set-2-039",
		"set-2-040",
		"set-2-043",
		"set-2-026",
		"set-2-028",
		"set-2-049",
		"set-2-032",
		"set-2-034",
		"set-2-042",
		"set-3-001",
		"set-3-004",
		"set-3-007",
		"set-3-009",
		"set-3-012",
		"set-3-022",
		"set-3-025",
		"set-3-028",
		"set-3-032",
		"set-3-033",
		"set-3-040",
		"set-3-046",
		"set-3-016",
		"set-3-002",
		"set-3-026",
		"set-3-036",
		"set-3-014",
		"set-3-011",
		"set-3-023",
		"set-3-019",
		"set-3-006",
		"set-3-020",
		"set-3-030",
		"set-3-039",
		"set-3-035",
		"set-3-042",
		"set-3-044",
		"set-3-045",
		"set-3-047",
		"set-3-049",
		"set-3-053",
		"set-3-052",
		"set-3-051",
		"set-3-050",
		"set-3-055"
	]);
	function catalogId$1(card) {
		return card.catalogId || card.id;
	}
	function applyTemporaryForce(unit, modifier) {
		const previousForce = unit.currentForce;
		unit.currentForce = Math.max(0, previousForce + modifier);
		const appliedModifier = unit.currentForce - previousForce;
		unit.temporaryForce = (unit.temporaryForce || 0) + appliedModifier;
		if (appliedModifier < 0) unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) - appliedModifier;
		if (appliedModifier > 0) applyStandardAscension(unit);
		return appliedModifier;
	}
	function restoreTemporaryForce(unit) {
		if (!unit?.temporaryForce) return false;
		unit.currentForce = Math.max(0, unit.currentForce - unit.temporaryForce);
		unit.temporaryForce = 0;
		return unit.currentForce <= 0;
	}
	function isImmediateTacticSupported(card) {
		return card.category === "tactic" && (IMMEDIATE_TACTICS.has(catalogId$1(card)) || isRegisteredTactic(card));
	}
	function resolveImmediateTactic(card, player, opponent, choice = null, context = {}) {
		if (isRegisteredTactic(card)) return resolveRegisteredTactic(card, choice, player, opponent, context);
		if (catalogId$1(card) === "set-1-063" || catalogId$1(card) === "set-1-075") {
			let affected = 0;
			for (const front of Object.values(player.fronts)) {
				if (!front.line) continue;
				applyTemporaryForce(front.line, 1);
				affected++;
			}
			return `${card.name}: ${affected} Linee ottengono +1 Forza fino alla fine dello Scontro.`;
		}
		if (catalogId$1(card) === "set-2-069" || catalogId$1(card) === "set-2-076") {
			const modifier = catalogId$1(card) === "set-2-069" ? -1 : -2;
			let affected = 0;
			for (const front of Object.values(opponent.fronts)) {
				if (!front.line) continue;
				const applied = applyTemporaryForce(front.line, modifier);
				if (applied < 0) context.onForceLoss?.(opponent, front.line, -applied);
				affected++;
			}
			return `${card.name}: ${affected} Linee avversarie perdono ${Math.abs(modifier)} Forza fino alla fine dello Scontro.`;
		}
		if (catalogId$1(card) === "set-3-059") {
			opponent.parasites++;
			return "Infiltrazione Silente: 1 Parassita assegnato al Comandante avversario.";
		}
		if (catalogId$1(card) === "set-3-069") {
			if (opponent.parasites === 0) opponent.parasites++;
			return "Invasione Strisciante: 1 Parassita assegnato al Comandante avversario se non ne aveva.";
		}
		throw new Error(`Nessun risolutore registrato per la Tattica ${catalogId$1(card)}.`);
	}
	function getTacticChoices$1(card, player, opponent) {
		if (isRegisteredTactic(card)) return getTacticChoices$2(card, player, opponent).filter((choice) => {
			if (choice.value.owner === "opponent" && choice.value.slotName === "line") {
				const target = opponent.fronts[choice.value.frontName]?.line;
				if (isProtectedFromEnemyTactic(target, "line", card.cost)) return false;
			}
			if (card.cost > 2) return true;
			const target = choice.value.owner === "player" ? player : choice.value.owner === "opponent" ? opponent : null;
			if (!target || choice.value.slotName !== "line" || !target.sites?.some((site) => catalogId$1(site) === "set-2-091")) return true;
			return !Object.values(target.fronts).some((front) => front.supA || front.supB);
		});
		if (card.category === "tactic" && IMMEDIATE_TACTICS.has(catalogId$1(card))) return [];
		return null;
	}
	function getCardExecutionStatus(card) {
		if (card.category === "unit" && registeredUnitEffectIds.has(catalogId$1(card))) return {
			label: "Implementata",
			detail: "Abilità statica o passiva registrata e applicata dal motore."
		};
		if (card.category !== "unit") {
			if (isImmediateTacticSupported(card)) return {
				label: "Implementata",
				detail: "Effetto testuale risolto dal motore."
			};
			if (card.category === "equipment" && registeredEquipmentIds.has(catalogId$1(card))) return {
				label: "Implementata",
				detail: "Abilità statiche e trigger gestiti dal motore; gli effetti facoltativi scelgono automaticamente l’opzione legale."
			};
			if (card.category === "site" && registeredSiteIds.has(catalogId$1(card))) return {
				label: "Implementata",
				detail: "Abilità statiche, trigger e attivazioni gestiti dal motore; le scelte facoltative usano una risoluzione automatica deterministica."
			};
			if (card.category === "field" && registeredFieldIds.has(catalogId$1(card))) return {
				label: "Implementata",
				detail: "Abilità statiche e trigger gestiti dal motore; le scelte facoltative usano una risoluzione automatica deterministica."
			};
			if ([
				"equipment",
				"site",
				"field"
			].includes(card.category)) return {
				label: "Parziale",
				detail: "La carta è giocabile; alcune abilità passive o trigger possono non essere ancora risolti."
			};
			return {
				label: "Non eseguibile",
				detail: "Categoria non supportata dal motore attuale."
			};
		}
		if (/^Nessuna abilità\.?$/i.test(card.rulesText.trim())) return {
			label: "Unità base",
			detail: "Nessuna abilità testuale da risolvere."
		};
		const supportedKeywords = [
			/\bFerocia\b/giu,
			/\bAssalto\b/giu,
			/\bSorvolo\b/giu,
			/\bMente Collettiva\b/giu,
			/\bPosizione Difensiva\b/giu,
			/\bLogorare(?:\s*\(\d+\))?(?:\s*\([^)]*\))?/giu,
			/\bEco Spettrale(?:\s*\([^)]*\))?/giu,
			/\bTormento(?:\s*\(\d+\))?(?:\s*\([^)]*\))?/giu,
			/\bAscensione(?:\s*\(\d+\)|\s+\d+)?(?:\s*\(Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente \+1 Forza e il tipo Divinità\.?\))?/giu,
			/\bInfiltrazione(?:\s*\(\d+\))?(?:\s*\([^)]*\))?/giu,
			/Divinità:\s*Immune a Tattiche avversarie e distruzione da effetti\.\s*Se ridotta a 0 Forza in Scontro, viene Sigillata \(scartata\)\.?/giu
		];
		const keywordReminders = [
			/\bFerocia\s*\(Durante lo Scontro, questa Unità ottiene \+1 Forza se controlli meno Unità(?: complessive)? dell’avversario\)/giu,
			/\bAssalto\s*\(Può essere messo in posizione Linea nel turno in cui entra in gioco\)/giu,
			/\bPosizione Difensiva\s*\(Se possibile, deve essere messo in posizione Linea quando entra in gioco\)/giu,
			/\bSorvolo\s*\(Quando questa Unità viene assegnata allo Scontro, puoi spostarla in un Fronte adiacente\. Se lo fai, entra in Supporto nel nuovo Fronte\)/giu,
			/\bLogorare\s*\((\d+)\)\.?\s*\(Quando questa Unità è in Linea durante lo Scontro, la Linea avversaria nello stesso Fronte perde \1 Forza fino alla fine dello Scontro\.?\)/giu
		];
		let remainingRulesText = card.rulesText;
		for (const pattern of keywordReminders) remainingRulesText = remainingRulesText.replace(pattern, "");
		for (const pattern of supportedKeywords) remainingRulesText = remainingRulesText.replace(pattern, "");
		if (remainingRulesText.replace(/[\s.,;:()[\]-]/gu, "") === "") return {
			label: "Keyword implementata",
			detail: "Le keyword riconosciute sono gestite dal motore."
		};
		return {
			label: "Parziale",
			detail: "Il motore applica solo alcune keyword Core; gli altri effetti testuali non sono eseguiti."
		};
	}
	//#endregion
	//#region src/card-costs.js
	function catalogId(card) {
		return card?.catalogId || card?.id;
	}
	function hasSupportUnit(player, ids) {
		return [
			"left",
			"center",
			"right"
		].some((frontName) => ["supA", "supB"].some((slotName) => ids.includes(catalogId(player.fronts?.[frontName]?.[slotName]))));
	}
	function hasLineUnit(player, ids) {
		return [
			"left",
			"center",
			"right"
		].some((frontName) => ids.includes(catalogId(player.fronts?.[frontName]?.line)));
	}
	function calculateCardCost(player, card, { fromDiscard = false, turnNumber = 0, players = [player] } = {}) {
		let cost = card.cost ?? 0;
		if (card.category === "equipment") cost += card.equipCost ?? 0;
		const spectral = card.keywords?.includes("Eco Spettrale");
		if (card.category === "unit" && spectral) {
			if (player.sites?.some((site) => catalogId(site) === "set-2-081")) cost--;
			if (player.field && catalogId(player.field) === "set-2-114") cost--;
			if (player.sites?.some((site) => catalogId(site) === "set-2-096" && site.discountTurn !== turnNumber)) cost--;
		}
		if (card.category === "tactic" && card.cost === 1 && players.some((owner) => owner !== player && (catalogId(owner.field) === "set-2-117" || hasSupportUnit(owner, ["set-2-032"]) || hasLineUnit(owner, ["set-3-028"])))) cost++;
		if (card.category === "unit" && spectral && hasSupportUnit(player, ["set-2-023"])) cost--;
		return Math.max(1, cost);
	}
	function markCardCostDiscountUsed(player, card, turnNumber, fromDiscard = false) {
		if (card.category !== "unit" || !card.keywords?.includes("Eco Spettrale")) return;
		const site = player.sites?.find((candidate) => catalogId(candidate) === "set-2-096" && candidate.discountTurn !== turnNumber);
		if (!site) return;
		let costWithoutSite = card.cost ?? 0;
		if (player.sites?.some((candidate) => catalogId(candidate) === "set-2-081")) costWithoutSite--;
		if (player.field && catalogId(player.field) === "set-2-114") costWithoutSite--;
		if (Math.max(1, costWithoutSite) > Math.max(1, costWithoutSite - 1)) site.discountTurn = turnNumber;
	}
	//#endregion
	//#region src/game-rules.js
	function calculateUnitCombatStrength({ line, supportCount, supportBonusPerUnit = 1, supportBonusCap = 3, collectiveCount, fewerUnits, logorare, ferocityBonus = 1 }) {
		if (!line) return 0;
		const supportBonus = Math.min(supportBonusCap, Math.max(0, supportCount) * supportBonusPerUnit);
		const collectiveBonus = line.keywords.includes("Mente Collettiva") ? Math.min(3, Math.max(0, collectiveCount - 1)) : 0;
		const ferocity = line.keywords.includes("Ferocia") && fewerUnits ? ferocityBonus : 0;
		return Math.max(0, line.currentForce + supportBonus + collectiveBonus + ferocity - Math.max(0, logorare));
	}
	function compareCombatStrengths(left, right) {
		if (left === right) return {
			result: "tie",
			margin: 0
		};
		return left > right ? {
			result: "left-wins",
			margin: left - right
		} : {
			result: "right-wins",
			margin: right - left
		};
	}
	function shouldUseTorment({ commanderPc, madness, commanderDamage, torment }) {
		const winsWithDamage = commanderPc <= commanderDamage;
		const winsWithMadness = madness + torment >= 10;
		if (winsWithDamage || winsWithMadness) return winsWithMadness && !winsWithDamage;
		const damageProgress = commanderDamage / Math.max(1, commanderPc);
		return torment / Math.max(1, 10 - madness) > damageProgress;
	}
	function defaultPromotionSlot(front) {
		const supports = ["supA", "supB"].filter((slot) => front?.[slot]);
		if (supports.length === 0) return null;
		return supports.reduce((best, slot) => front[slot].currentForce > front[best].currentForce ? slot : best);
	}
	function checkDeployment(unit, front, slotName, { ownSites = [], opposingSites = [], ownField = null } = {}) {
		if (!front || ![
			"line",
			"supA",
			"supB"
		].includes(slotName)) return {
			legal: false,
			assaultSwap: false
		};
		const assault = unit.keywords.includes("Assalto");
		const defensive = unit.keywords.includes("Posizione Difensiva");
		const assaultSwap = slotName === "line" && assault && Boolean(front.line) && (!front.supA || !front.supB);
		if (slotName === "line" && (opposingSites.some((site) => site.catalogId === "set-1-105") || Number(unit.force) <= 3 && opposingSites.some((site) => site.catalogId === "set-2-094") || assaultSwap && !ownSites.some((site) => site.catalogId === "set-1-098") || assaultSwap && opposingSites.some((site) => site.catalogId === "set-3-094"))) return {
			legal: false,
			assaultSwap: false
		};
		if (front[slotName] && !assaultSwap) return {
			legal: false,
			assaultSwap: false
		};
		const supportWithoutLine = ownField?.catalogId === "set-3-118";
		if (defensive && slotName !== "line" && !front.line && !supportWithoutLine) return {
			legal: false,
			assaultSwap: false
		};
		if (slotName === "line" && !assault && !(defensive && !front.line)) return {
			legal: false,
			assaultSwap: false
		};
		return {
			legal: true,
			assaultSwap
		};
	}
	//#endregion
	//#region src/data/cards.json
	var sets = [
		{
			"id": "set-1",
			"name": "Furia Giurassica",
			"cardCount": 120
		},
		{
			"id": "set-2",
			"name": "Risveglio Infernale",
			"cardCount": 120
		},
		{
			"id": "set-3",
			"name": "Invasione Silente",
			"cardCount": 120
		},
		{
			"id": "set-4",
			"name": "Ascesa Divina",
			"cardCount": 120
		}
	];
	var cards = [
		{
			"id": "set-1-001",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 1,
			"name": "Cucciolo Artigliofendente",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ferocia (Durante lo Scontro, questa Unità ottiene +1 Forza se controlli meno Unità complessive dell’avversario).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-002",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 2,
			"name": "Raptor Impetuoso",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Assalto (Può essere messo in posizione Linea nel turno in cui entra in gioco).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-003",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 3,
			"name": "Cucciolo Guardiano",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva (Se possibile, deve essere messo in posizione Linea quando entra in gioco).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-004",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 4,
			"name": "Pterodattilo Rasoterra",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Pterosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo (Quando questa Unità viene assegnata allo Scontro, puoi spostarla in un Fronte adiacente. Se lo fai, entra in Supporto nel nuovo Fronte).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-005",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 5,
			"name": "Predatore delle Rocce",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 3,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Nessuna abilità.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-006",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 6,
			"name": "Strisciante Cremisi",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità distrugge una Linea avversaria durante lo Scontro mentre è in Linea, infliggi 1 danno al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-007",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 7,
			"name": "Raptor Coordinato",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 3,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ferocia.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-008",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 8,
			"name": "Guardia del Branco",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in posizione Linea, ottiene +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-009",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 9,
			"name": "Portatore di Lance Raptor",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Supporto, fornisce +2 Forza alla Linea nel suo Fronte invece del normale +1.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-010",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 10,
			"name": "Cacciatore delle Dune",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 4,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Nessuna abilità.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-011",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 11,
			"name": "Bestia della Scarpata",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 3,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Assalto.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-012",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 12,
			"name": "Cucciolo della Frattura",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Pterosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-013",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 13,
			"name": "Carnotauro Giovane",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 5,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Nessuna abilità.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-014",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 14,
			"name": "Inscitatore del Branco",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Supporto, la Linea nel suo Fronte ottiene Ferocia.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-015",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 15,
			"name": "Difensore Tricerico",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva. Ottiene +1 Forza durante la fase difensiva dello Scontro.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-016",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 16,
			"name": "Raptor Cacciaflanco",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-017",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 17,
			"name": "Spezzacorna Feroce",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ferocia.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-018",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 18,
			"name": "Fauce Incandescente",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Linea e vince il suo Fronte durante lo Scontro, infliggi 1 danno aggiuntivo al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-019",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 19,
			"name": "Alfa del Branco Cremisi",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le altre Unità Raptor che controlli ottengono Ferocia mentre si trovano in posizione Linea.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-020",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 20,
			"name": "Custode delle Uova Fiammeggianti",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "I Supporti nel suo Fronte forniscono +2 Forza alla Linea invece di +1. Il totale del bonus fornito dai Supporti in quel Fronte non può superare +3.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-021",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 21,
			"name": "Raptor Coordinatore Supremo",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Supporto, all’inizio della Fase di Scontro puoi scambiare la posizione della Linea con un Supporto nello stesso Fronte.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-022",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 22,
			"name": "Cacciatore Scalatore",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Quando entra in Supporto grazie a Sorvolo, puoi infliggere 1 danno alla Linea avversaria nello stesso Fronte.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-023",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 23,
			"name": "Predatore della Savana",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 6,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Nessuna abilità.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-024",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 24,
			"name": "Cacciatore Coordinato",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se nel suo Fronte controlli due Supporti, questa Unità ottiene +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-025",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 25,
			"name": "Caricatore del Vulcano",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Assalto.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-026",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 26,
			"name": "Raptor Sincronico",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità è l’unico Supporto nel suo Fronte, fornisce +2 Forza alla Linea invece di +1.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-027",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 27,
			"name": "Guardiano del Cratere",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-028",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 28,
			"name": "Artiglio Veloce del Branco",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ferocia.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-029",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 29,
			"name": "Predatore della Cima",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Pterosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Quando questa Unità cambia Fronte grazie a Sorvolo, la Linea nel nuovo Fronte ottiene +1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-030",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 30,
			"name": "Bestia dell’Alba Rossa",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in posizione Linea, ottiene +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-031",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 31,
			"name": "Distruttore di Barricate",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in gioco, puoi distruggere un Sito con Decadenza pari a 1.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-032",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 32,
			"name": "Predatore Congiunto",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ogni volta che un tuo Supporto nello stesso Fronte viene distrutto, questa Unità ottiene +1 Forza permanente (massimo +2).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-033",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 33,
			"name": "Raptor Dominante",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ferocia. Se nel suo Fronte controlli almeno un altro Raptor, ottiene +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-034",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 34,
			"name": "Cacciatore del Territorio Ardente",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Supporto, fornisce +1 Forza addizionale alla Linea nel suo Fronte (totale +2).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-035",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 35,
			"name": "Tirano delle Pianure",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 7,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Nessuna abilità.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-036",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 36,
			"name": "Predatore di Frontiera",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se il Fronte opposto è scoperto e questa Unità vince il suo Fronte, infligge 1 danno aggiuntivo al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-037",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 37,
			"name": "Bestia della Valle Urlante",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità viene messa in Linea, distruggi un Supporto avversario nello stesso Fronte.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-038",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 38,
			"name": "Raptor del Tramonto",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 6,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Assalto.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-039",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 39,
			"name": "Artiglio Basaltico",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 6,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità distrugge una Linea avversaria mentre è in posizione Linea, infliggi 1 danno aggiuntivo al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-040",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 40,
			"name": "Bruto Scagliapietre",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 6,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Linea e controlli almeno un Supporto nel suo Fronte, riduce di 1 tutti i danni che subisce.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-041",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 41,
			"name": "Predatore della Frattura Rossa",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Assalto. Quando entra in Linea, puoi distruggere un Supporto avversario con Forza 2 o inferiore nello stesso Fronte.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-042",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 42,
			"name": "Alfa della Frattura",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se controlli una Linea in almeno due Fronti, questa Unità ottiene +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-043",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 43,
			"name": "Raptor Spezzaline",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità vince il suo Fronte mentre si trova in posizione Linea, distruggi un Supporto avversario nello stesso Fronte.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-044",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 44,
			"name": "Matriarca del Branco Rosso",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Durante lo Scontro, ogni tuo Fronte che controlla una Linea ottiene +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-045",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 45,
			"name": "Predatore della Frattura Antica",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 6,
			"type": "Pterosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Quando questa Unità entra in Supporto tramite Sorvolo, la Linea nel suo Fronte ottiene +1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-046",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 46,
			"name": "Comandante del Branco Feroce",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "I Supporti nei tuoi Fronti forniscono +2 Forza invece di +1. Il totale del bonus da Supporti in ciascun Fronte non può superare +3.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-047",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 47,
			"name": "Carnefice Primordiale",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ferocia. Se controlli meno Unità dell’avversario, questa Unità ottiene +2 Forza invece di +1 durante lo Scontro.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-048",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 48,
			"name": "Tirannosauro Furia Primordiale",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 7,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ferocia. Quando questa Unità distrugge una Linea avversaria mentre si trova in Linea, infliggi 1 danno aggiuntivo al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-049",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 49,
			"name": "Rex Dominatore Territoriale",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Linea e vince il suo Fronte durante lo Scontro, infliggi 1 danno aggiuntivo al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-050",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 50,
			"name": "Raptor da Guerra Antico",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 7,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Assalto. Questa Unità non può essere messa in Supporto.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-051",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 51,
			"name": "Predatore del Cuore Vulcanico",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità distrugge una Linea avversaria durante lo Scontro, ottiene +2 Forza fino alla fine del turno.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-052",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 52,
			"name": "Bestia della Prima Era",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Linea, non può essere bersaglio di Tattiche avversarie.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-053",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 53,
			"name": "Dominatore della Savana Cremisi",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 8,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se controlli almeno una Linea in ogni Fronte, questa Unità ottiene +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-054",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 54,
			"name": "Tiranno delle Tre Frontiere",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se controlli una Linea in tutti e tre i Fronti, questa Unità ottiene +2 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-055",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 55,
			"name": "Tempesta Cremisi Vivente",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "La prima volta ogni turno che vinci un Fronte, infliggi 1 danno aggiuntivo al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-056",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 56,
			"name": "Sciame Raptor Primordiale",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 6,
			"type": "Raptor",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se nel suo Fronte controlli due Supporti, questa Unità ottiene +3 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-057",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 57,
			"name": "Giganotosauro Frantumamondo",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 9,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità distrugge una Linea avversaria mentre è in Linea, infliggi 2 danni aggiuntivi al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-058",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 58,
			"name": "Colosso Giurassico Inarrestabile",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 9,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Linea, non può essere distrutta da effetti. Può comunque subire danno normalmente durante lo Scontro.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-059",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 59,
			"name": "Apex della Prima Era",
			"category": "unit",
			"rarity": null,
			"cost": 10,
			"force": 10,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ferocia. Questa Unità non può essere messa in Supporto.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-060",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 60,
			"name": "Signore della Furia Giurassica",
			"category": "unit",
			"rarity": null,
			"cost": 10,
			"force": 9,
			"type": "Dinosauro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se vinci almeno due Fronti nello stesso turno, infliggi 3 danni aggiuntivi al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-061",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 61,
			"name": "Scatto Predatorio",
			"category": "tactic",
			"rarity": null,
			"cost": 1,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Scegli una tua Unità in Linea. Ottiene +2 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-062",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 62,
			"name": "Istinto di Sopravvivenza",
			"category": "tactic",
			"rarity": null,
			"cost": 1,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una tua Linea riduce di 2 il prossimo danno che subirebbe in questo turno.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-063",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 63,
			"name": "Calpestata Brutale",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infliggi 2 danni a una Linea avversaria.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-064",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 64,
			"name": "Ruggito del Branco",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Fino alla fine dello Scontro, tutte le tue Unità in Linea ottengono +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-065",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 65,
			"name": "Spinta Brutale",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sposta un tuo Supporto in un Fronte adiacente. Se nel nuovo Fronte non è presente una Linea, puoi metterlo in Linea.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-066",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 66,
			"name": "Sfondamento",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se la tua Linea ha Forza superiore alla Linea avversaria nello stesso Fronte, infliggi 1 danno aggiuntivo al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-067",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 67,
			"name": "Frenesia del Ferito",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una tua Linea ottiene +1 Forza per ogni danno che ha subito in questo turno.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-068",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 68,
			"name": "Sacrificio Impietoso",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sacrifica una tua Unità. Infliggi danno al Comandante avversario pari alla Forza dell’Unità sacrificata (massimo 5).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-069",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 69,
			"name": "Carica Improvvisa",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una tua Unità con Ferocia ottiene Assalto fino alla fine del turno.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-070",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 70,
			"name": "Furia del Branco",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Scarta una carta. Una tua Linea ottiene +X Forza fino alla fine dello Scontro, dove X è il numero di Unità che controlli (massimo +4).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-071",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 71,
			"name": "Duello Territoriale",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Scegli una tua Linea e una Linea avversaria nello stesso Fronte. Entrambe infliggono danno all’altra pari alla propria Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-072",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 72,
			"name": "Sovraccarico Primordiale",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Fino alla fine dello Scontro, i tuoi Supporti forniscono +2 Forza invece di +1 (il totale massimo per Fronte rimane +3).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-073",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 73,
			"name": "Caccia Coordinata",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Distruggi un Supporto avversario nello stesso Fronte in cui controlli una Linea.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-074",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 74,
			"name": "Frattura Territoriale",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Profana un Sito bersaglio (metti un segnalino Rovina; se ne ha 2, distruggilo).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-075",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 75,
			"name": "Ultima Carica",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Solo le tue Unità in Linea ottengono Assalto fino alla fine del turno. Alla fine della Fase di Scontro, sacrificale.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-076",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 76,
			"name": "Furia Ancestrale",
			"category": "tactic",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tutte le tue Linee ottengono +1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-077",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 77,
			"name": "Impatto Estintore",
			"category": "tactic",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sacrifica una tua Linea con Forza 7 o superiore. Distruggi tutte le Unità nel Fronte avversario corrispondente.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-078",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 78,
			"name": "Ruggito della Fine dei Tempi",
			"category": "tactic",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Raddoppia la differenza di danno inflitta nel Fronte Centrale in questo turno.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-079",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 79,
			"name": "Artigli di Ossidiana",
			"category": "equipment",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-080",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 80,
			"name": "Scaglie Rinforzate",
			"category": "equipment",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata riduce di 1 tutti i danni subiti.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-081",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 81,
			"name": "Corno del Branco",
			"category": "equipment",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "Se l’Unità equipaggiata è in Supporto, fornisce +1 Forza addizionale alla Linea (totale +2).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-082",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 82,
			"name": "Zanne Ardenti",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "Se l’Unità equipaggiata è in Linea, ottiene +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-083",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 83,
			"name": "Coda Frantumatrice",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene Ferocia.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-084",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 84,
			"name": "Ali della Furia",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene Sorvolo.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-085",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 85,
			"name": "Cristallo della Ferocia",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene +1 Forza per ogni altro Fronte in cui controlli una Linea.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-086",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 86,
			"name": "Mascelle della Predazione",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene +2 Forza. Quando distrugge una Linea, infliggi 1 danno aggiuntivo.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-087",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 87,
			"name": "Armatura Primordiale",
			"category": "equipment",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata riduce di 2 tutti i danni subiti.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-088",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 88,
			"name": "Spine della Rovina",
			"category": "equipment",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "Quando l’Unità equipaggiata subisce danno durante lo Scontro, infliggi 1 danno alla Linea avversaria nello stesso Fronte.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-089",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 89,
			"name": "Corona del Tiranno Cremisi",
			"category": "equipment",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene +1 Forza per ogni Supporto nel suo Fronte (massimo +2).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-090",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 90,
			"name": "Cuore della Furia Primigenia",
			"category": "equipment",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": 3,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene +2 Forza e Ferocia.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-091",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 91,
			"name": "Rovine Antiche",
			"category": "site",
			"rarity": null,
			"cost": 1,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "Quando entra in gioco, pesca 1 carta.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-092",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 92,
			"name": "Tana del Branco",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "All’inizio del tuo turno, una tua Linea ottiene +1 Forza fino alla fine del turno.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-093",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 93,
			"name": "Scogliera della Caccia",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "Quando una tua Unità viene messa in posizione Linea, pesca 1 carta. Poi distruggi questo Sito.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-094",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 94,
			"name": "Nido delle Uova Infuocate",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "Quando l’ultimo segnalino Decadenza viene rimosso, crea una pedina Raptor 2 Forza in un Fronte a tua scelta.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-095",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 95,
			"name": "Passo della Frattura",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Assalto possono sostituire la Linea esistente entrando in Linea.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-096",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 96,
			"name": "Pozza di Catrame Ardente",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 5,
			"health": null,
			"rulesText": "All’inizio del tuo turno, una Linea avversaria perde 1 Forza fino alla fine del turno.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-097",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 97,
			"name": "Savana delle Ceneri",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Ferocia ottengono +1 Forza durante lo Scontro.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-098",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 98,
			"name": "Cratere Vulcanico",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "Quando una tua Unità viene distrutta durante lo Scontro, infliggi 1 danno a una Linea avversaria.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-099",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 99,
			"name": "Sentiero dei Predatori",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Sorvolo possono entrare in Linea quando cambiano Fronte.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-100",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 100,
			"name": "Altare del Sacrificio Rosso",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sacrifica una tua Unità: la tua Linea nel suo Fronte ottiene +2 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-101",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 101,
			"name": "Arena del Duello",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All’inizio della Fase di Scontro, una Linea avversaria perde 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-102",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 102,
			"name": "Tempio della Furia Antica",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Linee con Forza 5 o superiore hanno Ferocia.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-103",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 103,
			"name": "Giungla Primordiale",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "I tuoi Supporti forniscono +1 Forza addizionale (massimo +3 totale).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-104",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 104,
			"name": "Fortezza del Branco",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Linee riducono di 1 tutti i danni subiti.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-105",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 105,
			"name": "Vallata del Terrore Primordiale",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le Unità avversarie entrano in Supporto solo nel turno in cui entrano in gioco.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-106",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 106,
			"name": "Monte della Furia Eterna",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una volta per turno, quando una tua Linea distrugge una Linea avversaria, infliggi 1 danno aggiuntivo.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-107",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 107,
			"name": "Santuario del Branco Supremo",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "I tuoi Raptor in Supporto forniscono +2 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-108",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 108,
			"name": "Conclave delle Bestie Antiche",
			"category": "site",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All’inizio del tuo turno puoi cercare una carta Raptor nel tuo mazzo e metterla in cima.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-109",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 109,
			"name": "Cuore della Terra Primordiale",
			"category": "site",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Linee ottengono +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-110",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 110,
			"name": "Fornace della Fine del Mondo",
			"category": "site",
			"rarity": null,
			"cost": 8,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "All’inizio del turno di ogni giocatore, quel giocatore sacrifica una Unità.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-111",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 111,
			"name": "Pianure della Caccia Eterna",
			"category": "field",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Forza 4 o superiore hanno Ferocia.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-112",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 112,
			"name": "Giungla dell’Agguato",
			"category": "field",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se controlli meno Unità dell’avversario, le tue Unità entrano con Assalto.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-113",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 113,
			"name": "Savana della Dominanza",
			"category": "field",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se controlli più Unità dell’avversario, le tue Linee ottengono +1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-114",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 114,
			"name": "Vulcano della Furia",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando una tua Linea distrugge una Linea avversaria, pesca 1 carta.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-115",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 115,
			"name": "Terre della Ferocia Primigenia",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ferocia fornisce +2 Forza invece di +1.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-116",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 116,
			"name": "Canyon della Caccia Finale",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando un Fronte avversario diventa scoperto, infliggi 1 danno al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-117",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 117,
			"name": "Regno del Tiranno",
			"category": "field",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "La tua Linea con la Forza più alta non può essere bersaglio di Tattiche avversarie.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-118",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 118,
			"name": "Dominio del Primo Predatore",
			"category": "field",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Linee ottengono +1 Forza. Le Linee avversarie perdono 1 Forza.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-119",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 119,
			"name": "Era della Furia Suprema",
			"category": "field",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se vinci almeno due Fronti nello stesso turno, infliggi 1 danno aggiuntivo al Comandante avversario.",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-1-120",
			"setId": "set-1",
			"setName": "Furia Giurassica",
			"number": 120,
			"name": "Kragor, Signore della Furia Vulcanica",
			"category": "commander",
			"rarity": null,
			"cost": null,
			"force": null,
			"type": "Comandante – Dinosauro Primordiale",
			"equipCost": null,
			"decay": null,
			"health": 20,
			"rulesText": "Abilità Passiva – Istinto del Branco: Se controlli meno Unità dell'avversario, le tue Unità in Linea ottengono +1 Forza durante la Fase di Scontro. Abilità Attiva (Costo 2): Scegli un tuo Fronte. Fino alla fine del turno, l'Unità in Linea in quel Fronte ottiene Ferocia (se l'ha già, ottiene +1 Forza aggiuntiva).",
			"sourceFile": "set_1_furia_giurassica.md"
		},
		{
			"id": "set-2-001",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 1,
			"name": "Lurker delle Ombre",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Logorare (Quando combatte in Linea, infligge 1 danno continuo alla Linea avversaria all'inizio di ogni Scontro).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-002",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 2,
			"name": "Spettro Inquieto",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Eco Spettrale (Quando questa Unità viene distrutta, puoi pagarla per rimetterla in Supporto con Forza 1).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-003",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 3,
			"name": "Accolito del Tormento",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Cultista",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (All'inizio del turno, se è in Linea, il Comandante avversario subisce 1 danno).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-004",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 4,
			"name": "Anima Dannata",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 1,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in gioco, un'Unità avversaria perde 1 Forza fino alla fine del turno.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-005",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 5,
			"name": "Gargoyle Infernale",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 3,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-006",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 6,
			"name": "Imp Sghignazzante",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Assalto. Tormento.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-007",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 7,
			"name": "Guardiano delle Anime",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 3,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-008",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 8,
			"name": "Evocatore Infernale",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Cultista",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Supporto, fornisce +2 Forza alla Linea nel suo Fronte.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-009",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 9,
			"name": "Ombra Vagante",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 3,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Eco Spettrale.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-010",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 10,
			"name": "Segugio dell'Abisso",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 4,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Nessuna abilità.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-011",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 11,
			"name": "Guglia Vivente",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva. Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-012",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 12,
			"name": "Mietitore di Anime",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 3,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-013",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 13,
			"name": "Cavalliere della Morte",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Assalto.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-014",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 14,
			"name": "Torturatore Infernale",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento. Quando entra in Linea, infliggi 1 danno a una Linea avversaria.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-015",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 15,
			"name": "Behemoth di Cenere",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 5,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Nessuna abilità.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-016",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 16,
			"name": "Spettro della Disperazione",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Eco Spettrale.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-017",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 17,
			"name": "Cavaliere delle Ombre",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-018",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 18,
			"name": "Sacerdote del Tormento",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Cultista",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-019",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 19,
			"name": "Signore delle Catene",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in gioco, blocca il movimento dell'Unità in Linea avversaria nello stesso Fronte fino al prossimo turno.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-020",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 20,
			"name": "Guardiano del Baratro",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva. Riduce di 1 i danni subiti.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-021",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 21,
			"name": "Famiglio Spettrale",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 2,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità si trova in Supporto, la Linea nel suo Fronte ottiene Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-022",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 22,
			"name": "Demone Corrotto",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-023",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 23,
			"name": "Distruttore dell'Abisso",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 6,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Nessuna abilità.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-024",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 24,
			"name": "Banshee della Rovina",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Eco Spettrale. Quando entra in gioco, le Unità in Linea avversarie perdono 1 Forza in tutti i Fronti fino alla fine del turno.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-025",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 25,
			"name": "Carnefice Infernale",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Assalto. Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-026",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 26,
			"name": "Sentinella delle Tenebre",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva. Tormento.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-027",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 27,
			"name": "Tessitore di Pile",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Cultista",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-028",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 28,
			"name": "Signore del Tormento",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento. All'inizio del tuo turno, sceglie una Linea avversaria e le riduce la Forza di 1 fino alla fine del turno.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-029",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 29,
			"name": "Spettro della Vendetta",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando viene distrutta durante lo Scontro, infliggi 2 danni al Comandante avversario.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-030",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 30,
			"name": "Demone Sanguinario",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-031",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 31,
			"name": "Veneratore dell'Erebo",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Cultista",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in gioco, puoi rimettere una carta Tattica dal cimitero in cima al mazzo.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-032",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 32,
			"name": "Gorgone delle Tenebre",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le Unità avversarie nello stesso Fronte perdono 1 Forza.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-033",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 33,
			"name": "Colosso Necrotico",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-034",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 34,
			"name": "Inquisitore dell'Abisso",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità vince il suo Fronte, distruggi un Supporto avversario.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-035",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 35,
			"name": "Tiranno Abissale",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 7,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Nessuna abilità.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-036",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 36,
			"name": "Arconte del Dolore",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento. Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-037",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 37,
			"name": "Spettro della Scomparsa",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 6,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Eco Spettrale. Assalto.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-038",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 38,
			"name": "Demone Giudice",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-039",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 39,
			"name": "Guardiano delle Anime Dannate",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 6,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva. Riduce di 1 tutti i danni subiti.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-040",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 40,
			"name": "Signore delle Piaghe",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Logorare. Quando entra in gioco, infliggi 1 danno a tutte le Linee avversarie.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-041",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 41,
			"name": "Incubo Vivente",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 6,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-042",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 42,
			"name": "Devastatore di Anime",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità distrugge una Linea avversaria, rimuovi dal gioco fino a 2 carte dal cimitero avversario.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-043",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 43,
			"name": "Sottomettitore Infernale",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se controlli più Unità dell'avversario, le tue Unità ottengono +1 Forza.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-044",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 44,
			"name": "Anima Reclamata",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 6,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Eco Spettrale.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-045",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 45,
			"name": "Bestia della Voragine",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 6,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-046",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 46,
			"name": "Cultista dell'Ascensione",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Cultista",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-047",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 47,
			"name": "Generale dell'Abisso",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento. Tutte le tue altre Unità ottengono +1 Forza.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-048",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 48,
			"name": "Spettro della Mietitura",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 7,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Eco Spettrale. Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-049",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 49,
			"name": "Demone della Desolazione",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 7,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-050",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 50,
			"name": "Signore delle Tenebre Eterne",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento. Infliggi 2 danni al Comandante avversario all'inizio della tua Fase di Scontro.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-051",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 51,
			"name": "Leviatano Infernale",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 8,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Logorare. Se si trova in Linea, riduce i danni subiti di 1.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-052",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 52,
			"name": "Re degli Spettri",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Eco Spettrale. Quando rientra in gioco, distruggi un Supporto avversario.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-053",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 53,
			"name": "Avatar del Tormento",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento. Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-054",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 54,
			"name": "Gorgone Primordiale dell'Abisso",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 8,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in gioco, un'Unità in Linea avversaria perde 3 Forza fino alla fine del turno.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-055",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 55,
			"name": "Colosso della Rovina Infernale",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 9,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Logorare. Quando distrugge una Linea avversaria, infliggi 2 danni al Comandante nemico.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-056",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 56,
			"name": "SoVRANO DELL'EREBO",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 8,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Tutte le Unità avversarie perdono 1 Forza e le tue ottengono +1 Forza. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-057",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 57,
			"name": "Abisso Incarnato",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 9,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Non può essere distrutto da Tattiche o effetti di carte.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-058",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 58,
			"name": "Spettro dell'Apocalisse",
			"category": "unit",
			"rarity": null,
			"cost": 10,
			"force": 8,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Eco Spettrale. Assalto. Quando entra in gioco, distruggi tutte le Unità in Supporto avversarie.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-059",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 59,
			"name": "Demone Primo Supremo",
			"category": "unit",
			"rarity": null,
			"cost": 10,
			"force": 10,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento. Logorare. Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-060",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 60,
			"name": "Monarca del Risveglio Infernale",
			"category": "unit",
			"rarity": null,
			"cost": 10,
			"force": 9,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se vinci almeno due Fronti nello stesso turno, infliggi 4 danni al Comandante avversario.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-061",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 61,
			"name": "Soffio dell'Abisso",
			"category": "tactic",
			"rarity": null,
			"cost": 1,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Scegli un'Unità in Linea. Perde 2 Forza fino alla fine del turno.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-062",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 62,
			"name": "Richiamo dalle Tenebre",
			"category": "tactic",
			"rarity": null,
			"cost": 1,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Metti la prima carta dal tuo mazzo nel cimitero. Pesca 1 carta.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-063",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 63,
			"name": "Catene del Tormento",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infliggi Tormento a un'Unità avversaria (subisce 1 danno all'inizio di ogni turno per 2 turni).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-064",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 64,
			"name": "Maledizione Necrotica",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Riduci di 2 la Forza di un'Unità avversaria in Linea fino alla fine dello Scontro.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-065",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 65,
			"name": "Rito del Sacrificio Spettrale",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sacrifica una tua Unità. Pesca 2 carte.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-066",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 66,
			"name": "Ondata di Disperazione",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tutte le Linee avversarie perdono 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-067",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 67,
			"name": "Ascesa degli Spettri",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Evoca una pedina Spettro 2 Forza in posizione Supporto in un Fronte a tua scelta.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-068",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 68,
			"name": "Patto Infernale",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Subisci 2 danni al Comandante. Pesca 3 carte.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-069",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 69,
			"name": "Tenebre Soffocanti",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Distruggi un Supporto avversario. Se controlli un'Unità che ha subito Ascensione, infliggi anche 1 danno al Comandante avversario.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-070",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 70,
			"name": "Mietitura delle Anime",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Distruggi un'Unità danneggiata.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-071",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 71,
			"name": "Vendetta dell'Erebo",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Scegli un'Unità nel tuo cimitero con Eco Spettrale e rimettila in gioco in Supporto gratuitamente.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-072",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 72,
			"name": "Gelo Infernale",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Scegli una Linea avversaria. Non può essere mossa o attivare abilità in questo turno.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-073",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 73,
			"name": "Peste dell'Abisso",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infliggi 2 danni a tutte le Unità in gioco.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-074",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 74,
			"name": "Giudizio del Tormento",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infliggi danni al Comandante avversario pari al numero di carte con Tormento che controlli (massimo 4).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-075",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 75,
			"name": "Risveglio dei Dannati",
			"category": "tactic",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Rimetti in gioco una tua Unità dal cimitero con costo 5 o inferiore in posizione Linea.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-076",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 76,
			"name": "Rovina Infernale",
			"category": "tactic",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Profana fino a due Siti avversari.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-077",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 77,
			"name": "Apocalisse Oscura",
			"category": "tactic",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sacrifica la tua Linea. Distruggi l'intero Fronte avversario corrispondente.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-078",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 78,
			"name": "Rito dell'Ascensione Suprema",
			"category": "tactic",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità in gioco subiscono Ascensione: ottengono permanentemente +1 Forza e il tipo Divinità. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-079",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 79,
			"name": "Lama del Tormento",
			"category": "equipment",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +1 Forza e Tormento.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-080",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 80,
			"name": "Scudo Necrotico",
			"category": "equipment",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata riduce di 1 i danni subiti ed ottiene Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-081",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 81,
			"name": "Anello delle Ombre",
			"category": "equipment",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "Se l'Unità è in Supporto, fornisce +1 Forza extra ed Eco Spettrale.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-082",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 82,
			"name": "Mantello della Disperazione",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +1 Forza. Le Unità avversarie nello stesso Fronte perdono 1 Forza.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-083",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 83,
			"name": "Falce del Mietitore",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +2 Forza e Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-084",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 84,
			"name": "Amuleto dell'Ascensione",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-085",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 85,
			"name": "Elmo Infernale",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +1 Forza e Posizione Difensiva.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-086",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 86,
			"name": "Corazza delle Anime Dannate",
			"category": "equipment",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +2 Forza e riduce i danni subiti di 2.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-087",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 87,
			"name": "Sintesi Abissale",
			"category": "equipment",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +2 Forza. Ogni volta che distrugge un'Unità, pesca 1 carta.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-088",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 88,
			"name": "Spada dell'Erebo",
			"category": "equipment",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +3 Forza.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-089",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 89,
			"name": "Corona del Re Spettrale",
			"category": "equipment",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +2 Forza, Tormento ed Eco Spettrale.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-090",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 90,
			"name": "Sigillo del Risveglio Infernale",
			"category": "equipment",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": 3,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +3 Forza, Logorare e Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-091",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 91,
			"name": "Tomba Profanata",
			"category": "site",
			"rarity": null,
			"cost": 1,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "All'entrata in gioco, metti le prime 2 carte del tuo mazzo nel cimitero.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-092",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 92,
			"name": "Altare del Sacrificio Oscuro",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "All'inizio del turno, puoi sacrificare una tua Unità per pescare 1 carta.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-093",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 93,
			"name": "Cripta delle Anime",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "Quando un'Unità viene distrutta, metti 1 segnalino Anima. Rimuovi 3 segnalini per pescare 1 carta.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-094",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 94,
			"name": "Portale dell'Abisso",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "Le tue Unità con Eco Spettrale costano 1 risorsa in meno per rientrare dal cimitero.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-095",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 95,
			"name": "Guglia del Tormento",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "I tuoi effetti Tormento infliggono +1 danno extra al Comandante avversario.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-096",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 96,
			"name": "Cimitero Maledetto",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 5,
			"health": null,
			"rulesText": "All'inizio del tuo turno, riduci di 1 la Forza di un'Unità avversaria.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-097",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 97,
			"name": "Fossa dei Dannati",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Logorare ottengono +1 Forza in Linea.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-098",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 98,
			"name": "Baratro Infernale",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "Quando una tua Unità muore, infliggi 1 danno al Comandante avversario.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-099",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 99,
			"name": "Santuario dell'Erebo",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando una tua Unità vince un Fronte, subisce Ascensione.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-100",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 100,
			"name": "Ncrospira Oscura",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sacrifica un Supporto: la tua Linea ottiene +2 Forza in questo turno.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-101",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 101,
			"name": "Catacombe del Terrore",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All'inizio della Fase di Scontro, infliggi 1 danno alla Linea avversaria più debole.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-102",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 102,
			"name": "Tempio del Tormento Eterno",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Tormento ottengono +1 Forza.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-103",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 103,
			"name": "Fortezza delle Ombre",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Linee riducono di 1 i danni subiti.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-104",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 104,
			"name": "Rovine Necrotiche",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità in Supporto forniscono +1 Forza extra alla Linea.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-105",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 105,
			"name": "Valle delle Anime Perdute",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le Unità avversarie non possono recuperare Forza o essere curate.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-106",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 106,
			"name": "Guglia dell'Ascensione",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le Unità che hanno subito Ascensione ottengono +1 Forza.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-107",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 107,
			"name": "Santuario del Demone Primo",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "I Demoni che controlli in Linea ottengono Logorare.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-108",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 108,
			"name": "Mausoleo Reale Spettrale",
			"category": "site",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All'inizio del tuo turno, puoi rimettere un'Unità con Eco Spettrale dal cimitero alla tua mano.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-109",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 109,
			"name": "Cuore dell'Abisso Infernale",
			"category": "site",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tutte le tue Linee ottengono +1 Forza e Tormento.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-110",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 110,
			"name": "Fornace delle Anime Dannate",
			"category": "site",
			"rarity": null,
			"cost": 8,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "All'inizio del turno di ogni giocatore, quel giocatore deve mettere 1 Unità dal campo al cimitero.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-111",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 111,
			"name": "Pianure della Desolazione",
			"category": "field",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Logorare hanno +1 Forza.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-112",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 112,
			"name": "Dominio dell'Erebo",
			"category": "field",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se hai almeno 4 carte nel cimitero, le tue Unità entrano in gioco con +1 Forza.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-113",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 113,
			"name": "Savana delle Tenebre",
			"category": "field",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se controlli più Unità dell'avversario, le tue Unità con Tormento infliggono +1 danno.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-114",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 114,
			"name": "Abisso del Terrore",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando una tua Linea distrugge una Linea avversaria, metti le prime 2 carte del mazzo avversario nel suo cimitero.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-115",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 115,
			"name": "Terre dell'Ascensione Infernale",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Riduce di 2 il costo delle abilità attivabili dal cimitero.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-116",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 116,
			"name": "Canyon dei Tormenti Eterni",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All'inizio della Fase di Scontro, infliggi 1 danno al Comandante nemico per ogni Fronte scoperto.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-117",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 117,
			"name": "Regno del Re Spettrale",
			"category": "field",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Eco Spettrale ottengono +1 Forza quando rientrano dal cimitero.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-118",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 118,
			"name": "Dominio dell'Arconte Abissale",
			"category": "field",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Linee ottengono +1 Forza. Le Linee avversarie perdono 1 Forza.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-119",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 119,
			"name": "Era del Risveglio Infernale",
			"category": "field",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se vinci due Fronti nello stesso turno, evoca una pedina Demone 4 Forza con Tormento in un Fronte a tua scelta.",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-2-120",
			"setId": "set-2",
			"setName": "Risveglio Infernale",
			"number": 120,
			"name": "Malakor, Arconte del Tormento",
			"category": "commander",
			"rarity": null,
			"cost": null,
			"force": null,
			"type": "Comandante – Demone Abissale",
			"equipCost": null,
			"decay": null,
			"health": 20,
			"rulesText": "Abilità Passiva – Maledizione dell'Erebo: Ogni volta che un'effetto Tormento infligge danno al Comandante avversario, pesca 1 carta se controlli almeno un'Unità in Linea. Abilità Attiva (Costo 2): Scegli una tua Unità in Linea. Per questo turno ottiene Logorare (se ce l'ha già, la Linea avversaria nello stesso Fronte perde 1 Forza fino alla fine dello Scontro).",
			"sourceFile": "set_2_risveglio_infernale.md"
		},
		{
			"id": "set-3-001",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 1,
			"name": "Neomorfo Esploratore",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva (Questa Unità ottiene +1 Forza per ogni altra Unità con Mente Collettiva nel suo Fronte, massimo +3).",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-002",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 2,
			"name": "Larva Infiltratrice",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 1,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in gioco, metti 1 segnalino Parassita sul Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-003",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 3,
			"name": "Grigio Osservatore",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in Supporto, puoi guardare la mano di un avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-004",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 4,
			"name": "Cacciatore Yautja",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Cacciatore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità distrugge una Linea avversaria mentre è in Linea, puoi spostare un Supporto avversario in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-005",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 5,
			"name": "Sentinella Fluttuante",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Drone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-006",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 6,
			"name": "Corrosore Acido",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Orrore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità viene distrutta mentre è in Linea, infligge 1 danno alla Linea avversaria nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-007",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 7,
			"name": "Fauce Strisciante",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 3,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità attacca una Linea che ha perso Forza in questo turno, ottiene +1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-008",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 8,
			"name": "Spora Parassitaria",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 1,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità è in Supporto e il Comandante avversario ha almeno 1 segnalino Parassita, quel Comandante perde 1 Punto Comando all’inizio del suo turno.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-009",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 9,
			"name": "Drone Coordinatore",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Drone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità è in Supporto, fornisce +1 Forza addizionale alla Linea nel suo Fronte (totale +2).",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-010",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 10,
			"name": "Assalitore Silente",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Quando questa Unità entra in Supporto tramite Sorvolo, puoi spostare un Supporto avversario nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-011",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 11,
			"name": "Psionico Inquietante",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in Linea, una Linea avversaria nello stesso Fronte perde 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-012",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 12,
			"name": "Predatore Infiltrato",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Cacciatore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se il Comandante avversario ha almeno 1 segnalino Parassita, questa Unità ottiene +1 Forza.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-013",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 13,
			"name": "Custode della Covata",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-014",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 14,
			"name": "Infestatore Minore",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Parassita",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in gioco, metti 1 segnalino Parassita sul Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-015",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 15,
			"name": "Esploratore dell’Abisso Stellare",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-016",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 16,
			"name": "Dominatore Minore",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità distrugge una Linea avversaria mentre è in Linea, pesca 1 carta.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-017",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 17,
			"name": "Artiglio dell’Ombra",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-018",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 18,
			"name": "Inseguitore Silenzioso",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 3,
			"type": "Cacciatore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in Supporto, puoi spostare la tua Linea in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-019",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 19,
			"name": "Vigile del Monolito",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Costrutto",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva. Se questa Unità è in Linea, la Linea avversaria nello stesso Fronte perde 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-020",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 20,
			"name": "Sciame Sibilante",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in gioco, crea una pedina Sciame con Forza 1 in Supporto nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-021",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 21,
			"name": "Manipolatore del Velo",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Puoi scambiare la posizione di due Supporti nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-022",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 22,
			"name": "Predatore delle Ombre",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Cacciatore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se controlli meno Unità dell’avversario, questa Unità ottiene +1 Forza.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-023",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 23,
			"name": "Rasoio Mentale",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in Supporto, una Linea avversaria nello stesso Fronte perde 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-024",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 24,
			"name": "Occhio della Mente Collettiva",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-025",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 25,
			"name": "Capo Sciame Zergoid",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. Le altre Unità con Mente Collettiva nel suo Fronte ottengono +1 Forza.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-026",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 26,
			"name": "Infestatore Silente",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Parassita",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità distrugge una Linea avversaria mentre è in Linea, puoi mettere 1 segnalino Parassita sul Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-027",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 27,
			"name": "Analista Psionico",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una volta per turno, quando una tua Unità con Mente Collettiva ottiene Forza, puoi pescare 1 carta.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-028",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 28,
			"name": "Guardiano del Monolito",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Costrutto",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva. Se questa Unità è in Linea, le Tattiche con costo 1 controllate dall’avversario costano 1 Dominio in più.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-029",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 29,
			"name": "Famelico delle Stelle",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Orrore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando entra in gioco, puoi esiliare una carta da uno scarto qualsiasi.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-030",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 30,
			"name": "Regina della Covata",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. Quando entra in gioco, crea una pedina Sciame con Forza 2 in Supporto nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-031",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 31,
			"name": "Dominatore Psionico",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando entra in Linea, puoi prendere il controllo di un Supporto avversario nello stesso Fronte fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-032",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 32,
			"name": "Bruto Pretoriano",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Cacciatore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità è in Linea, riduce di 1 tutti i danni che subisce. Non può essere bersaglio di Tattiche con costo 1.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-033",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 33,
			"name": "Sciame Coordinato",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. Se nel suo Fronte controlli almeno un altro Sciame, ottiene +1 Forza.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-034",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 34,
			"name": "Infiltratore Mentale",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando entra in Supporto, puoi spostare un Supporto avversario in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-035",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 35,
			"name": "Cacciatore dell’Eclissi",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Cacciatore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Se entra in Supporto tramite Sorvolo, puoi mettere 1 segnalino Parassita sul Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-036",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 36,
			"name": "Sciame Predatore",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. Quando distrugge una Linea, puoi pescare 1 carta.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-037",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 37,
			"name": "Manipolatore Supremo",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 4,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All’inizio della Fase di Scontro, puoi scambiare la posizione della tua Linea con un Supporto nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-038",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 38,
			"name": "Custode della Mente Collettiva",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. Le tue Unità con Mente Collettiva nel suo Fronte non possono essere spostate da effetti avversari.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-039",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 39,
			"name": "Matriarca Xenoforma",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. Quando questa Unità entra in Linea, crea una pedina Sciame con Forza 2 in Supporto nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-040",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 40,
			"name": "Leviatano Biomorfo",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. Se nel suo Fronte controlli due Supporti, questa Unità ottiene +2 Forza.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-041",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 41,
			"name": "Dominatore della Covata",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando entra in Linea, puoi spostare una Linea avversaria in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-042",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 42,
			"name": "Araldo del Vuoto Stellare",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Orrore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Quando entra in Supporto tramite Sorvolo, una Linea avversaria perde 2 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-043",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 43,
			"name": "Tiranno Psionico",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità entra in Linea, puoi prendere il controllo di una Linea avversaria con Forza 4 o inferiore fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-044",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 44,
			"name": "Regina delle Spore",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando entra in gioco, metti 2 segnalini Parassita sul Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-045",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 45,
			"name": "Predatore Alfa Stellare",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 7,
			"type": "Cacciatore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se distrugge una Linea mentre è in Linea, puoi distruggere un Supporto avversario nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-046",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 46,
			"name": "Architetto della Mente Collettiva",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 4,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. I Supporti nel suo Fronte forniscono +2 Forza invece di +1 (bonus totale massimo +3).",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-047",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 47,
			"name": "Cacciatore dell’Oblio",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 6,
			"type": "Cacciatore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Se distrugge una Linea, infliggi 1 danno al Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-048",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 48,
			"name": "Signore delle Ombre Silenti",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All’inizio della Fase di Scontro, puoi scambiare due Fronti controllati dallo stesso giocatore.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-049",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 49,
			"name": "L’Unico, Mente Suprema",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 8,
			"type": "Sciame Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. Quando questa Unità entra in Linea, ottiene +1 Forza per ogni altra Unità con Mente Collettiva che controlli (massimo +3).",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-050",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 50,
			"name": "Seminatore Silente",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 6,
			"type": "Parassita",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando entra in gioco, metti 1 segnalino Parassita su ogni Comandante avversario. Se un Comandante ha 3 o più Parassiti, perde 1 PC addizionale all’inizio del turno.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-051",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 51,
			"name": "Entità Isolata",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se questa Unità è in Linea, le Unità avversarie non possono essere spostate da effetti.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-052",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 52,
			"name": "Leviatano delle Stelle Nere",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 9,
			"type": "Orrore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Quando entra in Supporto tramite Sorvolo, puoi distruggere una Linea con Forza 3 o inferiore.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-053",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 53,
			"name": "Sciame Infinito",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. Quando una tua Unità con Mente Collettiva viene distrutta, puoi creare una pedina Sciame con Forza 1 in Supporto.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-054",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 54,
			"name": "Imperatore delle Ombre",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 8,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All’inizio della Fase di Scontro, puoi scegliere un Fronte. In quel Fronte, scambia la posizione di tutte le Linee con i Supporti.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-055",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 55,
			"name": "L’Occhio della Collettività",
			"category": "unit",
			"rarity": null,
			"cost": 10,
			"force": 9,
			"type": "Sciame",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Mente Collettiva. Le tue Unità con Mente Collettiva in tutti i Fronti ottengono +1 Forza.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-056",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 56,
			"name": "Conquistatore delle Tre Dimensioni",
			"category": "unit",
			"rarity": null,
			"cost": 10,
			"force": 9,
			"type": "Psionico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se vinci almeno due Fronti nello stesso turno, puoi spostare tutte le Unità avversarie in un unico Fronte a tua scelta.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-057",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 57,
			"name": "Spostamento Coordinato",
			"category": "tactic",
			"rarity": null,
			"cost": 1,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sposta un tuo Supporto in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-058",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 58,
			"name": "Assalto Mentale",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una Linea avversaria perde 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-059",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 59,
			"name": "Infiltrazione Silente",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Metti 1 segnalino Parassita sul Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-060",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 60,
			"name": "Sincronia dello Sciame",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una tua Unità con Mente Collettiva ottiene +2 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-061",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 61,
			"name": "Velo dell’Ombra",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sposta una Linea in Supporto nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-062",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 62,
			"name": "Morsa Coordinata",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se controlli almeno 2 Unità con Mente Collettiva nello stesso Fronte, distruggi un Supporto avversario in quel Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-063",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 63,
			"name": "Risonanza Psionica",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Guarda la mano di un avversario. Puoi scegliere una carta non‑Unità; quell’avversario la rimette in cima al mazzo.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-064",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 64,
			"name": "Artiglio Invisibile",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una tua Unità con Sorvolo ottiene +1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-065",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 65,
			"name": "Sciame Replicante",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Crea una pedina Sciame con Forza 1 in Supporto in un Fronte a tua scelta.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-066",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 66,
			"name": "Dissociazione",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Scambia la posizione di una tua Linea con un Supporto nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-067",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 67,
			"name": "Dominio Psionico",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sposta una Linea avversaria in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-068",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 68,
			"name": "Sciame Avanzato",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Mente Collettiva ottengono +1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-069",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 69,
			"name": "Invasione Strisciante",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Metti 1 segnalino Parassita su ciascun Comandante avversario che non ne ha.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-070",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 70,
			"name": "Coordinazione Perfetta",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Fino alla fine dello Scontro, i tuoi Supporti forniscono +2 Forza invece di +1 (massimo +3 totale).",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-071",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 71,
			"name": "Spezzare la Formazione",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Distruggi un Supporto avversario e sposta la sua Linea in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-072",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 72,
			"name": "Sussurro del Dominio",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Prendi il controllo di un Supporto avversario fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-073",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 73,
			"name": "Sciame Travolgente",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se vinci il Fronte in cui controlli almeno 2 Unità con Mente Collettiva, infliggi 1 danno aggiuntivo al Comandante.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-074",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 74,
			"name": "Parassita Mutageno",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Metti 1 segnalino Parassita su un Comandante. Se quel Comandante ha 2 o più Parassiti, una Linea perde 2 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-075",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 75,
			"name": "Dominio Temporaneo",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Prendi il controllo di una Linea avversaria fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-076",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 76,
			"name": "Frattura della Collettività",
			"category": "tactic",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Distruggi tutte le Unità con Mente Collettiva in un Fronte bersaglio.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-077",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 77,
			"name": "Invasione Totale",
			"category": "tactic",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Metti 2 segnalini Parassita su un Comandante. Se ha 3 o più Parassiti, perde 2 PC.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-078",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 78,
			"name": "Manipolazione Suprema",
			"category": "tactic",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Scambia due Fronti controllati dallo stesso giocatore.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-079",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 79,
			"name": "Risonanza della Mente Suprema",
			"category": "tactic",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Mente Collettiva ottengono +2 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-080",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 80,
			"name": "Velo Frantumato",
			"category": "tactic",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Distruggi una Linea con Forza 4 o inferiore. Se controlli almeno 2 Unità con Mente Collettiva nello stesso Fronte, pesca 1 carta.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-081",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 81,
			"name": "Artigli Psionici",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene Logorare (1).",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-082",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 82,
			"name": "Carapace Organico",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata riduce di 1 tutti i danni subiti.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-083",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 83,
			"name": "Occhio della Collettività",
			"category": "equipment",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "Quando l’Unità equipaggiata entra in Supporto, puoi pescare 1 carta.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-084",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 84,
			"name": "Lama Infiltratrice",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "Quando l’Unità equipaggiata distrugge una Linea, puoi mettere 1 segnalino Parassita sul Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-085",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 85,
			"name": "Amplificatore Sinaptico",
			"category": "equipment",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene +2 Forza se nel suo Fronte controlli almeno un’altra Unità con Mente Collettiva.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-086",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 86,
			"name": "Ali Biomorfe",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene Sorvolo.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-087",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 87,
			"name": "Catene Parassitarie",
			"category": "equipment",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "Quando l’Unità equipaggiata entra in Linea, una Linea avversaria perde 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-088",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 88,
			"name": "Corona della Mente Suprema",
			"category": "equipment",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L’Unità equipaggiata ottiene +1 Forza per ogni altra Unità con Mente Collettiva nel suo Fronte (massimo +3).",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-089",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 89,
			"name": "Nido della Covata",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "All’inizio del tuo turno, puoi creare una pedina Sciame con Forza 1 in Supporto nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-090",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 90,
			"name": "Monolito Psionico",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una volta per turno, puoi spostare un tuo Supporto in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-091",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 91,
			"name": "Tana Parassitaria",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "Quando una tua Unità entra in gioco, puoi mettere 1 segnalino Parassita su un Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-092",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 92,
			"name": "Torre dell’Occhio Silente",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All’inizio del tuo turno, puoi guardare la mano di un avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-093",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 93,
			"name": "Fenditura Dimensionale",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "Quando una tua Unità con Sorvolo cambia Fronte, una Linea avversaria perde 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-094",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 94,
			"name": "Santuario della Collettività",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Mente Collettiva ottengono +1 Forza mentre sono in Supporto.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-095",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 95,
			"name": "Corridoio Biologico",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità possono entrare in Supporto anche se una Linea è già presente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-096",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 96,
			"name": "Pozzo delle Spore",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "Quando un Comandante riceve un segnalino Parassita, puoi pescare 1 carta.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-097",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 97,
			"name": "Altare dell’Invasione",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una volta per turno, puoi spostare una Linea in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-098",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 98,
			"name": "Cripta della Risonanza",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 2,
			"health": null,
			"rulesText": "Quando entra in gioco, crea una pedina Sciame con Forza 1.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-099",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 99,
			"name": "Cattedrale della Mente Suprema",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Mente Collettiva ottengono +1 Forza.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-100",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 100,
			"name": "Vortice Stellare",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "All’inizio del tuo turno, puoi spostare una Linea avversaria in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-101",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 101,
			"name": "Santuario del Parassita",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ogni volta che un Comandante riceve un segnalino Parassita, quel giocatore perde 1 PC.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-102",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 102,
			"name": "Torre della Distorsione",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le Linee avversarie non possono essere scambiate con Supporti.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-103",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 103,
			"name": "Forgia della Covata",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando una tua Unità con Mente Collettiva viene distrutta, crea una pedina Sciame 1 Forza in Supporto.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-104",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 104,
			"name": "Nucleo della Coordinazione",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "I tuoi Supporti forniscono +1 addizionale (massimo +3 totale).",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-105",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 105,
			"name": "Portale Silente",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "Quando una tua Unità entra in Supporto, puoi spostare un Supporto avversario nello stesso Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-106",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 106,
			"name": "Tempio dell’Infiltrazione",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità che entrano in gioco possono mettere 1 segnalino Parassita.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-107",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 107,
			"name": "Città dell’Invasione",
			"category": "site",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Sorvolo possono entrare in Linea quando cambiano Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-108",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 108,
			"name": "Spira della Dominazione",
			"category": "site",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando una tua Linea distrugge una Linea avversaria, puoi spostare un’altra Linea avversaria in un Fronte adiacente.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-109",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 109,
			"name": "Abisso della Collettività",
			"category": "site",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Mente Collettiva ottengono +1 Forza per ogni Supporto nel loro Fronte.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-110",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 110,
			"name": "Santuario della Sincronia Totale",
			"category": "site",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando controlli almeno 3 Unità con Mente Collettiva in gioco, pesca 1 carta all’inizio del tuo turno.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-111",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 111,
			"name": "Monolito della Mente Suprema",
			"category": "site",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Mente Collettiva ottengono +2 Forza mentre sono in Linea.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-112",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 112,
			"name": "Dominio della Collettività",
			"category": "field",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Mente Collettiva ottengono +1 Forza.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-113",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 113,
			"name": "Cielo dell’Invasione",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Sorvolo ottengono +1 Forza.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-114",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 114,
			"name": "Regno delle Spore",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando un Comandante riceve un segnalino Parassita, quel giocatore perde 1 PC addizionale.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-115",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 115,
			"name": "Tempesta Psionica",
			"category": "field",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All’inizio dello Scontro, una Linea avversaria perde 1 Forza per ogni tua Unità con Mente Collettiva nello stesso Fronte (massimo 2).",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-116",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 116,
			"name": "Campo di Distorsione",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando una Linea viene spostata in un Fronte, perde 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-117",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 117,
			"name": "Sovraccarico Sinaptico",
			"category": "field",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando una tua Unità con Mente Collettiva distrugge una Linea, pesca 1 carta.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-118",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 118,
			"name": "Velo della Conquista",
			"category": "field",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità possono entrare in Supporto in qualsiasi Fronte indipendentemente dalla presenza di una Linea.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-119",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 119,
			"name": "Era dell’Invasione Totale",
			"category": "field",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All’inizio del tuo turno, se controlli almeno una Unità in ciascun Fronte, infliggi 1 danno al Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-3-120",
			"setId": "set-3",
			"setName": "Invasione Silente",
			"number": 120,
			"name": "Xylar, Mente Suprema dello Sciame",
			"category": "commander",
			"rarity": null,
			"cost": null,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": 20,
			"rulesText": "Rifornimento: Crea una pedina Sciame con Forza 1 in Supporto in un Fronte a tua scelta oppure metti 1 segnalino Parassita sul Comandante avversario. Abilità Attiva (Una volta per turno): Paga 2 Domini attivi. Scegli un'Unità con Mente Collettiva: essa ottiene +2 Forza fino alla fine dello Scontro e applica 1 segnalino Parassita al Comandante avversario.",
			"sourceFile": "set_3_invasione_silente.md"
		},
		{
			"id": "set-4-001",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 1,
			"name": "Novizio dell'Ascesa",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Umano – Asceta",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Quando questa Unità vince un Fronte o riceve un potenziamento, ottiene permanentemente +1 Forza e il tipo Divinità). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-002",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 2,
			"name": "Spirito del Tormento",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 1,
			"type": "Spirito",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (1) Quando entra in gioco, applica 1 segnalino Tormento al Comandante avversario.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-003",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 3,
			"name": "Sacerdotessa del Tempio Celeste",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Divinità – Chierico",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se si trova in Supporto, la tua Linea nel suo Fronte ottiene +1 Forza. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-004",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 4,
			"name": "Esploratore Infiltrato",
			"category": "unit",
			"rarity": null,
			"cost": 2,
			"force": 2,
			"type": "Umano – Spia",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (1) (Può essere giocato direttamente in un Fronte avversario scoperto come Supporto, ignorando le restrizioni standard).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-005",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 5,
			"name": "Celestiale Minore",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 3,
			"type": "Divinità – Angelo",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-006",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 6,
			"name": "Custode dei Giuramenti",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Costrutto",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva. Se questa Unità è in Linea, riduce di 1 il danno subito.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-007",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 7,
			"name": "Adepto del Tormento",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 3,
			"type": "Cultista",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (1) Quando questa Unità attacca una Linea avversaria affetta da Tormento, ottiene +1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-008",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 8,
			"name": "Infiltratore dell'Eclissi",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Spettro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (2) Quando entra in gioco tramite Infiltrazione, una Linea avversaria nello stesso Fronte perde 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-009",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 9,
			"name": "Araldo della Divinità",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 2,
			"type": "Divinità",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando entra in gioco, se controlli almeno un'altra Unità con il tipo Divinità, pesca 1 carta. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-010",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 10,
			"name": "Asceta della Vetta",
			"category": "unit",
			"rarity": null,
			"cost": 3,
			"force": 3,
			"type": "Umano – Monaco",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Se questa Unità sopravvive a due Scontri consecutivi in Linea, ottiene Sorvolo e +1 Forza).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-011",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 11,
			"name": "Tormentatore d'Ossa",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Non Morto",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (2).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-012",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 12,
			"name": "Guardiano del Santuario Celato",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Divinità – Guardiano",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-013",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 13,
			"name": "Infiltratore Ombroso",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Spia",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (1). Quando entra in Supporto, puoi guardare la mano dell'avversario.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-014",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 14,
			"name": "Profeta dell'Ascensione",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Divinità – Mago",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All'inizio del tuo turno, se una tua Unità ha completato un'Ascensione, pesca 1 carta. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-015",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 15,
			"name": "Falange Celeste",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 4,
			"type": "Divinità – Soldato",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Nessuna abilità. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-016",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 16,
			"name": "Demone del Tormento Eterno",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (2) Quando distrugge una Linea avversaria, infliggi 1 danno al Comandante avversario.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-017",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 17,
			"name": "Serafino della Luce Primava",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Divinità – Angelo",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Quando entra in Linea, una Linea avversaria nello stesso Fronte perde 1 Forza fino alla fine dello Scontro. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-018",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 18,
			"name": "Spia Infiltrata Suprema",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Spia",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (2). Se si trova in Supporto, la Linea nel suo Fronte non può essere bersaglio di Tattiche avversarie con costo 1.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-019",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 19,
			"name": "Avatar della Divinità Solare",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 5,
			"type": "Divinità – Avatar",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se controlli almeno due Unità Divinità, questa Unità ottiene +1 Forza. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-020",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 20,
			"name": "Eremita della Folgore",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Umano – Asceta",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Se questa Unità infligge danno al Comandante avversario, subisce Ascensione, ottenendo +2 Forza e Sorvolo).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-021",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 21,
			"name": "Inquisitore del Tormento",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Cultista",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (1). Quando una Linea avversaria subisce Tormento, pesca 1 carta (una volta per turno).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-022",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 22,
			"name": "Guardiano dell'Infiltrazione",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Costrutto",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (1). Posizione Difensiva.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-023",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 23,
			"name": "Patriarca Celeste",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Divinità",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "I tuoi Supporti nel suo Fronte forniscono +2 Forza alla Linea invece di +1 (massimo +3 totale). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-024",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 24,
			"name": "Campione dell'Ascensione",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Umano – Guerriero",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Se distrugge una Linea avversaria, diventa una Divinità e ottiene permanentemente +2 Forza). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-025",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 25,
			"name": "Tormentatore d'Anime",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Spettro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (2). Se la Linea avversaria ha 0 Forza o meno durante lo Scontro, distruggila immediatamente.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-026",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 26,
			"name": "Maestro Infiltratore",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Spia",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (2). Può essere giocato in qualsiasi Fronte come Linea se il Fronte avversario è scoperto.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-027",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 27,
			"name": "Arcangelo del Giudizio",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Divinità – Angelo",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Quando entra in Linea, distruggi un Supporto avversario nello stesso Fronte. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-028",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 28,
			"name": "Divinità dei Sette Venti",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Divinità",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Sorvolo ottengono +1 Forza. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-029",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 29,
			"name": "Signore del Tormento",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (3). Ogni volta che il Comandante avversario riceve un segnalino Tormento, perde anche 1 Punto Comando.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-030",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 30,
			"name": "Infiltratore Dimensionale",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Orrore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (3). Quando entra in gioco, puoi spostare un Supporto avversario in un Fronte adiacente.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-031",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 31,
			"name": "Santo Guerriero dell'Alba",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Divinità – Guerriero",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Se supportato da due Unità, subisce Ascensione, ottenendo +2 Forza e immunità alle Tattiche avversarie). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-032",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 32,
			"name": "Colosso del Tempio Fluttuante",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 7,
			"type": "Costrutto – Divinità",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Posizione Difensiva. Questa Unità non può essere mossa da effetti avversari. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-033",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 33,
			"name": "Ombra del Tormento Silente",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Spettro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (1). Infiltrazione (1).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-034",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 34,
			"name": "Araldo dell'Ascensione Finale",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Divinità – Avatar",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Se questa Unità si trova in Linea all'inizio del turno e ha già subito Ascensione, raddoppia la sua Forza fino alla fine del turno). Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-035",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 35,
			"name": "Bestia del Tormento Cosmico",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Orrore",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (2). Quando entra in Linea, infliggi 2 danni a una Linea avversaria.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-036",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 36,
			"name": "Infiltratore Imperiale",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Spia",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (2). Se distrugge una Linea avversaria, pesca 2 carte.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-037",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 37,
			"name": "Cherubino della Guardia Celeste",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Divinità – Angelo",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Posizione Difensiva. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-038",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 38,
			"name": "Sacerdote del Tormento Abissale",
			"category": "unit",
			"rarity": null,
			"cost": 5,
			"force": 4,
			"type": "Cultista",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (2). Se è in Supporto, la Linea nel suo Fronte infligge 1 danno aggiuntivo al Comandante avversario se vince il Fronte.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-039",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 39,
			"name": "Spia delle Linee Celesti",
			"category": "unit",
			"rarity": null,
			"cost": 4,
			"force": 3,
			"type": "Spia",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (1). Quando entra in Supporto, sposta la tua Linea in un Fronte adiacente.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-040",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 40,
			"name": "Monarca Divino",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 8,
			"type": "Divinità",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Linee con il tipo Divinità ottengono +1 Forza. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-041",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 41,
			"name": "Eroe dell'Ascensione Beata",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Umano – Eroe",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Se il tuo Comandante ha almeno 10 PC, questa Unità subisce Ascensione automatica, ottenendo +2 Forza e Ferocia).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-042",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 42,
			"name": "Tormentatore d'Echi",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Spettro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (2). Le carte scartate dall'avversario subiscono un costo aumentato di Tormento (1) se applicabile.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-043",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 43,
			"name": "Infiltratore del Monolito",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Costrutto",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (2). Quando entra in Linea, una Linea avversaria nello stesso Fronte perde 2 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-044",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 44,
			"name": "Seraphim Supremo",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Divinità – Angelo",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Quando entra in Linea, puoi riprendere in mano una Tattica dal tuo scarto. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-045",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 45,
			"name": "Signore delle Ceneri Tormentate",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 8,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (3). All'inizio della Fase di Scontro, infliggi 1 danno a tutte le Linee avversarie affette da Tormento.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-046",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 46,
			"name": "Maestro di Infiltrazione Stellare",
			"category": "unit",
			"rarity": null,
			"cost": 7,
			"force": 6,
			"type": "Spia",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (3). Non può essere bersaglio di Tattiche avversarie mentre è in Supporto.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-047",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 47,
			"name": "Asceta della Trascendenza",
			"category": "unit",
			"rarity": null,
			"cost": 6,
			"force": 5,
			"type": "Umano – Asceta",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Se scarti una carta dalla tua mano, questa Unità subisce Ascensione, ottenendo +2 Forza permanente).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-048",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 48,
			"name": "Avatar del Tempio Sommerso",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Divinità – Avatar",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando entra in gioco, puoi distruggere un Sito bersaglio con Decadenza pari o inferiore a 3. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-049",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 49,
			"name": "Colosso del Tormento Divino",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 8,
			"type": "Costrutto – Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (2). Posizione Difensiva. Riduce di 2 tutti i danni subiti in combattimento.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-050",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 50,
			"name": "Infiltratore dell'Oltretomba",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 7,
			"type": "Spettro",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (3). Quando entra in gioco dal tuo scarto, applica 2 segnalini Tormento al Comandante avversario.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-051",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 51,
			"name": "Divinità Primordiale del Fuoco",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 9,
			"type": "Divinità",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando questa Unità distrugge una Linea avversaria, infliggi 2 danni aggiuntivi al Comandante avversario. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-052",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 52,
			"name": "Campione dell'Ascensione Eterna",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 8,
			"type": "Umano – Eroe",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ascensione (Se questa Unità ha già subito Ascensione due volte, ottiene +3 Forza e non può essere distrutta da effetti).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-053",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 53,
			"name": "Tormentatore Supremo dell'Abisso",
			"category": "unit",
			"rarity": null,
			"cost": 9,
			"force": 9,
			"type": "Demone",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tormento (4). All'inizio del tuo turno, se l'avversario ha 3 o più segnalini Tormento, pesca 2 carte.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-054",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 54,
			"name": "Infiltratore Omega",
			"category": "unit",
			"rarity": null,
			"cost": 8,
			"force": 8,
			"type": "Spia",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infiltrazione (3). Se entra in Linea in un Fronte scoperto, raddoppia la sua Forza per quello Scontro.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-055",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 55,
			"name": "Apocalisse Celeste",
			"category": "unit",
			"rarity": null,
			"cost": 10,
			"force": 10,
			"type": "Divinità – Avatar",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sorvolo. Questa Unità non può essere messa in Supporto. All'inizio dello Scontro, le Linee avversarie perdono 2 Forza. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-056",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 56,
			"name": "Il Creatore dei Mondi",
			"category": "unit",
			"rarity": null,
			"cost": 10,
			"force": 10,
			"type": "Divinità",
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tutte le tue Unità con il tipo Divinità ottengono +2 Forza e immunità agli effetti di distruzione avversari. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-057",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 57,
			"name": "Benedizione Celeste",
			"category": "tactic",
			"rarity": null,
			"cost": 1,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una tua Unità ottiene +2 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-058",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 58,
			"name": "Sussurro del Tormento",
			"category": "tactic",
			"rarity": null,
			"cost": 1,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Metti 1 segnalino Tormento sul Comandante avversario.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-059",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 59,
			"name": "Passo Infiltrato",
			"category": "tactic",
			"rarity": null,
			"cost": 1,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sposta un tuo Infiltratore in un Fronte adiacente.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-060",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 60,
			"name": "Rivelazione dell'Ascesa",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Pesca 1 carta, poi se controlli un'Unità con Ascensione, guadagna 1 PC.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-061",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 61,
			"name": "Giudizio Divino",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infliggi 2 danni a una Linea avversaria.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-062",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 62,
			"name": "Catene del Tormento",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una Linea avversaria perde 2 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-063",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 63,
			"name": "Ombra Infiltrata",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Metti in gioco una carta con Infiltrazione dalla tua mano ignorando parzialmente il costo (paga 1 in meno, minimo 1).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-064",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 64,
			"name": "Preghiera di Trascendenza",
			"category": "tactic",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Fai subire Ascensione a una tua Unità idonea se soddisfa i requisiti di Forza.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-065",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 65,
			"name": "Luce Purificatrice",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Distruggi un Supporto avversario in un Fronte in cui controlli una Linea Divinità.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-066",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 66,
			"name": "Tormentare l'Anima",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Metti 2 segnalini Tormento sul Comandante avversario.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-067",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 67,
			"name": "Infiltrazione Tattica",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Sposta un Supporto avversario in un Fronte adiacente.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-068",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 68,
			"name": "Ascensione Gloriosa",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Fino alla fine dello Scontro, tutte le tue Unità con Ascensione ottengono +2 Forza.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-069",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 69,
			"name": "Ira dei Cieli",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tutte le Linee avversarie perdono 1 Forza fino alla fine dello Scontro.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-070",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 70,
			"name": "Tormento di Massa",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Applica 1 segnalino Tormento a ciascun Comandante avversario e infliggi 1 danno a ogni Linea avversaria.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-071",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 71,
			"name": "Invasione Silenziosa Infiltrata",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Metti in gioco un'Unità con Infiltrazione dal tuo scarto in Supporto.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-072",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 72,
			"name": "Miracolo dell'Ascesa",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Pesca 2 carte. Se una di esse è un'Unità, puoi farla entrare immediatamente in Supporto.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-073",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 73,
			"name": "Santuario Protetto",
			"category": "tactic",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Una tua Linea non può subire danno in questo turno.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-074",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 74,
			"name": "Cataclisma Divino",
			"category": "tactic",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Distruggi tutte le Unità avversarie con Forza 3 o inferiore.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-075",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 75,
			"name": "Eclissi del Tormento",
			"category": "tactic",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se l'avversario ha almeno 2 segnalini Tormento, ruba 1 Punto Comando.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-076",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 76,
			"name": "Infiltrazione Letale",
			"category": "tactic",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Distruggi un Supporto avversario con Forza 3 o inferiore.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-077",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 77,
			"name": "Trionfo dell'Ascensione",
			"category": "tactic",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Raddoppia la Forza di una tua Unità che ha completato l'Ascensione per questo turno.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-078",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 78,
			"name": "Giudizio Universale",
			"category": "tactic",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Ogni giocatore sacrifica una Linea. Pesca 2 carte.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-079",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 79,
			"name": "Tormento Eterno",
			"category": "tactic",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Infliggi 3 danni al Comandante avversario se possiede almeno 3 segnalini Tormento.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-080",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 80,
			"name": "Dominio Infiltrato",
			"category": "tactic",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Prendi il controllo temporaneo di un Supporto avversario fino alla fine dello Scontro.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-081",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 81,
			"name": "Apoteosi Divina",
			"category": "tactic",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Tutte le tue Unità ottengono il tipo Divinità e +2 Forza fino alla fine del turno. Divinità: Immune a Tattiche avversarie e distruzione da effetti. Se ridotta a 0 Forza in Scontro, viene Sigillata (scartata).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-082",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 82,
			"name": "Sigillo della Fine dei Tempi",
			"category": "tactic",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Distruggi tutte le Linee in un Fronte bersaglio.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-083",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 83,
			"name": "Tempio dell'Alba",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "All'inizio del tuo turno, pesca 1 carta, poi scarta 1 carta.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-084",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 84,
			"name": "Altare del Tormento",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "All'inizio del tuo turno, metti 1 segnalino Tormento sul Comandante avversario.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-085",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 85,
			"name": "Avamposto Infiltrato",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "Le tue Unità con Infiltrazione costano 1 Dominio in meno (minimo 1).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-086",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 86,
			"name": "Santuario dell'Ascesa",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "Quando una tua Unità subisce Ascensione, guadagna 1 PC.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-087",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 87,
			"name": "Cattedrale Celeste",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con il tipo Divinità ottengono +1 Forza.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-088",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 88,
			"name": "Fossa dei Tormenti",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "Le Linee avversarie affette da Tormento perdono 1 Forza costante.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-089",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 89,
			"name": "covo delle Spie",
			"category": "site",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Infiltrazione possono essere messe in Supporto in qualsiasi Fronte.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-090",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 90,
			"name": "Monolito della Trascendenza",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All'inizio del tuo turno, puoi guardare la prima carta del tuo mazzo.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-091",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 91,
			"name": "Altare del Giudizio",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "Quando una tua Linea distrugge una Linea avversaria, infliggi 1 danno al Comandante avversario.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-092",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 92,
			"name": "Prigione del Tormento",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le Unità avversarie in Supporto non possono fornire bonus di Forza alle Linee se l'avversario ha Tormento.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-093",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 93,
			"name": "Bastione Infiltrato",
			"category": "site",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Infiltrazione riducono di 1 il danno subito.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-094",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 94,
			"name": "Tempio delle Dieci Ali",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Sorvolo ottengono +1 Forza.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-095",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 95,
			"name": "Sala della Luce Eterna",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "All'inizio del tuo turno, una tua Linea ottiene +1 Forza fino alla fine del turno.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-096",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 96,
			"name": "Abisso del Tormento",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se l'avversario ha 3 o più segnalini Tormento, le tue Tattiche costano 1 Dominio in meno.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-097",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 97,
			"name": "Rete di Infiltrazione",
			"category": "site",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Quando un'Unità avversaria entra in gioco, puoi guardare la mano dell'avversario.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-098",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 98,
			"name": "Santuario della Divinità Suprema",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "I tuoi Supporti forniscono +2 Forza invece di +1 (massimo +3 totale).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-099",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 99,
			"name": "Fortezza dell'Ascesa",
			"category": "site",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Ascensione non possono essere bersaglio di Tattiche avversarie.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-100",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 100,
			"name": "Cripta del Tormento",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 4,
			"health": null,
			"rulesText": "All'inizio del turno di ogni giocatore, quel giocatore perde 1 PC se ha segnalini Tormento.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-101",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 101,
			"name": "Quartier Generale Infiltrato",
			"category": "site",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Infiltrazione ottengono +1 Forza.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-102",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 102,
			"name": "Palazzo dei Cieli",
			"category": "site",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All'inizio del tuo turno, crea una pedina Celestiale con Forza 2 in Supporto.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-103",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 103,
			"name": "Altare dell'Apoteosi",
			"category": "site",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con il tipo Divinità ottengono +2 Forza mentre sono in Linea.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-104",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 104,
			"name": "Sfera del Tormento Cosmico",
			"category": "site",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": 3,
			"health": null,
			"rulesText": "All'inizio del tuo turno, infliggi 1 danno al Comandante avversario per ogni segnalino Tormento che possiede.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-105",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 105,
			"name": "Cittadella delle Spie Celesti",
			"category": "site",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Infiltrazione possono entrare direttamente in Linea se il Fronte è scoperto.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-106",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 106,
			"name": "Regno dei Cieli Infiniti",
			"category": "site",
			"rarity": null,
			"cost": 8,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Linee ottengono +1 Forza. Le Linee avversarie perdono 1 Forza.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-107",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 107,
			"name": "Spada della Luce Celeste",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +1 Forza e Sorvolo.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-108",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 108,
			"name": "Manette del Tormento",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata applica Tormento (1) quando entra in Linea.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-109",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 109,
			"name": "Mantello dell'Infiltratore",
			"category": "equipment",
			"rarity": null,
			"cost": 2,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene Infiltrazione (1).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-110",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 110,
			"name": "Corona dell'Ascensione",
			"category": "equipment",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +2 Forza e subisce Ascensione automatica.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-111",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 111,
			"name": "Scudo Divino",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata riduce di 1 tutti i danni subiti.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-112",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 112,
			"name": "Pugnale del Tormento",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "Quando l'Unità equipaggiata distrugge una Linea, applica 1 segnalino Tormento al Comandante avversario.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-113",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 113,
			"name": "Visore di Infiltrazione",
			"category": "equipment",
			"rarity": null,
			"cost": 3,
			"force": null,
			"type": null,
			"equipCost": 1,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +1 Forza e può ignorare le posizioni difensive avversarie.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-114",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 114,
			"name": "Reliquia della Trascendenza",
			"category": "equipment",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": 2,
			"decay": null,
			"health": null,
			"rulesText": "L'Unità equipaggiata ottiene +2 Forza e immunità agli effetti di distruzione.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-115",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 115,
			"name": "Cieli Aperti della Trascendenza",
			"category": "field",
			"rarity": null,
			"cost": 4,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Sorvolo ottengono +1 Forza.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-116",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 116,
			"name": "Valli del Tormento Perpetuo",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "All'inizio dello Scontro, il Comandante avversario con più segnalini Tormento perde 1 Punto Comando.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-117",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 117,
			"name": "Regno dell'Infiltrazione Globale",
			"category": "field",
			"rarity": null,
			"cost": 5,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con Infiltrazione costano 1 Dominio in meno (minimo 1).",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-118",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 118,
			"name": "Santuario della Divinità Universale",
			"category": "field",
			"rarity": null,
			"cost": 6,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Unità con il tipo Divinità ottengono +1 Forza per ogni altra Unità Divinità in gioco.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-119",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 119,
			"name": "Era dell'Ascensione Divina",
			"category": "field",
			"rarity": null,
			"cost": 7,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Se una tua Unità compie un'Ascensione, pesca 1 carta e guadagna 1 PC.",
			"sourceFile": "set_4_ascesa_divina.md"
		},
		{
			"id": "set-4-120",
			"setId": "set-4",
			"setName": "Ascesa Divina",
			"number": 120,
			"name": "Trono del Creatore Celeste",
			"category": "field",
			"rarity": null,
			"cost": 8,
			"force": null,
			"type": null,
			"equipCost": null,
			"decay": null,
			"health": null,
			"rulesText": "Le tue Linee ottengono +2 Forza. Le Tattiche avversarie costano 1 Dominio in più.",
			"sourceFile": "set_4_ascesa_divina.md"
		}
	];
	//#endregion
	//#region src/engine/board.js
	const FRONT_NAMES$1 = [
		"left",
		"center",
		"right"
	];
	const FRONT_LABELS$1 = {
		left: "SINISTRA",
		center: "CENTRO",
		right: "DESTRA"
	};
	const SLOT_NAMES = [
		"line",
		"supA",
		"supB"
	];
	const CARD_DATA = cards;
	const SETS = sets;
	//#endregion
	//#region src/permanent-effects.js
	const FRONT_NAMES = [
		"left",
		"center",
		"right"
	];
	const SLOTS = [
		"line",
		"supA",
		"supB"
	];
	function cardId(card) {
		return card?.catalogId || card?.id;
	}
	function hasUnitCard(unit, ids) {
		return ids.includes(cardId(unit));
	}
	function frontHasUnit(player, frontName, ids, excludedUnit = null) {
		return SLOTS.some((slot) => {
			const unit = player.fronts[frontName][slot];
			return unit && unit !== excludedUnit && hasUnitCard(unit, ids);
		});
	}
	function playerUnits(player) {
		return FRONT_NAMES.flatMap((frontName) => SLOTS.map((slotName) => ({
			frontName,
			slotName,
			unit: player.fronts[frontName][slotName]
		})).filter((entry) => entry.unit));
	}
	function getUnitKeywords(player, unit, frontName, slotName) {
		if (!unit) return [];
		const keywords = [...unit.keywords || []];
		const equipment = unit.equipment;
		if (equipment) {
			const id = cardId(equipment);
			if (["set-1-083", "set-1-090"].includes(id)) keywords.push("Ferocia");
			if (["set-1-086", "set-3-086"].includes(id)) keywords.push("Sorvolo");
			if ([
				"set-2-080",
				"set-2-083",
				"set-2-090",
				"set-3-081"
			].includes(id)) keywords.push("Logorare (1)");
			if (["set-2-079", "set-2-089"].includes(id)) keywords.push("Tormento");
			if (id === "set-2-089" || id === "set-2-081" && slotName !== "line") keywords.push("Eco Spettrale");
			if (id === "set-2-085") keywords.push("Posizione Difensiva");
			if (["set-2-084", "set-2-090"].includes(id)) keywords.push("Ascensione");
		}
		if (slotName === "line" && unit.force >= 5 && player.sites?.some((site) => cardId(site) === "set-1-100")) keywords.push("Ferocia");
		if (player.sites?.some((site) => cardId(site) === "set-2-104") && keywords.some((keyword) => keyword.startsWith("Logorare"))) keywords.push("Logorare (1)");
		if (unit.force >= 4 && player.field?.catalogId === "set-1-111") keywords.push("Ferocia");
		if (slotName === "line" && (["supA", "supB"].some((slot) => hasUnitCard(player.fronts[frontName][slot], ["set-1-014"])) || frontHasUnit(player, frontName, ["set-1-029"], unit) && /raptor/i.test(unit.type || ""))) keywords.push("Ferocia");
		return [...new Set(keywords)];
	}
	function getUnitForceBonus(player, unit, frontName, slotName, opponent) {
		let bonus = 0;
		const id = cardId(unit.equipment);
		const unitId = cardId(unit);
		const front = player.fronts[frontName];
		if ([
			"set-1-079",
			"set-1-084",
			"set-1-090"
		].includes(id)) bonus += id === "set-1-079" ? 1 : 2;
		if ([
			"set-2-079",
			"set-2-082",
			"set-2-085"
		].includes(id)) bonus += 1;
		if ([
			"set-2-083",
			"set-2-086",
			"set-2-087",
			"set-2-089"
		].includes(id)) bonus += 2;
		if (["set-2-088", "set-2-090"].includes(id)) bonus += 3;
		if (opponent && SLOTS.some((slot) => cardId(opponent.fronts?.[frontName]?.[slot]?.equipment) === "set-2-082")) bonus -= 1;
		if (id === "set-1-081" && slotName === "line") bonus += 1;
		if (id === "set-1-087") bonus += FRONT_NAMES.filter((name) => name !== frontName && player.fronts[name].line).length;
		if (id === "set-1-088") bonus += Math.min(2, Number(Boolean(front.supA)) + Number(Boolean(front.supB)));
		if (id === "set-3-085" && SLOTS.some((slot) => front[slot] && front[slot] !== unit && getUnitKeywords(player, front[slot], frontName, slot).includes("Mente Collettiva"))) bonus += 2;
		if (id === "set-3-088") bonus += Math.min(3, SLOTS.filter((slot) => front[slot] && front[slot] !== unit && getUnitKeywords(player, front[slot], frontName, slot).some((keyword) => keyword.startsWith("Mente Collettiva"))).length);
		if (slotName === "line" && ["set-1-008", "set-1-033"].includes(unitId)) bonus += 1;
		if (unitId === "set-1-020" && front.supA && front.supB) bonus += 1;
		if (unitId === "set-1-036" && SLOTS.some((slot) => front[slot] && front[slot] !== unit && /raptor/i.test(front[slot].type || ""))) bonus += 1;
		if (unitId === "set-1-041" && FRONT_NAMES.filter((name) => player.fronts[name].line).length >= 2) bonus += 1;
		if (slotName === "line" && playerUnits(player).some((entry) => hasUnitCard(entry.unit, ["set-1-047"]))) bonus += 1;
		if (["set-1-053", "set-1-054"].includes(unitId) && FRONT_NAMES.every((name) => player.fronts[name].line)) bonus += unitId === "set-1-053" ? 1 : 2;
		if (unitId === "set-1-058" && front.supA && front.supB) bonus += 3;
		if (unitId === "set-3-007" && slotName === "line" && (opponent?.fronts?.[frontName]?.line?.forceLostThisTurn || 0) > 0) bonus += 1;
		if (unitId === "set-3-012" && (opponent?.parasites || 0) > 0) bonus += 1;
		if (unitId === "set-3-022" && opponent && countUnits(player) < countUnits(opponent)) bonus += 1;
		if (unitId === "set-3-033" && SLOTS.some((slot) => front[slot] && front[slot] !== unit && /sciame/i.test(front[slot].type || ""))) bonus += 1;
		if (unitId === "set-3-040" && front.supA && front.supB) bonus += 2;
		if (unitId !== "set-3-025" && frontHasUnit(player, frontName, ["set-3-025"], unit) && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Mente Collettiva"))) bonus += 1;
		if (playerUnits(player).some((entry) => hasUnitCard(entry.unit, ["set-3-055"])) && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Mente Collettiva"))) bonus += 1;
		if (slotName === "line" && ["supA", "supB"].some((slot) => hasUnitCard(front[slot], ["set-2-034", "set-2-042"]))) bonus += 1;
		if (["set-1-095"].some((siteId) => player.sites?.some((site) => cardId(site) === siteId)) && getUnitKeywords(player, unit, frontName, slotName).includes("Ferocia")) bonus += 1;
		if (slotName === "line" && player.sites?.some((site) => cardId(site) === "set-1-109")) bonus += 1;
		if (slotName === "line" && player.sites?.some((site) => cardId(site) === "set-2-089") && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Logorare"))) bonus += 1;
		if (player.sites?.some((site) => cardId(site) === "set-2-104") && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Logorare"))) bonus += 1;
		if (slotName === "line" && player.sites?.some((site) => cardId(site) === "set-3-103") && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Mente Collettiva"))) bonus += 2;
		if (player.sites?.some((site) => cardId(site) === "set-3-091") && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Mente Collettiva"))) bonus += 1;
		if (slotName === "supA" || slotName === "supB") {
			if (player.sites?.some((site) => cardId(site) === "set-3-086") && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Mente Collettiva"))) bonus += 1;
		}
		if (slotName === "line" && player.field?.catalogId === "set-2-120" && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Logorare"))) bonus += 2;
		if (player.field?.catalogId === "set-1-112" && countUnits(player) > countUnits(opponent) && slotName === "line") bonus += 1;
		if (player.field?.catalogId === "set-1-118") {
			if (slotName === "line") bonus += 1;
		}
		if (player.field?.catalogId === "set-2-113" && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Logorare"))) bonus += 1;
		if (player.field?.catalogId === "set-3-112" && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Mente Collettiva"))) bonus += 1;
		if (player.field?.catalogId === "set-3-113" && getUnitKeywords(player, unit, frontName, slotName).includes("Sorvolo")) bonus += 1;
		if (player.sites?.some((site) => cardId(site) === "set-3-099") && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Mente Collettiva"))) bonus += 1;
		if (player.sites?.some((site) => cardId(site) === "set-3-109") && getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Mente Collettiva"))) bonus += Number(Boolean(front.supA)) + Number(Boolean(front.supB));
		if (slotName === "line" && opponent?.sites?.some((site) => cardId(site) === "set-2-101")) bonus -= 1;
		if (slotName === "line" && opponent?.fronts?.[frontName]?.line?.catalogId === "set-3-019") bonus -= 1;
		if (slotName === "line" && opponent?.field && ["set-1-118", "set-2-115"].includes(cardId(opponent.field))) bonus -= 1;
		return bonus;
	}
	function getFerocityBonus(player, unit, frontName, slotName, fewerUnits) {
		const keywords = getUnitKeywords(player, unit, frontName, slotName);
		if (!keywords.some((keyword) => keyword.startsWith("Ferocia")) || !fewerUnits) return 0;
		return keywords.some((keyword) => keyword.includes("+2")) || player.field?.catalogId === "set-1-115" ? 2 : 1;
	}
	function getDamageReduction(player, unit, frontName, slotName) {
		const equipmentId = cardId(unit.equipment);
		let reduction = ["set-1-085", "set-2-086"].includes(equipmentId) ? 2 : [
			"set-1-080",
			"set-2-080",
			"set-3-082"
		].includes(equipmentId) ? 1 : 0;
		if (slotName === "line") {
			if (hasUnitCard(unit, ["set-2-026", "set-3-032"])) reduction++;
			if (player.fronts[frontName].supA || player.fronts[frontName].supB) {
				if (hasUnitCard(unit, ["set-1-039"])) reduction++;
			}
			reduction += ["supA", "supB"].filter((slot) => hasUnitCard(player.fronts[frontName][slot], ["set-2-010", "set-2-042"])).length;
			reduction += (player.sites || []).filter((site) => ["set-1-103", "set-2-085"].includes(cardId(site))).length;
		}
		return reduction;
	}
	function ownSupport(unit) {
		return Boolean(unit) && !unit.infiltrated;
	}
	function getSupportBonus(player, frontName) {
		const front = player.fronts[frontName];
		let total = Number(ownSupport(front.supA)) + Number(ownSupport(front.supB));
		const frontHasEnhancer = frontHasUnit(player, frontName, [
			"set-1-030",
			"set-1-049",
			"set-3-046"
		]);
		const extraSupportSites = (player.sites || []).filter((site) => ["set-1-101", "set-3-096"].includes(cardId(site))).length;
		total += extraSupportSites * (Number(ownSupport(front.supA)) + Number(ownSupport(front.supB)));
		for (const slot of ["supA", "supB"]) {
			const unit = front[slot];
			if (!ownSupport(unit)) continue;
			if (hasUnitCard(unit, [
				"set-1-009",
				"set-1-043",
				"set-3-009"
			]) || ["set-1-082", "set-2-081"].includes(cardId(unit.equipment)) || frontHasEnhancer || hasUnitCard(unit, ["set-1-022"]) && !front[slot === "supA" ? "supB" : "supA"]) total++;
			if (/raptor/i.test(unit.type || "") && player.sites?.some((site) => cardId(site) === "set-1-107")) total++;
		}
		return Math.min(3, total);
	}
	function countUnits(player) {
		return playerUnits(player).length;
	}
	function createToken(owner, frontName, slotName, name = "Pedina Sciame", force = 1) {
		owner.tokenCounter = (owner.tokenCounter || 0) + 1;
		const unit = {
			id: `token-${owner.id}-${owner.tokenCounter}`,
			catalogId: null,
			owner: owner.id,
			name,
			category: "unit",
			type: name === "Pedina Raptor" ? "Raptor" : "Sciame",
			force,
			currentForce: force,
			damage: 0,
			damageThisTurn: 0,
			damageShield: 0,
			temporaryForce: 0,
			keywords: [],
			temporaryKeywords: [],
			front: frontName,
			position: slotName,
			equipment: null
		};
		owner.fronts[frontName][slotName] = unit;
		return unit;
	}
	//#endregion
	//#region src/settings.js
	const STORAGE_KEY$2 = "primal-ruin.settings.v1";
	const QUARANTINE_KEY$2 = "primal-ruin.settings.quarantine";
	const SETTINGS_VERSION = 1;
	const SPEEDS = [
		0,
		.5,
		1,
		2
	];
	const DEFAULTS = {
		audio: true,
		animationSpeed: 1
	};
	const KNOWN_KEYS = /* @__PURE__ */ new Set([
		"version",
		"audio",
		"animationSpeed"
	]);
	let settings = { ...DEFAULTS };
	function readSettingsPayload(serialized) {
		if (!serialized) return {
			ok: true,
			empty: true,
			settings: { ...DEFAULTS },
			version: SETTINGS_VERSION,
			extras: {}
		};
		let stored;
		try {
			stored = JSON.parse(serialized);
		} catch {
			return {
				ok: false,
				reason: "json"
			};
		}
		if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {
			ok: false,
			reason: "shape"
		};
		const version = Object.hasOwn(stored, "version") ? stored.version : SETTINGS_VERSION;
		if (!Number.isInteger(version) || version < 1) return {
			ok: false,
			reason: "version"
		};
		const extras = {};
		for (const [key, value] of Object.entries(stored)) if (!KNOWN_KEYS.has(key)) extras[key] = value;
		return {
			ok: true,
			empty: false,
			settings: {
				audio: typeof stored.audio === "boolean" ? stored.audio : DEFAULTS.audio,
				animationSpeed: SPEEDS.includes(stored.animationSpeed) ? stored.animationSpeed : DEFAULTS.animationSpeed
			},
			version: Math.max(version, SETTINGS_VERSION),
			extras
		};
	}
	function serializeSettingsRecord(version, current, extras = {}) {
		return JSON.stringify({
			version,
			...extras,
			audio: current.audio,
			animationSpeed: current.animationSpeed
		});
	}
	function quarantineSettings(serialized, reason) {
		if (!serialized) return;
		try {
			localStorage.setItem(QUARANTINE_KEY$2, JSON.stringify({
				quarantinedAt: (/* @__PURE__ */ new Date()).toISOString(),
				reason,
				payload: serialized
			}));
		} catch (error) {
			console.error("Impossibile mettere da parte le impostazioni illeggibili.", error);
		}
	}
	function getSettings() {
		return settings;
	}
	function initSettings() {
		const audioToggle = document.getElementById("settings-audio");
		const speedSelect = document.getElementById("settings-animation-speed");
		const status = document.getElementById("settings-status");
		let record = {
			settings: { ...DEFAULTS },
			version: SETTINGS_VERSION,
			extras: {}
		};
		let warning = "";
		try {
			const serialized = localStorage.getItem(STORAGE_KEY$2);
			const parsed = readSettingsPayload(serialized);
			if (!parsed.ok) {
				quarantineSettings(serialized, parsed.reason);
				warning = "Impostazioni salvate illeggibili; uso i valori predefiniti. La copia precedente è stata messa da parte.";
			} else record = parsed;
		} catch (error) {
			console.error("Impossibile leggere le impostazioni salvate.", error);
			warning = "Impostazioni salvate illeggibili; uso i valori predefiniti.";
		}
		settings = { ...record.settings };
		function persist(announce) {
			settings = {
				audio: audioToggle.checked,
				animationSpeed: Number(speedSelect.value)
			};
			document.documentElement.style.setProperty("--animation-duration", `${settings.animationSpeed * 180}ms`);
			try {
				localStorage.setItem(STORAGE_KEY$2, serializeSettingsRecord(record.version, settings, record.extras));
				if (announce) status.textContent = "Impostazioni salvate.";
			} catch (error) {
				status.textContent = `Impossibile salvare le impostazioni: ${error.message}`;
				console.error("Impossibile salvare le impostazioni.", error);
			}
		}
		audioToggle.checked = settings.audio;
		speedSelect.value = String(settings.animationSpeed);
		if (warning) status.textContent = warning;
		persist(false);
		audioToggle.addEventListener("change", () => persist(true));
		speedSelect.addEventListener("change", () => persist(true));
	}
	//#endregion
	//#region src/engine/logger.js
	const Logger = {
		clear() {
			const logEl = document.getElementById("log");
			if (logEl) logEl.replaceChildren();
		},
		log(message, type = "") {
			const logEl = document.getElementById("log");
			if (!logEl) return;
			const line = document.createElement("div");
			line.textContent = `> ${message}`;
			if (type === "ferocity") line.style.color = "#ff2a6d";
			logEl.appendChild(line);
			while (logEl.children.length > 100) logEl.firstElementChild.remove();
			logEl.scrollTop = logEl.scrollHeight;
		}
	};
	//#endregion
	//#region src/engine/fx.js
	const FX = {
		audio: null,
		tone(freq, type, duration) {
			const AudioCtor = window.AudioContext || window.webkitAudioContext;
			if (!AudioCtor) return;
			try {
				this.audio ||= new AudioCtor();
				if (this.audio.state === "suspended") this.audio.resume();
				const oscillator = this.audio.createOscillator();
				const gain = this.audio.createGain();
				oscillator.type = type;
				oscillator.frequency.setValueAtTime(freq, this.audio.currentTime);
				gain.gain.setValueAtTime(.08, this.audio.currentTime);
				gain.gain.exponentialRampToValueAtTime(.01, this.audio.currentTime + duration);
				oscillator.connect(gain);
				gain.connect(this.audio.destination);
				oscillator.start();
				oscillator.stop(this.audio.currentTime + duration);
			} catch (error) {
				Logger.log(`Audio non disponibile: ${error.message}`);
			}
		},
		play(kind) {
			if (!getSettings().audio) return;
			if (kind === "draw") this.tone(400, "sine", .1);
			if (kind === "play") this.tone(600, "square", .12);
			if (kind === "attack") this.tone(150, "sawtooth", .2);
		}
	};
	//#endregion
	//#region src/commanders.js
	const COMMANDERS = [
		{
			id: "cmd-1-01",
			name: "Kragor, Signore della Furia Vulcanica",
			setId: "set-1",
			pc: 20,
			provisional: true,
			rifornimento: {
				text: "Istinto del Branco: se controlli meno Unità dell'avversario, le tue Unità in Linea ottengono +1 Forza durante la Fase di Scontro.",
				ops: [{
					type: "note",
					amount: 1
				}]
			},
			activation: {
				name: "Abilità attiva",
				text: "Una volta per turno, costo 2: scegli un tuo Fronte. Fino alla fine del turno, l'Unità in Linea ottiene Ferocia (se l'ha già, ottiene +1 Forza).",
				cost: { domains: 2 },
				ops: [{
					type: "grantFerocity",
					amount: 1
				}]
			}
		},
		{
			id: "cmd-2-01",
			name: "Malakor, Arconte del Tormento",
			setId: "set-2",
			pc: 20,
			provisional: true,
			rifornimento: {
				text: "Maledizione dell'Erebo: quando un effetto Tormento danneggia il Comandante avversario, pesca 1 carta se controlli una Linea.",
				ops: [{
					type: "note",
					amount: 1
				}]
			},
			activation: {
				name: "Abilità attiva",
				text: "Una volta per turno, costo 2: una tua Unità in Linea ottiene Logorare (se ce l'ha già, la Linea avversaria perde 1 Forza).",
				cost: { domains: 2 },
				ops: [{
					type: "grantLogorare",
					amount: 1
				}]
			}
		},
		{
			id: "cmd-3-01",
			name: "Xylar, Mente Suprema dello Sciame",
			setId: "set-3",
			pc: 20,
			provisional: true,
			rifornimento: {
				text: "Crea una pedina Sciame con Forza 1 in Supporto oppure metti 1 segnalino Parassita sul Comandante avversario.",
				ops: [{
					type: "swarmOrParasite",
					amount: 1
				}]
			},
			activation: {
				name: "Abilità attiva",
				text: "Una volta per turno, paga 2 Domini attivi: un'Unità con Mente Collettiva ottiene +2 Forza fino alla fine dello Scontro e applica 1 Parassita.",
				cost: { domains: 2 },
				ops: [{
					type: "collectiveBurst",
					amount: 1
				}]
			}
		},
		{
			id: "cmd-4-01",
			name: "Aurelius, l'Imperatore Celeste",
			setId: "set-4",
			pc: 20,
			provisional: true,
			rifornimento: {
				text: "All'inizio del tuo turno, pesca 1 carta.",
				ops: [{
					type: "drawArmy",
					amount: 1
				}]
			},
			activation: {
				name: "Abilità attiva",
				text: "Una volta per turno, costo 2 PC: un'Unità idonea subisce Ascensione; altrimenti infliggi 1 segnalino Tormento a un Comandante avversario.",
				cost: { pc: 2 },
				ops: [{
					type: "ascendOrTorment",
					amount: 1
				}]
			}
		}
	];
	const KNOWN_OPS = /* @__PURE__ */ new Set([
		"gainEcho",
		"addMadness",
		"addParasite",
		"drawArmy",
		"announce",
		"note",
		"swarmOrParasite",
		"grantFerocity",
		"grantLogorare",
		"collectiveBurst",
		"ascendOrTorment"
	]);
	const KNOWN_CONDITIONS = /* @__PURE__ */ new Set(["madnessAtMost"]);
	const SELF_OPS = /* @__PURE__ */ new Set([
		"gainEcho",
		"drawArmy",
		"announce",
		"note",
		"swarmOrParasite",
		"grantFerocity",
		"grantLogorare",
		"collectiveBurst",
		"ascendOrTorment"
	]);
	function listCommanders() {
		return COMMANDERS.map((commander) => ({
			id: commander.id,
			name: commander.name,
			setId: commander.setId,
			pc: commander.pc,
			provisional: commander.provisional === true
		}));
	}
	function getCommander(id) {
		return COMMANDERS.find((commander) => commander.id === id) || null;
	}
	function defaultCommanderId() {
		return COMMANDERS[0]?.id || null;
	}
	function commanderForSet(setId) {
		const match = COMMANDERS.find((commander) => commander.setId === setId) || COMMANDERS[0];
		return match ? match.id : null;
	}
	function conditionMet(condition, self) {
		if (condition.type === "madnessAtMost") return (self?.follia ?? 0) <= condition.value;
		return false;
	}
	function evaluateCommanderAbility(ability, { self } = {}) {
		if (!ability) return {
			ok: false,
			reason: "missing-ability",
			effects: []
		};
		if (ability.condition) {
			if (!KNOWN_CONDITIONS.has(ability.condition.type)) return {
				ok: false,
				reason: "unsupported-condition",
				effects: []
			};
			if (!conditionMet(ability.condition, self)) return {
				ok: false,
				reason: "condition-not-met",
				effects: []
			};
		}
		const ops = ability.ops || [];
		if (ops.length === 0) return {
			ok: false,
			reason: "missing-ops",
			effects: []
		};
		const effects = [];
		for (const op of ops) {
			if (!KNOWN_OPS.has(op.type)) return {
				ok: false,
				reason: `unsupported-op:${op.type}`,
				effects: []
			};
			if (!Number.isFinite(op.amount) || op.amount <= 0) return {
				ok: false,
				reason: "invalid-amount",
				effects: []
			};
			const target = op.target || (SELF_OPS.has(op.type) ? "self" : "opponent");
			if (target !== "self" && target !== "opponent") return {
				ok: false,
				reason: "invalid-target",
				effects: []
			};
			effects.push({
				kind: op.type,
				target,
				amount: op.amount
			});
		}
		return {
			ok: true,
			effects
		};
	}
	//#endregion
	//#region src/pixel-art.js
	const PALETTES = {
		"set-1": {
			sky: "#301a3c",
			light: "#f5d300",
			ground: "#8b3f34",
			shadow: "#180f27",
			creature: "#ee7652"
		},
		"set-2": {
			sky: "#171d3d",
			light: "#05d9e8",
			ground: "#464b70",
			shadow: "#0c1228",
			creature: "#9da9d6"
		},
		"set-3": {
			sky: "#103339",
			light: "#75f2bd",
			ground: "#345e46",
			shadow: "#0a1d25",
			creature: "#b9eb91"
		},
		"set-4": {
			sky: "#1b2448",
			light: "#f3e6b3",
			ground: "#6d5a32",
			shadow: "#10162e",
			creature: "#f7f1dc"
		}
	};
	const CACHE_LIMIT = 48;
	const artCache = /* @__PURE__ */ new Map();
	function hashText(text) {
		let hash = 2166136261;
		for (const character of text) {
			hash ^= character.codePointAt(0);
			hash = Math.imul(hash, 16777619);
		}
		return hash >>> 0;
	}
	function randomFrom(seed) {
		let state = seed || 1;
		return () => {
			state ^= state << 13;
			state ^= state >>> 17;
			state ^= state << 5;
			return (state >>> 0) / 4294967296;
		};
	}
	function createBuffer(width, height) {
		if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
		if (typeof document !== "undefined" && typeof document.createElement === "function") {
			const buffer = document.createElement("canvas");
			buffer.width = width;
			buffer.height = height;
			return buffer;
		}
		return null;
	}
	function paint(context, card, width, height) {
		const palette = PALETTES[card.setId] || PALETTES["set-1"];
		const random = randomFrom(hashText(card.catalogId || card.id));
		context.imageSmoothingEnabled = false;
		context.fillStyle = palette.sky;
		context.fillRect(0, 0, width, height);
		context.fillStyle = palette.light;
		context.fillRect(48 + Math.floor(random() * 7), 5 + Math.floor(random() * 5), 7, 7);
		for (let i = 0; i < 16; i++) {
			context.fillStyle = i % 3 === 0 ? palette.light : "#b8c1e0";
			context.fillRect(Math.floor(random() * width), Math.floor(random() * 25), 1, 1);
		}
		context.fillStyle = palette.shadow;
		context.fillRect(0, 34, width, 14);
		context.fillStyle = palette.ground;
		context.fillRect(0, 39, width, 9);
		if (card.category !== "unit") {
			context.fillStyle = palette.creature;
			if (card.category === "tactic") {
				context.fillRect(34, 11, 7, 6);
				context.fillRect(29, 17, 8, 6);
				context.fillRect(25, 23, 8, 6);
				context.fillRect(22, 29, 8, 7);
				context.fillStyle = palette.light;
				context.fillRect(35, 12, 4, 3);
				context.fillRect(30, 18, 4, 3);
				context.fillRect(26, 24, 4, 3);
			} else if (card.category === "equipment") {
				context.fillRect(31, 9, 6, 22);
				context.fillRect(27, 29, 14, 4);
				context.fillRect(32, 33, 4, 8);
				context.fillStyle = palette.light;
				context.fillRect(32, 11, 4, 17);
			} else if (card.category === "site") {
				context.fillRect(18, 21, 28, 18);
				context.fillRect(22, 15, 6, 7);
				context.fillRect(30, 15, 6, 7);
				context.fillRect(38, 15, 6, 7);
				context.fillStyle = palette.shadow;
				context.fillRect(29, 29, 7, 10);
				context.fillRect(22, 25, 4, 4);
				context.fillRect(38, 25, 4, 4);
			} else {
				context.fillRect(11, 31, 18, 12);
				context.fillRect(25, 24, 20, 19);
				context.fillRect(39, 29, 15, 14);
				context.fillStyle = palette.light;
				context.fillRect(30, 28, 5, 3);
				context.fillRect(44, 33, 4, 3);
			}
			return;
		}
		const center = 31 + Math.floor(random() * 5);
		context.fillStyle = palette.creature;
		context.fillRect(center - 13, 21, 22, 11);
		context.fillRect(center + 7, 17, 8, 8);
		context.fillRect(center + 11, 19, 7, 4);
		context.fillRect(center - 20, 22, 8, 4);
		context.fillRect(center - 7, 30, 4, 9);
		context.fillRect(center + 3, 30, 4, 9);
		context.fillStyle = palette.shadow;
		context.fillRect(center + 12, 19, 2, 2);
		context.fillRect(center + 15, 22, 3, 1);
		context.fillStyle = palette.light;
		context.fillRect(center - 7, 24, 5, 2);
	}
	function remember(key, buffer) {
		artCache.delete(key);
		artCache.set(key, buffer);
		while (artCache.size > CACHE_LIMIT) artCache.delete(artCache.keys().next().value);
	}
	function drawCardPixelArt(canvas, card) {
		const context = canvas.getContext("2d");
		if (!context) return false;
		const width = canvas.width;
		const height = canvas.height;
		const key = `${card.catalogId || card.id}|${card.setId || ""}|${card.category || ""}|${width}x${height}`;
		context.imageSmoothingEnabled = false;
		let buffer = artCache.get(key);
		if (buffer) remember(key, buffer);
		else {
			buffer = createBuffer(width, height);
			const bufferContext = buffer?.getContext("2d");
			if (!buffer || !bufferContext) {
				paint(context, card, width, height);
				canvas.setAttribute("aria-label", `Illustrazione pixel art generata per ${card.name}`);
				return true;
			}
			paint(bufferContext, card, width, height);
			remember(key, buffer);
		}
		context.drawImage(buffer, 0, 0);
		canvas.setAttribute("aria-label", `Illustrazione pixel art generata per ${card.name}`);
		return true;
	}
	//#endregion
	//#region src/save-store.js
	const STORAGE_KEY$1 = "primal-ruin.game-save.v1";
	const QUARANTINE_KEY$1 = "primal-ruin.game-save.quarantine";
	const SAVE_VERSION = 3;
	function showSaveStatus(message) {
		if (typeof document === "undefined") return;
		const status = document.getElementById("save-status");
		if (status) status.textContent = message;
	}
	function quarantineSave(serialized, reason) {
		if (!serialized) return;
		try {
			localStorage.setItem(QUARANTINE_KEY$1, JSON.stringify({
				quarantinedAt: (/* @__PURE__ */ new Date()).toISOString(),
				reason,
				payload: serialized
			}));
		} catch (error) {
			console.error("Impossibile mettere da parte il salvataggio illeggibile.", error);
		}
	}
	function isRecord(value) {
		return Boolean(value) && typeof value === "object" && !Array.isArray(value);
	}
	function isCardRecord(card) {
		return isRecord(card) && Array.isArray(card.keywords);
	}
	function isPlayableCard(card) {
		return isCardRecord(card) && (card.category !== "unit" || typeof card.rulesText === "string");
	}
	function isDomainRecord(domain) {
		return isRecord(domain) && typeof domain.name === "string" && typeof domain.tapped === "boolean";
	}
	function playerIsValid(player) {
		if (!isRecord(player)) return false;
		const piles = [
			player.armyDeck,
			player.hand,
			player.discard,
			player.exile
		];
		return Number.isFinite(player.pc) && player.pc >= 0 && player.pc <= 20 && Number.isInteger(player.follia) && player.follia >= 0 && player.follia <= 10 && Number.isInteger(player.echo) && player.echo >= 0 && typeof player.commanderId === "string" && player.commanderId.length > 0 && typeof player.commanderAbilityUsed === "boolean" && piles.every((pile) => Array.isArray(pile) && pile.every(isPlayableCard)) && Array.isArray(player.domainDeck) && player.domainDeck.every(isDomainRecord) && Array.isArray(player.domains) && player.domains.every(isDomainRecord) && (player.sites === void 0 || Array.isArray(player.sites) && player.sites.every(isCardRecord)) && (player.field == null || isCardRecord(player.field)) && isRecord(player.fronts) && [
			"left",
			"center",
			"right"
		].every((front) => stateFrontIsValid(player.fronts[front]));
	}
	function snapshotIsValid(state) {
		return isRecord(state) && Array.isArray(state.players) && state.players.length === 2 && state.players.every(playerIsValid) && Number.isInteger(state.currentIndex) && [0, 1].includes(state.currentIndex) && [
			"setup",
			"rifornimento",
			"principale",
			"scontro",
			"finale",
			"gameover"
		].includes(state.phase) && Number.isInteger(state.turnNumber) && state.turnNumber >= 0 && Number.isInteger(state.firstPlayerIndex) && [0, 1].includes(state.firstPlayerIndex) && typeof state.firstTurn === "boolean" && Array.isArray(state.sorvoloUsed) && Number.isInteger(state.randomState) && state.randomState > 0 && state.randomState <= 4294967295;
	}
	function migrateSave(save, version) {
		try {
			localStorage.setItem(STORAGE_KEY$1, JSON.stringify({
				...save,
				version: SAVE_VERSION,
				migratedFrom: version
			}));
			showSaveStatus(`Salvataggio aggiornato dalla versione ${version}.`);
		} catch (error) {
			showSaveStatus(`Salvataggio letto (versione ${version}), ma l'aggiornamento non è stato scritto: ${error.message}`);
			console.error("Impossibile aggiornare il salvataggio locale.", error);
		}
	}
	function persistGame(snapshot) {
		try {
			localStorage.setItem(STORAGE_KEY$1, JSON.stringify({
				version: SAVE_VERSION,
				savedAt: (/* @__PURE__ */ new Date()).toISOString(),
				snapshot
			}));
			showSaveStatus(`Partita salvata alle ${(/* @__PURE__ */ new Date()).toLocaleTimeString("it-IT")}.`);
		} catch (error) {
			showSaveStatus(`Salvataggio partita non riuscito: ${error.message}`);
			console.error("Impossibile salvare lo stato della partita.", error);
		}
	}
	function loadGameSave() {
		let serialized;
		try {
			serialized = localStorage.getItem(STORAGE_KEY$1);
		} catch (error) {
			showSaveStatus(`Lettura del salvataggio non riuscita: ${error.message}`);
			console.error("Impossibile leggere il salvataggio locale.", error);
			return null;
		}
		if (!serialized) return null;
		let save;
		try {
			save = JSON.parse(serialized);
		} catch (error) {
			quarantineSave(serialized, "json");
			showSaveStatus("Il salvataggio è illeggibile ed è stato messo da parte. Verrà avviata una nuova partita.");
			console.error("Il salvataggio della partita non è JSON valido.", error);
			return null;
		}
		const state = save?.snapshot;
		const version = (Number.isInteger(save?.version) ? save.version : null) ?? 0;
		if (version > SAVE_VERSION) {
			quarantineSave(serialized, "future");
			showSaveStatus("Il salvataggio è di una versione più nuova e non può essere aperto. È stato messo da parte.");
			console.error("Il salvataggio della partita è incompleto o incompatibile.");
			return null;
		}
		if (!snapshotIsValid(state)) {
			quarantineSave(serialized, "invalid");
			showSaveStatus("Il salvataggio è incompatibile o incompleto ed è stato messo da parte. Verrà avviata una nuova partita.");
			console.error("Il salvataggio della partita è incompleto o incompatibile.");
			return null;
		}
		if (version < SAVE_VERSION) migrateSave(save, version);
		return state;
	}
	function stateFrontIsValid(front) {
		return isRecord(front) && [
			"line",
			"supA",
			"supB"
		].every((slot) => front[slot] === null || isCardRecord(front[slot]));
	}
	function clearGameSave() {
		try {
			localStorage.removeItem(STORAGE_KEY$1);
		} catch (error) {
			showSaveStatus(`Eliminazione del salvataggio non riuscita: ${error.message}`);
			console.error("Impossibile rimuovere il salvataggio locale.", error);
		}
	}
	//#endregion
	//#region src/deck-validation.js
	function validateDeckIds(cardIds, knownCardIds) {
		if (!Array.isArray(cardIds) || cardIds.length !== 40) return {
			valid: false,
			message: `Il mazzo deve contenere 40 carte (ora: ${cardIds?.length ?? 0}).`
		};
		const unknownCard = cardIds.find((id) => !knownCardIds.has(id));
		if (unknownCard) return {
			valid: false,
			message: `Carta sconosciuta nel mazzo: ${unknownCard}.`
		};
		return {
			valid: true,
			message: "Mazzo valido: 40 carte."
		};
	}
	//#endregion
	//#region src/deck-builder.js
	const STORAGE_KEY = "primal-ruin.custom-deck.v1";
	const QUARANTINE_KEY = "primal-ruin.custom-deck.quarantine";
	const DECK_VERSION = 1;
	const cardsById = new Map(cards.map((card) => [card.id, card]));
	const preparedCards = new Map(cards.map((card) => [card.id, {
		searchText: `${card.name} ${card.type || ""} ${card.rulesText} ${tacticTiming(card) === "instant" ? "istantanea" : tacticTiming(card) === "standard" ? "standard" : ""}`.toLocaleLowerCase("it"),
		executionStatus: getCardExecutionStatus(card)
	}]));
	const CATEGORY_LABELS$1 = {
		unit: "Unità",
		tactic: "Tattica",
		equipment: "Equipaggiamento",
		site: "Sito",
		field: "Campo"
	};
	function validateDeck(cardIds) {
		return validateDeckIds(cardIds, cardsById);
	}
	function quarantineDeck(serialized, reason) {
		if (!serialized) return;
		try {
			localStorage.setItem(QUARANTINE_KEY, JSON.stringify({
				quarantinedAt: (/* @__PURE__ */ new Date()).toISOString(),
				reason,
				payload: serialized
			}));
		} catch (error) {
			console.error("Impossibile mettere da parte il mazzo illeggibile.", error);
		}
	}
	function loadCustomDeck() {
		let serialized;
		try {
			serialized = localStorage.getItem(STORAGE_KEY);
		} catch (error) {
			console.error("Impossibile leggere il mazzo salvato.", error);
			return null;
		}
		if (!serialized) return null;
		let stored;
		try {
			stored = JSON.parse(serialized);
		} catch (error) {
			quarantineDeck(serialized, "json");
			console.error("Il mazzo salvato non è JSON valido.", error);
			return null;
		}
		const legacyList = Array.isArray(stored);
		const cardIds = legacyList ? stored : stored?.cardIds;
		const version = legacyList ? DECK_VERSION : stored?.version;
		if (!Number.isInteger(version) || version < 1) {
			quarantineDeck(serialized, "version");
			console.error("Il mazzo salvato ha una versione non riconosciuta.");
			return null;
		}
		const validation = validateDeck(cardIds);
		if (!validation.valid) {
			quarantineDeck(serialized, "invalid");
			console.error(`Il mazzo salvato non è valido: ${validation.message}`);
			return null;
		}
		return cardIds;
	}
	function saveCustomDeck(cardIds) {
		const validation = validateDeck(cardIds);
		if (!validation.valid) throw new Error(validation.message);
		let previous = null;
		try {
			const serialized = localStorage.getItem(STORAGE_KEY);
			if (serialized) try {
				previous = JSON.parse(serialized);
			} catch {
				quarantineDeck(serialized, "json");
			}
		} catch {
			previous = null;
		}
		const extras = previous && typeof previous === "object" && !Array.isArray(previous) ? Object.fromEntries(Object.entries(previous).filter(([key]) => key !== "version" && key !== "cardIds")) : {};
		const version = Number.isInteger(previous?.version) && previous.version >= DECK_VERSION ? previous.version : DECK_VERSION;
		localStorage.setItem(STORAGE_KEY, JSON.stringify({
			version,
			...extras,
			cardIds
		}));
	}
	function clearCustomDeck() {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			console.error("Impossibile rimuovere il mazzo personalizzato.", error);
			throw error;
		}
	}
	function initDeckBuilder(onUseDeck) {
		const root = document.getElementById("deck-builder");
		const setFilter = document.getElementById("builder-set");
		const categoryFilter = document.getElementById("builder-category");
		const searchInput = document.getElementById("builder-search");
		const catalogList = document.getElementById("builder-catalog");
		const deckList = document.getElementById("builder-deck");
		const count = document.getElementById("builder-count");
		const status = document.getElementById("builder-status");
		const saveButton = document.getElementById("builder-save");
		const useButton = document.getElementById("builder-use");
		let cardIds = loadCustomDeck() || [];
		function render() {
			const search = searchInput.value.trim().toLocaleLowerCase("it");
			const visibleCards = cards.filter((card) => {
				if (card.category === "commander") return false;
				if (setFilter.value !== "all" && card.setId !== setFilter.value) return false;
				if (categoryFilter.value !== "all" && card.category !== categoryFilter.value) return false;
				return !search || preparedCards.get(card.id).searchText.includes(search);
			});
			catalogList.replaceChildren();
			for (const card of visibleCards) {
				const row = document.createElement("div");
				row.className = "builder-card";
				const details = document.createElement("span");
				const execution = preparedCards.get(card.id).executionStatus;
				const speed = tacticTiming(card);
				const kind = speed ? `Tattica ${speed === "instant" ? "Istantanea" : "Standard"}` : CATEGORY_LABELS$1[card.category];
				details.textContent = `${card.name} · ${kind} · costo ${card.cost} · ${execution.label}`;
				const add = document.createElement("button");
				add.type = "button";
				add.className = "btn builder-add";
				add.textContent = "Aggiungi";
				add.setAttribute("aria-label", `Aggiungi ${card.name} al mazzo`);
				add.disabled = cardIds.length >= 40;
				add.addEventListener("click", () => {
					if (cardIds.length >= 40) return;
					cardIds.push(card.id);
					render();
				});
				row.append(details, add);
				catalogList.appendChild(row);
			}
			const counts = /* @__PURE__ */ new Map();
			cardIds.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
			deckList.replaceChildren();
			for (const [id, quantity] of counts) {
				const card = cardsById.get(id);
				const row = document.createElement("div");
				row.className = "builder-card";
				const details = document.createElement("span");
				details.textContent = `${quantity}× ${card.name}`;
				const remove = document.createElement("button");
				remove.type = "button";
				remove.className = "btn builder-remove";
				remove.textContent = "Rimuovi";
				remove.setAttribute("aria-label", `Rimuovi una copia di ${card.name} dal mazzo`);
				remove.addEventListener("click", () => {
					const index = cardIds.lastIndexOf(id);
					if (index >= 0) cardIds.splice(index, 1);
					render();
				});
				row.append(details, remove);
				deckList.appendChild(row);
			}
			const validation = validateDeck(cardIds);
			const unsupportedCount = cardIds.reduce((count, id) => count + Number(preparedCards.get(id).executionStatus.label === "Non eseguibile"), 0);
			count.textContent = `${cardIds.length}/40 carte`;
			status.textContent = validation.valid && unsupportedCount > 0 ? `${validation.message} Avviso: ${unsupportedCount} carte hanno effetti non giocabili in questa build.` : validation.message;
			status.classList.toggle("valid", validation.valid);
			status.classList.toggle("warning", validation.valid && unsupportedCount > 0);
			saveButton.disabled = !validation.valid;
			useButton.disabled = !validation.valid;
		}
		let searchTimer = 0;
		for (const control of [setFilter, categoryFilter]) control.addEventListener("change", render);
		searchInput.addEventListener("input", () => {
			clearTimeout(searchTimer);
			searchTimer = setTimeout(render, 150);
		});
		saveButton.addEventListener("click", () => {
			try {
				saveCustomDeck(cardIds);
				status.textContent = "Mazzo salvato in questo browser.";
			} catch (error) {
				status.textContent = `Salvataggio non riuscito: ${error.message}`;
				console.error("Impossibile salvare il mazzo personalizzato.", error);
			}
		});
		useButton.addEventListener("click", async () => {
			const validation = validateDeck(cardIds);
			if (!validation.valid) {
				status.textContent = validation.message;
				return;
			}
			try {
				saveCustomDeck(cardIds);
				await onUseDeck([...cardIds]);
			} catch (error) {
				status.textContent = `Impossibile usare il mazzo: ${error.message}`;
				console.error("Impossibile avviare una partita con il mazzo personalizzato.", error);
			}
		});
		root.addEventListener("toggle", render);
		document.addEventListener("primal-ruin:demo-decks", () => {
			cardIds = [];
			render();
		});
		render();
	}
	//#endregion
	//#region src/random.js
	let state = 1;
	function seedRandom(seed) {
		if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new RangeError("Il seme casuale deve essere un intero unsigned a 32 bit.");
		state = seed || 1;
	}
	function nextRandom() {
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		state >>>= 0;
		return state / 4294967296;
	}
	function getRandomState() {
		return state;
	}
	function restoreRandomState(savedState) {
		seedRandom(savedState);
	}
	//#endregion
	//#region src/deck-composition.js
	const ARMY_DECK_COMPOSITION = {
		unit: 22,
		tactic: 12,
		equipment: 4,
		site: 1,
		field: 1
	};
	const ARMY_COST_QUOTAS = [
		11,
		15,
		10,
		4
	];
	function costBand(cost) {
		if (cost <= 2) return 0;
		if (cost <= 4) return 1;
		if (cost <= 6) return 2;
		return 3;
	}
	function shuffled$1(items) {
		const result = [...items];
		for (let i = result.length - 1; i > 0; i--) {
			const j = Math.floor(nextRandom() * (i + 1));
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result;
	}
	function planAllocation(supplies, need, quotas) {
		const categories = Object.keys(need);
		const SOURCE = "source";
		const SINK = "sink";
		const bandNode = (band) => `band:${band}`;
		const edges = [];
		const addEdge = (from, to, capacity) => {
			const forward = {
				from,
				to,
				capacity,
				flow: 0
			};
			const backward = {
				from: to,
				to: from,
				capacity: 0,
				flow: 0
			};
			forward.reverse = backward;
			backward.reverse = forward;
			edges.push(forward, backward);
			return forward;
		};
		for (const category of categories) addEdge(SOURCE, category, need[category]);
		for (let band = 0; band < quotas.length; band++) addEdge(bandNode(band), SINK, quotas[band]);
		const cellEdge = /* @__PURE__ */ new Map();
		for (const category of categories) for (let band = 0; band < quotas.length; band++) cellEdge.set(`${category}:${band}`, addEdge(category, bandNode(band), supplies[category][band].length));
		const target = quotas.reduce((sum, quota) => sum + quota, 0);
		let flow = 0;
		while (flow < target) {
			const parent = /* @__PURE__ */ new Map([[SOURCE, null]]);
			const queue = [SOURCE];
			while (queue.length > 0 && !parent.has(SINK)) {
				const node = queue.shift();
				for (const edge of edges) {
					if (edge.from !== node || edge.flow >= edge.capacity) continue;
					if (parent.has(edge.to)) continue;
					parent.set(edge.to, edge);
					queue.push(edge.to);
				}
			}
			if (!parent.has(SINK)) break;
			let bottleneck = Infinity;
			for (let node = SINK; parent.get(node);) {
				const edge = parent.get(node);
				bottleneck = Math.min(bottleneck, edge.capacity - edge.flow);
				node = edge.from;
			}
			for (let node = SINK; parent.get(node);) {
				const edge = parent.get(node);
				edge.flow += bottleneck;
				edge.reverse.flow -= bottleneck;
				node = edge.from;
			}
			flow += bottleneck;
		}
		return {
			exact: flow >= target,
			allocation: Object.fromEntries(categories.map((category) => [category, quotas.map((unused, band) => cellEdge.get(`${category}:${band}`).flow)]))
		};
	}
	/**
	* Compone il Mazzo Esercito pescando dalle `cards` fornite (le carte di un set)
	* secondo la composizione per categoria e la curva dei costi richieste.
	*
	* Se il set non copre tutti gli intervalli della curva (set ristretti) la curva
	* viene approssimata e `exact` è `false`, ma la composizione per categoria resta
	* sempre garantita. Le carte sono mescolate con il PRNG condiviso, quindi la
	* selezione è casuale ma riproducibile sotto seme.
	*
	* @param {Array<object>} cards
	* @param {{ composition?: object, quotas?: number[], label?: string }} [options]
	* @returns {{ cards: Array<object>, exact: boolean }}
	*/
	function composeArmyDeck(cards, { composition = ARMY_DECK_COMPOSITION, quotas = ARMY_COST_QUOTAS, label = "indicato" } = {}) {
		const supplies = {};
		for (const [category, need] of Object.entries(composition)) {
			const pool = cards.filter((card) => card.category === category);
			if (pool.length < need) throw new Error(`Il set ${label} ha solo ${pool.length} carte "${category}": ne servono ${need}.`);
			const bands = quotas.map(() => []);
			for (const card of shuffled$1(pool)) bands[costBand(card.cost ?? 0)].push(card);
			supplies[category] = bands;
		}
		const { allocation, exact } = planAllocation(supplies, composition, quotas);
		const picks = [];
		for (const [category, need] of Object.entries(composition)) {
			let missing = need;
			for (let band = 0; band < quotas.length; band++) {
				const taken = allocation[category][band];
				for (let index = 0; index < taken; index++) picks.push(supplies[category][band].pop());
				missing -= taken;
			}
			for (let band = 0; band < quotas.length && missing > 0; band++) while (missing > 0 && supplies[category][band].length > 0) {
				picks.push(supplies[category][band].pop());
				missing--;
			}
		}
		return {
			cards: picks,
			exact
		};
	}
	const UPDATED_MATCH_DECK = [
		"set-2-079",
		"set-2-080",
		"set-2-081",
		"set-2-082",
		"set-2-083",
		"set-2-084",
		"set-2-085",
		"set-2-086",
		"set-2-087",
		"set-2-088",
		"set-2-089",
		"set-2-090",
		"set-3-081",
		"set-3-082",
		"set-3-083",
		"set-3-084",
		"set-3-085",
		"set-3-086",
		"set-3-087",
		"set-3-088",
		"set-2-100",
		"set-2-108",
		"set-3-099",
		"set-3-107",
		"set-3-108",
		"set-3-109",
		"set-3-112",
		"set-3-113",
		"set-3-115",
		"set-3-116",
		"set-3-117",
		"set-3-118",
		"set-3-119",
		"set-3-001",
		"set-3-001",
		"set-3-004",
		"set-1-003",
		"set-1-004",
		"set-2-002",
		"set-2-003"
	];
	//#endregion
	//#region src/engine/cards.js
	const KEYWORD_PATTERNS = [
		/Ferocia/i,
		/Assalto/i,
		/Sorvolo/i,
		/Mente Collettiva/i,
		/Posizione Difensiva/i,
		/Logorare(?:\s*\(\d+\))?/gi,
		/Eco Spettrale/i,
		/Tormento(?:\s*\(\d+\))?/gi,
		/Ascensione(?:\s*\(\d+\)|\s+\d+)?/gi,
		/Infiltrazione(?:\s*\(\d+\))?/gi
	];
	function shuffled(items) {
		const result = [...items];
		for (let i = result.length - 1; i > 0; i--) {
			const j = Math.floor(nextRandom() * (i + 1));
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result;
	}
	function extractKeywords(rulesText = "", typeText = "") {
		const keywords = KEYWORD_PATTERNS.flatMap((pattern) => (rulesText || "").match(pattern) || []);
		if (/Divinità/iu.test(typeText || "") && !keywords.includes("Divinità")) keywords.push("Divinità");
		return keywords;
	}
	function cardIcon(card) {
		if (/dinosauro|raptor|pterosauro/i.test(card.type || "")) return "🦖";
		if (/spettro|non morto/i.test(card.type || "")) return "👻";
		if (/sciame|parassita/i.test(card.type || "")) return "🦠";
		if (/psionico/i.test(card.type || "")) return "🧠";
		if (/drone/i.test(card.type || "")) return "⚙️";
		return "⚔️";
	}
	function makeUnit(card, id, owner) {
		return {
			...card,
			id,
			catalogId: card.id,
			owner,
			icon: cardIcon(card),
			keywords: extractKeywords(card.rulesText, card.type),
			temporaryKeywords: [],
			currentForce: card.force,
			damage: 0,
			damageThisTurn: 0,
			damageShield: 0,
			temporaryForce: 0,
			equipment: null,
			front: null,
			position: null
		};
	}
	function makeCardInstance(card, id, owner) {
		return card.category === "unit" ? makeUnit(card, id, owner) : {
			...card,
			id,
			catalogId: card.id,
			owner,
			keywords: extractKeywords(card.rulesText, card.type)
		};
	}
	function makeDeck(owner, setId, customCardIds = null) {
		if (customCardIds) {
			const cardsById = new Map(CARD_DATA.map((card) => [card.id, card]));
			return shuffled(customCardIds.map((cardId, index) => {
				const card = cardsById.get(cardId);
				if (!card) throw new Error(`Carta sconosciuta nel mazzo: ${cardId}`);
				return makeCardInstance(card, `${owner}-${card.id}-${index}`, owner);
			}));
		}
		const picks = composeArmyDeck(CARD_DATA.filter((card) => card.setId === setId), { label: setId });
		if (!picks.exact) console.warn(`Il set ${setId} non copre tutti gli intervalli della curva dei costi (§2): composizione approssimata.`);
		return shuffled(picks.cards).map((card, index) => makeCardInstance(card, `${owner}-${card.id}-${index}`, owner));
	}
	function makeDomainDeck(owner) {
		const elements = [
			"Fuoco",
			"Acqua",
			"Terra",
			"Aria",
			"Ombra",
			"Luce",
			"Caos",
			"Ordine"
		];
		return shuffled(Array.from({ length: 20 }, (_, index) => ({
			id: `${owner}-domain-${index}`,
			name: `Dominio di ${elements[index % elements.length]}`,
			tapped: false
		})));
	}
	function makePlayer(id, setId, customCardIds = null, commanderId = null) {
		const commander = getCommander(commanderId) || getCommander(defaultCommanderId());
		return {
			id,
			name: commander.name,
			commanderId: commander.id,
			pc: commander.pc,
			follia: 0,
			echo: 0,
			setId,
			armyDeck: makeDeck(id, setId, customCardIds),
			domainDeck: makeDomainDeck(id),
			hand: [],
			discard: [],
			exile: [],
			domains: [],
			sites: [],
			field: null,
			controlledUnits: [],
			fronts: Object.fromEntries(FRONT_NAMES$1.map((front) => [front, {
				line: null,
				supA: null,
				supB: null
			}])),
			parasites: 0,
			commanderAbilityUsed: false,
			tacticEffects: {},
			sacrificeAfterCombat: [],
			tacticsPlayedThisTurn: 0,
			tacticLimitActive: false
		};
	}
	//#endregion
	//#region src/engine/state.js
	const GameState = {
		players: [],
		currentIndex: 0,
		phase: "setup",
		turnNumber: 0,
		firstPlayerIndex: 0,
		firstTurn: true,
		mulliganUsed: false,
		mulliganMarks: /* @__PURE__ */ new Set(),
		selectedCard: null,
		selectedFromDiscard: false,
		gameOver: false,
		sacrifice: null,
		pendingTactic: null,
		pendingTorment: null,
		pendingPromotion: null,
		pendingSorvolo: false,
		reactionWindow: null,
		resolveReactions: false,
		sorvoloUsed: /* @__PURE__ */ new Set(),
		log: [],
		get current() {
			return this.players[this.currentIndex];
		},
		get opponent() {
			return this.players[1 - this.currentIndex];
		},
		reset(customDeckIds = loadCustomDeck()) {
			const randomSeed = /* @__PURE__ */ new Uint32Array(1);
			if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(randomSeed);
			else randomSeed[0] = Date.now() >>> 0;
			seedRandom(randomSeed[0]);
			const playerSetId = document.getElementById("player-set-select")?.value || SETS[0].id;
			const opponentSetId = document.getElementById("opponent-set-select")?.value || SETS[0].id;
			const playerCommanderId = document.getElementById("player-commander-select")?.value || commanderForSet(playerSetId);
			this.players = [makePlayer("player", playerSetId, customDeckIds, playerCommanderId), makePlayer("opponent", opponentSetId, null, commanderForSet(opponentSetId))];
			this.players.forEach((player) => {
				for (let i = 0; i < 5; i++) player.hand.push(player.armyDeck.pop());
				player.domains.push(player.domainDeck.pop(), player.domainDeck.pop());
			});
			this.firstPlayerIndex = nextRandom() < .5 ? 0 : 1;
			this.currentIndex = this.firstPlayerIndex;
			this.phase = "setup";
			this.turnNumber = 0;
			this.firstTurn = true;
			this.mulliganUsed = false;
			this.mulliganMarks = /* @__PURE__ */ new Set();
			this.selectedCard = null;
			this.selectedFromDiscard = false;
			this.gameOver = false;
			this.sacrifice = null;
			this.pendingTactic = null;
			this.pendingTorment = null;
			this.pendingPromotion = null;
			this.pendingSorvolo = false;
			this.reactionWindow = null;
			this.resolveReactions = false;
			this.retreatMode = false;
			this.sorvoloUsed = /* @__PURE__ */ new Set();
			this.log = [];
			Logger.clear();
			Logger.log("Partita preparata: 40 carte Esercito e 20 Domini per giocatore.");
			Logger.log("Mano iniziale: 5 carte. Puoi effettuare un Mulligan prima di iniziare.");
			Logger.log(`${this.players[this.firstPlayerIndex].name} è il primo giocatore.`);
		},
		onEquipmentPositionEntry(player, unit, slotName) {
			const id = unit.equipment?.catalogId || unit.equipment?.id;
			if (id === "set-3-083" && slotName !== "line") GameController.drawCards(player, 1, unit.equipment.name);
			if (id === "set-3-087" && slotName === "line") {
				const opponent = GameState.players[1 - GameState.players.indexOf(player)];
				const target = FRONT_NAMES$1.find((name) => opponent.fronts[name].line);
				if (target) this.applyForceLoss(opponent, target, 1, unit.equipment.name, player);
			}
		},
		onUnitEntry(player, unit, frontName, slotName, fromDiscard = false) {
			this.onEquipmentPositionEntry(player, unit, slotName);
			this.applyCollectiveEntryBonus(player, unit, frontName, slotName);
			if (slotName === "line") for (const site of [...player.sites]) {
				if (site.catalogId !== "set-1-092") continue;
				GameController.drawCards(player, 1, site.name);
				player.sites.splice(player.sites.indexOf(site), 1);
				player.discard.push(site);
				Logger.log(`${site.name} si distrugge dopo l’ingresso in Linea.`);
			}
			const opponent = GameState.players[1 - GameState.players.indexOf(player)];
			for (const effect of getUnitEntryEffects(unit, slotName, fromDiscard)) {
				if (effect.when === "line" && slotName !== "line") continue;
				if (effect.type === "recover-spectral-card") {
					const index = player.discard.findIndex((card) => card.keywords?.some((keyword) => keyword.startsWith("Eco Spettrale")));
					if (index >= 0) {
						const [recovered] = player.discard.splice(index, 1);
						player.hand.push(recovered);
						Logger.log(`${unit.name}: ${recovered.name} torna nella tua mano.`);
					}
				} else if (effect.type === "recover-unit-cost-at-most") {
					const index = player.discard.findIndex((card) => card.category === "unit" && card.cost <= effect.cost);
					if (index >= 0) {
						const [recovered] = player.discard.splice(index, 1);
						player.hand.push(recovered);
						Logger.log(`${unit.name}: ${recovered.name} torna nella tua mano.`);
					}
				} else if (effect.type === "add-opponent-parasite") this.addParasites(player, opponent, effect.amount);
				else if (effect.type === "destroy-enemy-support-in-front") {
					const targetSlot = ["supA", "supB"].find((slot) => opponent.fronts[frontName][slot] && !opponent.fronts[frontName][slot].keywords.includes("Divinità"));
					if (targetSlot) CombatResolver.destroyUnit(opponent, frontName, targetSlot, "effect-destroy");
				} else if (effect.type === "create-support-token") {
					const targetSlot = ["supA", "supB"].find((slot) => !player.fronts[frontName][slot]);
					if (targetSlot) createToken(player, frontName, targetSlot, "Pedina Sciame", effect.force);
				} else if (effect.type === "weaken-enemy-line-in-front" && opponent.fronts[frontName].line) this.applyForceLoss(opponent, frontName, effect.amount, unit.name, player);
			}
			const parasites = (player.sites || []).filter((site) => ["set-3-083", "set-3-098"].includes(site.catalogId)).length;
			if (parasites > 0) this.addParasites(player, opponent, parasites);
			if (fromDiscard && unit.keywords.includes("Eco Spettrale") && player.sites?.some((site) => site.catalogId === "set-2-087")) GameController.drawCards(player, 1, "Altare della Putrefazione");
			if (slotName !== "line" && player.sites?.some((site) => site.catalogId === "set-3-097")) this.triggerSiteSupportMove(player, frontName);
		},
		applyCollectiveEntryBonus(player, unit, frontName, slotName) {
			if (unit.catalogId !== "set-3-049" || slotName !== "line" || !getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Mente Collettiva"))) return;
			const bonus = Math.min(3, Math.max(0, this.countCollective(player) - 1));
			if (!bonus) return;
			unit.force += bonus;
			unit.currentForce += bonus;
			Logger.log(`${unit.name}: ottiene +${bonus} Forza per le altre Unità con Mente Collettiva.`);
		},
		triggerSiteSupportMove(player, frontName) {
			const opponent = GameState.players[1 - GameState.players.indexOf(player)];
			const sourceIndex = FRONT_NAMES$1.indexOf(frontName);
			const choices = ["supA", "supB"].filter((slot) => opponent.fronts[frontName][slot] && !isProtectedFromEnemyMovement(opponent, opponent.fronts[frontName][slot], frontName)).flatMap((slot) => {
				const target = opponent.fronts[frontName][slot];
				return [sourceIndex - 1, sourceIndex + 1].filter((index) => FRONT_NAMES$1[index]).flatMap((index) => ["supA", "supB"].filter((targetSlot) => !opponent.fronts[FRONT_NAMES$1[index]][targetSlot]).map((targetSlot) => ({
					label: `${target.name} · ${FRONT_LABELS$1[frontName]} → ${FRONT_LABELS$1[FRONT_NAMES$1[index]]} Supporto`,
					value: {
						sourceFront: frontName,
						sourceSlot: slot,
						targetUnitId: target.id,
						targetFront: FRONT_NAMES$1[index],
						targetSlot
					}
				})));
			});
			if (!choices.length) return;
			const site = player.sites.find((item) => item.catalogId === "set-3-097");
			if (player !== GameState.players[0]) {
				this.resolveSiteSupportMove(player, choices[0].value, site);
				return;
			}
			GameState.pendingTactic = {
				card: site,
				mode: "site-support-move",
				playerId: player.id,
				choices
			};
			UIRenderer.renderControls();
			document.getElementById("tactic-choice").focus();
		},
		resolveSiteSupportMove(player, choice, site) {
			const opponent = GameState.players[1 - GameState.players.indexOf(player)];
			const source = opponent.fronts[choice.sourceFront];
			const destination = opponent.fronts[choice.targetFront];
			const unit = source?.[choice.sourceSlot];
			const adjacent = Math.abs(FRONT_NAMES$1.indexOf(choice.sourceFront) - FRONT_NAMES$1.indexOf(choice.targetFront)) === 1;
			if (!unit || unit.id !== choice.targetUnitId || destination?.[choice.targetSlot] || !adjacent || !["supA", "supB"].includes(choice.targetSlot)) {
				Logger.log(`${site.name}: il Supporto scelto non può più essere spostato.`);
				return;
			}
			if (isProtectedFromEnemyMovement(opponent, unit, choice.sourceFront)) {
				Logger.log(`${site.name}: ${unit.name} è protetta dagli effetti di movimento avversari.`);
				return;
			}
			source[choice.sourceSlot] = null;
			destination[choice.targetSlot] = unit;
			unit.front = choice.targetFront;
			unit.position = choice.targetSlot;
			this.onUnitMoved(opponent, unit, choice.sourceFront, choice.targetFront);
			Logger.log(`${site.name}: ${unit.name} viene spostata in Supporto in ${FRONT_LABELS$1[choice.targetFront]}.`);
		},
		addParasites(sourcePlayer, targetPlayer, count) {
			targetPlayer.parasites = (targetPlayer.parasites || 0) + count;
			Logger.log(`${count} Parassit${count === 1 ? "a" : "i"} assegnat${count === 1 ? "o" : "i"} a ${targetPlayer.name}.`);
			for (const owner of GameState.players) {
				const sporeWells = owner.sites?.filter((site) => site.catalogId === "set-3-088") || [];
				for (const site of sporeWells) GameController.drawCards(owner, count, site.name);
				const parasiteSanctuaries = owner.sites?.filter((site) => site.catalogId === "set-3-101") || [];
				targetPlayer.pc = Math.max(0, targetPlayer.pc - count * parasiteSanctuaries.length);
				if (owner.field?.catalogId === "set-3-114") targetPlayer.pc = Math.max(0, targetPlayer.pc - count);
			}
			GameState.checkVictory();
		},
		resolveSiteActivation(site, choice) {
			const id = site.catalogId || site.id;
			const player = GameState.players[0];
			const opponent = GameState.players[1];
			if (id === "set-1-102") {
				const sacrificed = CombatResolver.removeUnit(player, choice.frontName, choice.slotName);
				const line = player.fronts[choice.frontName].line;
				if (!sacrificed || !line) throw new Error("Non è più possibile sacrificare l’Unità scelta.");
				line.currentForce += 2;
				line.temporaryForce = (line.temporaryForce || 0) + 2;
			} else if (id === "set-2-100") {
				if (!["supA", "supB"].includes(choice.slotName)) throw new Error("Ncrospira Oscura sacrifica solo un Supporto.");
				const sacrificed = CombatResolver.removeUnit(player, choice.frontName, choice.slotName, "sacrifice");
				const line = player.fronts[choice.frontName].line;
				if (!sacrificed || !line) throw new Error("Non è più possibile sacrificare il Supporto scelto.");
				line.currentForce += 2;
				line.temporaryForce = (line.temporaryForce || 0) + 2;
				Logger.log(`${site.name}: ${line.name} ottiene +2 Forza fino alla fine del turno.`);
			} else if (id === "set-2-088") {
				const owner = choice.ownerKey === "player" ? player : opponent;
				const target = choice.zone === "field" ? owner.field : owner.sites.find((site) => site.id === choice.siteId);
				if (!target || target.id !== choice.siteId) throw new Error("Il Sito scelto non è più in gioco.");
				target.ruins = (target.ruins || 0) + 1;
				if (target.ruins >= 2) {
					if (choice.zone === "field") {
						owner.discard.push(owner.field);
						owner.field = null;
					} else {
						const index = owner.sites.indexOf(target);
						owner.discard.push(...owner.sites.splice(index, 1));
					}
				}
			} else if (id === "set-3-082") {
				const source = player.fronts[choice.frontName];
				const target = player.fronts[choice.target];
				const unit = source[choice.slot];
				if (!unit || target[choice.targetSlot]) throw new Error("Il Supporto scelto non può essere spostato.");
				source[choice.slot] = null;
				target[choice.targetSlot] = unit;
				unit.front = choice.target;
				unit.position = choice.targetSlot;
				this.onUnitMoved(player, unit, choice.frontName, choice.target);
			} else if (id === "set-3-089") {
				const source = player.fronts[choice.frontName];
				const target = player.fronts[choice.target];
				const unit = source.line;
				if (!unit || target.line) throw new Error("La Linea scelta non può essere spostata.");
				source.line = null;
				target.line = unit;
				unit.front = choice.target;
				unit.position = "line";
				this.onUnitMoved(player, unit, choice.frontName, choice.target, true);
			}
			site.lastActivatedTurn = GameState.turnNumber;
			Logger.log(`${site.name}: abilità attivata.`);
			UIRenderer.refresh();
		},
		snapshot() {
			return {
				players: this.players,
				currentIndex: this.currentIndex,
				phase: this.phase,
				turnNumber: this.turnNumber,
				firstPlayerIndex: this.firstPlayerIndex,
				firstTurn: this.firstTurn,
				mulliganUsed: this.mulliganUsed,
				gameOver: this.gameOver,
				sorvoloUsed: [...this.sorvoloUsed],
				randomState: getRandomState()
			};
		},
		restore(snapshot) {
			this.players = snapshot.players;
			this.currentIndex = snapshot.currentIndex;
			this.phase = snapshot.phase;
			this.turnNumber = snapshot.turnNumber;
			this.firstPlayerIndex = snapshot.firstPlayerIndex;
			this.firstTurn = snapshot.firstTurn;
			this.mulliganUsed = snapshot.mulliganUsed === true;
			this.mulliganMarks = /* @__PURE__ */ new Set();
			this.gameOver = snapshot.gameOver === true;
			this.selectedCard = null;
			this.selectedFromDiscard = false;
			this.sacrifice = null;
			this.pendingTactic = null;
			this.pendingTorment = null;
			this.pendingPromotion = null;
			this.pendingSorvolo = false;
			this.reactionWindow = null;
			this.resolveReactions = false;
			this.retreatMode = false;
			this.sorvoloUsed = new Set(snapshot.sorvoloUsed || []);
			restoreRandomState(snapshot.randomState);
			this.log = [];
		},
		countUnits(player) {
			return this.players.reduce((total, boardOwner) => total + FRONT_NAMES$1.reduce((count, name) => count + SLOT_NAMES.filter((slot) => {
				const unit = boardOwner.fronts[name][slot];
				if (!unit) return false;
				if (unit.infiltrated) return unit.owner === player.id;
				return boardOwner === player;
			}).length, 0), 0);
		},
		unitsInFront(player, frontName) {
			const front = player.fronts[frontName];
			return SLOT_NAMES.map((slot) => front[slot]).filter(Boolean);
		},
		checkVictory() {
			const defeated = this.players.filter((player) => player.pc <= 0 || player.follia >= 10);
			if (defeated.length > 1) {
				const winner = this.players[this.currentIndex];
				this.gameOver = true;
				this.phase = "gameover";
				Logger.log(`Sconfitta simultanea: ${winner.name} vince la partita (giocatore di turno).`);
				UIRenderer.showGameOver(winner);
				persistGame(this.snapshot());
				return true;
			}
			if (defeated.length === 1) {
				const winner = this.players.find((player) => player !== defeated[0]);
				this.gameOver = true;
				this.phase = "gameover";
				Logger.log(`${defeated[0].name} ha perso. ${winner.name} vince la partita!`);
				UIRenderer.showGameOver(winner);
				persistGame(this.snapshot());
				return true;
			}
			const dominant = this.players[this.currentIndex];
			const exposed = this.players.find((player) => player !== dominant);
			if (this.phase === "rifornimento" && dominant && exposed && this.countUnits(exposed) === 0 && FRONT_NAMES$1.every((name) => dominant.fronts[name].line)) {
				this.gameOver = true;
				this.phase = "gameover";
				Logger.log(`${dominant.name} controlla l'intera mappa. Dominio Totale della Mappa!`);
				UIRenderer.showGameOver(dominant);
				persistGame(this.snapshot());
				return true;
			}
			return false;
		},
		resolvePermanentTurnStart(playerIndex) {
			const player = GameState.players[playerIndex];
			const opponent = GameState.players[1 - playerIndex];
			const expiredSites = [];
			for (const site of [...player.sites || []]) {
				if (!Number.isInteger(site.decayRemaining)) continue;
				site.decayRemaining = Math.max(0, site.decayRemaining - 1);
				if (site.decayRemaining === 0) expiredSites.push(site);
			}
			for (const site of expiredSites) {
				player.sites.splice(player.sites.indexOf(site), 1);
				player.discard.push(site);
				Logger.log(`${site.name}: l’ultima Decadenza viene rimossa; il Sito è distrutto.`);
				if (site.catalogId === "set-1-094") {
					const frontName = FRONT_NAMES$1.find((name) => !player.fronts[name].supA || !player.fronts[name].supB);
					if (frontName) createToken(player, frontName, player.fronts[frontName].supA ? "supB" : "supA", "Pedina Raptor", 2);
				}
			}
			const line = FRONT_NAMES$1.map((name) => player.fronts[name].line).find(Boolean);
			const enemyLine = FRONT_NAMES$1.map((name) => opponent.fronts[name].line).find(Boolean);
			for (const site of player.sites) {
				const id = site.catalogId;
				if (id === "set-1-091" && line) this.applyTemporaryForce(line, 1, `${site.name}`);
				if (["set-1-093", "set-2-082"].includes(id) && enemyLine) this.applyForceLoss(opponent, FRONT_NAMES$1.find((name) => opponent.fronts[name].line === enemyLine), 1, site.name, player);
				if (id === "set-1-108") {
					const raptor = player.armyDeck.findIndex((card) => /raptor/i.test(card.type || ""));
					if (raptor >= 0) {
						const [card] = player.armyDeck.splice(raptor, 1);
						player.armyDeck.push(card);
						Logger.log(`${site.name}: ${card.name} cercata e messa in cima al mazzo.`);
					}
				}
				if (id === "set-2-079" && player.armyDeck.length) Logger.log(`${site.name}: prima carta del mazzo ${player.armyDeck.at(-1).name}.`);
				if (id === "set-2-090" || id === "set-2-119") {
					if (player.discard.length) player.armyDeck.unshift(player.discard.shift());
				}
				if (id === "set-2-093") FRONT_NAMES$1.forEach((frontName) => {
					if (opponent.fronts[frontName].line) this.applyForceLoss(opponent, frontName, 1, site.name, player);
				});
				if (id === "set-3-100") {
					const sourceName = FRONT_NAMES$1.find((name, index) => {
						const unit = opponent.fronts[name].line;
						return unit && !isProtectedFromEnemyMovement(opponent, unit, name) && [index - 1, index + 1].some((targetIndex) => FRONT_NAMES$1[targetIndex] && !opponent.fronts[FRONT_NAMES$1[targetIndex]].line);
					});
					if (sourceName) {
						const sourceIndex = FRONT_NAMES$1.indexOf(sourceName);
						const destinationIndex = [sourceIndex - 1, sourceIndex + 1].find((index) => FRONT_NAMES$1[index] && !opponent.fronts[FRONT_NAMES$1[index]].line);
						const unit = opponent.fronts[sourceName].line;
						opponent.fronts[sourceName].line = null;
						opponent.fronts[FRONT_NAMES$1[destinationIndex]].line = unit;
						unit.front = FRONT_NAMES$1[destinationIndex];
						unit.position = "line";
						this.onUnitMoved(opponent, unit, sourceName, FRONT_NAMES$1[destinationIndex], true);
						Logger.log(`${site.name}: ${unit.name} si sposta in ${FRONT_LABELS$1[FRONT_NAMES$1[destinationIndex]]}.`);
					}
				}
				if (id === "set-2-108") {
					const index = player.discard.findIndex((card) => card.category === "unit" && card.keywords?.some((keyword) => keyword.startsWith("Eco Spettrale")));
					if (index >= 0) {
						const [recovered] = player.discard.splice(index, 1);
						player.hand.push(recovered);
						Logger.log(`${site.name}: ${recovered.name} torna in mano.`);
					}
				}
				if (id === "set-3-081") {
					const frontName = FRONT_NAMES$1.find((name) => player.fronts[name].line && (!player.fronts[name].supA || !player.fronts[name].supB));
					if (frontName) {
						const front = player.fronts[frontName];
						createToken(player, frontName, front.supA ? "supB" : "supA");
					}
				}
				if (id === "set-3-084") Logger.log(`${site.name}: mano avversaria — ${opponent.hand.map((card) => card.name).join(", ") || "vuota"}.`);
				if (id === "set-3-092") {
					const sourceName = FRONT_NAMES$1.find((name, index) => {
						const unit = opponent.fronts[name].line;
						return unit && !isProtectedFromEnemyMovement(opponent, unit, name) && [index - 1, index + 1].some((targetIndex) => FRONT_NAMES$1[targetIndex] && !opponent.fronts[FRONT_NAMES$1[targetIndex]].line);
					});
					if (sourceName) {
						const sourceIndex = FRONT_NAMES$1.indexOf(sourceName);
						const destinationIndex = [sourceIndex - 1, sourceIndex + 1].find((index) => FRONT_NAMES$1[index] && !opponent.fronts[FRONT_NAMES$1[index]].line);
						const unit = opponent.fronts[sourceName].line;
						opponent.fronts[sourceName].line = null;
						opponent.fronts[FRONT_NAMES$1[destinationIndex]].line = unit;
						unit.front = FRONT_NAMES$1[destinationIndex];
						this.onUnitMoved(opponent, unit, sourceName, FRONT_NAMES$1[destinationIndex], true);
					}
				}
				if (id === "set-3-102" && this.countCollective(player) >= 3) GameController.drawCards(player, 1, site.name);
				if (id === "set-3-104") FRONT_NAMES$1.forEach((frontName) => {
					const front = player.fronts[frontName];
					if (!front.line && !front.supA && !front.supB) return;
					const slot = !front.supA ? "supA" : !front.supB ? "supB" : null;
					if (slot) createToken(player, frontName, slot);
				});
			}
			const sunkenCities = GameState.players.flatMap((owner) => (owner.sites || []).filter((site) => site.catalogId === "set-2-103"));
			for (const site of sunkenCities) {
				if (!player.armyDeck.length) break;
				if (!GameController.drawCards(player, 1, site.name)) continue;
				player.pc = Math.max(0, player.pc - 1);
				Logger.log(`${player.name} perde 1 PC per ${site.name}.`);
			}
			if (player.field?.catalogId === "set-1-120") {
				const frontName = FRONT_NAMES$1.find((name) => !player.fronts[name].supA || !player.fronts[name].supB);
				if (frontName) {
					const front = player.fronts[frontName];
					createToken(player, frontName, front.supA ? "supB" : "supA", "Pedina Raptor", 3);
				}
			}
			if (player.field?.catalogId === "set-3-119" && FRONT_NAMES$1.every((frontName) => SLOT_NAMES.some((slot) => player.fronts[frontName][slot]))) {
				opponent.pc = Math.max(0, opponent.pc - 1);
				Logger.log(`${player.field.name}: il Comandante avversario perde 1 PC.`);
			}
			if (player.field?.catalogId === "set-2-119" && player.discard.length) player.armyDeck.unshift(player.discard.shift());
		},
		countCollective(player) {
			return FRONT_NAMES$1.reduce((count, frontName) => count + SLOT_NAMES.filter((slotName) => player.fronts[frontName][slotName] && getUnitKeywords(player, player.fronts[frontName][slotName], frontName, slotName).some((keyword) => keyword.startsWith("Mente Collettiva"))).length, 0);
		},
		resolvePermanentCombatStart(playerIndex) {
			for (let attackerIndex = 0; attackerIndex < 2; attackerIndex++) {
				const player = GameState.players[attackerIndex];
				const opponent = GameState.players[1 - attackerIndex];
				for (const site of player.sites || []) if (site.catalogId === "set-1-099") {
					const frontName = FRONT_NAMES$1.find((name) => opponent.fronts[name].line);
					if (frontName) this.applyForceLoss(opponent, frontName, 1, site.name, player);
				}
				if (player.field?.catalogId === "set-3-115") for (const frontName of FRONT_NAMES$1) {
					const count = SLOT_NAMES.filter((slot) => player.fronts[frontName][slot] && getUnitKeywords(player, player.fronts[frontName][slot], frontName, slot).some((keyword) => keyword.startsWith("Mente Collettiva"))).length;
					if (count && opponent.fronts[frontName].line) this.applyForceLoss(opponent, frontName, Math.min(2, count), player.field.name, player);
				}
			}
		},
		applyTemporaryForce(unit, modifier, source) {
			const previous = unit.currentForce;
			unit.currentForce = Math.max(0, unit.currentForce + modifier);
			const applied = unit.currentForce - previous;
			unit.temporaryForce = (unit.temporaryForce || 0) + applied;
			if (applied < 0) unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) - applied;
			Logger.log(`${source}: ${unit.name} ${applied >= 0 ? "ottiene" : "perde"} ${Math.abs(applied)} Forza fino a fine turno.`);
		},
		applyForceLoss(owner, frontName, amount, source, sourcePlayer, triggerEquipment = true) {
			const unit = owner.fronts[frontName]?.line;
			if (!unit) return;
			const applied = Math.min(amount, Math.max(0, unit.currentForce));
			if (!applied) return;
			unit.currentForce -= applied;
			unit.temporaryForce = (unit.temporaryForce || 0) - applied;
			unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) + applied;
			Logger.log(`${source}: ${unit.name} perde ${applied} Forza.`);
			CombatResolver.onForceLoss(owner, unit, applied, sourcePlayer, triggerEquipment);
			if (unit.currentForce <= 0 && owner.fronts[frontName]?.line === unit) CombatResolver.removeUnit(owner, frontName, "line", "effect-destroy", sourcePlayer);
		},
		onUnitMoved(player, unit, sourceFront, targetFront, wasLine = false, usedSorvolo = false) {
			this.onEquipmentPositionEntry(player, unit, unit.position);
			if (usedSorvolo) this.resolveSorvoloEntryEffects(player, unit, targetFront);
			if (!wasLine && unit.position === "line") this.applyCollectiveEntryBonus(player, unit, targetFront, unit.position);
			if (wasLine) for (const fieldOwner of GameState.players) {
				if (fieldOwner.field?.catalogId !== "set-3-116") continue;
				if (unit.currentForce <= 0 || player.fronts[targetFront][unit.position] !== unit) break;
				const applied = Math.min(1, Math.max(0, unit.currentForce));
				if (!applied) continue;
				unit.currentForce -= applied;
				unit.temporaryForce = (unit.temporaryForce || 0) - applied;
				unit.forceLostThisTurn = (unit.forceLostThisTurn || 0) + applied;
				CombatResolver.onForceLoss(player, unit, applied, fieldOwner);
				Logger.log(`${fieldOwner.field.name}: ${unit.name} perde ${applied} Forza.`);
				if (unit.currentForce <= 0) CombatResolver.removeUnit(player, targetFront, unit.position, "effect-destroy", fieldOwner);
			}
			if (sourceFront !== targetFront && player.sites?.some((site) => site.catalogId === "set-3-093") && getUnitKeywords(player, unit, targetFront, unit.position).includes("Sorvolo")) {
				const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
				const frontName = FRONT_NAMES$1.find((name) => enemy.fronts[name].line);
				if (frontName) this.applyForceLoss(enemy, frontName, 1, "Fenditura Dimensionale", player);
			}
			const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
			if (wasLine && !player.fronts[sourceFront].line && enemy.field?.catalogId === "set-1-117") {
				player.pc = Math.max(0, player.pc - 1);
				Logger.log(`${enemy.field.name}: ${player.name} perde 1 PC perché un Fronte diventa scoperto.`);
				GameState.checkVictory();
			}
		},
		resolveSorvoloEntryEffects(player, unit, targetFront) {
			const opponent = GameState.players[1 - GameState.players.indexOf(player)];
			for (const effect of getSorvoloEntryEffects(unit)) if (effect.type === "boost-own-line") {
				const line = player.fronts[targetFront].line;
				if (!line) continue;
				line.currentForce += effect.amount;
				line.temporaryForce = (line.temporaryForce || 0) + effect.amount;
			} else if (effect.type === "damage-enemy-line-in-front") {
				if (opponent.fronts[targetFront].line) CombatResolver.damageLine(opponent, targetFront, effect.amount, player, true);
			} else if (effect.type === "add-opponent-parasite") this.addParasites(player, opponent, 1);
			else if (effect.type === "weaken-enemy-line") {
				const frontName = FRONT_NAMES$1.find((name) => opponent.fronts[name].line);
				if (frontName) this.applyForceLoss(opponent, frontName, effect.amount, unit.name, player);
			} else if (effect.type === "destroy-weak-enemy-line") {
				const frontName = FRONT_NAMES$1.find((name) => opponent.fronts[name].line?.currentForce <= effect.maximumForce);
				if (frontName) CombatResolver.destroyUnit(opponent, frontName, "line", "effect-destroy");
			}
		}
	};
	//#endregion
	//#region src/engine/renderer.js
	const UIRenderer = {
		updateStats() {
			const player = GameState.players[0];
			const opponent = GameState.players[1];
			document.getElementById("player-pc").textContent = player.pc;
			document.getElementById("player-follia").textContent = player.follia;
			document.getElementById("player-echo").textContent = player.echo;
			document.getElementById("player-parassiti").textContent = player.parasites;
			document.getElementById("player-deck").textContent = player.armyDeck.length;
			document.getElementById("opp-pc").textContent = opponent.pc;
			document.getElementById("opp-follia").textContent = opponent.follia;
			document.getElementById("opp-echo").textContent = opponent.echo;
			document.getElementById("opp-parassiti").textContent = opponent.parasites;
			document.getElementById("opp-deck").textContent = opponent.armyDeck.length;
			document.getElementById("player-domini-count").textContent = `${player.domains.filter((domain) => !domain.tapped).length}/${player.domains.length}`;
			this.renderCommander();
		},
		renderCommander() {
			const [player, opponent] = GameState.players;
			if (!player) return;
			const playerCommander = getCommander(player.commanderId);
			const opponentCommander = opponent ? getCommander(opponent.commanderId) : null;
			document.getElementById("player-commander-name").textContent = playerCommander?.name || "IL TUO COMANDANTE";
			document.getElementById("player-commander-ability").textContent = playerCommander ? `${playerCommander.activation.name} · ${player.commanderAbilityUsed ? "già usata" : "pronta"} — ${playerCommander.activation.text}` : "";
			if (opponent) {
				document.getElementById("opp-commander-name").textContent = opponentCommander?.name || "COMANDANTE NEMICO";
				document.getElementById("opp-commander-ability").textContent = opponentCommander ? opponentCommander.activation.text : "";
			}
		},
		renderDomains(player, containerId) {
			const area = document.getElementById(containerId);
			const title = area.querySelector(".zone-title");
			area.replaceChildren(title);
			player.domains.forEach((domain) => {
				const element = document.createElement("div");
				element.className = `siti-slot occupied${domain.tapped ? " tapped" : ""}`;
				element.textContent = domain.name;
				area.appendChild(element);
			});
			(player.sites || []).forEach((site) => {
				const element = document.createElement("div");
				element.className = "siti-slot occupied permanent-card";
				element.textContent = `${site.name}${site.decay != null ? ` · Decadenza ${site.decay}` : ""}${site.ruins ? ` · ${site.ruins} Rovina` : ""}`;
				element.title = site.rulesText;
				if (player === GameState.players[0] && GameController.canActivateSite(site)) {
					element.tabIndex = 0;
					element.setAttribute("role", "button");
					element.addEventListener("click", () => GameController.activateSite(site));
					element.addEventListener("keydown", (event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							GameController.activateSite(site);
						}
					});
				}
				area.appendChild(element);
			});
			if (player.field) {
				const element = document.createElement("div");
				element.className = "siti-slot occupied permanent-card field-card";
				element.textContent = `Campo: ${player.field.name}`;
				element.title = player.field.rulesText;
				area.appendChild(element);
			}
		},
		renderSlot(prefix, frontName, slotName, unit) {
			const element = document.getElementById(`${prefix}-${frontName}-${slotName}`);
			if (!element) return;
			element.replaceChildren();
			const side = prefix === "p" ? "tuo" : "avversario";
			const label = FRONT_LABELS$1[frontName];
			const slotLabel = slotName === "line" ? "Linea" : `Supporto ${slotName === "supA" ? "A" : "B"}`;
			if (!unit) {
				element.textContent = slotLabel;
				element.setAttribute("aria-label", `Fronte ${label}, ${slotLabel} ${side}: vuoto`);
				element.setAttribute("role", "button");
				element.tabIndex = prefix === "p" ? 0 : -1;
				element.classList.remove("sacrifice-target");
				return;
			}
			element.setAttribute("aria-label", `Fronte ${label}, ${slotLabel} ${side}: ${unit.name}, Forza ${unit.currentForce}`);
			element.setAttribute("role", "button");
			element.tabIndex = prefix === "p" ? 0 : -1;
			const icon = document.createElement("span");
			icon.className = "slot-icon";
			icon.textContent = unit.icon;
			const details = document.createElement("div");
			details.className = "slot-details";
			const name = document.createElement("div");
			name.className = "slot-name";
			name.textContent = unit.name;
			const keywords = document.createElement("span");
			keywords.className = "slot-keyword";
			const owner = GameState.players[prefix === "p" ? 0 : 1];
			keywords.textContent = [...getUnitKeywords(owner, unit, frontName, slotName), ...unit.equipment ? [`Equip: ${unit.equipment.name}`] : []].join(", ");
			details.append(name, keywords);
			const force = document.createElement("span");
			force.className = "slot-force";
			force.textContent = Number.isFinite(unit.force) ? `${unit.currentForce}/${unit.force}` : "In gioco";
			element.append(icon, details, force);
			element.classList.toggle("sacrifice-target", GameState.sacrifice?.frontName === frontName && prefix === "p");
		},
		renderBoard() {
			for (const frontName of FRONT_NAMES$1) for (const slotName of SLOT_NAMES) {
				this.renderSlot("p", frontName, slotName, GameState.players[0].fronts[frontName][slotName]);
				this.renderSlot("opp", frontName, slotName, GameState.players[1].fronts[frontName][slotName]);
			}
			this.renderDomains(GameState.players[0], "player-siti-area");
			this.renderDomains(GameState.players[1], "opp-siti-area");
			this.updateStats();
			this.renderControls();
			this.updateBoardInteractivity();
		},
		renderHand() {
			const area = document.getElementById("hand-area");
			area.replaceChildren();
			if (!GameState.players.length) {
				area.textContent = "La tua mano iniziale contiene 5 carte.";
				return;
			}
			const player = GameState.players[0];
			const mulliganSetup = GameState.phase === "setup";
			if (!mulliganSetup && player.hand.length === 0) {
				area.textContent = "Mano vuota.";
				return;
			}
			if (mulliganSetup) {
				const hint = document.createElement("div");
				hint.className = "hand-hint";
				hint.textContent = "Mulligan parziale (§5): seleziona le carte da rimpiazzare, poi premi MULLIGAN.";
				area.appendChild(hint);
			} else if (GameState.selectedCard?.category === "unit") {
				const keywords = GameState.selectedCard.keywords || [];
				const hint = document.createElement("div");
				hint.className = "hand-hint";
				if (keywords.includes("Assalto") || keywords.includes("Posizione Difensiva")) hint.textContent = "Questa Unità può entrare in Linea. Gli slot evidenziati sono legali.";
				else hint.textContent = "Le Unità entrano in Supporto. Solo Assalto o Posizione Difensiva possono andare subito in Linea.";
				area.appendChild(hint);
			}
			const renderCard = (card) => {
				const marked = mulliganSetup && GameState.mulliganMarks.has(card.id);
				const element = document.createElement("button");
				element.type = "button";
				element.className = `card${marked ? " mulligan-marked" : ""}${GameState.selectedCard?.id === card.id ? " selected" : ""}`;
				const reaction = GameState.reactionWindow?.playerIndex === 0;
				element.disabled = mulliganSetup ? false : reaction ? Boolean(GameState.pendingTactic || GameState.sacrifice || GameState.pendingTorment || GameState.pendingPromotion) || !isImmediateTacticSupported(card) || tacticTiming(card) === "standard" : GameState.currentIndex !== 0 || GameState.phase !== "principale" || GameState.sacrifice !== null || GameState.pendingTorment !== null || GameState.pendingTactic !== null || card.category !== "unit" && ![
					"site",
					"field",
					"equipment"
				].includes(card.category) && !isImmediateTacticSupported(card);
				const cost = document.createElement("span");
				cost.className = "card-cost";
				cost.textContent = card.category === "equipment" ? String(card.cost + (card.equipCost || 0)) : card.cost;
				const name = document.createElement("span");
				name.className = "card-name";
				name.textContent = card.name;
				const art = document.createElement("canvas");
				art.className = "card-art card-art-canvas";
				art.width = 64;
				art.height = 48;
				drawCardPixelArt(art, card);
				const stats = document.createElement("span");
				stats.className = "card-stats";
				const executionStatus = getCardExecutionStatus(card);
				const tacticSpeed = card.category === "tactic" ? tacticTiming(card) === "instant" ? "Istantanea" : "Standard" : "";
				stats.textContent = card.category === "unit" ? `Forza ${card.force} · ${card.type}` : card.category === "tactic" ? `Tattica ${tacticSpeed} · ${executionStatus.label}` : [
					"site",
					"field",
					"equipment"
				].includes(card.category) ? `${card.category} · ${executionStatus.label}` : `${card.category} · ${executionStatus.label}`;
				const rules = document.createElement("span");
				rules.className = "card-rules";
				rules.textContent = card.category === "unit" ? `${executionStatus.label}: ${card.rulesText}` : card.category === "site" ? `${executionStatus.label}: ${card.rulesText}` : `${executionStatus.label}: ${executionStatus.detail}`;
				element.title = card.rulesText;
				element.append(cost, name, art, stats, rules);
				element.addEventListener("click", () => {
					if (mulliganSetup) {
						GameController.toggleMulliganMark(card);
						return;
					}
					GameController.selectCard(card);
				});
				area.appendChild(element);
			};
			player.hand.forEach((card) => renderCard(card));
		},
		updateBoardInteractivity() {
			for (const frontName of FRONT_NAMES$1) {
				for (const slotName of SLOT_NAMES) {
					const element = document.getElementById(`p-${frontName}-${slotName}`);
					if (!element) continue;
					const canDeploy = GameState.phase === "principale" && GameState.currentIndex === 0 && GameState.selectedCard && !GameState.sacrifice && !GameState.pendingTorment;
					const player = GameState.players[0];
					const opponent = GameState.players[1];
					const front = player.fronts[frontName];
					const keywords = GameState.selectedCard ? getUnitKeywords(player, GameState.selectedCard, frontName, slotName) : [];
					if (player.field?.catalogId === "set-1-113" && GameState.countUnits(player) < GameState.countUnits(opponent) && !keywords.includes("Assalto")) keywords.push("Assalto");
					const deployment = GameState.selectedCard ? checkDeployment({
						...GameState.selectedCard,
						keywords
					}, front, slotName, {
						ownSites: player.sites,
						opposingSites: opponent.sites,
						ownField: player.field
					}) : { legal: false };
					element.classList.toggle("selectable", Boolean(canDeploy && deployment.legal) || Boolean(GameState.retreatMode && slotName !== "line" && player.fronts[frontName][slotName] && !player.fronts[frontName][slotName].infiltrated));
					element.classList.toggle("sacrifice-target", Boolean(GameState.sacrifice?.frontName === frontName && GameState.players[0].fronts[frontName][slotName]));
				}
				const opponent = GameState.players[1];
				for (const slotName of ["supA", "supB"]) {
					const element = document.getElementById(`opp-${frontName}-${slotName}`);
					if (!element || !opponent) continue;
					const card = GameState.selectedCard;
					const canInfiltrate = GameState.phase === "principale" && GameState.currentIndex === 0 && card && !GameState.sacrifice && !GameState.pendingTorment && card.keywords?.some((keyword) => keyword.startsWith("Infiltrazione")) && !opponent.fronts[frontName].line && !opponent.fronts[frontName][slotName];
					element.classList.toggle("selectable", Boolean(canInfiltrate));
				}
			}
		},
		renderControls() {
			const setup = GameState.phase === "setup";
			const playerTurn = GameState.currentIndex === 0 && !GameState.gameOver;
			document.getElementById("player-set-select").disabled = !setup;
			document.getElementById("opponent-set-select").disabled = !setup;
			document.getElementById("player-commander-select").disabled = !setup;
			const commanderBtn = document.getElementById("btn-commander");
			commanderBtn.hidden = !playerTurn || GameState.phase !== "principale";
			commanderBtn.disabled = Boolean(GameState.players[0]?.commanderAbilityUsed) || GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment || GameState.pendingPromotion;
			const retreatBtn = document.getElementById("btn-retreat");
			retreatBtn.hidden = !playerTurn || GameState.phase !== "principale";
			retreatBtn.disabled = Boolean(GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment || GameState.pendingPromotion || GameState.pendingSorvolo);
			retreatBtn.textContent = GameState.retreatMode ? "↩ SCEGLI IL SUPPORTO" : "↩ RITIRATA";
			const purgeBtn = document.getElementById("btn-purge");
			purgeBtn.hidden = !playerTurn || GameState.phase !== "principale";
			purgeBtn.disabled = Boolean(GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment || GameState.pendingPromotion || GameState.pendingSorvolo);
			const mulliganBtn = document.getElementById("btn-mulligan");
			mulliganBtn.hidden = !setup || GameState.mulliganUsed;
			if (!mulliganBtn.hidden) {
				const marked = GameState.mulliganMarks.size;
				mulliganBtn.textContent = marked === 0 ? "🔁 MULLIGAN" : `🔁 MULLIGAN (${marked} da rimpiazzare)`;
			}
			document.getElementById("btn-start").hidden = !setup;
			document.getElementById("btn-principale").hidden = !playerTurn || GameState.phase !== "rifornimento";
			document.getElementById("btn-attack").hidden = !playerTurn || GameState.phase !== "principale";
			document.getElementById("btn-finale").hidden = !playerTurn || GameState.phase !== "finale";
			document.getElementById("btn-canala").hidden = !playerTurn || GameState.phase !== "rifornimento" || GameState.players[0].follia === 0;
			document.getElementById("btn-sacrifice-end").hidden = !GameState.sacrifice;
			document.getElementById("sorvolo-panel").hidden = !GameState.pendingSorvolo;
			document.getElementById("torment-panel").hidden = !GameState.pendingTorment;
			document.getElementById("tactic-panel").hidden = !GameState.pendingTactic;
			const reaction = GameState.reactionWindow?.playerIndex === 0;
			const reactionPanel = document.getElementById("reaction-panel");
			reactionPanel.hidden = !reaction;
			if (reaction) {
				document.getElementById("reaction-label").textContent = `Finestra di reazione · ${FRONT_LABELS$1[GameState.reactionWindow.frontName]}. Gioca una Tattica Istantanea o passa.`;
				document.getElementById("btn-reaction-pass").disabled = Boolean(GameState.pendingTactic);
			}
			document.getElementById("promotion-panel").hidden = !GameState.pendingPromotion;
			if (GameState.pendingPromotion) {
				const promotionChoice = document.getElementById("promotion-choice");
				promotionChoice.replaceChildren();
				GameState.pendingPromotion.supports.forEach((slot) => {
					const option = document.createElement("option");
					option.value = slot;
					option.textContent = slot === "supA" ? "Supporto A" : "Supporto B";
					promotionChoice.appendChild(option);
				});
			}
			const tacticChoice = document.getElementById("tactic-choice");
			tacticChoice.replaceChildren();
			if (GameState.pendingTactic) {
				GameState.pendingTactic.choices.forEach((choice, index) => {
					const option = document.createElement("option");
					option.value = String(index);
					option.textContent = choice.label;
					tacticChoice.appendChild(option);
				});
				document.getElementById("tactic-choice-label").textContent = GameState.pendingTactic.mode === "discard" ? `Scegli una carta da scartare per ${GameState.pendingTactic.card.name}:` : GameState.pendingTactic.mode === "shadow-recovery" ? "Scegli facoltativamente un’Unità dagli scarti da mettere in Supporto:" : GameState.pendingTactic.mode === "equipment" ? `Scegli l’Unità da equipaggiare con ${GameState.pendingTactic.card.name}:` : GameState.pendingTactic.mode === "permanent-replace" ? `Scegli quale permanente distruggere per giocare ${GameState.pendingTactic.card.name}:` : GameState.pendingTactic.mode === "active-site" ? `Scegli l’effetto di ${GameState.pendingTactic.card.name}:` : GameState.pendingTactic.mode === "site-support-move" ? "Scegli un Supporto avversario da spostare in un Fronte adiacente:" : `Scegli un bersaglio per ${GameState.pendingTactic.card.name}:`;
			}
			document.getElementById("btn-tactic-cancel").hidden = GameState.pendingTactic?.mode === "discard";
			document.getElementById("btn-tactic-confirm").textContent = GameState.pendingTactic?.mode === "discard" ? "SCARTA CARTA" : GameState.pendingTactic?.mode === "shadow-recovery" ? "CONFERMA RECUPERO" : GameState.pendingTactic?.mode === "equipment" ? "EQUIPAGGIA" : GameState.pendingTactic?.mode === "permanent-replace" ? "SOSTITUISCI E GIOCA" : GameState.pendingTactic?.mode === "active-site" ? "ATTIVA" : GameState.pendingTactic?.mode === "site-support-move" ? "SPOSTA SUPPORTO" : "RISOLVI TATTICA";
			if (GameState.pendingTorment) {
				const pending = GameState.pendingTorment;
				document.getElementById("torment-choice").textContent = `${pending.winnerName}: infliggi ${pending.commanderDamage} danni al Comandante oppure assegna ${pending.torment} Follia?`;
			}
			const sorvoloChoice = document.getElementById("sorvolo-choice");
			sorvoloChoice.replaceChildren();
			this.getSorvoloOptions().forEach((option, index) => {
				const element = document.createElement("option");
				element.value = String(index);
				element.textContent = option.label;
				sorvoloChoice.appendChild(element);
			});
			document.getElementById("btn-attack").disabled = Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingTactic || GameState.pendingPromotion);
			document.getElementById("btn-finale").disabled = Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingTactic || GameState.pendingPromotion);
			document.getElementById("btn-new-game").disabled = Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingPromotion);
			document.getElementById("btn-demo-decks").disabled = Boolean(GameState.sacrifice || GameState.pendingTorment || GameState.pendingPromotion);
			const phase = GameState.phase === "setup" ? "PREPARAZIONE" : {
				rifornimento: "RIFORNIMENTO",
				principale: "FASE PRINCIPALE",
				scontro: "SCONTRO",
				finale: "FASE FINALE",
				gameover: "PARTITA TERMINATA"
			}[GameState.phase];
			document.getElementById("phase-label").textContent = phase;
			document.getElementById("turn-label").textContent = GameState.players.length ? `Turno ${GameState.turnNumber || "—"} · ${GameState.current.name}` : "";
		},
		showGameOver(winner) {
			this.renderBoard();
			document.getElementById("game-result").textContent = `${winner.name} vince!`;
			document.getElementById("game-result").hidden = false;
		},
		refresh() {
			this.renderBoard();
			this.renderHand();
			if (!GameState.sacrifice && !GameState.pendingSorvolo && !GameState.pendingTactic && !GameState.pendingTorment && !GameState.pendingPromotion && GameState.phase !== "scontro") persistGame(GameState.snapshot());
		},
		getSorvoloOptions() {
			if (!GameState.players.length) return [];
			const player = GameState.players[0];
			const options = [];
			FRONT_NAMES$1.forEach((frontName, index) => {
				SLOT_NAMES.forEach((slotName) => {
					const unit = player.fronts[frontName][slotName];
					if (!unit || !getUnitKeywords(player, unit, frontName, slotName).includes("Sorvolo") || unit.cannotMoveThisTurn || GameState.sorvoloUsed.has(unit.id)) return;
					[index - 1, index + 1].forEach((adjacentIndex) => {
						const adjacentFront = FRONT_NAMES$1[adjacentIndex];
						if (!adjacentFront) return;
						const target = player.fronts[adjacentFront];
						const targetSlots = !target.line && player.sites?.some((site) => site.catalogId === "set-1-104" || site.catalogId === "set-3-107") ? [
							"line",
							...target.supA === null ? ["supA"] : [],
							...target.supB === null ? ["supB"] : []
						] : [target.supA === null ? "supA" : target.supB === null ? "supB" : null].filter(Boolean);
						for (const targetSlot of targetSlots) options.push({
							frontName,
							slotName,
							targetFront: adjacentFront,
							targetSlot,
							unit,
							label: `${unit.name}: ${FRONT_LABELS$1[frontName]} → ${FRONT_LABELS$1[adjacentFront]} (${targetSlot === "line" ? "Linea" : "Supporto"})`
						});
					});
					if (player.sites?.some((site) => site.catalogId === "set-2-086")) FRONT_NAMES$1.filter((targetFront) => targetFront !== frontName && ![index - 1, index + 1].some((adjacentIndex) => FRONT_NAMES$1[adjacentIndex] === targetFront)).forEach((targetFront) => {
						const target = player.fronts[targetFront];
						const targetSlot = target.supA === null ? "supA" : target.supB === null ? "supB" : null;
						if (!targetSlot) return;
						options.push({
							frontName,
							slotName,
							targetFront,
							targetSlot,
							unit,
							label: `${unit.name}: ${FRONT_LABELS$1[frontName]} → ${FRONT_LABELS$1[targetFront]} (Supporto)`
						});
					});
				});
			});
			return options;
		}
	};
	//#endregion
	//#region src/engine/combat.js
	const CombatResolver = {
		async resolveAll() {
			Logger.log("=== FASE DI SCONTRO: SINISTRA → CENTRO → DESTRA ===");
			FX.play("attack");
			GameState.resolveReactions = true;
			try {
				for (const frontName of FRONT_NAMES$1) {
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
			const front = player.fronts[frontName];
			if (!front.line) return 0;
			const collective = SLOT_NAMES.map((slot) => front[slot]).filter((unit) => unit?.keywords.includes("Mente Collettiva")).length;
			const opponentPlayer = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
			const keywords = getUnitKeywords(player, front.line, frontName, "line");
			const effectiveLine = {
				...front.line,
				currentForce: front.line.currentForce + getUnitForceBonus(player, front.line, frontName, "line", player === GameState.players[0] ? GameState.players[1] : GameState.players[0]),
				keywords
			};
			const fewerUnits = GameState.countUnits(player) < GameState.countUnits(opponentPlayer);
			const staticSupport = getSupportBonus(player, frontName);
			return calculateUnitCombatStrength({
				line: effectiveLine,
				supportCount: player.tacticEffects?.supportBonus ? Math.min(3, Number(Boolean(front.supA) && !front.supA.infiltrated) * player.tacticEffects.supportBonus + Number(Boolean(front.supB) && !front.supB.infiltrated) * player.tacticEffects.supportBonus) : staticSupport,
				supportBonusPerUnit: 1,
				supportBonusCap: 3,
				collectiveCount: collective,
				fewerUnits,
				logorare: 0,
				ferocityBonus: getFerocityBonus(player, front.line, frontName, "line", fewerUnits)
			}) + (player.commanderId === "cmd-1-01" && fewerUnits ? 1 : 0);
		},
		commanderDamage(winner, loser, frontName, margin) {
			const effects = winner.tacticEffects || {};
			const ownFront = winner.fronts[frontName];
			const opposingFront = loser.fronts[frontName];
			let bonus = 0;
			if (effects.breakthrough && ownFront.line && opposingFront.line && ownFront.line.currentForce > opposingFront.line.currentForce) bonus += effects.breakthrough;
			if (effects.collectiveOverrun) {
				if (SLOT_NAMES.filter((slot) => ownFront[slot]?.keywords.includes("Mente Collettiva")).length >= 2) bonus += effects.collectiveOverrun;
			}
			const winningLine = ownFront.line;
			if (winningLine && getUnitKeywords(winner, winningLine, frontName, "line").some((keyword) => keyword.startsWith("Logorare")) && winner.sites?.some((site) => site.catalogId === "set-2-097")) bonus++;
			const unitDamage = getCommanderVictoryDamageEffects(playerUnits(winner).map((entry) => entry.unit), winningLine, winner.frontWinsThisTurn || 0, GameState.turnNumber, !opposingFront.line);
			bonus += unitDamage.amount;
			for (const unit of unitDamage.oncePerTurnSources) unit.lastWinDamageTurn = GameState.turnNumber;
			if (winner.frontWinsThisTurn >= 2 && winner.field?.catalogId === "set-1-119" && winner.field.lastExtraDamageTurn !== GameState.turnNumber) {
				winner.field.lastExtraDamageTurn = GameState.turnNumber;
				bonus++;
			}
			const damage = margin + bonus;
			return frontName === "center" && effects.doubleCentralDamage ? damage * 2 : damage;
		},
		resolveUnitLineWinEffects(loser, frontName, winningLine) {
			if (!shouldDestroySupportOnUnitLineWin(winningLine)) return;
			const slotName = ["supA", "supB"].find((slotName) => loser.fronts[frontName][slotName] && !loser.fronts[frontName][slotName].keywords.includes("Divinità"));
			if (slotName) CombatResolver.destroyUnit(loser, frontName, slotName, "effect-destroy");
		},
		async resolveFront(frontName) {
			const attacker = GameState.current;
			const defender = GameState.opponent;
			const attackFront = attacker.fronts[frontName];
			const defendFront = defender.fronts[frontName];
			if (!attackFront.line && !defendFront.line) {
				Logger.log(`${FRONT_LABELS$1[frontName]}: nessuna Linea, nessuno scontro.`);
				return;
			}
			if (this.collectOpeningWear(frontName).length) await this.applyOpeningWear(frontName);
			if (!attackFront.line && !defendFront.line) {
				Logger.log(`${FRONT_LABELS$1[frontName]}: le Linee cadono prima dello scontro.`);
				return;
			}
			if (!attackFront.line) {
				Logger.log(`${FRONT_LABELS$1[frontName]}: nessuna Linea attaccante.`);
				return;
			}
			if (GameState.resolveReactions) {
				await GameController.offerReactionWindow(frontName);
				if (GameState.gameOver) return;
				if (!attackFront.line) {
					Logger.log(`${FRONT_LABELS$1[frontName]}: nessuna Linea attaccante.`);
					return;
				}
			}
			const attackStrength = this.strength(attacker, frontName, defendFront.line);
			if (!defendFront.line) {
				attacker.frontWinsThisTurn = (attacker.frontWinsThisTurn || 0) + 1;
				this.resolveUnitLineWinEffects(defender, frontName, attackFront.line);
				const damage = this.commanderDamage(attacker, defender, frontName, attackStrength);
				this.noteAscension(attackFront.line);
				Logger.log(`${FRONT_LABELS$1[frontName]} scoperto: ${damage} danni al Comandante.`);
				await this.dealCommanderDamage(defender, frontName, damage);
				GameState.checkVictory();
				UIRenderer.refresh();
				return;
			}
			const defendStrength = this.strength(defender, frontName, attackFront.line);
			Logger.log(`${FRONT_LABELS$1[frontName]}: ${attackStrength} vs ${defendStrength}.`);
			const comparison = compareCombatStrengths(attackStrength, defendStrength);
			if (comparison.result === "tie") {
				Logger.log("Parità: entrambe le Linee subiscono 1 danno.");
				await this.damageLine(attacker, frontName, 1);
				await this.damageLine(defender, frontName, 1);
				return;
			}
			const winner = comparison.result === "left-wins" ? attacker : defender;
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
				Logger.log(`L’avversario sceglie ${useTorment ? "Tormento" : "il danno al Comandante"} sul Fronte ${FRONT_LABELS$1[frontName]}.`);
				return useTorment;
			}
			UIRenderer.renderControls();
			return new Promise((resolve) => {
				GameState.pendingTorment = {
					winnerName: winner.name,
					frontName,
					commanderDamage,
					torment,
					resolve
				};
				UIRenderer.renderControls();
				document.getElementById("btn-torment-madness").focus();
			});
		},
		chooseTormentOutcome(useTorment) {
			const pending = GameState.pendingTorment;
			if (!pending) return;
			GameState.pendingTorment = null;
			Logger.log(`Scegli ${useTorment ? `${pending.torment} Follia` : `${pending.commanderDamage} danni al Comandante`} con Tormento.`);
			pending.resolve(useTorment);
			UIRenderer.renderControls();
		},
		async dealCommanderDamage(defender, frontName, amount) {
			if (defender === GameState.players[1] && amount > 0) {
				const units = GameState.unitsInFront(defender, frontName).filter((unit) => unit.currentForce > 0).sort((a, b) => a.currentForce - b.currentForce || a.name.localeCompare(b.name));
				const totalSacrifice = units.reduce((sum, unit) => sum + unit.currentForce, 0);
				if ((defender.pc <= 8 || amount >= 4) && totalSacrifice >= amount) {
					let prevented = 0;
					for (const unit of units) {
						if (prevented >= amount) break;
						prevented += unit.currentForce;
						CombatResolver.removeUnit(defender, frontName, unit.position);
					}
					amount = Math.max(0, amount - prevented);
					Logger.log(`L’avversario sacrifica Unità per prevenire ${prevented} danni al Comandante.`);
				}
			}
			if (defender !== GameState.players[0] || amount <= 0 || GameState.unitsInFront(defender, frontName).length === 0) {
				defender.pc = Math.max(0, defender.pc - amount);
				Logger.log(`${defender.name} perde ${amount} PC.`);
				return;
			}
			GameState.sacrifice = {
				frontName,
				remaining: amount,
				resolve: null
			};
			Logger.log(`Puoi sacrificare Unità in ${FRONT_LABELS$1[frontName]} per prevenire danni al Comandante, oppure confermare.`);
			UIRenderer.refresh();
			await new Promise((resolve) => {
				GameState.sacrifice.resolve = resolve;
			});
			if (GameState.sacrifice.remaining > 0) {
				defender.pc = Math.max(0, defender.pc - GameState.sacrifice.remaining);
				Logger.log(`${defender.name} perde ${GameState.sacrifice.remaining} PC.`);
			} else Logger.log("Tutto il danno al Comandante è stato prevenuto.");
			GameState.sacrifice = null;
			UIRenderer.refresh();
		},
		removeUnit(player, frontName, slotName, reason = "removed", sourcePlayer = null, promotionSlot = null) {
			const front = player.fronts[frontName];
			const unit = front[slotName];
			if (!unit) return;
			if (reason === "effect-destroy" && isProtectedFromEffectDestruction(unit, slotName)) {
				Logger.log(`${unit.name} non può essere distrutta da effetti mentre è in Linea.`);
				return null;
			}
			front[slotName] = null;
			const controller = GameState.players.find((candidate) => candidate.controlledUnits?.some((control) => control.unitId === unit.id));
			const controlIndex = controller?.controlledUnits.findIndex((control) => control.unitId === unit.id) ?? -1;
			const control = controlIndex >= 0 ? controller.controlledUnits[controlIndex] : null;
			let owner = control ? GameState.players.find((candidate) => candidate.id === control.ownerId) || player : player;
			if (unit.infiltrated) owner = GameState.players.find((candidate) => candidate.id === unit.owner) || owner;
			if (control) controller.controlledUnits.splice(controlIndex, 1);
			const hadSpectralEcho = getUnitKeywords(player, unit, frontName, slotName).some((keyword) => keyword.startsWith("Eco Spettrale"));
			if (unit.equipment) {
				const equipment = unit.equipment;
				unit.equipment = null;
				owner.discard.push(equipment);
				Logger.log(`${equipment.name} va negli scarti.`);
			}
			const destroyed = reason === "combat-destroy" || reason === "effect-destroy";
			owner.discard.push(unit);
			if (unit.keywords?.includes("Divinità") && reason === "combat-destroy") Logger.log(`${unit.name} viene Sigillata e va negli scarti.`);
			else Logger.log(`${unit.name} va negli scarti.`);
			this.onUnitRemoved(player, unit, frontName, reason, sourcePlayer);
			if (slotName === "line") this.promoteSupport(front, player, frontName, promotionSlot);
			if (destroyed && hadSpectralEcho) this.trySpectralReturn(owner, unit, frontName);
			const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
			if (slotName === "line" && !front.line && enemy.field?.catalogId === "set-1-117") {
				player.pc = Math.max(0, player.pc - 1);
				Logger.log(`${enemy.field.name}: ${player.name} perde 1 PC perché un Fronte diventa scoperto.`);
				GameState.checkVictory();
			}
			return unit;
		},
		destroyUnit(player, frontName, slotName, reason = "effect-destroy") {
			const unit = player.fronts[frontName]?.[slotName];
			if (!unit || unit.keywords.includes("Divinità")) return null;
			this.removeUnit(player, frontName, slotName, reason);
			return unit;
		},
		onUnitRemoved(owner, unit, frontName, reason, sourcePlayer = null) {
			if (unit.keywords.includes("Eco Spettrale") && owner.sites?.some((site) => site.catalogId === "set-2-099")) GameController.drawCards(owner, 1, "Santuario della Seconda Morte");
			const destroyed = reason === "combat-destroy" || reason === "effect-destroy";
			const enemy = owner === GameState.players[0] ? GameState.players[1] : GameState.players[0];
			if (!destroyed) return;
			for (const effect of getUnitDestructionEffects(unit)) if (effect.type === "damage-enemy-line-in-front" && enemy.fronts[frontName].line) this.damageLine(enemy, frontName, effect.amount, owner, true);
			if (reason === "combat-destroy" && owner.sites?.some((site) => site.catalogId === "set-1-096")) {
				const target = FRONT_NAMES$1.find((name) => enemy.fronts[name].line);
				if (target) this.damageLine(enemy, target, 1, owner, true);
			}
			if (owner.sites?.some((site) => site.catalogId === "set-2-080")) {
				GameController.drawCards(owner, 1, "Pozzo delle Anime");
				const siteIndex = owner.sites.findIndex((site) => site.catalogId === "set-2-080");
				owner.discard.push(...owner.sites.splice(siteIndex, 1));
			}
			if (unit.keywords.includes("Mente Collettiva") && owner.sites?.some((site) => site.catalogId === "set-3-095")) {
				const frontName = FRONT_NAMES$1.find((name) => owner.fronts[name].line && (!owner.fronts[name].supA || !owner.fronts[name].supB));
				if (frontName) {
					const front = owner.fronts[frontName];
					createToken(owner, frontName, front.supA ? "supB" : "supA");
				}
			}
			if (destroyed) {
				const destroyedKeywords = getUnitKeywords(owner, unit, frontName, unit.position);
				const reactions = getUnitDestructionReactions(playerUnits(owner).map((entry) => entry.unit), {
					...unit,
					keywords: destroyedKeywords
				}, GameState.turnNumber);
				for (const reaction of reactions) if (reaction.type === "draw-card") {
					reaction.source.lastDestroyedDrawTurn = GameState.turnNumber;
					GameController.drawCards(owner, 1, reaction.source.name);
				} else if (reaction.type === "create-support-token") {
					const targetFront = FRONT_NAMES$1.find((name) => owner.fronts[name].line && (!owner.fronts[name].supA || !owner.fronts[name].supB));
					if (targetFront) {
						const front = owner.fronts[targetFront];
						createToken(owner, targetFront, front.supA ? "supB" : "supA");
					}
				}
			}
			if (unit.catalogId === "set-2-014" && destroyed) {
				owner.pc = Math.max(0, owner.pc - 1);
				Logger.log(`${unit.name}: perdi 1 PC quando viene distrutto.`);
				GameState.checkVictory();
			}
			if (reason === "combat-destroy" && enemy.sites?.some((site) => site.catalogId === "set-2-092")) GameController.drawCards(enemy, 1, "Santuario delle Ombre");
			if (reason === "combat-destroy" && sourcePlayer) {
				const killer = sourcePlayer.fronts[frontName]?.line;
				if ((killer?.equipment?.catalogId || killer?.equipment?.id) === "set-2-087") GameController.drawCards(sourcePlayer, 1, killer.equipment.name);
			}
			if (reason !== "combat-destroy" || !sourcePlayer || unit.position !== "line") return;
			const activeLine = sourcePlayer.fronts[frontName].line;
			const equipmentId = activeLine?.equipment?.catalogId;
			for (const effect of getUnitLineDestructionEffects(activeLine)) if (effect.type === "commander-damage") {
				owner.pc = Math.max(0, owner.pc - effect.amount);
				Logger.log(`${activeLine.name}: ${owner.name} perde ${effect.amount} PC aggiuntivi.`);
				GameState.checkVictory();
			} else if (effect.type === "draw-card") GameController.drawCards(sourcePlayer, 1, activeLine.name);
			else if (effect.type === "add-parasite") GameState.addParasites(sourcePlayer, owner, 1);
			else if (effect.type === "exile-from-discard") {
				const discardOwner = [sourcePlayer, owner].find((candidate) => candidate.discard.length);
				if (discardOwner) {
					const [exiled] = discardOwner.discard.splice(0, 1);
					discardOwner.exile.push(exiled);
					Logger.log(`${activeLine.name}: ${exiled.name} viene esiliata dagli scarti.`);
				}
			} else if (effect.type === "put-spectral-card-on-top") {
				const index = sourcePlayer.discard.findIndex((card) => card.keywords?.some((keyword) => keyword.startsWith("Eco Spettrale")));
				if (index >= 0) {
					const [recovered] = sourcePlayer.discard.splice(index, 1);
					sourcePlayer.armyDeck.push(recovered);
					Logger.log(`${activeLine.name}: ${recovered.name} viene messa in cima al mazzo.`);
				}
			} else if (effect.type === "destroy-enemy-support-in-front") {
				const slotName = ["supA", "supB"].find((slot) => enemy.fronts[frontName][slot] && !enemy.fronts[frontName][slot].keywords.includes("Divinità"));
				if (slotName) this.destroyUnit(enemy, frontName, slotName, "effect-destroy");
			} else if (effect.type === "temporary-force") {
				activeLine.currentForce += effect.amount;
				activeLine.temporaryForce = (activeLine.temporaryForce || 0) + effect.amount;
				Logger.log(`${activeLine.name}: ottiene +${effect.amount} Forza fino alla fine del turno.`);
			} else if (effect.type === "move-enemy-support-adjacent") {
				const targetPlayer = sourcePlayer === GameState.players[0] ? GameState.players[1] : GameState.players[0];
				const slot = ["supA", "supB"].find((name) => {
					const support = targetPlayer.fronts[frontName][name];
					return support && !isProtectedFromEnemyMovement(targetPlayer, support, frontName);
				});
				if (!slot) continue;
				const moved = targetPlayer.fronts[frontName][slot];
				const sourceIndex = FRONT_NAMES$1.indexOf(frontName);
				const destination = [sourceIndex - 1, sourceIndex + 1].filter((index) => FRONT_NAMES$1[index]).flatMap((index) => ["supA", "supB"].filter((targetSlot) => !targetPlayer.fronts[FRONT_NAMES$1[index]][targetSlot]).map((targetSlot) => ({
					targetFront: FRONT_NAMES$1[index],
					targetSlot
				})))[0];
				if (!destination) continue;
				targetPlayer.fronts[frontName][slot] = null;
				targetPlayer.fronts[destination.targetFront][destination.targetSlot] = moved;
				moved.front = destination.targetFront;
				moved.position = destination.targetSlot;
				GameState.onUnitMoved(targetPlayer, moved, frontName, destination.targetFront);
				Logger.log(`${activeLine.name}: ${moved.name} si sposta in ${FRONT_LABELS$1[destination.targetFront]}.`);
			}
			if (sourcePlayer.sites?.some((site) => site.catalogId === "set-3-108")) {
				const targetPlayer = sourcePlayer === GameState.players[0] ? GameState.players[1] : GameState.players[0];
				const movedFrom = FRONT_NAMES$1.find((name, index) => {
					const line = targetPlayer.fronts[name].line;
					if (name === frontName || !line || isProtectedFromEnemyMovement(targetPlayer, line, name)) return false;
					return [index - 1, index + 1].some((targetIndex) => FRONT_NAMES$1[targetIndex] && !targetPlayer.fronts[FRONT_NAMES$1[targetIndex]].line);
				});
				if (movedFrom) {
					const sourceIndex = FRONT_NAMES$1.indexOf(movedFrom);
					const targetIndex = [sourceIndex - 1, sourceIndex + 1].find((index) => FRONT_NAMES$1[index] && !targetPlayer.fronts[FRONT_NAMES$1[index]].line);
					const movedUnit = targetPlayer.fronts[movedFrom].line;
					targetPlayer.fronts[movedFrom].line = null;
					this.promoteSupport(targetPlayer.fronts[movedFrom], targetPlayer, movedFrom);
					targetPlayer.fronts[FRONT_NAMES$1[targetIndex]].line = movedUnit;
					movedUnit.front = FRONT_NAMES$1[targetIndex];
					movedUnit.position = "line";
					GameState.onUnitMoved(targetPlayer, movedUnit, movedFrom, FRONT_NAMES$1[targetIndex], true);
					Logger.log(`${sourcePlayer.sites.find((site) => site.catalogId === "set-3-108").name}: ${movedUnit.name} si sposta in ${FRONT_LABELS$1[FRONT_NAMES$1[targetIndex]]}.`);
				}
			}
			if (equipmentId === "set-3-084") GameState.addParasites(sourcePlayer, owner, 1);
			if (sourcePlayer.sites?.some((site) => site.catalogId === "set-2-102")) {
				const index = owner.discard.findIndex((card) => card.id === unit.id);
				if (index >= 0) {
					const [destroyedUnit] = owner.discard.splice(index, 1);
					sourcePlayer.discard.push(destroyedUnit);
				}
			}
			if (sourcePlayer.field?.catalogId === "set-1-114" || sourcePlayer.field?.catalogId === "set-2-116" && getUnitKeywords(sourcePlayer, activeLine, frontName, "line").some((keyword) => keyword.startsWith("Logorare")) || sourcePlayer.field?.catalogId === "set-3-117" && getUnitKeywords(sourcePlayer, activeLine, frontName, "line").some((keyword) => keyword.startsWith("Mente Collettiva"))) GameController.drawCards(sourcePlayer, 1, sourcePlayer.field.name);
			if (sourcePlayer.sites?.some((site) => site.catalogId === "set-1-106") && sourcePlayer.sites.find((site) => site.catalogId === "set-1-106").lastKillTurn !== GameState.turnNumber) {
				sourcePlayer.sites.find((site) => site.catalogId === "set-1-106").lastKillTurn = GameState.turnNumber;
				owner.pc = Math.max(0, owner.pc - 1);
			}
			if (equipmentId === "set-1-084") owner.pc = Math.max(0, owner.pc - 1);
			if (sourcePlayer.sites?.some((site) => site.catalogId === "set-1-106") || equipmentId === "set-1-084") Logger.log(`${sourcePlayer.name} infligge 1 danno aggiuntivo per la Linea distrutta.`);
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
				if (sourcePlayer?.sites?.some((site) => site.catalogId === "set-2-084") && sourcePlayer.sites.every((site) => site.catalogId !== "set-2-084" || site.lastDamageTriggerTurn !== GameState.turnNumber)) {
					const site = sourcePlayer.sites.find((item) => item.catalogId === "set-2-084");
					if (site) {
						site.lastDamageTriggerTurn = GameState.turnNumber;
						owner.pc = Math.max(0, owner.pc - 1);
					}
				}
				const fieldOwner = GameState.players.find((player) => player !== owner && player.field?.catalogId === "set-2-118");
				if (fieldOwner && fieldOwner.field.lastTriggerTurn !== GameState.turnNumber) {
					fieldOwner.field.lastTriggerTurn = GameState.turnNumber;
					owner.pc = Math.max(0, owner.pc - 1);
					Logger.log(`${fieldOwner.field.name}: ${owner.name} perde 1 PC.`);
					GameState.checkVictory();
				}
				if (owner.sites?.some((site) => site.catalogId === "set-2-098") && (unit.forceLostThisTurn || 0) >= 2) {
					const slot = ["supA", "supB"].find((name) => owner.fronts[victimFront][name]);
					if (slot) this.destroyUnit(owner, victimFront, slot);
				}
			}
		},
		restoreControlledUnits() {
			for (const unit of restoreControlledUnits(GameState.players)) Logger.log(`${unit.name} torna sotto il controllo del suo proprietario.`);
		},
		promoteSupport(front, player, frontName, slot = null) {
			const eligible = (name) => front[name] && !front[name].infiltrated;
			const next = slot && eligible(slot) ? slot : eligible("supA") ? "supA" : eligible("supB") ? "supB" : null;
			if (!next || !front[next]) return;
			front.line = front[next];
			front.line.position = "line";
			front[next] = next === "supA" ? front.supB : null;
			if (next === "supA") front.supB = null;
			if (front.supA) front.supA.position = "supA";
			GameState.onEquipmentPositionEntry(player, front.line, "line");
			Logger.log(`${front.line.name} viene promosso a Linea.`);
		},
		promptPromotionSlot(player, frontName) {
			return new Promise((resolve) => {
				GameState.pendingPromotion = {
					frontName,
					supports: ["supA", "supB"].filter((slot) => player.fronts[frontName][slot]),
					resolve
				};
				Logger.log(`Scegli quale Supporto diventa la nuova Linea di ${FRONT_LABELS$1[frontName]}.`);
				UIRenderer.renderControls();
				document.getElementById("promotion-choice").focus();
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
				const reduction = getDamageReduction(player, line, frontName, "line");
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
				if (dealt > 0 && !reflected && GameState.phase === "scontro" && line.equipment?.catalogId === "set-1-089") {
					const enemy = player === GameState.players[0] ? GameState.players[1] : GameState.players[0];
					if (enemy.fronts[frontName].line) await this.damageLine(enemy, frontName, 1, player, true);
				}
				Logger.log(`${line.name} subisce ${dealt} danno.`);
				if (line.currentForce <= 0) {
					const promotionSlot = front.supA && front.supB ? player === GameState.players[0] ? await this.promptPromotionSlot(player, frontName) : defaultPromotionSlot(front) : null;
					this.removeUnit(player, frontName, "line", GameState.phase === "scontro" ? "combat-destroy" : "effect-destroy", null, promotionSlot);
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
			const pairs = [[GameState.current, GameState.opponent], [GameState.opponent, GameState.current]];
			const pending = [];
			for (const [owner, enemy] of pairs) {
				const line = owner.fronts[frontName].line;
				if (!line || !enemy.fronts[frontName].line) continue;
				const amount = keywordValue(getUnitKeywords(owner, line, frontName, "line"), "Logorare", 1);
				if (!amount) continue;
				pending.push({
					enemy,
					amount,
					owner
				});
			}
			return pending;
		},
		async applyOpeningWear(frontName) {
			const pending = this.collectOpeningWear(frontName);
			for (const hit of pending) {
				if (!hit.enemy.fronts[frontName].line) continue;
				Logger.log(`Logorare: la Linea di ${FRONT_LABELS$1[frontName]} subisce ${hit.amount} danni.`);
				await this.damageLine(hit.enemy, frontName, hit.amount, hit.owner);
			}
		},
		trySpectralReturn(owner, unit, frontName) {
			const cost = unit.cost ?? 0;
			const available = (owner.domains || []).filter((domain) => !domain.tapped);
			if (available.length < cost) return false;
			const spot = [frontName, ...FRONT_NAMES$1.filter((name) => name !== frontName)].flatMap((name) => ["supA", "supB"].filter((slot) => owner.fronts[name] && !owner.fronts[name][slot]).map((slot) => ({
				name,
				slot
			})))[0];
			if (!spot) return false;
			available.slice(0, cost).forEach((domain) => {
				domain.tapped = true;
			});
			const index = owner.discard.findIndex((card) => card.id === unit.id);
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
			for (const board of GameState.players) for (const frontName of FRONT_NAMES$1) for (const slotName of SLOT_NAMES) {
				const unit = board.fronts[frontName][slotName];
				if (unit?.tormentTurns > 0) entries.push({
					board,
					frontName,
					slotName,
					unit
				});
			}
			for (const entry of entries) {
				const { board, frontName, slotName, unit } = entry;
				if (board.fronts[frontName][slotName] === unit) {
					if (slotName === "line") this.damageLine(board, frontName, 1);
					else {
						unit.currentForce = Math.max(0, (unit.currentForce || 0) - 1);
						Logger.log(`Tormento: ${unit.name} subisce 1 danno.`);
						if (unit.currentForce <= 0) this.removeUnit(board, frontName, slotName, "effect-destroy");
					}
				}
				unit.tormentTurns = Math.max(0, (unit.tormentTurns || 0) - 1);
			}
			const opponent = GameState.players.find((candidate) => candidate !== player);
			if (!opponent) return;
			for (const frontName of FRONT_NAMES$1) {
				const line = player.fronts[frontName].line;
				if (!line) continue;
				const amount = keywordValue(getUnitKeywords(player, line, frontName, "line"), "Tormento", 1);
				if (!amount) continue;
				opponent.pc = Math.max(0, opponent.pc - amount);
				Logger.log(`Tormento: ${line.name} infligge ${amount} danni a ${opponent.name}.`);
				if (player.commanderId === "cmd-2-01" && FRONT_NAMES$1.some((name) => player.fronts[name].line)) GameController.drawCards(player, 1, "Malakor");
			}
		}
	};
	//#endregion
	//#region src/engine/tactic-choices.js
	function getTacticChoices(card, player, opponent) {
		const choices = getTacticChoices$1(card, player, opponent);
		if (!choices || card.cost > 2) return choices;
		return choices.filter((choice) => {
			if (choice.value.owner !== "opponent" || choice.value.slotName !== "line" || opponent.field?.catalogId !== "set-1-116") return true;
			return CombatResolver.strength(opponent, choice.value.frontName, null) < FRONT_NAMES$1.reduce((highest, frontName) => Math.max(highest, CombatResolver.strength(opponent, frontName, null)), 0);
		});
	}
	//#endregion
	//#region src/engine/controller-combat.js
	const combatMethods = {
		async resolveCombat() {
			if (GameState.phase !== "principale" || GameState.currentIndex !== 0 || GameState.sacrifice) return;
			GameState.retreatMode = false;
			GameState.phase = "scontro";
			GameState.sorvoloUsed.clear();
			if (UIRenderer.getSorvoloOptions().length > 0) {
				GameState.pendingSorvolo = true;
				Logger.log("Sorvolo: puoi spostare Unità in un Fronte adiacente come Supporto.");
				UIRenderer.refresh();
				return;
			}
			await this.continueCombat();
		},
		useSorvolo() {
			const option = UIRenderer.getSorvoloOptions()[Number(document.getElementById("sorvolo-choice").value)];
			if (!option) return;
			const player = GameState.players[0];
			const source = player.fronts[option.frontName];
			const target = player.fronts[option.targetFront];
			source[option.slotName] = null;
			if (option.slotName === "line") CombatResolver.promoteSupport(source, player, option.frontName);
			target[option.targetSlot] = option.unit;
			option.unit.front = option.targetFront;
			option.unit.position = option.targetSlot;
			GameState.onUnitMoved(player, option.unit, option.frontName, option.targetFront, option.slotName === "line", true);
			GameState.sorvoloUsed.add(option.unit.id);
			Logger.log(`${option.unit.name} usa Sorvolo: entra in Supporto a ${FRONT_LABELS$1[option.targetFront]}.`);
			if (UIRenderer.getSorvoloOptions().length === 0) this.skipSorvolo();
			else UIRenderer.refresh();
		},
		skipSorvolo() {
			GameState.pendingSorvolo = false;
			UIRenderer.refresh();
			this.continueCombat();
		},
		canPlayInstant(player, opponent, card) {
			if (!isImmediateTacticSupported(card) || tacticTiming(card) === "standard") return false;
			const siteTacticLimit = GameState.players.some((owner) => owner.sites?.some((site) => site.catalogId === "set-2-095"));
			if ((player.tacticLimitActive || siteTacticLimit) && (player.tacticsPlayedThisTurn || 0) >= 1) return false;
			const choices = getTacticChoices(card, player, opponent);
			if (choices === null || tacticRequiresChoice(card) && choices.length === 0) return false;
			const ready = player.domains.filter((domain) => !domain.tapped).length;
			return this.getCardCost(player, card) <= ready;
		},
		playEnemyReaction(enemy, opponent) {
			let guard = 0;
			while (!GameState.gameOver && guard < 8) {
				guard += 1;
				const domains = enemy.domains.filter((domain) => !domain.tapped);
				const candidates = enemy.hand.map((card, index) => ({
					card,
					index
				})).filter(({ card }) => this.canPlayInstant(enemy, opponent, card)).map((candidate) => {
					const choices = getTacticChoices(candidate.card, enemy, opponent);
					return {
						...candidate,
						tacticChoice: choices?.[0]?.value ?? null,
						score: 3 - this.getCardCost(enemy, candidate.card) * .1
					};
				}).sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id));
				if (candidates.length === 0) return;
				const candidate = candidates[0];
				domains.slice(0, this.getCardCost(enemy, candidate.card)).forEach((domain) => {
					domain.tapped = true;
				});
				enemy.hand.splice(candidate.index, 1);
				enemy.discard.push(candidate.card);
				enemy.tacticsPlayedThisTurn = (enemy.tacticsPlayedThisTurn || 0) + 1;
				Logger.log(`Avversario gioca ${candidate.card.name}.`);
				Logger.log(resolveImmediateTactic(candidate.card, enemy, opponent, candidate.tacticChoice, {
					damageLine: (target, frontName, amount) => CombatResolver.damageLine(target, frontName, amount, enemy),
					onForceLoss: (target, unit, amount) => CombatResolver.onForceLoss(target, unit, amount, enemy),
					onUnitPlayed: (owner, unit) => {
						GameState.onUnitEntry(owner, unit, unit.front, unit.position, true);
					},
					removeUnit: (target, frontName, slotName) => CombatResolver.removeUnit(target, frontName, slotName, "sacrifice"),
					destroyUnit: (target, frontName, slotName) => CombatResolver.destroyUnit(target, frontName, slotName)
				}));
				GameState.checkVictory();
			}
		},
		async offerReactionWindow(frontName) {
			const order = [GameState.currentIndex, 1 - GameState.currentIndex];
			for (const playerIndex of order) {
				if (GameState.gameOver) return;
				const player = GameState.players[playerIndex];
				const opponent = GameState.players[1 - playerIndex];
				if (playerIndex !== 0) {
					this.playEnemyReaction(player, opponent);
					continue;
				}
				if (!player.hand.some((card) => this.canPlayInstant(player, opponent, card))) continue;
				Logger.log(`Finestra di reazione su ${FRONT_LABELS$1[frontName]}: gioca una Tattica Istantanea o passa.`);
				await new Promise((resolve) => {
					GameState.reactionWindow = {
						frontName,
						playerIndex: 0,
						resolve
					};
					UIRenderer.refresh();
					document.getElementById("btn-reaction-pass").focus();
				});
				GameState.reactionWindow = null;
			}
		},
		passReaction() {
			const pending = GameState.reactionWindow;
			if (!pending || pending.playerIndex !== 0 || GameState.pendingTactic) return;
			Logger.log(`Passi la finestra di reazione su ${FRONT_LABELS$1[pending.frontName]}.`);
			GameState.reactionWindow = null;
			UIRenderer.refresh();
			pending.resolve();
		},
		closeReactionWindow() {
			const pending = GameState.reactionWindow;
			if (!pending) return;
			GameState.reactionWindow = null;
			pending.resolve();
		},
		async continueCombat() {
			GameState.pendingSorvolo = false;
			UIRenderer.renderControls();
			GameState.resolvePermanentCombatStart(GameState.currentIndex);
			await CombatResolver.resolveAll();
			this.removeCombatBonuses();
			if (!GameState.gameOver) {
				GameState.phase = "finale";
				UIRenderer.refresh();
				Logger.log("Scontro terminato. Premi FINE TURNO per concludere.");
			}
		},
		async runEnemyTurn() {
			if (GameState.gameOver) return;
			const enemy = GameState.players[1];
			Logger.log("L’avversario pianifica le mosse.");
			this.activateAutomaticCommander(enemy);
			while (!GameState.gameOver) {
				const domains = enemy.domains.filter((domain) => !domain.tapped);
				const candidates = enemy.hand.map((card, index) => ({
					card,
					index
				})).filter(({ card }) => {
					if (card.category !== "unit" && !isImmediateTacticSupported(card)) return false;
					if (card.category === "tactic") {
						const siteTacticLimit = GameState.players.some((owner) => owner.sites?.some((site) => site.catalogId === "set-2-095"));
						if ((enemy.tacticLimitActive || siteTacticLimit) && enemy.tacticsPlayedThisTurn >= 1) return false;
						const choices = getTacticChoices(card, enemy, GameState.players[0]);
						if (choices === null || tacticRequiresChoice(card) && choices.length === 0) return false;
					}
					return this.getCardCost(enemy, card) <= domains.length;
				}).map((candidate) => {
					if (candidate.card.category !== "unit") {
						const choices = getTacticChoices(candidate.card, enemy, GameState.players[0]);
						return {
							...candidate,
							tactic: true,
							tacticChoice: choices?.[0]?.value ?? null,
							deployment: null,
							score: 3 + (enemy.parasites === 0 ? 1 : 0) - this.getCardCost(enemy, candidate.card) * .1
						};
					}
					return {
						...candidate,
						tactic: false,
						deployment: this.findEnemySlot(enemy, candidate.card),
						score: this.scoreEnemyPlay(enemy, candidate.card, domains.length)
					};
				}).filter((candidate) => candidate.tactic || candidate.deployment).sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id) || FRONT_NAMES$1.indexOf(a.deployment?.frontName) - FRONT_NAMES$1.indexOf(b.deployment?.frontName));
				if (candidates.length === 0) break;
				const candidate = candidates[0];
				const cost = this.getCardCost(enemy, candidate.card);
				domains.slice(0, cost).forEach((domain) => {
					domain.tapped = true;
				});
				enemy.hand.splice(candidate.index, 1);
				if (candidate.tactic) {
					enemy.discard.push(candidate.card);
					enemy.tacticsPlayedThisTurn = (enemy.tacticsPlayedThisTurn || 0) + 1;
					Logger.log(`Avversario gioca ${candidate.card.name}.`);
					Logger.log(resolveImmediateTactic(candidate.card, enemy, GameState.players[0], candidate.tacticChoice, {
						damageLine: (target, frontName, amount) => CombatResolver.damageLine(target, frontName, amount, enemy),
						onForceLoss: (target, unit, amount) => CombatResolver.onForceLoss(target, unit, amount, enemy),
						onUnitPlayed: (owner, unit) => {
							const frontName = unit.front;
							const slotName = unit.position;
							GameState.onUnitEntry(owner, unit, frontName, slotName, true);
						},
						removeUnit: (target, frontName, slotName) => CombatResolver.removeUnit(target, frontName, slotName, "sacrifice"),
						destroyUnit: (target, frontName, slotName) => {
							return CombatResolver.destroyUnit(target, frontName, slotName);
						}
					}));
					continue;
				}
				const deployment = candidate.deployment;
				const unit = candidate.card;
				markCardCostDiscountUsed(enemy, unit, GameState.turnNumber);
				unit.currentForce = unit.force;
				if (deployment.assaultSwap) {
					const front = enemy.fronts[deployment.frontName];
					const supportSlot = front.supA === null ? "supA" : "supB";
					front[supportSlot] = front.line;
					front[supportSlot].position = supportSlot;
				}
				unit.front = deployment.frontName;
				unit.position = deployment.slotName;
				enemy.fronts[deployment.frontName][deployment.slotName] = unit;
				Logger.log(`Avversario gioca ${unit.name} in ${FRONT_LABELS$1[deployment.frontName]}.`);
				GameState.onUnitEntry(enemy, unit, deployment.frontName, deployment.slotName);
			}
			if (GameState.gameOver) return;
			UIRenderer.refresh();
			await CombatResolver.resolveAll();
			this.removeCombatBonuses();
			if (GameState.gameOver) return;
			GameState.phase = "finale";
			enemy.echo = 0;
			while (enemy.hand.length > 7) enemy.discard.push(enemy.hand.pop());
			Logger.log("Turno avversario terminato.");
			UIRenderer.refresh();
		},
		removeCombatBonuses() {
			CombatResolver.restoreControlledUnits();
			for (const player of GameState.players) for (const [frontName, front] of Object.entries(player.fronts)) {
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
				while (front.line?.currentForce <= 0) CombatResolver.removeUnit(player, frontName, "line");
				for (const slotName of ["supA", "supB"]) if (front[slotName]?.currentForce <= 0) CombatResolver.removeUnit(player, frontName, slotName);
				for (const unitId of player.sacrificeAfterCombat || []) for (const [frontName, front] of Object.entries(player.fronts)) {
					const slotName = SLOT_NAMES.find((slot) => front[slot]?.id === unitId);
					if (!slotName) continue;
					CombatResolver.removeUnit(player, frontName, slotName);
					break;
				}
				player.sacrificeAfterCombat = [];
				player.tacticEffects = {};
				player.tacticLimitActive = false;
			}
			UIRenderer.refresh();
		},
		findEnemySlot(enemy, card) {
			const opponent = GameState.players[0];
			const keywords = [...card.keywords];
			if (enemy.field?.catalogId === "set-1-113" && GameState.countUnits(enemy) < GameState.countUnits(opponent) && !keywords.includes("Assalto")) keywords.push("Assalto");
			for (const frontName of FRONT_NAMES$1) {
				const front = enemy.fronts[frontName];
				const defensive = keywords.includes("Posizione Difensiva");
				const assault = keywords.includes("Assalto");
				const deploymentUnit = {
					...card,
					keywords
				};
				const rules = {
					ownSites: enemy.sites,
					opposingSites: opponent.sites,
					ownField: enemy.field
				};
				const lineDeployment = checkDeployment(deploymentUnit, front, "line", rules);
				if (lineDeployment.legal && (!front.line || lineDeployment.assaultSwap) && (defensive || assault)) return {
					frontName,
					slotName: "line",
					assaultSwap: lineDeployment.assaultSwap
				};
				if (defensive && !front.line) continue;
				for (const slotName of ["supA", "supB"]) if (checkDeployment(deploymentUnit, front, slotName, rules).legal) return {
					frontName,
					slotName
				};
			}
			return null;
		},
		scoreEnemyPlay(enemy, card, availableDomains) {
			const deployment = this.findEnemySlot(enemy, card);
			if (!deployment) return Number.NEGATIVE_INFINITY;
			const front = enemy.fronts[deployment.frontName];
			const enemyFront = GameState.players[0].fronts[deployment.frontName];
			const cost = this.getCardCost(enemy, card);
			return card.force / cost * 2 + Number(card.keywords.includes("Assalto")) * 1.5 + Number(card.keywords.some((keyword) => keyword.startsWith("Tormento"))) + Number(card.keywords.some((keyword) => keyword.startsWith("Infiltrazione"))) + Number(card.keywords.includes("Ferocia")) * .5 + Number(card.keywords.includes("Mente Collettiva")) * .5 + Number(card.keywords.includes("Logorare")) * .5 + (deployment.slotName === "line" ? 2.5 : 0) + (deployment.slotName !== "line" && front.line ? 1.5 : 0) + (!enemyFront.line && deployment.slotName === "line" ? 1 : 0) - Math.max(0, availableDomains - card.cost) * .1;
		}
	};
	//#endregion
	//#region src/engine/controller-commander.js
	const FRONT_LABELS = {
		left: "Sinistra",
		center: "Centro",
		right: "Destra"
	};
	function slotLabel(slotName) {
		if (slotName === "line") return "Linea";
		return slotName === "supA" ? "Supporto A" : "Supporto B";
	}
	const commanderMethods = {
		applyCommanderEffects(actor, effects) {
			const opponentOf = (player) => GameState.players.find((candidate) => candidate !== player);
			const descriptions = [];
			for (const effect of effects) {
				const target = effect.target === "opponent" ? opponentOf(actor) : actor;
				if (!target) continue;
				if (effect.kind === "gainEcho") {
					target.echo += effect.amount;
					descriptions.push(`${target.name} guadagna ${effect.amount} Echo`);
				} else if (effect.kind === "addMadness") {
					target.follia = Math.min(10, target.follia + effect.amount);
					descriptions.push(`${target.name} guadagna ${effect.amount} Follia`);
				} else if (effect.kind === "addParasite") {
					GameState.addParasites(actor, target, effect.amount);
					descriptions.push(`${effect.amount} Parassita a ${target.name}`);
				} else if (effect.kind === "drawArmy") {
					this.drawCards(target, effect.amount, "Comandante");
					descriptions.push(`${target.name} pesca ${effect.amount} carta`);
				} else if (effect.kind === "announce" || effect.kind === "note") descriptions.push("effetto passivo, il tavolo non cambia ora");
				else if (effect.kind === "swarmOrParasite") descriptions.push(this.placeSwarmOrParasite(actor));
				else if (effect.kind === "grantFerocity" || effect.kind === "grantLogorare" || effect.kind === "collectiveBurst" || effect.kind === "ascendOrTorment") descriptions.push(effect.kind);
			}
			return descriptions.join("; ");
		},
		placeSwarmOrParasite(actor) {
			const opponent = GameState.players.find((candidate) => candidate !== actor);
			for (const frontName of FRONT_NAMES$1) for (const slotName of ["supA", "supB"]) if (!actor.fronts[frontName][slotName]) {
				createToken(actor, frontName, slotName, "Pedina Sciame", 1);
				return `una pedina Sciame entra in Supporto su ${FRONT_LABELS[frontName]}`;
			}
			if (opponent) GameState.addParasites(actor, opponent, 1);
			return "1 Parassita sul Comandante avversario";
		},
		canPayCommander(player, commander) {
			const cost = commander.activation?.cost;
			if (!cost) return true;
			if (cost.pc) return player.pc >= cost.pc;
			if (cost.domains) return player.domains.filter((domain) => !domain.tapped).length >= cost.domains;
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
				player.domains.filter((domain) => !domain.tapped).slice(0, cost.domains).forEach((domain) => {
					domain.tapped = true;
				});
				Logger.log(`${commander.name}: paghi ${cost.domains} Domini.`);
			}
		},
		commanderChoices(player, kind) {
			const ownLines = () => FRONT_NAMES$1.flatMap((frontName) => {
				const unit = player.fronts[frontName].line;
				if (!unit) return [];
				return [{
					label: `${FRONT_LABELS[frontName]} · ${unit.name}`,
					value: {
						ownerId: player.id,
						frontName,
						slotName: "line",
						unitId: unit.id
					}
				}];
			});
			if (kind === "grantFerocity" || kind === "grantLogorare") return ownLines();
			if (kind === "collectiveBurst") return FRONT_NAMES$1.flatMap((frontName) => SLOT_NAMES.flatMap((slotName) => {
				const unit = player.fronts[frontName][slotName];
				if (!unit || !hasKeyword(getUnitKeywords(player, unit, frontName, slotName), "Mente Collettiva")) return [];
				return [{
					label: `${unit.name} · ${FRONT_LABELS[frontName]} · ${slotLabel(slotName)}`,
					value: {
						ownerId: player.id,
						frontName,
						slotName,
						unitId: unit.id
					}
				}];
			}));
			if (kind === "ascendOrTorment") return [...GameState.players.filter((owner) => owner === player), ...GameState.players.filter((owner) => owner !== player)].flatMap((owner) => FRONT_NAMES$1.flatMap((frontName) => SLOT_NAMES.flatMap((slotName) => {
				const unit = owner.fronts[frontName][slotName];
				if (!unit || unit.infiltrated && owner === player) return [];
				return [{
					label: `${unit.name} · ${owner === player ? "tua" : "avversaria"} · ${FRONT_LABELS[frontName]}`,
					value: {
						ownerId: owner.id,
						frontName,
						slotName,
						unitId: unit.id
					}
				}];
			}))).sort((left, right) => {
				const leftUnit = this.commanderUnit(left.value);
				const rightUnit = this.commanderUnit(right.value);
				return Number(hasAscension(rightUnit)) - Number(hasAscension(leftUnit));
			});
			return [];
		},
		commanderUnit(choice) {
			const unit = GameState.players.find((candidate) => candidate.id === choice?.ownerId)?.fronts[choice.frontName]?.[choice.slotName];
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
			Logger.log(`${commander.name} — Rifornimento: ${summary || "nessun effetto"}.`);
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
				if (GameState.phase !== "principale" || GameState.currentIndex !== 0) return;
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
					mode: "commander",
					kind,
					card: {
						name: commander.activation.name,
						id: commander.id
					},
					choices
				};
				UIRenderer.renderControls();
				document.getElementById("tactic-choice")?.focus();
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
			const owner = GameState.players.find((candidate) => candidate.id === choice.ownerId);
			const opponent = GameState.players.find((candidate) => candidate !== player);
			if (kind === "grantFerocity") {
				if (hasKeyword(getUnitKeywords(owner, unit, choice.frontName, choice.slotName), "Ferocia")) {
					applyTemporaryForce(unit, 1);
					Logger.log(`${unit.name} ha già Ferocia: +1 Forza fino alla fine del turno.`);
				} else {
					unit.keywords = unit.keywords || [];
					unit.temporaryKeywords = unit.temporaryKeywords || [];
					unit.keywords.push("Ferocia");
					unit.temporaryKeywords.push("Ferocia");
					Logger.log(`${unit.name} ottiene Ferocia fino alla fine del turno.`);
				}
			} else if (kind === "grantLogorare") {
				if (hasKeyword(getUnitKeywords(owner, unit, choice.frontName, choice.slotName), "Logorare")) {
					const enemyLine = opponent?.fronts[choice.frontName].line;
					if (enemyLine) {
						applyTemporaryForce(enemyLine, -1);
						Logger.log(`Logorare già presente: la Linea avversaria perde 1 Forza.`);
					} else Logger.log("Logorare già presente, ma il Fronte avversario non ha una Linea.");
				} else {
					unit.keywords = unit.keywords || [];
					unit.temporaryKeywords = unit.temporaryKeywords || [];
					unit.keywords.push("Logorare");
					unit.temporaryKeywords.push("Logorare");
					Logger.log(`${unit.name} ottiene Logorare fino alla fine del turno.`);
				}
			} else if (kind === "collectiveBurst") {
				applyTemporaryForce(unit, 2);
				if (opponent) GameState.addParasites(player, opponent, 1);
				Logger.log(`${unit.name} ottiene +2 Forza e applica 1 Parassita.`);
			} else if (kind === "ascendOrTorment") {
				if (hasAscension(unit)) {
					grantDivinityAscension(unit);
					Logger.log(`${unit.name} subisce Ascensione: +1 Forza permanente e il tipo Divinità.`);
				} else if (opponent) {
					opponent.tormentCounters = (opponent.tormentCounters || 0) + 1;
					Logger.log(`${opponent.name} riceve 1 segnalino Tormento.`);
				}
			}
			FX.play("play");
			if (GameState.checkVictory()) return;
			UIRenderer.refresh();
		}
	};
	//#endregion
	//#region src/engine/controller-match.js
	const matchMethods = {
		init() {
			const saved = loadGameSave();
			if (saved) {
				GameState.restore(saved);
				Logger.log("Partita ripresa dal salvataggio locale.");
			} else {
				const customDeck = loadCustomDeck();
				GameState.reset(customDeck || UPDATED_MATCH_DECK);
				if (!customDeck) Logger.log("Apertura sulla parte aggiornata: mano e comandi sono in alto.");
			}
			UIRenderer.refresh();
			if (saved && GameState.currentIndex === 1 && !GameState.gameOver) {
				if (GameState.phase === "principale") this.runEnemyTurn().then(() => {
					if (!GameState.gameOver) this.beginTurn(0);
				});
				else if (GameState.phase === "finale") this.beginTurn(0);
			}
		},
		async resetWithDeck(cardIds) {
			if (GameState.phase !== "setup" && !window.confirm("Avviare una nuova partita con questo mazzo? La partita attuale verrà sostituita.")) return;
			clearGameSave();
			GameState.reset(cardIds);
			document.getElementById("game-result").hidden = true;
			UIRenderer.refresh();
			Logger.log("Nuova partita preparata con il mazzo personalizzato.");
			await this.startGame();
		},
		newGame() {
			clearGameSave();
			const customDeck = loadCustomDeck();
			GameState.reset(customDeck || UPDATED_MATCH_DECK);
			document.getElementById("game-result").hidden = true;
			UIRenderer.refresh();
			Logger.log(customDeck ? "Nuova partita preparata con il mazzo salvato." : "Nuova partita preparata con la parte aggiornata.");
		},
		useDemoDecks() {
			if (GameState.phase !== "setup" && !window.confirm("Passare ai mazzi demo e iniziare una nuova partita?")) return false;
			try {
				clearCustomDeck();
				clearGameSave();
				GameState.reset(null);
				document.getElementById("game-result").hidden = true;
				UIRenderer.refresh();
				Logger.log("Nuova partita preparata con i mazzi demo.");
				return true;
			} catch (error) {
				Logger.log(`Impossibile passare ai mazzi demo: ${error.message}`);
				console.error("Impossibile passare ai mazzi demo.", error);
				return false;
			}
		},
		useUpdatedDeck() {
			if (GameState.phase !== "setup" && !window.confirm("Passare al mazzo della parte aggiornata e preparare una nuova partita?")) return false;
			try {
				clearGameSave();
				GameState.reset(UPDATED_MATCH_DECK);
				document.getElementById("game-result").hidden = true;
				UIRenderer.refresh();
				Logger.log("Mazzo della parte aggiornata pronto. Puoi fare Mulligan e iniziare.");
				return true;
			} catch (error) {
				Logger.log(`Impossibile preparare il mazzo aggiornato: ${error.message}`);
				console.error("Impossibile preparare il mazzo aggiornato.", error);
				return false;
			}
		},
		mulligan(selection) {
			if (GameState.phase !== "setup" || GameState.mulliganUsed) return;
			const player = GameState.players[0];
			const targets = Array.isArray(selection) ? [...new Set(selection)].filter((index) => Number.isInteger(index) && player.hand[index]) : player.hand.map((card, index) => GameState.mulliganMarks.has(card.id) ? index : -1).filter((index) => index >= 0);
			const replaced = targets.map((index) => player.hand[index]);
			player.hand = player.hand.filter((_, index) => !targets.includes(index));
			if (replaced.length > 0) {
				player.armyDeck.unshift(...replaced);
				for (let i = 0; i < replaced.length; i++) player.hand.push(player.armyDeck.pop());
			}
			GameState.mulliganUsed = true;
			GameState.mulliganMarks = /* @__PURE__ */ new Set();
			Logger.log(replaced.length === 0 ? "Mulligan saltato: nessuna carta rimpiazzata." : `Mulligan: ${replaced.length} carte in fondo al mazzo, altrettante pescate.`);
			UIRenderer.refresh();
		},
		toggleMulliganMark(card) {
			if (GameState.phase !== "setup" || GameState.mulliganUsed) return;
			const marks = GameState.mulliganMarks;
			if (marks.has(card.id)) marks.delete(card.id);
			else marks.add(card.id);
			UIRenderer.renderHand();
			UIRenderer.renderControls();
		},
		async startGame() {
			if (GameState.phase !== "setup") return;
			document.getElementById("game-result").hidden = true;
			await this.beginTurn(GameState.firstPlayerIndex);
		},
		async beginTurn(playerIndex) {
			if (GameState.gameOver) return;
			GameState.currentIndex = playerIndex;
			GameState.turnNumber++;
			GameState.phase = "rifornimento";
			const player = GameState.current;
			player.commanderAbilityUsed = false;
			player.tacticsPlayedThisTurn = 0;
			player.frontWinsThisTurn = 0;
			this.resolveCommanderRifornimento(player);
			for (const front of Object.values(player.fronts)) for (const slot of SLOT_NAMES) {
				if (!front[slot]) continue;
				front[slot].damageThisTurn = 0;
				front[slot].forceLostThisTurn = 0;
			}
			player.domains.forEach((domain) => {
				domain.tapped = false;
			});
			GameState.resolvePermanentTurnStart(playerIndex);
			for (const siteOwner of GameState.players) if (siteOwner.sites?.some((site) => site.catalogId === "set-1-110")) {
				const unit = FRONT_NAMES$1.flatMap((frontName) => SLOT_NAMES.map((slotName) => ({
					frontName,
					slotName,
					unit: player.fronts[frontName][slotName]
				}))).find((entry) => entry.unit);
				if (unit) CombatResolver.removeUnit(player, unit.frontName, unit.slotName, "sacrifice");
			}
			if (hasSeminatoreSilente(GameState.players.flatMap((owner) => playerUnits(owner).map((entry) => entry.unit))) && player.parasites >= 3) {
				player.pc = Math.max(0, player.pc - 1);
				Logger.log(`${player.name} perde 1 PC aggiuntivo per Seminatore Silente.`);
			}
			if (player.parasites >= 3) {
				player.parasites--;
				Logger.log(`${player.name}: un Parassita viene rimosso (ne restano ${player.parasites}).`);
			}
			if (player.parasites > 0) {
				player.pc = Math.max(0, player.pc - 1);
				Logger.log(`Parassita: ${player.name} perde 1 PC.`);
			}
			CombatResolver.applyTormentAtTurnStart(player);
			if (GameState.checkVictory()) return;
			if (playerIndex === 1 && player.follia > 0) {
				player.echo += player.follia;
				Logger.log(`Avversario canalizza ${player.follia} Follia in Echo.`);
				player.follia = 0;
			}
			const domain = player.domainDeck.pop();
			if (domain) {
				if (GameState.firstTurn) domain.tapped = true;
				player.domains.push(domain);
				Logger.log(`${player.name} pesca un Dominio${GameState.firstTurn ? " (esausto)" : ""}.`);
			}
			if (!GameState.firstTurn && player.armyDeck.length > 0) {
				player.hand.push(player.armyDeck.pop());
				Logger.log(`${player.name} pesca una carta Esercito.`);
			} else if (GameState.firstTurn) Logger.log("Primo turno del primo giocatore: niente pesca Esercito.");
			GameState.firstTurn = false;
			GameState.phase = playerIndex === 0 ? "rifornimento" : "principale";
			Logger.log(`Turno ${GameState.turnNumber}: ${player.name} — ${playerIndex === 0 ? "Fase di Rifornimento" : "Fase Principale"}.`);
			UIRenderer.refresh();
			if (playerIndex === 1) {
				await this.runEnemyTurn();
				if (!GameState.gameOver) await this.beginTurn(0);
			}
		},
		channelMadness() {
			if (GameState.phase !== "rifornimento" || GameState.currentIndex !== 0) return;
			const player = GameState.players[0];
			if (player.follia <= 0) return;
			player.follia--;
			player.echo++;
			Logger.log("Canalizzi 1 Follia in 1 Echo.");
			UIRenderer.updateStats();
			UIRenderer.renderControls();
			persistGame(GameState.snapshot());
		},
		enterMainPhase() {
			if (GameState.phase !== "rifornimento" || GameState.currentIndex !== 0) return;
			GameState.phase = "principale";
			Logger.log("Fase Principale: puoi giocare carte e attivare abilità.");
			UIRenderer.refresh();
		},
		async endTurn() {
			if (GameState.phase !== "finale" || GameState.currentIndex !== 0 || GameState.sacrifice) return;
			const player = GameState.players[0];
			while (player.hand.length > 7) {
				player.discard.push(player.hand.pop());
				Logger.log("Scarti una carta per tornare a 7 in mano.");
			}
			player.echo = 0;
			Logger.log("Fine turno: Echo rimossi.");
			GameState.selectedCard = null;
			GameState.selectedFromDiscard = false;
			UIRenderer.refresh();
			await this.beginTurn(1);
		},
		handleSlotClick(frontName, slotName) {
			if (GameState.sacrifice) CombatResolver.sacrifice(frontName, slotName);
			else if (GameState.retreatMode) this.retreat(frontName, slotName);
			else this.deploy(frontName, slotName);
		},
		toggleRetreat() {
			if (GameState.phase !== "principale" || GameState.currentIndex !== 0 || GameState.gameOver) return;
			if (GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment || GameState.pendingPromotion || GameState.pendingSorvolo) return;
			GameState.retreatMode = !GameState.retreatMode;
			if (GameState.retreatMode) {
				GameState.selectedCard = null;
				Logger.log("Ritirata: scegli un tuo Supporto da scartare per 1 Dominio attivo.");
			}
			UIRenderer.refresh();
		},
		retreat(frontName, slotName) {
			if (GameState.phase !== "principale" || GameState.currentIndex !== 0 || GameState.gameOver) return false;
			if (GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment || GameState.pendingPromotion) return false;
			if (slotName !== "supA" && slotName !== "supB") return false;
			const player = GameState.current;
			const unit = player.fronts[frontName]?.[slotName];
			if (!unit || unit.infiltrated) return false;
			const available = player.domains.filter((domain) => !domain.tapped);
			if (available.length < 1) {
				Logger.log("Ritirata: serve 1 Dominio attivo.");
				return false;
			}
			available[0].tapped = true;
			Logger.log(`Ritirata: paghi 1 Dominio e scarti ${unit.name}.`);
			CombatResolver.removeUnit(player, frontName, slotName, "retreat");
			GameState.retreatMode = false;
			UIRenderer.refresh();
			return true;
		},
		purgeParasite() {
			if (GameState.phase !== "principale" || GameState.currentIndex !== 0 || GameState.gameOver) return false;
			if (GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment || GameState.pendingPromotion || GameState.pendingSorvolo) return false;
			const player = GameState.current;
			if ((player.parasites || 0) < 1) {
				Logger.log("Purga: non hai Parassiti.");
				return false;
			}
			const available = player.domains.filter((domain) => !domain.tapped);
			if (available.length < 2) {
				Logger.log("Purga: servono 2 Domini attivi.");
				return false;
			}
			available[0].tapped = true;
			available[1].tapped = true;
			player.parasites -= 1;
			Logger.log(`Purga: paghi 2 Domini e rimuovi 1 Parassita (ne restano ${player.parasites}).`);
			UIRenderer.refresh();
			return true;
		},
		deployInfiltration(frontName, slotName) {
			this.playInfiltratedUnit(frontName, slotName);
		},
		finishSacrifice() {
			CombatResolver.finishSacrifice();
		},
		chooseTorment(useTorment) {
			CombatResolver.chooseTormentOutcome(useTorment);
		},
		choosePromotionSlot(slot) {
			CombatResolver.choosePromotionSlot(slot);
		},
		cancelSelection() {
			GameState.selectedCard = null;
			GameState.selectedFromDiscard = false;
			GameState.retreatMode = false;
			UIRenderer.refresh();
		}
	};
	//#endregion
	//#region src/engine/controller-play.js
	const playMethods = {
		selectCard(card) {
			if (GameState.reactionWindow?.playerIndex === 0) {
				if (GameState.pendingTactic || GameState.sacrifice || GameState.pendingTorment || GameState.pendingPromotion) return;
				if (!isImmediateTacticSupported(card) || tacticTiming(card) === "standard") {
					Logger.log(`${card.name}: in questa finestra puoi giocare solo una Tattica Istantanea.`);
					return;
				}
				this.playImmediateTactic(card);
				return;
			}
			if (GameState.phase !== "principale" || GameState.currentIndex !== 0 || GameState.sacrifice || GameState.pendingTactic || GameState.pendingTorment) return;
			if (card.category !== "unit") {
				if (card.category === "site" || card.category === "field") {
					this.playSite(card);
					return;
				}
				if (card.category === "equipment") {
					this.playEquipment(card);
					return;
				}
				if (isImmediateTacticSupported(card)) {
					this.playImmediateTactic(card);
					return;
				}
				Logger.log(`${card.name}: effetto non ancora implementato; la carta è catalogata ma non giocabile in questa build.`);
				return;
			}
			GameState.selectedCard = GameState.selectedCard?.id === card.id ? null : card;
			GameState.selectedFromDiscard = false;
			if (GameState.selectedCard) Logger.log(`Selezionata ${card.name}: scegli una posizione.`);
			UIRenderer.renderHand();
			UIRenderer.updateBoardInteractivity();
		},
		getCardCost(player, card, fromDiscard = false) {
			return calculateCardCost(player, card, {
				fromDiscard,
				turnNumber: GameState.turnNumber,
				players: GameState.players
			});
		},
		playSite(card) {
			const player = GameState.players[0];
			if (GameState.phase !== "principale" || GameState.currentIndex !== 0) return;
			if (player.hand.findIndex((item) => item.id === card.id) < 0) throw new Error(`Il Sito ${card.name} non è più in mano.`);
			const available = player.domains.filter((domain) => !domain.tapped);
			const cost = this.getCardCost(player, card);
			if (available.length < cost) {
				Logger.log(`Domini insufficienti per ${card.name}: servono ${cost}, ne hai ${available.length} attivi.`);
				return;
			}
			if (card.category === "field" && player.field) {
				this.commitPermanentCard(card, null);
				return;
			}
			if (player.sites.length + Number(Boolean(player.field)) >= 3) {
				const choices = [...player.sites.map((site) => ({
					label: `Distruggi ${site.name} per giocare ${card.name}`,
					value: {
						zone: "site",
						cardId: site.id
					}
				})), ...player.field ? [{
					label: `Distruggi il Campo ${player.field.name} per giocare ${card.name}`,
					value: {
						zone: "field",
						cardId: player.field.id
					}
				}] : []];
				if (choices.length === 0) {
					Logger.log(`${card.name}: non c'è uno spazio Sito disponibile.`);
					return;
				}
				GameState.pendingTactic = {
					card,
					choices,
					mode: "permanent-replace"
				};
				UIRenderer.renderControls();
				document.getElementById("tactic-choice").focus();
				return;
			}
			this.commitPermanentCard(card, null);
		},
		commitPermanentCard(card, replaced = null) {
			const player = GameState.players[0];
			const cardIndex = player.hand.findIndex((item) => item.id === card.id);
			if (cardIndex < 0) throw new Error(`La carta ${card.name} non è più in mano.`);
			const available = player.domains.filter((domain) => !domain.tapped);
			const cost = this.getCardCost(player, card);
			if (available.length < cost) {
				Logger.log(`Domini insufficienti per ${card.name}: servono ${cost}, ne hai ${available.length} attivi.`);
				return;
			}
			if (card.category === "field" && player.field && !replaced) {
				player.discard.push(player.field);
				player.field = null;
			}
			if (replaced) {
				const old = replaced.zone === "field" ? player.field : player.sites.find((site) => site.id === replaced.cardId);
				if (!old) throw new Error("La carta permanente da sostituire non è più in gioco.");
				if (replaced.zone === "field") player.field = null;
				else player.sites.splice(player.sites.indexOf(old), 1);
				player.discard.push(old);
			}
			available.slice(0, cost).forEach((domain) => {
				domain.tapped = true;
			});
			const cardInstance = {
				...card,
				decay: card.category === "site" ? card.decay : null,
				decayRemaining: card.category === "site" ? card.decay : null,
				ruins: 0
			};
			player.hand.splice(cardIndex, 1);
			if (card.category === "field") player.field = cardInstance;
			else player.sites.push(cardInstance);
			Logger.log(`${card.name} entra in gioco${card.decay ? ` con ${card.decay} Decadenza` : ""}.`);
			this.onPermanentEntry(player, cardInstance);
			UIRenderer.refresh();
		},
		playEquipment(card) {
			const player = GameState.players[0];
			const available = player.domains.filter((domain) => !domain.tapped);
			const cost = this.getCardCost(player, card);
			const choices = FRONT_NAMES$1.flatMap((frontName) => SLOT_NAMES.filter((slotName) => player.fronts[frontName][slotName]).map((slotName) => {
				const unit = player.fronts[frontName][slotName];
				return {
					label: `${unit.name} · ${FRONT_LABELS$1[frontName]} · ${slotName === "line" ? "Linea" : "Supporto"}${unit.equipment ? ` · sostituisce ${unit.equipment.name}` : ""}`,
					value: {
						frontName,
						slotName,
						unitId: unit.id
					}
				};
			}));
			if (available.length < cost) {
				Logger.log(`Domini insufficienti per ${card.name}: servono ${cost} (costo carta + Equip), ne hai ${available.length}.`);
				return;
			}
			if (!choices.length) {
				Logger.log(`${card.name}: non hai Unità in gioco da equipaggiare.`);
				return;
			}
			GameState.pendingTactic = {
				card,
				choices,
				mode: "equipment"
			};
			UIRenderer.renderControls();
			document.getElementById("tactic-choice").focus();
		},
		onPermanentEntry(player, card) {
			const id = card.catalogId || card.id;
			if (["set-1-097", "set-2-083"].includes(id)) this.drawCards(player, 1, `${card.name}`);
			if (["set-3-090"].includes(id)) {
				const availableFront = FRONT_NAMES$1.find((frontName) => !player.fronts[frontName].supA || !player.fronts[frontName].supB);
				if (availableFront) createToken(player, availableFront, player.fronts[availableFront].supA ? "supB" : "supA");
			}
		},
		drawCards(player, amount, reason) {
			let drawn = 0;
			while (drawn < amount && player.armyDeck.length) {
				player.hand.push(player.armyDeck.pop());
				drawn++;
			}
			Logger.log(`${reason}: pesca ${drawn} carta${drawn === 1 ? "" : "e"}.`);
			return drawn;
		},
		canActivateSite(site) {
			const id = site.catalogId || site.id;
			return [
				"set-1-102",
				"set-2-088",
				"set-2-100",
				"set-3-082",
				"set-3-089"
			].includes(id) && site.lastActivatedTurn !== GameState.turnNumber;
		},
		activateSite(site) {
			const id = site.catalogId || site.id;
			const player = GameState.players[0];
			const opponent = GameState.players[1];
			const choices = [];
			if (id === "set-1-102") for (const frontName of FRONT_NAMES$1) {
				if (!player.fronts[frontName].line) continue;
				for (const slotName of SLOT_NAMES) {
					const unit = player.fronts[frontName][slotName];
					if (unit) choices.push({
						label: `Sacrifica ${unit.name} · +2 Forza a ${FRONT_LABELS$1[frontName]}`,
						value: {
							mode: "sacrifice",
							frontName,
							slotName
						}
					});
				}
			}
			else if (id === "set-2-100") for (const frontName of FRONT_NAMES$1) {
				if (!player.fronts[frontName].line) continue;
				for (const slotName of ["supA", "supB"]) {
					const unit = player.fronts[frontName][slotName];
					if (!unit) continue;
					choices.push({
						label: `Sacrifica ${unit.name} · +2 Forza a ${FRONT_LABELS$1[frontName]}`,
						value: {
							mode: "sacrifice-support",
							frontName,
							slotName
						}
					});
				}
			}
			else if (id === "set-2-088") choices.push(...[
				...player.sites.map((target) => ({
					target,
					ownerKey: "player",
					zone: "site"
				})),
				...player.field ? [{
					target: player.field,
					ownerKey: "player",
					zone: "field"
				}] : [],
				...opponent.sites.map((target) => ({
					target,
					ownerKey: "opponent",
					zone: "site"
				})),
				...opponent.field ? [{
					target: opponent.field,
					ownerKey: "opponent",
					zone: "field"
				}] : []
			].map(({ target, ownerKey, zone }) => ({
				label: `Profana ${ownerKey === "player" ? "tuo" : "avversario"} · ${target.name}`,
				value: {
					mode: "profane",
					ownerKey,
					zone,
					siteId: target.id
				}
			})));
			else if (id === "set-3-082") choices.push(...FRONT_NAMES$1.flatMap((frontName) => ["supA", "supB"].filter((slot) => player.fronts[frontName][slot]).flatMap((slot) => FRONT_NAMES$1.filter((target, index) => Math.abs(index - FRONT_NAMES$1.indexOf(frontName)) === 1).flatMap((target) => ["supA", "supB"].filter((targetSlot) => !player.fronts[target][targetSlot]).map((targetSlot) => ({
				label: `${player.fronts[frontName][slot].name} · ${FRONT_LABELS$1[frontName]} → ${FRONT_LABELS$1[target]} Supporto`,
				value: {
					mode: "move-support",
					frontName,
					slot,
					target,
					targetSlot
				}
			}))))));
			else if (id === "set-3-089") choices.push(...FRONT_NAMES$1.flatMap((frontName, index) => {
				if (!player.fronts[frontName].line) return [];
				return [index - 1, index + 1].filter((targetIndex) => FRONT_NAMES$1[targetIndex] && !player.fronts[FRONT_NAMES$1[targetIndex]].line).map((targetIndex) => ({
					label: `${FRONT_LABELS$1[frontName]} → ${FRONT_LABELS$1[FRONT_NAMES$1[targetIndex]]}`,
					value: {
						mode: "move-line",
						frontName,
						target: FRONT_NAMES$1[targetIndex]
					}
				}));
			}));
			if (!choices.length) {
				Logger.log(`${site.name}: nessuna scelta legale per attivare l’abilità.`);
				return;
			}
			GameState.pendingTactic = {
				card: site,
				choices,
				mode: "active-site"
			};
			UIRenderer.renderControls();
			document.getElementById("tactic-choice").focus();
		},
		selectDiscardCard(card) {
			if (GameState.phase !== "principale" || GameState.currentIndex !== 0 || GameState.sacrifice) return;
			const alreadySelected = GameState.selectedCard?.id === card.id && GameState.selectedFromDiscard;
			GameState.selectedCard = alreadySelected ? null : card;
			GameState.selectedFromDiscard = !alreadySelected;
			if (GameState.selectedCard) Logger.log(`${card.name} selezionata dagli scarti.`);
			UIRenderer.renderHand();
			UIRenderer.updateBoardInteractivity();
		},
		deploy(frontName, slotName) {
			if (GameState.phase !== "principale" || GameState.currentIndex !== 0 || GameState.sacrifice) return;
			const card = GameState.selectedCard;
			if (!card) return;
			const player = GameState.players[0];
			const opponent = GameState.players[1];
			const front = player.fronts[frontName];
			const keywords = getUnitKeywords(player, card, frontName, slotName);
			if (player.field?.catalogId === "set-1-113" && GameState.countUnits(player) < GameState.countUnits(GameState.players[1]) && !keywords.includes("Assalto")) keywords.push("Assalto");
			const unitForDeployment = {
				...card,
				keywords
			};
			if (opponent.sites?.some((site) => site.catalogId === "set-2-094") && card.force <= 3 && slotName === "line") {
				Logger.log(`${card.name}: Sala dei Lamenti impedisce alle Unità di Forza 3 o inferiore di entrare in Linea.`);
				return;
			}
			const potentialAssaultSwap = slotName === "line" && keywords.includes("Assalto") && Boolean(front.line) && (!front.supA || !front.supB);
			if (potentialAssaultSwap && !player.sites?.some((site) => site.catalogId === "set-1-098")) {
				Logger.log("Assalto non può sostituire una Linea senza Passo della Frattura.");
				return;
			}
			if (potentialAssaultSwap && opponent.sites?.some((site) => site.catalogId === "set-3-094")) {
				Logger.log("Torre della Distorsione impedisce di sostituire una Linea avversaria.");
				return;
			}
			if (opponent.sites?.some((site) => site.catalogId === "set-1-105") && slotName === "line") {
				Logger.log("Vallata del Terrore Primordiale impedisce di entrare in Linea.");
				return;
			}
			const deployment = checkDeployment(unitForDeployment, front, slotName, {
				ownSites: player.sites,
				opposingSites: opponent.sites,
				ownField: player.field
			});
			if (front[slotName] && !deployment.assaultSwap) {
				Logger.log("Questa posizione è occupata.");
				return;
			}
			if (keywords.includes("Posizione Difensiva") && slotName !== "line" && !front.line && player.field?.catalogId !== "set-3-118") {
				Logger.log("Posizione Difensiva: devi assegnare questa Unità alla Linea se possibile.");
				return;
			}
			if (!deployment.legal && slotName === "line") {
				Logger.log("Solo Assalto può entrare in Linea nel turno in cui viene giocata. Scegli un Supporto.");
				return;
			}
			if (!deployment.legal) return;
			const available = player.domains.filter((domain) => !domain.tapped);
			const spectral = GameState.selectedFromDiscard && card.keywords.includes("Eco Spettrale");
			const cost = this.getCardCost(player, card, spectral);
			if (available.length < cost) {
				Logger.log(`Domini insufficienti: servono ${cost}, ne hai ${available.length} attivi.`);
				return;
			}
			available.slice(0, cost).forEach((domain) => {
				domain.tapped = true;
			});
			markCardCostDiscountUsed(player, card, GameState.turnNumber, spectral);
			if (deployment.assaultSwap) {
				const openSupport = front.supA === null ? "supA" : "supB";
				front[openSupport] = front.line;
				front[openSupport].position = openSupport;
				Logger.log(`Assalto: ${front.line.name} si sposta in Supporto.`);
			}
			if (spectral) {
				const index = player.discard.findIndex((unit) => unit.id === card.id);
				const [fromDiscard] = player.discard.splice(index, 1);
				GameState.selectedCard = fromDiscard;
			} else player.hand.splice(player.hand.findIndex((unit) => unit.id === card.id), 1);
			const unit = GameState.selectedCard;
			unit.currentForce = unit.force;
			unit.front = frontName;
			unit.position = slotName;
			front[slotName] = unit;
			GameState.selectedCard = null;
			GameState.selectedFromDiscard = false;
			Logger.log(`${unit.name} entra in ${FRONT_LABELS$1[frontName]} (${slotName === "line" ? "Linea" : "Supporto"}).`);
			GameState.onUnitEntry(player, unit, frontName, slotName, spectral);
			FX.play("play");
			UIRenderer.refresh();
		},
		playInfiltratedUnit(frontName, slotName) {
			if (GameState.phase !== "principale" || GameState.currentIndex !== 0 || GameState.sacrifice) return;
			if (slotName !== "supA" && slotName !== "supB") return;
			const card = GameState.selectedCard;
			if (!card?.keywords?.some((keyword) => keyword.startsWith("Infiltrazione"))) return;
			const player = GameState.players[0];
			const front = GameState.players[1].fronts[frontName];
			if (!front || front.line || front[slotName]) {
				Logger.log("Infiltrazione: il Fronte avversario deve essere scoperto e il Supporto libero.");
				return;
			}
			const available = player.domains.filter((domain) => !domain.tapped);
			const cost = this.getCardCost(player, card, false);
			if (available.length < cost) {
				Logger.log(`Domini insufficienti: servono ${cost}, ne hai ${available.length} attivi.`);
				return;
			}
			available.slice(0, cost).forEach((domain) => {
				domain.tapped = true;
			});
			markCardCostDiscountUsed(player, card, GameState.turnNumber, false);
			if (GameState.selectedFromDiscard) {
				const index = player.discard.findIndex((unit) => unit.id === card.id);
				if (index >= 0) player.discard.splice(index, 1);
			} else {
				const index = player.hand.findIndex((unit) => unit.id === card.id);
				if (index >= 0) player.hand.splice(index, 1);
			}
			const unit = card;
			unit.currentForce = unit.force;
			unit.front = frontName;
			unit.position = slotName;
			unit.infiltrated = true;
			unit.owner = player.id;
			front[slotName] = unit;
			GameState.selectedCard = null;
			GameState.selectedFromDiscard = false;
			Logger.log(`${unit.name} si infiltra nel Fronte di ${FRONT_LABELS$1[frontName]}.`);
			GameState.onUnitEntry(player, unit, frontName, slotName, false);
			FX.play("play");
			UIRenderer.refresh();
		}
	};
	//#endregion
	//#region src/engine/controller-tactics.js
	const tacticMethods = {
		playImmediateTactic(card) {
			const player = GameState.players[0];
			const opponent = GameState.players[1];
			const choices = getTacticChoices(card, player, opponent);
			if (choices === null) {
				Logger.log(`${card.name}: nessun risolutore registrato; la carta non viene giocata.`);
				return;
			}
			if (tacticRequiresChoice(card)) {
				if (choices.length === 0) {
					Logger.log(`${card.name}: non ci sono bersagli legali; la carta non viene giocata.`);
					return;
				}
				GameState.pendingTactic = {
					card,
					choices
				};
				UIRenderer.renderControls();
				document.getElementById("tactic-choice").focus();
				return;
			}
			this.commitTactic(card, null, player, opponent);
		},
		commitTactic(card, choice, player = GameState.players[0], opponent = GameState.players[1]) {
			const siteTacticLimit = GameState.players.some((owner) => owner.sites?.some((site) => site.catalogId === "set-2-095"));
			if ((player.tacticLimitActive || siteTacticLimit) && player.tacticsPlayedThisTurn >= 1) {
				Logger.log(`${card.name}: non puoi giocare un'altra Tattica in questo turno.`);
				return;
			}
			const cardId = card.catalogId || card.id;
			if (cardId === "set-2-070") {
				const spectral = player.discard.find((unit) => unit.id === choice?.cardId);
				const totalCost = card.cost + (spectral?.cost || 0);
				const readyCount = player.domains.filter((domain) => !domain.tapped).length;
				if (!spectral || readyCount < totalCost) {
					Logger.log(`${card.name}: bersaglio non valido o Domini insufficienti per pagare anche l'Unità.`);
					return;
				}
			}
			const selectedChoice = cardId === "set-2-078" ? Object.fromEntries(Object.entries(choice || {}).filter(([key]) => key !== "playerRecovery" && key !== "opponentRecovery")) : choice;
			const legalChoices = getTacticChoices(card, player, opponent);
			if (legalChoices === null || tacticRequiresChoice(card) && !legalChoices.some((option) => JSON.stringify(option.value) === JSON.stringify(selectedChoice))) {
				Logger.log(`${card.name}: la scelta non è più legale; la carta non viene giocata.`);
				return;
			}
			const available = player.domains.filter((domain) => !domain.tapped);
			const cost = this.getCardCost(player, card);
			if (available.length < cost) {
				Logger.log(`Domini insufficienti per ${card.name}: servono ${cost}, ne hai ${available.length} attivi.`);
				return;
			}
			available.slice(0, cost).forEach((domain) => {
				domain.tapped = true;
			});
			const handIndex = player.hand.findIndex((unit) => unit.id === card.id);
			if (handIndex < 0) throw new Error(`La Tattica ${card.name} non è più in mano.`);
			player.hand.splice(handIndex, 1);
			player.discard.push(card);
			player.tacticsPlayedThisTurn = (player.tacticsPlayedThisTurn || 0) + 1;
			const tacticId = card.catalogId || card.id;
			if (tacticId === "set-2-055" || tacticId === "set-2-073") {
				const drawCount = tacticId === "set-2-055" ? 1 : 3;
				let drawn = 0;
				for (let index = 0; index < drawCount && player.armyDeck.length > 0; index++) {
					player.hand.push(player.armyDeck.pop());
					drawn++;
				}
				const choices = player.hand.map((unit) => ({
					label: `${unit.name} · scarta`,
					value: { cardId: unit.id }
				}));
				Logger.log(`${card.name}: peschi ${drawn} carta${drawn === 1 ? "" : "e"}.`);
				if (choices.length > 0) {
					GameState.pendingTactic = {
						card,
						choices,
						mode: "discard"
					};
					UIRenderer.renderControls();
					document.getElementById("tactic-choice").focus();
				} else {
					Logger.log(`${card.name}: non hai carte da scartare.`);
					UIRenderer.refresh();
				}
				return;
			}
			const message = resolveImmediateTactic(card, player, opponent, choice, {
				damageLine: (target, frontName, amount) => CombatResolver.damageLine(target, frontName, amount, player),
				onForceLoss: (target, unit, amount) => CombatResolver.onForceLoss(target, unit, amount, player),
				onUnitPlayed: (owner, unit) => {
					GameState.onUnitEntry(owner, unit, unit.front, unit.position, true);
				},
				removeUnit: (target, frontName, slotName) => CombatResolver.removeUnit(target, frontName, slotName, "sacrifice"),
				destroyUnit: (target, frontName, slotName) => {
					return CombatResolver.destroyUnit(target, frontName, slotName);
				}
			});
			Logger.log(message);
			GameState.checkVictory();
			UIRenderer.refresh();
			if (GameState.gameOver) this.closeReactionWindow();
		},
		confirmTactic() {
			const pending = GameState.pendingTactic;
			if (!pending) return;
			const choice = pending.choices[Number(document.getElementById("tactic-choice").value)];
			if (!choice) return;
			if (pending.mode === "commander") {
				GameState.pendingTactic = null;
				this.commitCommanderActivation(GameState.players[0], pending.kind, choice.value);
				return;
			}
			if (pending.mode === "site-support-move") {
				const player = GameState.players.find((owner) => owner.id === pending.playerId);
				const site = player?.sites?.find((item) => item.id === pending.card.id && item.catalogId === "set-3-097");
				if (!player || !site) throw new Error("Il Sito Portale Silente non è più in gioco.");
				GameState.pendingTactic = null;
				GameState.resolveSiteSupportMove(player, choice.value, site);
				UIRenderer.refresh();
				return;
			}
			if (pending.mode === "site-replace") {
				const player = GameState.players[0];
				const index = player.sites.findIndex((site) => site.id === choice.value.siteId);
				if (index < 0) throw new Error("Il Sito da sostituire non è più in gioco.");
				player.discard.push(...player.sites.splice(index, 1));
				GameState.pendingTactic = null;
				this.playSite(pending.card);
				return;
			}
			if (pending.mode === "permanent-replace") {
				GameState.pendingTactic = null;
				this.commitPermanentCard(pending.card, choice.value);
				return;
			}
			if (pending.mode === "equipment") {
				const player = GameState.players[0];
				const { frontName, slotName, unitId } = choice.value;
				const unit = player.fronts[frontName][slotName];
				if (!unit || unit.id !== unitId) throw new Error("L’Unità scelta non è più in quella posizione.");
				const equipment = pending.card;
				const cost = this.getCardCost(player, equipment);
				const available = player.domains.filter((domain) => !domain.tapped);
				if (available.length < cost) {
					GameState.pendingTactic = null;
					Logger.log(`${equipment.name}: non ci sono più Domini sufficienti per pagare costo ed Equip.`);
					UIRenderer.refresh();
					return;
				}
				const handIndex = player.hand.findIndex((item) => item.id === equipment.id);
				if (handIndex < 0) throw new Error(`${equipment.name} non è più in mano.`);
				available.slice(0, cost).forEach((domain) => {
					domain.tapped = true;
				});
				player.hand.splice(handIndex, 1);
				if (unit.equipment) player.discard.push(unit.equipment);
				unit.equipment = { ...equipment };
				GameState.pendingTactic = null;
				Logger.log(`${equipment.name} viene equipaggiato a ${unit.name} pagando ${equipment.cost} + ${equipment.equipCost || 0} Domini.`);
				UIRenderer.refresh();
				return;
			}
			if (pending.mode === "active-site") {
				GameState.pendingTactic = null;
				GameState.resolveSiteActivation(pending.card, choice.value);
				return;
			}
			if (pending.mode === "discard") {
				const player = GameState.players[0];
				const discardIndex = player.hand.findIndex((unit) => unit.id === choice.value.cardId);
				if (discardIndex < 0) throw new Error("La carta da scartare non è più in mano.");
				const [discarded] = player.hand.splice(discardIndex, 1);
				player.discard.push(discarded);
				Logger.log(`${pending.card.name}: scarti ${discarded.name}.`);
				GameState.pendingTactic = null;
				UIRenderer.refresh();
				return;
			}
			if (pending.mode === "shadow-recovery") {
				GameState.pendingTactic = null;
				this.commitTactic(pending.card, {
					...pending.baseChoice,
					playerRecovery: choice.value
				});
				return;
			}
			if ((pending.card.catalogId || pending.card.id) === "set-2-078") {
				const player = GameState.players[0];
				const recoverySlots = FRONT_NAMES$1.flatMap((frontName) => {
					const front = player.fronts[frontName];
					const slots = frontName === choice.value.ownFrontName ? front.supA && front.supB ? ["supB"] : ["supA", "supB"] : ["supA", "supB"].filter((slotName) => !front[slotName]);
					return [...new Set(slots)].map((slotName) => ({
						frontName,
						slotName
					}));
				});
				const recoveryChoices = player.discard.filter((item) => item.category === "unit").flatMap((unit) => recoverySlots.map(({ frontName, slotName }) => ({
					label: `${unit.name} → Supporto ${slotName === "supA" ? "A" : "B"} in ${FRONT_LABELS$1[frontName]}`,
					value: {
						cardId: unit.id,
						frontName,
						slotName
					}
				})));
				recoveryChoices.unshift({
					label: "Non recuperare Unità",
					value: null
				});
				GameState.pendingTactic = {
					card: pending.card,
					mode: "shadow-recovery",
					baseChoice: choice.value,
					choices: recoveryChoices
				};
				UIRenderer.renderControls();
				document.getElementById("tactic-choice").focus();
				return;
			}
			GameState.pendingTactic = null;
			this.commitTactic(pending.card, choice.value);
		},
		cancelTactic() {
			if (!GameState.pendingTactic) return;
			if (GameState.pendingTactic.mode === "discard") return;
			if (GameState.pendingTactic.mode === "commander") {
				Logger.log("Abilità del Comandante annullata.");
				GameState.pendingTactic = null;
				UIRenderer.refresh();
				return;
			}
			Logger.log(`${GameState.pendingTactic.card.name}: scelta annullata, carta non giocata.`);
			GameState.pendingTactic = null;
			UIRenderer.refresh();
		}
	};
	//#endregion
	//#region src/engine/controller.js
	const GameController = {
		...matchMethods,
		...commanderMethods,
		...playMethods,
		...tacticMethods,
		...combatMethods
	};
	//#endregion
	//#region src/card-library.js
	const CATEGORY_LABELS = {
		unit: "Unità",
		tactic: "Tattica",
		equipment: "Equipaggiamento",
		site: "Sito",
		field: "Campo",
		commander: "Comandante"
	};
	const libraryCards = cards.map((card) => ({
		card,
		searchText: [
			card.name,
			card.setName,
			card.type || "",
			card.rarity || "",
			card.rulesText,
			tacticTiming(card) === "instant" ? "istantanea" : tacticTiming(card) === "standard" ? "standard" : ""
		].join(" ").toLocaleLowerCase("it"),
		executionStatus: getCardExecutionStatus(card)
	}));
	function initCardLibrary() {
		const setFilter = document.getElementById("library-set");
		const categoryFilter = document.getElementById("library-category");
		const searchInput = document.getElementById("library-search");
		const count = document.getElementById("library-count");
		const grid = document.getElementById("catalog-grid");
		function render() {
			const query = searchInput.value.trim().toLocaleLowerCase("it");
			const filtered = libraryCards.filter((entry) => {
				if (setFilter.value !== "all" && entry.card.setId !== setFilter.value) return false;
				if (categoryFilter.value !== "all" && entry.card.category !== categoryFilter.value) return false;
				if (!query) return true;
				return entry.searchText.includes(query);
			});
			count.textContent = `${filtered.length} di ${cards.length} carte`;
			grid.replaceChildren();
			if (filtered.length === 0) {
				const empty = document.createElement("p");
				empty.className = "library-empty";
				empty.textContent = "Nessuna carta corrisponde ai filtri.";
				grid.appendChild(empty);
				return;
			}
			for (const { card, executionStatus } of filtered) {
				const element = document.createElement("article");
				element.className = `library-card category-${card.category}`;
				const title = document.createElement("h3");
				title.textContent = `${String(card.number).padStart(3, "0")} · ${card.name}`;
				const metadata = document.createElement("p");
				metadata.className = "library-metadata";
				const speed = tacticTiming(card);
				metadata.textContent = speed ? `${card.setName} · Tattica ${speed === "instant" ? "Istantanea" : "Standard"} · ${card.rarity || "Rarità non indicata"}` : `${card.setName} · ${CATEGORY_LABELS[card.category]} · ${card.rarity || "Rarità non indicata"}`;
				const stats = document.createElement("p");
				stats.className = "library-stats";
				const cardStats = [];
				if (card.cost !== null && card.cost !== void 0) cardStats.push(`Costo ${card.cost}`);
				if (card.health) cardStats.push(`Salute ${card.health}`);
				if (card.force !== null) cardStats.push(`Forza ${card.force}`);
				if (card.type) cardStats.push(card.type);
				if (card.equipCost !== null) cardStats.push(`Equip ${card.equipCost}`);
				if (card.decay !== null) cardStats.push(`Decadenza ${card.decay}`);
				stats.textContent = cardStats.join(" · ");
				const rules = document.createElement("p");
				rules.className = "library-rules";
				rules.textContent = card.rulesText;
				const execution = document.createElement("p");
				execution.className = `library-execution ${executionStatus.label === "Non eseguibile" ? "unsupported" : ""}`;
				execution.textContent = `Motore: ${executionStatus.label}. ${executionStatus.detail}`;
				element.append(title, metadata, stats, rules, execution);
				grid.appendChild(element);
			}
		}
		let searchTimer = 0;
		setFilter.addEventListener("change", render);
		categoryFilter.addEventListener("change", render);
		searchInput.addEventListener("input", () => {
			clearTimeout(searchTimer);
			searchTimer = setTimeout(render, 150);
		});
		render();
	}
	//#endregion
	//#region src/screens.js
	const SCREENS = [
		"intro",
		"deck",
		"match"
	];
	function screenId(name) {
		if (name === "match") return "tavolo";
		return `screen-${name}`;
	}
	function currentScreen() {
		const hash = location.hash.replace(/^#/, "");
		if (hash === "tavolo") return "match";
		return SCREENS.includes(hash) ? hash : "intro";
	}
	function showScreen(name) {
		const target = SCREENS.includes(name) ? name : "intro";
		for (const screen of SCREENS) {
			const element = document.getElementById(screenId(screen));
			if (!element) continue;
			element.hidden = screen !== target;
		}
		if (location.hash.replace(/^#/, "") !== target) history.replaceState(null, "", `#${target}`);
		if (target === "match") document.getElementById("tavolo")?.focus({ preventScroll: true });
		return target;
	}
	function initScreens() {
		showScreen(currentScreen());
		window.addEventListener("hashchange", () => showScreen(currentScreen()));
	}
	//#endregion
	//#region src/main.js
	if (window.__primalRuinBooted) {} else {
		window.__primalRuinBooted = true;
		boot();
	}
	function listen(id, type, handler) {
		document.getElementById(id)?.addEventListener(type, handler);
	}
	function openArchive() {
		showScreen("deck");
		document.getElementById("card-library-title")?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
		document.getElementById("library-search")?.focus();
	}
	function prepareUpdatedDeck() {
		if (!GameController.useUpdatedDeck()) return;
		showScreen("deck");
		const roadmap = document.getElementById("roadmap-panel");
		if (roadmap) roadmap.open = true;
	}
	function useDemoDecks() {
		if (!GameController.useDemoDecks()) return;
		document.dispatchEvent(new Event("primal-ruin:demo-decks"));
		showScreen("match");
	}
	function boot() {
		initScreens();
		listen("btn-intro-deck", "click", () => showScreen("deck"));
		listen("btn-intro-match", "click", () => showScreen("match"));
		listen("btn-deck-intro", "click", () => showScreen("intro"));
		listen("btn-deck-match", "click", () => showScreen("match"));
		listen("btn-match-intro", "click", () => showScreen("intro"));
		listen("btn-match-deck", "click", () => showScreen("deck"));
		listen("btn-mulligan", "click", () => GameController.mulligan());
		listen("btn-start", "click", () => GameController.startGame());
		listen("btn-principale", "click", () => GameController.enterMainPhase());
		listen("btn-attack", "click", () => GameController.resolveCombat());
		listen("btn-finale", "click", () => GameController.endTurn());
		listen("btn-canala", "click", () => GameController.channelMadness());
		listen("btn-sacrifice-end", "click", () => GameController.finishSacrifice());
		listen("btn-commander", "click", () => GameController.activateCommanderAbility());
		listen("btn-retreat", "click", () => GameController.toggleRetreat());
		listen("btn-purge", "click", () => GameController.purgeParasite());
		listen("btn-sorvolo", "click", () => GameController.useSorvolo());
		listen("btn-sorvolo-skip", "click", () => GameController.skipSorvolo());
		listen("btn-torment-madness", "click", () => GameController.chooseTorment(true));
		listen("btn-torment-damage", "click", () => GameController.chooseTorment(false));
		listen("btn-tactic-confirm", "click", () => GameController.confirmTactic());
		listen("btn-tactic-cancel", "click", () => GameController.cancelTactic());
		listen("btn-reaction-pass", "click", () => GameController.passReaction());
		listen("btn-promotion-confirm", "click", () => {
			GameController.choosePromotionSlot(document.getElementById("promotion-choice").value);
		});
		listen("btn-new-game", "click", () => {
			if (window.confirm("Iniziare una nuova partita? La partita salvata verrà sostituita.")) {
				GameController.newGame();
				showScreen("match");
			}
		});
		listen("btn-demo-decks", "click", () => useDemoDecks());
		listen("btn-deck-demo", "click", () => useDemoDecks());
		listen("btn-updated-deck", "click", () => prepareUpdatedDeck());
		listen("btn-deck-updated", "click", () => prepareUpdatedDeck());
		listen("btn-open-archive", "click", () => openArchive());
		const commanderSelect = document.getElementById("player-commander-select");
		if (commanderSelect) for (const commander of listCommanders()) {
			const option = document.createElement("option");
			option.value = commander.id;
			option.textContent = commander.provisional ? `${commander.name} (provvisorio)` : commander.name;
			commanderSelect.appendChild(option);
		}
		initCardLibrary();
		initSettings();
		initDeckBuilder((cardIds) => {
			GameController.resetWithDeck(cardIds);
			showScreen("match");
		});
		const fronts = [
			"left",
			"center",
			"right"
		];
		const slots = [
			"line",
			"supA",
			"supB"
		];
		fronts.forEach((front) => {
			["supA", "supB"].forEach((slot) => {
				document.getElementById(`opp-${front}-${slot}`)?.addEventListener("click", (event) => {
					event.stopPropagation();
					GameController.deployInfiltration(front, slot);
				});
			});
			slots.forEach((slot) => {
				const ownSlot = document.getElementById(`p-${front}-${slot}`);
				ownSlot?.addEventListener("click", (event) => {
					event.stopPropagation();
					GameController.handleSlotClick(front, slot);
				});
				ownSlot?.addEventListener("keydown", (event) => {
					if (event.key !== "Enter" && event.key !== " ") return;
					event.preventDefault();
					GameController.handleSlotClick(front, slot);
				});
			});
		});
		GameController.init();
		document.addEventListener("keydown", (event) => {
			if (event.altKey || event.ctrlKey || event.metaKey) return;
			const target = event.target;
			if (target instanceof HTMLElement && (target.isContentEditable || [
				"INPUT",
				"SELECT",
				"TEXTAREA",
				"BUTTON"
			].includes(target.tagName))) return;
			if (event.key === "Escape") {
				GameController.cancelSelection();
				return;
			}
			if (event.key === "Enter" && !document.getElementById("btn-start").hidden) {
				event.preventDefault();
				GameController.startGame();
				return;
			}
			if (event.code === "Space") {
				event.preventDefault();
				if (!document.getElementById("btn-principale").hidden) GameController.enterMainPhase();
				else if (!document.getElementById("btn-attack").hidden) GameController.resolveCombat();
				else if (!document.getElementById("btn-finale").hidden) GameController.endTurn();
			}
		});
	}
	//#endregion
})();

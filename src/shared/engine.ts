import { getRole, ROLES } from './roles.js';
import type { Camp, DeathCause, GameFlags, GameState, Phase, PhaseKind, Player, Role, RoleId } from './types.js';

export const PHASE_LABELS: Record<PhaseKind, string> = {
	'premiere-nuit': 'Première nuit',
	'premier-matin': 'Premier matin',
	'soir': 'Soir',
	'nuit': 'Nuit',
	'matin': 'Matin',
};

export function phaseLabel(phase: Phase): string {
	switch (phase.kind) {
		case 'premiere-nuit':
		case 'premier-matin':
			return PHASE_LABELS[phase.kind];
		case 'soir':
		case 'nuit':
		case 'matin':
			return `${PHASE_LABELS[phase.kind]} ${phase.turn}`;
	}
}

export function isNight(phase: Phase): boolean {
	return phase.kind === 'premiere-nuit' || phase.kind === 'nuit';
}

export function nextPhase(phase: Phase): Phase {
	switch (phase.kind) {
		case 'premiere-nuit':
			return { kind: 'premier-matin', turn: 1 };
		case 'premier-matin':
		case 'matin':
			return { kind: 'soir', turn: phase.turn };
		case 'soir':
			return { kind: 'nuit', turn: phase.turn + 1 };
		case 'nuit':
			return { kind: 'matin', turn: phase.turn };
	}
}

function emptyFlags(): GameFlags {
	return {
		potions: {},
		infectionUsed: false,
		lovers: [],
		mentorId: null,
		louveteau: 'cherche',
		lastTarget: {},
		paralysedId: null,
		protectedId: null,
		asleepIds: [],
		hypnosis: null,
		noAttackTurn: null,
		noVoteTurn: null,
		blocked: null,
		mayorId: null,
		chamanAwake: false,
	};
}

let idCounter = 0;

export function newPlayerId(): string {
	idCounter += 1;
	return `p${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function createPlayer(name: string, id: string = newPlayerId()): Player {
	return {
		id,
		name,
		roleId: null,
		alive: true,
		death: null,
		infected: false,
		cannotVote: false,
		sectGroup: null,
	};
}

export function createGame(players: Player[], deck: Partial<Record<RoleId, number>>, expertMode: boolean): GameState {
	return {
		version: 1,
		players: players.map(player => ({ ...player, alive: true, death: null, infected: false, cannotVote: false, sectGroup: null })),
		deck: { ...deck },
		expertMode,
		phase: { kind: 'premiere-nuit', turn: 1 },
		stepId: null,
		flags: emptyFlags(),
		log: [],
	};
}

export function deckSize(deck: Partial<Record<RoleId, number>>): number {
	return Object.values(deck).reduce((sum, count) => sum + count, 0);
}

export function deckCount(state: GameState, roleId: RoleId): number {
	return state.deck[roleId] ?? 0;
}

export function inDeck(state: GameState, roleId: RoleId): boolean {
	return deckCount(state, roleId) > 0;
}

/** Rôle proposable pour un joueur, avec le nombre d'exemplaires encore libres. */
export interface RoleChoice {
	role: Role;
	left: number;
}

/**
 * Rôles que l'on peut attribuer à un joueur : uniquement les cartes du paquet,
 * et seulement tant qu'il en reste un exemplaire non attribué à un autre joueur.
 * Le rôle actuel du joueur reste proposé s'il fait partie du paquet.
 */
export function roleChoices(deck: Partial<Record<RoleId, number>>, players: readonly Player[], playerId: string): RoleChoice[] {
	const current = players.find(player => player.id === playerId)?.roleId ?? null;
	const choices: RoleChoice[] = [];
	for (const role of ROLES) {
		const count = deck[role.id] ?? 0;
		const taken = players.filter(player => player.id !== playerId && player.roleId === role.id).length;
		const left = count - taken;
		if (left > 0 || (role.id === current && count > 0)) {
			choices.push({ role, left: Math.max(left, 0) });
		}
	}
	return choices;
}

/** Précision affichée à côté d'un rôle en plusieurs exemplaires : combien sont encore libres. */
export function choiceHint(count: number, left: number, current: boolean): string {
	return count > 1 && !current ? ` (${left}/${count} libres)` : '';
}

/**
 * Retire les rôles attribués qui ne correspondent plus au paquet : carte retirée,
 * ou plus de joueurs que d'exemplaires (les premiers joueurs gardent leur rôle).
 */
export function fitRolesToDeck(deck: Partial<Record<RoleId, number>>, players: Player[]): void {
	const used: Partial<Record<RoleId, number>> = {};
	for (const player of players) {
		if (!player.roleId) {
			continue;
		}
		const count = (used[player.roleId] ?? 0) + 1;
		if (count > (deck[player.roleId] ?? 0)) {
			player.roleId = null;
		} else {
			used[player.roleId] = count;
		}
	}
}

/** Nombre de cartes par camp dans le paquet, pour la jauge de préparation. */
export function deckBalance(deck: Partial<Record<RoleId, number>>): Record<Camp, number> {
	const balance: Record<Camp, number> = { village: 0, loups: 0, solitaire: 0 };
	for (const role of ROLES) {
		balance[role.camp] += deck[role.id] ?? 0;
	}
	return balance;
}

export function findPlayer(state: GameState, id: string | null | undefined): Player | undefined {
	return id ? state.players.find(player => player.id === id) : undefined;
}

export function holders(state: GameState, roleId: RoleId): Player[] {
	return state.players.filter(player => player.roleId === roleId);
}

export function alivePlayers(state: GameState): Player[] {
	return state.players.filter(player => player.alive);
}

export function log(state: GameState, text: string): void {
	state.log.push({ phase: { ...state.phase }, text });
}

function mentorIsDead(state: GameState): boolean {
	const mentor = findPlayer(state, state.flags.mentorId);
	return mentor !== undefined && !mentor.alive;
}

/** Camp actuel d'un joueur, en tenant compte des transformations. */
export function currentCamp(state: GameState, player: Player): Camp | null {
	if (!player.roleId) {
		return null;
	}
	if (player.infected) {
		return 'loups';
	}
	switch (player.roleId) {
		case 'louveteau':
			return state.flags.louveteau === 'villageois' ? 'village' : 'loups';
		case 'enfant-sauvage':
			return mentorIsDead(state) ? 'loups' : 'village';
		default:
			return getRole(player.roleId).camp;
	}
}

/** Le joueur fait partie de la meute qui attaque la nuit. */
export function isPackWolf(state: GameState, player: Player): boolean {
	if (!player.roleId) {
		return false;
	}
	if (player.infected || getRole(player.roleId).wakesWithWolves) {
		return true;
	}
	if (player.roleId === 'louveteau') {
		return state.flags.louveteau === 'loup';
	}
	if (player.roleId === 'enfant-sauvage') {
		return mentorIsDead(state);
	}
	return false;
}

/** Réponse de la voyante de Mairde. */
export function alignment(state: GameState, player: Player): 'bon' | 'mauvais' | null {
	const camp = currentCamp(state, player);
	if (camp === null) {
		return null;
	}
	return camp === 'village' ? 'bon' : 'mauvais';
}

/** Nombre de loups vivants annoncé à la médium. Le louveteau ne compte qu'une fois sa meute trouvée. */
export function wolfCount(state: GameState): number {
	return alivePlayers(state).filter(player => isPackWolf(state, player)).length;
}

/** Voisins vivants de gauche et de droite (ordre des joueurs dans le sens des aiguilles d'une montre). */
export function aliveNeighbours(state: GameState, player: Player): { left: Player | undefined; right: Player | undefined } {
	const living = alivePlayers(state);
	const index = living.findIndex(other => other.id === player.id);
	if (index < 0 || living.length < 2) {
		return { left: undefined, right: undefined };
	}
	return {
		left: living[(index + 1) % living.length],
		right: living[(index - 1 + living.length) % living.length],
	};
}

/** L'ours grogne si un voisin vivant direct du montreur est un loup. */
export function bearGrowls(state: GameState): boolean | null {
	const tamer = holders(state, 'montreur-ours').find(player => player.alive);
	if (!tamer) {
		return null;
	}
	const { left, right } = aliveNeighbours(state, tamer);
	return [left, right].some(neighbour => neighbour !== undefined && currentCamp(state, neighbour) === 'loups');
}

/** Premier loup vivant à gauche du chevalier. */
export function knightVictim(state: GameState): Player | undefined {
	const knight = holders(state, 'chevalier')[0];
	if (!knight) {
		return undefined;
	}
	const start = state.players.findIndex(player => player.id === knight.id);
	for (let offset = 1; offset < state.players.length; offset++) {
		const candidate = state.players[(start + offset) % state.players.length];
		if (candidate?.alive && isPackWolf(state, candidate)) {
			return candidate;
		}
	}
	return undefined;
}

export function loverOf(state: GameState, playerId: string): Player | undefined {
	for (const [a, b] of state.flags.lovers) {
		if (a === playerId) {
			return findPlayer(state, b);
		}
		if (b === playerId) {
			return findPlayer(state, a);
		}
	}
	return undefined;
}

/** Dernier joueur mort, que le chaman peut écouter. */
export function lastDead(state: GameState): Player | undefined {
	let last: Player | undefined;
	for (const player of state.players) {
		if (player.death && (!last?.death || player.death.order > last.death.order)) {
			last = player;
		}
	}
	return last;
}

const CAUSE_LABELS: Record<DeathCause, string> = {
	'loups': 'dévoré par les loups',
	'grand-mechant-loup': 'dévoré par le Grand Méchant Loup',
	'vote': 'éliminé par le vote',
	'potion': 'empoisonné',
	'chasseur': 'abattu par le chasseur',
	'chevalier': 'mort du tétanos',
	'chagrin': 'mort de chagrin',
	'autre': 'éliminé',
};

function applyPatientZero(state: GameState, cause: DeathCause, by: string | null): void {
	const turn = state.phase.turn;
	const nextNight = turn + 1;
	switch (cause) {
		case 'loups':
		case 'grand-mechant-loup':
			state.flags.noAttackTurn = nextNight;
			log(state, 'Patient zéro : les loups ne pourront pas attaquer la nuit prochaine.');
			break;
		case 'vote':
			state.flags.noVoteTurn = turn + 1;
			log(state, 'Patient zéro : personne ne pourra voter la journée suivante.');
			break;
		case 'potion':
		case 'chasseur':
		case 'chevalier':
		case 'chagrin':
		case 'autre':
			if (by) {
				state.flags.blocked = { playerId: by, turn: nextNight };
				const blocked = findPlayer(state, by);
				log(state, `Patient zéro : ${blocked?.name ?? 'le responsable'} ne pourra pas utiliser son pouvoir la nuit prochaine.`);
			}
			break;
	}
}

/** Élimine un joueur et applique les conséquences automatiques (âme-sœur, patient zéro). */
export function killPlayer(state: GameState, playerId: string, cause: DeathCause, by: string | null = null): Player[] {
	const player = findPlayer(state, playerId);
	if (!player?.alive) {
		return [];
	}
	if (cause === 'vote' && player.roleId === 'idiot') {
		player.cannotVote = true;
		log(state, `${player.name} est l'idiot du village : il survit mais ne votera plus.`);
		return [];
	}
	player.alive = false;
	player.death = { cause, phase: { ...state.phase }, by, order: state.log.length };
	log(state, `☠ ${player.name} ${CAUSE_LABELS[cause]}.`);
	const dead = [player];

	if (player.roleId === 'patient-zero') {
		applyPatientZero(state, cause, by);
	}

	const lover = loverOf(state, player.id);
	if (lover?.alive) {
		dead.push(...killPlayer(state, lover.id, 'chagrin', player.id));
	}
	return dead;
}

/** Ramène à la vie un joueur (potion de guérison, erreur du MJ). */
export function revivePlayer(state: GameState, playerId: string): void {
	const player = findPlayer(state, playerId);
	if (!player || player.alive) {
		return;
	}
	player.alive = true;
	player.death = null;
	log(state, `✚ ${player.name} est sauvé.`);
}

/** Morts survenues pendant la phase indiquée. */
export function deathsDuring(state: GameState, phase: Phase): Player[] {
	return state.players.filter(player => player.death?.phase.kind === phase.kind && player.death.phase.turn === phase.turn);
}

/** Dernière nuit écoulée (pour l'annonce du matin et le chevalier). */
export function previousNight(phase: Phase): Phase | null {
	switch (phase.kind) {
		case 'premiere-nuit':
			return null;
		case 'premier-matin':
			return { kind: 'premiere-nuit', turn: 1 };
		case 'matin':
		case 'soir':
			return phase.turn === 1 ? { kind: 'premiere-nuit', turn: 1 } : { kind: 'nuit', turn: phase.turn };
		case 'nuit':
			return phase.turn === 2 ? { kind: 'premiere-nuit', turn: 1 } : { kind: 'nuit', turn: phase.turn - 1 };
	}
}

export function potionsOf(state: GameState, roleId: RoleId): { guerison: boolean; mort: boolean; sommeil: boolean } {
	const used = state.flags.potions[roleId] ?? { guerison: false, mort: false, sommeil: false };
	const available = {
		guerison: roleId === 'sorciere' || roleId === 'magicienne',
		mort: roleId === 'sorciere' || roleId === 'vilaine-sorciere',
		sommeil: roleId === 'vilaine-sorciere' || roleId === 'magicienne',
	};
	return {
		guerison: available.guerison && !used.guerison,
		mort: available.mort && !used.mort,
		sommeil: available.sommeil && !used.sommeil,
	};
}

export function usePotion(state: GameState, roleId: RoleId, potion: 'guerison' | 'mort' | 'sommeil'): void {
	const used = state.flags.potions[roleId] ?? { guerison: false, mort: false, sommeil: false };
	used[potion] = true;
	state.flags.potions[roleId] = used;
}

/** Passe à la phase suivante et remet à zéro les effets qui ne durent qu'une nuit ou une journée. */
export function advancePhase(state: GameState): void {
	state.phase = nextPhase(state.phase);
	state.stepId = null;
	if (isNight(state.phase)) {
		state.flags.paralysedId = null;
		state.flags.protectedId = null;
		state.flags.asleepIds = [];
		state.flags.hypnosis = null;
		state.flags.chamanAwake = false;
	}
	log(state, `— ${phaseLabel(state.phase)} —`);
}

export type Victory = 'village' | 'loups' | 'loup-blanc' | 'amoureux' | 'sectaire';

export const VICTORY_LABELS: Record<Victory, string> = {
	'village': 'Le village a gagné : plus aucun loup ni solitaire en vie.',
	'loups': 'Les loups ont gagné : il ne reste que la meute.',
	'loup-blanc': 'Le loup blanc a gagné : il est le dernier survivant.',
	'amoureux': 'Le couple a gagné : il ne reste que les deux âmes-sœurs.',
	'sectaire': 'L\'abominable sectaire a gagné : l\'autre groupe est éliminé.',
};

/** Victoires que l'appli détecte. Le MJ reste seul juge. */
export function detectVictory(state: GameState): Victory[] {
	const living = alivePlayers(state);
	if (living.some(player => player.roleId === null)) {
		return [];
	}
	const wins: Victory[] = [];
	const [first] = living;
	if (living.length === 1 && first?.roleId === 'loup-blanc') {
		wins.push('loup-blanc');
	}
	if (living.length === 2 && first && loverOf(state, first.id)?.alive === true) {
		wins.push('amoureux');
	}
	const sectaire = holders(state, 'sectaire').find(player => player.alive);
	if (sectaire?.sectGroup) {
		const others = living.filter(player => player.sectGroup !== null && player.sectGroup !== sectaire.sectGroup);
		if (others.length === 0 && state.players.some(player => player.sectGroup !== null && player.sectGroup !== sectaire.sectGroup)) {
			wins.push('sectaire');
		}
	}
	const camps = living.map(player => currentCamp(state, player));
	if (living.length > 0 && camps.every(camp => camp === 'village')) {
		wins.push('village');
	}
	if (living.length > 0 && living.every(player => currentCamp(state, player) === 'loups' && player.roleId !== 'loup-blanc')) {
		wins.push('loups');
	}
	return wins;
}

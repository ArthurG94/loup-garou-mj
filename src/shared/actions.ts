import { findPlayer, holders, isPackWolf, killPlayer, log, potionsOf, revivePlayer, usePotion } from './engine.js';
import { roleLabel } from './roles.js';
import type { GameState, Player, RoleId } from './types.js';

export class RuleError extends Error {}

function requirePlayer(state: GameState, id: string): Player {
	const player = findPlayer(state, id);
	if (!player) {
		throw new RuleError('Joueur introuvable.');
	}
	return player;
}

/** Joueur qui tient le rôle (le premier vivant, sinon le premier tout court). */
export function holderOf(state: GameState, roleId: RoleId): Player | undefined {
	const all = holders(state, roleId);
	return all.find(player => player.alive) ?? all[0];
}

export function assignRole(state: GameState, playerId: string, roleId: RoleId | null): void {
	const player = requirePlayer(state, playerId);
	player.roleId = roleId;
	if (roleId) {
		log(state, `${player.name} est ${roleLabel(roleId)}.`);
	}
}

export function setMentor(state: GameState, mentorId: string): void {
	state.flags.mentorId = mentorId;
	log(state, `Mentor de l'enfant sauvage : ${requirePlayer(state, mentorId).name}.`);
}

export function setLovers(state: GameState, firstId: string, secondId: string): void {
	if (firstId === secondId) {
		throw new RuleError('Il faut deux joueurs différents.');
	}
	state.flags.lovers = state.flags.lovers.filter(([a, b]) => a !== firstId && b !== firstId);
	state.flags.lovers.push([firstId, secondId]);
	log(state, `Âmes-sœurs : ${requirePlayer(state, firstId).name} et ${requirePlayer(state, secondId).name}.`);
}

/** Le louveteau désigne un joueur : s'il fait partie de la meute, le louveteau la rejoint. */
export function louveteauSearch(state: GameState, targetId: string): boolean {
	const target = requirePlayer(state, targetId);
	const found = isPackWolf(state, target);
	if (found) {
		state.flags.louveteau = 'loup';
		log(state, `Le louveteau a trouvé sa meute (${target.name}) : il devient loup-garou.`);
	} else {
		log(state, `Le louveteau désigne ${target.name} : ce n'est pas un loup.`);
	}
	return found;
}

/** La louve ou la sainte mère cherche le louveteau. */
export function searchLouveteau(state: GameState, seeker: 'louve' | 'sainte-mere', targetId: string): boolean {
	const target = requirePlayer(state, targetId);
	const found = target.roleId === 'louveteau' && state.flags.louveteau === 'cherche';
	if (found) {
		state.flags.louveteau = seeker === 'louve' ? 'loup' : 'villageois';
		log(state, seeker === 'louve'
			? `La louve a trouvé le louveteau (${target.name}) : il devient loup-garou.`
			: `La sainte mère a trouvé le louveteau (${target.name}) : il devient simple villageois.`);
	} else {
		log(state, `${seeker === 'louve' ? 'La louve' : 'La sainte mère'} désigne ${target.name} : ce n'est pas le louveteau.`);
	}
	return found;
}

function chooseOncePerRow(state: GameState, roleId: RoleId, targetId: string): void {
	if (state.flags.lastTarget[roleId] === targetId) {
		throw new RuleError('Impossible de choisir deux fois de suite le même joueur.');
	}
	state.flags.lastTarget[roleId] = targetId;
}

export function protect(state: GameState, targetId: string): void {
	chooseOncePerRow(state, 'salvateur', targetId);
	state.flags.protectedId = targetId;
	log(state, `Le salvateur protège ${requirePlayer(state, targetId).name}.`);
}

export function paralyse(state: GameState, targetId: string): void {
	chooseOncePerRow(state, 'sinistros', targetId);
	state.flags.paralysedId = targetId;
	log(state, `Le Sinistros paralyse ${requirePlayer(state, targetId).name}.`);
}

export type AttackResult = 'mort' | 'protege' | 'infecte' | 'interdit';

/** Attaque des loups (ou seconde attaque du Grand Méchant Loup). */
export function attack(state: GameState, targetId: string, options: { infect?: boolean; second?: boolean } = {}): AttackResult {
	const target = requirePlayer(state, targetId);
	if (!options.second && state.flags.noAttackTurn === state.phase.turn) {
		return 'interdit';
	}
	if (state.flags.protectedId === targetId) {
		log(state, `${target.name} est attaqué mais protégé par le salvateur.`);
		return 'protege';
	}
	if (options.infect && !options.second) {
		if (state.flags.infectionUsed) {
			throw new RuleError('L\'Infect Père a déjà utilisé son infection.');
		}
		state.flags.infectionUsed = true;
		target.infected = true;
		log(state, `${target.name} est infecté : il devient loup-garou en gardant ses pouvoirs.`);
		return 'infecte';
	}
	killPlayer(state, targetId, options.second ? 'grand-mechant-loup' : 'loups');
	return 'mort';
}

export function hunterShot(state: GameState, hunterRole: 'bon-chasseur' | 'mauvais-chasseur', targetId: string): void {
	killPlayer(state, targetId, 'chasseur', holderOf(state, hunterRole)?.id ?? null);
}

export function knightStrike(state: GameState, wolfId: string): void {
	killPlayer(state, wolfId, 'chevalier', holderOf(state, 'chevalier')?.id ?? null);
}

/** Potion de guérison : sauve une victime des loups de cette nuit. */
export function heal(state: GameState, roleId: RoleId, victimId: string): void {
	if (!potionsOf(state, roleId).guerison) {
		throw new RuleError('La potion de guérison n\'est plus disponible.');
	}
	const victim = requirePlayer(state, victimId);
	const cause = victim.death?.cause;
	if (cause !== 'loups' && cause !== 'grand-mechant-loup') {
		throw new RuleError('La guérison ne sauve qu\'une victime des loups.');
	}
	usePotion(state, roleId, 'guerison');
	revivePlayer(state, victimId);
	// Une âme-sœur morte de chagrin revient avec elle.
	for (const player of state.players) {
		if (player.death?.cause === 'chagrin' && player.death.by === victimId) {
			revivePlayer(state, player.id);
		}
	}
}

export function poison(state: GameState, roleId: RoleId, targetId: string): void {
	if (!potionsOf(state, roleId).mort) {
		throw new RuleError('La potion de mort n\'est plus disponible.');
	}
	usePotion(state, roleId, 'mort');
	killPlayer(state, targetId, 'potion', holderOf(state, roleId)?.id ?? null);
}

export function sleep(state: GameState, roleId: RoleId, targetId: string): void {
	if (!potionsOf(state, roleId).sommeil) {
		throw new RuleError('La potion de sommeil n\'est plus disponible.');
	}
	usePotion(state, roleId, 'sommeil');
	state.flags.asleepIds.push(targetId);
	log(state, `${requirePlayer(state, targetId).name} est endormi : il ne parlera ni ne votera demain.`);
}

export function hypnotize(state: GameState, voterId: string, targetId: string): void {
	if (voterId === targetId) {
		throw new RuleError('Il faut deux joueurs différents.');
	}
	state.flags.hypnosis = { voterId, targetId };
	log(state, `${requirePlayer(state, voterId).name} est hypnotisé : il votera contre ${requirePlayer(state, targetId).name}.`);
}

export type VoteResult = 'elimine' | 'idiot' | 'personne' | 'bouc-emissaire';

/** Résultat du vote du village. `null` : personne n'est éliminé ; 'egalite' : égalité. */
export function vote(state: GameState, choice: string | 'egalite' | null): VoteResult {
	if (choice === null) {
		log(state, 'Le village n\'élimine personne.');
		return 'personne';
	}
	if (choice === 'egalite') {
		const scapegoat = holders(state, 'bouc-emissaire').find(player => player.alive);
		if (!scapegoat) {
			log(state, 'Égalité : personne n\'est éliminé.');
			return 'personne';
		}
		killPlayer(state, scapegoat.id, 'vote');
		return 'bouc-emissaire';
	}
	const target = requirePlayer(state, choice);
	if (target.roleId === 'idiot') {
		killPlayer(state, choice, 'vote');
		return 'idiot';
	}
	killPlayer(state, choice, 'vote');
	return 'elimine';
}

export function setSectGroup(state: GameState, playerId: string, group: 'A' | 'B' | null): void {
	requirePlayer(state, playerId).sectGroup = group;
}

export function setMayor(state: GameState, playerId: string | null): void {
	state.flags.mayorId = playerId;
	if (playerId) {
		log(state, `${requirePlayer(state, playerId).name} est élu maire.`);
	}
}

export function setChamanAwake(state: GameState, awake: boolean): void {
	state.flags.chamanAwake = awake;
}

export function togglePlayerAlive(state: GameState, playerId: string): void {
	const player = requirePlayer(state, playerId);
	if (player.alive) {
		killPlayer(state, playerId, 'autre');
	} else {
		revivePlayer(state, playerId);
	}
}

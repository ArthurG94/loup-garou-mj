import { describe, expect, it } from 'vitest';
import { attack, heal, hunterShot, louveteauSearch, poison, protect, searchLouveteau, vote } from './actions.js';
import { advancePhase, bearGrowls, createGame, createPlayer, detectVictory, fitRolesToDeck, knightVictim, roleChoices, wolfCount } from './engine.js';
import { stepsFor, wokeUpTonight } from './steps.js';
import type { GameState, RoleId } from './types.js';

/** Crée une partie dont les joueurs sont assis dans l'ordre donné, avec leur rôle. */
function game(roles: RoleId[], expert = false): GameState {
	const players = roles.map((roleId, index) => ({ ...createPlayer(`J${index + 1}`, `p${index + 1}`), roleId }));
	const deck: Partial<Record<RoleId, number>> = {};
	for (const roleId of roles) {
		deck[roleId] = (deck[roleId] ?? 0) + 1;
	}
	const state = createGame(players, deck, expert);
	state.players.forEach((player, index) => {
		player.roleId = roles[index] ?? null;
	});
	return state;
}

function goTo(state: GameState, kind: GameState['phase']['kind'], turn: number): void {
	while (state.phase.kind !== kind || state.phase.turn !== turn) {
		advancePhase(state);
	}
}

const ids = (state: GameState): string[] => stepsFor(state).map(step => step.id);

describe('déroulé des phases', () => {
	it('suit l\'ordre de l\'Excel la première nuit, sans attaque', () => {
		const state = game(['loup-garou', 'enfant-sauvage', 'amoureux', 'voyante-clairvoyante', 'villageois']);
		expect(ids(state)).toEqual(['n1-intro', 'n1-enfant-sauvage', 'n1-amoureux', 'n1-loups']);
	});

	it('n\'affiche les étapes « *** » qu\'en mode expert', () => {
		const state = game(['loup-garou', 'louveteau', 'medium', 'villageois'], true);
		expect(ids(state)).toEqual(['n1-intro', 'n1-louveteau-1', 'n1-medium', 'n1-loups', 'n1-louveteau-2']);
	});

	it('appelle l\'hypnotiseur après tous les soins', () => {
		const state = game(['loup-garou', 'sorciere', 'magicienne', 'hypnotiseur', 'salvateur', 'sainte-mere']);
		goTo(state, 'nuit', 2);
		const order = ids(state);
		expect(order.indexOf('n-hypnotiseur')).toBeGreaterThan(order.indexOf('n-magicienne'));
		expect(order.indexOf('n-hypnotiseur')).toBeLessThan(order.indexOf('n-sainte-mere'));
	});

	it('enchaîne nuit, matin, soir', () => {
		const state = game(['loup-garou', 'villageois']);
		const seen: string[] = [];
		for (let i = 0; i < 5; i++) {
			seen.push(`${state.phase.kind}${state.phase.turn}`);
			advancePhase(state);
		}
		expect(seen).toEqual(['premiere-nuit1', 'premier-matin1', 'soir1', 'nuit2', 'matin2']);
	});
});

describe('règles des rôles', () => {
	it('le salvateur protège de l\'attaque et ne peut pas choisir deux fois de suite', () => {
		const state = game(['loup-garou', 'salvateur', 'villageois']);
		goTo(state, 'nuit', 2);
		protect(state, 'p3');
		expect(attack(state, 'p3')).toBe('protege');
		expect(state.players[2]?.alive).toBe(true);
		goTo(state, 'nuit', 3);
		expect(() => {
			protect(state, 'p3');
		}).toThrow();
	});

	it('la sorcière sauve la victime des loups et son âme-sœur', () => {
		const state = game(['loup-garou', 'sorciere', 'amoureux', 'villageois']);
		state.flags.lovers = [['p3', 'p4']];
		goTo(state, 'nuit', 2);
		attack(state, 'p3');
		expect(state.players[3]?.alive).toBe(false);
		heal(state, 'sorciere', 'p3');
		expect(state.players[2]?.alive).toBe(true);
		expect(state.players[3]?.alive).toBe(true);
		expect(() => {
			heal(state, 'sorciere', 'p3');
		}).toThrow();
	});

	it('l\'idiot survit au vote mais ne vote plus', () => {
		const state = game(['loup-garou', 'idiot', 'villageois']);
		goTo(state, 'soir', 1);
		expect(vote(state, 'p2')).toBe('idiot');
		expect(state.players[1]?.alive).toBe(true);
		expect(state.players[1]?.cannotVote).toBe(true);
	});

	it('en cas d\'égalité, le bouc émissaire est éliminé', () => {
		const state = game(['loup-garou', 'bouc-emissaire', 'villageois']);
		goTo(state, 'soir', 1);
		expect(vote(state, 'egalite')).toBe('bouc-emissaire');
		expect(state.players[1]?.alive).toBe(false);
	});

	it('le mauvais chasseur tire au soir, le bon chasseur seulement s\'il est dévoré', () => {
		const state = game(['loup-garou', 'bon-chasseur', 'mauvais-chasseur', 'villageois', 'villageois']);
		goTo(state, 'soir', 1);
		vote(state, 'p3');
		expect(ids(state)).toContain('s-mauvais-chasseur');
		hunterShot(state, 'mauvais-chasseur', 'p4');
		goTo(state, 'nuit', 2);
		expect(ids(state)).not.toContain('n-bon-chasseur');
		attack(state, 'p2');
		expect(ids(state)).toContain('n-bon-chasseur');
	});

	it('le patient zéro dévoré empêche l\'attaque de la nuit suivante', () => {
		const state = game(['loup-garou', 'patient-zero', 'villageois']);
		goTo(state, 'nuit', 2);
		attack(state, 'p2');
		goTo(state, 'nuit', 3);
		expect(attack(state, 'p3')).toBe('interdit');
	});

	it('le patient zéro empoisonné bloque la sorcière la nuit suivante', () => {
		const state = game(['loup-garou', 'patient-zero', 'sorciere']);
		goTo(state, 'nuit', 2);
		poison(state, 'sorciere', 'p2');
		goTo(state, 'nuit', 3);
		expect(stepsFor(state).find(step => step.id === 'n-sorciere')?.fake).toContain('patient zéro');
	});

	it('l\'Infect Père n\'infecte qu\'une fois', () => {
		const state = game(['infect-pere', 'voyante-clairvoyante', 'villageois']);
		goTo(state, 'nuit', 2);
		expect(attack(state, 'p2', { infect: true })).toBe('infecte');
		expect(wolfCount(state)).toBe(2);
		goTo(state, 'nuit', 3);
		expect(() => attack(state, 'p3', { infect: true })).toThrow();
	});

	it('le louveteau rejoint la meute s\'il désigne un loup, et compte alors pour la médium', () => {
		const state = game(['loup-garou', 'louveteau', 'medium']);
		expect(wolfCount(state)).toBe(1);
		expect(louveteauSearch(state, 'p3')).toBe(false);
		expect(louveteauSearch(state, 'p1')).toBe(true);
		expect(wolfCount(state)).toBe(2);
	});

	it('la sainte mère rend le louveteau villageois', () => {
		const state = game(['loup-garou', 'louveteau', 'sainte-mere', 'louve']);
		expect(searchLouveteau(state, 'sainte-mere', 'p2')).toBe(true);
		expect(state.flags.louveteau).toBe('villageois');
		expect(searchLouveteau(state, 'louve', 'p2')).toBe(false);
	});

	it('le Grand Méchant Loup n\'attaque plus après la mort d\'un loup', () => {
		const state = game(['loup-garou', 'grand-mechant-loup', 'villageois', 'villageois']);
		goTo(state, 'nuit', 2);
		expect(ids(state)).toContain('n-grand-mechant-loup');
		goTo(state, 'soir', 2);
		vote(state, 'p1');
		goTo(state, 'nuit', 3);
		expect(ids(state)).not.toContain('n-grand-mechant-loup');
	});

	it('l\'ours grogne quand un voisin vivant est un loup', () => {
		const state = game(['villageois', 'montreur-ours', 'villageois', 'loup-garou']);
		expect(bearGrowls(state)).toBe(false);
		state.players[2]!.alive = false;
		expect(bearGrowls(state)).toBe(true);
	});

	it('le chevalier dévoré tue le premier loup à sa gauche la nuit suivante', () => {
		const state = game(['chevalier', 'villageois', 'loup-garou', 'loup-garou']);
		goTo(state, 'nuit', 2);
		attack(state, 'p1');
		goTo(state, 'nuit', 3);
		expect(ids(state)).toContain('n-chevalier');
		expect(knightVictim(state)?.id).toBe('p3');
	});

	it('fait semblant d\'appeler un rôle mort', () => {
		const state = game(['loup-garou', 'voyante-clairvoyante', 'villageois']);
		goTo(state, 'nuit', 2);
		attack(state, 'p2');
		goTo(state, 'nuit', 3);
		expect(stepsFor(state).find(step => step.id === 'n-voyante-clairvoyante')?.fake).not.toBeNull();
	});

	it('la fouineuse sait qui s\'est réveillé', () => {
		const state = game(['loup-garou', 'fouineuse', 'villageois', 'salvateur']);
		goTo(state, 'nuit', 2);
		expect(wokeUpTonight(state, 'p1')).toBe(true);
		expect(wokeUpTonight(state, 'p3')).toBe(false);
		expect(wokeUpTonight(state, 'p4')).toBe(true);
	});
});

describe('victoire', () => {
	it('détecte la victoire du village et des loups', () => {
		const state = game(['loup-garou', 'villageois', 'villageois']);
		state.players[0]!.alive = false;
		expect(detectVictory(state)).toEqual(['village']);
		state.players[0]!.alive = true;
		state.players[1]!.alive = false;
		state.players[2]!.alive = false;
		expect(detectVictory(state)).toEqual(['loups']);
	});

	it('détecte la victoire du loup blanc seul survivant', () => {
		const state = game(['loup-blanc', 'loup-garou', 'villageois']);
		state.players[1]!.alive = false;
		state.players[2]!.alive = false;
		expect(detectVictory(state)).toEqual(['loup-blanc']);
	});
});

describe('rôles proposables', () => {
	const deck: Partial<Record<RoleId, number>> = { 'loup-garou': 2, 'voyante-clairvoyante': 1 };
	const players = (roles: (RoleId | null)[]): ReturnType<typeof createPlayer>[] => roles.map((roleId, index) => ({ ...createPlayer(`J${index + 1}`, `p${index + 1}`), roleId }));

	it('ne propose que les cartes du paquet', () => {
		const ids = roleChoices(deck, players([null, null]), 'p1').map(choice => choice.role.id);
		expect(ids).toEqual(['loup-garou', 'voyante-clairvoyante']);
	});

	it('retire une carte dont tous les exemplaires sont attribués', () => {
		const table = players(['loup-garou', 'loup-garou', 'voyante-clairvoyante', null]);
		expect(roleChoices(deck, table, 'p4')).toEqual([]);
		expect(roleChoices(deck, table, 'p1').map(choice => [choice.role.id, choice.left])).toEqual([['loup-garou', 1]]);
	});

	it('enlève les rôles qui ne sont plus dans le paquet ou en surnombre', () => {
		const table = players(['loup-garou', 'sorciere', 'loup-garou', 'loup-garou']);
		fitRolesToDeck(deck, table);
		expect(table.map(player => player.roleId)).toEqual(['loup-garou', null, 'loup-garou', null]);
	});
});

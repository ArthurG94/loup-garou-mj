import { deathsDuring, deckCount, findPlayer, holders, inDeck, isPackWolf, previousNight } from './engine.js';
import { ROLES } from './roles.js';
import type { GameState, PhaseKind, RoleId } from './types.js';

/** Outil interactif affiché sous le texte d'une étape. */
export type Widget
	= | 'none'
		| 'deaths'
		| 'role-reveal'
		| 'alignment'
		| 'wolf-count'
		| 'bear'
		| 'mentor'
		| 'lovers'
		| 'pack'
		| 'louveteau'
		| 'louve'
		| 'sainte-mere'
		| 'protect'
		| 'paralyse'
		| 'attack'
		| 'second-attack'
		| 'potions'
		| 'hunter'
		| 'knight'
		| 'hypnosis'
		| 'sniff'
		| 'chaman'
		| 'vote'
		| 'sect'
		| 'mayor'
		| 'victory';

export interface StepDef {
	readonly id: string;
	readonly phases: readonly PhaseKind[];
	/** Rôles réveillés par l'étape. Vide : étape du maître du jeu, toujours affichée. */
	readonly roles: readonly RoleId[];
	readonly title: string;
	/** Texte à lire à voix haute (réveil et sommeil du village, les loups, le vote). */
	readonly say: readonly string[];
	/** Gestes à faire en silence : les rôles sont réveillés d'une touche sur l'épaule. */
	readonly gestures?: readonly string[];
	/** Ce que le MJ doit faire ou demander. */
	readonly todo?: string;
	readonly widget: Widget;
	/** Ligne « *** » de l'Excel : seulement si le MJ sait ce qu'il fait. */
	readonly expert?: boolean;
	/** Condition supplémentaire pour afficher l'étape. */
	readonly when?: (state: GameState) => boolean;
	/** Libellé de la condition, affiché au MJ. */
	readonly condition?: string;
}

export interface Step extends StepDef {
	/** Raison de faire semblant d'appeler le rôle, ou null si le rôle agit vraiment. */
	readonly fake: string | null;
}

export const PACK_ROLES: readonly RoleId[] = ROLES.filter(role => role.wakesWithWolves).map(role => role.id);

const MORNINGS: readonly PhaseKind[] = ['premier-matin', 'matin'];

function diedLastNightBy(state: GameState, roleId: RoleId, causes: readonly string[]): boolean {
	const night = previousNight(state.phase);
	if (!night) {
		return false;
	}
	return holders(state, roleId).some(player => player.death !== null
		&& player.death.phase.kind === night.kind
		&& player.death.phase.turn === night.turn
		&& causes.includes(player.death.cause));
}

function diedTonight(state: GameState, roleId: RoleId, causes: readonly string[] | null): boolean {
	return deathsDuring(state, state.phase).some(player => player.roleId === roleId
		&& player.death !== null
		&& (causes === null || causes.includes(player.death.cause)));
}

function noWolfDead(state: GameState): boolean {
	return !state.players.some(player => !player.alive && player.roleId !== null && player.roleId !== 'grand-mechant-loup' && (isPackWolf(state, player) || player.roleId === 'louveteau'));
}

export const STEP_DEFS: readonly StepDef[] = [
	// ───────────── Première nuit ─────────────
	{
		id: 'n1-intro',
		phases: ['premiere-nuit'],
		roles: [],
		title: 'La nuit tombe',
		say: ['La nuit tombe sur Thiercelieux.', 'Tout le village s\'endort, fermez les yeux.'],
		todo: 'Attendez que tout le monde ait les yeux fermés.',
		widget: 'none',
	},
	{
		id: 'n1-louveteau-1',
		phases: ['premiere-nuit'],
		roles: ['louveteau'],
		title: 'Le louveteau',
		say: [],
		gestures: ['Il désigne un joueur.', 'Signe de tête : oui si c\'est un loup, non sinon.'],
		widget: 'louveteau',
		expert: true,
		when: state => state.flags.louveteau === 'cherche',
	},
	{
		id: 'n1-voyante-clairvoyante',
		phases: ['premiere-nuit'],
		roles: ['voyante-clairvoyante'],
		title: 'La voyante clairvoyante',
		say: [],
		gestures: ['Elle désigne un joueur.', 'Montrez-lui la carte de ce joueur.'],
		widget: 'role-reveal',
		expert: true,
	},
	{
		id: 'n1-voyante-de-mairde',
		phases: ['premiere-nuit'],
		roles: ['voyante-de-mairde'],
		title: 'La voyante de Mairde',
		say: [],
		gestures: ['Elle désigne un joueur.', 'Pouce en l\'air : bon. Pouce en bas : mauvais.'],
		widget: 'alignment',
		expert: true,
	},
	{
		id: 'n1-medium',
		phases: ['premiere-nuit'],
		roles: ['medium'],
		title: 'La médium',
		say: [],
		gestures: ['Montrez-lui avec les doigts le nombre de loups.'],
		widget: 'wolf-count',
		expert: true,
	},
	{
		id: 'n1-enfant-sauvage',
		phases: ['premiere-nuit'],
		roles: ['enfant-sauvage'],
		title: 'L\'enfant sauvage',
		say: [],
		gestures: ['Il désigne son mentor.'],
		widget: 'mentor',
	},
	{
		id: 'n1-amoureux',
		phases: ['premiere-nuit'],
		roles: ['amoureux'],
		title: 'L\'amoureux',
		say: [],
		gestures: ['Il désigne son âme-sœur.', 'Touchez aussi l\'épaule de l\'âme-sœur : ils se regardent et se reconnaissent.'],
		widget: 'lovers',
	},
	{
		id: 'n1-loup-amoureux',
		phases: ['premiere-nuit'],
		roles: ['loup-amoureux'],
		title: 'Le loup amoureux',
		say: [],
		gestures: ['Il désigne son âme-sœur.', 'Touchez aussi l\'épaule de l\'âme-sœur : ils se regardent et se reconnaissent.'],
		widget: 'lovers',
	},
	{
		id: 'n1-loups',
		phases: ['premiere-nuit'],
		roles: PACK_ROLES,
		title: 'Les loups se reconnaissent',
		say: ['Les loups-garous se réveillent.', 'Regardez-vous bien : voici votre meute.', 'Les loups-garous se rendorment.'],
		todo: 'Pas d\'attaque la première nuit. Le loup blanc et le premier adjoint des loups se réveillent avec eux.',
		widget: 'pack',
	},
	{
		id: 'n1-louveteau-2',
		phases: ['premiere-nuit'],
		roles: ['louveteau'],
		title: 'Le louveteau',
		say: [],
		gestures: ['Il désigne un joueur.', 'Signe de tête : oui si c\'est un loup, non sinon.'],
		widget: 'louveteau',
		expert: true,
		when: state => state.flags.louveteau === 'cherche',
	},

	// ───────────── Matins ─────────────
	{
		id: 'm-reveil',
		phases: MORNINGS,
		roles: [],
		title: 'Le village se réveille',
		say: ['Le jour se lève sur Thiercelieux.', 'Tout le village se réveille, ouvrez les yeux.'],
		todo: 'Annoncez les victimes de la nuit, sans révéler leur carte.',
		widget: 'deaths',
	},
	{
		id: 'm-montreur-ours',
		phases: MORNINGS,
		roles: ['montreur-ours'],
		title: 'L\'ours du montreur',
		say: ['Écoutez bien l\'ours du montreur...'],
		todo: 'Grognez si l\'ours est agité, sinon restez silencieux.',
		widget: 'bear',
	},
	{
		id: 'm-sectaire',
		phases: ['premier-matin'],
		roles: ['sectaire'],
		title: 'Les deux groupes du sectaire',
		say: ['Le village est divisé en deux groupes.'],
		todo: 'Choisissez un critère (femmes/hommes, blonds/bruns, barbus/imberbes…), annoncez-le et notez le groupe de chacun.',
		widget: 'sect',
	},
	{
		id: 'm-maire',
		phases: ['premier-matin'],
		roles: [],
		title: 'Élection du maire',
		say: ['Le village doit élire son maire.'],
		todo: 'Facultatif. Le premier adjoint (village ou loups) peut réclamer le titre.',
		widget: 'mayor',
	},
	{
		id: 'm-victoire',
		phases: MORNINGS,
		roles: [],
		title: 'Quelqu\'un a gagné ?',
		say: [],
		todo: 'Vérifiez les conditions de victoire avant le débat.',
		widget: 'victory',
	},

	// ───────────── Soirs ─────────────
	{
		id: 's-vote',
		phases: ['soir'],
		roles: [],
		title: 'Le vote du village',
		say: ['Le village a débattu, il est temps de voter.', 'À trois, pointez du doigt celui que vous voulez éliminer.'],
		todo: 'Indiquez qui a été désigné. En cas d\'égalité, le bouc émissaire est éliminé s\'il est en jeu.',
		widget: 'vote',
	},
	{
		id: 's-mauvais-chasseur',
		phases: ['soir'],
		roles: ['mauvais-chasseur'],
		title: 'Le mauvais chasseur tire',
		say: ['Le mauvais chasseur a été éliminé...', 'Avant de mourir, il tire sur quelqu\'un. Chasseur, désigne ta cible.'],
		widget: 'hunter',
		when: state => diedTonight(state, 'mauvais-chasseur', null),
		condition: 'Le mauvais chasseur vient de mourir',
	},
	{
		id: 's-victoire',
		phases: ['soir'],
		roles: [],
		title: 'Quelqu\'un a gagné ?',
		say: [],
		todo: 'Vérifiez les conditions de victoire avant la nuit.',
		widget: 'victory',
	},

	// ───────────── Nuits suivantes ─────────────
	{
		id: 'n-intro',
		phases: ['nuit'],
		roles: [],
		title: 'La nuit tombe',
		say: ['La nuit tombe sur Thiercelieux.', 'Tout le village s\'endort, fermez les yeux.'],
		widget: 'none',
	},
	{
		id: 'n-sinistros',
		phases: ['nuit'],
		roles: ['sinistros'],
		title: 'Le Sinistros',
		say: [],
		gestures: ['Il désigne le joueur paralysé cette nuit (jamais deux fois de suite le même).'],
		widget: 'paralyse',
	},
	{
		id: 'n-louveteau',
		phases: ['nuit'],
		roles: ['louveteau'],
		title: 'Le louveteau',
		say: [],
		gestures: ['Il désigne un joueur.', 'Signe de tête : oui si c\'est un loup, non sinon.'],
		widget: 'louveteau',
		when: state => state.flags.louveteau === 'cherche',
	},
	{
		id: 'n-louve',
		phases: ['nuit'],
		roles: ['louve'],
		title: 'La louve',
		say: [],
		gestures: ['Elle désigne un joueur.', 'Signe de tête : oui si c\'est le louveteau.'],
		widget: 'louve',
		when: state => state.flags.louveteau === 'cherche',
	},
	{
		id: 'n-salvateur',
		phases: ['nuit'],
		roles: ['salvateur'],
		title: 'Le salvateur',
		say: [],
		gestures: ['Il désigne la personne qu\'il protège (jamais deux fois de suite la même).'],
		widget: 'protect',
	},
	{
		id: 'n-voyante-clairvoyante',
		phases: ['nuit'],
		roles: ['voyante-clairvoyante'],
		title: 'La voyante clairvoyante',
		say: [],
		gestures: ['Elle désigne un joueur.', 'Montrez-lui la carte de ce joueur.'],
		widget: 'role-reveal',
	},
	{
		id: 'n-voyante-de-mairde',
		phases: ['nuit'],
		roles: ['voyante-de-mairde'],
		title: 'La voyante de Mairde',
		say: [],
		gestures: ['Elle désigne un joueur.', 'Pouce en l\'air : bon. Pouce en bas : mauvais.'],
		widget: 'alignment',
	},
	{
		id: 'n-medium',
		phases: ['nuit'],
		roles: ['medium'],
		title: 'La médium',
		say: [],
		gestures: ['Montrez-lui avec les doigts le nombre de loups.'],
		widget: 'wolf-count',
	},
	{
		id: 'n-chaman',
		phases: ['nuit'],
		roles: ['chaman'],
		title: 'Le chaman',
		say: [],
		gestures: ['Touchez aussi l\'épaule du dernier mort : il fait des signes au chaman.'],
		widget: 'chaman',
	},
	{
		id: 'n-chevalier',
		phases: ['nuit'],
		roles: [],
		title: 'L\'épée rouillée du chevalier',
		say: [],
		gestures: ['Touchez l\'épaule du premier loup à gauche du chevalier et faites-lui signe qu\'il est mort.'],
		widget: 'knight',
		when: state => diedLastNightBy(state, 'chevalier', ['loups', 'grand-mechant-loup']),
		condition: 'Le chevalier a été dévoré la nuit dernière',
	},
	{
		id: 'n-loups',
		phases: ['nuit'],
		roles: PACK_ROLES,
		title: 'Les loups-garous',
		say: ['Les loups-garous se réveillent.', 'Désignez ensemble votre victime.', 'Les loups-garous se rendorment.'],
		todo: 'L\'Infect Père peut infecter la victime une fois dans la partie (il vous fait signe).',
		widget: 'attack',
	},
	{
		id: 'n-grand-mechant-loup',
		phases: ['nuit'],
		roles: ['grand-mechant-loup'],
		title: 'Le Grand Méchant Loup',
		say: [],
		gestures: ['Il désigne une seconde victime.'],
		widget: 'second-attack',
		when: noWolfDead,
		condition: 'Aucun autre loup n\'est mort depuis le début',
	},
	{
		id: 'n-bon-chasseur',
		phases: ['nuit'],
		roles: ['bon-chasseur'],
		title: 'Le bon chasseur tire',
		say: [],
		gestures: ['Faites-lui signe qu\'il a été dévoré.', 'Il désigne qui il emporte avec lui.'],
		widget: 'hunter',
		when: state => diedTonight(state, 'bon-chasseur', ['loups', 'grand-mechant-loup']),
		condition: 'Le bon chasseur vient d\'être dévoré',
	},
	{
		id: 'n-mauvais-chasseur-1',
		phases: ['nuit'],
		roles: ['mauvais-chasseur'],
		title: 'Le mauvais chasseur tire',
		say: [],
		gestures: ['Faites-lui signe qu\'il est mort.', 'Il désigne qui il emporte avec lui.'],
		widget: 'hunter',
		when: state => diedTonight(state, 'mauvais-chasseur', ['loups', 'grand-mechant-loup', 'chevalier']),
		condition: 'Le mauvais chasseur vient de mourir',
	},
	{
		id: 'n-sorciere',
		phases: ['nuit'],
		roles: ['sorciere'],
		title: 'La sorcière',
		say: [],
		gestures: ['Montrez-lui les victimes de la nuit.', 'Elle fait signe si elle utilise sa potion de guérison, et désigne la cible de sa potion de mort.'],
		widget: 'potions',
	},
	{
		id: 'n-vilaine-sorciere',
		phases: ['nuit'],
		roles: ['vilaine-sorciere'],
		title: 'La vilaine sorcière',
		say: [],
		gestures: ['Montrez-lui les victimes de la nuit.', 'Elle désigne la cible de sa potion de sommeil et celle de sa potion de mort.'],
		widget: 'potions',
	},
	{
		id: 'n-magicienne',
		phases: ['nuit'],
		roles: ['magicienne'],
		title: 'La magicienne',
		say: [],
		gestures: ['Montrez-lui les victimes de la nuit.', 'Elle fait signe si elle utilise sa potion de guérison, et désigne la cible de sa potion de sommeil.'],
		widget: 'potions',
	},
	{
		id: 'n-mauvais-chasseur-2',
		phases: ['nuit'],
		roles: ['mauvais-chasseur'],
		title: 'Le mauvais chasseur tire',
		say: [],
		gestures: ['Faites-lui signe qu\'il a été empoisonné.', 'Il désigne qui il emporte avec lui.'],
		widget: 'hunter',
		when: state => diedTonight(state, 'mauvais-chasseur', ['potion']),
		condition: 'Le mauvais chasseur vient d\'être empoisonné',
	},
	{
		id: 'n-hypnotiseur',
		phases: ['nuit'],
		roles: ['hypnotiseur'],
		title: 'L\'hypnotiseur',
		say: [],
		gestures: ['Il désigne la personne hypnotisée, puis celle contre qui elle devra voter.', 'Touchez l\'épaule de l\'hypnotisé et montrez-lui contre qui voter.'],
		widget: 'hypnosis',
	},
	{
		id: 'n-sainte-mere',
		phases: ['nuit'],
		roles: ['sainte-mere'],
		title: 'La sainte mère',
		say: [],
		gestures: ['Elle désigne un joueur.', 'Signe de tête : oui si c\'est le louveteau.'],
		widget: 'sainte-mere',
	},
	{
		id: 'n-fouineuse',
		phases: ['nuit'],
		roles: ['fouineuse'],
		title: 'La fouineuse',
		say: [],
		gestures: ['Elle désigne un joueur.', 'Signe de tête : oui s\'il s\'est réveillé cette nuit.'],
		widget: 'sniff',
	},
];

/** Raison de faire semblant d'appeler un rôle, pour ne rien révéler aux joueurs. */
function fakeReason(state: GameState, def: StepDef): string | null {
	if (def.roles.length === 0 || def.roles === PACK_ROLES) {
		return null;
	}
	const people = def.roles.flatMap(roleId => holders(state, roleId));
	const expected = def.roles.reduce((sum, roleId) => sum + deckCount(state, roleId), 0);
	const living = people.filter(player => player.alive);
	if (people.length >= expected && living.length === 0 && def.widget !== 'hunter') {
		return 'Ce rôle est mort : faites semblant de l\'appeler.';
	}
	const isNightPhase = state.phase.kind === 'nuit' || state.phase.kind === 'premiere-nuit';
	if (isNightPhase && living.length > 0 && living.every(player => player.id === state.flags.paralysedId)) {
		return 'Paralysé par le Sinistros : faites semblant de l\'appeler.';
	}
	const blocked = state.flags.blocked;
	if (isNightPhase && blocked?.turn === state.phase.turn && living.length > 0 && living.every(player => player.id === blocked.playerId)) {
		return 'Contaminé par le patient zéro : faites semblant de l\'appeler.';
	}
	return null;
}

/** Étapes de la phase en cours, filtrées selon les rôles en jeu et l'état de la partie. */
export function stepsFor(state: GameState): Step[] {
	return STEP_DEFS
		.filter(def => def.phases.includes(state.phase.kind))
		.filter(def => def.roles.length === 0 || def.roles.some(roleId => inDeck(state, roleId)))
		.filter(def => !def.expert || state.expertMode)
		.filter(def => !def.when || def.when(state))
		.map(def => ({ ...def, fake: fakeReason(state, def) }));
}

export function currentStepIndex(state: GameState, steps: readonly Step[]): number {
	if (state.stepId === null) {
		return 0;
	}
	const index = steps.findIndex(step => step.id === state.stepId);
	return Math.max(index, 0);
}

/** La fouineuse : le joueur s'est-il réveillé cette nuit ? */
export function wokeUpTonight(state: GameState, playerId: string): boolean {
	const player = findPlayer(state, playerId);
	if (!player?.roleId || player.id === state.flags.paralysedId) {
		return false;
	}
	if (state.flags.blocked?.playerId === player.id && state.flags.blocked.turn === state.phase.turn) {
		return false;
	}
	const steps = stepsFor(state).filter(step => step.id !== 'n-fouineuse');
	return steps.some((step) => {
		if (step.id === 'n-chaman') {
			return state.flags.chamanAwake && player.roleId === 'chaman';
		}
		if (step.id === 'n-loups') {
			return isPackWolf(state, player) && player.alive;
		}
		return player.roleId !== null && step.roles.includes(player.roleId) && step.fake === null && (player.alive || step.widget === 'hunter');
	});
}

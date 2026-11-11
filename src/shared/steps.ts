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
	/** Texte à lire à voix haute. */
	readonly say: readonly string[];
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
		say: ['Louveteau, réveille-toi.', 'Désigne quelqu\'un : je te dirai si c\'est un loup.', 'Louveteau, rendors-toi.'],
		widget: 'louveteau',
		expert: true,
		when: state => state.flags.louveteau === 'cherche',
	},
	{
		id: 'n1-voyante-clairvoyante',
		phases: ['premiere-nuit'],
		roles: ['voyante-clairvoyante'],
		title: 'La voyante clairvoyante',
		say: ['Voyante, réveille-toi.', 'Désigne un joueur dont tu veux connaître l\'identité.', 'Voyante, rendors-toi.'],
		todo: 'Montrez-lui la carte du joueur désigné.',
		widget: 'role-reveal',
		expert: true,
	},
	{
		id: 'n1-voyante-de-mairde',
		phases: ['premiere-nuit'],
		roles: ['voyante-de-mairde'],
		title: 'La voyante de Mairde',
		say: ['Voyante de Mairde, réveille-toi.', 'Désigne un joueur : je te dirai s\'il est bon ou mauvais.', 'Voyante de Mairde, rendors-toi.'],
		todo: 'Pouce en l\'air : bon. Pouce en bas : mauvais.',
		widget: 'alignment',
		expert: true,
	},
	{
		id: 'n1-medium',
		phases: ['premiere-nuit'],
		roles: ['medium'],
		title: 'La médium',
		say: ['Médium, réveille-toi.', 'Voici le nombre de loups dans le village.', 'Médium, rendors-toi.'],
		todo: 'Montrez le nombre avec vos doigts.',
		widget: 'wolf-count',
		expert: true,
	},
	{
		id: 'n1-enfant-sauvage',
		phases: ['premiere-nuit'],
		roles: ['enfant-sauvage'],
		title: 'L\'enfant sauvage',
		say: ['Enfant sauvage, réveille-toi.', 'Désigne ton mentor.', 'Enfant sauvage, rendors-toi.'],
		widget: 'mentor',
	},
	{
		id: 'n1-amoureux',
		phases: ['premiere-nuit'],
		roles: ['amoureux'],
		title: 'L\'amoureux',
		say: ['Amoureux, réveille-toi.', 'Désigne ton âme-sœur.', 'Amoureux, rendors-toi.', 'Je vais toucher l\'épaule des deux âmes-sœurs : réveillez-vous et reconnaissez-vous.', 'Âmes-sœurs, rendormez-vous.'],
		todo: 'Touchez l\'épaule de l\'amoureux et de son âme-sœur, puis laissez-les se reconnaître.',
		widget: 'lovers',
	},
	{
		id: 'n1-loup-amoureux',
		phases: ['premiere-nuit'],
		roles: ['loup-amoureux'],
		title: 'Le loup amoureux',
		say: ['Loup amoureux, réveille-toi.', 'Désigne ton âme-sœur.', 'Loup amoureux, rendors-toi.', 'Je vais toucher l\'épaule des deux âmes-sœurs : réveillez-vous et reconnaissez-vous.', 'Âmes-sœurs, rendormez-vous.'],
		todo: 'Touchez l\'épaule du loup amoureux et de son âme-sœur.',
		widget: 'lovers',
	},
	{
		id: 'n1-loups',
		phases: ['premiere-nuit'],
		roles: PACK_ROLES,
		title: 'Les loups se reconnaissent',
		say: ['Loups-garous, réveillez-vous.', 'Regardez-vous bien : voici votre meute.', 'Cette nuit, vous ne dévorez personne.', 'Loups-garous, rendormez-vous.'],
		todo: 'Pas d\'attaque la première nuit. Le loup blanc et le premier adjoint des loups se réveillent avec eux.',
		widget: 'pack',
	},
	{
		id: 'n1-louveteau-2',
		phases: ['premiere-nuit'],
		roles: ['louveteau'],
		title: 'Le louveteau',
		say: ['Louveteau, réveille-toi.', 'Désigne quelqu\'un : je te dirai si c\'est un loup.', 'Louveteau, rendors-toi.'],
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
		todo: 'Annoncez les victimes de la nuit et retournez leur carte.',
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
		say: ['Sinistros, réveille-toi.', 'Désigne le joueur qui sera paralysé de terreur cette nuit.', 'Sinistros, rendors-toi.'],
		todo: 'Pas deux fois de suite le même joueur.',
		widget: 'paralyse',
	},
	{
		id: 'n-louveteau',
		phases: ['nuit'],
		roles: ['louveteau'],
		title: 'Le louveteau',
		say: ['Louveteau, réveille-toi.', 'Désigne quelqu\'un : je te dirai si c\'est un loup.', 'Louveteau, rendors-toi.'],
		widget: 'louveteau',
		when: state => state.flags.louveteau === 'cherche',
	},
	{
		id: 'n-louve',
		phases: ['nuit'],
		roles: ['louve'],
		title: 'La louve',
		say: ['Louve, réveille-toi.', 'Désigne un joueur : est-ce ton louveteau ?', 'Louve, rendors-toi.'],
		widget: 'louve',
		when: state => state.flags.louveteau === 'cherche',
	},
	{
		id: 'n-salvateur',
		phases: ['nuit'],
		roles: ['salvateur'],
		title: 'Le salvateur',
		say: ['Salvateur, réveille-toi.', 'Désigne la personne que tu protèges cette nuit.', 'Salvateur, rendors-toi.'],
		todo: 'Pas deux fois de suite la même personne.',
		widget: 'protect',
	},
	{
		id: 'n-voyante-clairvoyante',
		phases: ['nuit'],
		roles: ['voyante-clairvoyante'],
		title: 'La voyante clairvoyante',
		say: ['Voyante, réveille-toi.', 'Désigne un joueur dont tu veux connaître l\'identité.', 'Voyante, rendors-toi.'],
		todo: 'Montrez-lui la carte du joueur désigné.',
		widget: 'role-reveal',
	},
	{
		id: 'n-voyante-de-mairde',
		phases: ['nuit'],
		roles: ['voyante-de-mairde'],
		title: 'La voyante de Mairde',
		say: ['Voyante de Mairde, réveille-toi.', 'Désigne un joueur : je te dirai s\'il est bon ou mauvais.', 'Voyante de Mairde, rendors-toi.'],
		todo: 'Pouce en l\'air : bon. Pouce en bas : mauvais.',
		widget: 'alignment',
	},
	{
		id: 'n-medium',
		phases: ['nuit'],
		roles: ['medium'],
		title: 'La médium',
		say: ['Médium, réveille-toi.', 'Voici le nombre de loups dans le village.', 'Médium, rendors-toi.'],
		todo: 'Montrez le nombre avec vos doigts.',
		widget: 'wolf-count',
	},
	{
		id: 'n-chaman',
		phases: ['nuit'],
		roles: ['chaman'],
		title: 'Le chaman',
		say: ['Chaman, réveille-toi.', 'Le dernier mort va te faire des signes.', 'Chaman et esprit, rendormez-vous.'],
		todo: 'Vous choisissez de le réveiller ou non. Touchez l\'épaule du dernier mort.',
		widget: 'chaman',
	},
	{
		id: 'n-chevalier',
		phases: ['nuit'],
		roles: [],
		title: 'L\'épée rouillée du chevalier',
		say: [],
		todo: 'Touchez l\'épaule du premier loup à gauche du chevalier : il meurt du tétanos.',
		widget: 'knight',
		when: state => diedLastNightBy(state, 'chevalier', ['loups', 'grand-mechant-loup']),
		condition: 'Le chevalier a été dévoré la nuit dernière',
	},
	{
		id: 'n-loups',
		phases: ['nuit'],
		roles: PACK_ROLES,
		title: 'Les loups-garous',
		say: ['Loups-garous, réveillez-vous.', 'Désignez ensemble votre victime.', 'Loups-garous, rendormez-vous.'],
		todo: 'L\'Infect Père peut infecter la victime une fois dans la partie (il vous fait signe).',
		widget: 'attack',
	},
	{
		id: 'n-grand-mechant-loup',
		phases: ['nuit'],
		roles: ['grand-mechant-loup'],
		title: 'Le Grand Méchant Loup',
		say: ['Grand Méchant Loup, réveille-toi.', 'Désigne une seconde victime.', 'Grand Méchant Loup, rendors-toi.'],
		widget: 'second-attack',
		when: noWolfDead,
		condition: 'Aucun autre loup n\'est mort depuis le début',
	},
	{
		id: 'n-bon-chasseur',
		phases: ['nuit'],
		roles: ['bon-chasseur'],
		title: 'Le bon chasseur tire',
		say: ['Bon chasseur, réveille-toi.', 'Tu as été dévoré : désigne qui tu emportes avec toi.', 'Rendors-toi.'],
		widget: 'hunter',
		when: state => diedTonight(state, 'bon-chasseur', ['loups', 'grand-mechant-loup']),
		condition: 'Le bon chasseur vient d\'être dévoré',
	},
	{
		id: 'n-mauvais-chasseur-1',
		phases: ['nuit'],
		roles: ['mauvais-chasseur'],
		title: 'Le mauvais chasseur tire',
		say: ['Mauvais chasseur, réveille-toi.', 'Tu as été éliminé : désigne qui tu emportes avec toi.', 'Rendors-toi.'],
		widget: 'hunter',
		when: state => diedTonight(state, 'mauvais-chasseur', ['loups', 'grand-mechant-loup', 'chevalier']),
		condition: 'Le mauvais chasseur vient de mourir',
	},
	{
		id: 'n-sorciere',
		phases: ['nuit'],
		roles: ['sorciere'],
		title: 'La sorcière',
		say: ['Sorcière, réveille-toi.', 'Voici les victimes de cette nuit.', 'Veux-tu utiliser ta potion de guérison ? Ta potion de mort ?', 'Sorcière, rendors-toi.'],
		todo: 'Montrez-lui les victimes de la nuit.',
		widget: 'potions',
	},
	{
		id: 'n-vilaine-sorciere',
		phases: ['nuit'],
		roles: ['vilaine-sorciere'],
		title: 'La vilaine sorcière',
		say: ['Vilaine sorcière, réveille-toi.', 'Voici les victimes de cette nuit.', 'Veux-tu utiliser ta potion de sommeil ? Ta potion de mort ?', 'Vilaine sorcière, rendors-toi.'],
		todo: 'Montrez-lui les victimes de la nuit.',
		widget: 'potions',
	},
	{
		id: 'n-magicienne',
		phases: ['nuit'],
		roles: ['magicienne'],
		title: 'La magicienne',
		say: ['Magicienne, réveille-toi.', 'Voici les victimes de cette nuit.', 'Veux-tu utiliser ta potion de guérison ? Ta potion de sommeil ?', 'Magicienne, rendors-toi.'],
		todo: 'Montrez-lui les victimes de la nuit.',
		widget: 'potions',
	},
	{
		id: 'n-mauvais-chasseur-2',
		phases: ['nuit'],
		roles: ['mauvais-chasseur'],
		title: 'Le mauvais chasseur tire',
		say: ['Mauvais chasseur, réveille-toi.', 'Tu as été empoisonné : désigne qui tu emportes avec toi.', 'Rendors-toi.'],
		widget: 'hunter',
		when: state => diedTonight(state, 'mauvais-chasseur', ['potion']),
		condition: 'Le mauvais chasseur vient d\'être empoisonné',
	},
	{
		id: 'n-hypnotiseur',
		phases: ['nuit'],
		roles: ['hypnotiseur'],
		title: 'L\'hypnotiseur',
		say: ['Hypnotiseur, réveille-toi.', 'Désigne la personne que tu hypnotises, puis celle contre qui elle devra voter.', 'Hypnotiseur, rendors-toi.'],
		todo: 'Touchez l\'épaule de l\'hypnotisé et montrez-lui contre qui il devra voter.',
		widget: 'hypnosis',
	},
	{
		id: 'n-sainte-mere',
		phases: ['nuit'],
		roles: ['sainte-mere'],
		title: 'La sainte mère',
		say: ['Sainte mère, réveille-toi.', 'Désigne un joueur : est-ce le louveteau égaré ?', 'Sainte mère, rendors-toi.'],
		widget: 'sainte-mere',
	},
	{
		id: 'n-fouineuse',
		phases: ['nuit'],
		roles: ['fouineuse'],
		title: 'La fouineuse',
		say: ['Fouineuse, réveille-toi.', 'Désigne un joueur : je te dirai s\'il s\'est réveillé cette nuit.', 'Fouineuse, rendors-toi.'],
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

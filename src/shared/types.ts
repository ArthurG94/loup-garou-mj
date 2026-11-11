/** Camp d'origine d'un rôle. */
export type Camp = 'village' | 'loups' | 'solitaire';

/** Moment où le maître du jeu doit s'occuper du rôle. */
export type Timing = 'jamais' | 'premiere-nuit' | 'chaque-nuit' | 'nuits-suivantes' | 'matin' | 'soir' | 'a-sa-mort';

export type RoleId
	= | 'villageois'
		| 'loup-garou'
		| 'infect-pere'
		| 'louve'
		| 'grand-mechant-loup'
		| 'sinistros'
		| 'loup-amoureux'
		| 'louveteau'
		| 'premier-adjoint-loups'
		| 'loup-blanc'
		| 'sectaire'
		| 'sorciere'
		| 'vilaine-sorciere'
		| 'magicienne'
		| 'voyante-clairvoyante'
		| 'voyante-de-mairde'
		| 'medium'
		| 'salvateur'
		| 'hypnotiseur'
		| 'sainte-mere'
		| 'fouineuse'
		| 'chaman'
		| 'enfant-sauvage'
		| 'amoureux'
		| 'montreur-ours'
		| 'bon-chasseur'
		| 'mauvais-chasseur'
		| 'chevalier'
		| 'patient-zero'
		| 'idiot'
		| 'bouc-emissaire'
		| 'premier-adjoint-village';

export interface Role {
	readonly id: RoleId;
	readonly name: string;
	readonly camp: Camp;
	readonly timing: Timing;
	/** Texte du pouvoir, repris de la carte. */
	readonly power: string;
	/** Texte « rôle play » de la carte. */
	readonly lore: string;
	/** Nombre maximum d'exemplaires dans une partie. */
	readonly max: number;
	/** Le rôle se réveille avec la meute pour l'attaque. */
	readonly wakesWithWolves: boolean;
}

export type PhaseKind = 'premiere-nuit' | 'premier-matin' | 'soir' | 'nuit' | 'matin';

export interface Phase {
	readonly kind: PhaseKind;
	/** Numéro du tour : 1 pour la première nuit, le premier matin et le premier soir. */
	readonly turn: number;
}

export type DeathCause = 'loups' | 'grand-mechant-loup' | 'vote' | 'potion' | 'chasseur' | 'chevalier' | 'chagrin' | 'autre';

export interface Player {
	readonly id: string;
	name: string;
	roleId: RoleId | null;
	alive: boolean;
	death: { cause: DeathCause; phase: Phase; by: string | null; order: number } | null;
	/** Infecté par l'Infect Père : joue désormais avec les loups. */
	infected: boolean;
	/** L'idiot a été désigné au vote : il ne vote plus. */
	cannotVote: boolean;
	/** Groupe défini pour l'abominable sectaire. */
	sectGroup: 'A' | 'B' | null;
}

export interface Potions {
	guerison: boolean;
	mort: boolean;
	sommeil: boolean;
}

export interface GameFlags {
	/** Potions déjà utilisées, par rôle. */
	potions: Partial<Record<RoleId, Potions>>;
	infectionUsed: boolean;
	/** Âmes-sœurs : paires d'identifiants de joueurs. */
	lovers: [string, string][];
	mentorId: string | null;
	/** Louveteau : 'cherche', 'loup' (meute trouvée) ou 'villageois' (trouvé par la sainte mère). */
	louveteau: 'cherche' | 'loup' | 'villageois';
	/** Dernier joueur choisi, par rôle, pour la règle « pas deux fois de suite ». */
	lastTarget: Partial<Record<RoleId, string>>;
	/** Joueur paralysé par le sinistros pendant la nuit en cours. */
	paralysedId: string | null;
	/** Joueur protégé par le salvateur pendant la nuit en cours. */
	protectedId: string | null;
	/** Joueur endormi (sommeil) : ne parle ni ne vote le jour suivant. */
	asleepIds: string[];
	/** Consigne de l'hypnotiseur pour le prochain vote. */
	hypnosis: { voterId: string; targetId: string } | null;
	/** Patient zéro : tour de nuit sans attaque des loups. */
	noAttackTurn: number | null;
	/** Patient zéro : tour sans vote du village. */
	noVoteTurn: number | null;
	/** Patient zéro : joueur privé de pouvoir pendant la nuit indiquée. */
	blocked: { playerId: string; turn: number } | null;
	mayorId: string | null;
	/** Le chaman sera réveillé cette nuit. */
	chamanAwake: boolean;
}

export interface LogEntry {
	readonly phase: Phase;
	readonly text: string;
}

export interface GameState {
	readonly version: 1;
	players: Player[];
	deck: Partial<Record<RoleId, number>>;
	expertMode: boolean;
	phase: Phase;
	/** Étape en cours dans la phase. */
	stepId: string | null;
	flags: GameFlags;
	log: LogEntry[];
}

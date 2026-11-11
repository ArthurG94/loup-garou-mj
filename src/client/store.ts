import { advancePhase, createGame, createPlayer } from '../shared/engine.js';
import { currentStepIndex, stepsFor } from '../shared/steps.js';
import type { GameState, Player, RoleId } from '../shared/types.js';

export interface SetupDraft {
	players: Player[];
	deck: Partial<Record<RoleId, number>>;
	expertMode: boolean;
}

interface Saved {
	setup: SetupDraft;
	game: GameState | null;
}

const STORAGE_KEY = 'loup-garou-mj:v1';
const HISTORY_LIMIT = 60;

function defaultSetup(): SetupDraft {
	return {
		players: Array.from({ length: 8 }, (_, index) => createPlayer(`Joueur ${index + 1}`)),
		deck: { 'loup-garou': 2, 'villageois': 3, 'sorciere': 1, 'voyante-clairvoyante': 1, 'amoureux': 1 },
		expertMode: false,
	};
}

function load(): Saved {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const saved = JSON.parse(raw) as { setup?: SetupDraft; game?: { version?: number } | null };
			if (saved.setup && (!saved.game || saved.game.version === 1)) {
				return saved as Saved;
			}
		}
	} catch (error) {
		console.warn('Sauvegarde illisible, nouvelle partie.', error);
	}
	return { setup: defaultSetup(), game: null };
}

/** État de l'appli : préparation, partie en cours et historique pour annuler. */
class Store extends EventTarget {
	private saved: Saved = load();
	private history: string[] = [];

	public get setup(): SetupDraft {
		return this.saved.setup;
	}

	public get game(): GameState | null {
		return this.saved.game;
	}

	public get canUndo(): boolean {
		return this.history.length > 0;
	}

	/** Modifie la préparation. */
	public updateSetup(change: (setup: SetupDraft) => void): void {
		const next = structuredClone(this.saved.setup);
		change(next);
		this.saved.setup = next;
		this.commit();
	}

	/** Modifie la partie en cours, en gardant l'état précédent pour pouvoir annuler. */
	public updateGame(change: (game: GameState) => void): void {
		const game = this.saved.game;
		if (!game) {
			return;
		}
		const before = JSON.stringify(game);
		// Copie : chaque modification produit un nouvel objet, ce qui redessine l'interface.
		const next = structuredClone(game);
		change(next);
		this.saved.game = next;
		if (JSON.stringify(next) !== before) {
			this.history.push(before);
			if (this.history.length > HISTORY_LIMIT) {
				this.history.shift();
			}
		}
		this.commit();
	}

	public undo(): void {
		const previous = this.history.pop();
		if (previous) {
			this.saved.game = JSON.parse(previous) as GameState;
			this.commit();
		}
	}

	public startGame(): void {
		const { players, deck, expertMode } = this.saved.setup;
		this.saved.game = createGame(players, deck, expertMode);
		// Les rôles déjà attribués pendant la préparation sont conservés.
		this.saved.game.players.forEach((player, index) => {
			player.roleId = players[index]?.roleId ?? null;
		});
		this.history = [];
		this.commit();
	}

	public endGame(): void {
		this.saved.game = null;
		this.history = [];
		this.commit();
	}

	/** Étape suivante, ou phase suivante à la fin de la phase. */
	public next(): void {
		this.updateGame((game) => {
			const steps = stepsFor(game);
			const index = currentStepIndex(game, steps);
			const following = steps[index + 1];
			if (following) {
				game.stepId = following.id;
			} else {
				advancePhase(game);
				game.stepId = stepsFor(game)[0]?.id ?? null;
			}
		});
	}

	public previous(): void {
		this.updateGame((game) => {
			const steps = stepsFor(game);
			const index = currentStepIndex(game, steps);
			const before = steps[index - 1];
			if (before) {
				game.stepId = before.id;
			}
		});
	}

	private commit(): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saved));
		} catch (error) {
			console.warn('Sauvegarde impossible.', error);
		}
		this.dispatchEvent(new Event('change'));
	}
}

export const store = new Store();

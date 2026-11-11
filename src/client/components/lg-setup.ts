import { css, html, LitElement, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createPlayer, deckBalance, deckSize } from '../../shared/engine.js';
import { getRole, ROLES } from '../../shared/roles.js';
import type { Camp, RoleId } from '../../shared/types.js';
import { store } from '../store.js';
import type { SetupDraft } from '../store.js';
import { shared } from '../styles.js';
import './lg-card.js';

const CAMP_TITLES: Record<Camp, string> = {
	loups: 'La meute',
	village: 'Le village',
	solitaire: 'Les solitaires',
};

/** Écran de préparation : joueurs autour de la table, paquet de cartes, options. */
@customElement('lg-setup')
export class LgSetup extends LitElement {
	public static override styles = [shared, css`
		:host {
			display: grid;
			gap: 28px;
			padding-bottom: 120px;
		}

		section {
			display: grid;
			gap: 14px;
		}

		.hint {
			margin: 0;
			color: var(--muted);
			font-size: 0.9rem;
		}

		ol {
			list-style: none;
			margin: 0;
			padding: 0;
			display: grid;
			gap: 8px;
		}

		li {
			display: flex;
			align-items: center;
			gap: 6px;
		}

		.seat {
			flex: none;
			width: 30px;
			height: 30px;
			display: grid;
			place-items: center;
			border-radius: 50%;
			background: var(--surface-2);
			font-weight: 800;
			font-size: 0.85rem;
			color: var(--gold-light);
		}

		input[type="text"], select {
			flex: 1;
			min-width: 0;
			min-height: 44px;
			padding: 0 12px;
			border-radius: 12px;
			border: 1px solid var(--line);
			background: var(--surface-2);
			color: var(--ink);
			font: inherit;
		}

		.icon {
			flex: none;
			width: 40px;
			height: 40px;
			border-radius: 12px;
			border: 1px solid var(--line);
			background: var(--surface);
			font-size: 1rem;
		}

		.gauge {
			display: grid;
			gap: 8px;
		}

		.bar {
			display: flex;
			height: 14px;
			border-radius: 999px;
			overflow: hidden;
			background: var(--surface-2);
		}

		.bar span {
			transition: flex-grow 300ms ease;
		}

		.bar .loups {
			background: var(--loups);
		}

		.bar .village {
			background: var(--village);
		}

		.bar .solitaire {
			background: var(--solitaire);
		}

		.legend {
			display: flex;
			flex-wrap: wrap;
			gap: 6px 16px;
			font-size: 0.9rem;
			font-variant-numeric: tabular-nums;
		}

		.legend b.ok {
			color: var(--village-light);
		}

		.legend b.ko {
			color: var(--loups-light);
		}

		.deck {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
			gap: 18px 12px;
		}

		.slot {
			display: grid;
			gap: 8px;
			justify-items: center;
		}

		.slot lg-card {
			--w: 100%;
			width: 100%;
			transition: opacity 200ms ease, transform 200ms ease;
		}

		.slot.off lg-card {
			filter: grayscale(0.85) brightness(0.5);
		}

		.stepper {
			display: flex;
			align-items: center;
			gap: 6px;
		}

		.count {
			min-width: 2ch;
			text-align: center;
			font-family: var(--font-display);
			font-size: 1.6rem;
			color: var(--gold-light);
			font-variant-numeric: tabular-nums;
		}

		.stepper button {
			width: 40px;
			height: 40px;
			border-radius: 50%;
			border: 1px solid var(--line);
			background: var(--surface-2);
			font-size: 1.3rem;
			font-weight: 800;
		}

		label.toggle {
			display: flex;
			gap: 12px;
			align-items: flex-start;
		}

		label.toggle input {
			flex: none;
			margin-top: 4px;
			width: 22px;
			height: 22px;
			accent-color: var(--gold);
		}

		details summary {
			cursor: pointer;
			font-weight: 700;
			min-height: 44px;
			display: flex;
			align-items: center;
		}

		.start {
			position: fixed;
			left: 0;
			right: 0;
			bottom: calc(64px + env(safe-area-inset-bottom, 0px));
			z-index: 5;
			display: flex;
			justify-content: center;
			gap: 12px;
			align-items: center;
			padding: 12px max(16px, env(safe-area-inset-right, 0px)) 12px max(16px, env(safe-area-inset-left, 0px));
			background: linear-gradient(180deg, transparent, rgba(8, 9, 22, .94) 45%);
		}

		.start .btn {
			flex: 1;
			max-width: 420px;
		}
	`];

	@property({ attribute: false })
	public accessor setup: SetupDraft | null = null;

	private update_(change: (setup: SetupDraft) => void): void {
		store.updateSetup(change);
	}

	private renderPlayers(setup: SetupDraft): TemplateResult {
		return html`<section aria-labelledby="joueurs">
			<h2 id="joueurs">Les joueurs (${setup.players.length})</h2>
			<p class="hint">Dans l'ordre de la table, en tournant dans le sens des aiguilles d'une montre : le joueur suivant est le voisin de gauche. L'ours et le chevalier en dépendent.</p>
			<ol>
				${setup.players.map((player, index) => html`<li>
					<span class="seat">${index + 1}</span>
					<input id=${`nom-${player.id}`} type="text" .value=${player.name} aria-label=${`Nom du joueur ${index + 1}`} @change=${(event: Event): void => {
						const value = (event.target as HTMLInputElement).value.trim();
						this.update_((draft) => {
							const target = draft.players[index];
							if (target) {
								target.name = value || `Joueur ${index + 1}`;
							}
						});
					}} />
					<button class="icon" aria-label="Monter" ?disabled=${index === 0} @click=${(): void => {
						this.update_((draft) => {
							const [moved] = draft.players.splice(index, 1);
							if (moved) {
								draft.players.splice(index - 1, 0, moved);
							}
						});
					}}>▲</button>
					<button class="icon" aria-label="Descendre" ?disabled=${index === setup.players.length - 1} @click=${(): void => {
						this.update_((draft) => {
							const [moved] = draft.players.splice(index, 1);
							if (moved) {
								draft.players.splice(index + 1, 0, moved);
							}
						});
					}}>▼</button>
					<button class="icon" aria-label=${`Retirer ${player.name}`} @click=${(): void => {
						this.update_((draft) => {
							draft.players.splice(index, 1);
						});
					}}>✕</button>
				</li>`)}
			</ol>
			<div><button class="btn small" @click=${(): void => {
				this.update_((draft) => {
					draft.players.push(createPlayer(`Joueur ${draft.players.length + 1}`));
				});
			}}>+ Ajouter un joueur</button></div>
		</section>`;
	}

	private renderGauge(setup: SetupDraft): TemplateResult {
		const balance = deckBalance(setup.deck);
		const total = deckSize(setup.deck);
		const players = setup.players.length;
		const diff = players - total;
		return html`<div class="gauge" role="status">
			<div class="bar" aria-hidden="true">
				<span class="loups" style=${`flex-grow:${balance.loups}`}></span>
				<span class="solitaire" style=${`flex-grow:${balance.solitaire}`}></span>
				<span class="village" style=${`flex-grow:${balance.village}`}></span>
			</div>
			<div class="legend">
				<span>🐺 ${balance.loups} loup(s)</span>
				<span>🌗 ${balance.solitaire} solitaire(s)</span>
				<span>🏠 ${balance.village} villageois</span>
				<b class=${diff === 0 ? 'ok' : 'ko'}>${total} carte(s) pour ${players} joueur(s)${diff > 0 ? ` : il manque ${diff} carte(s)` : diff < 0 ? ` : ${-diff} carte(s) en trop` : ' ✓'}</b>
			</div>
		</div>`;
	}

	private renderDeck(setup: SetupDraft): TemplateResult {
		const camps: Camp[] = ['loups', 'solitaire', 'village'];
		return html`<section aria-labelledby="paquet">
			<h2 id="paquet">Le paquet</h2>
			${this.renderGauge(setup)}
			${camps.map(camp => html`<h3>${CAMP_TITLES[camp]}</h3>
				<div class="deck">
					${ROLES.filter(role => role.camp === camp).map((role) => {
						const count = setup.deck[role.id] ?? 0;
						return html`<div class="slot ${count === 0 ? 'off' : ''}">
							<lg-card .roleId=${role.id}></lg-card>
							<div class="stepper">
								<button aria-label=${`Retirer ${role.name}`} ?disabled=${count === 0} @click=${(): void => {
									this.setCount(role.id, count - 1);
								}}>−</button>
								<span class="count" aria-label=${`${count} ${role.name}`}>${count}</span>
								<button aria-label=${`Ajouter ${role.name}`} ?disabled=${count >= role.max} @click=${(): void => {
									this.setCount(role.id, count + 1);
								}}>+</button>
							</div>
						</div>`;
					})}
				</div>`)}
		</section>`;
	}

	private setCount(roleId: RoleId, count: number): void {
		this.update_((draft) => {
			if (count <= 0) {
				draft.deck = Object.fromEntries(Object.entries(draft.deck).filter(([id]) => id !== roleId));
			} else {
				draft.deck[roleId] = count;
			}
		});
	}

	private renderAssign(setup: SetupDraft): TemplateResult {
		const inDeck = ROLES.filter(role => (setup.deck[role.id] ?? 0) > 0);
		return html`<details>
			<summary>Attribuer les rôles maintenant (facultatif)</summary>
			<p class="hint">Sinon, l'appli vous demandera qui se réveille au moment où chaque rôle est appelé.</p>
			<ol>
				${setup.players.map((player, index) => html`<li>
					<span class="seat">${index + 1}</span>
					<select id=${`role-${player.id}`} aria-label=${`Rôle de ${player.name}`} @change=${(event: Event): void => {
						const value = (event.target as HTMLSelectElement).value;
						this.update_((draft) => {
							const target = draft.players[index];
							if (target) {
								target.roleId = value === '' ? null : value as RoleId;
							}
						});
					}}>
						<option value="" ?selected=${player.roleId === null}>${player.name} : rôle inconnu</option>
						${inDeck.map(role => html`<option value=${role.id} ?selected=${player.roleId === role.id}>${player.name} : ${getRole(role.id).name}</option>`)}
					</select>
				</li>`)}
			</ol>
		</details>`;
	}

	protected override render(): TemplateResult | typeof nothing {
		const setup = this.setup;
		if (!setup) {
			return nothing;
		}
		const ready = setup.players.length >= 3 && deckSize(setup.deck) === setup.players.length;
		return html`
			${this.renderPlayers(setup)}
			${this.renderDeck(setup)}
			<section aria-labelledby="options">
				<h2 id="options">Options</h2>
				<label class="toggle"><input id="expert" type="checkbox" .checked=${setup.expertMode} @change=${(event: Event): void => {
					const checked = (event.target as HTMLInputElement).checked;
					this.update_((draft) => {
						draft.expertMode = checked;
					});
				}} /><span><strong>Mode MJ expérimenté</strong><br /><span class="hint">Ajoute les étapes « *** » de la première nuit : louveteau, voyantes et médium.</span></span></label>
				${this.renderAssign(setup)}
			</section>
			<div class="start">
				<button class="btn primary" ?disabled=${!ready} @click=${(): void => {
					store.startGame();
				}}>🌙 Commencer la partie</button>
			</div>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'lg-setup': LgSetup;
	}
}

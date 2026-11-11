import { css, html, LitElement, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ROLES } from '../../shared/roles.js';
import type { RoleId } from '../../shared/types.js';
import { store } from '../store.js';
import { shared } from '../styles.js';
import './lg-card.js';
import './lg-narration.js';
import './lg-setup.js';
import './lg-village.js';

type Tab = 'partie' | 'village' | 'cartes';

/** Coquille de l'appli : en-tête, onglets, écran courant. */
@customElement('lg-app')
export class LgApp extends LitElement {
	public static override styles = [shared, css`
		:host {
			display: block;
			min-height: 100%;
		}

		header {
			position: sticky;
			top: env(safe-area-inset-top, 0px);
			z-index: 6;
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 10px max(16px, env(safe-area-inset-right, 0px)) 10px max(16px, env(safe-area-inset-left, 0px));
			background: color-mix(in oklab, var(--bg) 85%, transparent);
			backdrop-filter: blur(10px);
			border-bottom: 1px solid var(--line);
		}

		header h1 {
			flex: 1;
			min-width: 0;
			font-size: 1.5rem;
			color: var(--gold-light);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		main {
			max-width: 760px;
			margin: 0 auto;
			padding: 20px max(16px, env(safe-area-inset-right, 0px)) 24px max(16px, env(safe-area-inset-left, 0px));
		}

		.tabs {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 6;
			display: flex;
			justify-content: center;
			padding: 0 max(8px, env(safe-area-inset-right, 0px)) env(safe-area-inset-bottom, 0px) max(8px, env(safe-area-inset-left, 0px));
			background: var(--surface);
			border-top: 1px solid var(--line);
		}

		.tabs button {
			flex: 1;
			max-width: 200px;
			height: 64px;
			display: grid;
			place-items: center;
			align-content: center;
			gap: 2px;
			border: none;
			background: none;
			color: var(--muted);
			font-size: 0.75rem;
			font-weight: 700;
		}

		.tabs button span {
			font-size: 1.3rem;
		}

		.tabs button[aria-current="page"] {
			color: var(--gold-light);
		}

		.confirm {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 10px;
			margin-bottom: 16px;
		}

		.gallery {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
			gap: 16px;
		}

		.gallery lg-card {
			--w: 100%;
			width: 100%;
		}

		.focus {
			position: fixed;
			inset: 0;
			z-index: 20;
			display: grid;
			place-items: center;
			padding: 24px;
			background: rgba(5, 6, 20, .85);
			backdrop-filter: blur(6px);
		}
	`];

	@state()
	private accessor tab: Tab = 'partie';

	@state()
	private accessor confirmEnd = false;

	@state()
	private accessor focused: RoleId | null = null;

	private wakeLock: { release: () => Promise<void> } | null = null;

	private readonly onChange = (): void => {
		this.requestUpdate();
		this.syncAmbiance();
	};

	public override connectedCallback(): void {
		super.connectedCallback();
		store.addEventListener('change', this.onChange);
		this.syncAmbiance();
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		store.removeEventListener('change', this.onChange);
	}

	/** Fond selon la phase, et écran maintenu allumé pendant la partie. */
	private syncAmbiance(): void {
		const game = store.game;
		document.body.dataset.phase = game?.phase.kind ?? 'setup';
		if (game && !this.wakeLock && 'wakeLock' in navigator) {
			navigator.wakeLock.request('screen').then((lock) => {
				this.wakeLock = lock;
			}).catch(() => {
				this.wakeLock = null;
			});
		}
		if (!game && this.wakeLock) {
			void this.wakeLock.release();
			this.wakeLock = null;
		}
	}

	private renderTab(): TemplateResult {
		const game = store.game;
		switch (this.tab) {
			case 'partie':
				return game ? html`<lg-narration .game=${game}></lg-narration>` : html`<lg-setup .setup=${store.setup}></lg-setup>`;
			case 'village':
				return game ? html`<lg-village .game=${game}></lg-village>` : html`<p class="muted">Le village apparaîtra une fois la partie commencée.</p>`;
			case 'cartes':
				return html`<div class="gallery">${ROLES.map(role => html`<lg-card .roleId=${role.id} @click=${(): void => {
					this.focused = role.id;
				}}></lg-card>`)}</div>`;
		}
	}

	protected override render(): TemplateResult {
		const game = store.game;
		const tabs: { id: Tab; icon: string; label: string }[] = [
			{ id: 'partie', icon: game ? '🌙' : '🃏', label: game ? 'Partie' : 'Préparation' },
			{ id: 'village', icon: '🏘', label: 'Village' },
			{ id: 'cartes', icon: '📜', label: 'Cartes' },
		];
		return html`
			<header>
				<h1>Loup-Garou · MJ</h1>
				${game
					? html`<button class="btn small" ?disabled=${!store.canUndo} @click=${(): void => {
						store.undo();
					}}>↶ Annuler</button>
				<button class="btn small" @click=${(): void => {
					this.confirmEnd = !this.confirmEnd;
				}}>Fin</button>`
					: nothing}
			</header>
			<main>
				${this.confirmEnd && game
					? html`<div class="confirm panel" role="alert">
					<span>Terminer la partie ? Les joueurs et le paquet sont gardés pour la prochaine.</span>
					<button class="btn small danger" @click=${(): void => {
						this.confirmEnd = false;
						this.tab = 'partie';
						store.endGame();
					}}>Terminer</button>
					<button class="btn small" @click=${(): void => {
						this.confirmEnd = false;
					}}>Continuer</button>
				</div>`
					: nothing}
				${this.renderTab()}
			</main>
			<nav class="tabs" aria-label="Écrans">
				${tabs.map(tab => html`<button aria-current=${this.tab === tab.id ? 'page' : 'false'} @click=${(): void => {
					this.tab = tab.id;
				}}><span aria-hidden="true">${tab.icon}</span>${tab.label}</button>`)}
			</nav>
			${this.focused
				? html`<div class="focus" @click=${(): void => {
					this.focused = null;
				}}><lg-card size="large" .roleId=${this.focused}></lg-card></div>`
				: nothing}`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'lg-app': LgApp;
	}
}

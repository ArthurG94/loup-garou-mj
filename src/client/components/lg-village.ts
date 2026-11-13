import { css, html, LitElement, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { assignRole, togglePlayerAlive } from '../../shared/actions.js';
import { choiceHint, currentCamp, inDeck, loverOf, phaseLabel, potionsOf, roleChoices } from '../../shared/engine.js';
import { getRole } from '../../shared/roles.js';
import type { GameState, Player, RoleId } from '../../shared/types.js';
import { store } from '../store.js';
import { shared } from '../styles.js';
import './lg-card.js';

/** Écran du village : joueurs vivants et morts, pouvoirs restants, journal. */
@customElement('lg-village')
export class LgVillage extends LitElement {
	public static override styles = [shared, css`
		:host {
			display: grid;
			gap: 28px;
			padding-bottom: 90px;
		}

		section {
			display: grid;
			gap: 14px;
		}

		.grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			gap: 16px 12px;
		}

		.player {
			display: grid;
			gap: 6px;
			justify-items: center;
			text-align: center;
			min-width: 0;
		}

		.player lg-card {
			--w: 96px;
		}

		.name {
			font-weight: 800;
		}

		.tags {
			display: flex;
			flex-wrap: wrap;
			justify-content: center;
			gap: 4px;
			font-size: 0.78rem;
			color: var(--muted);
		}

		select {
			width: 100%;
			min-height: 36px;
			border-radius: 10px;
			border: 1px solid var(--line);
			background: var(--surface-2);
			color: var(--ink);
			font: inherit;
			font-size: 0.8rem;
		}

		.powers {
			display: grid;
			gap: 6px;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.log {
			display: grid;
			gap: 4px;
			margin: 0;
			padding: 0;
			list-style: none;
			font-size: 0.9rem;
		}

		.log li.phase {
			margin-top: 8px;
			font-family: var(--font-display);
			color: var(--gold-light);
		}
	`];

	@property({ attribute: false })
	public accessor game: GameState | null = null;

	private tags(game: GameState, player: Player): string[] {
		const tags: string[] = [];
		const lover = loverOf(game, player.id);
		if (lover) {
			tags.push(`💞 ${lover.name}`);
		}
		if (game.flags.mayorId === player.id) {
			tags.push('🎖 maire');
		}
		if (player.infected) {
			tags.push('☣ infecté');
		}
		if (game.flags.mentorId === player.id) {
			tags.push('🧭 mentor');
		}
		if (player.roleId === 'louveteau') {
			tags.push(game.flags.louveteau === 'cherche' ? '🔎 cherche sa meute' : game.flags.louveteau === 'loup' ? '🐺 a trouvé sa meute' : '🙏 sauvé');
		}
		if (player.roleId === 'enfant-sauvage' && currentCamp(game, player) === 'loups') {
			tags.push('🐺 transformé');
		}
		if (game.flags.asleepIds.includes(player.id)) {
			tags.push('💤 endormi');
		}
		if (player.cannotVote) {
			tags.push('🚫 ne vote plus');
		}
		if (player.sectGroup) {
			tags.push(`groupe ${player.sectGroup}`);
		}
		return tags;
	}

	private renderPlayer(game: GameState, player: Player): TemplateResult {
		const roles = roleChoices(game.deck, game.players, player.id);
		return html`<div class="player">
			<lg-card size="mini" .roleId=${player.roleId} .face=${player.roleId ? 'front' : 'back'} .caption=${player.name} ?dead=${!player.alive}></lg-card>
			<span class="name">${player.name}</span>
			<div class="tags">${this.tags(game, player).map(tag => html`<span>${tag}</span>`)}</div>
			<select id=${`v-role-${player.id}`} aria-label=${`Rôle de ${player.name}`} @change=${(event: Event): void => {
				const value = (event.target as HTMLSelectElement).value;
				store.updateGame((next) => {
					assignRole(next, player.id, value === '' ? null : value as RoleId);
				});
			}}>
				<option value="" ?selected=${player.roleId === null}>Rôle inconnu</option>
				${roles.map(({ role, left }) => html`<option value=${role.id} ?selected=${player.roleId === role.id}>${role.name}${choiceHint(game.deck[role.id] ?? 0, left, player.roleId === role.id)}</option>`)}
			</select>
			<button class="btn small ${player.alive ? 'danger' : ''}" @click=${(): void => {
				store.updateGame((next) => {
					togglePlayerAlive(next, player.id);
				});
			}}>${player.alive ? 'Marquer mort' : 'Ramener à la vie'}</button>
		</div>`;
	}

	private renderPowers(game: GameState): TemplateResult | typeof nothing {
		const lines: string[] = [];
		for (const roleId of ['sorciere', 'vilaine-sorciere', 'magicienne'] as const) {
			if (inDeck(game, roleId)) {
				const left = potionsOf(game, roleId);
				const names = [left.guerison ? 'guérison' : '', left.mort ? 'mort' : '', left.sommeil ? 'sommeil' : ''].filter(Boolean);
				lines.push(`${getRole(roleId).name} : ${names.length > 0 ? names.join(', ') : 'plus de potion'}`);
			}
		}
		if (inDeck(game, 'infect-pere')) {
			lines.push(`Infect Père : ${game.flags.infectionUsed ? 'infection utilisée' : 'infection disponible'}`);
		}
		if (inDeck(game, 'salvateur') && game.flags.lastTarget.salvateur) {
			const last = game.players.find(player => player.id === game.flags.lastTarget.salvateur);
			lines.push(`Salvateur : ne peut pas reprotéger ${last?.name ?? '?'}`);
		}
		if (inDeck(game, 'sinistros') && game.flags.lastTarget.sinistros) {
			const last = game.players.find(player => player.id === game.flags.lastTarget.sinistros);
			lines.push(`Sinistros : ne peut pas reparalyser ${last?.name ?? '?'}`);
		}
		if (lines.length === 0) {
			return nothing;
		}
		return html`<section aria-labelledby="pouvoirs">
			<h2 id="pouvoirs">Pouvoirs</h2>
			<ul class="powers">${lines.map(line => html`<li class="panel">${line}</li>`)}</ul>
		</section>`;
	}

	protected override render(): TemplateResult | typeof nothing {
		const game = this.game;
		if (!game) {
			return nothing;
		}
		const living = game.players.filter(player => player.alive).length;
		const entries = [...game.log].reverse();
		return html`
			<section aria-labelledby="village">
				<h2 id="village">Le village · ${living} vivant(s) sur ${game.players.length}</h2>
				<div class="grid">${game.players.map(player => this.renderPlayer(game, player))}</div>
			</section>
			${this.renderPowers(game)}
			<section aria-labelledby="journal">
				<h2 id="journal">Journal</h2>
				${entries.length === 0
					? html`<p class="muted">Rien pour l'instant. ${phaseLabel(game.phase)} en cours.</p>`
					: html`<ol class="log">
					${entries.map(entry => html`<li class=${entry.text.startsWith('—') ? 'phase' : ''}>${entry.text}</li>`)}
				</ol>`}
			</section>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'lg-village': LgVillage;
	}
}

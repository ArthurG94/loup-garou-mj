import { html, LitElement } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Player } from '../../shared/types.js';
import { shared } from '../styles.js';

/** Rangée de puces pour désigner un joueur. Émet « pick » avec l'identifiant du joueur. */
@customElement('lg-player-picker')
export class LgPlayerPicker extends LitElement {
	public static override styles = [shared];

	@property({ attribute: false })
	public accessor players: Player[] = [];

	@property({ attribute: false })
	public accessor selected: (string | null)[] = [];

	/** Affiche aussi les joueurs morts (barrés). */
	@property({ type: Boolean, attribute: 'include-dead' })
	public accessor includeDead = false;

	@property({ attribute: false })
	public accessor disabledIds: string[] = [];

	private pick(id: string): void {
		this.dispatchEvent(new CustomEvent<string>('pick', { detail: id, bubbles: true, composed: true }));
	}

	protected override render(): TemplateResult {
		const shown = this.includeDead ? this.players : this.players.filter(player => player.alive);
		return html`<div class="chips" role="group">
			${shown.map(player => html`<button
				class="chip ${player.alive ? '' : 'dead'}"
				aria-pressed=${this.selected.includes(player.id) ? 'true' : 'false'}
				?disabled=${this.disabledIds.includes(player.id)}
				@click=${(): void => {
					this.pick(player.id);
				}}
			>${player.name}</button>`)}
		</div>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'lg-player-picker': LgPlayerPicker;
	}
}

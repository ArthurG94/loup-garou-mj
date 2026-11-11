import { css, html, LitElement, nothing, svg } from 'lit';
import type { SVGTemplateResult, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { getRole, roleImage } from '../../shared/roles.js';
import type { Camp, RoleId, Timing } from '../../shared/types.js';

export const CAMP_LABELS: Record<Camp, string> = {
	village: 'Village',
	loups: 'Loups',
	solitaire: 'Solitaire',
};

export const TIMING_LABELS: Record<Timing, string> = {
	'jamais': 'Aucun réveil',
	'premiere-nuit': '1re nuit',
	'chaque-nuit': 'Chaque nuit',
	'nuits-suivantes': 'Nuits suivantes',
	'matin': 'Le matin',
	'soir': 'Au vote',
	'a-sa-mort': 'À sa mort',
};

function timingIcon(timing: Timing): SVGTemplateResult {
	switch (timing) {
		case 'premiere-nuit':
		case 'chaque-nuit':
		case 'nuits-suivantes':
			return svg`<path d="M15 3a9 9 0 1 0 6 15.5A7.5 7.5 0 0 1 15 3z" />`;
		case 'matin':
			return svg`<circle cx="12" cy="12" r="5" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M4.2 19.8 7 17M17 7l2.8-2.8" stroke="currentColor" stroke-width="2" fill="none" />`;
		case 'soir':
			return svg`<path d="M4 20h16M7 20V9l5-5 5 5v11" stroke="currentColor" stroke-width="2" fill="none" />`;
		case 'a-sa-mort':
			return svg`<path d="M12 2a8 8 0 0 0-8 8v4l2 2v4h3v-3h2v3h2v-3h2v3h3v-4l2-2v-4a8 8 0 0 0-8-8zm-3 8.5a1.8 1.8 0 1 1 0 .1zm6 0a1.8 1.8 0 1 1 0 .1z" />`;
		case 'jamais':
			return svg`<circle cx="12" cy="12" r="4" />`;
	}
}

/**
 * Carte de rôle façon carte à collectionner.
 * Taille « mini » pour les listes, « normal » pour le paquet, « large » pour la narration.
 */
@customElement('lg-card')
export class LgCard extends LitElement {
	public static override styles = css`
		:host {
			--w: 150px;
			display: inline-block;
			width: var(--w);
			max-width: 100%;
			perspective: 900px;
			container-type: inline-size;
			font-family: var(--font-body);
		}

		:host([size="mini"]) {
			--w: 96px;
		}

		:host([size="large"]) {
			--w: min(240px, 62vw);
		}

		:host([zoomable]:not([size="mini"])) {
			cursor: zoom-in;
		}

		.tilt {
			transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
			transform-style: preserve-3d;
			transition: transform 120ms ease-out;
			will-change: transform;
		}

		.flip {
			position: relative;
			aspect-ratio: 63 / 88;
			transform-style: preserve-3d;
			transition: transform 600ms cubic-bezier(.2, .8, .2, 1);
		}

		:host([face="back"]) .flip {
			transform: rotateY(180deg);
		}

		.face {
			position: absolute;
			inset: 0;
			backface-visibility: hidden;
			border-radius: 7.5cqw;
			overflow: hidden;
		}

		.front {
			--camp: var(--village);
			--camp-light: var(--village-light);
			display: flex;
			flex-direction: column;
			padding: 4.5cqw;
			background:
				linear-gradient(145deg, var(--camp-light), var(--camp) 35%, color-mix(in oklab, var(--camp) 50%, black) 70%, var(--camp-light));
			box-shadow: 0 10px 30px -10px rgba(0, 0, 0, .8), inset 0 0 0 1px rgba(255, 255, 255, .25);
		}

		.front.loups {
			--camp: var(--loups);
			--camp-light: var(--loups-light);
		}

		.front.solitaire {
			--camp: var(--solitaire);
			--camp-light: var(--solitaire-light);
		}

		.inner {
			flex: 1;
			display: flex;
			flex-direction: column;
			min-height: 0;
			border-radius: 5cqw;
			background: linear-gradient(180deg, #f6ecd2, #e9d7ae);
			color: #2a1d10;
			overflow: hidden;
		}

		.title {
			display: flex;
			align-items: center;
			gap: 4px;
			padding: 3cqw 4.5cqw;
			background: linear-gradient(180deg, #fff6df, #ead8ad);
			border-bottom: 1px solid rgba(0, 0, 0, .25);
		}

		.title h3 {
			flex: 1;
			min-width: 0;
			font-family: var(--font-display);
			font-weight: 400;
			font-size: 8.8cqw;
			line-height: 1.05;
			margin: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		:host([size="large"]) .title h3 {
			white-space: normal;
		}

		.title svg {
			flex: none;
			width: 10cqw;
			height: 10cqw;
			fill: var(--camp);
			color: var(--camp);
		}

		.art {
			position: relative;
			margin: 3.5cqw;
			margin-bottom: 0;
			aspect-ratio: 1;
			border-radius: 4px;
			overflow: hidden;
			box-shadow: inset 0 0 0 2px rgba(0, 0, 0, .35);
			background: #222;
		}

		.art img {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.type {
			display: flex;
			justify-content: space-between;
			gap: 4px;
			margin: 3cqw 3.5cqw 0;
			padding: 2px 6px;
			border-radius: 4px;
			background: var(--camp);
			color: white;
			font-size: 5cqw;
			font-weight: 800;
			letter-spacing: .04em;
			text-transform: uppercase;
		}

		.text {
			flex: 1;
			min-height: 0;
			overflow: auto;
			padding: 3cqw 4.5cqw 4cqw;
			font-size: 4.7cqw;
			line-height: 1.35;
		}

		.text p {
			margin: 0 0 .4em;
		}

		.lore {
			font-style: italic;
			opacity: .75;
		}

		:host([size="mini"]) .type,
		:host([size="mini"]) .text {
			display: none;
		}

		:host([size="mini"]) .title h3 {
			font-size: 11cqw;
		}

		.glare {
			position: absolute;
			inset: 0;
			pointer-events: none;
			border-radius: inherit;
			background:
				radial-gradient(circle at var(--mx, 30%) var(--my, 20%), rgba(255, 255, 255, .45), transparent 45%),
				linear-gradient(115deg, transparent 30%, rgba(255, 230, 160, .18) 45%, rgba(160, 220, 255, .18) 55%, transparent 70%);
			mix-blend-mode: overlay;
			opacity: var(--glare, .55);
			transition: opacity 200ms ease;
		}

		.dead .art img,
		.dead .inner {
			filter: grayscale(1) brightness(.7);
		}

		.claw {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
		}

		.claw path {
			fill: none;
			stroke: #8b0d0d;
			stroke-width: 5;
			stroke-linecap: round;
			opacity: .9;
		}

		.back {
			transform: rotateY(180deg);
			display: grid;
			place-items: center;
			background:
				radial-gradient(circle at 50% 42%, #f3e7c4 0 13%, transparent 13.5%),
				radial-gradient(circle at 56% 38%, #1a1840 0 12%, transparent 12.5%),
				repeating-conic-gradient(from 0deg, #241c4d 0 10deg, #1b1540 10deg 20deg),
				#1b1540;
			box-shadow: inset 0 0 0 4cqw #c79a3b, inset 0 0 0 5cqw #5c4415, 0 10px 30px -10px rgba(0, 0, 0, .8);
		}

		.back span {
			margin-top: 55%;
			font-family: var(--font-display);
			font-size: 11cqw;
			color: #e8c66a;
			text-shadow: 0 2px 0 #000;
		}

		.badge {
			position: absolute;
			top: -8px;
			right: -8px;
			z-index: 2;
		}
	`;

	@property({ attribute: 'role-id' })
	public accessor roleId: RoleId | null = null;

	@property({ reflect: true })
	public accessor size: 'mini' | 'normal' | 'large' = 'normal';

	@property({ reflect: true })
	public accessor face: 'front' | 'back' = 'front';

	@property({ type: Boolean })
	public accessor dead = false;

	/** Texte affiché au dos de la carte (nom du joueur, de la phase…). */
	@property()
	public accessor caption: string | null = null;

	/** Ouvre la carte en plein écran au clic (désactivé dans la vue plein écran elle-même). */
	@property({ type: Boolean, reflect: true })
	public accessor zoomable = true;

	private frame = 0;

	/**
	 * L'inclinaison suit le pointeur. Les mesures se font sur l'élément hôte, qui ne bouge pas :
	 * mesurer la carte inclinée elle-même la faisait clignoter.
	 */
	private readonly onMove = (event: PointerEvent): void => {
		if (this.size === 'mini' || event.pointerType !== 'mouse') {
			return;
		}
		const { clientX, clientY } = event;
		cancelAnimationFrame(this.frame);
		this.frame = requestAnimationFrame(() => {
			const rect = this.getBoundingClientRect();
			const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
			const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
			this.style.setProperty('--mx', `${x * 100}%`);
			this.style.setProperty('--my', `${y * 100}%`);
			this.style.setProperty('--ry', `${(x - 0.5) * 16}deg`);
			this.style.setProperty('--rx', `${(0.5 - y) * 16}deg`);
			this.style.setProperty('--glare', '0.9');
		});
	};

	private readonly onLeave = (): void => {
		cancelAnimationFrame(this.frame);
		for (const name of ['--mx', '--my', '--rx', '--ry', '--glare']) {
			this.style.removeProperty(name);
		}
	};

	private readonly onClick = (): void => {
		if (this.zoomable && this.roleId && this.face === 'front') {
			this.dispatchEvent(new CustomEvent<RoleId>('card-open', { detail: this.roleId, bubbles: true, composed: true }));
		}
	};

	public override connectedCallback(): void {
		super.connectedCallback();
		this.addEventListener('pointermove', this.onMove);
		this.addEventListener('pointerleave', this.onLeave);
		this.addEventListener('click', this.onClick);
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.removeEventListener('pointermove', this.onMove);
		this.removeEventListener('pointerleave', this.onLeave);
		this.removeEventListener('click', this.onClick);
	}

	private renderClaw(): TemplateResult {
		return html`<svg class="claw" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
			<path d="M20 30 Q45 70 70 120" />
			<path d="M32 22 Q57 62 82 112" />
			<path d="M44 16 Q66 52 90 98" />
		</svg>`;
	}

	protected override render(): TemplateResult {
		const role = this.roleId ? getRole(this.roleId) : null;
		return html`<div class="tilt"><div class="flip">
			${role
				? html`<div class="face front ${role.camp} ${this.dead ? 'dead' : ''}">
				<div class="inner">
					<div class="title">
						<h3>${role.name}</h3>
						<svg viewBox="0 0 24 24" aria-label=${TIMING_LABELS[role.timing]}>${timingIcon(role.timing)}</svg>
					</div>
					<div class="art"><img src=${roleImage(role.id)} alt=${role.name} loading="lazy" /></div>
					<div class="type"><span>${CAMP_LABELS[role.camp]}</span><span>${TIMING_LABELS[role.timing]}</span></div>
					<div class="text">
						<p>${role.power}</p>
						${this.size === 'large' ? html`<p class="lore">${role.lore}</p>` : nothing}
					</div>
				</div>
				${this.dead ? this.renderClaw() : nothing}
				<div class="glare"></div>
			</div>`
				: nothing}
			<div class="face back" aria-hidden=${this.face === 'front' ? 'true' : 'false'}><span>${this.caption ?? 'Thiercelieux'}</span></div>
			<slot name="badge" class="badge"></slot>
		</div></div>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'lg-card': LgCard;
	}
}

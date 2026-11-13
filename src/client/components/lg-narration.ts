import { css, html, LitElement, nothing } from 'lit';
import type { PropertyValues, TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { assignRole } from '../../shared/actions.js';
import { deckCount, holders, nextPhase, phaseLabel } from '../../shared/engine.js';
import { roleLabel } from '../../shared/roles.js';
import { currentStepIndex, PACK_ROLES, stepsFor } from '../../shared/steps.js';
import type { Step } from '../../shared/steps.js';
import type { GameState, RoleId } from '../../shared/types.js';
import { store } from '../store.js';
import { shared } from '../styles.js';
import type { LgConfirm } from './lg-confirm.js';
import type { LgStepWidget } from './lg-step-widget.js';
import './lg-card.js';
import './lg-confirm.js';
import './lg-player-picker.js';
import './lg-step-widget.js';

/** Écran de narration : une étape à la fois, la carte du rôle appelé au centre. */
@customElement('lg-narration')
export class LgNarration extends LitElement {
	public static override styles = [shared, css`
		:host {
			display: grid;
			gap: 18px;
			padding-bottom: 110px;
		}

		.progress {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.dots {
			flex: 1;
			display: flex;
			gap: 4px;
		}

		.dots span {
			flex: 1;
			height: 4px;
			border-radius: 2px;
			background: var(--surface-2);
		}

		.dots span.done {
			background: var(--gold);
		}

		.dots span.now {
			background: var(--gold-light);
			box-shadow: 0 0 8px var(--gold-glow);
		}

		.stage {
			display: grid;
			justify-items: center;
			gap: 12px;
			text-align: center;
		}

		.stage h2 {
			font-size: clamp(1.8rem, 7vw, 2.6rem);
			color: var(--gold-light);
			text-shadow: 0 2px 12px rgba(0, 0, 0, .6);
		}

		.who {
			font-weight: 700;
			color: var(--ink);
		}

		.condition {
			display: inline-block;
			padding: 4px 12px;
			border-radius: 999px;
			background: color-mix(in oklab, var(--solitaire) 35%, transparent);
			font-size: 0.85rem;
			font-weight: 700;
		}

		.fake {
			padding: 12px 16px;
			border-radius: 14px;
			border: 1px dashed var(--muted);
			color: var(--muted);
			font-weight: 700;
		}

		.say {
			display: grid;
			gap: 8px;
			margin: 0;
			padding: 18px 18px 18px 22px;
			border-radius: 18px;
			background: linear-gradient(180deg, rgba(243, 231, 196, .1), rgba(243, 231, 196, .04));
			border-left: 3px solid var(--gold);
			font-family: var(--font-display);
			font-size: clamp(1.25rem, 5vw, 1.55rem);
			line-height: 1.3;
		}

		.say p {
			margin: 0;
		}

		.gestures {
			display: grid;
			gap: 8px;
			padding: 16px 18px;
			border-radius: 18px;
			background: color-mix(in oklab, var(--solitaire) 18%, var(--surface));
			border-left: 3px solid var(--solitaire-light);
		}

		.gestures ol {
			display: grid;
			gap: 6px;
			margin: 0;
			padding-left: 1.3em;
			font-size: 1.1rem;
			font-weight: 600;
		}

		.todo {
			margin: 0;
			color: var(--muted);
		}

		.assign {
			display: grid;
			gap: 8px;
		}

		nav {
			position: fixed;
			left: 0;
			right: 0;
			bottom: calc(64px + env(safe-area-inset-bottom, 0px));
			z-index: 5;
			display: flex;
			justify-content: center;
			gap: 10px;
			padding: 12px max(16px, env(safe-area-inset-right, 0px)) 12px max(16px, env(safe-area-inset-left, 0px));
			background: linear-gradient(180deg, transparent, rgba(8, 9, 22, .94) 45%);
		}

		nav .btn.primary {
			flex: 1;
			max-width: 380px;
		}
	`];

	@property({ attribute: false })
	public accessor game: GameState | null = null;

	@state()
	private accessor face: 'front' | 'back' = 'front';

	@query('lg-step-widget')
	private accessor widget: LgStepWidget | null = null;

	@query('lg-confirm')
	private accessor confirm: LgConfirm | null = null;

	private shownKey = '';

	/** Passe à la suite, après confirmation si l'action de l'étape n'a pas été validée. */
	private async next(): Promise<void> {
		const pending = this.widget?.pendingAction();
		if (pending && this.confirm && !await this.confirm.ask({ ...pending, confirmLabel: 'Continuer' })) {
			return;
		}
		store.next();
	}

	protected override updated(changed: PropertyValues<this>): void {
		if (!changed.has('game') || !this.game) {
			return;
		}
		const steps = stepsFor(this.game);
		const step = steps[currentStepIndex(this.game, steps)];
		const key = `${this.game.phase.kind}${this.game.phase.turn}:${step?.id ?? ''}`;
		if (key !== this.shownKey) {
			this.shownKey = key;
			this.face = 'back';
			window.scrollTo({ top: 0, behavior: 'smooth' });
			setTimeout(() => {
				this.face = 'front';
			}, 120);
		}
	}

	private cardRole(step: Step): RoleId | null {
		if (step.roles === PACK_ROLES) {
			return 'loup-garou';
		}
		return step.roles[0] ?? null;
	}

	private renderAssign(game: GameState, step: Step): TemplateResult | typeof nothing {
		if (step.fake || step.widget === 'hunter') {
			return nothing;
		}
		const missing = step.roles.filter(roleId => holders(game, roleId).length < deckCount(game, roleId));
		if (missing.length === 0) {
			return nothing;
		}
		const free = game.players.filter(player => player.alive && player.roleId === null);
		return html`${missing.map(roleId => html`<div class="assign">
			<span class="label">Qui est ${roleLabel(roleId)} ?</span>
			<lg-player-picker .players=${free} @pick=${(event: CustomEvent<string>): void => {
				store.updateGame((next) => {
					assignRole(next, event.detail, roleId);
				});
			}}></lg-player-picker>
		</div>`)}`;
	}

	/** Noms des joueurs qui tiennent les rôles de l'étape, ou le nom du rôle s'ils sont inconnus. */
	private wakers(game: GameState, step: Step): string {
		const roles = step.roles === PACK_ROLES ? [] : step.roles;
		const names = roles.flatMap(roleId => holders(game, roleId).filter(player => player.alive || step.widget === 'hunter')).map(player => player.name);
		if (names.length > 0) {
			return names.join(' et ');
		}
		return roles.map(roleId => roleLabel(roleId)).join(' et ');
	}

	/** Gestes silencieux : toucher l'épaule pour réveiller, puis pour rendormir. */
	private renderGestures(game: GameState, step: Step): TemplateResult | typeof nothing {
		if (!step.gestures) {
			return nothing;
		}
		const who = this.wakers(game, step);
		const wakes = step.roles.length > 0 && step.roles !== PACK_ROLES;
		const lines = wakes
			? [`Réveil : touchez l'épaule de ${who}.`, ...step.gestures, 'Fin : touchez de nouveau son épaule.']
			: step.gestures;
		return html`<div class="gestures">
			<span class="label">🤫 En silence</span>
			<ol>${lines.map(line => html`<li>${line}</li>`)}</ol>
		</div>`;
	}

	protected override render(): TemplateResult | typeof nothing {
		const game = this.game;
		if (!game) {
			return nothing;
		}
		const steps = stepsFor(game);
		const index = currentStepIndex(game, steps);
		const step = steps[index];
		if (!step) {
			return nothing;
		}
		const roleId = this.cardRole(step);
		const isLast = index === steps.length - 1;
		const wakers = this.wakers(game, step);
		return html`
			<div class="progress" aria-label=${`Étape ${index + 1} sur ${steps.length}`}>
				<span class="label">${phaseLabel(game.phase)} · ${index + 1}/${steps.length}</span>
				<div class="dots">${steps.map((_, dot) => html`<span class=${dot < index ? 'done' : dot === index ? 'now' : ''}></span>`)}</div>
			</div>
			<div class="stage">
				<lg-card size="large" .roleId=${roleId} .face=${roleId ? this.face : 'back'} .caption=${roleId ? null : phaseLabel(game.phase)} ?dead=${step.fake !== null}></lg-card>
				<h2>${step.title}</h2>
				${wakers && !step.gestures ? html`<span class="who">${wakers}</span>` : nothing}
				${step.condition ? html`<span class="condition">Condition : ${step.condition}</span>` : nothing}
				${step.fake ? html`<div class="fake">${step.fake}</div>` : nothing}
			</div>
			${step.say.length > 0 ? html`<blockquote class="say"><span class="label">🗣 À voix haute</span>${step.say.map(line => html`<p>« ${line} »</p>`)}</blockquote>` : nothing}
			${this.renderGestures(game, step)}
			${step.todo ? html`<p class="todo">👉 ${step.todo}</p>` : nothing}
			${this.renderAssign(game, step)}
			<lg-step-widget .game=${game} .step=${step}></lg-step-widget>
			<nav>
				<button class="btn" aria-label="Étape précédente" ?disabled=${index === 0} @click=${(): void => {
					store.previous();
				}}>◀</button>
				<button class="btn primary" @click=${(): void => {
					void this.next();
				}}>${isLast ? `Passer : ${phaseLabel(nextPhase(game.phase))}` : 'Étape suivante ▶'}</button>
			</nav>
			<lg-confirm></lg-confirm>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'lg-narration': LgNarration;
	}
}

import { css, html, LitElement } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { shared } from '../styles.js';

export interface ConfirmOptions {
	readonly title: string;
	readonly message: string;
	readonly confirmLabel?: string;
	readonly cancelLabel?: string;
}

/** Boîte de confirmation modale, réutilisable : `await confirm.ask({...})` rend true pour continuer. */
@customElement('lg-confirm')
export class LgConfirm extends LitElement {
	public static override styles = [shared, css`
		dialog {
			width: min(420px, calc(100vw - 32px));
			margin: auto;
			padding: 0;
			border: none;
			background: transparent;
			color: var(--ink);
			overflow: visible;
		}

		dialog::backdrop {
			background: radial-gradient(circle at 50% 40%, rgba(8, 9, 22, .6), rgba(8, 9, 22, .92));
			backdrop-filter: blur(3px);
		}

		dialog[open] .box {
			animation: pop 220ms cubic-bezier(.2, 1.4, .4, 1);
		}

		dialog[open]::backdrop {
			animation: fade 200ms ease;
		}

		.box {
			position: relative;
			display: grid;
			gap: 14px;
			justify-items: center;
			padding: 34px 22px 22px;
			border-radius: 22px;
			text-align: center;
			background: linear-gradient(180deg, var(--surface-2), var(--surface));
			border: 2px solid var(--gold);
			box-shadow: 0 0 0 4px rgba(8, 9, 22, .9), 0 0 0 5px color-mix(in oklab, var(--gold) 45%, transparent), 0 18px 60px -10px var(--gold-glow);
		}

		.seal {
			position: absolute;
			top: -30px;
			display: grid;
			place-items: center;
			width: 56px;
			height: 56px;
			border-radius: 50%;
			font-size: 1.7rem;
			background: radial-gradient(circle at 35% 30%, var(--gold-light), var(--gold) 70%);
			border: 3px solid rgba(8, 9, 22, .9);
			box-shadow: 0 4px 18px -2px var(--gold-glow);
		}

		h2 {
			font-size: clamp(1.6rem, 6.5vw, 2rem);
			color: var(--gold-light);
			text-shadow: 0 2px 12px rgba(0, 0, 0, .6);
		}

		p {
			margin: 0;
			font-size: 1.08rem;
			line-height: 1.4;
		}

		.actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 10px;
			width: 100%;
			margin-top: 6px;
		}

		.actions .btn {
			min-height: 52px;
			padding: 0 0.8em;
		}

		@keyframes pop {
			from {
				opacity: 0;
				transform: scale(.85) translateY(12px);
			}
		}

		@keyframes fade {
			from {
				opacity: 0;
			}
		}
	`];

	@state()
	private accessor options: ConfirmOptions = { title: '', message: '' };

	@query('dialog')
	private accessor dialog!: HTMLDialogElement;

	private resolve: ((ok: boolean) => void) | null = null;

	/** Ouvre la boîte et attend la réponse du MJ. */
	public async ask(options: ConfirmOptions): Promise<boolean> {
		this.resolve?.(false);
		this.options = options;
		await this.updateComplete;
		this.dialog.showModal();
		this.dialog.querySelector<HTMLButtonElement>('.cancel')?.focus();
		return new Promise((resolve) => {
			this.resolve = resolve;
		});
	}

	private close(ok: boolean): void {
		const resolve = this.resolve;
		this.resolve = null;
		if (this.dialog.open) {
			this.dialog.close();
		}
		resolve?.(ok);
	}

	protected override render(): TemplateResult {
		const { title, message, confirmLabel, cancelLabel } = this.options;
		return html`<dialog aria-labelledby="title" @cancel=${(event: Event): void => {
			event.preventDefault();
			this.close(false);
		}} @click=${(event: Event): void => {
			// Toucher le fond sombre revient à annuler.
			if (event.target === this.dialog) {
				this.close(false);
			}
		}}>
			<div class="box">
				<span class="seal" aria-hidden="true">⚠</span>
				<h2 id="title">${title}</h2>
				<p>${message}</p>
				<div class="actions">
					<button class="btn cancel" @click=${(): void => {
						this.close(false);
					}}>${cancelLabel ?? 'Revenir'}</button>
					<button class="btn primary" @click=${(): void => {
						this.close(true);
					}}>${confirmLabel ?? 'Continuer'}</button>
				</div>
			</div>
		</dialog>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'lg-confirm': LgConfirm;
	}
}

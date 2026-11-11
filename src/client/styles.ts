import { css } from 'lit';

/** Styles partagés par les composants : boutons, puces, titres. */
export const shared = css`
	:host {
		box-sizing: border-box;
	}

	*, *::before, *::after {
		box-sizing: inherit;
	}

	h1, h2, h3 {
		font-family: var(--font-display);
		font-weight: 400;
		letter-spacing: 0.02em;
		margin: 0;
		text-wrap: balance;
	}

	button {
		font: inherit;
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	button:focus-visible, input:focus-visible, select:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5em;
		min-height: 48px;
		padding: 0 1.25em;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--surface-2);
		font-weight: 700;
		transition: transform 120ms ease, background 120ms ease;
	}

	.btn:active {
		transform: scale(0.97);
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn.primary {
		border: none;
		color: var(--ink-on-gold);
		background: linear-gradient(180deg, var(--gold-light), var(--gold));
		box-shadow: 0 4px 18px -4px var(--gold-glow);
	}

	.btn.danger {
		border-color: color-mix(in oklab, var(--loups) 60%, transparent);
		color: var(--loups-light);
	}

	.btn.small {
		min-height: 36px;
		padding: 0 0.9em;
		font-size: 0.875rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--surface-2);
		font-weight: 600;
		font-size: 0.95rem;
	}

	.chip[aria-pressed="true"] {
		border-color: var(--gold);
		background: color-mix(in oklab, var(--gold) 22%, var(--surface-2));
		color: var(--gold-light);
	}

	.chip.dead {
		opacity: 0.45;
		text-decoration: line-through;
	}

	.label {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.panel {
		border-radius: 18px;
		background: var(--surface);
		border: 1px solid var(--line);
		padding: 16px;
	}

	.answer {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-radius: 14px;
		font-size: 1.15rem;
		font-weight: 800;
		background: var(--surface-2);
	}

	.answer.yes {
		background: color-mix(in oklab, var(--loups) 30%, var(--surface-2));
	}

	.answer.no {
		background: color-mix(in oklab, var(--village) 30%, var(--surface-2));
	}

	.muted {
		color: var(--muted);
	}

	@media (prefers-reduced-motion: reduce) {
		*, *::before, *::after {
			transition: none !important;
			animation: none !important;
		}
	}
`;

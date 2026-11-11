import { css, html, LitElement, nothing } from 'lit';
import type { PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
	attack, hunterShot, hypnotize, knightStrike, louveteauSearch, paralyse, poison, protect, RuleError,
	searchLouveteau, setChamanAwake, setLovers, setMayor, setMentor, setSectGroup, sleep, heal, vote, holderOf,
} from '../../shared/actions.js';
import {
	alignment, alivePlayers, bearGrowls, deathsDuring, detectVictory, findPlayer, isPackWolf, knightVictim,
	lastDead, loverOf, potionsOf, previousNight, VICTORY_LABELS, wolfCount,
} from '../../shared/engine.js';
import { getRole, roleLabel } from '../../shared/roles.js';
import { wokeUpTonight } from '../../shared/steps.js';
import type { Step } from '../../shared/steps.js';
import type { GameState, Player, RoleId } from '../../shared/types.js';
import { store } from '../store.js';
import { shared } from '../styles.js';
import './lg-card.js';
import './lg-player-picker.js';

type Answer = { tone: 'yes' | 'no' | 'info'; text: string } | null;

/** Outils interactifs d'une étape : désigner un joueur, voir la réponse, utiliser une potion… */
@customElement('lg-step-widget')
export class LgStepWidget extends LitElement {
	public static override styles = [shared, css`
		:host {
			display: grid;
			gap: 14px;
		}

		.row {
			display: flex;
			flex-wrap: wrap;
			gap: 10px;
			align-items: center;
		}

		.big {
			font-family: var(--font-display);
			font-size: 4rem;
			line-height: 1;
			color: var(--gold-light);
		}

		.error {
			color: var(--loups-light);
			font-weight: 700;
		}

		.victims {
			display: flex;
			flex-wrap: wrap;
			gap: 12px;
		}

		.victim {
			display: grid;
			gap: 6px;
			justify-items: center;
			text-align: center;
			font-size: 0.85rem;
		}

		.sect {
			display: grid;
			gap: 8px;
		}

		.sect-row {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.sect-row span {
			flex: 1;
			min-width: 0;
		}

		label.toggle {
			display: flex;
			align-items: center;
			gap: 10px;
			min-height: 44px;
			font-weight: 600;
		}

		label.toggle input {
			width: 22px;
			height: 22px;
			accent-color: var(--gold);
		}

		ul {
			margin: 0;
			padding-left: 1.2em;
		}
	`];

	@property({ attribute: false })
	public accessor step: Step | null = null;

	@property({ attribute: false })
	public accessor game: GameState | null = null;

	@state()
	private accessor picked: (string | null)[] = [];

	@state()
	private accessor answer: Answer = null;

	@state()
	private accessor error: string | null = null;

	@state()
	private accessor infect = false;

	private stepKey = '';

	protected override willUpdate(changed: PropertyValues<this>): void {
		if (changed.has('step') || changed.has('game')) {
			const key = this.game && this.step ? `${this.game.phase.kind}${this.game.phase.turn}:${this.step.id}` : '';
			if (key !== this.stepKey) {
				this.stepKey = key;
				this.picked = [];
				this.answer = null;
				this.error = null;
				this.infect = false;
			}
		}
	}

	/** Applique une action de jeu et affiche l'erreur de règle éventuelle. */
	private act(change: (game: GameState) => Answer | undefined): void {
		this.error = null;
		try {
			store.updateGame((game) => {
				const result = change(game);
				if (result !== undefined) {
					this.answer = result;
				}
			});
		} catch (error) {
			if (error instanceof RuleError) {
				this.error = error.message;
			} else {
				throw error;
			}
		}
	}

	private name(id: string | null | undefined): string {
		return (this.game && findPlayer(this.game, id)?.name) ?? '?';
	}

	private picker(onPick: (id: string) => void, options: { selected?: (string | null)[]; disabled?: string[]; includeDead?: boolean; players?: Player[] } = {}): TemplateResult {
		return html`<lg-player-picker
			.players=${options.players ?? this.game?.players ?? []}
			.selected=${options.selected ?? this.picked}
			.disabledIds=${options.disabled ?? []}
			?include-dead=${options.includeDead ?? false}
			@pick=${(event: CustomEvent<string>): void => {
				onPick(event.detail);
			}}
		></lg-player-picker>`;
	}

	private renderAnswer(): TemplateResult | typeof nothing {
		if (!this.answer) {
			return nothing;
		}
		const tone = this.answer.tone === 'info' ? '' : this.answer.tone;
		return html`<div class="answer ${tone}" role="status">${this.answer.text}</div>`;
	}

	private stepRole(): RoleId | undefined {
		return this.step?.roles[0];
	}

	protected override render(): TemplateResult | typeof nothing {
		const game = this.game;
		const step = this.step;
		if (!game || !step || step.widget === 'none') {
			return nothing;
		}
		if (step.fake) {
			return nothing;
		}
		return html`${this.renderWidget(game, step)}
			${this.renderAnswer()}
			${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}`;
	}

	private renderWidget(game: GameState, step: Step): TemplateResult | typeof nothing {
		switch (step.widget) {
			case 'none':
				return nothing;
			case 'deaths':
				return this.renderDeaths(game);
			case 'role-reveal':
				return this.renderRoleReveal(game);
			case 'alignment':
				return html`<span class="label">Joueur désigné</span>${this.picker((id) => {
					this.picked = [id];
					const target = findPlayer(game, id);
					const side = target ? alignment(game, target) : null;
					this.answer = side === null
						? { tone: 'info', text: 'Rôle non renseigné : répondez selon sa carte.' }
						: { tone: side === 'bon' ? 'no' : 'yes', text: side === 'bon' ? '👍 Bon' : '👎 Mauvais' };
				})}`;
			case 'wolf-count':
				return html`<div class="row"><span class="big">${wolfCount(game)}</span><span class="muted">loup(s) en vie dans le village${game.players.some(player => player.roleId === null) ? ' (d\'après les rôles renseignés)' : ''}.</span></div>`;
			case 'bear':
				return this.renderBear(game);
			case 'mentor':
				return html`<span class="label">Mentor choisi</span>${this.picker((id) => {
					this.act((next) => {
						setMentor(next, id);
						return undefined;
					});
				}, { selected: [game.flags.mentorId], disabled: holderOf(game, 'enfant-sauvage') ? [holderOf(game, 'enfant-sauvage')!.id] : [] })}`;
			case 'lovers':
				return this.renderLovers(game, step);
			case 'pack':
				return this.renderPack(game);
			case 'louveteau':
				return html`<span class="label">Le louveteau désigne</span>${this.picker((id) => {
					this.picked = [id];
					this.act(next => louveteauSearch(next, id)
						? { tone: 'yes', text: 'Oui, c\'est un loup : il a retrouvé sa meute et devient loup-garou.' }
						: { tone: 'no', text: 'Non, ce n\'est pas un loup.' });
				})}`;
			case 'louve':
			case 'sainte-mere':
				return this.renderSearch(step.widget);
			case 'protect':
				return html`<span class="label">Personne protégée</span>${this.picker((id) => {
					this.picked = [id];
					this.act((next) => {
						protect(next, id);
						return { tone: 'info', text: `${this.name(id)} est protégé jusqu'au matin.` };
					});
				}, { selected: [game.flags.protectedId], disabled: [game.flags.lastTarget.salvateur ?? ''] })}`;
			case 'paralyse':
				return html`<span class="label">Joueur paralysé</span>${this.picker((id) => {
					this.act((next) => {
						paralyse(next, id);
						return { tone: 'info', text: `${this.name(id)} est paralysé : il ne pourra pas agir cette nuit.` };
					});
				}, { selected: [game.flags.paralysedId], disabled: [game.flags.lastTarget.sinistros ?? ''] })}`;
			case 'attack':
				return this.renderAttack(game);
			case 'second-attack':
				return html`<span class="label">Seconde victime</span>${this.picker((id) => {
					this.picked = [id];
					this.act((next) => {
						const result = attack(next, id, { second: true });
						return { tone: 'info', text: result === 'protege' ? `${this.name(id)} était protégé : il survit.` : `${this.name(id)} est dévoré.` };
					});
				})}`;
			case 'potions':
				return this.renderPotions(game, step);
			case 'hunter':
				return html`<span class="label">Le chasseur emporte</span>${this.picker((id) => {
					this.picked = [id];
					this.act((next) => {
						hunterShot(next, this.stepRole() === 'bon-chasseur' ? 'bon-chasseur' : 'mauvais-chasseur', id);
						return { tone: 'info', text: `${this.name(id)} est abattu.` };
					});
				})}`;
			case 'knight':
				return this.renderKnight(game);
			case 'hypnosis':
				return this.renderHypnosis(game);
			case 'sniff':
				return html`<span class="label">La fouineuse désigne</span>${this.picker((id) => {
					this.picked = [id];
					const woke = wokeUpTonight(game, id);
					this.answer = { tone: woke ? 'yes' : 'no', text: woke ? 'Oui, il s\'est réveillé cette nuit.' : 'Non, il a dormi toute la nuit.' };
				}, { includeDead: false })}`;
			case 'chaman':
				return this.renderChaman(game);
			case 'vote':
				return this.renderVote(game);
			case 'sect':
				return this.renderSect(game);
			case 'mayor':
				return html`<span class="label">Maire élu</span>${this.picker((id) => {
					this.act((next) => {
						setMayor(next, id);
						return undefined;
					});
				}, { selected: [game.flags.mayorId] })}`;
			case 'victory':
				return this.renderVictory(game);
		}
	}

	private renderDeaths(game: GameState): TemplateResult {
		const night = previousNight(game.phase);
		const dead = night ? deathsDuring(game, night) : [];
		const asleep = game.flags.asleepIds.map(id => this.name(id));
		return html`
			${dead.length === 0
				? html`<div class="answer no">Personne n'est mort cette nuit.</div>`
				: html`<div class="victims">${dead.map(player => html`<div class="victim">
					<lg-card size="mini" .roleId=${player.roleId} face="back" .caption=${player.name}></lg-card>
					<strong>${player.name}</strong>
				</div>`)}</div>`}
			${asleep.length > 0 ? html`<div class="answer">💤 ${asleep.join(', ')} ne parle pas et ne vote pas aujourd'hui.</div>` : nothing}
			${game.flags.noVoteTurn === game.phase.turn ? html`<div class="answer yes">Patient zéro : personne ne votera aujourd'hui.</div>` : nothing}`;
	}

	private renderRoleReveal(game: GameState): TemplateResult {
		const target = findPlayer(game, this.picked[0]);
		return html`<span class="label">Joueur désigné</span>
			${this.picker((id) => {
				this.picked = [id];
			})}
			${target
				? html`<div class="row">
				${target.roleId
					? html`<lg-card .roleId=${target.roleId} .caption=${target.name}></lg-card>
						<div>${getRole(target.roleId).name}${target.infected ? html`<br /><strong>Infecté : joue avec les loups.</strong>` : nothing}</div>`
					: html`<span class="muted">Rôle non renseigné : montrez sa carte.</span>`}
			</div>`
				: nothing}`;
	}

	private renderBear(game: GameState): TemplateResult {
		const growls = bearGrowls(game);
		if (growls === null) {
			return html`<p class="muted">Montreur d'ours non renseigné ou mort : regardez ses voisins vous-même, ou faites semblant.</p>`;
		}
		return html`<div class="answer ${growls ? 'yes' : 'no'}">${growls ? '🐻 GRRRR ! L\'ours grogne : un voisin est un loup.' : 'L\'ours reste calme.'}</div>
			<p class="muted">Calculé sur les voisins vivants, dans l'ordre de la table.</p>`;
	}

	private renderLovers(game: GameState, step: Step): TemplateResult {
		const lover = holderOf(game, step.roles[0] ?? 'amoureux');
		if (!lover) {
			return html`<p class="muted">Indiquez d'abord qui est ${roleLabel(step.roles[0] ?? 'amoureux')} ci-dessus.</p>`;
		}
		const partner = loverOf(game, lover.id);
		return html`<span class="label">Âme-sœur de ${lover.name}</span>${this.picker((id) => {
			this.act((next) => {
				setLovers(next, lover.id, id);
				return undefined;
			});
		}, { selected: [partner?.id ?? null], disabled: [lover.id] })}
			${partner ? html`<div class="answer">💞 ${lover.name} et ${partner.name}</div>` : nothing}`;
	}

	private renderPack(game: GameState): TemplateResult {
		const pack = alivePlayers(game).filter(player => isPackWolf(game, player));
		return pack.length > 0
			? html`<div class="answer yes">🐺 Meute : ${pack.map(player => player.name).join(', ')}</div>`
			: html`<p class="muted">Indiquez qui se réveille ci-dessus pour garder la trace de la meute.</p>`;
	}

	private renderSearch(seeker: 'louve' | 'sainte-mere'): TemplateResult {
		return html`<span class="label">${seeker === 'louve' ? 'La louve' : 'La sainte mère'} désigne</span>${this.picker((id) => {
			this.picked = [id];
			this.act(next => searchLouveteau(next, seeker, id)
				? { tone: 'yes', text: 'Oui, c\'est le louveteau !' }
				: { tone: 'no', text: 'Non, ce n\'est pas le louveteau.' });
		})}`;
	}

	private renderAttack(game: GameState): TemplateResult {
		if (game.flags.noAttackTurn === game.phase.turn) {
			return html`<div class="answer yes">Patient zéro : les loups sont malades, pas d'attaque cette nuit. Faites semblant de les appeler.</div>`;
		}
		const pack = alivePlayers(game).filter(player => isPackWolf(game, player));
		const infecter = holderOf(game, 'infect-pere');
		const canInfect = (game.deck['infect-pere'] ?? 0) > 0 && !game.flags.infectionUsed && infecter?.alive !== false;
		const target = this.picked[0] ?? null;
		return html`
			${pack.length > 0 ? html`<p class="muted">Se réveillent : ${pack.map(player => player.name).join(', ')}.</p>` : nothing}
			<span class="label">Victime des loups</span>
			${this.picker((id) => {
				this.picked = [id];
				this.answer = null;
			})}
			${canInfect
				? html`<label class="toggle"><input id="infect" type="checkbox" .checked=${this.infect} @change=${(event: Event): void => {
					this.infect = (event.target as HTMLInputElement).checked;
				}} />L'Infect Père infecte la victime (une fois par partie)</label>`
				: nothing}
			<div class="row">
				<button class="btn primary" ?disabled=${target === null || this.answer !== null} @click=${(): void => {
					if (!target) {
						return;
					}
					this.act((next) => {
						const result = attack(next, target, { infect: this.infect });
						switch (result) {
							case 'protege':
								return { tone: 'no', text: `${this.name(target)} était protégé par le salvateur : il survit.` };
							case 'infecte':
								return { tone: 'yes', text: `Touchez l'épaule de ${this.name(target)} : il est infecté et devient loup-garou.` };
							case 'interdit':
								return { tone: 'info', text: 'Pas d\'attaque cette nuit.' };
							case 'mort':
								return { tone: 'yes', text: `${this.name(target)} est dévoré.` };
						}
					});
				}}>Valider l'attaque</button>
			</div>`;
	}

	private renderPotions(game: GameState, step: Step): TemplateResult {
		const roleId = this.stepRole() ?? 'sorciere';
		const left = potionsOf(game, roleId);
		const victims = deathsDuring(game, game.phase);
		return html`
			<span class="label">Victimes de la nuit</span>
			${victims.length === 0
				? html`<p class="muted">Aucune victime pour l'instant.</p>`
				: html`<div class="chips">
				${victims.map(player => html`<span class="chip dead">${player.name}</span>
					${left.guerison && (player.death?.cause === 'loups' || player.death?.cause === 'grand-mechant-loup')
						? html`<button class="btn small primary" @click=${(): void => {
							this.act((next) => {
								heal(next, roleId, player.id);
								return { tone: 'no', text: `${player.name} est sauvé par la potion de guérison.` };
							});
						}}>Sauver ${player.name}</button>`
						: nothing}`)}
			</div>`}
			<p class="muted">Potions restantes : ${[left.guerison ? 'guérison' : '', left.mort ? 'mort' : '', left.sommeil ? 'sommeil' : ''].filter(Boolean).join(', ') || 'aucune'}.</p>
			${left.mort
				? html`<span class="label">Potion de mort sur</span>${this.picker((id) => {
					this.act((next) => {
						poison(next, roleId, id);
						return { tone: 'yes', text: `${this.name(id)} est empoisonné.` };
					});
				}, { selected: [] })}`
				: nothing}
			${left.sommeil
				? html`<span class="label">Potion de sommeil sur</span>${this.picker((id) => {
					this.act((next) => {
						sleep(next, roleId, id);
						return { tone: 'info', text: `${this.name(id)} dormira toute la journée : il ne parlera ni ne votera.` };
					});
				}, { selected: [] })}`
				: nothing}
			${step.id === 'n-sorciere' && !left.guerison && !left.mort ? html`<p class="muted">Plus de potion : faites semblant de la réveiller.</p>` : nothing}`;
	}

	private renderKnight(game: GameState): TemplateResult {
		const wolf = knightVictim(game);
		if (!wolf) {
			return html`<p class="muted">Rôles non renseignés : trouvez vous-même le premier loup vivant à gauche du chevalier.</p>`;
		}
		return html`<div class="answer yes">⚔ ${wolf.name} meurt du tétanos.</div>
			<div class="row"><button class="btn primary" ?disabled=${!wolf.alive} @click=${(): void => {
				this.act((next) => {
					knightStrike(next, wolf.id);
					return undefined;
				});
			}}>Éliminer ${wolf.name}</button></div>`;
	}

	private renderHypnosis(game: GameState): TemplateResult {
		const [voter, target] = this.picked;
		return html`<span class="label">Joueur hypnotisé</span>
			${this.picker((id) => {
				this.picked = [id, target ?? null];
			}, { selected: [voter ?? game.flags.hypnosis?.voterId ?? null] })}
			<span class="label">Devra voter contre</span>
			${this.picker((id) => {
				this.picked = [voter ?? null, id];
				if (voter) {
					this.act((next) => {
						hypnotize(next, voter, id);
						return { tone: 'info', text: `${this.name(voter)} devra voter contre ${this.name(id)}.` };
					});
				}
			}, { selected: [target ?? game.flags.hypnosis?.targetId ?? null], disabled: voter ? [voter] : [] })}`;
	}

	private renderChaman(game: GameState): TemplateResult {
		const dead = lastDead(game);
		return html`<label class="toggle"><input id="chaman" type="checkbox" .checked=${game.flags.chamanAwake} @change=${(event: Event): void => {
			const awake = (event.target as HTMLInputElement).checked;
			this.act((next) => {
				setChamanAwake(next, awake);
				return undefined;
			});
		}} />Réveiller le chaman cette nuit</label>
			<p class="muted">${dead ? html`Dernier mort : <strong>${dead.name}</strong>.` : 'Personne n\'est encore mort : laissez-le dormir.'}</p>`;
	}

	private renderVote(game: GameState): TemplateResult {
		if (game.flags.noVoteTurn === game.phase.turn) {
			return html`<div class="answer yes">Patient zéro : personne ne vote aujourd'hui.</div>`;
		}
		const silent = [
			...game.flags.asleepIds.map(id => `${this.name(id)} (endormi)`),
			...game.players.filter(player => player.alive && player.cannotVote).map(player => `${player.name} (idiot)`),
		];
		const hypnosis = game.flags.hypnosis;
		const scapegoat = holderOf(game, 'bouc-emissaire');
		return html`
			${silent.length > 0 ? html`<p class="muted">Ne votent pas : ${silent.join(', ')}.</p>` : nothing}
			${hypnosis ? html`<p class="muted">Rappel secret : ${this.name(hypnosis.voterId)} doit voter contre ${this.name(hypnosis.targetId)}.</p>` : nothing}
			${game.flags.mayorId ? html`<p class="muted">Le maire ${this.name(game.flags.mayorId)} a une voix double.</p>` : nothing}
			<span class="label">Le village désigne</span>
			${this.picker((id) => {
				if (this.answer) {
					return;
				}
				this.picked = [id];
				this.act((next) => {
					const result = vote(next, id);
					return result === 'idiot'
						? { tone: 'no', text: `${this.name(id)} est l'idiot du village : il survit mais ne votera plus.` }
						: { tone: 'yes', text: `${this.name(id)} est éliminé. Sa carte reste cachée.` };
				});
			})}
			<div class="row">
				${scapegoat?.alive
					? html`<button class="btn small" ?disabled=${this.answer !== null} @click=${(): void => {
						this.act((next) => {
							vote(next, 'egalite');
							return { tone: 'yes', text: `Égalité : ${scapegoat.name}, le bouc émissaire, est éliminé. Il choisit qui pourra voter demain.` };
						});
					}}>Égalité</button>`
					: nothing}
				<button class="btn small" ?disabled=${this.answer !== null} @click=${(): void => {
					this.act((next) => {
						vote(next, null);
						return { tone: 'info', text: 'Personne n\'est éliminé.' };
					});
				}}>Personne</button>
			</div>`;
	}

	private renderSect(game: GameState): TemplateResult {
		return html`<div class="sect">${game.players.map(player => html`<div class="sect-row">
			<span>${player.name}</span>
			${(['A', 'B'] as const).map(group => html`<button class="chip" aria-pressed=${player.sectGroup === group ? 'true' : 'false'} @click=${(): void => {
				this.act((next) => {
					setSectGroup(next, player.id, player.sectGroup === group ? null : group);
					return undefined;
				});
			}}>Groupe ${group}</button>`)}
		</div>`)}</div>`;
	}

	private renderVictory(game: GameState): TemplateResult {
		const wins = detectVictory(game);
		if (game.players.some(player => player.alive && player.roleId === null)) {
			return html`<p class="muted">Tous les rôles ne sont pas renseignés : vérifiez vous-même. Village : plus de loup ni de solitaire. Loups : plus que la meute. Loup blanc : seul survivant. Couple : seuls les deux amoureux. Sectaire : l'autre groupe éliminé.</p>`;
		}
		return wins.length > 0
			? html`${wins.map(win => html`<div class="answer yes">🏆 ${VICTORY_LABELS[win]}</div>`)}`
			: html`<div class="answer no">Aucune victoire : la partie continue.</div>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'lg-step-widget': LgStepWidget;
	}
}

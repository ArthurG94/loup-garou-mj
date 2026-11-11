/**
 * Inclinaison des grandes cartes au gyroscope, sur téléphone.
 *
 * Les angles sont publiés en variables CSS sur la racine du document (--device-rx, --device-ry,
 * --device-mx, --device-my) : les cartes en héritent, sans écouteur par carte.
 * La position de référence suit lentement la façon dont le téléphone est tenu,
 * pour que la carte revienne à plat quand on ne bouge plus.
 */

type PermissionResult = 'granted' | 'denied' | 'prompt';

interface OrientationEventWithPermission {
	requestPermission?: () => Promise<PermissionResult>;
}

/** Inclinaison maximale de la carte, en degrés. */
const MAX_TILT = 9;
/** Angle du téléphone (en degrés) qui donne l'inclinaison maximale. */
const RANGE = 20;
/** Vitesse à laquelle la position de référence rattrape le téléphone (par événement). */
const DRIFT = 0.02;

const root = document.documentElement;
let baseline: { beta: number; gamma: number } | null = null;
let frame = 0;

function clamp(value: number): number {
	return Math.min(Math.max(value, -1), 1);
}

/** Des mesures arrivent : l'effet fonctionne, le bouton d'autorisation devient inutile. */
let receiving = false;

/** Événement émis sur window quand l'état de l'effet change. */
export const GYRO_CHANGE = 'gyro-change';

function onOrientation(event: DeviceOrientationEvent): void {
	if (event.beta === null || event.gamma === null) {
		return;
	}
	if (!receiving) {
		receiving = true;
		window.dispatchEvent(new Event(GYRO_CHANGE));
	}
	const { beta, gamma } = event;
	baseline ??= { beta, gamma };
	baseline.beta += (beta - baseline.beta) * DRIFT;
	baseline.gamma += (gamma - baseline.gamma) * DRIFT;
	const x = clamp((gamma - baseline.gamma) / RANGE);
	const y = clamp((beta - baseline.beta) / RANGE);
	cancelAnimationFrame(frame);
	frame = requestAnimationFrame(() => {
		root.style.setProperty('--device-ry', `${x * MAX_TILT}deg`);
		root.style.setProperty('--device-rx', `${-y * MAX_TILT}deg`);
		root.style.setProperty('--device-mx', `${50 + x * 40}%`);
		root.style.setProperty('--device-my', `${50 + y * 40}%`);
	});
}

function permissionApi(): (() => Promise<PermissionResult>) | undefined {
	if (!('DeviceOrientationEvent' in window)) {
		return undefined;
	}
	return (DeviceOrientationEvent as unknown as OrientationEventWithPermission).requestPermission;
}

const supported = 'DeviceOrientationEvent' in window
	&& window.matchMedia('(pointer: coarse)').matches
	&& !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Aucune mesure ne vient et le navigateur sait demander l'autorisation (Safari sur iPhone) : il faut un bouton. */
export function gyroNeedsPermission(): boolean {
	return supported && !receiving && permissionApi() !== undefined;
}

/** À appeler depuis un geste de l'utilisateur (un clic sur un bouton). */
export async function enableGyro(): Promise<void> {
	try {
		await permissionApi()?.();
	} catch {
		// Refus ou appel hors d'un geste : le bouton reste proposé.
	}
}

/** Écoute le gyroscope dès le départ : Chrome sur Android l'envoie sans rien demander. */
export function initGyro(): void {
	if (supported) {
		window.addEventListener('deviceorientation', onOrientation);
	}
}

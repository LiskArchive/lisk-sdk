import * as BigNum from 'browserify-bignum';
import { StateStore } from './state_store';

export interface Reward {
	readonly publicKey: string;
	readonly amount: string;
	readonly fee: string;
}

export interface Milestones {
	readonly milestones: ReadonlyArray<string>;
	readonly offset: number;
	readonly distance: number;
	readonly totalAmount: string;
}

const calculateMilestone = (milestones: Milestones, height: number): number => {
	const location = Math.trunc(
		(height - milestones.offset) / milestones.distance,
	);
	const lastMile = milestones.milestones[milestones.milestones.length - 1];

	if (location > milestones.milestones.length - 1) {
		return milestones.milestones.lastIndexOf(lastMile);
	}

	return location;
};

export const calculateRewawrd = (
	milestones: Milestones,
	height: number,
): string => {
	if (height < milestones.offset) {
		return '0';
	}

	return milestones.milestones[calculateMilestone(milestones, height)];
};

export const calculateSupply = (
	milestones: Milestones,
	height: number,
): string => {
	return new BigNum().toString();
};

export const applyReward = async (
	store: StateStore,
	rewards: ReadonlyArray<Reward>,
): Promise<void> => {};

export const undoReward = async (
	store: StateStore,
	rewards: ReadonlyArray<Reward>,
): Promise<void> => {};

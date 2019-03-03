import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';
import { Account } from './account';
import { BUCKET_ADDRESS_ACCOUNT, BUCKET_BLOCK_HEIGHT_REWARDS } from './repo';
import { StateStore } from './state_store';

export interface Reward {
	readonly publicKey: string;
	readonly amount: string;
	readonly fee: string;
}

export interface RewardsOption {
	readonly milestones: ReadonlyArray<string>;
	readonly offset: number;
	readonly distance: number;
	readonly totalAmount: string;
}

const calculateMilestone = (
	milestones: RewardsOption,
	height: number,
): number => {
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
	milestones: RewardsOption,
	height: number,
): string => {
	if (height < milestones.offset) {
		return '0';
	}

	return milestones.milestones[calculateMilestone(milestones, height)];
};

interface CalcReward {
	readonly amount: number;
	readonly multiplier: string;
}

export const calculateSupply = (
	rewardsOption: RewardsOption,
	height: number,
): string => {
	if (height < rewardsOption.offset) {
		return rewardsOption.totalAmount;
	}
	const milestone = calculateMilestone(rewardsOption, height);
	const heightWithoutOffset = height - rewardsOption.offset;
	const { distance } = rewardsOption;
	const { rewards } = rewardsOption.milestones.slice(0, milestone + 1).reduce(
		(
			prev: { readonly height: number; readonly rewards: CalcReward[] },
			current: string,
			index: number,
		) => {
			if (prev.height < distance) {
				return {
					height: prev.height,
					rewards: [
						...prev.rewards,
						{
							amount: prev.height % distance,
							multiplier: current,
						},
					],
				};
			}

			return {
				height: prev.height - distance,
				rewards: [
					...prev.rewards,
					{
						amount:
							prev.height > 0 && index === rewardsOption.milestones.length - 1
								? distance + prev.height
								: distance,
						multiplier: current,
					},
				],
			};
		},
		{ height: heightWithoutOffset, rewards: [] },
	);

	const supply = rewards.reduce(
		(prev, current) => prev.add(current.amount).mul(current.multiplier),
		new BigNum(0),
	);

	return supply.toString();
};

export const applyReward = async (
	store: StateStore,
	height: number,
	rewards: ReadonlyArray<Reward>,
): Promise<void> => {
	// tslint:disable-next-line no-loop-statement
	for (const reward of rewards) {
		const recipientId = getAddressFromPublicKey(reward.publicKey);
		const recipient = await store.get<Account>(
			BUCKET_ADDRESS_ACCOUNT,
			recipientId,
		);
		const delegateAddresses = recipient.votedDelegatesPublicKeys
			? recipient.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
			: [];
		// tslint:disable-next-line no-loop-statement
		for (const address of delegateAddresses) {
			const delegate = await store.get<Account>(
				BUCKET_ADDRESS_ACCOUNT,
				address,
			);
			const updateDelegateVote = {
				...delegate,
				votes: new BigNum(delegate.votes || '0').add(reward.amount).toString(),
			};
			await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);
		}
	}
	await store.set(BUCKET_BLOCK_HEIGHT_REWARDS, height.toString(), rewards);
};

export const undoReward = async (
	store: StateStore,
	height: number,
	rewards: ReadonlyArray<Reward>,
): Promise<void> => {
	// tslint:disable-next-line no-loop-statement
	for (const reward of rewards) {
		const recipientId = getAddressFromPublicKey(reward.publicKey);
		const recipient = await store.get<Account>(
			BUCKET_ADDRESS_ACCOUNT,
			recipientId,
		);
		const delegateAddresses = recipient.votedDelegatesPublicKeys
			? recipient.votedDelegatesPublicKeys.map(getAddressFromPublicKey)
			: [];
		// tslint:disable-next-line no-loop-statement
		for (const address of delegateAddresses) {
			const delegate = await store.get<Account>(
				BUCKET_ADDRESS_ACCOUNT,
				address,
			);
			const updateDelegateVote = {
				...delegate,
				votes: new BigNum(delegate.votes || '0').sub(reward.amount).toString(),
			};
			await store.set(BUCKET_ADDRESS_ACCOUNT, address, updateDelegateVote);
		}
	}
	await store.unset(BUCKET_BLOCK_HEIGHT_REWARDS, height.toString());
};

import * as BigNum from 'browserify-bignum';
import { Delegate } from './delegate';
import { Block } from './type';
import { debug } from 'debug';

const logger = debug('dpos:round');

export interface Round {
	readonly roundNumber: number;
	readonly result: RoundResult;
	readonly delegates: ReadonlyArray<Delegate>;
}

interface RoundInfo {
	readonly generatorPublicKey: string;
	readonly reward: string;
	readonly fee: string;
}

export interface RoundResult {
	readonly [height: number]: RoundInfo;
}

export interface Reward {
	readonly publicKey: string;
	readonly amount: string;
	readonly fee: string;
}

export const defaultRound = (
	round: number,
	delegates: ReadonlyArray<Delegate>,
): Round => ({
	roundNumber: round,
	delegates,
	result: {},
});

export const applyRound = (round: Round, block: Block): Round => ({
	...round,
	result: {
		...round.result,
		[block.height]: {
			generatorPublicKey: block.generatorPublicKey,
			fee: block.totalFee,
			reward: block.reward,
		},
	},
});

export const calculateRound = (
	height: number,
	activeDelegate: number,
): number => Math.ceil(height / activeDelegate);

export const isFinishingRound = (
	height: number,
	activeDelegate: number,
): boolean => {
	if (height === 1 || height === activeDelegate) {
		return true;
	}
	const round = calculateRound(height, activeDelegate);
	const nextRound = calculateRound(height + 1, activeDelegate);

	return round !== nextRound;
};

export const isStartingRound = (
	height: number,
	activeDelegate: number,
): boolean => {
	if (height === 1 || height === activeDelegate) {
		return false;
	}
	const previousRound = calculateRound(height - 1, activeDelegate);
	const round = calculateRound(height, activeDelegate);

	return previousRound !== round;
};

export const calculateRewards = (round: Round): ReadonlyArray<Reward> => {
	const { result, delegates } = round;
	const numberOfDelegates = delegates.length;
	const totalFee = Object.values(result).reduce(
		(prev: string, current: RoundInfo) =>
			new BigNum(prev).add(current.fee).toString(),
		'0',
	);

	logger('calculating rewards, totalfee', { totalFee });

	const totalFeeBigNum = new BigNum(totalFee);
	const [calculatedFee] = totalFeeBigNum
		.div(numberOfDelegates)
		.toString()
		.split('.');
	const remainder = totalFeeBigNum.sub(calculatedFee).toString();
	logger('calculating rewards, calculated fee and remainder', { calculatedFee, remainder });
	const keyList = Object.keys(result).map((key) => parseInt(key, 10));
	const heighestHeight = Math.max(...keyList);

	const remainderTaker = result[heighestHeight].generatorPublicKey;
	logger('calculating rewards, remainderTaker', { remainderTaker });

	const rewardMap = Object.values(result)
		.map((res: RoundInfo) => ({
			publicKey: res.generatorPublicKey,
			amount: res.reward,
			fee: calculatedFee,
		}))
		.reduce<{ readonly [key: string]: Reward }>((prev, current) => {
			if (prev[current.publicKey]) {
				const existing = prev[current.publicKey];

				return {
					...prev,
					[current.publicKey]: {
						...existing,
						fee: new BigNum(existing.fee).add(current.fee).toString(),
						amount: new BigNum(existing.amount).add(current.amount).toString(),
					},
				};
			}

			return {
				...prev,
				[current.publicKey]: current,
			};
		}, {});

	return Object.values(rewardMap).map(reward => {
		if (reward.publicKey === remainderTaker) {
			return {
				...reward,
				fee: new BigNum(reward.fee).add(remainder).toString(),
			};
		}

		return reward;
	});
};

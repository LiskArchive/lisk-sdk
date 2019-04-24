import { hash } from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';

export interface Delegate {
	readonly username?: string;
	readonly publicKey?: string;
	readonly votes?: string;
	readonly reward?: string;
}

export const generateDelegateList = (
	round: string,
	delegateList: string[],
): ReadonlyArray<string> => {
	// tslint:disable-next-line no-let
	let hashedRound = hash(round, 'utf8');
	const list = [...delegateList];
	const numberOfDelegates = delegateList.length;
	// tslint:disable-next-line
	for (let i = 0; i < numberOfDelegates; i++) {
		// tslint:disable-next-line
		for (let j = 0; j < 4 && i < numberOfDelegates; i++, j++) {
			const newIndex = hashedRound[j] % numberOfDelegates;
			const temp = list[newIndex];
			list[newIndex] = list[i];
			list[i] = temp;
		}
		hashedRound = hash(hashedRound, 'utf8');
	}

	return list;
};

export const onlyDelegateProperty = (
	delegates: ReadonlyArray<Delegate>,
): ReadonlyArray<Delegate> =>
	delegates.map(({ votes, publicKey, reward, username }) => ({
		votes,
		publicKey,
		reward,
		username,
	}));

export const sortDelegates = (delegates: Delegate[]): Delegate[] =>
	delegates.sort((prev, next) => {
		if (!prev.votes || !next.votes) {
			throw new Error('Delegate cannot be sorted without votes');
		}
		if (!prev.publicKey || !next.publicKey) {
			throw new Error('Delegate cannot be sorted without public key');
		}
		if (new BigNum(prev.votes).sub(next.votes).gte(1)) {
			return -1;
		}
		if (new BigNum(prev.votes).sub(next.votes).lte(-1)) {
			return 1;
		}
		if (prev.publicKey > next.publicKey) {
			return 1;
		}
		if (prev.publicKey < next.publicKey) {
			return -1;
		}

		return 0;
	});

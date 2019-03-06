import { hash } from '@liskhq/lisk-cryptography';

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
	// tslint:disable-next-line
	for (let i = 0, delCount = delegateList.length; i < delCount; i++) {
		// tslint:disable-next-line
		for (let j = 0; j < 4 && i < delCount; i++, j++) {
			const newIndex = hashedRound[j] % delCount;
			const temp = delegateList[newIndex];
			delegateList[newIndex] = delegateList[i];
			delegateList[i] = temp;
		}
		hashedRound = hash(hashedRound, 'utf8');
	}

	return delegateList;
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
			return 0;
		}
		if (!prev.publicKey || !next.publicKey) {
			return 0;
		}
		if (prev.votes > next.votes) {
			return 1;
		}
		if (prev.votes < next.votes) {
			return -1;
		}
		if (prev.publicKey < next.publicKey) {
			return 1;
		}

		return 0;
	});

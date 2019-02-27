import { hash } from '@liskhq/lisk-cryptography';

export interface Delegate {
	readonly publicKey: string;
	readonly vote: string;
	readonly reward: string;
	readonly forged: number;
}

export const generateDelegateList = (
	round: string,
	delegateList: Delegate[],
): ReadonlyArray<Delegate> => {
	// tslint:disable-next-line no-let
	let hashedRound = hash(round);
	// tslint:disable-next-line
	for (let i = 0, delCount = delegateList.length; i < delCount; i++) {
		// tslint:disable-next-line
		for (let j = 0; j < 4 && i < delCount; i++, j++) {
			const newIndex = hashedRound[j] % delCount;
			const temp = delegateList[newIndex];
			delegateList[newIndex] = delegateList[i];
			delegateList[i] = temp;
		}
		hashedRound = hash(hashedRound);
	}

	return delegateList;
};

export const sortDelegates = (delegates: Delegate[]): Delegate[] =>
	delegates.sort((prev, next) => {
		if (prev.vote > next.vote) {
			return 1;
		}
		if (prev.vote < next.vote) {
			return -1;
		}
		if (prev.publicKey < next.publicKey) {
			return 1;
		}

		return 0;
	});

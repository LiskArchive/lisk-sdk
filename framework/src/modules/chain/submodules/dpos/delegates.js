const { hash } = require('@liskhq/lisk-cryptography');

global.constants = global.constants || {};
global.exceptions = global.exceptions || {};

const { ACTIVE_DELEGATES = 101 } = global.constants;
const { ignoreDelegateListCacheForRounds = [] } = global.exceptions;

const shuffleActiveDelegateList = async (round, list) => {
	const seedSource = round.toString();
	const delegateList = [...list];
	let currentSeed = hash(seedSource, 'utf8');

	for (let i = 0, delCount = delegateList.length; i < delCount; i++) {
		for (let x = 0; x < 4 && i < delCount; i++, x++) {
			const newIndex = currentSeed[x] % delCount;
			const b = delegateList[newIndex];
			delegateList[newIndex] = delegateList[i];
			delegateList[i] = b;
		}
		currentSeed = hash(currentSeed);
	}

	return delegateList;
};

class Delegates {
	constructor({ storage }) {
		this.delegateListCache = {};
		this.storage = storage;
	}

	async getRoundDelegates(round) {
		const list = await this.generateActiveDelegateList(round);
		return shuffleActiveDelegateList(round, list);
	}

	async getDelegatePublicKeysSortedByVote() {
		const filters = { isDelegate: true };
		const options = {
			limit: ACTIVE_DELEGATES,
			sort: ['vote:desc', 'publicKey:asc'],
		};
		const accounts = await this.storage.entities.Account.get(filters, options);
		return accounts.map(account => account.publicKey);
	}

	async generateActiveDelegateList(round) {
		if (this.delegateListCache[round]) {
			return this.delegateListCache[round];
		}

		let delegatePublicKeys = await this.storage.entities.Dpos.get(round);

		if (!delegatePublicKeys.length) {
			delegatePublicKeys = await this.getDelegatePublicKeysSortedByVote();
			await this.storage.entities.Dpos.create({
				round,
				delegatePublicKeys,
			});
		}

		if (!ignoreDelegateListCacheForRounds.includes(round)) {
			// If the round is not an exception, cache the round.
			this.delegateListCache[round] = delegatePublicKeys;
		}

		return delegatePublicKeys;
	}
}

module.exports = {
	Delegates,
	shuffleActiveDelegateList,
};

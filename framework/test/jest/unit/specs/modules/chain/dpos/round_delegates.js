/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const BigNum = require('@liskhq/bignum');
const { randomInt } = require('../../../../../utils');
const delegatePublicKeys = require('./delegate_publickeys.json');

const delegateAccounts = delegatePublicKeys.map((pk, index) => {
	const balance = new BigNum(randomInt(100, 1000));
	const rewards = new BigNum(randomInt(100, 500));
	const voteWeight = new BigNum(randomInt(10000, 50000));
	return {
		balance,
		rewards,
		voteWeight,
		fees: balance.sub(rewards),
		publicKey: pk,
		votedDelegatesPublicKeys: [`abc${index}`, `def${index}`, `xyz${index}`],
	};
});

const missedDelegateCount = 5;

// First Delegate forged 3 times
const delegatesWhoForgedThrice = delegateAccounts.slice(0, 1);

// 2nd-4th forges 2 times
const delegatesWhoForgedTwice = delegateAccounts.slice(1, 4);

// 5th forges 1 time and misses 1 time
const delegatesWhoForgedOnceMissedOnce = delegateAccounts.slice(4, 5);

// last 5 in the list
const delegatesWhoForgedNone = delegateAccounts.slice(-missedDelegateCount);

const delegatesWhoMissed = [
	...delegatesWhoForgedNone,
	...delegatesWhoForgedOnceMissedOnce,
];

// rest of the delegates forged once
const delegatesWhoForgedOnce = delegateAccounts.filter(
	d =>
		![
			...delegatesWhoForgedNone.map(a => a.publicKey),
			...delegatesWhoForgedTwice.map(a => a.publicKey),
			...delegatesWhoForgedThrice.map(a => a.publicKey),
			...delegatesWhoForgedOnceMissedOnce.map(a => a.publicKey),
		].includes(d.publicKey),
);

const delegatesWhoForged = [
	...delegatesWhoForgedThrice,
	...delegatesWhoForgedTwice,
	...delegatesWhoForgedOnce,
	...delegatesWhoForgedTwice,
	...delegatesWhoForgedThrice,
	...delegatesWhoForgedOnceMissedOnce,
	...delegatesWhoForgedThrice,
];

const uniqueDelegatesWhoForged = delegatesWhoForged.filter(
	(d, index) =>
		delegatesWhoForged.findIndex(a => a.publicKey === d.publicKey) === index,
);

const delegateWhoForgedLast = delegatesWhoForged[delegatesWhoForged.length - 1];

/**
 * sorted by [voteWeight:Desc] [publicKey:asc]
 */
// eslint-disable-next-line consistent-return, array-callback-return
const sortedDelegateAccounts = delegateAccounts.sort((a, b) => {
	if (b.voteWeight.eq(a.voteWeight)) {
		return a.publicKey.localeCompare(b.publicKey); // publicKey sorted by ascending
	}

	if (b.voteWeight.gt(a.voteWeight)) {
		return 1; // voteWeight sorted by descending
	}

	if (b.voteWeight.lt(a.voteWeight)) {
		return -1;
	}
});

const sortedDelegatePublicKeys = sortedDelegateAccounts.map(
	account => account.publicKey,
);

if (delegatesWhoForged.length !== delegateAccounts.length) {
	throw new Error('delegatesWhoForged is miscalculated');
}

if (
	uniqueDelegatesWhoForged.length !==
	delegateAccounts.length - missedDelegateCount
) {
	throw new Error('uniqueDelegatesWhoForged is miscalculated');
}

module.exports = {
	delegateAccounts,
	delegatePublicKeys,
	sortedDelegateAccounts,
	sortedDelegatePublicKeys,
	delegatesWhoForged,
	uniqueDelegatesWhoForged,
	delegatesWhoForgedNone,
	delegatesWhoMissed,
	delegatesWhoForgedOnce,
	delegatesWhoForgedTwice,
	delegatesWhoForgedThrice,
	delegatesWhoForgedOnceMissedOnce,
	delegateWhoForgedLast,
};

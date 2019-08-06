const BigNum = require('@liskhq/bignum');
const randomInt = require('random-int');
const delegatePublicKeys = require('./delegate_publickeys.json');

const delegateAccounts = delegatePublicKeys.map((pk, index) => {
	const balance = new BigNum(randomInt(100, 1000));
	const rewards = new BigNum(randomInt(100, 500));
	return {
		balance,
		rewards,
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

// last 5 in the list
const delegatesWhoMissed = delegateAccounts.slice(-missedDelegateCount);

// rest of the delegates forged once
const delegatesWhoForgedOnce = delegateAccounts.filter(
	d =>
		![
			...delegatesWhoMissed.map(a => a.publicKey),
			...delegatesWhoForgedTwice.map(a => a.publicKey),
			...delegatesWhoForgedThrice.map(a => a.publicKey),
		].includes(d.publicKey),
);

const delegatesWhoForged = [
	...delegatesWhoForgedThrice,
	...delegatesWhoForgedTwice,
	...delegatesWhoForgedOnce,
	...delegatesWhoForgedTwice,
	...delegatesWhoForgedThrice,
	...delegatesWhoForgedThrice,
];

const uniqueDelegatesWhoForged = delegatesWhoForged.filter(
	(d, index) =>
		delegatesWhoForged.findIndex(a => a.publicKey === d.publicKey) === index,
);

const delegateWhoForgedLast = delegatesWhoForged[delegatesWhoForged.length - 1];

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
	delegatesWhoForged,
	uniqueDelegatesWhoForged,
	delegatesWhoForgedOnce,
	delegatesWhoForgedTwice,
	delegatesWhoForgedThrice,
	delegatesWhoMissed,
	delegateWhoForgedLast,
};

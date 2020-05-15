/*
 * Copyright © 2018 Lisk Foundation
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
 *
 */


const {
	TransferTransaction,
	DelegateTransaction,
	VoteTransaction,
	MultisignatureTransaction,
} = require('@liskhq/lisk-transactions');

const createTransferTransaction = (
	nonce,
	fee,
	passphrase,
	recipientId,
	amount,
) => {
	const transaction = new TransferTransaction({
		nonce,
		fee,
		asset: {
			recipientId,
			amount,
		},
	});
	transaction.sign(passphrase);
	return transaction.toJSON();
};

const createDelegateTransaction = (passphrase, username) => {
	const transaction = new DelegateTransaction({
		asset: {
			delegate: {
				username,
			},
		},
	});
	transaction.sign(passphrase);
	return transaction.toJSON();
};

const createVoteTransaction = (passphrase, upvotes = [], downvotes = []) => {
	const signedUpvotes = upvotes.map(v => `+${v}`);
	const signedDownvotes = downvotes.map(v => `-${v}`);
	const transaction = new VoteTransaction({
		asset: {
			votes: [...signedUpvotes, ...signedDownvotes],
		},
	});
	transaction.sign(passphrase);
	return transaction.toJSON();
};

const createMultiSignatureTransaction = (
	passphrase,
	min,
	lifetime,
	keysgroup,
) => {
	const signedPublicKeys = keysgroup.map(v => `+${v}`);
	const transaction = new MultisignatureTransaction({
		asset: {
			multisignature: {
				min,
				lifetime,
				keysgroup: signedPublicKeys,
			},
		},
	});
	transaction.sign(passphrase);
	return transaction.toJSON();
};

module.exports = {
	createTransferTransaction,
	createDelegateTransaction,
	createVoteTransaction,
	createMultiSignatureTransaction,
};

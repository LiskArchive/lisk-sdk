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

const {
	utils: transactionUtils,
	VoteTransaction,
	MultisignatureTransaction,
} = require('@liskhq/lisk-transactions');
const BigNum = require('@liskhq/bignum');

const redoSignature = (transaction, passphrase) => {
	const { signature: discarded, ...transactionWithoutSignature } = transaction;
	const signature = transactionUtils.signTransaction(
		transactionWithoutSignature,
		passphrase,
	);
	const newTransaction = {
		...transactionWithoutSignature,
		signature,
	};
	return {
		...newTransaction,
		id: transactionUtils.getTransactionId(newTransaction),
	};
};

const redoVoteTransactionSignature = (voteTransactionJSON, passphrase) => {
	const {
		signature: discarded,
		...transactionWithoutSignature
	} = voteTransactionJSON;
	const tx = new VoteTransaction(transactionWithoutSignature);
	tx.sign(passphrase);

	return tx.toJSON();
};

const redoMultisignatureTransactionSignature = (
	multiTransactionJSON,
	passphrase,
) => {
	const {
		signature: discarded,
		...transactionWithoutSignature
	} = multiTransactionJSON;
	const tx = new MultisignatureTransaction(transactionWithoutSignature);
	tx.sign(passphrase);

	return tx.toJSON();
};

const createInvalidRegisterMultisignatureTransaction = ({
	keysgroup,
	lifetime,
	minimum,
	passphrase,
	secondPassphrase,
	baseFee,
}) => {
	const tx = new MultisignatureTransaction({
		type: 4,
		amount: '0',
		fee: new BigNum(baseFee).times(keysgroup.length + 1).toString(),
		asset: {
			keysgroup: keysgroup.map(key => `+${key}`),
			lifetime,
			min: minimum,
		},
	});
	tx.sign(passphrase, secondPassphrase);
	return tx.toJSON();
};

// Exports
module.exports = {
	redoSignature,
	redoVoteTransactionSignature,
	redoMultisignatureTransactionSignature,
	createInvalidRegisterMultisignatureTransaction,
};

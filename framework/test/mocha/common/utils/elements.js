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

const { utils: transactionUtils } = require('@liskhq/lisk-transactions');
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

const createInvalidRegisterMultisignatureTransaction = ({
	keysgroup,
	lifetime,
	minimum,
	passphrase,
	secondPassphrase,
	baseFee,
}) =>
	transactionUtils.signRawTransaction({
		transaction: {
			type: 4,
			amount: '0',
			fee: new BigNum(baseFee).times(keysgroup.length + 1).toString(),
			asset: {
				multisignature: {
					keysgroup: keysgroup.map(key => `+${key}`),
					lifetime,
					min: minimum,
				},
			},
		},
		passphrase,
		secondPassphrase,
	});

// Exports
module.exports = {
	redoSignature,
	createInvalidRegisterMultisignatureTransaction,
};

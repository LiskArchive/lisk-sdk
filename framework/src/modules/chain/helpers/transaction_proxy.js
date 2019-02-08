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
const { transaction } = require('lisk-elements').default;

class Transaction {
	constructor(rawTx) {
		const map = new Map([
			[0, 'TransferTransaction'],
			[1, 'SecondSignatureTransaction'],
			[2, 'DelegateTransaction'],
			[3, 'VoteTransaction'],
			[4, 'MultisignatureTransaction'],
			[5, 'DappTransaction'],
			[6, 'InTransferTransaction'],
			[7, 'OutTransferTransaction'],
		]);

		const TransactionClass = transaction[map.get(rawTx.type)];

		if (!tx) {
			throw new Error('Transaction type not found.');
		}

		return new TransactionClass(rawTx);
	}
}

module.exports = Transaction;

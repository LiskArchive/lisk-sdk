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
import cryptography from '@liskhq/lisk-cryptography';
import prepareTransaction from './prepare_transaction';
import { getTimeWithOffset } from './time';

const wrapTransactionCreator = transactionCreator => transactionParameters => {
	const { passphrase, secondPassphrase, timeOffset } = transactionParameters;

	const senderPublicKey = passphrase
		? cryptography.getKeys(passphrase).publicKey
		: null;
	const timestamp = getTimeWithOffset(timeOffset);

	const transaction = Object.assign(
		{
			amount: '0',
			recipientId: '',
			senderPublicKey,
			timestamp,
		},
		transactionCreator(transactionParameters),
	);

	return passphrase
		? prepareTransaction(transaction, passphrase, secondPassphrase)
		: transaction;
};

export default wrapTransactionCreator;

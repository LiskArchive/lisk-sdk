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
import * as cryptography from '@liskhq/lisk-cryptography';
import BigNum from 'browserify-bignum';
import { BYTESIZES } from '../../constants';
import { TransactionJSON } from '../../transaction_types';

export const getBytes = (
	transaction: TransactionJSON,
	skipSignature: boolean = true,
	skipSignSignature: boolean = true,
): Buffer => {
	const {
		type,
		timestamp,
		senderPublicKey,
		recipientId,
		amount,
		signature,
		signSignature,
	} = transaction;

	const transactionType = Buffer.alloc(BYTESIZES.TYPE, type);
	const transactionTimestamp = Buffer.alloc(BYTESIZES.TIMESTAMP);
	transactionTimestamp.writeIntLE(timestamp, 0, BYTESIZES.TIMESTAMP);

	const transactionSenderPublicKey = cryptography.hexToBuffer(senderPublicKey);

	const transactionRecipientID = recipientId
		? cryptography.bigNumberToBuffer(
				recipientId.slice(0, -1),
				BYTESIZES.RECIPIENT_ID,
		  )
		: Buffer.alloc(BYTESIZES.RECIPIENT_ID);

	const transactionAmount = new BigNum(amount).toBuffer({
		endian: 'little',
		size: BYTESIZES.AMOUNT,
	});

	const transactionSignature =
		signature && !skipSignature
			? cryptography.hexToBuffer(signature)
			: Buffer.alloc(0);

	const transactionSecondSignature =
		signSignature && !skipSignSignature
			? cryptography.hexToBuffer(signSignature)
			: Buffer.alloc(0);

	return Buffer.concat([
		transactionType,
		transactionTimestamp,
		transactionSenderPublicKey,
		transactionRecipientID,
		transactionAmount,
		transactionSignature,
		transactionSecondSignature,
	]);
};

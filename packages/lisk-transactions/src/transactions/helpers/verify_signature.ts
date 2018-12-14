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
import { TransactionError } from '../../errors';
import { TransactionJSON } from '../../transaction_types';
import { getTransactionBytes } from '../../utils';
import { getBytes } from './get_bytes';

interface VerifyReturn {
	readonly verified: boolean;
	readonly error?: TransactionError;
}

export const verifySignature = (
	publicKey: string,
	signature: string,
	transaction: TransactionJSON,
	isSecondSignature: boolean = false,
): VerifyReturn => {
	const {
		signature: removedSignature,
		signSignature,
		...strippedTransaction
	} = transaction;

	// If transaction includes asset data, include those bytes
	const transactionBytes =
		transaction.asset && Object.keys(transaction.asset).length
			? getTransactionBytes(strippedTransaction as TransactionJSON)
			: getBytes(transaction, !isSecondSignature);
	const transactionHash = cryptography.hash(transactionBytes);

	const verified = cryptography.verifyData(
		transactionHash,
		signature,
		publicKey,
	);

	return {
		verified,
		error: !verified
			? new TransactionError(
					`Failed to verify signature ${signature}`,
					transaction.id,
					'.signature',
			  )
			: undefined,
	};
};

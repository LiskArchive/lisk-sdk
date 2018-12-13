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
import { TransactionError } from '../../errors';
import { TransactionJSON } from '../../transaction_types';
import { verifySignature } from './verify_signature';

export const verifyMultisignatures = (
	memberPublicKeys: ReadonlyArray<string> = [],
	minimumValidations: number = 0,
	transaction: TransactionJSON,
): {
	readonly verified: boolean;
	readonly errors: ReadonlyArray<TransactionError>;
} => {
	const transactionSignatures = transaction.signatures as ReadonlyArray<string>;
	// tslint:disable-next-line no-let
	let validatedSignaturesCount = 0;
	const checkedPublicKeys: string[] = [];
	const errors: TransactionError[] = [];

	memberPublicKeys.forEach(publicKey => {
		if (checkedPublicKeys.includes(publicKey)) {
			return;
		}

		transactionSignatures.forEach((signature: string) => {
			const {
				verified: signatureVerified,
				error: verificationError,
			} = verifySignature(publicKey, signature, transaction);
			if (!signatureVerified) {
				errors.push(verificationError as TransactionError);
			} else {
				checkedPublicKeys.push(publicKey);
				validatedSignaturesCount++;
			}
		});
	});

	return {
		verified: validatedSignaturesCount >= minimumValidations,
		errors,
	};
};

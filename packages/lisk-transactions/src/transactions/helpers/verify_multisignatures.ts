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

interface VerifyReturn {
	readonly verified: boolean;
	readonly errors: ReadonlyArray<TransactionError>;
}

export const verifyMultisignatures = (
	memberPublicKeys: ReadonlyArray<string> = [],
	minimumValidations: number = 0,
	transaction: TransactionJSON,
): VerifyReturn => {
	if (
		!transaction.signatures ||
		transaction.signatures.length < minimumValidations
	) {
		return {
			verified: false,
			errors: [
				new TransactionError(
					'Missing signatures',
					transaction.id,
					'.signatures',
				),
			],
		};
	}

	// tslint:disable-next-line no-unnecessary-type-assertion
	const transactionSignatures = transaction.signatures as ReadonlyArray<string>;
	// tslint:disable-next-line no-let
	const verifiedSignatures: string[] = [];
	const checkedPublicKeys: string[] = [];

	memberPublicKeys.forEach(publicKey => {
		if (checkedPublicKeys.includes(publicKey)) {
			return;
		}

		transactionSignatures.forEach((signature: string) => {
			if (verifiedSignatures.includes(signature)) {
				return;
			}
			const { verified: signatureVerified } = verifySignature(
				publicKey,
				signature,
				transaction,
			);
			if (signatureVerified) {
				checkedPublicKeys.push(publicKey);
				verifiedSignatures.push(signature);
			}
		});
	});

	const unverifiedSignatures = transactionSignatures.filter(
		e => !verifiedSignatures.find(a => e === a),
	);

	return {
		verified: verifiedSignatures.length >= minimumValidations,
		errors:
			unverifiedSignatures.length > 0
				? unverifiedSignatures.map(
						signature =>
							new TransactionError(
								`Failed to verify signature ${signature}`,
								transaction.id,
								'.signature',
							),
				  )
				: [],
	};
};

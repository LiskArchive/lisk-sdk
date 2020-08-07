/*
 * Copyright © 2020 Lisk Foundation
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
import { verifyData } from '@liskhq/lisk-cryptography';
import { AccountKeyAsset } from '../types';
import { Account } from '../../base_asset';

export const isMultisignatureAccount = (account: Account<AccountKeyAsset>): boolean =>
	!!(
		(account.keys.mandatoryKeys.length > 0 || account.keys.optionalKeys.length > 0) &&
		account.keys.numberOfSignatures
	);

export const validateSignature = (
	publicKey: Buffer,
	signature: Buffer,
	bytes: Buffer,
	id: Buffer,
): void => {
	const valid = verifyData(bytes, signature, publicKey);

	if (!valid) {
		throw new Error(
			`Failed to validate signature '${signature.toString(
				'base64',
			)}' for transaction with id '${id.toString('base64')}'`,
		);
	}
};

const validateKeysSignatures = (
	keys: ReadonlyArray<Buffer>,
	signatures: ReadonlyArray<Buffer>,
	transactionBytes: Buffer,
	id: Buffer,
): void => {
	for (let i = 0; i < keys.length; i += 1) {
		if (signatures[i].length === 0) {
			throw new Error('Invalid signature. Empty buffer is not a valid signature.');
		}

		validateSignature(keys[i], signatures[i], transactionBytes, id);
	}
};

export const verifyMultiSignatureTransaction = (
	id: Buffer,
	sender: Account<AccountKeyAsset>,
	signatures: ReadonlyArray<Buffer>,
	transactionBytes: Buffer,
): void => {
	const { mandatoryKeys, optionalKeys, numberOfSignatures } = sender.keys;
	const numMandatoryKeys = mandatoryKeys.length;
	const numOptionalKeys = optionalKeys.length;
	// Filter empty signature to compare against numberOfSignatures
	const nonEmptySignaturesCount = signatures.filter(k => k.length !== 0).length;

	// Check if signatures excluding empty string matched required numberOfSignatures
	if (
		nonEmptySignaturesCount !== numberOfSignatures ||
		signatures.length !== numMandatoryKeys + numOptionalKeys
	) {
		throw new Error(
			`Transaction signatures does not match required number of signatures: '${numberOfSignatures.toString()}' for transaction with id '${id.toString(
				'base64',
			)}'`,
		);
	}

	validateKeysSignatures(mandatoryKeys, signatures, transactionBytes, id);

	// Iterate through non empty optional keys for signature validity
	for (let k = 0; k < numOptionalKeys; k += 1) {
		// Get corresponding optional key signature starting from offset(end of mandatory keys)
		const signature = signatures[numMandatoryKeys + k];
		if (signature.length !== 0) {
			validateSignature(optionalKeys[k], signature, transactionBytes, id);
		}
	}
};

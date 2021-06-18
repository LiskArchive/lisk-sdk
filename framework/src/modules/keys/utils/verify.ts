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
import { Account } from '@liskhq/lisk-chain';
import { verifyData } from '@liskhq/lisk-cryptography';
import { AccountKeys } from '../types';

export const isMultisignatureAccount = (account: Account<AccountKeys>): boolean =>
	!!(
		(account.keys.mandatoryKeys.length > 0 || account.keys.optionalKeys.length > 0) &&
		account.keys.numberOfSignatures
	);

export const validateSignature = (
	tag: string,
	networkIdentifier: Buffer,
	publicKey: Buffer,
	signature: Buffer,
	transactionBytes: Buffer,
	id: Buffer,
): void => {
	const valid = verifyData(tag, networkIdentifier, transactionBytes, signature, publicKey);

	if (!valid) {
		throw new Error(
			`Failed to validate signature '${signature.toString(
				'hex',
			)}' for transaction with id '${id.toString('hex')}'`,
		);
	}
};

export const validateKeysSignatures = (
	tag: string,
	networkIdentifier: Buffer,
	keys: ReadonlyArray<Buffer>,
	signatures: ReadonlyArray<Buffer>,
	transactionBytes: Buffer,
	id: Buffer,
): void => {
	for (let i = 0; i < keys.length; i += 1) {
		if (signatures[i].length === 0) {
			throw new Error('Invalid signature. Empty buffer is not a valid signature.');
		}

		validateSignature(tag, networkIdentifier, keys[i], signatures[i], transactionBytes, id);
	}
};

export const verifyMultiSignatureTransaction = (
	tag: string,
	networkIdentifier: Buffer,
	id: Buffer,
	sender: Account<AccountKeys>,
	signatures: ReadonlyArray<Buffer>,
	transactionBytes: Buffer,
): void => {
	const { mandatoryKeys, optionalKeys, numberOfSignatures } = sender.keys;
	const numMandatoryKeys = mandatoryKeys.length;
	const numOptionalKeys = optionalKeys.length;
	// Filter empty signature to compare against numberOfSignatures
	const nonEmptySignaturesCount = signatures.filter(k => k.length !== 0).length;

	// Check if signatures excluding empty string match required numberOfSignatures
	if (
		nonEmptySignaturesCount !== numberOfSignatures ||
		signatures.length !== numMandatoryKeys + numOptionalKeys
	) {
		throw new Error(
			`Transaction signatures does not match required number of signatures: '${numberOfSignatures.toString()}' for transaction with id '${id.toString(
				'hex',
			)}'`,
		);
	}

	validateKeysSignatures(tag, networkIdentifier, mandatoryKeys, signatures, transactionBytes, id);

	// Iterate through non empty optional keys for signature validity
	for (let k = 0; k < numOptionalKeys; k += 1) {
		// Get corresponding optional key signature starting from offset(end of mandatory keys)
		const signature = signatures[numMandatoryKeys + k];
		if (signature.length !== 0) {
			validateSignature(tag, networkIdentifier, optionalKeys[k], signature, transactionBytes, id);
		}
	}
};

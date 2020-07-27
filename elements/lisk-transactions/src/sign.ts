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
 *
 */

import { codec, Schema } from '@liskhq/lisk-codec';
import { getAddressAndPublicKeyFromPassphrase, signData } from '@liskhq/lisk-cryptography';
import { BaseTransaction } from './base_transaction';
import { sortKeysAscending } from './utils';
import { validateTransactionSchema } from './validate';

interface MultiSignatureKeys {
	readonly mandatoryKeys: Array<Readonly<Buffer>>;
	readonly optionalKeys: Array<Readonly<Buffer>>;
}

// Validates transaction against schema and returns transaction bytes for signing
export const getSigningBytes = (
	assetSchema: object,
	transactionObject: Record<string, unknown>,
): Buffer => {
	const validationErrors = validateTransactionSchema(assetSchema, transactionObject);
	if (validationErrors) {
		throw validationErrors;
	}
	if (typeof transactionObject.asset !== 'object' || transactionObject.asset === null) {
		throw new Error('Asset must be of type object and not null');
	}
	const assetBytes = codec.encode((assetSchema as unknown) as Schema, transactionObject.asset);
	const transactionBytes = codec.encode(BaseTransaction.BASE_SCHEMA, {
		...transactionObject,
		asset: assetBytes,
		signatures: [],
	});

	return transactionBytes;
};

// Validates transaction against schema and returns transaction including signature
export const signTransaction = (
	assetSchema: object,
	transactionObject: Record<string, unknown>,
	networkIdentifier: Buffer,
	passphrase: string,
): Record<string, unknown> => {
	if (!networkIdentifier.length) {
		throw new Error('Network identifier is required to sign a transaction');
	}

	if (!passphrase) {
		throw new Error('Passphrase is required to sign a transaction');
	}
	const validationErrors = validateTransactionSchema(assetSchema, transactionObject);
	if (validationErrors) {
		throw validationErrors;
	}
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase);

	if (
		!Buffer.isBuffer(transactionObject.senderPublicKey) ||
		!transactionObject.senderPublicKey.equals(publicKey)
	) {
		throw new Error('Transaction senderPublicKey does not match public key from passphrase');
	}

	const transactionWithNetworkIdentifierBytes = Buffer.concat([
		networkIdentifier,
		getSigningBytes(assetSchema, transactionObject),
	]);

	const signature = signData(transactionWithNetworkIdentifierBytes, passphrase);
	// eslint-disable-next-line no-param-reassign
	transactionObject.signatures = [];
	// eslint-disable-next-line no-param-reassign
	transactionObject.signatures = [signature];
	return transactionObject;
};

const sanitizeSignaturesArray = (
	transactionObject: Record<string, unknown>,
	keys: MultiSignatureKeys,
	includeSenderSignature: boolean,
): void => {
	let numberOfSignatures = keys.mandatoryKeys.length + keys.optionalKeys.length;
	// Add one extra for multisig account registration
	if (includeSenderSignature) {
		numberOfSignatures += 1;
	}

	for (let i = 0; i < numberOfSignatures; i += 1) {
		if (
			Array.isArray(transactionObject.signatures) &&
			transactionObject.signatures[i] === undefined
		) {
			// eslint-disable-next-line no-param-reassign
			transactionObject.signatures[i] = Buffer.from('');
		}
	}
};

// Validates transaction against schema and sign a multi-signature transaction
export const signMultiSignatureTransaction = (
	assetSchema: object,
	transactionObject: Record<string, unknown>,
	networkIdentifier: Buffer,
	passphrase: string,
	keys: MultiSignatureKeys,
	includeSenderSignature = false,
): Record<string, unknown> => {
	const validationErrors = validateTransactionSchema(assetSchema, transactionObject);
	if (validationErrors) {
		throw validationErrors;
	}
	if (!Array.isArray(transactionObject.signatures)) {
		throw new Error('Signatures must be of type array');
	}
	// Sort keys
	sortKeysAscending(keys.mandatoryKeys);
	sortKeysAscending(keys.optionalKeys);

	const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase);

	const transactionWithNetworkIdentifierBytes = Buffer.concat([
		networkIdentifier,
		getSigningBytes(assetSchema, transactionObject),
	]);

	const signature = signData(transactionWithNetworkIdentifierBytes, passphrase);

	if (
		includeSenderSignature &&
		Buffer.isBuffer(transactionObject.senderPublicKey) &&
		publicKey.equals(transactionObject.senderPublicKey)
	) {
		// Include sender signature at position zero
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[0] = signature;
	}

	if (
		(transactionObject.signatures as Array<Readonly<Buffer>>).find(
			s => s instanceof Buffer && s.equals(signature),
		) !== undefined
	) {
		sanitizeSignaturesArray(transactionObject, keys, includeSenderSignature);

		return transactionObject;
	}

	// Locate where this public key should go in the signatures array
	const mandatoryKeyIndex = keys.mandatoryKeys.findIndex(aPublicKey =>
		aPublicKey.equals(publicKey),
	);
	const optionalKeyIndex = keys.optionalKeys.findIndex(aPublicKey => aPublicKey.equals(publicKey));

	// If it's a mandatory Public Key find where to add the signature
	if (mandatoryKeyIndex !== -1) {
		const signatureOffset = includeSenderSignature ? 1 : 0;
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[mandatoryKeyIndex + signatureOffset] = signature;
	}

	if (optionalKeyIndex !== -1) {
		const signatureOffset = includeSenderSignature ? 1 : 0;
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[
			keys.mandatoryKeys.length + optionalKeyIndex + signatureOffset
		] = signature;
	}

	sanitizeSignaturesArray(transactionObject, keys, includeSenderSignature);

	return transactionObject;
};

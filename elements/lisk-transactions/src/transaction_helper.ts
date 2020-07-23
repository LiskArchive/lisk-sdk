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
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { BaseTransaction } from './base_transaction';
import { sortKeysAscending } from './utils';

interface MultiSignatureKeys {
	readonly mandatoryKeys: Array<Readonly<Buffer>>;
	readonly optionalKeys: Array<Readonly<Buffer>>;
}

export const validateTransactionSchema = (
	assetSchema: object,
	transactionObject: Record<string, unknown>,
): Error => {
	const valueWithoutAsset = {
		...transactionObject,
		asset: Buffer.alloc(0),
	};
	const schemaErrors = validator.validate(BaseTransaction.BASE_SCHEMA, valueWithoutAsset);

	if (typeof transactionObject.asset !== 'object' || transactionObject.asset === null) {
		throw new Error('Asset must be of type object and not null');
	}
	const assetSchemaErrors = validator.validate(assetSchema, transactionObject.asset);

	return new LiskValidationError([...schemaErrors, ...assetSchemaErrors]);
};

export const getSigningBytes = (
	assetSchema: object,
	transactionObject: Record<string, unknown>,
): Buffer => {
	if (typeof transactionObject.asset !== 'object' || transactionObject.asset === null) {
		throw new Error('Asset must be of type object and not null');
	}
	validateTransactionSchema(assetSchema, transactionObject);
	const assetBytes = codec.encode((assetSchema as unknown) as Schema, transactionObject.asset);
	const transactionBytes = codec.encode(BaseTransaction.BASE_SCHEMA, {
		...transactionObject,
		asset: assetBytes,
		signatures: [],
	});

	return transactionBytes;
};

export const signTransaction = (
	assetSchema: object,
	transactionObject: Record<string, unknown>,
	networkIdentifier: Buffer,
	senderPassphrase: string,
): Record<string, unknown> => {
	if (!networkIdentifier.length) {
		throw new Error('Network identifier is required to sign a transaction');
	}

	if (!senderPassphrase) {
		throw new Error('Passphrase is required to sign a transaction');
	}
	validateTransactionSchema(assetSchema, transactionObject);
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(senderPassphrase);

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

	const signature = signData(transactionWithNetworkIdentifierBytes, senderPassphrase);
	// Reset signatures
	if (!Array.isArray(transactionObject.signatures)) {
		throw new Error('Signatures must be of type array');
	}
	transactionObject.signatures.push(signature);
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

export const signMultiSignatureTransaction = (
	assetSchema: object,
	transactionObject: Record<string, unknown>,
	networkIdentifier: Buffer,
	senderPassphrase: string,
	keys: MultiSignatureKeys,
	includeSenderSignature = false,
): Record<string, unknown> => {
	validateTransactionSchema(assetSchema, transactionObject);

	// Sort keys
	sortKeysAscending(keys.mandatoryKeys);
	sortKeysAscending(keys.optionalKeys);

	const { publicKey } = getAddressAndPublicKeyFromPassphrase(senderPassphrase);

	const transactionWithNetworkIdentifierBytes = Buffer.concat([
		networkIdentifier,
		getSigningBytes(assetSchema, transactionObject),
	]);

	const signature = signData(transactionWithNetworkIdentifierBytes, senderPassphrase);

	if (
		includeSenderSignature &&
		Buffer.isBuffer(transactionObject.senderPublicKey) &&
		publicKey.equals(transactionObject.senderPublicKey)
	) {
		(transactionObject.signatures as Array<Readonly<Buffer>>).unshift(signature);
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

	if (!Array.isArray(transactionObject.signatures)) {
		throw new Error('Signatures must be of type array');
	}
	// If it's a mandatory Public Key find where to add the signature
	if (mandatoryKeyIndex !== -1) {
		let signatureOffset = 0;

		if (includeSenderSignature) {
			// Account for sender signature
			signatureOffset = 1;
		}
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[mandatoryKeyIndex + signatureOffset] = signature;
	}

	if (optionalKeyIndex !== -1) {
		let signatureOffset = 0;

		if (includeSenderSignature) {
			// Account for sender signature
			signatureOffset = 1;
		}
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[
			keys.mandatoryKeys.length + optionalKeyIndex + signatureOffset
		] = signature;
	}

	sanitizeSignaturesArray(transactionObject, keys);

	return transactionObject;
};

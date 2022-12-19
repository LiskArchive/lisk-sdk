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
import { utils, ed } from '@liskhq/lisk-cryptography';
import { validateTransaction } from './validate';
import { baseTransactionSchema } from './schema';
import { TAG_TRANSACTION } from './constants';

export interface MultiSignatureKeys {
	readonly mandatoryKeys: Array<Buffer>;
	readonly optionalKeys: Array<Buffer>;
}

/**
 * Validates transaction against schema and returns transaction bytes for signing
 *
 *  @example
 *  ```ts
 *  import { getSigningBytes } from '@liskhq/lisk-transactions';
 *  const txBytes = getSigningBytes(TransferTrx, transferParamsSchema);
 *  ```
 *
 * @param transactionObject a decrypted transaction
 * @param paramsSchema parameter schema for the transaction
 *
 * @returns Returns the encrypted transaction, if the provided transaction is valid.
 * If the transaction is invalid, it returns the validation errors.
 */
export const getSigningBytes = (
	transactionObject: Record<string, unknown>,
	paramsSchema?: object,
): Buffer => {
	const validationErrors = validateTransaction(transactionObject, paramsSchema);
	if (validationErrors) {
		throw validationErrors;
	}
	if (typeof transactionObject.params !== 'object' || transactionObject.params === null) {
		const transactionBytes = codec.encode(baseTransactionSchema, {
			...transactionObject,
			params: Buffer.alloc(0),
			signatures: [],
		});

		return transactionBytes;
	}
	const paramsBytes = codec.encode(paramsSchema as unknown as Schema, transactionObject.params);
	const transactionBytes = codec.encode(baseTransactionSchema, {
		...transactionObject,
		params: paramsBytes,
		signatures: [],
	});

	return transactionBytes;
};

/**
 * Encrypts a given transaction object.
 *
 * @example
 *  ```ts
 *  import { getBytes } from '@liskhq/lisk-transactions';
 *  const txBytes = getBytes(TransferTrx, transferParamsSchema);
 *  ```
 *
 * @param transactionObject a decrypted transaction
 * @param paramsSchema parameter schema for the transaction
 *
 * @returns Returns the encrypted transaction.
 */
export const getBytes = (
	transactionObject: Record<string, unknown>,
	paramsSchema?: object,
): Buffer => {
	if (typeof transactionObject.params !== 'object' || transactionObject.params === null) {
		const transactionBytes = codec.encode(baseTransactionSchema, {
			...transactionObject,
			params: Buffer.alloc(0),
		});

		return transactionBytes;
	}
	const paramsBytes = codec.encode(paramsSchema as unknown as Schema, transactionObject.params);
	const transactionBytes = codec.encode(baseTransactionSchema, {
		...transactionObject,
		params: paramsBytes,
	});

	return transactionBytes;
};

/**
 *
 * @param transactionObject
 * @param keys
 * @param includeSenderSignature
 */
const sanitizeSignaturesArray = (
	transactionObject: Record<string, unknown>,
	keys: MultiSignatureKeys,
	includeSenderSignature: boolean,
): void => {
	const numberOfSignatures =
		(includeSenderSignature ? 1 : 0) + keys.mandatoryKeys.length + keys.optionalKeys.length;

	for (let i = 0; i < numberOfSignatures; i += 1) {
		if (
			Array.isArray(transactionObject.signatures) &&
			transactionObject.signatures[i] === undefined
		) {
			// eslint-disable-next-line no-param-reassign
			transactionObject.signatures[i] = Buffer.alloc(0);
		}
	}
};

export const signTransactionWithPrivateKey = (
	transactionObject: Record<string, unknown>,
	chainID: Buffer,
	privateKey: Buffer,
	paramsSchema?: object,
): Record<string, unknown> => {
	if (!chainID.length) {
		throw new Error('ChainID is required to sign a transaction');
	}

	if (!privateKey.length || privateKey.length !== 64) {
		throw new Error('Private key must be 64 bytes');
	}

	const validationErrors = validateTransaction(transactionObject, paramsSchema);
	if (validationErrors) {
		throw validationErrors;
	}

	const signature = ed.signDataWithPrivateKey(
		TAG_TRANSACTION,
		chainID,
		getSigningBytes(transactionObject, paramsSchema),
		privateKey,
	);

	// eslint-disable-next-line no-param-reassign
	transactionObject.signatures = [signature];
	return { ...transactionObject, id: utils.hash(getBytes(transactionObject, paramsSchema)) };
};

export const signTransaction = signTransactionWithPrivateKey;

export const signMultiSignatureTransactionWithPrivateKey = (
	transactionObject: Record<string, unknown>,
	chainID: Buffer,
	privateKey: Buffer,
	keys: MultiSignatureKeys,
	paramsSchema?: object,
	includeSenderSignature = false,
): Record<string, unknown> => {
	if (!chainID.length) {
		throw new Error('ChainID is required to sign a transaction');
	}

	if (!privateKey || privateKey.length !== 64) {
		throw new Error('Private key must be 64 bytes');
	}

	if (!Array.isArray(transactionObject.signatures)) {
		throw new Error('Signatures must be of type array');
	}

	const validationErrors = validateTransaction(transactionObject, paramsSchema);
	if (validationErrors) {
		throw validationErrors;
	}
	// Sort keys
	keys.mandatoryKeys.sort((publicKeyA, publicKeyB) => publicKeyA.compare(publicKeyB));
	keys.optionalKeys.sort((publicKeyA, publicKeyB) => publicKeyA.compare(publicKeyB));

	const publicKey = ed.getPublicKeyFromPrivateKey(privateKey);
	const signature = ed.signDataWithPrivateKey(
		TAG_TRANSACTION,
		chainID,
		getSigningBytes(transactionObject, paramsSchema),
		privateKey,
	);

	if (
		includeSenderSignature &&
		Buffer.isBuffer(transactionObject.senderPublicKey) &&
		publicKey.equals(transactionObject.senderPublicKey)
	) {
		// eslint-disable-next-line no-param-reassign
		transactionObject.signatures[0] = signature;
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
		transactionObject.signatures[keys.mandatoryKeys.length + optionalKeyIndex + signatureOffset] =
			signature;
	}

	sanitizeSignaturesArray(transactionObject, keys, includeSenderSignature);

	return { ...transactionObject, id: utils.hash(getBytes(transactionObject, paramsSchema)) };
};

export const signMultiSignatureTransaction = signMultiSignatureTransactionWithPrivateKey;

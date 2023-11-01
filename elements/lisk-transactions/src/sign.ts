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

import { codec, emptySchema, Schema } from '@liskhq/lisk-codec';
import { utils, ed } from '@liskhq/lisk-cryptography';
import { validateTransaction } from './validate';
import { baseTransactionSchema } from './schema';
import { TAG_TRANSACTION } from './constants';

/** Mandatory and optional public keys of a multi-signature account. */
export interface MultiSignatureKeys {
	/** Mandatory public keys of a multi-signature account */
	readonly mandatoryKeys: Array<Buffer>;
	/** Optional public keys  of a multi-signature account */
	readonly optionalKeys: Array<Buffer>;
}

const encodeParams = (
	transaction: Record<string, unknown>,
	paramsSchema = emptySchema as object,
): Buffer => {
	validateTransaction(transaction, paramsSchema);

	const hasParams =
		typeof transaction.params === 'object' && transaction.params !== null && paramsSchema;

	return hasParams
		? codec.encode(paramsSchema as unknown as Schema, transaction.params as object)
		: Buffer.alloc(0);
};

/**
 * Validates transaction against schema and converts transaction to bytes for signing.
 *
 *  @example
 *  ```ts
 *  import { getSigningBytes } from '@liskhq/lisk-transactions';
 *  const txBytes = getSigningBytes(TransferTrx, transferParamsSchema);
 *  ```
 *
 * @param transaction a decrypted transaction
 * @param paramsSchema parameter schema for the transaction
 *
 * @returns Returns the encrypted transaction, if the provided transaction is valid.
 * If the transaction is invalid, it returns the validation errors.
 *
 * @see [LIP 0028 - Define schema and use generic serialization for transactions](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0028.md)
 * @see [LIP 0068 - Define new transaction schema](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0068.md)
 * @see [LIP 0062 - Use pre-hashing for signatures](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0062.md)
 */
export const getSigningBytes = (
	transaction: Record<string, unknown>,
	paramsSchema?: object,
): Buffer => {
	const params = encodeParams(transaction, paramsSchema);

	return codec.encode(baseTransactionSchema, { ...transaction, params, signatures: [] });
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
 * @param transaction a decrypted transaction
 * @param paramsSchema parameter schema for the transaction
 *
 * @returns Returns the encrypted transaction.
 *
 * @see [LIP 0028 - Define schema and use generic serialization for transactions](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0028.md)
 * @see [LIP 0068 - Define new transaction schema](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0068.md)
 */
export const getBytes = (transaction: Record<string, unknown>, paramsSchema?: object): Buffer => {
	const params = encodeParams(transaction, paramsSchema);

	return codec.encode(baseTransactionSchema, { ...transaction, params });
};

/**
 * Signs a given transaction.
 *
 * @example
 *  ```ts
 *  import { signTransaction } from '@liskhq/lisk-transactions';
 *  const signedTransaction = signTransaction(unsignedTrx, chainID, privateKey, paramsSchema);
 *  ```
 *
 * @param transaction The unsigned transaction object.
 * @param chainID The chain ID of the chain to which the transaction belongs.
 * @param privateKey The private key of the sender of the transaction.
 * @param paramsSchema The schema for the `params` of the transaction.
 *
 * @returns The signed transaction.
 *
 * @see [LIP 0028 - Define schema and use generic serialization for transactions](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0028.md)
 * @see [LIP 0068 - Define new transaction schema](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0068.md)
 * @see [LIP 0062 - Use pre-hashing for signatures](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0062.md)
 */
export const signTransaction = (
	transaction: Record<string, unknown>,
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

	validateTransaction(transaction, paramsSchema);

	const signature = ed.signDataWithPrivateKey(
		TAG_TRANSACTION,
		chainID,
		getSigningBytes(transaction, paramsSchema),
		privateKey,
	);

	// eslint-disable-next-line no-param-reassign
	transaction.signatures = [signature];
	return { ...transaction, id: utils.hash(getBytes(transaction, paramsSchema)) };
};

/**
 * Signs a multi-signature transaction.
 *
 * @example
 *  ```ts
 *  import { signMultiSignatureTransaction } from '@liskhq/lisk-transactions';
 *  const signedTransaction = signMultiSignatureTransaction(unsignedTrx, chainID, privateKey, keys, paramsSchema, true);
 *  ```
 *
 * @param transactionObject The unsigned multi-signature transaction object.
 * @param chainID The chain ID of the chain to which the transaction belongs.
 * @param privateKey The private key of the sender of the transaction.
 * @param keys Mandatory and optional keys to sign the transaction.
 * @param paramsSchema The schema for the `params` of the transaction.
 * @param includeSenderSignature `true` if the sender wants to add their signature to the transaction.
 * `false`, if the sender signature should not be included.
 *
 * @returns The signed multi-signature transaction.
 *
 * @see [LIP 0028 - Define schema and use generic serialization for transactions](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0028.md)
 * @see [LIP 0068 - Define new transaction schema](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0068.md)
 * @see [LIP 0062 - Use pre-hashing for signatures](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0062.md)
 */
export const signMultiSignatureTransaction = (
	transactionObject: Record<string, unknown>,
	chainID: Buffer,
	privateKey: Buffer,
	keys: MultiSignatureKeys,
	paramsSchema?: object,
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

	validateTransaction(transactionObject, paramsSchema);

	keys.mandatoryKeys.sort((publicKeyA, publicKeyB) => publicKeyA.compare(publicKeyB));
	keys.optionalKeys.sort((publicKeyA, publicKeyB) => publicKeyA.compare(publicKeyB));

	const signature = ed.signDataWithPrivateKey(
		TAG_TRANSACTION,
		chainID,
		getSigningBytes(transactionObject, paramsSchema),
		privateKey,
	);

	const publicKey = ed.getPublicKeyFromPrivateKey(privateKey);
	const accountKeys = keys.mandatoryKeys.concat(keys.optionalKeys);

	// Find the position for the signature in the signatures array, based on the public key of the signer
	for (let i = 0; i < accountKeys.length; i += 1) {
		if (accountKeys[i].equals(publicKey)) {
			// eslint-disable-next-line no-param-reassign
			transactionObject.signatures[i] = signature;
		} else if (transactionObject.signatures[i] === undefined) {
			// eslint-disable-next-line no-param-reassign
			transactionObject.signatures[i] = Buffer.alloc(0);
		}
	}

	return { ...transactionObject, id: utils.hash(getBytes(transactionObject, paramsSchema)) };
};

/**
 * {@inheritDoc signTransaction}
 *
 * @example
 *  ```ts
 *  import { signTransactionWithPrivateKey } from '@liskhq/lisk-transactions';
 *  const signedTransaction = signTransactionWithPrivateKey(unsignedTrx, chainID, privateKey, paramsSchema);
 *  ```
 *
 * @see [LIP 0028 - Define schema and use generic serialization for transactions](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0028.md)
 * @see [LIP 0068 - Define new transaction schema](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0068.md)
 * @see [LIP 0062 - Use pre-hashing for signatures](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0062.md)
 */
export const signTransactionWithPrivateKey = signTransaction;

/**
 * {@inheritDoc signMultiSignatureTransaction}
 *
 * @example
 *  ```ts
 *  import { signMultiSignatureTransactionWithPrivateKey } from '@liskhq/lisk-transactions';
 *  const signedTransaction = signMultiSignatureTransactionWithPrivateKey(unsignedTrx, chainID, privateKey, keys, paramsSchema, true);
 *  ```
 *
 * @see [LIP 0028 - Define schema and use generic serialization for transactions](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0028.md)
 * @see [LIP 0068 - Define new transaction schema](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0068.md)
 * @see [LIP 0062 - Use pre-hashing for signatures](https://github.com/LiskHQ/lips/blob/main/proposals/lip-0062.md)
 */
export const signMultiSignatureTransactionWithPrivateKey = signMultiSignatureTransaction;

/*
 * Copyright © 2019 Lisk Foundation
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

import {
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPublicKey,
	signData,
	bufferToHex,
	hash,
} from '@liskhq/lisk-cryptography';

import { BaseTransaction, StateStore } from './base_transaction';
import { TransactionError } from './errors';
import { createResponse, TransactionResponse } from './response';
import {
	buildPublicKeyPassphraseDict,
	sortKeysAscending,
	validateKeysSignatures,
	validateSignature,
} from './utils';
import { BaseTransactionInput, AccountAsset } from './types';

export const multisigRegAssetSchema = {
	$id: 'lisk/multisignature-registration-transaction',
	type: 'object',
	required: ['numberOfSignatures', 'optionalKeys', 'mandatoryKeys'],
	properties: {
		numberOfSignatures: {
			dataType: 'uint32',
			fieldNumber: 1,
			minimum: 1,
			maximum: 64,
		},
		mandatoryKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
			minItems: 0,
			maxItems: 64,
			minLength: 32,
			maxLength: 32,
		},
		optionalKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 3,
			minItems: 0,
			maxItems: 64,
			minLength: 32,
			maxLength: 32,
		},
	},
};

const setMemberAccounts = async (
	store: StateStore,
	membersPublicKeys: Array<Readonly<Buffer>>,
): Promise<void> => {
	for (const memberPublicKey of membersPublicKeys) {
		const address = getAddressFromPublicKey(memberPublicKey as Buffer);
		// Key might not exists in the blockchain yet so we fetch or default
		const memberAccount = await store.account.getOrDefault(address);
		store.account.set(memberAccount.address, memberAccount);
	}
};

const hasDuplicateKey = (keys: Buffer[]): boolean => {
	const temp: { [key: string]: boolean | undefined } = {};
	for (const key of keys) {
		if (temp[key.toString('base64')]) {
			return true;
		}
		temp[key.toString('base64')] = true;
	}
	return false;
};

export interface MultiSignatureAsset {
	mandatoryKeys: Array<Readonly<Buffer>>;
	optionalKeys: Array<Readonly<Buffer>>;
	readonly numberOfSignatures: number;
}

export class MultisignatureTransaction extends BaseTransaction {
	public static TYPE = 12;
	public static ASSET_SCHEMA = multisigRegAssetSchema;
	public readonly asset: MultiSignatureAsset;
	private readonly MAX_KEYS_COUNT = 64;

	public constructor(transaction: BaseTransactionInput<MultiSignatureAsset>) {
		super(transaction);

		this.asset = transaction.asset;
	}

	// Verifies multisig signatures as per LIP-0017
	// eslint-disable-next-line @typescript-eslint/require-await
	public async verifySignatures(store: StateStore): Promise<TransactionResponse> {
		const { networkIdentifier } = store.chain;
		const transactionBytes = this.getSigningBytes();
		const transactionWithNetworkIdentifierBytes = Buffer.concat([
			networkIdentifier,
			transactionBytes,
		]);

		const { mandatoryKeys, optionalKeys } = this.asset;

		// For multisig registration we need all signatures to be present
		if (mandatoryKeys.length + optionalKeys.length + 1 !== this.signatures.length) {
			return createResponse(this.id, [new TransactionError('There are missing signatures')]);
		}

		// Check if empty signatures are present
		if (!this.signatures.every(signature => signature.length > 0)) {
			return createResponse(this.id, [
				new TransactionError('A signature is required for each registered key.'),
			]);
		}

		// Verify first signature is from senderPublicKey
		const { valid, error } = validateSignature(
			this.senderPublicKey,
			this.signatures[0] as Buffer,
			transactionWithNetworkIdentifierBytes,
		);

		if (!valid) {
			return createResponse(this.id, [error as TransactionError]);
		}

		// Verify each mandatory key signed in order
		const mandatorySignaturesErrors = validateKeysSignatures(
			mandatoryKeys,
			this.signatures.slice(1, mandatoryKeys.length + 1),
			transactionWithNetworkIdentifierBytes,
		);

		if (mandatorySignaturesErrors.length) {
			return createResponse(this.id, mandatorySignaturesErrors);
		}
		// Verify each optional key signed in order
		const optionalSignaturesErrors = validateKeysSignatures(
			optionalKeys,
			this.signatures.slice(mandatoryKeys.length + 1),
			transactionWithNetworkIdentifierBytes,
		);
		if (optionalSignaturesErrors.length) {
			return createResponse(this.id, optionalSignaturesErrors);
		}

		return createResponse(this.id, []);
	}

	public sign(
		networkIdentifier: Buffer,
		senderPassphrase: string,
		passphrases?: ReadonlyArray<string>,
		keys?: {
			readonly mandatoryKeys: Array<Readonly<Buffer>>;
			readonly optionalKeys: Array<Readonly<Buffer>>;
			readonly numberOfSignatures: number;
		},
	): void {
		// Sort the keys in the transaction
		sortKeysAscending(this.asset.mandatoryKeys);
		sortKeysAscending(this.asset.optionalKeys);

		// Sign with sender
		const { publicKey } = getAddressAndPublicKeyFromPassphrase(senderPassphrase);

		if (!this.senderPublicKey.equals(publicKey)) {
			throw new Error('Transaction senderPublicKey does not match public key from passphrase');
		}

		this.senderPublicKey = publicKey;

		const transactionWithNetworkIdentifierBytes = Buffer.concat([
			networkIdentifier,
			this.getSigningBytes(),
		]);

		this.signatures.push(signData(transactionWithNetworkIdentifierBytes, senderPassphrase));

		// Sign with members
		if (keys && passphrases) {
			const keysAndPassphrases = buildPublicKeyPassphraseDict([...passphrases]);
			// Make sure passed in keys are sorted
			sortKeysAscending(keys.mandatoryKeys);
			sortKeysAscending(keys.optionalKeys);
			// Sign with all keys
			for (const aKey of [...keys.mandatoryKeys, ...keys.optionalKeys]) {
				const senderPublicKeyStr = bufferToHex(aKey as Buffer);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (keysAndPassphrases[senderPublicKeyStr]) {
					const { passphrase } = keysAndPassphrases[senderPublicKeyStr];
					this.signatures.push(signData(transactionWithNetworkIdentifierBytes, passphrase));
				} else {
					// Push an empty signature if a passphrase is missing
					this.signatures.push(Buffer.from(''));
				}
			}
		}
		this._id = hash(this.getBytes());
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const errors = [];

		const { mandatoryKeys, optionalKeys, numberOfSignatures } = this.asset;

		if (hasDuplicateKey(mandatoryKeys as Buffer[])) {
			errors.push(
				new TransactionError(
					'MandatoryKeys contains duplicate public keys',
					this.id,
					'.asset.mandatoryKeys',
				),
			);
		}

		if (hasDuplicateKey(optionalKeys as Buffer[])) {
			errors.push(
				new TransactionError(
					'OptionalKeys contains duplicate public keys',
					this.id,
					'.asset.optionalKeys',
				),
			);
		}

		// Check if key count is less than number of required signatures
		if (mandatoryKeys.length + optionalKeys.length < numberOfSignatures) {
			errors.push(
				new TransactionError(
					'The numberOfSignatures is bigger than the count of Mandatory and Optional keys',
					this.id,
					'.asset.numberOfSignatures',
					this.asset.numberOfSignatures,
				),
			);
		}

		// Check if key count is less than 1
		if (
			mandatoryKeys.length + optionalKeys.length > this.MAX_KEYS_COUNT ||
			mandatoryKeys.length + optionalKeys.length <= 0
		) {
			errors.push(
				new TransactionError(
					'The count of Mandatory and Optional keys should be between 1 and 64',
					this.id,
					'.asset.optionalKeys .asset.mandatoryKeys',
					this.asset.numberOfSignatures,
				),
			);
		}

		// The numberOfSignatures needs to be equal or bigger than number of mandatoryKeys
		if (mandatoryKeys.length > numberOfSignatures) {
			errors.push(
				new TransactionError(
					'The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys',
					this.id,
					'.asset.numberOfSignatures',
					this.asset.numberOfSignatures,
				),
			);
		}

		if (errors.length > 0) {
			return errors;
		}

		// Check if keys are repeated between mandatory and optional key sets
		const repeatedKeys = mandatoryKeys.filter(
			value => optionalKeys.find(optional => optional.equals(value as Buffer)) !== undefined,
		);
		if (repeatedKeys.length > 0) {
			errors.push(
				new TransactionError(
					'Invalid combination of Mandatory and Optional keys',
					this.id,
					'.asset.mandatoryKeys, .asset.optionalKeys',
					repeatedKeys.join(', '),
				),
			);
		}

		if (errors.length > 0) {
			return errors;
		}

		// Check if the length of mandatory, optional and sender keys matches the length of signatures
		if (mandatoryKeys.length + optionalKeys.length + 1 !== this.signatures.length) {
			return [
				new TransactionError(
					'The number of mandatory, optional and sender keys should match the number of signatures',
					this.id,
				),
			];
		}

		// Check keys are sorted lexicographically
		const sortedMandatoryKeys = [...mandatoryKeys].sort((a, b) => a.compare(b as Buffer));
		const sortedOptionalKeys = [...optionalKeys].sort((a, b) => a.compare(b as Buffer));
		for (let i = 0; i < sortedMandatoryKeys.length; i += 1) {
			if (!mandatoryKeys[i].equals(sortedMandatoryKeys[i] as Buffer)) {
				errors.push(
					new TransactionError(
						'Mandatory keys should be sorted lexicographically',
						this.id,
						'.asset.mandatoryKeys',
						mandatoryKeys.join(', '),
					),
				);
				break;
			}
		}

		for (let i = 0; i < sortedOptionalKeys.length; i += 1) {
			if (!optionalKeys[i].equals(sortedOptionalKeys[i] as Buffer)) {
				errors.push(
					new TransactionError(
						'Optional keys should be sorted lexicographically',
						this.id,
						'.asset.optionalKeys',
						optionalKeys.join(', '),
					),
				);
				break;
			}
		}

		return errors;
	}

	protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
		const errors: TransactionError[] = [];
		const sender = await store.account.get<AccountAsset>(this.senderId);

		// Check if multisignatures already exists on account
		if (sender.keys.numberOfSignatures > 0) {
			errors.push(
				new TransactionError(
					'Register multisignature only allowed once per account.',
					this.id,
					'.signatures',
				),
			);
		}

		sender.keys = {
			numberOfSignatures: this.asset.numberOfSignatures,
			mandatoryKeys: this.asset.mandatoryKeys as Buffer[],
			optionalKeys: this.asset.optionalKeys as Buffer[],
		};

		store.account.set(sender.address, sender);

		// Cache all members public keys
		await setMemberAccounts(store, sender.keys.mandatoryKeys);
		await setMemberAccounts(store, sender.keys.optionalKeys);

		return errors;
	}
}

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
import * as BigNum from '@liskhq/bignum';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import {
	BaseTransaction,
	MultisignatureStatus,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { MULTISIGNATURE_FEE } from './constants';
import { SignatureObject } from './create_signature_object';
import {
	convertToAssetError,
	TransactionError,
	TransactionPendingError,
} from './errors';
import { createResponse, Status, TransactionResponse } from './response';
import { TransactionJSON } from './transaction_types';
import { validateMultisignatures, validateSignature, validator } from './utils';

export const multisignatureAssetFormatSchema = {
	type: 'object',
	required: ['min', 'lifetime', 'keysgroup'],
	properties: {
		min: {
			type: 'integer',
			minimum: 1,
			maximum: 15,
		},
		lifetime: {
			type: 'integer',
			minimum: 1,
			maximum: 72,
		},
		keysgroup: {
			type: 'array',
			uniqueItems: true,
			minItems: 1,
			maxItems: 15,
			items: {
				type: 'string',
				format: 'additionPublicKey',
			},
		},
	},
};

const setMemberAccounts = (
	store: StateStore,
	membersPublicKeys: ReadonlyArray<string>,
) => {
	membersPublicKeys.forEach(memberPublicKey => {
		const address = getAddressFromPublicKey(memberPublicKey);
		const memberAccount = store.account.getOrDefault(address);
		const memberAccountWithPublicKey = {
			...memberAccount,
			publicKey: memberAccount.publicKey || memberPublicKey,
		};
		store.account.set(memberAccount.address, memberAccountWithPublicKey);
	});
};

const extractPublicKeysFromAsset = (assetPublicKeys: ReadonlyArray<string>) =>
	assetPublicKeys.map(key => key.substring(1));

export interface MultiSignatureAsset {
	readonly keysgroup: ReadonlyArray<string>;
	readonly lifetime: number;
	readonly min: number;
}

export class MultisignatureTransaction extends BaseTransaction {
	public readonly asset: MultiSignatureAsset;
	public static TYPE = 4;
	public static FEE = MULTISIGNATURE_FEE.toString();
	protected _multisignatureStatus: MultisignatureStatus =
		MultisignatureStatus.PENDING;

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		this.asset = (tx.asset || { multisignature: {} }) as MultiSignatureAsset;
		// Overwrite fee as it is different from the static fee
		this.fee = new BigNum(MultisignatureTransaction.FEE).mul(
			this.asset.keysgroup.length + 1,
		);
	}

	protected assetToBytes(): Buffer {
		const { min, lifetime, keysgroup } = this.asset;
		const minBuffer = Buffer.alloc(1, min);
		const lifetimeBuffer = Buffer.alloc(1, lifetime);
		const keysgroupBuffer = Buffer.from(keysgroup.join(''), 'utf8');

		return Buffer.concat([minBuffer, lifetimeBuffer, keysgroupBuffer]);
	}

	public async prepare(store: StateStorePrepare): Promise<void> {
		const membersAddresses = extractPublicKeysFromAsset(
			this.asset.keysgroup,
		).map(publicKey => ({ address: getAddressFromPublicKey(publicKey) }));

		await store.account.cache([
			{
				address: this.senderId,
			},
			...membersAddresses,
		]);
	}

	protected verifyAgainstTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		const errors = transactions
			.filter(
				tx =>
					tx.type === this.type && tx.senderPublicKey === this.senderPublicKey,
			)
			.map(
				tx =>
					new TransactionError(
						'Register multisignature only allowed once per account.',
						tx.id,
						'.asset.multisignature',
					),
			);

		return errors;
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		validator.validate(multisignatureAssetFormatSchema, this.asset);
		const errors = convertToAssetError(
			this.id,
			validator.errors,
		) as TransactionError[];

		if (errors.length > 0) {
			return errors;
		}

		if (this.asset.min > this.asset.keysgroup.length) {
			errors.push(
				new TransactionError(
					'Invalid multisignature min. Must be less than or equal to keysgroup size',
					this.id,
					'.asset.min',
					this.asset.min,
				),
			);
		}

		return errors;
	}

	public processMultisignatures(_: StateStore): TransactionResponse {
		const transactionBytes = this.getBasicBytes();

		const { valid, errors } = validateMultisignatures(
			this.asset.keysgroup.map(signedPublicKey => signedPublicKey.substring(1)),
			this.signatures,
			// Required to get signature from all of keysgroup
			this.asset.keysgroup.length,
			transactionBytes,
			this.id,
		);
		if (valid) {
			this._multisignatureStatus = MultisignatureStatus.READY;

			return createResponse(this.id, errors);
		}
		if (
			errors &&
			errors.length === 1 &&
			errors[0] instanceof TransactionPendingError
		) {
			this._multisignatureStatus = MultisignatureStatus.PENDING;

			return {
				id: this.id,
				status: Status.PENDING,
				errors,
			};
		}

		this._multisignatureStatus = MultisignatureStatus.FAIL;

		return createResponse(this.id, errors);
	}

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const sender = store.account.get(this.senderId);

		// Check if multisignatures already exists on account
		if (sender.membersPublicKeys && sender.membersPublicKeys.length > 0) {
			errors.push(
				new TransactionError(
					'Register multisignature only allowed once per account.',
					this.id,
					'.signatures',
				),
			);
		}

		// Check if multisignatures includes sender's own publicKey
		if (this.asset.keysgroup.includes(`+${sender.publicKey}`)) {
			errors.push(
				new TransactionError(
					'Invalid multisignature keysgroup. Can not contain sender',
					this.id,
					'.signatures',
				),
			);
		}

		const updatedSender = {
			...sender,
			membersPublicKeys: extractPublicKeysFromAsset(this.asset.keysgroup),
			multiMin: this.asset.min,
			multiLifetime: this.asset.lifetime,
		};
		store.account.set(updatedSender.address, updatedSender);

		setMemberAccounts(store, updatedSender.membersPublicKeys);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const sender = store.account.get(this.senderId);

		const resetSender = {
			...sender,
			membersPublicKeys: [],
			multiMin: 0,
			multiLifetime: 0,
		};

		store.account.set(resetSender.address, resetSender);

		return [];
	}

	public addMultisignature(
		store: StateStore,
		signatureObject: SignatureObject,
	): TransactionResponse {
		// Validate signature key belongs to pending multisig registration transaction
		const keysgroup = this.asset.keysgroup.map((aKey: string) => aKey.slice(1));

		if (!keysgroup.includes(signatureObject.publicKey)) {
			return createResponse(this.id, [
				new TransactionError(
					`Public Key '${signatureObject.publicKey}' is not a member.`,
					this.id,
				),
			]);
		}

		// Check if signature is already present
		if (this.signatures.includes(signatureObject.signature)) {
			return createResponse(this.id, [
				new TransactionError(
					'Encountered duplicate signature in transaction',
					this.id,
				),
			]);
		}

		// Check if signature is valid at all
		const { valid } = validateSignature(
			signatureObject.publicKey,
			signatureObject.signature,
			this.getBasicBytes(),
			this.id,
		);

		if (valid) {
			this.signatures.push(signatureObject.signature);

			return this.processMultisignatures(store);
		}

		// Else populate errors
		const errors = valid
			? []
			: [
					new TransactionError(
						`Failed to add signature ${signatureObject.signature}.`,
						this.id,
						'.signatures',
					),
			  ];

		return createResponse(this.id, errors);
	}
}

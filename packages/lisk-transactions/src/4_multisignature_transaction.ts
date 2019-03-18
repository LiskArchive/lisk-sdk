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
import * as BigNum from 'browserify-bignum';
import {
	BaseTransaction,
	MultisignatureStatus,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { MULTISIGNATURE_FEE } from './constants';
import { SignatureObject } from './create_signature_object';
import {
	TransactionError,
	TransactionMultiError,
	TransactionPendingError,
} from './errors';
import { createResponse, Status, TransactionResponse } from './response';
import { TransactionJSON } from './transaction_types';
import { validateMultisignatures, validateSignature, validator } from './utils';

const TRANSACTION_MULTISIGNATURE_TYPE = 4;

export const multisignatureAssetTypeSchema = {
	type: 'object',
	required: ['multisignature'],
	properties: {
		multisignature: {
			type: 'object',
			required: ['min', 'lifetime', 'keysgroup'],
			properties: {
				min: {
					type: 'integer',
				},
				lifetime: {
					type: 'integer',
				},
				keysgroup: {
					type: 'array',
					items: {
						type: 'string',
					},
				},
			},
		},
	},
};

export const multisignatureAssetFormatSchema = {
	type: 'object',
	required: ['multisignature'],
	properties: {
		multisignature: {
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
		},
	},
};

export interface MultiSignatureAsset {
	readonly multisignature: {
		readonly keysgroup: ReadonlyArray<string>;
		readonly lifetime: number;
		readonly min: number;
	};
}

export class MultisignatureTransaction extends BaseTransaction {
	public readonly asset: MultiSignatureAsset;
	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(
			multisignatureAssetTypeSchema,
			tx.asset,
		);
		const errors = validator.errors
			? validator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							tx.id,
							error.dataPath,
						),
			  )
			: [];

		if (!typeValid) {
			throw new TransactionMultiError('Invalid field types', tx.id, errors);
		}
		this.asset = tx.asset as MultiSignatureAsset;
	}

	protected assetToBytes(): Buffer {
		const {
			multisignature: { min, lifetime, keysgroup },
		} = this.asset;
		const minBuffer = Buffer.alloc(1, min);
		const lifetimeBuffer = Buffer.alloc(1, lifetime);
		const keysgroupBuffer = Buffer.from(keysgroup.join(''), 'utf8');

		return Buffer.concat([minBuffer, lifetimeBuffer, keysgroupBuffer]);
	}

	public assetToJSON(): MultiSignatureAsset {
		return {
			multisignature: {
				min: this.asset.multisignature.min,
				lifetime: this.asset.multisignature.lifetime,
				keysgroup: [...this.asset.multisignature.keysgroup],
			},
		};
	}

	public async prepare(store: StateStorePrepare): Promise<void> {
		await store.account.cache([
			{
				address: this.senderId,
			},
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
		const errors = validator.errors
			? validator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							this.id,
							error.dataPath,
						),
			  )
			: [];

		if (this.type !== TRANSACTION_MULTISIGNATURE_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
		}

		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for multisignature registration transaction',
					this.id,
					'.asset',
				),
			);
		}
		const expectedFee = new BigNum(MULTISIGNATURE_FEE).mul(
			this.asset.multisignature.keysgroup.length + 1,
		);
		if (!this.fee.eq(expectedFee)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${expectedFee.toString()}`,
					this.id,
					'.fee',
				),
			);
		}

		if (
			this.asset.multisignature.min > this.asset.multisignature.keysgroup.length
		) {
			errors.push(
				new TransactionError(
					'Invalid multisignature min. Must be less than or equal to keysgroup size',
					this.id,
					'.asset.multisignature.min',
				),
			);
		}

		if (this.recipientId) {
			errors.push(
				new TransactionError('Invalid recipient', this.id, '.recipientId'),
			);
		}

		if (this.recipientPublicKey) {
			errors.push(
				new TransactionError(
					'Invalid recipientPublicKey',
					this.id,
					'.recipientPublicKey',
				),
			);
		}

		return errors;
	}

	public processMultisignatures(_: StateStore): TransactionResponse {
		const transactionBytes = this.getBasicBytes();

		const { valid, errors } = validateMultisignatures(
			this.asset.multisignature.keysgroup.map(signedPublicKey =>
				signedPublicKey.substring(1),
			),
			this.signatures,
			// Required to get signature from all of keysgroup
			this.asset.multisignature.keysgroup.length,
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
		if (this.asset.multisignature.keysgroup.includes(`+${sender.publicKey}`)) {
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
			membersPublicKeys: this.asset.multisignature.keysgroup.map(key =>
				key.substring(1),
			),
			multiMin: this.asset.multisignature.min,
			multiLifetime: this.asset.multisignature.lifetime,
		};
		store.account.set(updatedSender.address, updatedSender);

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
		const keysgroup = this.asset.multisignature.keysgroup.map((aKey: string) =>
			aKey.slice(1),
		);

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

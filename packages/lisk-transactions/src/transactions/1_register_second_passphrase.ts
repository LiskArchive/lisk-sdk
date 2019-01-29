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
import { getKeys, hexToBuffer } from '@liskhq/lisk-cryptography';
import * as BigNum from 'browserify-bignum';
import { SIGNATURE_FEE } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import {
	Account,
	SecondSignatureAsset,
	Status,
	TransactionJSON,
} from '../transaction_types';
import { validator } from '../utils';
import {
	BaseTransaction,
	createBaseTransaction,
	ENTITY_ACCOUNT,
	StateStore,
	StateStorePrepare,
} from './base';

const TRANSACTION_SIGNATURE_TYPE = 1;

export interface SignatureObject {
	readonly publicKey: string;
}

export interface SecondSignatureAsset {
	readonly signature: SignatureObject;
}

export interface SecondSignatureInput {
	readonly passphrase: string;
	readonly secondPassphrase: string;
	readonly timeOffset?: number;
}

export const secondSignatureAssetTypeSchema = {
	type: 'object',
	required: ['signature'],
	properties: {
		signature: {
			type: 'object',
			required: ['publicKey'],
			properties: {
				publicKey: {
					type: 'string',
				},
			},
		},
	},
};

export const secondSignatureAssetFormatSchema = {
	type: 'object',
	required: ['signature'],
	properties: {
		signature: {
			type: 'object',
			required: ['publicKey'],
			properties: {
				publicKey: {
					type: 'string',
					format: 'publicKey',
				},
			},
		},
	},
};

const validateInputs = ({ secondPassphrase }: SecondSignatureInput): void => {
	if (typeof secondPassphrase !== 'string') {
		throw new Error('Please provide a secondPassphrase. Expected string.');
	}
};

export class SecondSignatureTransaction extends BaseTransaction {
	public readonly asset: SecondSignatureAsset;
	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(
			secondSignatureAssetTypeSchema,
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
		this.asset = tx.asset as SecondSignatureAsset;
		this._fee = new BigNum(SIGNATURE_FEE);
	}

	public static create(input: SecondSignatureInput): object {
		validateInputs(input);
		const { passphrase, secondPassphrase } = input;
		const { publicKey } = getKeys(secondPassphrase);

		const transaction = {
			...createBaseTransaction(input),
			type: 1,
			fee: SIGNATURE_FEE.toString(),
			asset: { signature: { publicKey } },
		};

		if (!passphrase) {
			return transaction;
		}

		const secondSignatureTransaction = new SecondSignatureTransaction(
			transaction as TransactionJSON,
		);
		secondSignatureTransaction.sign(passphrase, secondPassphrase);

		return secondSignatureTransaction.toJSON();
	}

	public static fromJSON(tx: TransactionJSON): SecondSignatureTransaction {
		const transaction = new SecondSignatureTransaction(tx);
		const { errors, status } = transaction.validate();

		if (status === Status.FAIL && errors.length !== 0) {
			throw new TransactionMultiError(
				'Failed to validate schema.',
				tx.id,
				errors,
			);
		}

		return transaction;
	}

	protected getAssetBytes(): Buffer {
		const {
			signature: { publicKey },
		} = this.asset;

		return hexToBuffer(publicKey);
	}

	public assetToJSON(): object {
		return {
			...this.asset,
		};
	}

	public async prepareTransaction(store: StateStorePrepare): Promise<void> {
		await store.prepare(ENTITY_ACCOUNT, {
			address: [this.senderId],
		});
	}

	protected verifyAgainstTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		return transactions
			.filter(
				tx =>
					tx.type === this.type && tx.senderPublicKey === this.senderPublicKey,
			)
			.map(
				tx =>
					new TransactionError(
						'Register second signature only allowed once per account.',
						tx.id,
						'.asset.signature',
					),
			);
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		validator.validate(secondSignatureAssetFormatSchema, this.asset);
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

		if (this.type !== TRANSACTION_SIGNATURE_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
		}

		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for second signature registration transaction',
					this.id,
					'.amount',
				),
			);
		}

		if (!this.fee.eq(SIGNATURE_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${SIGNATURE_FEE}`,
					this.id,
					'.fee',
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

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors = [];
		const sender = store.get<Account>(ENTITY_ACCOUNT, 'address', this.senderId);
		// Check if secondPublicKey already exists on account
		if (sender.secondPublicKey) {
			errors.push(
				new TransactionError(
					'Register second signature only allowed once per account.',
					this.id,
					'.secondPublicKey',
				),
			);
		}
		const updatedSender = {
			...sender,
			secondPublicKey: this.asset.signature.publicKey,
		};
		store.set<Account>(ENTITY_ACCOUNT, updatedSender);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const sender = store.get<Account>(ENTITY_ACCOUNT, 'address', this.senderId);
		const { secondPublicKey, ...strippedSender } = sender;
		store.set<Account>(ENTITY_ACCOUNT, strippedSender);

		return [];
	}
}

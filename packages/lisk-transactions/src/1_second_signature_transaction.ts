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
import { hash, hexToBuffer, signData } from '@liskhq/lisk-cryptography';
import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { SIGNATURE_FEE } from './constants';
import { TransactionError, TransactionMultiError } from './errors';
import { TransactionJSON } from './transaction_types';
import { getId, validator } from './utils';

const TRANSACTION_SIGNATURE_TYPE = 1;

export interface SecondSignatureAsset {
	readonly signature: {
		readonly publicKey: string;
	};
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
	}

	protected assetToBytes(): Buffer {
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
		const errors: TransactionError[] = [];
		const sender = store.account.get(this.senderId);
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
			secondSignature: true,
		};
		store.account.set(updatedSender.address, updatedSender);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const sender = store.account.get(this.senderId);
		const strippedSender = {
			...sender,
			secondPublicKey: undefined,
			secondSignature: false,
		};

		store.account.set(strippedSender.address, strippedSender);

		return [];
	}

	public sign(passphrase: string): void {
		this._signature = undefined;
		this._signSignature = undefined;
		this._signature = signData(hash(this.getBytes()), passphrase);
		this._id = getId(this.getBytes());
	}
}

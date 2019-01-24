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
import BigNum from 'browserify-bignum';
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
	TransactionResponse,
} from './base';

export interface RequiredSecondSignatureState {
	readonly sender: Account;
}

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
		const { errors, status } = transaction.validateSchema();

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

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		const errors = transactions
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

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public validateSchema(): TransactionResponse {
		const { status, errors: baseErrors } = super.validateSchema();
		const errors = [...baseErrors];
		const valid = validator.validate(
			secondSignatureAssetFormatSchema,
			this.asset,
		);
		const assetErrors = validator.errors
			? validator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							this.id,
							error.dataPath,
						),
			  )
			: [];

		errors.push(...assetErrors);

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

		return {
			id: this.id,
			status:
				status === Status.OK && valid && errors.length === 0
					? Status.OK
					: Status.FAIL,
			errors,
		};
	}

	public verify({ sender }: RequiredSecondSignatureState): TransactionResponse {
		const { errors: baseErrors } = super.apply({ sender });
		const errors = [...baseErrors];

		if (sender.secondPublicKey) {
			errors.push(
				new TransactionError(
					'Register second signature only allowed once per account.',
					this.id,
					'.secondPublicKey',
				),
			);
		}

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public apply({ sender }: RequiredSecondSignatureState): TransactionResponse {
		const { errors: baseErrors, state } = super.apply({ sender });
		if (!state) {
			throw new Error('State is required for applying transaction.');
		}
		const errors = [...baseErrors];
		const { sender: updatedSender } = state;

		// Check if secondPublicKey already exists on account
		if (updatedSender.secondPublicKey) {
			errors.push(
				new TransactionError(
					'Register second signature only allowed once per account.',
					this.id,
					'.secondPublicKey',
				),
			);
		}

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			state: {
				sender: {
					...updatedSender,
					secondPublicKey: this.asset.signature.publicKey,
				},
			},
			errors,
		};
	}

	public undo({ sender }: RequiredSecondSignatureState): TransactionResponse {
		const { errors: baseErrors, state } = super.undo({ sender });
		if (!state) {
			throw new Error('State is required for undoing transaction.');
		}
		const errors = [...baseErrors];
		const { sender: updatedSender } = state as { readonly sender: Account };

		const { secondPublicKey, ...strippedSender } = updatedSender;

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			errors,
			state: { sender: strippedSender },
		};
	}
}

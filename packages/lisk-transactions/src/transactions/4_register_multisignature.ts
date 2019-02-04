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
import { MULTISIGNATURE_FEE } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import {
	Account,
	MultiSignatureAsset,
	Status,
	TransactionJSON,
} from '../transaction_types';
import { CreateBaseTransactionInput, validator } from '../utils';
import { BaseTransaction, TransactionResponse } from './base';

const TRANSACTION_MULTISIGNATURE_TYPE = 4;

export interface RequiredMultisignatureState {
	readonly sender: Account;
}

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

export interface CreateMultisignatureInput {
	readonly keysgroup: ReadonlyArray<string>;
	readonly lifetime: number;
	readonly min: number;
}

export type RegisterMultisignatureInput = CreateBaseTransactionInput &
	CreateMultisignatureInput;

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
		this._fee = new BigNum(MULTISIGNATURE_FEE).mul(
			this.asset.multisignature.keysgroup.length + 1,
		);
	}

	protected getAssetBytes(): Buffer {
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
						'Register multisignature only allowed once per account.',
						tx.id,
						'.asset.multisignature',
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
		const valid = validator.validate(
			multisignatureAssetFormatSchema,
			this.asset,
		);
		const errors = [...baseErrors];
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

		if (this.type !== TRANSACTION_MULTISIGNATURE_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
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

		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for multisignature registration transaction',
					this.id,
					'.asset',
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

	public verify({ sender }: RequiredMultisignatureState): TransactionResponse {
		const { errors: baseErrors, state } = super.apply({ sender });
		if (!state) {
			throw new Error('State is required for applying transaction');
		}
		const errors = [...baseErrors];

		// Check if multisignatures already exists on account
		if (
			state.sender.multisignatures &&
			state.sender.multisignatures.length > 0
		) {
			errors.push(
				new TransactionError(
					'Register multisignature only allowed once per account.',
					this.id,
					'.signatures',
				),
			);
		}

		// Check if multisignatures includes sender's own publicKey
		if (
			this.asset.multisignature.keysgroup.includes(`+${state.sender.publicKey}`)
		) {
			errors.push(
				new TransactionError(
					'Invalid multisignature keysgroup. Can not contain sender',
					this.id,
					'.signatures',
				),
			);
		}

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public apply({ sender }: RequiredMultisignatureState): TransactionResponse {
		const { errors: baseErrors, state } = super.apply({ sender });
		if (!state) {
			throw new Error('State is required for applying transaction');
		}
		const errors = [...baseErrors];

		// Check if multisignatures already exists on account
		if (
			state.sender.multisignatures &&
			state.sender.multisignatures.length > 0
		) {
			errors.push(
				new TransactionError(
					'Register multisignature only allowed once per account.',
					this.id,
					'.signatures',
				),
			);
		}

		// Check if multisignatures includes sender's own publicKey
		if (
			this.asset.multisignature.keysgroup.includes(`+${state.sender.publicKey}`)
		) {
			errors.push(
				new TransactionError(
					'Invalid multisignature keysgroup. Can not contain sender',
					this.id,
					'.signatures',
				),
			);
		}

		const updatedSender = {
			...state.sender,
			multisignatures: this.asset.multisignature.keysgroup.map(key =>
				key.substring(1),
			),
			multimin: this.asset.multisignature.min,
			multilifetime: this.asset.multisignature.lifetime,
		};

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			errors,
			state: {
				sender: updatedSender,
			},
		};
	}

	public undo({ sender }: RequiredMultisignatureState): TransactionResponse {
		const { errors: baseErrors, state } = super.undo({ sender });
		if (!state) {
			throw new Error('State is required for undoing transaction');
		}
		const errors = [...baseErrors];

		const {
			multisignatures,
			multimin,
			multilifetime,
			...strippedSender
		} = state.sender;

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			errors,
			state: {
				sender: strippedSender,
			},
		};
	}
}

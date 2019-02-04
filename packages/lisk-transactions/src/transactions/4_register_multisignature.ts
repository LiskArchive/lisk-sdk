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
	MULTISIGNATURE_FEE,
	MULTISIGNATURE_MAX_KEYSGROUP,
	MULTISIGNATURE_MAX_LIFETIME,
	MULTISIGNATURE_MIN_KEYSGROUP,
	MULTISIGNATURE_MIN_LIFETIME,
} from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import {
	Account,
	MultiSignatureAsset,
	Status,
	TransactionJSON,
} from '../transaction_types';
import {
	isValidInteger,
	prependPlusToPublicKeys,
	validateKeysgroup,
	validator,
} from '../utils';
import {
	BaseTransaction,
	createBaseTransaction,
	CreateBaseTransactionInput,
	StateStore,
	StateStoreCache,
} from './base';

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

export interface CreateMultisignatureInput {
	readonly keysgroup: ReadonlyArray<string>;
	readonly lifetime: number;
	readonly min: number;
}

export type RegisterMultisignatureInput = CreateBaseTransactionInput &
	CreateMultisignatureInput;

const validateInput = ({
	keysgroup,
	lifetime,
	min,
}: RegisterMultisignatureInput): void => {
	if (
		!isValidInteger(lifetime) ||
		lifetime < MULTISIGNATURE_MIN_LIFETIME ||
		lifetime > MULTISIGNATURE_MAX_LIFETIME
	) {
		throw new Error(
			`Please provide a valid lifetime value. Expected integer between ${MULTISIGNATURE_MIN_LIFETIME} and ${MULTISIGNATURE_MAX_LIFETIME}.`,
		);
	}

	if (
		!isValidInteger(min) ||
		min < MULTISIGNATURE_MIN_KEYSGROUP ||
		min > MULTISIGNATURE_MAX_KEYSGROUP
	) {
		throw new Error(
			`Please provide a valid minimum value. Expected integer between ${MULTISIGNATURE_MIN_KEYSGROUP} and ${MULTISIGNATURE_MAX_KEYSGROUP}.`,
		);
	}

	if (keysgroup.length < min) {
		throw new Error(
			'Minimum number of signatures is larger than the number of keys in the keysgroup.',
		);
	}
	validateKeysgroup(keysgroup);
};

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

	public static create(input: RegisterMultisignatureInput): object {
		validateInput(input);
		const { keysgroup, lifetime, min, passphrase, secondPassphrase } = input;

		const plusPrependedKeysgroup = prependPlusToPublicKeys(keysgroup);
		const keygroupFees = plusPrependedKeysgroup.length + 1;

		const transaction = {
			...createBaseTransaction(input),
			type: 4,
			fee: (MULTISIGNATURE_FEE * keygroupFees).toString(),
			asset: {
				multisignature: {
					min,
					lifetime,
					keysgroup: plusPrependedKeysgroup,
				},
			},
		};

		if (!passphrase) {
			return transaction;
		}

		const multisignatureTransaction = new MultisignatureTransaction(
			transaction as TransactionJSON,
		);
		multisignatureTransaction.sign(passphrase, secondPassphrase);

		return multisignatureTransaction.toJSON();
	}

	public static fromJSON(tx: TransactionJSON): MultisignatureTransaction {
		const transaction = new MultisignatureTransaction(tx);
		const { errors, status } = transaction.validate();

		if (status === Status.FAIL && errors.length !== 0) {
			throw new TransactionMultiError(
				'Failed to validate schema',
				tx.id,
				errors,
			);
		}

		return transaction;
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

	public async prepareTransaction(store: StateStoreCache): Promise<void> {
		await store.account.cache({
			address: [this.senderId],
		});
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

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const sender = store.account.get<Account>('address', this.senderId); 

		// Check if multisignatures already exists on account
		if (
			sender.multisignatures &&
			sender.multisignatures.length > 0
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
			this.asset.multisignature.keysgroup.includes(`+${sender.publicKey}`)
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
			...sender,
			multisignatures: this.asset.multisignature.keysgroup.map(key =>
				key.substring(1),
			),
			multimin: this.asset.multisignature.min,
			multilifetime: this.asset.multisignature.lifetime,
		};
		store.account.set<Account>(updatedSender);


		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const sender = store.account.get<Account>('address', this.senderId);

		const { multisignatures, multimin, multilifetime, ...strippedSender } = sender;

		store.account.set<Account>(strippedSender);

		return [];
	}
}

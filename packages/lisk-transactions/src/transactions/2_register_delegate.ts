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
import { DELEGATE_FEE, USERNAME_MAX_LENGTH } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import {
	Account,
	DelegateAsset,
	Status,
	TransactionJSON,
} from '../transaction_types';
import { validator } from '../utils';
import {
	BaseTransaction,
	createBaseTransaction,
	CreateBaseTransactionInput,
	ENTITY_ACCOUNT,
	StateStore,
	StateStoreCache,
} from './base';

const TRANSACTION_DELEGATE_TYPE = 2;

export interface RequiredDelegateState {
	readonly sender: Account;
	readonly dependentState?: {
		readonly [ENTITY_ACCOUNT]: ReadonlyArray<Account>;
	};
}

export interface DelegateObject {
	readonly username: string;
}

export interface DelegateAsset {
	readonly delegate: DelegateObject;
}

export const delegateAssetTypeSchema = {
	type: 'object',
	required: ['delegate'],
	properties: {
		delegate: {
			type: 'object',
			required: ['username'],
			properties: {
				username: {
					type: 'string',
				},
			},
		},
	},
};

export const delegateAssetFormatSchema = {
	type: 'object',
	required: ['delegate'],
	properties: {
		delegate: {
			type: 'object',
			required: ['username'],
			properties: {
				username: {
					type: 'string',
					minLength: 1,
					maxLength: 20,
					format: 'username',
				},
			},
		},
	},
};

export interface CreateDelegateRegistrationInput {
	readonly username: string;
}

export type RegisterDelegateInput = CreateBaseTransactionInput &
	CreateDelegateRegistrationInput;

const validateInput = ({ username }: RegisterDelegateInput): void => {
	if (!username || typeof username !== 'string') {
		throw new Error('Please provide a username. Expected string.');
	}
};

export class DelegateTransaction extends BaseTransaction {
	public readonly asset: DelegateAsset;
	public readonly containsUniqueData = true;

	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(delegateAssetTypeSchema, tx.asset);
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
			throw new TransactionMultiError('Invalid field types', tx.id, [
				...errors,
			]);
		}
		this.asset = tx.asset as DelegateAsset;
		this._fee = new BigNum(DELEGATE_FEE);
	}

	public static create(input: RegisterDelegateInput): object {
		validateInput(input);
		const { username, passphrase, secondPassphrase } = input;

		if (!username || typeof username !== 'string') {
			throw new Error('Please provide a username. Expected string.');
		}

		if (username.length > USERNAME_MAX_LENGTH) {
			throw new Error(
				`Username length does not match requirements. Expected to be no more than ${USERNAME_MAX_LENGTH} characters.`,
			);
		}

		const transaction = {
			...createBaseTransaction(input),
			type: 2,
			fee: DELEGATE_FEE.toString(),
			asset: { delegate: { username } },
		};

		if (!passphrase) {
			return transaction;
		}

		const delegateTransaction = new DelegateTransaction(
			transaction as TransactionJSON,
		);
		delegateTransaction.sign(passphrase, secondPassphrase);

		return delegateTransaction.toJSON();
	}

	public static fromJSON(tx: TransactionJSON): DelegateTransaction {
		const transaction = new DelegateTransaction(tx);
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
			delegate: { username },
		} = this.asset;

		return Buffer.from(username, 'utf8');
	}

	public assetToJSON(): DelegateAsset {
		return {
			...this.asset,
		};
	}

	public async prepareTransaction(store: StateStoreCache): Promise<void> {
		await store.account.cache({
			address: [this.senderId],
			username: [this.asset.delegate.username],
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
						'Register delegate only allowed once per account.',
						tx.id,
						'.asset.delegate',
					),
			);
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
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

		if (this.type !== TRANSACTION_DELEGATE_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
		}

		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for delegate registration transaction',
					this.id,
					'.amount',
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

		if (
			store.account.exists('username', this.asset.delegate.username)
		) {
			errors.push(
				new TransactionError(
					`Username is not unique.`,
					this.id,
					'.asset.delegate.username',
				),
			);
		}
		if (sender.isDelegate || sender.username) {
			errors.push(
				new TransactionError(
					'Account is already a delegate',
					this.id,
					'.asset.delegate.username',
				),
			);
		}
		const updatedSender = {
			...sender,
			isDelegate: true,
			username: this.asset.delegate.username,
		};
		store.account.set<Account>(updatedSender);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const sender = store.account.get<Account>('address', this.senderId);
		const { username, ...strippedSender } = sender;
		store.account.set<Account>(strippedSender);

		return [];
	}
}

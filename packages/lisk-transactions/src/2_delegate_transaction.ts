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
import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { DELEGATE_FEE } from './constants';
import { TransactionError, TransactionMultiError } from './errors';
import { Account, TransactionJSON } from './transaction_types';
import { CreateBaseTransactionInput, validator } from './utils';

const TRANSACTION_DELEGATE_TYPE = 2;

export interface DelegateAsset {
	readonly delegate: {
		readonly username: string;
	};
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

export class DelegateTransaction extends BaseTransaction {
	public readonly asset: DelegateAsset;
	public readonly containsUniqueData: boolean;

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
		this.containsUniqueData = true;
	}

	protected assetToBytes(): Buffer {
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

	public async prepare(store: StateStorePrepare): Promise<void> {
		await store.account.cache([
			{
				address: this.senderId,
			},
			{
				username: this.asset.delegate.username,
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
						'Register delegate only allowed once per account.',
						tx.id,
						'.asset.delegate',
					),
			);
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		validator.validate(delegateAssetFormatSchema, this.asset);
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

		if (!this.fee.eq(DELEGATE_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${DELEGATE_FEE}`,
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
		const usernameExists = store.account.find(
			(account: Account) => account.username === this.asset.delegate.username,
		);

		if (usernameExists) {
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
		store.account.set(updatedSender.address, updatedSender);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const sender = store.account.get(this.senderId);
		const { username, ...strippedSender } = sender;
		store.account.set(strippedSender.address, strippedSender);

		return [];
	}
}

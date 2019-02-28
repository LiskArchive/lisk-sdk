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
	ENTITY_ACCOUNT,
	StateStore,
} from './base_transaction';
import { DELEGATE_FEE } from './constants';
import { convertToTransactionError, TransactionError } from './errors';
import { Account, TransactionJSON } from './transaction_types';
import { validator } from './utils';

const TRANSACTION_DELEGATE_TYPE = 2;
const ENTITY_ACCOUNT_USERNAME = 'username:accountId';

export interface DelegateAsset {
	readonly delegate: {
		readonly username: string;
	};
}

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

export class DelegateTransaction extends BaseTransaction {
	public readonly asset: DelegateAsset;
	public readonly containsUniqueData: boolean;

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;
		this.asset = (tx.asset || { delegate: {} }) as DelegateAsset;
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
		const errors = convertToTransactionError(
			this.id,
			validator.errors,
		) as TransactionError[];

		if (this.type !== TRANSACTION_DELEGATE_TYPE) {
			errors.push(
				new TransactionError(
					'Invalid type',
					this.id,
					'.type',
					this.type,
					TRANSACTION_DELEGATE_TYPE,
				),
			);
		}

		if (!this.amount.eq(0)) {
			errors.push(
				new TransactionError(
					'Amount must be zero for delegate registration transaction',
					this.id,
					'.amount',
					this.amount.toString(),
					'0',
				),
			);
		}

		if (!this.fee.eq(DELEGATE_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${DELEGATE_FEE}`,
					this.id,
					'.fee',
					this.fee.toString(),
					DELEGATE_FEE,
				),
			);
		}

		if (this.recipientId) {
			errors.push(
				new TransactionError(
					'RecipientId is expected to be undefined',
					this.id,
					'.recipientId',
					this.recipientId,
				),
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

	protected async applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const errors: TransactionError[] = [];
		const sender = await store.get<Account>(ENTITY_ACCOUNT, this.senderId);
		const usernameExists = await store.exists(
			ENTITY_ACCOUNT_USERNAME,
			this.asset.delegate.username,
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
			username: this.asset.delegate.username,
			vote: 0,
			isDelegate: 1,
		};
		await store.set(ENTITY_ACCOUNT, updatedSender.address, updatedSender);
		await store.set(
			ENTITY_ACCOUNT_USERNAME,
			this.asset.delegate.username,
			updatedSender.address,
		);

		return errors;
	}

	protected async undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const sender = await store.get<Account>(ENTITY_ACCOUNT, this.senderId);
		const resetSender = {
			...sender,
			// tslint:disable-next-line no-null-keyword - Exception for compatibility with Core 1.4
			username: null,
			vote: 0,
			isDelegate: 0,
		};
		await store.set(ENTITY_ACCOUNT, resetSender.address, resetSender);
		await store.unset(ENTITY_ACCOUNT_USERNAME, this.asset.delegate.username);

		return [];
	}
}

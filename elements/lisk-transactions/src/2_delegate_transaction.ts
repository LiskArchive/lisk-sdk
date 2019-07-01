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
import { convertToAssetError, TransactionError } from './errors';
import { Account, TransactionJSON } from './transaction_types';
import { validator } from './utils';

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
	public static TYPE = 2;
	public static FEE = DELEGATE_FEE.toString();

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
		return this.asset;
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
		const errors = convertToAssetError(
			this.id,
			validator.errors,
		) as TransactionError[];

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
			username: this.asset.delegate.username,
			vote: 0,
			isDelegate: 1,
		};
		store.account.set(updatedSender.address, updatedSender);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const sender = store.account.get(this.senderId);
		const { username, ...strippedSender } = sender;
		const resetSender = {
			...sender,
			// tslint:disable-next-line no-null-keyword - Exception for compatibility with Core 1.4
			username: null,
			vote: 0,
			isDelegate: 0,
		};
		store.account.set(strippedSender.address, resetSender);

		return [];
	}

	// tslint:disable:next-line: prefer-function-over-method no-any
	protected assetFromSync(raw: any): object | undefined {
		if (!raw.d_username) {
			return undefined;
		}
		const delegate = {
			username: raw.d_username,
			publicKey: raw.t_senderPublicKey,
			address: raw.t_senderId,
		};

		return { delegate };
	}
}

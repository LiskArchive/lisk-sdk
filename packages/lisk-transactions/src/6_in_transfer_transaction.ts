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
import * as BigNum from '@liskhq/bignum';
import {
	BaseTransaction,
	StateStore,
	StateStorePrepare,
} from './base_transaction';
import { IN_TRANSFER_FEE } from './constants';
import { convertToTransactionError, TransactionError } from './errors';
import { TransactionJSON } from './transaction_types';
import { convertBeddowsToLSK, verifyAmountBalance } from './utils';
import { validator } from './utils/validation';

const TRANSACTION_DAPP_TYPE = 5;
const TRANSACTION_INTRANSFER_TYPE = 6;

export interface InTransferAsset {
	readonly inTransfer: {
		readonly dappId: string;
	};
}

export const inTransferAssetFormatSchema = {
	type: 'object',
	required: ['inTransfer'],
	properties: {
		inTransfer: {
			type: 'object',
			required: ['dappId'],
			properties: {
				dappId: {
					type: 'string',
					format: 'id',
				},
			},
		},
	},
};

export class InTransferTransaction extends BaseTransaction {
	public readonly asset: InTransferAsset;

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;

		this.asset = (tx.asset || { inTransfer: {} }) as InTransferAsset;
	}

	protected assetToBytes(): Buffer {
		return Buffer.from(this.asset.inTransfer.dappId, 'utf8');
	}

	public async prepare(store: StateStorePrepare): Promise<void> {
		await store.account.cache([{ address: this.senderId }]);

		const transactions = await store.transaction.cache([
			{
				id: this.asset.inTransfer.dappId,
			},
		]);

		const dappTransaction =
			transactions && transactions.length > 0
				? transactions.find(
						tx =>
							tx.type === TRANSACTION_DAPP_TYPE &&
							tx.id === this.asset.inTransfer.dappId,
				  )
				: undefined;

		if (dappTransaction) {
			await store.account.cache([{ id: dappTransaction.senderId as string }]);
		}
	}

	public assetToJSON(): object {
		return {
			...this.asset,
		};
	}

	// tslint:disable-next-line prefer-function-over-method
	protected verifyAgainstTransactions(
		_: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		return [];
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		validator.validate(inTransferAssetFormatSchema, this.asset);
		const errors = convertToTransactionError(
			this.id,
			validator.errors,
		) as TransactionError[];

		if (this.type !== TRANSACTION_INTRANSFER_TYPE) {
			errors.push(
				new TransactionError(
					'Invalid type',
					this.id,
					'.type',
					this.type,
					TRANSACTION_INTRANSFER_TYPE,
				),
			);
		}

		// Per current protocol, this recipientId and recipientPublicKey must be empty
		if (this.recipientId) {
			errors.push(
				new TransactionError(
					'RecipientId is expected to be undefined.',
					this.id,
					'.recipientId',
					this.recipientId,
				),
			);
		}

		if (this.recipientPublicKey) {
			errors.push(
				new TransactionError(
					'RecipientPublicKey is expected to be undefined.',
					this.id,
					'.recipientPublicKey',
					this.recipientPublicKey,
				),
			);
		}

		if (this.amount.lte(0)) {
			errors.push(
				new TransactionError(
					'Amount must be greater than 0',
					this.id,
					'.amount',
					this.amount.toString(),
					'0',
				),
			);
		}

		if (!this.fee.eq(IN_TRANSFER_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${IN_TRANSFER_FEE}`,
					this.id,
					'.fee',
					this.fee.toString(),
					IN_TRANSFER_FEE,
				),
			);
		}

		return errors;
	}

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const idExists = store.transaction.find(
			(transaction: TransactionJSON) =>
				transaction.type === TRANSACTION_DAPP_TYPE &&
				transaction.id === this.asset.inTransfer.dappId,
		);

		if (!idExists) {
			errors.push(
				new TransactionError(
					`Application not found: ${this.asset.inTransfer.dappId}`,
					this.id,
					this.asset.inTransfer.dappId,
				),
			);
		}
		const sender = store.account.get(this.senderId);

		const balanceError = verifyAmountBalance(
			this.id,
			sender,
			this.amount,
			this.fee,
		);
		if (balanceError) {
			errors.push(balanceError);
		}

		const updatedBalance = new BigNum(sender.balance).sub(this.amount);

		const updatedSender = { ...sender, balance: updatedBalance.toString() };

		store.account.set(updatedSender.address, updatedSender);

		const dappTransaction = store.transaction.get(this.asset.inTransfer.dappId);

		const recipient = store.account.get(dappTransaction.senderId as string);

		const updatedRecipientBalance = new BigNum(recipient.balance).add(
			this.amount,
		);
		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};

		store.account.set(updatedRecipient.address, updatedRecipient);

		return errors;
	}

	protected undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors = [];
		const sender = store.account.get(this.senderId);
		const updatedBalance = new BigNum(sender.balance).add(this.amount);
		const updatedSender = { ...sender, balance: updatedBalance.toString() };

		store.account.set(updatedSender.address, updatedSender);

		const dappTransaction = store.transaction.get(this.asset.inTransfer.dappId);

		const recipient = store.account.get(dappTransaction.senderId as string);

		const updatedRecipientBalance = new BigNum(recipient.balance).sub(
			this.amount,
		);

		if (updatedRecipientBalance.lt(0)) {
			errors.push(
				new TransactionError(
					`Account does not have enough LSK: ${
						recipient.address
					}, balance: ${convertBeddowsToLSK(recipient.balance)}.`,
					this.id,
				),
			);
		}
		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};

		store.account.set(updatedRecipient.address, updatedRecipient);

		return errors;
	}
}

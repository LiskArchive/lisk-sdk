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
import { MAX_TRANSACTION_AMOUNT, OUT_TRANSFER_FEE } from './constants';
import { convertToAssetError, TransactionError } from './errors';
import { TransactionJSON } from './transaction_types';
import { verifyAmountBalance } from './utils';
import { validator } from './utils/validation';

const TRANSACTION_OUTTRANSFER_TYPE = 7;
const TRANSACTION_DAPP_REGISTERATION_TYPE = 5;

export interface OutTransferAsset {
	readonly outTransfer: {
		readonly dappId: string;
		readonly transactionId: string;
	};
}

export const outTransferAssetFormatSchema = {
	type: 'object',
	required: ['outTransfer'],
	properties: {
		outTransfer: {
			type: 'object',
			required: ['dappId', 'transactionId'],
			properties: {
				dappId: {
					type: 'string',
					format: 'id',
				},
				transactionId: {
					type: 'string',
					format: 'id',
				},
			},
		},
	},
};

export class OutTransferTransaction extends BaseTransaction {
	public readonly asset: OutTransferAsset;
	public readonly containsUniqueData: boolean;

	public constructor(rawTransaction: unknown) {
		super(rawTransaction);
		const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
			? rawTransaction
			: {}) as Partial<TransactionJSON>;

		this.asset = (tx.asset || { outTransfer: {} }) as OutTransferAsset;
		this.containsUniqueData = true;
	}

	public async prepare(store: StateStorePrepare): Promise<void> {
		await store.account.cache([
			{
				address: this.senderId,
			},
			{ address: this.recipientId },
		]);

		await store.transaction.cache([
			{
				id: this.asset.outTransfer.dappId,
			},
			{ id: this.asset.outTransfer.transactionId },
		]);
	}

	protected assetToBytes(): Buffer {
		const { dappId, transactionId } = this.asset.outTransfer;
		const outAppIdBuffer = Buffer.from(dappId, 'utf8');
		const outTransactionIdBuffer = Buffer.from(transactionId, 'utf8');

		return Buffer.concat([outAppIdBuffer, outTransactionIdBuffer]);
	}

	public assetToJSON(): object {
		return this.asset;
	}

	protected verifyAgainstTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		const sameTypeTransactions = transactions.filter(
			tx =>
				tx.type === this.type &&
				'outTransfer' in tx.asset &&
				this.asset.outTransfer.transactionId ===
					(tx.asset as OutTransferAsset).outTransfer.transactionId,
		);

		return sameTypeTransactions.length > 0
			? [
					new TransactionError(
						'Out Transfer cannot refer to the same transactionId',
						this.id,
						'.asset.outTransfer.transactionId',
					),
			  ]
			: [];
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		validator.validate(outTransferAssetFormatSchema, this.asset);
		const errors = convertToAssetError(
			this.id,
			validator.errors,
		) as TransactionError[];

		if (this.type !== TRANSACTION_OUTTRANSFER_TYPE) {
			errors.push(
				new TransactionError(
					'Invalid type',
					this.id,
					'.type',
					this.type,
					TRANSACTION_OUTTRANSFER_TYPE,
				),
			);
		}

		// Amount has to be greater than 0
		if (this.amount.lte(0)) {
			errors.push(
				new TransactionError(
					'Amount must be greater than zero for outTransfer transaction',
					this.id,
					'.amount',
					this.amount.toString(),
				),
			);
		}

		if (!this.fee.eq(OUT_TRANSFER_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${OUT_TRANSFER_FEE}`,
					this.id,
					'.fee',
					this.fee.toString(),
					OUT_TRANSFER_FEE,
				),
			);
		}

		if (this.recipientId === '') {
			errors.push(
				new TransactionError(
					'RecipientId must be set for outTransfer transaction',
					this.id,
					'.recipientId',
					this.recipientId,
				),
			);
		}

		return errors;
	}

	protected applyAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const dappRegistrationTransaction = store.transaction.get(
			this.asset.outTransfer.dappId,
		);

		if (
			!dappRegistrationTransaction ||
			dappRegistrationTransaction.type !== TRANSACTION_DAPP_REGISTERATION_TYPE
		) {
			errors.push(
				new TransactionError(
					`Application not found: ${this.asset.outTransfer.dappId}`,
					this.id,
					'.asset.outTransfer.dappId',
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

		const recipient = store.account.getOrDefault(this.recipientId);

		const updatedRecipientBalance = new BigNum(recipient.balance).add(
			this.amount,
		);

		if (updatedRecipientBalance.gt(MAX_TRANSACTION_AMOUNT)) {
			errors.push(new TransactionError('Invalid amount', this.id, '.amount'));
		}

		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};

		store.account.set(updatedRecipient.address, updatedRecipient);

		return errors;
	}

	public undoAsset(store: StateStore): ReadonlyArray<TransactionError> {
		const errors: TransactionError[] = [];
		const sender = store.account.get(this.senderId);
		const updatedBalance = new BigNum(sender.balance).add(this.amount);

		if (updatedBalance.gt(MAX_TRANSACTION_AMOUNT)) {
			errors.push(
				new TransactionError(
					'Invalid amount',
					this.id,
					'.amount',
					this.amount.toString(),
				),
			);
		}

		const updatedSender = { ...sender, balance: updatedBalance.toString() };
		store.account.set(updatedSender.address, updatedSender);

		const recipient = store.account.getOrDefault(this.recipientId);

		const updatedRecipientBalance = new BigNum(recipient.balance).sub(
			this.amount,
		);

		if (updatedRecipientBalance.lt(0)) {
			errors.push(
				new TransactionError(
					`Account does not have enough LSK: ${recipient.address}, balance: ${
						recipient.balance
					}`,
					this.id,
					updatedRecipientBalance.toString(),
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

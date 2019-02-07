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
import { OUT_TRANSFER_FEE } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import { Account, Status, TransactionJSON } from '../transaction_types';
import { convertBeddowsToLSK } from '../utils';
import { isTypedObjectArrayWithKeys, validator } from '../utils/validation';
import {
	Attributes,
	BaseTransaction,
	ENTITY_ACCOUNT,
	ENTITY_TRANSACTION,
	EntityMap,
	RequiredState,
	TransactionResponse,
} from './base';

const TRANSACTION_OUTTRANSFER_TYPE = 7;
const TRANSACTION_DAPP_REGISTER = 5;

export interface OutTransferAsset {
	readonly outTransfer: {
		readonly dappId: string;
		readonly transactionId: string;
	};
}

export interface RequiredOutTransferState extends RequiredState {
	readonly recipient?: Account;
	readonly dependentState?: {
		readonly [ENTITY_TRANSACTION]: ReadonlyArray<TransactionJSON>;
	};
}

export const outTransferAssetTypeSchema = {
	type: 'object',
	required: ['outTransfer'],
	properties: {
		outTransfer: {
			type: 'object',
			required: ['dappId', 'transactionId'],
			properties: {
				dappId: {
					type: 'string',
				},
				transactionId: {
					type: 'string',
				},
			},
		},
	},
};

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

	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(outTransferAssetTypeSchema, tx.asset);
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
		this.asset = tx.asset as OutTransferAsset;
		this._fee = new BigNum(OUT_TRANSFER_FEE);
		this.containsUniqueData = true;
	}

	public static fromJSON(tx: TransactionJSON): OutTransferTransaction {
		const transaction = new OutTransferTransaction(tx);
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
		const { dappId, transactionId } = this.asset.outTransfer;
		const outAppIdBuffer = Buffer.from(dappId, 'utf8');
		const outTransactionIdBuffer = Buffer.from(transactionId, 'utf8');

		return Buffer.concat([outAppIdBuffer, outTransactionIdBuffer]);
	}

	public assetToJSON(): object {
		return {
			...this.asset,
		};
	}

	public getRequiredAttributes(): Attributes {
		const attr = super.getRequiredAttributes();
		const accounts = {
			...attr[ENTITY_ACCOUNT],
			address: [...attr[ENTITY_ACCOUNT].address, this.recipientId],
		};

		return {
			[ENTITY_ACCOUNT]: {
				...accounts,
			},
			[ENTITY_TRANSACTION]: {
				id: [this.asset.outTransfer.dappId],
				outTransactionId: [this.asset.outTransfer.transactionId],
			},
		};
	}

	public verifyAgainstOtherTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		const sameTypeTransactions = transactions
			.filter(
				tx =>
					tx.type === this.type &&
					'outTransfer' in tx.asset &&
					this.asset.outTransfer.transactionId ===
						tx.asset.outTransfer.transactionId,
			)
			.map(tx => new OutTransferTransaction(tx));

		return {
			id: this.id,
			status: sameTypeTransactions.length === 0 ? Status.OK : Status.FAIL,
			errors:
				sameTypeTransactions.length === 0
					? []
					: [
							new TransactionError(
								'Out Transfer cannot refer to the same transactionId',
								this.id,
								'.asset.outTransfer.transactionId',
							),
					  ],
		};
	}

	public processRequiredState(state: EntityMap): RequiredOutTransferState {
		const accounts = state[ENTITY_ACCOUNT];
		if (!accounts) {
			throw new Error('Entity account is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<Account>(accounts, ['address', 'balance'])
		) {
			throw new Error('Required state does not have valid account type.');
		}

		const sender = accounts.find(acct => acct.address === this.senderId);
		if (!sender) {
			throw new Error('No sender account is found.');
		}
		const recipient = accounts.find(acct => acct.address === this.recipientId);
		if (!recipient) {
			throw new Error('No recipient account is found.');
		}
		const transactions = state[ENTITY_TRANSACTION];
		if (!transactions) {
			throw new Error('Entity transaction is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<TransactionJSON>(transactions, ['id', 'type'])
		) {
			throw new Error('Required state does not have valid transaction type.');
		}
		const relatedTransactions = transactions.filter(
			tx =>
				tx.id === this.asset.outTransfer.dappId ||
				tx.id === this.asset.outTransfer.transactionId,
		);

		return {
			sender,
			recipient,
			dependentState: {
				[ENTITY_TRANSACTION]: relatedTransactions,
			},
		};
	}

	public validateSchema(): TransactionResponse {
		const { errors: baseErrors, status } = super.validateSchema();
		const valid = validator.validate(outTransferAssetFormatSchema, this.asset);
		const errors = [...baseErrors];

		if (this.type !== TRANSACTION_OUTTRANSFER_TYPE) {
			errors.push(new TransactionError('Invalid type', this.id, '.type'));
		}

		// Amount has to be greater than 0
		if (this.amount.lte(0)) {
			errors.push(
				new TransactionError(
					'Amount must be greater than zero for outTransfer transaction',
					this.id,
					'.amount',
				),
			);
		}

		if (!this.fee.eq(OUT_TRANSFER_FEE)) {
			errors.push(
				new TransactionError(
					'Amount must be set fee for outTransfer transaction',
					this.id,
					'.fee',
				),
			);
		}

		if (this.recipientId === '') {
			errors.push(
				new TransactionError(
					'RecipientId must be set for outTransfer transaction',
					this.id,
					'.recipientId',
				),
			);
		}

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

		return {
			id: this.id,
			status:
				status === Status.OK && valid && errors.length === 0
					? Status.OK
					: Status.FAIL,
			errors,
		};
	}

	public verify({
		sender,
		dependentState,
	}: RequiredOutTransferState): TransactionResponse {
		const { errors: baseErrors } = super.verify({ sender });
		if (!dependentState) {
			throw new Error(
				'Dependent state is required for outTransfer transaction.',
			);
		}
		const errors = [...baseErrors];
		const dependentTransactions = dependentState[ENTITY_TRANSACTION];
		if (!dependentTransactions) {
			throw new Error('Entity transaction is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<TransactionJSON>(dependentTransactions, [
				'id',
				'type',
				'asset',
			])
		) {
			throw new Error('Required state does not have valid transaction type.');
		}

		const registerDappTx = dependentTransactions.find(
			tx =>
				tx.type === TRANSACTION_DAPP_REGISTER &&
				tx.id === this.asset.outTransfer.dappId,
		);
		if (registerDappTx) {
			if (
				registerDappTx.senderId &&
				registerDappTx.senderId !== this.senderId
			) {
				errors.push(
					new TransactionError(
						`Out transaction must be sent from owner of the Dapp.`,
						this.id,
					),
				);
			}
		} else {
			errors.push(
				new TransactionError(
					`Related Dapp ${this.asset.outTransfer.dappId} not found.`,
					this.id,
				),
			);
		}

		const outTransferTxs = dependentTransactions.filter(
			tx =>
				tx.type === this.type &&
				'outTransfer' in tx.asset &&
				tx.asset.outTransfer.transactionId ===
					this.asset.outTransfer.transactionId,
		);

		if (outTransferTxs.length > 0) {
			errors.push(
				new TransactionError(
					`Transaction ${
						this.asset.outTransfer.transactionId
					} is already processed.`,
					this.id,
				),
			);
		}

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public apply({
		sender,
		recipient,
	}: RequiredOutTransferState): TransactionResponse {
		const { errors: baseErrors } = super.apply({ sender });
		const errors = [...baseErrors];
		const updatedBalance = new BigNum(sender.balance)
			.sub(this.fee)
			.sub(this.amount);
		if (updatedBalance.lt(0)) {
			errors.push(
				new TransactionError(
					`Account does not have enough LSK: ${
						sender.address
					}, balance: ${convertBeddowsToLSK(sender.balance)}.`,
					this.id,
				),
			);
		}
		const updatedSender = { ...sender, balance: updatedBalance.toString() };
		if (!recipient) {
			throw new Error('Recipient is required.');
		}
		const recipientAccount =
			recipient.address === updatedSender.address ? updatedSender : recipient;

		const updatedRecipientBalance = new BigNum(recipientAccount.balance).add(
			this.amount,
		);
		const updatedRecipient = {
			...recipientAccount,
			balance: updatedRecipientBalance.toString(),
		};

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
			state: {
				sender:
					recipient.address === updatedSender.address
						? updatedRecipient
						: updatedSender,
				recipient: updatedRecipient,
			},
		};
	}

	public undo({
		sender,
		recipient,
	}: RequiredOutTransferState): TransactionResponse {
		const { errors: baseErrors } = super.undo({ sender });
		const errors = [...baseErrors];
		// Ignore state from the base transaction
		const updatedBalance = new BigNum(sender.balance)
			.add(this.fee)
			.add(this.amount);
		const updatedSender = { ...sender, balance: updatedBalance.toString() };
		if (!recipient) {
			throw new Error('Recipient is required.');
		}
		const recipientAccount =
			recipient.address === updatedSender.address ? updatedSender : recipient;

		const updatedRecipientBalance = new BigNum(recipientAccount.balance).sub(
			this.amount,
		);
		if (updatedRecipientBalance.lt(0)) {
			errors.push(
				new TransactionError(
					`Account does not have enough LSK: ${
						recipientAccount.address
					}, balance: ${convertBeddowsToLSK(recipient.balance)}.`,
					this.id,
				),
			);
		}
		const updatedRecipient = {
			...recipientAccount,
			balance: updatedRecipientBalance.toString(),
		};

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
			state: {
				sender:
					recipient.address === updatedSender.address
						? updatedRecipient
						: updatedSender,
				recipient: updatedRecipient,
			},
		};
	}
}

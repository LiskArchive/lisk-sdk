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
import BigNum from 'browserify-bignum';
import { IN_TRANSFER_FEE } from '../constants';
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

export interface InTransferAsset {
	readonly inTransfer: {
		readonly dappId: string;
	};
}

export interface RequiredInTransferState extends RequiredState {
	readonly recipient?: Account;
	readonly dependentState?: {
		readonly [ENTITY_TRANSACTION]: ReadonlyArray<TransactionJSON>;
	};
}

export const inTransferAssetTypeSchema = {
	type: 'object',
	required: ['inTransfer'],
	properties: {
		inTransfer: {
			type: 'object',
			required: ['dappId'],
			properties: {
				dappId: {
					type: 'string',
				},
			},
		},
	},
};

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
	public readonly fee: BigNum = new BigNum(IN_TRANSFER_FEE);

	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(inTransferAssetTypeSchema, tx.asset);
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
		this.asset = tx.asset as InTransferAsset;
	}

	public static fromJSON(tx: TransactionJSON): InTransferTransaction {
		const transaction = new InTransferTransaction(tx);
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
		return Buffer.from(this.asset.inTransfer.dappId, 'utf8');
	}

	public assetToJSON(): object {
		return {
			...this.asset,
		};
	}

	public getRequiredAttributes(): Attributes {
		const attr = super.getRequiredAttributes();

		return {
			...attr,
			[ENTITY_TRANSACTION]: {
				id: [this.asset.inTransfer.dappId],
			},
		};
	}

	public verifyAgainstOtherTransactions(
		_: ReadonlyArray<TransactionJSON>,
	): TransactionResponse {
		return {
			id: this.id,
			errors: [],
			status: Status.OK,
		};
	}

	public processRequiredState(state: EntityMap): RequiredInTransferState {
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

		const transactions = state[ENTITY_TRANSACTION];
		if (!transactions) {
			throw new Error('Entity transaction is required.');
		}

		if (
			!isTypedObjectArrayWithKeys<TransactionJSON>(transactions, [
				'id',
				'type',
				'senderId',
			])
		) {
			throw new Error('Required state does not have valid transaction type.');
		}

		// In valid case, transaction should not exist
		const dependentDappTx = transactions.find(
			tx => tx.id === this.asset.inTransfer.dappId,
		);

		const recipient = dependentDappTx
			? accounts.find(acct => acct.address === dependentDappTx.senderId)
			: undefined;

		return {
			sender,
			recipient,
			dependentState: {
				[ENTITY_TRANSACTION]: dependentDappTx ? [dependentDappTx] : [],
			},
		};
	}

	public validateSchema(): TransactionResponse {
		const { errors: baseErrors, status } = super.validateSchema();
		const valid = validator.validate(inTransferAssetFormatSchema, this.asset);
		const errors = [...baseErrors];
		// Per current protocol, this recipientId and recipientPublicKey must be empty
		if (this.recipientId) {
			errors.push(
				new TransactionError(
					'Recipient id must be empty',
					this.id,
					'.recipientId',
				),
			);
		}
		if (this.recipientPublicKey) {
			errors.push(
				new TransactionError(
					'Recipient public key must be empty',
					this.id,
					'.recipientPublicKey',
				),
			);
		}

		if (this.amount.lte(0)) {
			errors.push(
				new TransactionError(
					'Amount must be greater than 0',
					this.id,
					'.amount',
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

		if (!this.fee.eq(IN_TRANSFER_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${IN_TRANSFER_FEE}`,
					this.id,
					'.fee',
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

	public verify({
		sender,
		recipient,
		dependentState,
	}: RequiredInTransferState): TransactionResponse {
		const { errors: baseErrors } = super.apply({ sender });
		if (!dependentState) {
			throw new Error(
				'Dependent state is required for inTransfer transaction.',
			);
		}
		const errors = [...baseErrors];
		const balance = new BigNum(sender.balance);
		const fee = new BigNum(this.fee);
		const amount = new BigNum(this.amount);
		if (
			balance
				.sub(fee)
				.sub(amount)
				.lt(0)
		) {
			errors.push(
				new TransactionError(
					`Account does not have enough LSK: ${
						sender.address
					}, balance: ${convertBeddowsToLSK(sender.balance)}.`,
					this.id,
				),
			);
		}

		const dependentTransactions = dependentState[ENTITY_TRANSACTION];
		if (!dependentTransactions) {
			throw new Error('Entity transaction is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<TransactionJSON>(dependentTransactions, [
				'id',
				'senderId',
			])
		) {
			throw new Error('Required state does not have valid transaction type.');
		}

		const dependentDappTx = dependentTransactions.find(
			tx => tx.id === this.asset.inTransfer.dappId,
		);

		if (!dependentDappTx) {
			errors.push(
				new TransactionError(
					`Related transaction ${this.asset.inTransfer.dappId} does not exist.`,
					this.id,
				),
			);
		}

		if (dependentDappTx && !recipient) {
			errors.push(
				new TransactionError(
					`Dapp owner account ${dependentDappTx.senderId} does not exist.`,
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
	}: RequiredInTransferState): TransactionResponse {
		const { errors: baseErrors } = super.apply({ sender });
		const errors = [...baseErrors];
		// Ignore state from the base transaction
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

		const updatedRecipientBalance = new BigNum(recipient.balance).add(
			this.amount,
		);
		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
			state: {
				sender: updatedSender,
				recipient: updatedRecipient,
			},
		};
	}

	public undo({
		sender,
		recipient,
	}: RequiredInTransferState): TransactionResponse {
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

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
			state: {
				sender: updatedSender,
				recipient: updatedRecipient,
			},
		};
	}
}

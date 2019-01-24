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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import BigNum from 'browserify-bignum';
import { BYTESIZES, MAX_TRANSACTION_AMOUNT, TRANSFER_FEE } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import {
	Account,
	Status,
	TransactionJSON,
	TransferAsset,
} from '../transaction_types';
import {
	isTypedObjectArrayWithKeys,
	validateAddress,
	validatePublicKey,
	validateTransferAmount,
	validator,
} from '../utils';
import {
	Attributes,
	BaseTransaction,
	createBaseTransaction,
	ENTITY_ACCOUNT,
	EntityMap,
	TransactionResponse,
} from './base';

export interface TransferInput {
	readonly amount: string;
	readonly recipientId?: string;
	readonly recipientPublicKey?: string;
	readonly data?: string;
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
}

export interface RequiredTransferState {
	readonly sender: Account;
	readonly recipient: Account;
}

export interface TransferAsset {
	readonly data: string;
}

export const transferAssetTypeSchema = {
	type: 'object',
	properties: {
		data: {
			type: 'string',
		},
	},
};

export const transferAssetFormatSchema = {
	type: 'object',
	properties: {
		data: {
			type: 'string',
			maxLength: 64,
		},
	},
};

const validateInputs = ({
	amount,
	recipientId,
	recipientPublicKey,
	data,
}: TransferInput): void => {
	if (!validateTransferAmount(amount)) {
		throw new Error('Amount must be a valid number in string format.');
	}

	if (!recipientId) {
		throw new Error('`recipientId` must be provided.');
	}

	validateAddress(recipientId);

	if (typeof recipientPublicKey !== 'undefined') {
		validatePublicKey(recipientPublicKey);
	}

	if (
		recipientPublicKey &&
		recipientId !== getAddressFromPublicKey(recipientPublicKey)
	) {
		throw new Error('recipientId does not match recipientPublicKey.');
	}

	if (data && data.length > 0) {
		if (typeof data !== 'string') {
			throw new Error(
				'Invalid encoding in transaction data. Data must be utf-8 encoded string.',
			);
		}
		if (data.length > BYTESIZES.DATA) {
			throw new Error('Transaction data field cannot exceed 64 bytes.');
		}
	}
};

export class TransferTransaction extends BaseTransaction {
	public readonly asset: TransferAsset;

	public constructor(tx: TransactionJSON) {
		super(tx);
		const typeValid = validator.validate(transferAssetTypeSchema, tx.asset);
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
		if (!typeValid || errors.length > 0) {
			throw new TransactionMultiError('Invalid asset types', tx.id, errors);
		}
		this.asset = tx.asset as TransferAsset;
		this._fee = new BigNum(TRANSFER_FEE); 
	}

	public static create(input: TransferInput): object {
		validateInputs(input);
		const {
			amount,
			recipientId: recipientIdInput,
			recipientPublicKey,
			data,
			passphrase,
			secondPassphrase,
		} = input;

		const recipientIdFromPublicKey = recipientPublicKey
			? getAddressFromPublicKey(recipientPublicKey)
			: undefined;

		const recipientId = recipientIdInput
			? recipientIdInput
			: recipientIdFromPublicKey;

		const transaction = {
			...createBaseTransaction(input),
			type: 0,
			amount,
			recipientId,
			recipientPublicKey,
			fee: TRANSFER_FEE.toString(),
			asset: data ? { data } : {},
		};

		if (!passphrase) {
			return transaction;
		}

		const transactionWithSenderInfo = {
			...transaction,
			// SenderId and SenderPublicKey are expected to be exist from base transaction
			recipientId: recipientId as string,
			senderId: transaction.senderId as string,
			senderPublicKey: transaction.senderPublicKey as string,
		};

		const transferTransaction = new TransferTransaction(
			transactionWithSenderInfo,
		);
		transferTransaction.sign(passphrase, secondPassphrase);

		return transferTransaction.toJSON();
	}

	public static fromJSON(tx: TransactionJSON): TransferTransaction {
		const transaction = new TransferTransaction(tx);
		const { errors, status } = transaction.validateSchema();

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
		const { data } = this.asset;

		return data ? Buffer.from(data, 'utf8') : Buffer.alloc(0);
	}

	public assetToJSON(): TransferAsset {
		return {
			...this.asset,
		};
	}

	public verifyAgainstOtherTransactions(): TransactionResponse {
		return {
			id: this.id,
			status: Status.OK,
			errors: [],
		};
	}

	public getRequiredAttributes(): Attributes {
		const attr = super.getRequiredAttributes();

		return {
			[ENTITY_ACCOUNT]: {
				address: [...attr[ENTITY_ACCOUNT].address, this.recipientId],
			},
		};
	}

	public processRequiredState(state: EntityMap): RequiredTransferState {
		const { sender } = super.processRequiredState(state);
		const accounts = state[ENTITY_ACCOUNT];
		if (!accounts) {
			throw new Error('Entity account is required.');
		}
		if (
			!isTypedObjectArrayWithKeys<Account>(accounts, ['address', 'balance'])
		) {
			throw new Error('Required state does not have valid account type');
		}

		const recipient = accounts.find(
			account => account.address === this.recipientId,
		);
		if (!recipient) {
			throw new Error('No recipient account is found.');
		}

		return {
			sender,
			recipient,
		};
	}

	public validateSchema(): TransactionResponse {
		const { status, errors: baseErrors } = super.validateSchema();
		const valid = validator.validate(transferAssetFormatSchema, this.asset);
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

		if (!validateTransferAmount(this.amount.toString())) {
			errors.push(
				new TransactionError(
					'Amount must be a valid number in string format.',
					this.id,
					'.recipientId',
				),
			);
		}

		if (!this.fee.eq(TRANSFER_FEE)) {
			errors.push(
				new TransactionError(
					`Fee must be equal to ${TRANSFER_FEE}`,
					this.id,
					'.fee',
				),
			);
		}

		if (!this.recipientId) {
			errors.push(
				new TransactionError(
					'`recipientId` must be provided.',
					this.id,
					'.recipientId',
				),
			);
		}

		try {
			validateAddress(this.recipientId);
		} catch (error) {
			errors.push(new TransactionError(error.message, this.id, '.recipientId'));
		}

		if (
			this.recipientPublicKey &&
			this.recipientId !== getAddressFromPublicKey(this.recipientPublicKey)
		) {
			errors.push(
				new TransactionError(
					'recipientId does not match recipientPublicKey.',
					this.id,
					'.recipientId',
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
	}: RequiredTransferState): TransactionResponse {
		const { errors: baseErrors } = super.apply({ sender });
		const errors = [...baseErrors];
		// Balance verification
		const updatedSenderBalance = new BigNum(sender.balance)
			.sub(this.fee)
			.sub(this.amount);

		if (!updatedSenderBalance.gte(0)) {
			errors.push(
				new TransactionError(
					`Account does not have enough LSK: ${sender.address}, balance: ${
						sender.balance
					}`,
					this.id,
				),
			);
		}

		const updatedRecipientBalance = new BigNum(recipient.balance).add(
			this.amount,
		);

		if (!updatedRecipientBalance.lte(MAX_TRANSACTION_AMOUNT)) {
			errors.push(new TransactionError('Invalid amount', this.id, '.amount'));
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
	}: RequiredTransferState): TransactionResponse {
		const { errors: baseErrors } = super.apply({ sender });
		const errors = [...baseErrors];
		const updatedSenderBalance = new BigNum(sender.balance)
			.sub(this.fee)
			.sub(this.amount);

		if (updatedSenderBalance.lt(0)) {
			errors.push(
				new TransactionError(
					`Account does not have enough LSK: ${sender.address}, balance: ${
						sender.balance
					}`,
					this.id,
				),
			);
		}

		const updatedSender = {
			...sender,
			balance: updatedSenderBalance.toString(),
		};

		if (!recipient) {
			throw new Error('Recipient is required.');
		}

		const recipientAccount =
			recipient.address === updatedSender.address ? updatedSender : recipient;

		const updatedRecipientBalance = new BigNum(recipientAccount.balance).add(
			this.amount,
		);

		if (updatedRecipientBalance.gt(MAX_TRANSACTION_AMOUNT)) {
			errors.push(new TransactionError('Invalid amount', this.id, '.amount'));
		}

		const updatedRecipient = {
			...recipientAccount,
			balance: updatedRecipientBalance.toString(),
		};

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
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
	}: RequiredTransferState): TransactionResponse {
		const { errors: baseErrors } = super.undo({ sender });
		const errors = [...baseErrors];
		const updatedSenderBalance = new BigNum(sender.balance)
			.add(this.fee)
			.add(this.amount);

		if (updatedSenderBalance.gt(MAX_TRANSACTION_AMOUNT)) {
			errors.push(new TransactionError('Invalid amount', this.id, '.amount'));
		}

		const updatedSender = {
			...sender,
			balance: updatedSenderBalance.toString(),
		};

		if (!recipient) {
			throw new Error('Recipient is required for applying transaction');
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
					}, balance: ${recipient.balance}`,
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

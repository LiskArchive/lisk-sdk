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
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import BigNum from 'browserify-bignum';
import { BYTESIZES, MAX_TRANSACTION_AMOUNT } from '../constants';
import { TransactionError, TransactionMultiError } from '../errors';
import {
	Account,
	Status,
	TransactionJSON,
	TransferAsset,
} from '../transaction_types';
import {
	calculateFee,
	isTypedObjectArrayWithKeys,
	validateAddress,
	validatePublicKey,
	validateTransferAmount,
	validator,
	verifyBalance,
} from '../utils';
import {
	Attributes,
	BaseTransaction,
	createBaseTransaction,
	ENTITY_ACCOUNT,
	EntityMap,
	TransactionResponse,
} from './base';

export interface RequiredState {
	readonly sender: Account;
	readonly recipient?: Account;
}

export interface TransferAsset {
	readonly data: string;
}

export const transferAssetTypeSchema = {
	type: 'object',
	properties: {
		asset: {
			type: 'object',
			properties: {
				data: {
					type: 'string',
				},
			},
			additionalProperties: false,
		},
	},
};

export const transferFormatSchema = {
	type: 'object',
	required: ['recipientId'],
	properties: {
		recipientId: {
			format: 'address',
		},
		amount: {
			format: 'transferAmount',
		},
		asset: {
			type: 'object',
			properties: {
				data: {
					type: 'string',
					maxLength: 64,
				},
			},
			additionalProperties: false,
		},
	},
};

export interface TransferInputs {
	readonly amount: string;
	readonly data?: string;
	readonly passphrase?: string;
	readonly recipientId?: string;
	readonly recipientPublicKey?: string;
	readonly secondPassphrase?: string;
}

const validateInputs = ({
	amount,
	recipientId,
	recipientPublicKey,
	data,
}: TransferInputs): void => {
	if (!validateTransferAmount(amount)) {
		throw new Error('Amount must be a valid number in string format.');
	}

	if (!recipientId && !recipientPublicKey) {
		throw new Error(
			'Either recipientId or recipientPublicKey must be provided.',
		);
	}

	if (typeof recipientId !== 'undefined') {
		validateAddress(recipientId);
	}

	if (typeof recipientPublicKey !== 'undefined') {
		validatePublicKey(recipientPublicKey);
	}

	if (
		recipientId &&
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
	public readonly containsUniqueData: boolean;
	public readonly asset: TransferAsset;
	public readonly fee: BigNum;
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
		if (!typeValid) {
			throw new TransactionMultiError('Invalid field types', tx.id, errors);
		}
		this.containsUniqueData = false;
		this.asset = tx.asset as TransferAsset;
		this.fee = calculateFee(this.type);
	}

	public static create(input: {
		readonly amount: string;
		readonly recipientId?: string;
		readonly recipientPublicKey?: string;
		readonly data?: string;
		readonly passphrase: string;
		readonly secondPassphrase?: string;
	}): object {
		validateInputs(input);
		const {
			amount,
			recipientId,
			recipientPublicKey,
			data,
			passphrase,
			secondPassphrase,
		} = input;

		const transaction = {
			...createBaseTransaction(input),
			type: 0,
			amount,
			recipientId: recipientId as string,
			recipientPublicKey,
			fee: calculateFee(0),
			asset: { data },
		};

		if (!passphrase) {
			return transaction;
		}

		const {
			address: senderId,
			publicKey: senderPublicKey,
		} = getAddressAndPublicKeyFromPassphrase(passphrase);
		const transactionWithSenderInfo = {
			...transaction,
			fee: transaction.fee.toString(),
			senderId,
			senderPublicKey,
		};

		const transferTransaction = new TransferTransaction(
			transactionWithSenderInfo,
		);
		transferTransaction.sign(passphrase, secondPassphrase);

		return transferTransaction.toJSON();
	}

	protected getAssetBytes(): Buffer {
		const { data } = this.asset;

		return data && typeof data === 'string'
			? Buffer.from(data, 'utf8')
			: Buffer.alloc(0);
	}

	public assetToJSON(): TransferAsset {
		return {
			data: this.asset.data,
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
		const { ACCOUNTS } = super.getRequiredAttributes();

		return {
			[ENTITY_ACCOUNT]: {
				address: [...ACCOUNTS.address, this.recipientId],
			},
		};
	}

	public processRequiredState(state: EntityMap): RequiredState {
		const accounts = state[ENTITY_ACCOUNT];
		if (!accounts) {
			throw new Error('Entity account is required.');
		}
		if (!isTypedObjectArrayWithKeys(accounts)) {
			throw new Error('Required state does not have valid account type');
		}

		const sender = accounts.find(acct => acct.address === this.senderId);
		if (!sender) {
			throw new Error('No sender account is found.');
		}

		return {
			sender,
		};
	}

	public validateSchema(): TransactionResponse {
		const { status, errors: baseErrors } = super.validateSchema();
		const transaction = this.toJSON();
		const transferTransactionValidator = validator.compile(
			transferFormatSchema,
		);

		const valid = transferTransactionValidator({
			...transaction,
			asset: this.asset,
		}) as boolean;

		const transferErrors = transferTransactionValidator.errors
			? transferTransactionValidator.errors.map(
					error =>
						new TransactionError(
							`'${error.dataPath}' ${error.message}`,
							transaction.id,
							error.dataPath,
						),
			  )
			: [];

		const totalErrors = [...baseErrors, ...transferErrors];

		return {
			id: this.id,
			status:
				status === Status.OK && valid && totalErrors.length === 0
					? Status.OK
					: Status.FAIL,
			errors: totalErrors,
		};
	}

	public verify({ sender }: RequiredState): TransactionResponse {
		const errors: TransactionError[] = [];
		const { errors: baseErrors, state } = super.apply({ sender });
		const { sender: updatedSender } = state;
		baseErrors.forEach(error => {
			errors.push(error);
		});

		// Balance verification
		const { verified: balanceVerified, error: balanceError } = verifyBalance(
			updatedSender,
			this.amount,
		);
		if (!balanceVerified && balanceError) {
			errors.push(balanceError);
		}

		return {
			id: this.id,
			status: errors.length === 0 ? Status.OK : Status.FAIL,
			errors,
		};
	}

	public apply({ sender, recipient }: RequiredState): TransactionResponse {
		const { errors: baseErrors, state } = super.apply({ sender });
		const { sender: updatedSender } = state;
		if (!updatedSender || !recipient) {
			throw new Error('State is required for applying transaction');
		}
		const errors = [...baseErrors];
		const updatedSenderBalance = new BigNum(updatedSender.balance).sub(
			this.amount,
		);
		const finalSender = {
			...sender,
			balance: updatedSenderBalance.toString(),
		};

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
		const updatedRecipient = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			errors,
			state: {
				sender: finalSender,
				recipient: updatedRecipient,
			},
		};
	}

	public undo({ sender, recipient }: RequiredState): TransactionResponse {
		const { errors: baseErrors, state } = super.undo({ sender });
		const { sender: updatedSender } = state;
		if (!sender || !recipient) {
			throw new Error('State is required for applying transaction');
		}
		const errors = [...baseErrors];
		const updatedSenderBalance = new BigNum(updatedSender.balance).add(
			this.amount,
		);
		const finalSender = {
			...sender,
			balance: updatedSenderBalance.toString(),
		};

		if (!updatedSenderBalance.lte(MAX_TRANSACTION_AMOUNT)) {
			errors.push(new TransactionError('Invalid balance amount', this.id));
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
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			state: { sender: finalSender, recipient: updatedRecipient },
			errors,
		};
	}
}

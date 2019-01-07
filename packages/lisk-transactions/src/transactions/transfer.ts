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
import { TransactionError } from '../errors';
import {
	Account,
	Status,
	TransactionJSON,
	TransferAsset,
} from '../transaction_types';
import { calculateFee, validator } from '../utils';
import * as schemas from '../utils/validation/schema';
import { Attributes, BaseTransaction, TransactionResponse } from './base';

export class TransferTransaction extends BaseTransaction {
	public readonly asset: TransferAsset;
	public readonly fee: BigNum = calculateFee(this.type);

	public constructor(rawTransaction: TransactionJSON) {
		super(rawTransaction);
		this.asset = rawTransaction.asset as TransferAsset;
	}

	// TODO: This means we're converting incorrect assets to empty objects and checkSchema will never throw an error. Thats ok?
	// TODO: What was the purpose of this again? Oh yeah for serialization
	public assetToJSON(): TransferAsset {
		if (
			this.asset.data &&
			typeof this.asset.data === 'string' &&
			this.asset.data.length > 0
		) {
			return this.asset;
		}

		return {};
	}

	protected getAssetBytes(): Buffer {
		const { data } = this.asset;

		return data && typeof data === 'string'
			? Buffer.from(data, 'utf8')
			: Buffer.alloc(0);
	}

	// FIXME: Wait should this just be a property and not a method?
	// tslint:disable-next-line prefer-function-over-method
	public containsUniqueData(): boolean {
		return false;
	}

	// FIXME: Duplicated errors, we should get rid of $merge in type schemas to avoid this
	public checkSchema(): TransactionResponse {
		const { status: baseValid, errors: baseErrors } = super.checkSchema();
		// Check unserialized raw asset
		const { asset, ...transaction } = this.toJSON();
		const transferTransactionValidator = validator.compile(
			schemas.transferTransaction,
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
				!baseValid || !valid || totalErrors.length > 0
					? Status.FAIL
					: Status.OK,
			errors: totalErrors,
		};
	}

	public getRequiredAttributes(): Attributes {
		// TODO: Just get sender address here instead of calling super is cleaner?
		const { ACCOUNTS } = super.getRequiredAttributes();

		return {
			ACCOUNTS: [...ACCOUNTS, this.recipientId],
		};
	}

	public verifyAgainstOtherTransactions(): TransactionResponse {
		return {
			id: this.id,
			status: Status.OK,
			errors: [],
		};
	}

	// TODO: Add verify?
	public apply(sender: Account, recipient?: Account): TransactionResponse {
		if (!sender || !recipient) {
			return {
				id: this.id,
				status: Status.FAIL,
				state: [],
				errors: [
					new TransactionError(
						'Failed to apply. Missing account state',
						this.id,
					),
				],
			};
		}

		const { state } = super.apply(sender);
		const currentSenderBalance = (state as ReadonlyArray<Account>)[0].balance;
		const updatedSenderBalance = new BigNum(currentSenderBalance).sub(
			this.amount,
		);
		const updatedSenderAccount = {
			...sender,
			balance: updatedSenderBalance.toString(),
		};
		const errors = updatedSenderBalance.gte(0)
			? []
			: [
					new TransactionError(
						`Account does not have enough LSK: ${sender.address}, balance: ${
							sender.balance
						}`,
						this.id,
					),
			  ];

		const currentRecipientBalance = (recipient as Account).balance;
		const updatedRecipientBalance = new BigNum(currentRecipientBalance).add(
			this.amount,
		);
		const updatedRecipientAccount = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			state:
				errors.length > 0
					? [sender, recipient]
					: [updatedSenderAccount, updatedRecipientAccount],
			errors,
		};
	}

	public undo(sender: Account, recipient?: Account): TransactionResponse {
		const { state } = super.undo(sender);

		if (!sender || !recipient) {
			return {
				id: this.id,
				status: Status.FAIL,
				state: [],
				errors: [
					new TransactionError(
						'Failed to apply. Missing account state',
						this.id,
					),
				],
			};
		}

		const currentSenderBalance = (state as ReadonlyArray<Account>)[0].balance;
		const updatedSenderBalance = new BigNum(currentSenderBalance).add(
			this.amount,
		);
		const updatedSenderAccount = {
			...sender,
			balance: updatedSenderBalance.toString(),
		};

		const currentRecipientBalance = recipient.balance;
		const updatedRecipientBalance = new BigNum(currentRecipientBalance).add(
			this.amount,
		);
		const updatedRecipientAccount = {
			...recipient,
			balance: updatedRecipientBalance.toString(),
		};
		const errors = updatedRecipientBalance.gte(0)
			? []
			: [
					new TransactionError(
						`Account does not have enough LSK: ${recipient.address}, balance: ${
							recipient.balance
						}`,
						this.id,
					),
			  ];

		return {
			id: this.id,
			status: errors.length > 0 ? Status.FAIL : Status.OK,
			state:
				errors.length > 0
					? [sender, recipient]
					: [updatedSenderAccount, updatedRecipientAccount],
			errors,
		};
	}
}

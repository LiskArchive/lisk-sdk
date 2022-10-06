/*
 * Copyright © 2020 Lisk Foundation
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
 */

import * as cryptography from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { dataStructures } from '@liskhq/lisk-utils';
import { BaseCommand } from '../../base_command';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	MethodContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { TokenMethod } from '../method';
import { transferParamsSchema } from '../schemas';
import { UserStore } from '../stores/user';
import { InitializeUserAccountEvent } from '../events/initialize_user_account';
import { TokenID } from '../types';
import { TransferEvent } from '../events/transfer';

interface Params {
	tokenID: TokenID;
	amount: bigint;
	recipientAddress: Buffer;
	data: string;
	accountInitializationFee: bigint;
}

export class TransferCommand extends BaseCommand {
	public schema = transferParamsSchema;
	private _method!: TokenMethod;
	private _accountInitializationFee!: bigint;
	private _feeTokenID!: TokenID;

	public init(args: {
		method: TokenMethod;
		feeTokenID: TokenID;
		accountInitializationFee: bigint;
	}) {
		this._method = args.method;
		this._feeTokenID = args.feeTokenID;
		this._accountInitializationFee = args.accountInitializationFee;
	}

	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params } = context;

		try {
			validator.validate(transferParamsSchema, params);

			const userStore = this.stores.get(UserStore);

			const balanceCheck = new dataStructures.BufferMap<bigint>();

			const userAccountExists = await userStore.has(
				context,
				userStore.getKey(params.recipientAddress, params.tokenID),
			);

			if (!userAccountExists) {
				if (params.accountInitializationFee !== this._accountInitializationFee) {
					throw new Error('Invalid account initialization fee.');
				}

				balanceCheck.set(this._feeTokenID, this._accountInitializationFee);
			}

			balanceCheck.set(
				params.tokenID,
				(balanceCheck.get(params.tokenID) ?? BigInt(0)) + params.amount,
			);

			for (const [tokenID, amount] of balanceCheck.entries()) {
				const availableBalance = await this._method.getAvailableBalance(
					context.getMethodContext(),
					context.transaction.senderAddress,
					tokenID,
				);

				if (availableBalance < amount) {
					throw new Error(
						`${cryptography.address.getLisk32AddressFromAddress(
							context.transaction.senderAddress,
						)} balance ${availableBalance.toString()} is not sufficient for ${amount.toString()}.`,
					);
				}
			}
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}
		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
		const { params } = context;

		const userStore = this.stores.get(UserStore);

		const recipientAccountKey = userStore.getKey(params.recipientAddress, params.tokenID);

		const recipientAccountExists = await userStore.has(context, recipientAccountKey);

		if (!recipientAccountExists) {
			await this._intializeUserStore(
				context,
				params.recipientAddress,
				params.tokenID,
				context.transaction.senderAddress,
			);
		}

		const senderAccountKey = userStore.getKey(context.transaction.senderAddress, params.tokenID);
		const senderAccount = await userStore.get(context, senderAccountKey);
		if (senderAccount.availableBalance < params.amount) {
			throw new Error(
				`${cryptography.address.getLisk32AddressFromAddress(
					context.transaction.senderAddress,
				)} balance ${senderAccount.availableBalance.toString()} is not sufficient for ${params.amount.toString()}.`,
			);
		}

		senderAccount.availableBalance -= params.amount;
		await userStore.save(context, context.transaction.senderAddress, params.tokenID, senderAccount);

		const recipientAccount = await userStore.get(context, recipientAccountKey);
		recipientAccount.availableBalance += params.amount;
		await userStore.save(context, params.recipientAddress, params.tokenID, recipientAccount);

		this.events.get(TransferEvent).log(context, {
			senderAddress: context.transaction.senderAddress,
			recipientAddress: params.recipientAddress,
			tokenID: params.tokenID,
			amount: params.amount,
		});
	}

	private async _intializeUserStore(
		methodContext: MethodContext,
		address: Buffer,
		tokenID: TokenID,
		initPayingAddress: Buffer,
	) {
		const userStore = this.stores.get(UserStore);

		await userStore.addAvailableBalanceWithCreate(methodContext, address, tokenID, BigInt(0));

		await this._method.burn(
			methodContext,
			initPayingAddress,
			this._feeTokenID,
			this._accountInitializationFee,
		);

		const initializeUserAccountEvent = this.events.get(InitializeUserAccountEvent);
		initializeUserAccountEvent.log(methodContext, {
			address,
			tokenID,
			initPayingAddress,
			initializationFee: this._accountInitializationFee,
		});
	}
}

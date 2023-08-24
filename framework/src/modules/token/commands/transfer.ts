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
import { BaseCommand } from '../../base_command';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { TokenMethod } from '../method';
import { transferParamsSchema } from '../schemas';
import { UserStore } from '../stores/user';
import { TokenID } from '../types';
import { InternalMethod } from '../internal_method';
import { InsufficientBalanceError } from '../../../errors';

/** Interface for the parameters of the Token Transfer Command */
interface Params {
	/**	ID of the tokens being transferred. `TokenID` must be 8 bytes (16 characters). The first 4 bytes correspond to the `chainID`. */
	tokenID: TokenID;
	/** Amount of tokens to be transferred in Beddows. */
	amount: bigint;
	/** Address of the recipient. */
	recipientAddress: Buffer;
	/** Optional message / data field. */
	data: string;
}

/**
 * The `transfer` command of the {@link TokenModule} transfers tokens from one account to another.
 *
 * - name: `transfer`
 * - module: {@link TokenModule | `token`}
 */
export class TransferCommand extends BaseCommand {
	public schema = transferParamsSchema;
	private _method!: TokenMethod;
	private _internalMethod!: InternalMethod;

	/**
	 * @see [Command initialization](https://lisk.com/documentation/beta/understand-blockchain/sdk/modules-commands.html#command-initialization)
	 * @param args Contains the module methods and internal module methods.
	 */
	public init(args: { method: TokenMethod; internalMethod: InternalMethod }) {
		this._method = args.method;
		this._internalMethod = args.internalMethod;
	}

	/**
	 * The hook `Command.verify()` is called to do all necessary verifications.
	 * If the verification of the command was successful, the command can be {@link execute | executed} as next step.
	 * Similar to the {@link BaseModule.verifyTransaction} hook, `Command.verify()` will be called also in the {@link @liskhq/lisk-transaction-pool!TransactionPool}, and it is to ensure the verification defined in this hook is respected when the transactions are included in a block.
	 *
	 * In this hook, the state *cannot* be mutated and events cannot be emitted.
	 *
	 * @param context The context available in every Command.verify() hook.
	 */
	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params } = context;

		const availableBalance = await this._method.getAvailableBalance(
			context.getMethodContext(),
			context.transaction.senderAddress,
			params.tokenID,
		);
		if (availableBalance < params.amount) {
			throw new InsufficientBalanceError(
				cryptography.address.getLisk32AddressFromAddress(context.transaction.senderAddress),
				availableBalance.toString(),
				params.amount.toString(),
			);
		}
		return {
			status: VerifyStatus.OK,
		};
	}

	/**
	 * Applies the state changes of a command through the state machine.
	 * The hook `Command.execute()` is triggered by a transaction identified by the module name and the command name.
	 *
	 * If the hook execution fails, the transaction that triggered this command is still valid, but the state changes applied during this hook are reverted.
	 * Additionally, an event will be emitted that provides the information on whether a command is executed successfully or failed.
	 *
	 * @param context The context available in every `Command.execute()` hook.
	 */
	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
		const { params } = context;

		const userStore = this.stores.get(UserStore);

		const recipientAccountKey = userStore.getKey(params.recipientAddress, params.tokenID);

		const recipientAccountExists = await userStore.has(context, recipientAccountKey);

		if (!recipientAccountExists) {
			await this._internalMethod.initializeUserAccount(
				context.getMethodContext(),
				params.recipientAddress,
				params.tokenID,
			);
		}

		await this._internalMethod.transfer(
			context.getMethodContext(),
			context.transaction.senderAddress,
			params.recipientAddress,
			params.tokenID,
			params.amount,
		);
	}
}

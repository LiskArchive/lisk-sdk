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

import { codec } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import { dataStructures } from '@liskhq/lisk-utils';
import { BaseCommand } from '../../base_command';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { TokenMethod } from '../method';
import {
	CCTransferMessageParams,
	crossChainTransferMessageParams,
	crossChainTransferParamsSchema,
} from '../schemas';
import { InteroperabilityMethod } from '../types';
import { CROSS_CHAIN_COMMAND_NAME_TRANSFER } from '../constants';
import { splitTokenID } from '../utils';
import { EscrowStore } from '../stores/escrow';
import { UserStore } from '../stores/user';
import { TransferCrossChainEvent } from '../events/transfer_cross_chain';
import { InternalMethod } from '../internal_method';
import { InsufficientBalanceError } from '../../../errors';

export interface Params {
	tokenID: Buffer;
	amount: bigint;
	receivingChainID: Buffer;
	recipientAddress: Buffer;
	data: string;
	messageFee: bigint;
	messageFeeTokenID: Buffer;
}

/**
 * The `transfer` command of the {@link TokenModule} transfers tokens from one account to another account on a different chain.
 *
 * - name: `transferCrossChain`
 * - module: {@link TokenModule | `token`}
 */
export class TransferCrossChainCommand extends BaseCommand {
	public schema = crossChainTransferParamsSchema;
	private _moduleName!: string;
	private _method!: TokenMethod;
	private _interoperabilityMethod!: InteroperabilityMethod;
	private _internalMethod!: InternalMethod;

	/**
	 * The `init()` hook of a command is called by the Lisk Framework when the node starts.
	 *
	 * In this context, you have the opportunity to validate and cache the module config or perform initializations that are intended to occur only once.
	 *
	 * @see [Command initialization](https://lisk.com/documentation/beta/understand-blockchain/sdk/modules-commands.html#command-initialization)
	 *
	 * @param args Contains the module methods and internal module methods.
	 */
	public init(args: {
		moduleName: string;
		method: TokenMethod;
		interoperabilityMethod: InteroperabilityMethod;
		internalMethod: InternalMethod;
	}) {
		this._moduleName = args.moduleName;
		this._method = args.method;
		this._interoperabilityMethod = args.interoperabilityMethod;
		this._internalMethod = args.internalMethod;
	}

	/**
	 * Verifies if:
	 *  - the token being sent is native to either the sending or the receiving chain.
	 *  - the correct token ID is used to pay the CCM fee.
	 *  - if the sender has enough balance to send the specified amount of tokens.
	 *
	 * For more info about the `verify()` method, please refer to the {@link BaseCommand}
	 *
	 * @param context
	 */
	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params } = context;

		try {
			const [tokenChainID, _] = splitTokenID(params.tokenID);

			if (params.receivingChainID.equals(context.chainID)) {
				throw new Error('Receiving chain cannot be the sending chain.');
			}

			if (
				![context.chainID, params.receivingChainID].some(allowedChainID =>
					tokenChainID.equals(allowedChainID),
				)
			) {
				throw new Error('Token must be native to either the sending or the receiving chain.');
			}
			const messageFeeTokenID = await this._interoperabilityMethod.getMessageFeeTokenID(
				context.getMethodContext(),
				params.receivingChainID,
			);
			if (!messageFeeTokenID.equals(params.messageFeeTokenID)) {
				throw new Error('Invalid message fee Token ID.');
			}

			const balanceCheck = new dataStructures.BufferMap<bigint>();
			balanceCheck.set(params.tokenID, params.amount);

			balanceCheck.set(
				messageFeeTokenID,
				(balanceCheck.get(messageFeeTokenID) ?? BigInt(0)) + params.messageFee,
			);

			for (const [tokenID, amount] of balanceCheck.entries()) {
				const availableBalance = await this._method.getAvailableBalance(
					context.getMethodContext(),
					context.transaction.senderAddress,
					tokenID,
				);

				if (availableBalance < amount) {
					throw new InsufficientBalanceError(
						cryptography.address.getLisk32AddressFromAddress(context.transaction.senderAddress),
						availableBalance.toString(),
						amount.toString(),
						tokenID.toString('hex'),
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

	/**
	 * Creates and sends a CCM that transfers the specified amount of tokens from the sender to the recipient account on another chain.
	 *
	 * If the token being sent is native to the sending chain, it also adds the amount of tokens being sent to the escrow account for the respective tokens.
	 *
	 * For more info about the `execute()` method, please refer to the {@link BaseCommand}.
	 *
	 * @param context
	 */
	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
		const {
			params,
			transaction: { senderAddress },
		} = context;

		const [tokenChainID, _] = splitTokenID(params.tokenID);

		const escrowStore = this.stores.get(EscrowStore);
		const escrowAccountKey = escrowStore.getKey(params.receivingChainID, params.tokenID);
		const escrowAccoutExists = await escrowStore.has(context, escrowAccountKey);

		if (tokenChainID.equals(context.chainID) && !escrowAccoutExists) {
			await this._internalMethod.initializeEscrowAccount(
				context.getMethodContext(),
				params.receivingChainID,
				params.tokenID,
			);
		}

		const userStore = this.stores.get(UserStore);
		const senderAccountKey = userStore.getKey(senderAddress, params.tokenID);
		const senderAccount = await userStore.get(context, senderAccountKey);

		if (senderAccount.availableBalance < params.amount) {
			throw new InsufficientBalanceError(
				cryptography.address.getLisk32AddressFromAddress(senderAddress),
				senderAccount.availableBalance.toString(),
				params.amount.toString(),
				params.tokenID.toString('hex'),
			);
		}

		senderAccount.availableBalance -= params.amount;
		await userStore.save(context, senderAddress, params.tokenID, senderAccount);

		// escrow has to be updated only if the token is native to the chain.
		if (tokenChainID.equals(context.chainID)) {
			await escrowStore.addAmount(context, params.receivingChainID, params.tokenID, params.amount);
		}

		this.events.get(TransferCrossChainEvent).log(context, {
			senderAddress,
			receivingChainID: params.receivingChainID,
			tokenID: params.tokenID,
			amount: params.amount,
			recipientAddress: params.recipientAddress,
		});

		const transferCCM: CCTransferMessageParams = {
			amount: params.amount,
			data: params.data,
			recipientAddress: params.recipientAddress,
			senderAddress,
			tokenID: params.tokenID,
		};

		await this._interoperabilityMethod.send(
			context.getMethodContext(),
			senderAddress,
			this._moduleName,
			CROSS_CHAIN_COMMAND_NAME_TRANSFER,
			params.receivingChainID,
			params.messageFee,
			codec.encode(crossChainTransferMessageParams, transferCCM),
			context.header.timestamp,
		);
	}
}

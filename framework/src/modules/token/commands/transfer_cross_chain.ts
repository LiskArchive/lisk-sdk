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
import { validator } from '@liskhq/lisk-validator';
import { BaseCommand } from '../../base_command';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { TokenMethod } from '../method';
import { crossChainTransferParamsSchema } from '../schemas';
import { InteroperabilityMethod } from '../types';
import { CCM_STATUS_OK, CROSS_CHAIN_COMMAND_NAME_TRANSFER } from '../constants';
import { splitTokenID } from '../utils';
import { EscrowStore } from '../stores/escrow';
import { UserStore } from '../stores/user';
import { TransferCrossChainEvent } from '../events/transfer_cross_chain';
import { InternalMethod } from '../internal_method';

interface Params {
	tokenID: Buffer;
	amount: bigint;
	receivingChainID: Buffer;
	recipientAddress: Buffer;
	data: string;
	messageFee: bigint;
}

export class TransferCrossChainCommand extends BaseCommand {
	public schema = crossChainTransferParamsSchema;
	private _moduleName!: string;
	private _method!: TokenMethod;
	private _interoperabilityMethod!: InteroperabilityMethod;
	private _ownChainID!: Buffer;
	private _internalMethod!: InternalMethod;

	public init(args: {
		moduleName: string;
		method: TokenMethod;
		interoperabilityMethod: InteroperabilityMethod;
		internalMethod: InternalMethod;
		ownChainID: Buffer;
	}) {
		this._moduleName = args.moduleName;
		this._method = args.method;
		this._interoperabilityMethod = args.interoperabilityMethod;
		this._ownChainID = args.ownChainID;
		this._internalMethod = args.internalMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params } = context;

		try {
			validator.validate(this.schema, params);

			const [tokenChainID, _] = splitTokenID(params.tokenID);

			const [mainChainID] = splitTokenID(this._method.getMainchainTokenID());

			if (
				![this._ownChainID, params.receivingChainID, mainChainID].some(allowedChainID =>
					tokenChainID.equals(allowedChainID),
				)
			) {
				throw new Error(
					'Token must be native to either the sending or the receiving chain or the mainchain.',
				);
			}

			const balanceCheck = new dataStructures.BufferMap<bigint>();
			balanceCheck.set(
				params.tokenID,
				(balanceCheck.get(params.tokenID) ?? BigInt(0)) + params.amount,
			);

			const messageFeeTokenID = await this._interoperabilityMethod.getMessageFeeTokenID(
				context.getMethodContext(),
				params.receivingChainID,
			);

			balanceCheck.set(
				messageFeeTokenID,
				(balanceCheck.get(messageFeeTokenID) ?? BigInt(0)) + params.amount,
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
						)} balance ${availableBalance.toString()} for ${tokenID.toString(
							'hex',
						)} is not sufficient for ${amount.toString()}.`,
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
		const {
			params,
			transaction: { senderAddress },
		} = context;

		const [tokenChainID, _] = splitTokenID(params.tokenID);

		const escrowStore = this.stores.get(EscrowStore);
		const escrowAccountKey = escrowStore.getKey(params.receivingChainID, params.tokenID);
		const escrowAccoutExists = await escrowStore.has(context, escrowAccountKey);

		if (tokenChainID.equals(this._ownChainID) && !escrowAccoutExists) {
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
			throw new Error(
				`${cryptography.address.getLisk32AddressFromAddress(
					senderAddress,
				)} balance ${senderAccount.availableBalance.toString()} for ${params.tokenID.toString(
					'hex',
				)} is not sufficient for ${params.amount.toString()}.`,
			);
		}

		senderAccount.availableBalance -= params.amount;
		await userStore.save(context, senderAddress, params.tokenID, senderAccount);

		this.events.get(TransferCrossChainEvent).log(context, {
			senderAddress,
			receivingChainID: params.receivingChainID,
			tokenID: params.tokenID,
			amount: params.amount,
			recipientAddress: params.recipientAddress,
		});

		await this._interoperabilityMethod.send(
			context.getMethodContext(),
			senderAddress,
			this._moduleName,
			CROSS_CHAIN_COMMAND_NAME_TRANSFER,
			params.receivingChainID,
			params.messageFee,
			CCM_STATUS_OK,
			codec.encode(this.schema, params),
		);
	}
}

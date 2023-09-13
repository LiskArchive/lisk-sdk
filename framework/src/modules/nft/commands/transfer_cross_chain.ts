/*
 * Copyright © 2023 Lisk Foundation
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

import { validator } from '@liskhq/lisk-validator';
import { crossChainTransferParamsSchema } from '../schemas';
import { NFTMethod } from '../method';
import { InteroperabilityMethod, TokenMethod } from '../types';
import { BaseCommand } from '../../base_command';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { InternalMethod } from '../internal_method';

export interface TransferCrossChainParams {
	nftID: Buffer;
	receivingChainID: Buffer;
	recipientAddress: Buffer;
	data: string;
	messageFee: bigint;
	includeAttributes: boolean;
}

export class TransferCrossChainCommand extends BaseCommand {
	public schema = crossChainTransferParamsSchema;

	private _nftMethod!: NFTMethod;
	private _tokenMethod!: TokenMethod;
	private _interoperabilityMethod!: InteroperabilityMethod;
	private _internalMethod!: InternalMethod;

	public init(args: {
		nftMethod: NFTMethod;
		tokenMethod: TokenMethod;
		interoperabilityMethod: InteroperabilityMethod;
		internalMethod: InternalMethod;
	}): void {
		this._nftMethod = args.nftMethod;
		this._tokenMethod = args.tokenMethod;
		this._interoperabilityMethod = args.interoperabilityMethod;
		this._internalMethod = args.internalMethod;
	}

	public async verify(
		context: CommandVerifyContext<TransferCrossChainParams>,
	): Promise<VerificationResult> {
		const { params } = context;
		const { senderAddress } = context.transaction;

		validator.validate(this.schema, params);

		if (params.receivingChainID.equals(context.chainID)) {
			throw new Error('Receiving chain cannot be the sending chain');
		}

		// perform checks that are common for same-chain and cross-chain transfers
		await this._internalMethod.verifyTransfer(
			context.getMethodContext(),
			senderAddress,
			params.nftID,
		);

		const nftChainID = this._nftMethod.getChainID(params.nftID);

		if (!nftChainID.equals(context.chainID) && !nftChainID.equals(params.receivingChainID)) {
			throw new Error('NFT must be native to either the sending or the receiving chain');
		}

		const messageFeeTokenID = await this._interoperabilityMethod.getMessageFeeTokenID(
			context.getMethodContext(),
			params.receivingChainID,
		);

		const availableBalance = await this._tokenMethod.getAvailableBalance(
			context.getMethodContext(),
			senderAddress,
			messageFeeTokenID,
		);

		if (availableBalance < params.messageFee) {
			throw new Error('Insufficient balance for the message fee');
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<TransferCrossChainParams>): Promise<void> {
		const { params } = context;

		await this._internalMethod.transferCrossChainInternal(
			context.getMethodContext(),
			context.transaction.senderAddress,
			params.recipientAddress,
			params.nftID,
			params.receivingChainID,
			params.messageFee,
			params.data,
			params.includeAttributes,
			context.header.timestamp,
		);
	}
}

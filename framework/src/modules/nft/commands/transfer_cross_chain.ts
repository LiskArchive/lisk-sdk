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

	private _internalMethod!: InternalMethod;

	public init(args: {
		nftMethod: NFTMethod;
		tokenMethod: TokenMethod;
		interoperabilityMethod: InteroperabilityMethod;
		internalMethod: InternalMethod;
	}): void {
		this._internalMethod = args.internalMethod;
	}

	public async verify(
		context: CommandVerifyContext<TransferCrossChainParams>,
	): Promise<VerificationResult> {
		const { params } = context;
		const { senderAddress } = context.transaction;

		validator.validate(this.schema, params);

		try {
			// perform checks that are common for same-chain and cross-chain transfers
			await this._internalMethod.verifyTransfer(
				context.getMethodContext(),
				senderAddress,
				params.nftID,
			);

			await this._internalMethod.verifyTransferCrossChain(
				context.getMethodContext(),
				senderAddress,
				params.nftID,
				context.chainID,
				params.receivingChainID,
				params.messageFee,
				params.data,
			);
		} catch (error) {
			return {
				status: VerifyStatus.FAIL,
				error: error as Error,
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<TransferCrossChainParams>): Promise<void> {
		const { params } = context;

		await this._internalMethod.transferCrossChain(
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

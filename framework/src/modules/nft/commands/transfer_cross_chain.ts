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

/**
 * The TransferCrossChain command transfers an NFT from one account to another across chains.
 *
 * ## Name
 * - `transferCrossChain`
 *
 * ## Parameters
 * - `nftID` (number) : 16 byte long
 * - `recipientAddress` (string) : Lisk32 address
 * - `data` (string) : Optional transfer message
 * - `receivingChainID` (string) : The {@link https://lisk.com/documentation/understand-blockchain/interoperability/index.html#chain-identifiers | Chain ID} of the network receiving the NFT.
 * - `messageFee` (string): Fee for the execution of the CCM in Beddows
 * - `includeAttributes` (boolean) : Boolean, if NFT attributes should be inlcuded in the cross-chain transfer, or not.
 *
 * @example
 *  ```sh
 *  lisk-core transaction:create nft transferCrossChain 10000000 --params='{"nftID":"01000000000000010000000000000001","recipientAddress":"lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz","data":"Congratulations on completing the course!","receivingChainID":"04000002","messageFee":"10000000","includeAttributes":true}'
 *  ```
 */
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

		try {
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

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
import { NFTStore } from '../stores/nft';
import { NFTMethod } from '../method';
import { LENGTH_CHAIN_ID, NFT_NOT_LOCKED } from '../constants';
import { InteroperabilityMethod, TokenMethod } from '../types';
import { BaseCommand } from '../../base_command';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { InternalMethod } from '../internal_method';

export interface Params {
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

	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params } = context;

		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(context.getMethodContext(), params.nftID);

		if (params.receivingChainID.equals(context.chainID)) {
			throw new Error('Receiving chain cannot be the sending chain');
		}

		if (!nftExists) {
			throw new Error('NFT substore entry does not exist');
		}

		const owner = await this._nftMethod.getNFTOwner(context.getMethodContext(), params.nftID);

		if (owner.length === LENGTH_CHAIN_ID) {
			throw new Error('NFT is escrowed to another chain');
		}

		const nftChainID = this._nftMethod.getChainID(params.nftID);

		if (!nftChainID.equals(context.chainID) && !nftChainID.equals(params.receivingChainID)) {
			throw new Error('NFT must be native to either the sending or the receiving chain');
		}

		const messageFeeTokenID = await this._interoperabilityMethod.getMessageFeeTokenID(
			context.getMethodContext(),
			params.receivingChainID,
		);

		if (!owner.equals(context.transaction.senderAddress)) {
			throw new Error('Transfer not initiated by the NFT owner');
		}

		const lockingModule = await this._nftMethod.getLockingModule(
			context.getMethodContext(),
			params.nftID,
		);

		if (lockingModule !== NFT_NOT_LOCKED) {
			throw new Error('Locked NFTs cannot be transferred');
		}

		const availableBalance = await this._tokenMethod.getAvailableBalance(
			context.getMethodContext(),
			context.transaction.senderAddress,
			messageFeeTokenID,
		);

		if (availableBalance < params.messageFee) {
			throw new Error('Insufficient balance for the message fee');
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
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

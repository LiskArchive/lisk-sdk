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

import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { transferParamsSchema } from '../schemas';
import { NFTMethod } from '../method';
import { InternalMethod } from '../internal_method';

export interface Params {
	nftID: Buffer;
	recipientAddress: Buffer;
	data: string;
}

export class TransferCommand extends BaseCommand {
	public schema = transferParamsSchema;
	private _method!: NFTMethod;
	private _internalMethod!: InternalMethod;

	public init(args: { method: NFTMethod; internalMethod: InternalMethod }) {
		this._method = args.method;
		this._internalMethod = args.internalMethod;
	}

	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params } = context;
		const methodContext = context.getMethodContext();

		let nft;
		try {
			nft = await this._method.getNFT(methodContext, params.nftID);
		} catch (error) {
			throw new Error('NFT does not exist');
		}

		if (this._method.isNFTEscrowed(nft)) {
			throw new Error('NFT is escrowed to another chain');
		}

		if (!nft.owner.equals(context.transaction.senderAddress)) {
			throw new Error('Transfer not initiated by the NFT owner');
		}

		if (this._method.isNFTLocked(nft)) {
			throw new Error('Locked NFTs cannot be transferred');
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
		const { params } = context;

		await this._internalMethod.transferInternal(
			context.getMethodContext(),
			params.recipientAddress,
			params.nftID,
		);
	}
}

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
import { NFTStore } from '../stores/nft';
import { NFTMethod } from '../method';
import { LENGTH_CHAIN_ID, NFT_NOT_LOCKED } from '../constants';
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

		const nftStore = this.stores.get(NFTStore);

		const nftExists = await nftStore.has(context, params.nftID);

		if (!nftExists) {
			throw new Error('NFT substore entry does not exist');
		}

		const owner = await this._method.getNFTOwner(context.getMethodContext(), params.nftID);

		if (owner.length === LENGTH_CHAIN_ID) {
			throw new Error('NFT is escrowed to another chain');
		}

		if (!owner.equals(context.transaction.senderAddress)) {
			throw new Error('Transfer not initiated by the NFT owner');
		}

		const lockingModule = await this._method.getLockingModule(
			context.getMethodContext(),
			params.nftID,
		);

		if (lockingModule !== NFT_NOT_LOCKED) {
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

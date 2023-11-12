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

import { BaseCommand, CommandExecuteContext, NFTMethod } from 'lisk-sdk';
import { NFTAttributes } from '../types';
import { mintNftParamsSchema } from '../schema';

interface Params {
	address: Buffer;
	collectionID: Buffer;
	attributesArray: NFTAttributes[];
}

export class MintNftCommand extends BaseCommand {
	private _nftMethod!: NFTMethod;
	public schema = mintNftParamsSchema;

	public init(args: { nftMethod: NFTMethod }): void {
		this._nftMethod = args.nftMethod;
	}

	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
		const { params } = context;

		await this._nftMethod.create(
			context.getMethodContext(),
			params.address,
			params.collectionID,
			params.attributesArray,
		);
	}
}

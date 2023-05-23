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

import { BaseEvent, EventQueuer } from '../../base_event';
import { LENGTH_NFT_ID, LENGTH_CHAIN_ID, NftEventResult } from '../constants';

export interface TransferCrossChainEventData {
	senderAddress: Buffer;
	recipientAddress: Buffer;
	receivingChainID: Buffer;
	nftID: Buffer;
}

export const transferCrossChainEventDataSchema = {
	$id: '/nft/events/transferCrossChain',
	type: 'object',
	required: ['senderAddress', 'recipientAddress', 'nftID', 'receivingChainID', 'result'],
	properties: {
		senderAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 2,
		},
		nftID: {
			dataType: 'bytes',
			minLength: LENGTH_NFT_ID,
			maxLength: LENGTH_NFT_ID,
			fieldNumber: 3,
		},
		receivingChainID: {
			dataType: 'bytes',
			minLength: LENGTH_CHAIN_ID,
			maxLength: LENGTH_CHAIN_ID,
			fieldNumber: 4,
		},
		includeAttributes: {
			dataType: 'boolean',
			fieldNumber: 5,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 6,
		},
	},
};

export class TransferCrossChainEvent extends BaseEvent<
	TransferCrossChainEventData & { result: NftEventResult }
> {
	public schema = transferCrossChainEventDataSchema;

	public log(ctx: EventQueuer, data: TransferCrossChainEventData): void {
		this.add(ctx, { ...data, result: NftEventResult.SUCCESSFUL }, [
			data.senderAddress,
			data.recipientAddress,
			data.receivingChainID,
		]);
	}
}

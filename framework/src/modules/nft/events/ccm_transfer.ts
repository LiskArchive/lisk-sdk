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
import { LENGTH_CHAIN_ID, LENGTH_NFT_ID, NftEventResult } from '../constants';

export interface CCMTransferEventData {
	senderAddress: Buffer;
	recipientAddress: Buffer;
	nftID: Buffer;
	receivingChainID: Buffer;
	sendingChainID: Buffer;
}

export const ccmTransferEventSchema = {
	$id: '/nft/events/ccmTransfer',
	type: 'object',
	required: [
		'senderAddress',
		'recipientAddress',
		'nftID',
		'receivingChainID',
		'sendingChainID',
		'result',
	],
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
		sendingChainID: {
			dataType: 'bytes',
			minLength: LENGTH_CHAIN_ID,
			maxLength: LENGTH_CHAIN_ID,
			fieldNumber: 5,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 6,
		},
	},
};

export class CcmTransferEvent extends BaseEvent<CCMTransferEventData & { result: NftEventResult }> {
	public schema = ccmTransferEventSchema;

	public log(ctx: EventQueuer, data: CCMTransferEventData): void {
		this.add(ctx, { ...data, result: NftEventResult.RESULT_SUCCESSFUL }, [
			data.senderAddress,
			data.recipientAddress,
		]);
	}

	public error(ctx: EventQueuer, data: CCMTransferEventData, result: NftEventResult): void {
		this.add(ctx, { ...data, result }, [data.senderAddress, data.recipientAddress], true);
	}
}

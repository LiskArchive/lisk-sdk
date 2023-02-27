/*
 * Copyright © 2022 Lisk Foundation
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
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { BaseStore, StoreGetter } from '../../base_store';
import { HASH_LENGTH, STORE_PREFIX } from '../constants';
import { ChannelData } from '../types';
import { TOKEN_ID_LENGTH } from '../../token/constants';

const inboxOutboxProps = {
	appendPath: {
		type: 'array',
		items: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
		},
		fieldNumber: 1,
	},
	size: {
		dataType: 'uint32',
		fieldNumber: 2,
	},
	root: {
		dataType: 'bytes',
		minLength: HASH_LENGTH,
		maxLength: HASH_LENGTH,
		fieldNumber: 3,
	},
};

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#channel-data-substore
export const channelSchema = {
	$id: '/modules/interoperability/channel',
	type: 'object',
	required: [
		'inbox',
		'outbox',
		'partnerChainOutboxRoot',
		'messageFeeTokenID',
		'minReturnFeePerByte',
	],
	properties: {
		inbox: {
			type: 'object',
			fieldNumber: 1,
			required: ['appendPath', 'size', 'root'],
			properties: inboxOutboxProps,
		},
		outbox: {
			type: 'object',
			fieldNumber: 2,
			required: ['appendPath', 'size', 'root'],
			properties: inboxOutboxProps,
		},
		partnerChainOutboxRoot: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
			fieldNumber: 3,
		},
		messageFeeTokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 4,
		},
		minReturnFeePerByte: {
			dataType: 'uint64',
			fieldNumber: 5,
		},
	},
};

export class ChannelDataStore extends BaseStore<ChannelData> {
	public schema = channelSchema;

	public get storePrefix(): Buffer {
		return STORE_PREFIX;
	}

	public async updatePartnerChainOutboxRoot(
		context: StoreGetter,
		chainID: Buffer,
		messageWitnessHashes: Buffer[],
	): Promise<void> {
		const channel = await this.get(context, chainID);

		const outboxRoot = regularMerkleTree.calculateRootFromRightWitness(
			channel.inbox.size,
			channel.inbox.appendPath,
			messageWitnessHashes,
		);

		channel.partnerChainOutboxRoot = outboxRoot;

		await this.set(context, chainID, channel);
	}
}

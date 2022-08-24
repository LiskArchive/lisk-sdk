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
import { BaseStore } from '../../base_store';

export interface Inbox {
	appendPath: Buffer[];
	size: number;
	root: Buffer;
}

export interface InboxJSON {
	appendPath: string[];
	size: number;
	root: string;
}

export interface Outbox {
	appendPath: Buffer[];
	size: number;
	root: Buffer;
}

export interface OutboxJSON {
	appendPath: string[];
	size: number;
	root: string;
}

export interface MessageFeeTokenID {
	chainID: Buffer;
	localID: Buffer;
}

export interface MessageFeeTokenIDJSON {
	chainID: string;
	localID: string;
}

export interface ChannelData {
	inbox: Inbox;
	outbox: Outbox;
	partnerChainOutboxRoot: Buffer;
	messageFeeTokenID: MessageFeeTokenID;
}

export const channelSchema = {
	$id: '/modules/interoperability/channel',
	type: 'object',
	required: ['inbox', 'outbox', 'partnerChainOutboxRoot', 'messageFeeTokenID'],
	properties: {
		inbox: {
			type: 'object',
			fieldNumber: 1,
			required: ['appendPath', 'size', 'root'],
			properties: {
				appendPath: {
					type: 'array',
					items: {
						dataType: 'bytes',
					},
					fieldNumber: 1,
				},
				size: {
					dataType: 'uint32',
					fieldNumber: 2,
				},
				root: {
					dataType: 'bytes',
					fieldNumber: 3,
				},
			},
		},
		outbox: {
			type: 'object',
			fieldNumber: 2,
			required: ['appendPath', 'size', 'root'],
			properties: {
				appendPath: {
					type: 'array',
					items: {
						dataType: 'bytes',
					},
					fieldNumber: 1,
				},
				size: {
					dataType: 'uint32',
					fieldNumber: 2,
				},
				root: {
					dataType: 'bytes',
					fieldNumber: 3,
				},
			},
		},
		partnerChainOutboxRoot: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		messageFeeTokenID: {
			type: 'object',
			fieldNumber: 4,
			required: ['chainID', 'localID'],
			properties: {
				chainID: {
					dataType: 'bytes',
					fieldNumber: 1,
				},
				localID: {
					dataType: 'bytes',
					fieldNumber: 2,
				},
			},
		},
	},
};

export class ChannelDataStore extends BaseStore<ChannelData> {
	public schema = channelSchema;
}

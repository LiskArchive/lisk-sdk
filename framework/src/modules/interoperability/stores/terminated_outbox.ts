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
import { HASH_LENGTH, STORE_PREFIX } from '../constants';

export interface TerminatedOutboxAccount {
	outboxRoot: Buffer;
	outboxSize: number;
	partnerChainInboxSize: number;
}

export interface TerminatedOutboxAccountJSON {
	outboxRoot: string;
	outboxSize: number;
	partnerChainInboxSize: number;
}

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#terminated-outbox-substore
export const terminatedOutboxSchema = {
	$id: '/modules/interoperability/terminatedOutbox',
	type: 'object',
	required: ['outboxRoot', 'outboxSize', 'partnerChainInboxSize'],
	properties: {
		outboxRoot: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
			fieldNumber: 1,
		},
		outboxSize: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		partnerChainInboxSize: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export class TerminatedOutboxStore extends BaseStore<TerminatedOutboxAccount> {
	public schema = terminatedOutboxSchema;

	public get storePrefix(): Buffer {
		return STORE_PREFIX;
	}
}

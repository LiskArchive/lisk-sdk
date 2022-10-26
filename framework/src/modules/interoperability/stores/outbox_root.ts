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
import { HASH_LENGTH } from '../constants';

export interface OutboxRoot {
	root: Buffer;
}

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#outbox-root-substore
export const outboxRootSchema = {
	$id: '/modules/interoperability/outbox',
	type: 'object',
	required: ['root'],
	properties: {
		root: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
			fieldNumber: 1,
		},
	},
};

export class OutboxRootStore extends BaseStore<OutboxRoot> {
	public schema = outboxRootSchema;
}

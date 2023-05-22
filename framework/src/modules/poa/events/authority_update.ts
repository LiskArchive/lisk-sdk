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
import { UpdateAuthority } from '../constants';

export interface AuthorityUpdateData {
	result: UpdateAuthority;
}

export const authorityUpdateDataSchema = {
	$id: '/poa/events/authorityUpdate',
	type: 'object',
	required: ['result'],
	properties: {
		result: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
	},
};

export class AuthorityUpdateEvent extends BaseEvent<AuthorityUpdateData> {
	public schema = authorityUpdateDataSchema;

	public log(ctx: EventQueuer, data: AuthorityUpdateData): void {
		this.add(ctx, data, []);
	}
}

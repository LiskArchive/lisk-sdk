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

export interface EndOfRoundTimestampData {
	timestamp: number;
}

export const endOfRoundTimestampSchema = {
	$id: '/dynamicRewards/endOfRoundTimestamp',
	type: 'object',
	properties: {
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
	},
	required: ['timestamp'],
};

export class EndOfRoundTimestampStore extends BaseStore<EndOfRoundTimestampData> {
	public schema = endOfRoundTimestampSchema;
}

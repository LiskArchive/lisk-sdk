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
import { BaseStore } from '../../base_store';
import { NUM_BYTES_ADDRESS } from '../constants';
import { ActiveValidator } from '../types';

export interface SnapshotObject {
	validators: ActiveValidator[];
	threshold: bigint;
}

export const snapshotSchema = {
	$id: '/poa/snapshot',
	type: 'object',
	required: ['validators', 'threshold'],
	properties: {
		validators: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'weight'],
				properties: {
					address: {
						dataType: 'bytes',
						minLength: NUM_BYTES_ADDRESS,
						maxLength: NUM_BYTES_ADDRESS,
						fieldNumber: 1,
					},
					weight: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
		},
		threshold: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
	},
};

export class SnapshotStore extends BaseStore<SnapshotObject> {
	public schema = snapshotSchema;
}

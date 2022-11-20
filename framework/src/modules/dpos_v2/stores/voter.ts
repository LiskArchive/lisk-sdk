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
import { NotFoundError } from '@liskhq/lisk-db';
import { BaseStore, ImmutableStoreGetter } from '../../base_store';
import { MAX_NUMBER_BYTES_Q96, TOKEN_ID_LENGTH } from '../constants';
import { VoterData } from '../types';

export const voterStoreSchema = {
	$id: '/dpos/voter',
	type: 'object',
	required: ['sentVotes', 'pendingUnlocks'],
	properties: {
		sentVotes: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['delegateAddress', 'amount', 'voteSharingCoefficients'],
				properties: {
					delegateAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
						format: 'lisk32',
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
					voteSharingCoefficients: {
						type: 'array',
						fieldNumber: 3,
						items: {
							type: 'object',
							required: ['tokenID', 'coefficient'],
							properties: {
								tokenID: {
									dataType: 'bytes',
									fieldNumber: 1,
									minLength: TOKEN_ID_LENGTH,
									maxLength: TOKEN_ID_LENGTH,
								},
								coefficient: {
									dataType: 'bytes',
									fieldNumber: 2,
									maxLength: MAX_NUMBER_BYTES_Q96,
								},
							},
						},
					},
				},
			},
		},
		pendingUnlocks: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['delegateAddress', 'amount', 'unvoteHeight'],
				properties: {
					delegateAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
						format: 'lisk32',
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
					unvoteHeight: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
			},
		},
	},
};

export class VoterStore extends BaseStore<VoterData> {
	public schema = voterStoreSchema;

	public async getOrDefault(context: ImmutableStoreGetter, address: Buffer) {
		try {
			const voterData = await this.get(context, address);
			return voterData;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

			const voterData = {
				sentVotes: [],
				pendingUnlocks: [],
			};
			return voterData;
		}
	}
}

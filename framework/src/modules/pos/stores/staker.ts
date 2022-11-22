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
import { StakerData } from '../types';

export const stakerStoreSchema = {
	$id: '/pos/staker',
	type: 'object',
	required: ['sentStakes', 'pendingUnlocks'],
	properties: {
		sentStakes: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['validatorAddress', 'amount', 'stakeSharingCoefficients'],
				properties: {
					validatorAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
						format: 'lisk32',
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
					stakeSharingCoefficients: {
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
				required: ['validatorAddress', 'amount', 'unstakeHeight'],
				properties: {
					validatorAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
						format: 'lisk32',
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
					unstakeHeight: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
			},
		},
	},
};

export class StakerStore extends BaseStore<StakerData> {
	public schema = stakerStoreSchema;

	public async getOrDefault(context: ImmutableStoreGetter, address: Buffer) {
		try {
			const stakerData = await this.get(context, address);
			return stakerData;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

			const stakerData = {
				sentStakes: [],
				pendingUnlocks: [],
			};
			return stakerData;
		}
	}
}

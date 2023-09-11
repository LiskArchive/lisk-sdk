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
import { ProposalDecision } from '../types';

export interface VotesStoreData {
	voteInfos: {
		proposalIndex: number;
		decision: ProposalDecision;
		amount: bigint;
	}[];
}

export const votesSchema = {
	$id: '/governance/store/votes',
	type: 'object',
	required: ['voteInfos'],
	properties: {
		voteInfos: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['proposalIndex', 'decision', 'amount'],
				properties: {
					proposalIndex: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					decision: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 3,
					},
				},
			},
		},
	},
};

export class VotesStore extends BaseStore<VotesStoreData> {
	public schema = votesSchema;
}

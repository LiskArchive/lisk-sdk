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

export interface ProposalIndexStoreData {
	nextIndex: number;
	nextOutcomeCheckIndex: number;
	nextQuorumCheckIndex: number;
}

export const proposalIndexSchema = {
	$id: '/governance/store/index',
	type: 'object',
	required: ['nextIndex', 'nextOutcomeCheckIndex', 'nextQuorumCheckIndex'],
	properties: {
		nextIndex: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		nextOutcomeCheckIndex: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		nextQuorumCheckIndex: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export class ProposalIndexStore extends BaseStore<ProposalIndexStoreData> {
	public schema = proposalIndexSchema;
}

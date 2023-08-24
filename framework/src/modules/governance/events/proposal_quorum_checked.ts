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
import { ProposalStatus } from '../types';

interface ProposalQuorumCheckedEventData {
	index: number;
	status: ProposalStatus;
}

export const proposalQuorumCheckedEventDataSchema = {
	$id: '/governance/events/proposalQuorumChecked',
	type: 'object',
	required: ['index', 'status'],
	properties: {
		index: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		status: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export class ProposalQuorumCheckedEvent extends BaseEvent<ProposalQuorumCheckedEventData> {
	public schema = proposalQuorumCheckedEventDataSchema;

	public log(ctx: EventQueuer, data: ProposalQuorumCheckedEventData): void {
		this.add(ctx, data, [Buffer.from(data.index.toString())]);
	}
}

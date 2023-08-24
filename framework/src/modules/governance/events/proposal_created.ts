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
import { ProposalType } from '../types';

interface ProposalCreatedEventData {
	creator: Buffer;
	index: number;
	type: ProposalType;
}

export const proposalCreatedEventDataSchema = {
	$id: '/governance/events/proposalCreated',
	type: 'object',
	required: ['creator', 'index', 'type'],
	properties: {
		creator: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		index: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		type: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export class ProposalCreatedEvent extends BaseEvent<ProposalCreatedEventData> {
	public schema = proposalCreatedEventDataSchema;

	public log(ctx: EventQueuer, data: ProposalCreatedEventData): void {
		this.add(ctx, data, [data.creator, Buffer.from(data.index.toString())]);
	}
}

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

import { ADDRESS_LENGTH } from '../../../constants';
import { BaseEvent, EventQueuer } from '../../base_event';
import { ProposalDecision } from '../types';

interface ProposalVotedEventData {
	index: number;
	voterAddress: Buffer;
	decision: ProposalDecision;
	amount: bigint;
}

export const proposalVotedEventSchema = {
	$id: '/governance/events/proposalVoted',
	type: 'object',
	required: ['index', 'voterAddress', 'decision', 'amount'],
	properties: {
		index: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		voterAddress: {
			dataType: 'bytes',
			length: ADDRESS_LENGTH,
			fieldNumber: 2,
		},
		decision: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
	},
};

export class ProposalVotedEvent extends BaseEvent<ProposalVotedEventData> {
	public schema = proposalVotedEventSchema;

	public log(ctx: EventQueuer, data: ProposalVotedEventData): void {
		this.add(ctx, data, [data.voterAddress, Buffer.from(data.index.toString())]);
	}
}

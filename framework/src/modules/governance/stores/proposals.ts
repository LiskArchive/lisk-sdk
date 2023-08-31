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
import {
	MAX_LENGTH_PROPOSAL_AUTHOR,
	MAX_LENGTH_PROPOSAL_LINK,
	MAX_LENGTH_PROPOSAL_SUMMARY,
	MAX_LENGTH_PROPOSAL_TEXT,
	MAX_LENGTH_PROPOSAL_TITLE,
} from '../constants';
import { ProposalType, ProposalDescription } from '../types';

export interface ProposalsStoreData {
	creator: Buffer;
	creationHeight: number;
	depositAmount: bigint;
	votesYes: bigint;
	votesNo: bigint;
	votesPass: bigint;
	type: ProposalType;
	description: ProposalDescription;
}

export const proposalDescriptionSchema = {
	type: 'object',
	required: ['title', 'author', 'summary', 'discussionsTo', 'text'],
	properties: {
		title: {
			dataType: 'bytes',
			minLength: 1,
			maxLength: MAX_LENGTH_PROPOSAL_TITLE,
			fieldNumber: 1,
		},
		author: {
			dataType: 'bytes',
			minLength: 1,
			maxLength: MAX_LENGTH_PROPOSAL_AUTHOR,
			fieldNumber: 2,
		},
		summary: {
			dataType: 'bytes',
			minLength: 1,
			maxLength: MAX_LENGTH_PROPOSAL_SUMMARY,
			fieldNumber: 3,
		},
		discussionsTo: {
			dataType: 'bytes',
			maxLength: MAX_LENGTH_PROPOSAL_LINK,
			fieldNumber: 4,
		},
		text: {
			maxLength: MAX_LENGTH_PROPOSAL_TEXT,
			fieldNumber: 5,
			dataType: 'bytes',
		},
	},
};

export const proposalSchema = {
	$id: 'governance/store/proposal',
	type: 'object',
	required: [
		'creator',
		'creationHeight',
		'depositAmount',
		'votesYes',
		'votesNo',
		'votesPass',
		'type',
		'description',
		'data',
		'status',
	],
	properties: {
		creator: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		creationHeight: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		depositAmount: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		votesYes: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		votesNo: {
			dataType: 'uint64',
			fieldNumber: 5,
		},
		votesPass: {
			dataType: 'uint64',
			fieldNumber: 6,
		},
		type: {
			dataType: 'uint32',
			fieldNumber: 7,
		},
		description: {
			fieldNumber: 8,
			...proposalDescriptionSchema,
		},
		data: {
			dataType: 'bytes',
			fieldNumber: 9,
		},
		status: {
			dataType: 'uint32',
			fieldNumber: 10,
		},
	},
};

export class ProposalsStore extends BaseStore<ProposalsStoreData> {
	public shema = proposalSchema;
}

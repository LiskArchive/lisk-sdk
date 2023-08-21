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

export enum ProposalType {
	UNIVERSAL = 0,
	FUNDING = 1,
	CONFIG_UPDATE = 2,
}

export enum ProposalStatus {
	ACTIVE = 0,
	FINISHED_ACCEPTED = 1,
	ACCEPTED_ERROR = 2,
	FINISHED_REJECTED = 3,
	FAILED_QUORUM = 4,
}

export enum ProposalDecision {
	YES = 0,
	NO = 1,
	PASS = 2,
}

export interface ProposalDescription {
	title: Buffer;
	author: Buffer;
	summary: Buffer;
	discussionsTo: Buffer;
	text: Buffer;
}

export interface CreateProposalParams {
	type: ProposalType;
	description: ProposalDescription;
	data: Buffer;
}

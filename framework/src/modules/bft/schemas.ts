/*
 * Copyright © 2021 Lisk Foundation
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

export const bftModuleConfig = {
	$id: 'modules/bft/config',
	type: 'object',
	required: ['batchSize'],
	properties: {
		batchSize: {
			type: 'integer',
			format: 'uint32',
		},
	},
};

export interface BFTParametersValidator {
	address: Buffer;
	bftWeight: bigint;
}

export interface BFTParameters {
	prevoteThreshold: bigint;
	precommitThreshold: bigint;
	certificateThreshold: bigint;
	validators: BFTParametersValidator[];
	validatorsHash: Buffer;
}

export const bftParametersSchema = {
	$id: 'modules/bft/bftParameters',
	type: 'object',
	required: [
		'prevoteThreshold',
		'precommitThreshold',
		'certificateThreshold',
		'validators',
		'validatorsHash',
	],
	properties: {
		prevoteThreshold: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		precommitThreshold: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		certificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		validators: {
			type: 'array',
			fieldNumber: 4,
			items: {
				type: 'object',
				required: ['address', 'bftWeight'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					bftWeight: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
		},
		validatorsHash: {
			dataType: 'bytes',
			fieldNumber: 5,
		},
	},
};

export interface BFTVotesBlockInfo {
	height: number;
	generatorAddress: Buffer;
	maxHeightGenerated: number;
	maxHeightPrevoted: number;
	prevoteWeight: number;
	precommitWeight: number;
}

export interface BFTVotesActiveValidatorsVoteInfo {
	address: Buffer;
	minActiveHeight: number;
	largestHeightPrecommit: number;
}

export interface BFTVotes {
	maxHeightPrevoted: number;
	maxHeightPrecommitted: number;
	maxHeightCertified: number;
	blockBFTInfos: BFTVotesBlockInfo[];
}

export const bftVotesSchema = {
	$id: 'modules/bft/bftVotes',
	type: 'object',
	required: [
		'maxHeightPrevoted',
		'maxHeightPrecommitted',
		'maxHeightCertified',
		'blockBFTInfos',
		'activeValidatorsVoteInfo',
	],
	properties: {
		maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 1 },
		maxHeightPrecommitted: { dataType: 'uint32', fieldNumber: 2 },
		maxHeightCertified: { dataType: 'uint32', fieldNumber: 3 },
		blockBFTInfos: {
			type: 'array',
			fieldNumber: 4,
			items: {
				type: 'object',
				required: [
					'height',
					'generatorAddress',
					'maxHeightGenerated',
					'maxHeightPrevoted',
					'prevoteWeight',
					'precommitWeight',
				],
				properties: {
					height: { dataType: 'uint32', fieldNumber: 1 },
					generatorAddress: { dataType: 'bytes', fieldNumber: 2 },
					maxHeightGenerated: { dataType: 'uint32', fieldNumber: 3 },
					maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 4 },
					prevoteWeight: { dataType: 'uint64', fieldNumber: 5 },
					precommitWeight: { dataType: 'uint64', fieldNumber: 6 },
				},
			},
		},
		activeValidatorsVoteInfo: {
			type: 'array',
			fieldNumber: 5,
			items: {
				type: 'object',
				required: ['address', 'minActiveHeight', 'largestHeightPrecommit'],
				properties: {
					address: { dataType: 'bytes', fieldNumber: 1 },
					minActiveHeight: { dataType: 'uint32', fieldNumber: 2 },
					largestHeightPrecommit: { dataType: 'uint32', fieldNumber: 3 },
				},
			},
		},
	},
};

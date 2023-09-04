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
import { TOKEN_ID_LENGTH } from '../../../constants';
import { BaseStore } from '../../base_store';

export interface ConfigStoreData {
	tokenIdTreasury: Buffer;
	voteDuration: number;
	quorumDuration: number;
	proposalCreationFee: bigint;
	proposalCreationDeposit: bigint;
	proposalCreationMinBalance: bigint;
	quorumPercentage: number;
	treasuryTokensPerBlock: bigint;
}

export const configSchema = {
	$id: '/governance/store/config',
	type: 'object',
	required: [
		'tokenIdTreasury',
		'voteDuration',
		'quorumDuration',
		'proposalCreationFee',
		'proposalCreationDeposit',
		'proposalCreationMinBalance',
		'quorumPercentage',
		'treasuryTokensPerBlock',
	],
	properties: {
		tokenIdTreasury: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 1,
		},
		voteDuration: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		quorumDuration: {
			dataType: 'uint32',
			fieldNumer: 3,
		},
		proposalCreationFee: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		proposalCreationDeposit: {
			dataType: 'uint64',
			fieldNumber: 5,
		},
		proposalCreationMinBalance: {
			dataType: 'uint64',
			fieldNumber: 6,
		},
		quorumPercentage: {
			dataType: 'uint32',
			fieldNumber: 7,
		},
		treasuryTokensPerBlock: {
			dataType: 'uint64',
			fieldNumber: 8,
		},
	},
};

export class ConfigStore extends BaseStore<ConfigStoreData> {
	public schema = configSchema;
}

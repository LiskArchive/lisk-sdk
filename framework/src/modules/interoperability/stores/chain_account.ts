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

export interface LastCertificate {
	height: number;
	timestamp: number;
	stateRoot: Buffer;
	validatorsHash: Buffer;
}

export interface LastCertificateJSON {
	height: number;
	timestamp: number;
	stateRoot: string;
	validatorsHash: string;
}

export interface ChainAccount {
	name: string;
	lastCertificate: LastCertificate;
	status: number;
}

const chainAccountJSONSchema = {
	type: 'object',
	required: ['name', 'lastCertificate', 'status'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
		lastCertificate: {
			type: 'object',
			fieldNumber: 2,
			required: ['height', 'timestamp', 'stateRoot', 'validatorsHash'],
			properties: {
				height: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				timestamp: {
					dataType: 'uint32',
					fieldNumber: 2,
				},
				stateRoot: {
					dataType: 'bytes',
					fieldNumber: 3,
				},
				validatorsHash: {
					dataType: 'bytes',
					fieldNumber: 4,
				},
			},
		},
		status: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};
export const chainAccountSchema = {
	$id: '/modules/interoperability/chainAccount',
	...chainAccountJSONSchema,
};

export const allChainAccountsSchema = {
	$id: '/modules/interoperability/allChainAccounts',
	type: 'object',
	required: ['chains'],
	properties: {
		chains: {
			type: 'array',
			items: chainAccountJSONSchema,
		},
	},
};

export class ChainAccountStore extends BaseStore<ChainAccount> {
	public schema = chainAccountSchema;
}

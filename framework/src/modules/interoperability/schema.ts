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

export const chainAccountSchema = {
	$id: 'modules/interoperability/chainAccount',
	type: 'object',
	required: ['name', 'networkID', 'lastCertificate', 'status'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
		networkID: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		lastCertificate: {
			type: 'object',
			fieldNumber: 3,
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
			fieldNumber: 4,
		},
	},
};

export const terminatedStateSchema = {
	$id: 'modules/interoperability/terminatedState',
	type: 'object',
	required: ['stateRoot'],
	properties: {
		stateRoot: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		mainchainStateRoot: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		initialized: {
			dataType: 'boolean',
			fieldNumber: 3,
		},
	},
};

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

export const configSchema = {
	$id: '#/plugins/chainConnector/config',
	type: 'object',
	properties: {
		mainchainIPCPath: {
			type: 'string',
			description: 'The IPC path to a mainchain node',
		},
		sidechainIPCPath: {
			type: 'string',
			description: 'The IPC path to a sidechain node',
		},
		ccmBasedFrequency: {
			type: 'integer',
			description: 'Number of Cross chain messages after which a CCU should be created',
		},
		livenessBasedFrequency: {
			type: 'integer',
			description: 'Number of blocks after which a CCU should be created',
		},
	},
	required: ['mainchainIPCPath'],
	default: {
		ccmFrequency: 10,
		livenessFrequency: 86400,
	},
};

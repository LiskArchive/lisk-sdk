/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */

import { DEFAULT_HOST, DEFAULT_PORT_P2P, DEFAULT_PORT_RPC } from '../constants';

export const applicationConfigSchema = {
	$id: '#/config',
	type: 'object',
	required: ['system', 'rpc', 'network', 'modules', 'plugins', 'genesis'],
	properties: {
		system: {
			type: 'object',
			required: ['version', 'dataPath', 'logLevel', 'keepEventsForHeights'],
			properties: {
				version: {
					type: 'string',
					format: 'version',
				},
				dataPath: {
					type: 'string',
				},
				logLevel: {
					type: 'string',
					enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'none'],
				},
				keepEventsForHeights: {
					type: 'integer',
				},
			},
		},
		rpc: {
			type: 'object',
			required: ['modes', 'host', 'port'],
			properties: {
				modes: {
					type: 'array',
					items: { type: 'string', enum: ['ipc', 'ws', 'http'] },
					uniqueItems: true,
				},
				host: { type: 'string' },
				port: { type: 'number', minimum: 1024, maximum: 65535 },
			},
		},
		network: {
			type: 'object',
			properties: {
				version: {
					type: 'string',
					format: 'networkVersion',
				},
				port: {
					type: 'integer',
					minimum: 1,
					maximum: 65535,
				},
				host: {
					type: 'string',
					format: 'ip',
				},
				seedPeers: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							ip: {
								type: 'string',
								format: 'ipOrFQDN',
							},
							port: {
								type: 'integer',
								minimum: 1,
								maximum: 65535,
							},
						},
					},
				},
				blacklistedIPs: {
					type: 'array',
					items: {
						type: 'string',
						format: 'ip',
					},
				},
				// Warning! The connectivity of the node might be negatively impacted if using this option.
				fixedPeers: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							ip: {
								type: 'string',
								format: 'ip',
							},
							port: {
								type: 'integer',
								minimum: 1,
								maximum: 65535,
							},
						},
					},
					maximum: 4,
				},
				// Warning! Beware of declaring only trustworthy peers in this array as these could attack a
				// node with a denial-of-service attack because the banning mechanism is deactivated.
				whitelistedPeers: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							ip: {
								type: 'string',
								format: 'ip',
							},
							port: {
								type: 'integer',
								minimum: 1,
								maximum: 65535,
							},
						},
					},
				},
				maxOutboundConnections: {
					type: 'integer',
				},
				maxInboundConnections: {
					type: 'integer',
				},
				wsMaxPayload: {
					type: 'integer',
					maximum: 3048576,
				},
				advertiseAddress: {
					type: 'boolean',
				},
			},
			required: ['seedPeers'],
		},
		transactionPool: {
			type: 'object',
			properties: {
				maxTransactions: {
					type: 'integer',
					minimum: 1,
				},
				maxTransactionsPerAccount: {
					type: 'integer',
					minimum: 1,
				},
				transactionExpiryTime: {
					type: 'integer',
					minimum: 60 * 1000,
				},
				minEntranceFeePriority: {
					type: 'string',
					format: 'uint64',
				},
				minReplacementFeeDifference: {
					type: 'string',
					format: 'uint64',
				},
			},
		},
		genesis: {
			type: 'object',
			required: ['block', 'blockTime', 'bftBatchSize', 'chainID', 'maxTransactionsSize'],
			properties: {
				block: {
					type: 'object',
					oneOf: [
						{
							required: ['fromFile'],
							properties: {
								fromFile: {
									type: 'string',
								},
								blob: {
									type: 'string',
									format: 'hex',
								},
							},
						},
						{
							required: ['blob'],
							properties: {
								fromFile: {
									type: 'string',
								},
								blob: {
									type: 'string',
									format: 'hex',
								},
							},
						},
					],
				},
				blockTime: {
					type: 'number',
					minimum: 2,
					description: 'Slot time interval in seconds',
				},
				bftBatchSize: {
					type: 'number',
					minimum: 1,
					description: 'The length of a round',
				},
				chainID: {
					type: 'string',
					format: 'hex',
					description: 'The unique name of the chain as a string encoded in Hex format',
				},
				maxTransactionsSize: {
					type: 'integer',
					// eslint-disable-next-line @typescript-eslint/no-magic-numbers
					minimum: 10 * 1024, // Kilo Bytes
					// eslint-disable-next-line @typescript-eslint/no-magic-numbers
					maximum: 30 * 1024, // Kilo Bytes
					description: 'Maximum number of transactions allowed per block',
				},
			},
			additionalProperties: false,
		},
		generator: {
			type: 'object',
			required: ['keys'],
			properties: {
				keys: {
					type: 'object',
					properties: {
						fromFile: {
							type: 'string',
							description: 'Path to a file which stores keys',
						},
					},
				},
			},
		},
		modules: {
			type: 'object',
			propertyNames: {
				pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
			},
			additionalProperties: { type: 'object' },
		},
		plugins: {
			type: 'object',
		},
	},
	additionalProperties: false,
	default: {
		system: {
			dataPath: '~/.lisk/beta-sdk-app',
			version: '0.1.0',
			keepEventsForHeights: 300,
			logLevel: 'info',
		},
		rpc: {
			modes: ['ipc'],
			port: DEFAULT_PORT_RPC,
			host: DEFAULT_HOST,
		},
		network: {
			version: '1.0',
			seedPeers: [],
			port: DEFAULT_PORT_P2P,
		},
		transactionPool: {
			maxTransactions: 4096,
			maxTransactionsPerAccount: 64,
			transactionExpiryTime: 3 * 60 * 60 * 1000,
			minEntranceFeePriority: '0',
			minReplacementFeeDifference: '10',
		},
		genesis: {
			block: {
				fromFile: './config/genesis_block.blob',
			},
			blockTime: 10,
			bftBatchSize: 103,
			chainID: '10000000',
			// eslint-disable-next-line @typescript-eslint/no-magic-numbers
			maxTransactionsSize: 15 * 1024, // Kilo Bytes
		},
		generator: {
			keys: {},
		},
		modules: {},
		plugins: {},
	},
};

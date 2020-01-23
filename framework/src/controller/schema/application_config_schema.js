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
 */

'use strict';

module.exports = {
	id: '#/app/config',
	type: 'object',
	required: ['app', 'network', 'components', 'modules'],
	properties: {
		app: {
			type: 'object',
			required: [
				'version',
				'minVersion',
				'protocolVersion',
				'ipc',
				'genesisConfig',
			],
			properties: {
				label: {
					type: 'string',
					pattern: '^[a-zA-Z][0-9a-zA-Z\\_\\-]*$',
					minLength: 1,
					maxLength: 30,
					description:
						'Restricted length due to unix domain socket path length limitations.',
				},
				version: {
					type: 'string',
					format: 'version',
				},
				minVersion: {
					type: 'string',
					format: 'version',
				},
				protocolVersion: {
					type: 'string',
					format: 'protocolVersion',
				},
				buildVersion: {
					type: 'string',
					example: 'v09:54:35 12/04/2017',
					description:
						'The build number. Consists of `v` + the date and time of the build of the node.',
				},
				lastCommitId: {
					type: 'string',
					format: 'hex',
					minLength: 40,
					maxLength: 40,
					example: '968d7b5b97a5bfad8f77614dc8a9918de49f6c6e',
					description: 'The version of Lisk Core that the peer node runs on.',
				},
				tempPath: {
					type: 'string',
					format: 'path',
					minLength: 1,
					maxLength: 50,
					example: '/tmp/lisk',
					description:
						'The root path for storing temporary pid and socket file. Restricted length due to unix domain socket path length limitations.',
				},
				ipc: {
					type: 'object',
					properties: {
						enabled: {
							type: 'boolean',
						},
					},
				},
				genesisConfig: {
					id: '#/app/genesisConfig',
					type: 'object',
					required: [
						'EPOCH_TIME',
						'BLOCK_TIME',
						'MAX_TRANSACTIONS_PER_BLOCK',
						'DELEGATE_LIST_ROUND_OFFSET',
						'REWARDS',
					],
					properties: {
						EPOCH_TIME: {
							type: 'string',
							format: 'date-time',
							description:
								'Timestamp indicating the start of Lisk Core (`Date.toISOString()`)',
						},
						// NOTICE: BLOCK_TIME and MAX_TRANSACTIONS_PER_BLOCK are related and it's values
						// need to be changed togeter as per recommendations noted in https://github.com/LiskHQ/lisk-sdk/issues/3151
						BLOCK_TIME: {
							type: 'number',
							minimum: 2,
							description: 'Slot time interval in seconds',
						},
						// NOTICE: BLOCK_TIME and MAX_TRANSACTIONS_PER_BLOCK are related and it's values
						// need to be changed togeter as per recommendations noted in https://github.com/LiskHQ/lisk-sdk/issues/3151
						MAX_TRANSACTIONS_PER_BLOCK: {
							type: 'integer',
							minimum: 1,
							maximum: 150,
							description: 'Maximum number of transactions allowed per block',
						},
						DELEGATE_LIST_ROUND_OFFSET: {
							type: 'number',
							minimum: 0,
							description:
								'Number of rounds before in which the list of delegates will be used for the current round - i.e. The set of active delegates that will be chosen to forge during round `r` will be taken from the list generated in the end of round `r - DELEGATE_LIST_ROUND_OFFSET`',
						},
						REWARDS: {
							id: 'rewards',
							type: 'object',
							required: ['MILESTONES', 'OFFSET', 'DISTANCE'],
							description: 'Object representing LSK rewards milestone',
							properties: {
								MILESTONES: {
									type: 'array',
									items: {
										type: 'string',
										format: 'amount',
									},
									description: 'Initial 5, and decreasing until 1',
								},
								OFFSET: {
									type: 'integer',
									minimum: 1,
									description: 'Start rewards at block (n)',
								},
								DISTANCE: {
									type: 'integer',
									minimum: 1,
									description: 'Distance between each milestone',
								},
							},
							additionalProperties: false,
						},
					},
					additionalProperties: false,
				},
			},
		},
		network: {
			type: 'object',
			properties: {
				wsPort: {
					type: 'integer',
					minimum: 1,
					maximum: 65535,
					env: 'LISK_WS_PORT',
					arg: '--port,-p',
				},
				hostIp: {
					type: 'string',
					format: 'ip',
					env: 'LISK_ADDRESS',
					arg: '--address,-a',
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
							wsPort: {
								type: 'integer',
								minimum: 1,
								maximum: 65535,
							},
						},
					},
					env: { variable: 'LISK_PEERS', formatter: 'stringToIpPortSet' },
					arg: { name: '--peers,-x', formatter: 'stringToIpPortSet' }, // TODO: Need to confirm parsing logic, old logic was using network WSPort to be default port for peers, we don't have it at the time of compilation
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
							wsPort: {
								type: 'integer',
								minimum: 1,
								maximum: 65535,
							},
						},
					},
					maximum: 4,
					env: { variable: 'LISK_PEERS', formatter: 'stringToIpPortSet' },
					arg: { name: '--peers,-x', formatter: 'stringToIpPortSet' },
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
							wsPort: {
								type: 'integer',
								minimum: 1,
								maximum: 65535,
							},
						},
					},
					env: { variable: 'LISK_PEERS', formatter: 'stringToIpPortSet' },
					arg: { name: '--peers,-x', formatter: 'stringToIpPortSet' },
				},
				peerBanTime: {
					type: 'integer',
				},
				populatorInterval: {
					type: 'integer',
				},
				connectTimeout: {
					type: 'integer',
				},
				ackTimeout: {
					type: 'integer',
				},
				maxOutboundConnections: {
					type: 'integer',
				},
				maxInboundConnections: {
					type: 'integer',
				},
				sendPeerLimit: {
					type: 'integer',
					minimum: 1,
					maximum: 100,
				},
				maxPeerDiscoveryResponseLength: {
					type: 'integer',
					maximum: 1000,
				},
				maxPeerInfoSize: {
					type: 'integer',
					maximum: 20480,
				},
				wsMaxPayload: {
					type: 'integer',
					maximum: 3048576,
				},
				outboundShuffleInterval: {
					type: 'integer',
				},
				advertiseAddress: {
					type: 'boolean',
				},
			},
			required: ['seedPeers'],
			default: {
				wsPort: 5000,
				seedPeers: [],
			},
		},
		components: {
			type: 'object',
			required: ['logger', 'cache', 'storage'],
			properties: {
				logger: {
					type: 'object',
				},
				cache: {
					type: 'object',
				},
				storage: {
					type: 'object',
				},
			},
		},
		modules: {
			type: 'object',
			required: ['chain', 'http_api'],
			properties: {
				chain: {
					type: 'object',
				},
				http_api: {
					type: 'object',
				},
			},
		},
	},
	additionalProperties: false,
	default: {
		app: {
			label: 'alpha-sdk-app',
			version: '0.0.0',
			minVersion: '0.0.0',
			protocolVersion: '1.1',
			tempPath: '/tmp/lisk',
			ipc: {
				enabled: false,
			},
			genesisConfig: {
				EPOCH_TIME: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
				BLOCK_TIME: 10,
				MAX_TRANSACTIONS_PER_BLOCK: 25,
				DELEGATE_LIST_ROUND_OFFSET: 2,
				REWARDS: {
					MILESTONES: [
						'500000000', // Initial Reward
						'400000000', // Milestone 1
						'300000000', // Milestone 2
						'200000000', // Milestone 3
						'100000000', // Milestone 4
					],
					OFFSET: 2160, // Start rewards at 39th block of 22nd round
					DISTANCE: 3000000, // Distance between each milestone
				},
			},
		},
		network: {
			seedPeers: [],
		},
		components: {
			system: {},
			logger: {},
			cache: {},
			storage: {},
		},
		modules: {
			chain: {},
			http_api: {},
		},
	},
};

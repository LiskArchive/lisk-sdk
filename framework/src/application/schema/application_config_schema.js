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
	required: ['app', 'components', 'modules'],
	properties: {
		app: {
			type: 'object',
			required: [
				'version',
				'minVersion',
				'protocolVersion',
				'ipc',
				'genesisConfig',
				'network',
				'node',
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
				},
				node: {
					type: 'object',
					properties: {
						broadcasts: {
							type: 'object',
							properties: {
								active: {
									type: 'boolean',
								},
								broadcastInterval: {
									type: 'integer',
									minimum: 1000,
									maximum: 60000,
								},
								releaseLimit: {
									type: 'integer',
									minimum: 1,
									maximum: 25,
								},
							},
							required: ['broadcastInterval', 'releaseLimit'],
						},
						transactions: {
							type: 'object',
							properties: {
								maxTransactionsPerQueue: {
									type: 'integer',
									minimum: 100,
									maximum: 5000,
								},
							},
							required: ['maxTransactionsPerQueue'],
						},
						forging: {
							type: 'object',
							properties: {
								force: {
									type: 'boolean',
								},
								waitThreshold: {
									description:
										'Number of seconds to wait for previous block before forging',
									type: 'integer',
								},
								defaultPassword: {
									type: 'string',
								},
								delegates: {
									type: 'array',
									env: {
										variable: 'LISK_FORGING_DELEGATES',
										formatter: 'stringToDelegateList',
									},
									items: {
										properties: {
											encryptedPassphrase: {
												type: 'string',
												format: 'encryptedPassphrase',
											},
											publicKey: {
												type: 'string',
												format: 'publicKey',
											},
										},
									},
								},
							},
							required: ['force', 'waitThreshold', 'delegates'],
						},
						syncing: {
							type: 'object',
							properties: {
								active: {
									type: 'boolean',
								},
							},
							required: ['active'],
						},
						loading: {
							type: 'object',
							properties: {
								loadPerIteration: {
									type: 'integer',
									minimum: 1,
									maximum: 5000,
								},
								rebuildUpToRound: {
									type: ['integer', 'null'],
									arg: '--rebuild,-b',
								},
							},
							required: ['loadPerIteration'],
						},
						exceptions: {
							type: 'object',
							properties: {
								blockRewards: {
									type: 'array',
									items: {
										type: 'string',
										format: 'id',
									},
								},
								senderPublicKey: {
									type: 'array',
									items: {
										type: 'string',
										format: 'id',
									},
								},
								signatures: {
									type: 'array',
									items: {
										type: 'string',
										format: 'id',
									},
								},
								signSignature: {
									type: 'array',
									items: {
										type: 'string',
										format: 'id',
									},
								},
								multisignatures: {
									type: 'array',
									items: {
										type: 'string',
										format: 'id',
									},
								},
								votes: {
									type: 'array',
									items: {
										type: 'string',
										format: 'id',
									},
								},
								inertTransactions: {
									type: 'array',
									items: {
										type: 'string',
										format: 'id',
									},
								},
								roundVotes: {
									type: 'array',
									items: {
										type: 'string',
										format: 'id',
									},
								},
								rounds: {
									type: 'object',
									description:
										'In the format: 27040: { rewards_factor: 2, fees_factor: 2, fees_bonus: 10000000 }',
								},
								precedent: {
									type: 'object',
									description:
										'A rule/authoritative checkpoint in place to follow in future',
									properties: {
										disableDappTransfer: {
											type: 'integer',
										},
										disableDappTransaction: {
											type: 'integer',
										},
										disableV1Transactions: {
											type: 'integer',
										},
									},
									required: [
										'disableDappTransfer',
										'disableDappTransaction',
										'disableV1Transactions',
									],
								},
								ignoreDelegateListCacheForRounds: {
									type: 'array',
									items: {
										type: 'integer',
									},
								},
								blockVersions: {
									type: 'object',
									description:
										'In format: { version: { start: start_height, end: end_height }}',
								},
								recipientLeadingZero: {
									type: 'object',
									description:
										'In format: { transaction_id: "account_address"} ',
								},
								recipientExceedingUint64: {
									type: 'object',
									description:
										'In format: { transaction_id: "account_address"} ',
								},
								duplicatedSignatures: {
									type: 'object',
									description:
										'In format: { transaction_id: [signature1, signature2] } ',
								},
								transactionWithNullByte: {
									type: 'array',
									items: {
										type: 'string',
										format: 'id',
									},
								},
							},
							required: [
								'blockRewards',
								'senderPublicKey',
								'signatures',
								'multisignatures',
								'votes',
								'inertTransactions',
								'rounds',
								'precedent',
								'ignoreDelegateListCacheForRounds',
								'blockVersions',
								'recipientLeadingZero',
								'recipientExceedingUint64',
								'duplicatedSignatures',
								'transactionWithNullByte',
							],
						},
					},
					required: [
						'broadcasts',
						'transactions',
						'forging',
						'syncing',
						'loading',
						'exceptions',
					],
				},
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
			network: {
				seedPeers: [],
				wsPort: 5000,
			},
			node: {
				broadcasts: {
					active: true,
					broadcastInterval: 5000,
					releaseLimit: 25,
				},
				transactions: {
					maxTransactionsPerQueue: 1000,
				},
				forging: {
					force: false,
					waitThreshold: 2,
					delegates: [],
				},
				syncing: {
					active: true,
				},
				loading: {
					loadPerIteration: 5000,
					rebuildUpToRound: null,
				},
				exceptions: {
					blockRewards: [],
					senderPublicKey: [],
					signatures: [],
					signSignature: [],
					multisignatures: [],
					votes: [],
					inertTransactions: [],
					rounds: {},
					precedent: {
						disableDappTransfer: 0,
						disableDappTransaction: 0,
						disableV1Transactions: 0,
					},
					ignoreDelegateListCacheForRounds: [],
					blockVersions: {},
					roundVotes: [],
					recipientLeadingZero: {},
					recipientExceedingUint64: {},
					duplicatedSignatures: {},
					transactionWithNullByte: [],
				},
			},
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

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
export const applicationConfigSchema = {
	id: '#/config',
	type: 'object',
	required: [
		'version',
		'protocolVersion',
		'ipc',
		'genesisConfig',
		'forging',
		'network',
		'components',
		'modules',
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
		protocolVersion: {
			type: 'string',
			format: 'protocolVersion',
		},
		buildVersion: {
			type: 'string',
			example: '2020-01-16T13:43:35.000Z',
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
		rootPath: {
			type: 'string',
			format: 'path',
			minLength: 1,
			maxLength: 50,
			example: '~/.lisk',
			description:
				'The root path for storing temporary pid and socket file and data. Restricted length due to unix domain socket path length limitations.',
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
			id: '#/config/genesisConfig',
			type: 'object',
			required: ['epochTime', 'blockTime', 'maxPayloadLength', 'rewards'],
			properties: {
				epochTime: {
					type: 'string',
					format: 'date-time',
					description:
						'Timestamp indicating the start of Lisk Core (`Date.toISOString()`)',
				},
				// NOTICE: blockTime and maxPayloadLength are related and it's values
				// need to be changed together as per recommendations noted in https://github.com/LiskHQ/lisk-sdk/issues/3151
				// TODO this recommendations need to be updated now that we changed to a byte size block
				blockTime: {
					type: 'number',
					minimum: 2,
					description: 'Slot time interval in seconds',
				},
				// NOTICE: blockTime and maxPayloadLength are related and it's values
				// need to be changed together as per recommendations noted in https://github.com/LiskHQ/lisk-sdk/issues/3151
				// TODO this recommendations need to be updated now that we changed to a byte size block
				maxPayloadLength: {
					type: 'integer',
					// eslint-disable-next-line @typescript-eslint/no-magic-numbers
					minimum: 10 * 1024, // Kilo Bytes
					// eslint-disable-next-line @typescript-eslint/no-magic-numbers
					maximum: 30 * 1024, // Kilo Bytes
					description: 'Maximum number of transactions allowed per block',
				},
				rewards: {
					id: '#/config/rewards',
					type: 'object',
					required: ['milestones', 'offset', 'distance'],
					description: 'Object representing LSK rewards milestone',
					properties: {
						milestones: {
							type: 'array',
							items: {
								type: 'string',
								format: 'amount',
							},
							description: 'Initial 5, and decreasing until 1',
						},
						offset: {
							type: 'integer',
							minimum: 1,
							description: 'Start rewards at block (n)',
						},
						distance: {
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
		forging: {
			type: 'object',
			required: ['force', 'waitThreshold', 'delegates'],
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
						required: ['encryptedPassphrase', 'publicKey', 'hashOnion'],
						properties: {
							encryptedPassphrase: {
								type: 'string',
								format: 'encryptedPassphrase',
							},
							publicKey: {
								type: 'string',
								format: 'publicKey',
							},
							hashOnion: {
								type: 'object',
								required: ['count', 'distance', 'hashes'],
								properties: {
									count: {
										type: 'integer',
									},
									distance: {
										type: 'integer',
									},
									hashes: {
										type: 'array',
										items: {
											type: 'string',
											format: 'hex',
										},
									},
								},
							},
						},
					},
				},
			},
		},
		rebuildUpToRound: {
			type: ['integer', 'null'],
			arg: '--rebuild,-b',
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
				},
				peerBanTime: {
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
				advertiseAddress: {
					type: 'boolean',
				},
			},
			required: ['seedPeers'],
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
			required: ['http_api'],
			properties: {
				// eslint-disable-next-line @typescript-eslint/camelcase
				http_api: {
					type: 'object',
				},
			},
		},
	},
	additionalProperties: false,
	default: {
		label: 'alpha-sdk-app',
		version: '0.0.0',
		protocolVersion: '1.1',
		rootPath: '~/.lisk',
		ipc: {
			enabled: false,
		},
		genesisConfig: {
			// eslint-disable-next-line @typescript-eslint/no-magic-numbers
			epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
			blockTime: 10,
			// eslint-disable-next-line @typescript-eslint/no-magic-numbers
			maxPayloadLength: 15 * 1024, // Kilo Bytes
			rewards: {
				milestones: [
					'500000000', // Initial Reward
					'400000000', // Milestone 1
					'300000000', // Milestone 2
					'200000000', // Milestone 3
					'100000000', // Milestone 4
				],
				offset: 2160, // Start rewards at 39th block of 22nd round
				distance: 3000000, // Distance between each milestone
			},
		},
		rebuildUpToRound: null,
		forging: {
			force: false,
			waitThreshold: 2,
			delegates: [],
		},
		network: {
			seedPeers: [],
			wsPort: 5000,
		},
		components: {
			logger: {},
			cache: {},
			storage: {},
		},
		modules: {
			// eslint-disable-next-line @typescript-eslint/camelcase
			http_api: {},
		},
	},
};

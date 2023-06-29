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
	$id: '#/config',
	type: 'object',
	required: ['version', 'networkVersion', 'backup', 'rpc', 'genesisConfig', 'forging', 'network', 'plugins'],
	properties: {
		label: {
			type: 'string',
			pattern: '^[a-zA-Z][0-9a-zA-Z_-]*$',
			minLength: 1,
			maxLength: 30,
			description: 'Restricted length due to unix domain socket path length limitations.',
		},
		version: {
			type: 'string',
			format: 'version',
		},
		networkVersion: {
			type: 'string',
			format: 'networkVersion',
		},
		rootPath: {
			type: 'string',
			format: 'path',
			minLength: 1,
			maxLength: 50,
			examples: ['~/.lisk'],
			description:
				'The root path for storing temporary pid and socket file and data. Restricted length due to unix domain socket path length limitations.',
		},
		backup: {
			type: 'object',
			required: ['height'],
			properties: {
				height: {
					type: 'integer',
					minimum: 0,
					description: 'Height at which the DB backup should be taken.',
				},
			},
		},
		logger: {
			type: 'object',
			required: ['fileLogLevel', 'logFileName', 'consoleLogLevel'],
			properties: {
				fileLogLevel: {
					type: 'string',
					enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'none'],
				},
				logFileName: {
					type: 'string',
				},
				consoleLogLevel: {
					type: 'string',
					enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'none'],
				},
			},
		},
		genesisConfig: {
			$id: '#/config/genesisConfig',
			type: 'object',
			required: ['blockTime', 'communityIdentifier', 'maxPayloadLength', 'rewards', 'roundLength'],
			properties: {
				blockTime: {
					type: 'number',
					minimum: 2,
					description: 'Slot time interval in seconds',
				},
				communityIdentifier: {
					type: 'string',
					description:
						'The unique name of the relevant community as a string encoded in UTF-8 format',
				},
				bftThreshold: {
					type: 'integer',
					minimum: 1,
					description: 'Number of validators required to set block finality',
				},
				minFeePerByte: {
					type: 'integer',
					minimum: 0,
					description: 'Minimum fee per bytes required for a transaction to be valid',
				},
				roundLength: {
					type: 'number',
					minimum: 1,
					description: 'Number of slots in a round',
				},
				baseFees: {
					type: 'array',
					description: 'Base fee for a transaction to be valid',
					items: {
						type: 'object',
						properties: {
							moduleID: {
								type: 'number',
								minimum: 2,
							},
							assetID: {
								type: 'integer',
								minimum: 0,
							},
							baseFee: {
								type: 'string',
								format: 'uint64',
							},
						},
					},
				},
				maxPayloadLength: {
					type: 'integer',
					// eslint-disable-next-line @typescript-eslint/no-magic-numbers
					minimum: 10 * 1024, // Kilo Bytes
					// eslint-disable-next-line @typescript-eslint/no-magic-numbers
					maximum: 30 * 1024, // Kilo Bytes
					description: 'Maximum number of transactions allowed per block',
				},
				rewards: {
					$id: '#/config/rewards',
					type: 'object',
					required: ['milestones', 'offset', 'distance'],
					description: 'Object representing LSK rewards milestone',
					properties: {
						milestones: {
							type: 'array',
							items: {
								type: 'string',
								format: 'uint64',
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
			additionalProperties: true,
		},
		forging: {
			type: 'object',
			required: ['force', 'waitThreshold', 'delegates'],
			properties: {
				force: {
					type: 'boolean',
				},
				waitThreshold: {
					description: 'Number of seconds to wait for previous block before forging',
					type: 'integer',
				},
				defaultPassword: {
					type: 'string',
				},
				delegates: {
					type: 'array',
					items: {
						required: ['encryptedPassphrase', 'address', 'hashOnion'],
						properties: {
							encryptedPassphrase: {
								type: 'string',
								format: 'encryptedPassphrase',
							},
							address: {
								type: 'string',
								format: 'hex',
							},
							hashOnion: {
								type: 'object',
								required: ['count', 'distance', 'hashes'],
								properties: {
									count: {
										minimum: 1,
										type: 'integer',
									},
									distance: {
										minimum: 1,
										type: 'integer',
									},
									hashes: {
										type: 'array',
										minItems: 2,
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
		network: {
			type: 'object',
			properties: {
				port: {
					type: 'integer',
					minimum: 1,
					maximum: 65535,
				},
				hostIp: {
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
		plugins: {
			type: 'object',
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
		rpc: {
			type: 'object',
			properties: {
				enable: {
					type: 'boolean',
				},
				mode: {
					type: 'string',
					enum: ['ipc', 'ws'],
				},
				port: {
					type: 'number',
					minimum: 1024,
					maximum: 65535,
				},
				host: {
					type: 'string',
					format: 'ip',
				},
			},
		},
	},
	additionalProperties: false,
	default: {
		label: 'beta-sdk-app',
		version: '0.0.0',
		networkVersion: '1.1',
		rootPath: '~/.lisk',
		logger: {
			fileLogLevel: 'info',
			consoleLogLevel: 'none',
			logFileName: 'lisk.log',
		},
		rpc: {
			enable: false,
			mode: 'ipc',
			port: 8080,
			host: '127.0.0.1',
		},
		backup: {
			height: 0,
		},
		genesisConfig: {
			blockTime: 10,
			communityIdentifier: 'sdk',
			// eslint-disable-next-line @typescript-eslint/no-magic-numbers
			maxPayloadLength: 15 * 1024, // Kilo Bytes
			bftThreshold: 68,
			minFeePerByte: 1000,
			baseFees: [],
			roundLength: 103,
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
		forging: {
			force: false,
			waitThreshold: 2,
			delegates: [],
		},
		network: {
			seedPeers: [],
			port: 5000,
		},
		transactionPool: {
			maxTransactions: 4096,
			maxTransactionsPerAccount: 64,
			transactionExpiryTime: 3 * 60 * 60 * 1000,
			minEntranceFeePriority: '0',
			minReplacementFeeDifference: '10',
		},
		plugins: {},
	},
};

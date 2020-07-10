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
	required: ['version', 'networkVersion', 'ipc', 'genesisConfig', 'forging', 'network', 'plugins'],
	properties: {
		label: {
			type: 'string',
			pattern: '^[a-zA-Z][0-9a-zA-Z\\_\\-]*$',
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
		buildVersion: {
			type: 'string',
			example: '2020-01-16T13:43:35.000Z',
			description:
				'The build number. Consists of `v` + the date and time of the build of the node.',
		},
		lastCommitId: {
			type: 'string',
			format: 'base64',
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
			id: '#/config/genesisConfig',
			type: 'object',
			required: ['blockTime', 'communityIdentifier', 'maxPayloadLength', 'rewards'],
			properties: {
				// NOTICE: blockTime and maxPayloadLength are related and it's values
				// need to be changed together as per recommendations noted in https://github.com/LiskHQ/lisk-sdk/issues/3151
				// TODO this recommendations need to be updated now that we changed to a byte size block
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
								format: 'base64',
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
											format: 'base64',
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
	},
	additionalProperties: false,
	default: {
		label: 'alpha-sdk-app',
		version: '0.0.0',
		networkVersion: '1.1',
		rootPath: '~/.lisk',
		ipc: {
			enabled: false,
		},
		logger: {
			fileLogLevel: 'info',
			consoleLogLevel: 'none',
			logFileName: 'lisk.log',
		},
		genesisConfig: {
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
		forging: {
			force: false,
			waitThreshold: 2,
			delegates: [],
		},
		network: {
			seedPeers: [],
			port: 5000,
		},
		plugins: {},
	},
};

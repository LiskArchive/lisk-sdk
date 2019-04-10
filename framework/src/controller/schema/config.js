module.exports = {
	config: {
		id: 'config',
		type: 'object',
		properties: {
			modulesDir: {
				type: 'string',
				description:
					'Path where to find the modules. Absolute or relative to executable file.',
			},
			modules: {
				type: 'array',
				items: {
					type: 'object',
					$ref: '#/moduleConfig',
				},
				uniqueItems: true,
			},
			components: {
				type: 'object',
				properties: {
					logger: {
						type: 'object',
						$ref: '#/components/loggerConfig',
					},
				},
				required: ['logger'],
				additionalProperties: false,
			},
			pkg: {
				type: 'object',
			},
			dirs: {
				type: 'object',
				properties: {
					root: {
						type: 'string',
					},
					temp: {
						type: 'string',
					},
					sockets: {
						type: 'string',
					},
					pids: {
						type: 'string',
					},
					modules: {
						type: 'string',
					},
				},
				additionalProperties: false,
			},
			ipc: {
				type: 'object',
				additionalProperties: false,
				properties: {
					enabled: {
						type: 'boolean',
					},
				},
			},
		},
		required: ['modules', 'components'],
		additionalProperties: false,
		default: {
			ipc: false,
		},
	},

	// TODO: be renamed
	network: {
		id: 'network',
		type: 'object',
		required: [
			'EPOCH_TIME',
			'BLOCK_TIME',
			'MAX_TRANSACTIONS_PER_BLOCK',
			'REWARDS',
		],
		properties: {
			EPOCH_TIME: {
				type: 'string',
				format: 'date-time',
				description:
					'Timestamp indicating the start of Lisk Core (`Date.toISOString()`)',
			},
			BLOCK_TIME: {
				type: 'number',
				min: 1,
				description: 'Slot time interval in seconds',
			},
			MAX_TRANSACTIONS_PER_BLOCK: {
				type: 'integer',
				min: 1,
				description: 'Maximum number of transactions allowed per block',
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
						min: 1,
						description: 'Start rewards at block (n)',
					},
					DISTANCE: {
						type: 'integer',
						min: 1,
						description: 'Distance between each milestone',
					},
				},
				additionalProperties: false,
			},
		},
		default: {
			EPOCH_TIME: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
			BLOCK_TIME: 10,
			MAX_TRANSACTIONS_PER_BLOCK: 25,
			REWARDS: {
				MILESTONES: [
					'500000000', // Initial Reward
					'400000000', // Milestone 1
					'300000000', // Milestone 2
					'200000000', // Milestone 3
					'100000000', // Milestone 4
				],
				OFFSET: 2160, // Start rewards at first block of the second round
				DISTANCE: 3000000, // Distance between each milestone
			},
		},
		additionalProperties: false,
	},

	moduleConfig: {
		id: 'moduleConfig',
		type: 'object',
		properties: {
			npmPackage: {
				type: 'string',
			},
			loadAs: {
				type: 'string',
				enum: ['child_process', 'in_memory'],
			},
			options: {
				type: 'object',
			},
		},
		required: ['npmPackage', 'loadAs'],
		additionalProperties: false,
	},

	components: {
		loggerConfig: {
			id: 'loggerConfig',
			type: 'object',
			properties: {
				filename: {
					type: 'string',
				},
				fileLogLevel: {
					type: 'string',
				},
				consoleLogLevel: {
					type: 'string',
				},
			},
			additionalProperties: false,
			required: ['filename', 'fileLogLevel', 'consoleLogLevel'],
		},
	},
};

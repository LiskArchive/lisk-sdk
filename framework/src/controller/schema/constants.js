module.exports = {
	constants: {
		id: 'constants',
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
				default: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
				description:
					'Timestamp indicating the start of Lisk Core (`Date.toISOString()`)',
			},
			BLOCK_TIME: {
				type: 'number',
				min: 1,
				default: 10,
				description: 'Slote time interval in seconds',
			},
			MAX_TRANSACTIONS_PER_BLOCK: {
				type: 'integer',
				min: 1,
				default: 25,
				description: 'Maximum number of transactions allowed per block',
			},
			REWARDS: {
				$ref: 'rewards',
				default: {
					MILESTONES: [
						'500000000', // Initial Reward
						'400000000', // Milestone 1
						'300000000', // Milestone 2
						'200000000', // Milestone 3
						'100000000', // Milestone 4
					],
					OFFSET: 2160,
					DISTANCE: 3000000,
				},
			},
		},
		additionalProperties: false,
	},
	rewards: {
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
				default: [
					'500000000', // Initial Reward
					'400000000', // Milestone 1
					'300000000', // Milestone 2
					'200000000', // Milestone 3
					'100000000', // Milestone 4
				],
				description: 'Initial 5, and decreasing until 1',
			},
			OFFSET: {
				type: 'integer',
				min: 1,
				default: 2160, // Start rewards at first block of the second round
				description: 'Start rewards at block (n)',
			},
			DISTANCE: {
				type: 'integer',
				min: 1,
				default: 3000000, // Distance between each milestone
				description: 'Distance between each milestone',
			},
		},
		additionalProperties: false,
	},
};

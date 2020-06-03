export const voteWeightsSchema = {
	$id: '/dpos/voteWeights',
	type: 'object',
	properties: {
		voteWeights: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					round: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					delegates: {
						type: 'array',
						fieldNumber: 2,
						items: {
							type: 'object',
							properties: {
								address: {
									dataType: 'bytes',
									fieldNumber: 1,
								},
								voteWeight: {
									dataType: 'uint64',
									fieldNumber: 2,
								},
							},
						},
					},
				},
			},
		},
	},
	required: ['voteWeights'],
};

export const forgerListSchema = {
	$id: '/dpos/forgerList',
	type: 'object',
	properties: {
		forgersList: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					round: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					delegates: {
						type: 'array',
						fieldNumber: 2,
						items: {
							dataType: 'bytes',
						},
					},
					standby: {
						type: 'array',
						fieldNumber: 3,
						items: {
							dataType: 'bytes',
						},
					},
				},
			},
		},
	},
	required: ['forgersList'],
};

const formatters = require('../formatters');

module.exports = {
	title: 'Env variables',
	anyOf: [
		{
			type: 'string',
			pattern: '^[A-Z_0-9]{3,}$',
		},
		{
			type: 'array',
			items: [
				{
					type: 'string',
					pattern: '^[A-Z_0-9]{3,}$',
				},
				{
					type: 'string',
					enum: Object.keys(formatters),
				},
			],
			minItems: 2,
			maxItems: 2,
		},
	],
};

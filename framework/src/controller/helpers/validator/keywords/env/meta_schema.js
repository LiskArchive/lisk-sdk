const formatters = require('../formatters');

module.exports = {
	title: 'Env variables',
	anyOf: [
		{
			type: 'string',
			pattern: '^[A-Z_0-9]{3,}$',
		},
		{
			type: 'object',
			properties: {
				variable: {
					type: 'string',
					pattern: '^[A-Z_0-9]{3,}$',
				},
				formatter: {
					type: 'string',
					enum: Object.keys(formatters),
				},
			},
			required: ['variable'],
			additionalProperties: false,
		},
	],
};

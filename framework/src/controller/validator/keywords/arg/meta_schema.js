const formatters = require('../formatters');

module.exports = {
	title: 'Command line arguments',
	anyOf: [
		{
			type: 'string',
			pattern: '^([-]{2}[a-z][a-zA-Z0-9-]*)(,[-][a-z]{1,1})?$',
		},
		{
			type: 'object',
			properties: {
				name: {
					type: 'string',
					pattern: '^([-]{2}[a-z][a-zA-Z0-9-]*)(,[-][a-z]{1,1})?$',
				},
				formatter: {
					type: 'string',
					enum: Object.keys(formatters),
				},
			},
			required: ['name'],
			additionalProperties: false,
		},
	],
};

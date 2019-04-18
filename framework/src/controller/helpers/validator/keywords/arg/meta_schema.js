const formatters = require('../formatters');

module.exports = {
	title: 'Command line arguments',
	anyOf: [
		{
			type: 'string',
			pattern: '^([-][a-z]{1,1})(,[-]{2}[a-z][a-z0-9-]*)?$',
		},
		{
			type: 'object',
			properties: {
				name: {
					type: 'string',
					pattern: '^([-][a-z]{1,1})(,[-]{2}[a-z][a-z0-9-]*)?$',
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

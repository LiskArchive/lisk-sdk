const formatters = require('../formatters');

module.exports = {
	title: 'Command line arguments',
	anyOf: [
		{
			type: 'string',
			pattern: '^([-][a-z]{1,1})(,[-]{2}[a-z][a-z0-9-]*)?$',
		},
		{
			type: 'array',
			items: [
				{
					type: 'string',
					pattern: '^([-][a-z]{1,1})(,[-]{2}[a-z][a-z0-9-]*)?$',
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

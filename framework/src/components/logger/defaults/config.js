const DefaultConfig = {
	type: 'object',
	properties: {
		fileLogLevel: {
			type: 'string',
			default: 'info',
		},
		logFileName: {
			type: 'string',
			default: 'logs/lisk.log',
		},
		consoleLogLevel: {
			type: 'string',
			default: 'none',
		},
	},
	required: ['fileLogLevel', 'logFileName', 'consoleLogLevel'],
};

module.exports = DefaultConfig;

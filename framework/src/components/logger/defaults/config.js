const DefaultConfig = {
	type: 'object',
	properties: {
		fileLogLevel: {
			type: 'string',
			default: 'info',
			enum: ['trace', 'debug', 'log', 'info', 'warn', 'error', 'fatal', 'none'],
		},
		logFileName: {
			type: 'string',
			default: 'logs/lisk.log',
		},
		consoleLogLevel: {
			type: 'string',
			default: 'none',
			enum: ['trace', 'debug', 'log', 'info', 'warn', 'error', 'fatal', 'none'],
		},
	},
	required: ['fileLogLevel', 'logFileName', 'consoleLogLevel'],
};

module.exports = DefaultConfig;

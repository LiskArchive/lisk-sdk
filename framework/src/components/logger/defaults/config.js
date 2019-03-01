const defaultConfig = {
	type: 'object',
	properties: {
		fileLogLevel: {
			type: 'string',
			default: 'info',
			enum: ['trace', 'debug', 'log', 'info', 'warn', 'error', 'fatal', 'none'],
			env: 'LISK_FILE_LOG_LEVEL',
			arg: '-l,--log',
		},
		logFileName: {
			type: 'string',
			default: 'logs/lisk.log',
			env: 'LISK_REDIS_HOST',
		},
		consoleLogLevel: {
			type: 'string',
			default: 'none',
			enum: ['trace', 'debug', 'log', 'info', 'warn', 'error', 'fatal', 'none'],
			env: 'LISK_CONSOLE_LOG_LEVEL',
		},
	},
	required: ['fileLogLevel', 'logFileName', 'consoleLogLevel'],
};

module.exports = defaultConfig;

const defaultConfig = {
	type: 'object',
	properties: {
		fileLogLevel: {
			type: 'string',
			enum: ['trace', 'debug', 'log', 'info', 'warn', 'error', 'fatal', 'none'],
			env: 'LISK_FILE_LOG_LEVEL',
			arg: '-l,--log',
		},
		logFileName: {
			type: 'string',
			env: 'LISK_REDIS_HOST',
		},
		consoleLogLevel: {
			type: 'string',
			enum: ['trace', 'debug', 'log', 'info', 'warn', 'error', 'fatal', 'none'],
			env: 'LISK_CONSOLE_LOG_LEVEL',
		},
	},
	required: ['fileLogLevel', 'logFileName', 'consoleLogLevel'],
	default: {
		fileLogLevel: 'info',
		consoleLogLevel: 'none',
		logFileName: 'logs/lisk.log',
	},
};

module.exports = defaultConfig;

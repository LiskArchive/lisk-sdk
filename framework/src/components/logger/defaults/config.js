const DefaultConfig = {
	type: 'object',
	properties: {
		fileLogLevel: {
			type: 'string',
			default: 'info',
			enum: ['none', 'trace', 'debug', 'log', 'info', 'warn', 'error', 'fatal'],
		},
		logFileName: {
			type: 'string',
			default: 'logs/lisk.log',
			minLength: 1,
		},
		consoleLogLevel: {
			type: 'string',
			default: 'none',
			enum: ['none', 'trace', 'debug', 'log', 'info', 'warn', 'error', 'fatal'],
		},
		level_abbr: {
			type: 'object',
			description: 'Optional: Change the label for different log levels.',
			properties: {
				trace: {
					type: 'string',
					default: 'trc',
				},
				debug: {
					type: 'string',
					default: 'dbg',
				},
				log: {
					type: 'string',
					default: 'log',
				},
				info: {
					type: 'string',
					default: 'inf',
				},
				warn: {
					type: 'string',
					default: 'WRN',
				},
				error: {
					type: 'string',
					default: 'ERR',
				},
				fatal: {
					type: 'string',
					default: 'FTL',
				},
			},
			required: ['trace', 'debug', 'log', 'info', 'warn', 'error', 'fatal'],
		},
		levels: {
			type: 'object',
			description:
				'Optional: Change the level for each type of log abbreviation.',
			properties: {
				none: {
					type: 'integer',
					default: 99,
				},
				trace: {
					type: 'integer',
					default: 0,
				},
				debug: {
					type: 'integer',
					default: 1,
				},
				log: {
					type: 'integer',
					default: 2,
				},
				info: {
					type: 'integer',
					default: 3,
				},
				warn: {
					type: 'integer',
					default: 4,
				},
				error: {
					type: 'integer',
					default: 5,
				},
				fatal: {
					type: 'integer',
					default: 6,
				},
			},
			required: [
				'none',
				'trace',
				'debug',
				'log',
				'info',
				'warn',
				'error',
				'fatal',
			],
		},
	},
	required: ['fileLogLevel', 'logFileName', 'consoleLogLevel'],
};

module.exports = DefaultConfig;

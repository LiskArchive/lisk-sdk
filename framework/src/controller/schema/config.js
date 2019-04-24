module.exports = {
	config: {
		id: 'config',
		type: 'object',
		properties: {
			modulesDir: {
				type: 'string',
				description:
					'Path where to find the modules. Absolute or relative to executable file.',
			},
			modules: {
				type: 'array',
				items: {
					type: 'object',
					$ref: '#/moduleConfig',
				},
				uniqueItems: true,
			},
			components: {
				type: 'object',
				properties: {
					logger: {
						type: 'object',
						$ref: '#/components/loggerConfig',
					},
				},
				required: ['logger'],
				additionalProperties: false,
			},
			pkg: {
				type: 'object',
			},
			dirs: {
				type: 'object',
				properties: {
					root: {
						type: 'string',
					},
					temp: {
						type: 'string',
					},
					sockets: {
						type: 'string',
					},
					pids: {
						type: 'string',
					},
					modules: {
						type: 'string',
					},
				},
				additionalProperties: false,
			},
		},
		required: ['modules', 'components'],
		additionalProperties: false,
	},

	moduleConfig: {
		id: 'moduleConfig',
		type: 'object',
		properties: {
			npmPackage: {
				type: 'string',
			},
			loadAs: {
				type: 'string',
				enum: ['child_process', 'in_memory'],
			},
			options: {
				type: 'object',
			},
		},
		required: ['npmPackage', 'loadAs'],
		additionalProperties: false,
	},

	components: {
		loggerConfig: {
			id: 'loggerConfig',
			type: 'object',
			properties: {
				filename: {
					type: 'string',
				},
				fileLogLevel: {
					type: 'string',
				},
				consoleLogLevel: {
					type: 'string',
				},
			},
			additionalProperties: false,
			required: ['filename', 'fileLogLevel', 'consoleLogLevel'],
		},
	},
};

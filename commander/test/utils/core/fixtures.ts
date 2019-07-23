export const config = {
	app: {
		version: '2.0.0-alpha.0',
		minVersion: '1.1.0-rc.0',
		protocolVersion: '1.0',
	},
	components: {
		logger: {
			fileLogLevel: 'debug',
			logFileName: 'logs/devnet/lisk.log',
			consoleLogLevel: 'info',
		},
		storage: {
			database: 'lisk_dev',
			min: 1,
			max: 10,
			logFileName: 'logs/devnet/lisk_db.log',
			host: 'localhost',
			port: 5432,
			user: 'lisk',
			password: 'password',
			poolIdleTimeout: 30000,
			reapIntervalMillis: 1000,
			logEvents: ['error'],
		},
		cache: {
			enabled: true,
			host: '127.0.0.1',
			port: 6380,
			db: 0,
			password: 'lisk',
		},
		system: {},
	},
	modules: {
		http_api: {
			access: {
				public: true,
				whiteList: ['127.0.0.1'],
			},
			enabled: true,
			httpPort: 4000,
			address: '0.0.0.0',
			trustProxy: false,
			ssl: {
				enabled: false,
				options: {
					port: 443,
					address: '0.0.0.0',
					key: './ssl/lisk.key',
					cert: './ssl/lisk.crt',
				},
			},
			options: {
				limits: {
					max: 0,
					delayMs: 0,
					delayAfter: 0,
					windowMs: 60000,
					headersTimeout: 5000,
					serverSetTimeout: 20000,
				},
				cors: {
					origin: '*',
					methods: ['GET', 'POST', 'PUT'],
				},
			},
			forging: {
				access: {
					whiteList: ['127.0.0.1'],
				},
			},
		},
		network: {
			seedPeers: [
				{
					ip: '127.0.0.1',
					wsPort: 5000,
				},
			],
			wsPort: 5000,
			address: '0.0.0.0',
			discoveryInterval: 30000,
			blacklistedPeers: [],
			ackTimeout: 20000,
			connectTimeout: 5000,
			wsEngine: 'ws',
		},
	},
	NETWORK: 'devnet',
};

'use strict';

var async = require('async');
var checkIpInList = require('./helpers/checkIpInList.js');
var extend = require('extend');
var fs = require('fs');

var genesisblock = require('./genesisBlock.json');
var git = require('./helpers/git.js');
var https = require('https');
var Logger = require('./logger.js');
var packageJson = require('./package.json');
var path = require('path');
var program = require('commander');
var httpApi = require('./helpers/httpApi.js');
var Sequence = require('./helpers/sequence.js');
var util = require('util');
var z_schema = require('./helpers/z_schema.js');

process.stdin.resume();

var versionBuild = fs.readFileSync(path.join(__dirname, 'build'), 'utf8');

/**
 * Hash of last git commit
 *
 * @private
 * @property lastCommit
 * @type {String}
 * @default ''
 */
var lastCommit = '';

if (typeof gc !== 'undefined') {
	setInterval(function () {
		gc();
	}, 60000);
}

program
	.version(packageJson.version)
	.option('-c, --config <path>', 'config file path')
	.option('-p, --port <port>', 'listening port number')
	.option('-a, --address <ip>', 'listening host name or ip')
	.option('-x, --peers [peers...]', 'peers list')
	.option('-l, --log <level>', 'log level')
	.option('-s, --snapshot <round>', 'verify snapshot')
	.parse(process.argv);

var appConfig = require('./helpers/config.js')(program.config);

if (program.port) {
	appConfig.port = program.port;
}

if (program.address) {
	appConfig.address = program.address;
}

if (program.peers) {
	if (typeof program.peers === 'string') {
		appConfig.peers.list = program.peers.split(',').map(function (peer) {
			peer = peer.split(':');
			return {
				ip: peer.shift(),
				port: peer.shift() || appConfig.port
			};
		});
	} else {
		appConfig.peers.list = [];
	}
}

if (program.log) {
	appConfig.consoleLogLevel = program.log;
}

if (program.snapshot) {
	appConfig.loading.snapshot = Math.abs(
		Math.floor(program.snapshot)
	);
}

if (process.env.NODE_ENV === 'test') {
	appConfig.coverage = true;
}

// Define top endpoint availability
process.env.TOP = appConfig.topAccounts;

var config = {
	db: appConfig.db,
	modules: {
		server: './modules/server.js',
		accounts: './modules/accounts.js',
		transactions: './modules/transactions.js',
		blocks: './modules/blocks.js',
		signatures: './modules/signatures.js',
		transport: './modules/transport.js',
		loader: './modules/loader.js',
		system: './modules/system.js',
		peers: './modules/peers.js',
		delegates: './modules/delegates.js',
		rounds: './modules/rounds.js',
		multisignatures: './modules/multisignatures.js',
		dapps: './modules/dapps.js',
		crypto: './modules/crypto.js',
		sql: './modules/sql.js'
	},
	api: {
		accounts: { http: './api/http/accounts.js' },
		blocks: { http: './api/http/blocks.js' },
		dapps: { http: './api/http/dapps.js' },
		delegates: { http: './api/http/delegates.js' },
		loader: { http: './api/http/loader.js' },
		multisignatures: { http: './api/http/multisignatures.js' },
		peers: { http: './api/http/peers.js' },
		server: { http: './api/http/server.js' },
		signatures: { http: './api/http/signatures.js' },
		transactions: { http: './api/http/transactions.js' },
		transport: { http: './api/http/transport.js' }
	}
};

var logger = new Logger({ echo: appConfig.consoleLogLevel, errorLevel: appConfig.fileLogLevel, filename: appConfig.logFileName });

// Trying to get last git commit
try {
	lastCommit = git.getLastCommit();
} catch (err) {
	logger.debug('Cannot get last git commit', err.message);
}

var d = require('domain').create();

d.on('error', function (err) {
	logger.fatal('Domain master', { message: err.message, stack: err.stack });
	process.exit(0);
});

d.run(function () {
	var modules = [];
	async.auto({
		config: function (cb) {
			try {
				appConfig.nethash = new Buffer(genesisblock.payloadHash, 'hex').toString('hex');
			} catch (e) {
				logger.error('Failed to assign nethash from genesis block');
				throw Error(e);
			}

			if (appConfig.dapp.masterrequired && !appConfig.dapp.masterpassword) {
				var randomstring = require('randomstring');

				appConfig.dapp.masterpassword = randomstring.generate({
					length: 12,
					readable: true,
					charset: 'alphanumeric'
				});

				if (appConfig.loading.snapshot != null) {
					delete appConfig.loading.snapshot;
				}

				fs.writeFileSync('./config.json', JSON.stringify(appConfig, null, 4));

				cb(null, appConfig);
			} else {
				cb(null, appConfig);
			}
		},

		logger: function (cb) {
			cb(null, logger);
		},

		build: function (cb) {
			cb(null, versionBuild);
		},
		/**
		 * Returns hash of last git commit
		 *
		 * @property lastCommit
		 * @type {Function}
		 * @async
		 * @param  {Function} cb Callback function
		 * @return {Function} cb Callback function from params
		 * @return {Object}   cb.err Always return `null` here
		 * @return {String}   cb.lastCommit Hash of last git commit
		 */
		lastCommit: function (cb) {
			cb(null, lastCommit);
		},

		genesisblock: function (cb) {
			cb(null, {
				block: genesisblock
			});
		},

		public: function (cb) {
			cb(null, path.join(__dirname, 'public'));
		},

		schema: function (cb) {
			cb(null, new z_schema());
		},

		network: ['config', function (scope, cb) {
			var express = require('express');
			var compression = require('compression');
			var cors = require('cors');
			var app = express();

			if (appConfig.coverage) {
				var im = require('istanbul-middleware');
				logger.debug('Hook loader for coverage - do not use in production environment!');
				im.hookLoader(__dirname);
				app.use('/coverage', im.createHandler());
			}

			require('./helpers/request-limiter')(app, appConfig);

			app.use(compression({ level: 9 }));
			app.use(cors());
			app.options('*', cors());

			var server = require('http').createServer(app);
			var io = require('socket.io')(server);

			var privateKey, certificate, https, https_io;

			if (scope.config.ssl.enabled) {
				privateKey = fs.readFileSync(scope.config.ssl.options.key);
				certificate = fs.readFileSync(scope.config.ssl.options.cert);

				https = require('https').createServer({
					key: privateKey,
					cert: certificate,
					ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:' + 'ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:' + '!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA'
				}, app);

				https_io = require('socket.io')(https);
			}

			cb(null, {
				express: express,
				app: app,
				server: server,
				io: io,
				https: https,
				https_io: https_io
			});
		}],

		dbSequence: ['logger', function (scope, cb) {
			var sequence = new Sequence({
				onWarning: function (current, limit) {
					scope.logger.warn('DB queue', current);
				}
			});
			cb(null, sequence);
		}],

		sequence: ['logger', function (scope, cb) {
			var sequence = new Sequence({
				onWarning: function (current, limit) {
					scope.logger.warn('Main queue', current);
				}
			});
			cb(null, sequence);
		}],

		balancesSequence: ['logger', function (scope, cb) {
			var sequence = new Sequence({
				onWarning: function (current, limit) {
					scope.logger.warn('Balance queue', current);
				}
			});
			cb(null, sequence);
		}],

		connect: ['config', 'public', 'genesisblock', 'logger', 'build', 'network', function (scope, cb) {
			var path = require('path');
			var bodyParser = require('body-parser');
			var methodOverride = require('method-override');
			var queryParser = require('express-query-int');
			var randomString = require('randomstring');

			scope.nonce = randomString.generate(16);
			scope.network.app.engine('html', require('ejs').renderFile);
			scope.network.app.use(require('express-domain-middleware'));
			scope.network.app.set('view engine', 'ejs');
			scope.network.app.set('views', path.join(__dirname, 'public'));
			scope.network.app.use(scope.network.express.static(path.join(__dirname, 'public')));
			scope.network.app.use(bodyParser.raw({limit: '2mb'}));
			scope.network.app.use(bodyParser.urlencoded({extended: true, limit: '2mb', parameterLimit: 5000}));
			scope.network.app.use(bodyParser.json({limit: '2mb'}));
			scope.network.app.use(methodOverride());

			var ignore = ['id', 'name', 'lastBlockId', 'blockId', 'transactionId', 'address', 'recipientId', 'senderId', 'previousBlock'];

			scope.network.app.use(queryParser({
				parser: function (value, radix, name) {
					if (ignore.indexOf(name) >= 0) {
						return value;
					}

					// Ignore conditional fields for transactions list
					if (/^.+?:(blockId|recipientId|senderId)$/.test(name)) {
						return value;
					}

					/*eslint-disable eqeqeq */
					if (isNaN(value) || parseInt(value) != value || isNaN(parseInt(value, radix))) {
						return value;
					}
					/*eslint-enable eqeqeq */
					return parseInt(value);
				}
			}));

			scope.network.app.use(require('./helpers/z_schema-express.js')(scope.schema));

			scope.network.app.use(httpApi.middleware.logClientConnections.bind(null, scope.logger));

			/* Instruct browser to deny display of <frame>, <iframe> regardless of origin.
			 *
			 * RFC -> https://tools.ietf.org/html/rfc7034
			 */
			scope.network.app.use(httpApi.middleware.attachResponseHeader.bind(null, 'X-Frame-Options', 'DENY'));
			/* Set Content-Security-Policy headers.
			 *
			 * frame-ancestors - Defines valid sources for <frame>, <iframe>, <object>, <embed> or <applet>.
			 *
			 * W3C Candidate Recommendation -> https://www.w3.org/TR/CSP/
			 */
			scope.network.app.use(httpApi.middleware.attachResponseHeader.bind(null, 'Content-Security-Policy', 'frame-ancestors \'none\''));

			scope.network.app.use(httpApi.middleware.applyAPIAccessRules.bind(null, scope.config));

			cb();
		}],

		ed: function (cb) {
			cb(null, require('./helpers/ed.js'));
		},

		bus: ['ed', function (scope, cb) {
			var changeCase = require('change-case');
			var bus = function () {
				this.message = function () {
					var args = [];
					Array.prototype.push.apply(args, arguments);
					var topic = args.shift();
					modules.forEach(function (module) {
						var eventName = 'on' + changeCase.pascalCase(topic);
						if (typeof(module[eventName]) === 'function') {
							module[eventName].apply(module[eventName], args);
						}
					});
				};
			};
			cb(null, new bus());
		}],

		db: function (cb) {
			var db = require('./helpers/database.js');
			db.connect(config.db, logger, cb);
		},

		logic: ['db', 'bus', 'schema', 'genesisblock', function (scope, cb) {
			var Transaction = require('./logic/transaction.js');
			var Block = require('./logic/block.js');
			var Account = require('./logic/account.js');
			var Peers = require('./logic/peers.js');

			async.auto({
				bus: function (cb) {
					cb(null, scope.bus);
				},
				db: function (cb) {
					cb(null, scope.db);
				},
				ed: function (cb) {
					cb(null, scope.ed);
				},
				logger: function (cb) {
					cb(null, logger);
				},
				schema: function (cb) {
					cb(null, scope.schema);
				},
				genesisblock: function (cb) {
					cb(null, {
						block: genesisblock
					});
				},
				account: ['db', 'bus', 'ed', 'schema', 'genesisblock', function (scope, cb) {
					new Account(scope, cb);
				}],
				transaction: ['db', 'bus', 'ed', 'schema', 'genesisblock', 'account', function (scope, cb) {
					new Transaction(scope, cb);
				}],
				block: ['db', 'bus', 'ed', 'schema', 'genesisblock', 'account', 'transaction', function (scope, cb) {
					new Block(scope, cb);
				}],
				peers: function (cb) {
					new Peers(scope, cb);
				}
			}, cb);
		}],

		modules: ['network', 'connect', 'config', 'logger', 'bus', 'sequence', 'dbSequence', 'balancesSequence', 'db', 'logic', function (scope, cb) {
			var tasks = {};

			Object.keys(config.modules).forEach(function (name) {
				tasks[name] = function (cb) {
					var d = require('domain').create();

					d.on('error', function (err) {
						scope.logger.fatal('Domain ' + name, {message: err.message, stack: err.stack});
					});

					d.run(function () {
						logger.debug('Loading module', name);
						var Klass = require(config.modules[name]);
						var obj = new Klass(cb, scope);
						modules.push(obj);
					});
				};
			});

			async.parallel(tasks, function (err, results) {
				cb(err, results);
			});
		}],

		api: ['modules', 'logger', 'network', function (scope, cb) {
			Object.keys(config.api).forEach(function (moduleName) {
				Object.keys(config.api[moduleName]).forEach(function (protocol) {
					var apiEndpointPath = config.api[moduleName][protocol];
					try {
						var ApiEndpoint = require(apiEndpointPath);
						new ApiEndpoint(scope.modules[moduleName], scope.network.app, scope.logger);
					} catch (e) {
						scope.logger.error('Unable to load API endpoint for ' + moduleName + ' of ' + protocol, e);
					}
				});
			});

			scope.network.app.use(httpApi.middleware.errorLogger.bind(null, scope.logger));
			cb();
		}],

		ready: ['modules', 'bus', 'logic', function (scope, cb) {
			scope.bus.message('bind', scope.modules);
			scope.logic.transaction.bindModules(scope.modules);
			scope.logic.peers.bind(scope);
			cb();
		}],

		listen: ['ready', function (scope, cb) {
			scope.network.server.listen(scope.config.port, scope.config.address, function (err) {
				scope.logger.info('Lisk started: ' + scope.config.address + ':' + scope.config.port);

				if (!err) {
					if (scope.config.ssl.enabled) {
						scope.network.https.listen(scope.config.ssl.options.port, scope.config.ssl.options.address, function (err) {
							scope.logger.info('Lisk https started: ' + scope.config.ssl.options.address + ':' + scope.config.ssl.options.port);

							cb(err, scope.network);
						});
					} else {
						cb(null, scope.network);
					}
				} else {
					cb(err, scope.network);
				}
			});
		}]
	}, function (err, scope) {
		if (err) {
			logger.fatal(err);
		} else {
			scope.logger.info('Modules ready and launched');

			process.once('cleanup', function () {
				scope.logger.info('Cleaning up...');
				async.eachSeries(modules, function (module, cb) {
					if (typeof(module.cleanup) === 'function') {
						module.cleanup(cb);
					} else {
						setImmediate(cb);
					}
				}, function (err) {
					if (err) {
						scope.logger.error(err);
					} else {
						scope.logger.info('Cleaned up successfully');
					}
					process.exit(1);
				});
			});

			process.once('SIGTERM', function () {
				process.emit('cleanup');
			});

			process.once('exit', function () {
				process.emit('cleanup');
			});

			process.once('SIGINT', function () {
				process.emit('cleanup');
			});
		}
	});
});

process.on('uncaughtException', function (err) {
	// Handle error safely
	logger.fatal('System error', { message: err.message, stack: err.stack });
	process.emit('cleanup');
});

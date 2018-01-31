/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';
/**
 * A node-style callback as used by {@link logic} and {@link modules}.
 * @see {@link https://nodejs.org/api/errors.html#errors_node_js_style_callbacks}
 * @callback nodeStyleCallback
 * @param {?Error} error - Error, if any, otherwise `null`.
 * @param {Data} data - Data, if there hasn't been an error.
 */
/**
 * A triggered by setImmediate callback as used by {@link logic}, {@link modules} and {@link helpers}.
 * Parameters formats: (cb, error, data), (cb, error), (cb).
 * @see {@link https://nodejs.org/api/timers.html#timers_setimmediate_callback_args}
 * @callback setImmediateCallback
 * @param {function} cb - Callback function.
 * @param {?Error} [error] - Error, if any, otherwise `null`.
 * @param {Data} [data] - Data, if there hasn't been an error and the function should return data.
 */

/**
 * Main entry point.
 * Loads the lisk modules, the lisk api and run the express server as Domain master.
 * CLI options available.
 * @module app
 */

var async = require('async');
var extend = require('extend');
var fs = require('fs');
var path = require('path');
var SocketCluster = require('socketcluster');

var genesisblock = require('./genesis_block.json');
var Logger = require('./logger.js');
var workersControllerPath = path.join(__dirname, 'workers_controller');
var wsRPC = require('./api/ws/rpc/ws_rpc').wsRPC;

var AppConfig = require('./helpers/config.js');
var git = require('./helpers/git.js');
var httpApi = require('./helpers/http_api.js');
var Sequence = require('./helpers/sequence.js');
var swagger = require('./config/swagger');
var swaggerHelper = require('./helpers/swagger');

process.stdin.resume();

var versionBuild = fs.readFileSync(path.join(__dirname, 'build'), 'utf8');

/**
 * @property {string} - Hash of last git commit.
 */
var lastCommit = '';

if (typeof gc !== 'undefined') {
	setInterval(() => {
		gc(); // eslint-disable-line no-undef
	}, 60000);
}

/**
 * @property {Object} - The default list of configuration options. Can be updated by CLI.
 * @default 'config.json'
 */
var appConfig = AppConfig(require('./package.json'));

// Define top endpoint availability
process.env.TOP = appConfig.topAccounts;

/**
 * The config object to handle lisk modules and lisk api.
 * It loads `modules` and `api` folders content.
 * Also contains db configuration from config.json.
 * @property {Object} db - Config values for database.
 * @property {Object} modules - `modules` folder content.
 * @property {Object} api - `api/http` folder content.
 */
var config = {
	root: path.dirname(__filename),
	db: appConfig.db,
	cache: appConfig.redis,
	cacheEnabled: appConfig.cacheEnabled,
	modules: {
		accounts: './modules/accounts.js',
		blocks: './modules/blocks.js',
		cache: './modules/cache.js',
		dapps: './modules/dapps.js',
		delegates: './modules/delegates.js',
		rounds: './modules/rounds.js',
		loader: './modules/loader.js',
		multisignatures: './modules/multisignatures.js',
		node: './modules/node.js',
		peers: './modules/peers.js',
		system: './modules/system.js',
		signatures: './modules/signatures.js',
		transactions: './modules/transactions.js',
		transport: './modules/transport.js',
		voters: './modules/voters',
	},
	api: {
		transport: { ws: './api/ws/transport.js' },
	},
};

/**
 * Logger holder so we can log with custom functionality.
 * The Object is initialized here and pass to others as parameter.
 * @property {Object} - Logger instance.
 */
var logger = new Logger({
	echo: appConfig.consoleLogLevel,
	errorLevel: appConfig.fileLogLevel,
	filename: appConfig.logFileName,
});

var dbLogger = null;

if (
	appConfig.db.logFileName &&
	appConfig.db.logFileName === appConfig.logFileName
) {
	dbLogger = logger;
} else {
	dbLogger = new Logger({
		echo: appConfig.db.consoleLogLevel || appConfig.consoleLogLevel,
		errorLevel: appConfig.db.fileLogLevel || appConfig.fileLogLevel,
		filename: appConfig.db.logFileName,
	});
}

// Trying to get last git commit
try {
	lastCommit = git.getLastCommit();
} catch (err) {
	logger.debug('Cannot get last git commit', err.message);
}

/**
 * Creates the express server and loads all the Modules and logic.
 * @property {Object} - Domain instance.
 */
var d = require('domain').create();

d.on('error', err => {
	logger.fatal('Domain master', { message: err.message, stack: err.stack });
	process.exit(0);
});

// runs domain
d.run(() => {
	var modules = [];
	async.auto(
		{
			/**
			 * Loads `payloadHash`.
			 * Then updates config.json with new random  password.
			 * @method config
			 * @param {nodeStyleCallback} cb - Callback function with the mutated `appConfig`.
			 * @throws {Error} If failed to assign nethash from genesis block.
			 */
			config: function(cb) {
				try {
					appConfig.nethash = Buffer.from(
						genesisblock.payloadHash,
						'hex'
					).toString('hex');
				} catch (e) {
					logger.error('Failed to assign nethash from genesis block');
					throw Error(e);
				}
				cb(null, appConfig);
			},

			logger: function(cb) {
				cb(null, logger);
			},

			build: function(cb) {
				cb(null, versionBuild);
			},

			/**
			 * Returns hash of last git commit.
			 * @method lastCommit
			 * @param {nodeStyleCallback} cb - Callback function with Hash of last git commit.
			 */
			lastCommit: function(cb) {
				cb(null, lastCommit);
			},

			genesisblock: function(cb) {
				cb(null, {
					block: genesisblock,
				});
			},

			schema: function(cb) {
				cb(null, swaggerHelper.getValidator());
			},

			/**
			 * Once config is completed, creates app, http & https servers & sockets with express.
			 * @method network
			 * @param {Object} scope - The results from current execution,
			 * at leats will contain the required elements.
			 * @param {nodeStyleCallback} cb - Callback function with created Object:
			 * `{express, app, server, io, https, https_io}`.
			 */
			network: [
				'config',
				function(scope, cb) {
					var express = require('express');
					var app = express();

					if (appConfig.coverage) {
						var im = require('istanbul-middleware');
						logger.debug(
							'Hook loader for coverage - do not use in production environment!'
						);
						im.hookLoader(__dirname);
						app.use('/coverage', im.createHandler());
					}

					if (appConfig.trustProxy) {
						app.enable('trust proxy');
					}

					var server = require('http').createServer(app);
					var io = require('socket.io')(server);

					var privateKey;
					var certificate;
					var https;
					var https_io;

					if (scope.config.ssl.enabled) {
						privateKey = fs.readFileSync(scope.config.ssl.options.key);
						certificate = fs.readFileSync(scope.config.ssl.options.cert);

						https = require('https').createServer(
							{
								key: privateKey,
								cert: certificate,
								ciphers:
									'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
							},
							app
						);

						https_io = require('socket.io')(https);
					}

					cb(null, {
						express: express,
						app: app,
						server: server,
						io: io,
						https: https,
						https_io: https_io,
					});
				},
			],

			webSocket: [
				'config',
				'connect',
				'logger',
				'network',
				function(scope, cb) {
					var webSocketConfig = {
						workers: scope.config.wsWorkers,
						port: scope.config.wsPort,
						wsEngine: 'uws',
						appName: 'lisk',
						workerController: workersControllerPath,
						perMessageDeflate: false,
						secretKey: 'liskSecretKey',
						pingInterval: 5000,
						// How many milliseconds to wait without receiving a ping
						// before closing the socket
						pingTimeout: 60000,
						// Maximum amount of milliseconds to wait before force-killing
						// a process after it was passed a 'SIGTERM' or 'SIGUSR2' signal
						processTermTimeout: 10000,
						logLevel: 0,
					};

					if (scope.config.ssl.enabled) {
						extend(webSocketConfig, {
							protocol: 'https',
							// This is the same as the object provided to Node.js's https server
							protocolOptions: {
								key: fs.readFileSync(scope.config.ssl.options.key),
								cert: fs.readFileSync(scope.config.ssl.options.cert),
								ciphers:
									'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
							},
						});
					}

					var childProcessOptions = {
						version: scope.config.version,
						minVersion: scope.config.minVersion,
						nethash: scope.config.nethash,
						port: scope.config.wsPort,
						nonce: scope.config.nonce,
					};

					scope.socketCluster = new SocketCluster(webSocketConfig);
					var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
					scope.network.app.rpc = wsRPC.setServer(
						new MasterWAMPServer(scope.socketCluster, childProcessOptions)
					);

					scope.socketCluster.on('ready', () => {
						scope.logger.info('Socket Cluster ready for incoming connections');
						cb();
					});
				},
			],

			dbSequence: [
				'logger',
				function(scope, cb) {
					var sequence = new Sequence({
						onWarning: function(current) {
							scope.logger.warn('DB queue', current);
						},
					});
					cb(null, sequence);
				},
			],

			sequence: [
				'logger',
				function(scope, cb) {
					var sequence = new Sequence({
						onWarning: function(current) {
							scope.logger.warn('Main queue', current);
						},
					});
					cb(null, sequence);
				},
			],

			balancesSequence: [
				'logger',
				function(scope, cb) {
					var sequence = new Sequence({
						onWarning: function(current) {
							scope.logger.warn('Balance queue', current);
						},
					});
					cb(null, sequence);
				},
			],

			/**
			 * Once config, genesisblock, logger, build and network are completed,
			 * adds configuration to `network.app`.
			 * @method connect
			 * @param {Object} scope - The results from current execution,
			 * at leats will contain the required elements.
			 * @param {function} cb - Callback function.
			 */
			connect: [
				'config',
				'genesisblock',
				'logger',
				'build',
				'network',
				function(scope, cb) {
					var bodyParser = require('body-parser');
					var methodOverride = require('method-override');
					var queryParser = require('express-query-int');
					var randomstring = require('randomstring');

					scope.config.nonce = randomstring.generate(16);
					scope.network.app.use(require('express-domain-middleware'));
					scope.network.app.use(bodyParser.raw({ limit: '2mb' }));
					scope.network.app.use(
						bodyParser.urlencoded({
							extended: true,
							limit: '2mb',
							parameterLimit: 5000,
						})
					);
					scope.network.app.use(bodyParser.json({ limit: '2mb' }));
					scope.network.app.use(methodOverride());

					var ignore = [
						'id',
						'name',
						'username',
						'blockId',
						'transactionId',
						'address',
						'recipientId',
						'senderId',
					];

					scope.network.app.use(
						queryParser({
							parser: function(value, radix, name) {
								if (ignore.indexOf(name) >= 0) {
									return value;
								}

								// Ignore conditional fields for transactions list
								if (/^.+?:(blockId|recipientId|senderId)$/.test(name)) {
									return value;
								}

								if (
									isNaN(value) ||
									parseInt(value) != value ||
									isNaN(parseInt(value, radix))
								) {
									return value;
								}
								return parseInt(value);
							},
						})
					);

					scope.network.app.use(
						require('./helpers/z_schema_express.js')(scope.schema)
					);

					scope.network.app.use(
						httpApi.middleware.logClientConnections.bind(null, scope.logger)
					);

					/* Instruct browser to deny display of <frame>, <iframe> regardless of origin.
			 *
			 * RFC -> https://tools.ietf.org/html/rfc7034
			 */
					scope.network.app.use(
						httpApi.middleware.attachResponseHeader.bind(
							null,
							'X-Frame-Options',
							'DENY'
						)
					);
					/* Set Content-Security-Policy headers.
			 *
			 * frame-ancestors - Defines valid sources for <frame>, <iframe>, <object>, <embed> or <applet>.
			 *
			 * W3C Candidate Recommendation -> https://www.w3.org/TR/CSP/
			 */
					scope.network.app.use(
						httpApi.middleware.attachResponseHeader.bind(
							null,
							'Content-Security-Policy',
							"frame-ancestors 'none'"
						)
					);

					scope.network.app.use(
						httpApi.middleware.applyAPIAccessRules.bind(null, scope.config)
					);

					cb();
				},
			],

			swagger: [
				'connect',
				'modules',
				'logger',
				'cache',
				function(scope, cb) {
					swagger(scope.network.app, config, scope.logger, scope, cb);
				},
			],

			ed: function(cb) {
				cb(null, require('./helpers/ed.js'));
			},

			bus: [
				'ed',
				function(scope, cb) {
					var changeCase = require('change-case');
					var bus = function() {
						this.message = function() {
							var args = [];
							Array.prototype.push.apply(args, arguments);
							var topic = args.shift();
							var eventName = `on${changeCase.pascalCase(topic)}`;

							// Iterate over modules and execute event functions (on*)
							modules.forEach(module => {
								if (typeof module[eventName] === 'function') {
									module[eventName].apply(module[eventName], args);
								}
								if (module.submodules) {
									async.each(module.submodules, submodule => {
										if (
											submodule &&
											typeof submodule[eventName] === 'function'
										) {
											submodule[eventName].apply(submodule[eventName], args);
										}
									});
								}
							});
						};
					};
					cb(null, new bus());
				},
			],
			db: function(cb) {
				var db = require('./db');
				db
					.connect(config.db, dbLogger)
					.then(db => cb(null, db))
					.catch(err => cb(err));
			},
			/**
			 * It tries to connect with redis server based on config. provided in config.json file
			 * @param {function} cb
			 */
			cache: function(cb) {
				var cache = require('./helpers/cache.js');
				cache.connect(config.cacheEnabled, config.cache, logger, cb);
			},
			/**
			 * Once db, bus, schema and genesisblock are completed,
			 * loads transaction, block, account and peers from logic folder.
			 * @method logic
			 * @param {Object} scope - The results from current execution,
			 * at leats will contain the required elements.
			 * @param {function} cb - Callback function.
			 */
			logic: [
				'db',
				'bus',
				'schema',
				'genesisblock',
				function(scope, cb) {
					var Transaction = require('./logic/transaction.js');
					var Block = require('./logic/block.js');
					var Account = require('./logic/account.js');
					var Peers = require('./logic/peers.js');

					async.auto(
						{
							bus: function(cb) {
								cb(null, scope.bus);
							},
							db: function(cb) {
								cb(null, scope.db);
							},
							ed: function(cb) {
								cb(null, scope.ed);
							},
							logger: function(cb) {
								cb(null, logger);
							},
							schema: function(cb) {
								cb(null, scope.schema);
							},
							genesisblock: function(cb) {
								cb(null, {
									block: genesisblock,
								});
							},
							account: [
								'db',
								'bus',
								'ed',
								'schema',
								'genesisblock',
								'logger',
								function(scope, cb) {
									new Account(scope.db, scope.schema, scope.logger, cb);
								},
							],
							transaction: [
								'db',
								'bus',
								'ed',
								'schema',
								'genesisblock',
								'account',
								'logger',
								function(scope, cb) {
									new Transaction(
										scope.db,
										scope.ed,
										scope.schema,
										scope.genesisblock,
										scope.account,
										scope.logger,
										cb
									);
								},
							],
							block: [
								'db',
								'bus',
								'ed',
								'schema',
								'genesisblock',
								'account',
								'transaction',
								function(scope, cb) {
									new Block(scope.ed, scope.schema, scope.transaction, cb);
								},
							],
							peers: [
								'logger',
								function(scope, cb) {
									new Peers(scope.logger, cb);
								},
							],
						},
						cb
					);
				},
			],
			/**
			 * Once network, connect, config, logger, bus, sequence,
			 * dbSequence, balancesSequence, db and logic are completed,
			 * loads modules from `modules` folder using `config.modules`.
			 * @method modules
			 * @param {Object} scope - The results from current execution,
			 * at leats will contain the required elements.
			 * @param {nodeStyleCallback} cb - Callback function with resulted load.
			 */
			modules: [
				'network',
				'connect',
				'webSocket',
				'config',
				'logger',
				'bus',
				'sequence',
				'dbSequence',
				'balancesSequence',
				'db',
				'logic',
				'cache',
				function(scope, cb) {
					var tasks = {};

					Object.keys(config.modules).forEach(name => {
						tasks[name] = function(cb) {
							var d = require('domain').create();

							d.on('error', err => {
								scope.logger.fatal(`Domain ${name}`, {
									message: err.message,
									stack: err.stack,
								});
							});

							d.run(() => {
								logger.debug('Loading module', name);
								var Klass = require(config.modules[name]);
								var obj = new Klass(cb, scope);
								modules.push(obj);
							});
						};
					});

					async.parallel(tasks, (err, results) => {
						cb(err, results);
					});
				},
			],

			/**
			 * Loads api from `api` folder using `config.api`, once modules, logger and
			 * network are completed.
			 * @method api
			 * @param {Object} scope - The results from current execution,
			 * at leats will contain the required elements.
			 * @param {function} cb - Callback function.
			 */
			api: [
				'modules',
				'logger',
				'network',
				'webSocket',
				function(scope, cb) {
					Object.keys(config.api).forEach(moduleName => {
						Object.keys(config.api[moduleName]).forEach(protocol => {
							var apiEndpointPath = config.api[moduleName][protocol];
							try {
								var ApiEndpoint = require(apiEndpointPath);
								new ApiEndpoint(
									scope.modules[moduleName],
									scope.network.app,
									scope.logger,
									scope.modules.cache
								);
							} catch (e) {
								scope.logger.error(
									`Unable to load API endpoint for ${moduleName} of ${protocol}`,
									e.message
								);
							}
						});
					});

					scope.network.app.use(
						httpApi.middleware.errorLogger.bind(null, scope.logger)
					);
					cb();
				},
			],

			ready: [
				'swagger',
				'modules',
				'bus',
				'logic',
				function(scope, cb) {
					scope.modules.swagger = scope.swagger;

					// Fire onBind event in every module
					scope.bus.message('bind', scope.modules);

					scope.logic.peers.bindModules(scope.modules);
					cb();
				},
			],

			/**
			 * Once 'ready' is completed, binds and listens for connections on the
			 * specified host and port for `scope.network.server`.
			 * @method listen
			 * @param {Object} scope - The results from current execution,
			 * at leats will contain the required elements.
			 * @param {nodeStyleCallback} cb - Callback function with `scope.network`.
			 */
			listen: [
				'ready',
				function(scope, cb) {
					scope.network.server.listen(
						scope.config.httpPort,
						scope.config.address,
						err => {
							scope.logger.info(
								`Lisk started: ${scope.config.address}:${scope.config.httpPort}`
							);

							if (!err) {
								if (scope.config.ssl.enabled) {
									scope.network.https.listen(
										scope.config.ssl.options.port,
										scope.config.ssl.options.address,
										err => {
											scope.logger.info(
												`Lisk https started: ${
													scope.config.ssl.options.address
												}:${scope.config.ssl.options.port}`
											);

											cb(err, scope.network);
										}
									);
								} else {
									cb(null, scope.network);
								}
							} else {
								cb(err, scope.network);
							}
						}
					);
				},
			],
		},
		(err, scope) => {
			if (err) {
				logger.fatal(err);
			} else {
				/**
				 * Handles app instance (acts as global variable, passed as parameter).
				 * @global
				 * @typedef {Object} scope
				 * @property {Object} api - Undefined.
				 * @property {undefined} balancesSequence - Sequence function, sequence Array.
				 * @property {string} build - Empty.
				 * @property {Object} bus - Message function, bus constructor.
				 * @property {Object} config - Configuration.
				 * @property {undefined} connect - Undefined.
				 * @property {Object} db - Database constructor, database functions.
				 * @property {function} dbSequence - Database function.
				 * @property {Object} ed - Crypto functions from lisk node-sodium.
				 * @property {Object} genesisblock - Block information.
				 * @property {string} lastCommit - Hash transaction.
				 * @property {Object} listen - Network information.
				 * @property {Object} logger - Log functions.
				 * @property {Object} logic - several logic functions and objects.
				 * @property {Object} modules - Several modules functions.
				 * @property {Object} network - Several network functions.
				 * @property {string} nonce
				 * @property {undefined} ready
				 * @property {Object} schema - ZSchema with objects.
				 * @property {Object} sequence - Sequence function, sequence Array.
				 * @todo logic repeats: bus, ed, genesisblock, logger, schema.
				 * @todo description for nonce and ready
				 */
				scope.logger.info('Modules ready and launched');
				/**
				 * Event reporting a cleanup.
				 * @event cleanup
				 */
				/**
				 * Receives a 'cleanup' signal and cleans all modules.
				 * @listens cleanup
				 */
				process.once('cleanup', () => {
					scope.logger.info('Cleaning up...');
					scope.socketCluster.destroy();
					async.eachSeries(
						modules,
						(module, cb) => {
							if (typeof module.cleanup === 'function') {
								module.cleanup(cb);
							} else {
								setImmediate(cb);
							}
						},
						err => {
							if (err) {
								scope.logger.error(err);
							} else {
								scope.logger.info('Cleaned up successfully');
							}
							process.exit(1);
						}
					);
				});

				/**
				 * Event reporting a SIGTERM.
				 * @event SIGTERM
				 */
				/**
				 * Receives a 'SIGTERM' signal and emits a cleanup.
				 * @listens SIGTERM
				 */
				process.once('SIGTERM', () => {
					/**
					 * emits cleanup once 'SIGTERM'.
					 * @emits cleanup
					 */
					process.emit('cleanup');
				});

				/**
				 * Event reporting an exit.
				 * @event exit
				 */
				/**
				 * Receives an 'exit' signal and emits a cleanup.
				 * @listens exit
				 */
				process.once('exit', () => {
					/**
					 * emits cleanup once 'exit'.
					 * @emits cleanup
					 */
					process.emit('cleanup');
				});

				/**
				 * Event reporting a SIGINT.
				 * @event SIGINT
				 */
				/**
				 * Receives a 'SIGINT' signal and emits a cleanup.
				 * @listens SIGINT
				 */
				process.once('SIGINT', () => {
					/**
					 * emits cleanup once 'SIGINT'.
					 * @emits cleanup
					 */
					process.emit('cleanup');
				});
			}
		}
	);
});

/**
 * Event reporting an uncaughtException.
 * @event uncaughtException
 */
/**
 * Receives a 'uncaughtException' signal and emits a cleanup.
 * @listens uncaughtException
 */
process.on('uncaughtException', err => {
	// Handle error safely
	logger.fatal('System error', { message: err.message, stack: err.stack });
	/**
	 * emits cleanup once 'uncaughtException'.
	 * @emits cleanup
	 */
	process.emit('cleanup');
});

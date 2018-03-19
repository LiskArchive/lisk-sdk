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

var path = require('path');
var fs = require('fs');
var d = require('domain').create();
var extend = require('extend');
var SocketCluster = require('socketcluster');
var async = require('async');
var genesisblock = require('./genesis_block.json');
var Logger = require('./logger.js');
var wsRPC = require('./api/ws/rpc/ws_rpc').wsRPC;
var AppConfig = require('./helpers/config.js');
var git = require('./helpers/git.js');
var httpApi = require('./helpers/http_api.js');
var Sequence = require('./helpers/sequence.js');
var swagger = require('./config/swagger');
// eslint-disable-next-line import/order
var swaggerHelper = require('./helpers/swagger');

/**
 * Main application entry point.
 *
 * @namespace app
 * @requires async
 * @requires domain.create
 * @requires extend
 * @requires fs
 * @requires socketcluster
 * @requires genesis_block.json
 * @requires logger.js
 * @requires api/ws/rpc/ws_rpc.wsRPC
 * @requires helpers/config
 * @requires helpers/git
 * @requires helpers/http_api
 * @requires {@link helpers.Sequence}
 * @requires helpers/swagger
 * @requires config/swagger
 */

/**
 * Handles app instance (acts as global variable, passed as parameter).
 *
 * @global
 * @typedef {Object} scope
 * @property {Object} api
 * @property {undefined} balancesSequence
 * @property {string} build
 * @property {Object} bus
 * @property {Object} config
 * @property {undefined} connect
 * @property {Object} db
 * @property {Object} ed
 * @property {Object} genesisblock
 * @property {string} lastCommit
 * @property {Object} listen
 * @property {Object} logger
 * @property {Object} logic
 * @property {Object} modules
 * @property {Object} network
 * @property {string} nonce
 * @property {undefined} ready
 * @property {Object} schema
 * @property {Object} sequence
 * @todo Add description for nonce and ready
 */

// Define workers_controller path
var workersControllerPath = path.join(__dirname, 'workers_controller');

// Begin reading from stdin
process.stdin.resume();

// Read build version from file
var versionBuild = fs.readFileSync(path.join(__dirname, 'build'), 'utf8');

/**
 * Hash of the last git commit.
 *
 * @memberof! app
 */
var lastCommit = '';

if (typeof gc !== 'undefined') {
	setInterval(() => {
		gc(); // eslint-disable-line no-undef
	}, 60000);
}

/**
 * Default list of configuration options. Can be overridden by CLI.
 *
 * @memberof! app
 * @default 'config.json'
 */
var appConfig = AppConfig(require('./config.json'));

// Define availability of top accounts endpoint
process.env.TOP = appConfig.topAccounts;

/**
 * Application config object.
 *
 * @memberof! app
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
 * Application logger instance.
 *
 * @memberof! app
 */
var logger = new Logger({
	echo: process.env.LOG_LEVEL || appConfig.consoleLogLevel,
	errorLevel: process.env.FILE_LOG_LEVEL || appConfig.fileLogLevel,
	filename: appConfig.logFileName,
});

/**
 * Db logger instance.
 *
 * @memberof! app
 */
var dbLogger = null;

if (
	appConfig.db.logFileName &&
	appConfig.db.logFileName === appConfig.logFileName
) {
	dbLogger = logger;
} else {
	dbLogger = new Logger({
		echo: process.env.DB_LOG_LEVEL || appConfig.db.consoleLogLevel,
		errorLevel: process.env.FILE_LOG_LEVEL || appConfig.db.fileLogLevel,
		filename: appConfig.db.logFileName,
	});
}

// Try to get the last git commit
try {
	lastCommit = git.getLastCommit();
} catch (err) {
	logger.debug('Cannot get last git commit', err.message);
}

// Domain error handler
d.on('error', err => {
	logger.fatal('Domain master', { message: err.message, stack: err.stack });
	process.exit(0);
});

// Run domain
d.run(() => {
	var modules = [];
	async.auto(
		{
			/**
			 * Attempts to determine nethash from genesis block.
			 *
			 * @func config
			 * @memberof! app
			 * @param {function} cb - Callback function
			 * @throws {Error} If unable to assign nethash from genesis block
			 */
			config(cb) {
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

			logger(cb) {
				cb(null, logger);
			},

			build(cb) {
				cb(null, versionBuild);
			},

			/**
			 * Returns hash of the last git commit.
			 *
			 * @func lastCommit
			 * @memberof! app
			 * @param {function} cb - Callback function
			 */
			lastCommit(cb) {
				cb(null, lastCommit);
			},

			genesisblock(cb) {
				cb(null, {
					block: genesisblock,
				});
			},

			schema(cb) {
				cb(null, swaggerHelper.getValidator());
			},

			network: [
				'config',
				/**
				 * Initalizes express, middleware, socket.io.
				 *
				 * @func network[1]
				 * @memberof! app
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 */
				function(scope, cb) {
					var express = require('express');
					var app = express();

					if (appConfig.coverage) {
						var im = require('istanbul-middleware');
						logger.debug(
							'Hook loader for coverage - Do not use in production environment!'
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
						express,
						app,
						server,
						io,
						https,
						https_io,
					});
				},
			],

			webSocket: [
				'config',
				'connect',
				'logger',
				'network',
				/**
				 * Description of the function.
				 *
				 * @func webSocket[4]
				 * @memberof! app
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 * @todo Add description for the function and its params
				 */
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

			sequence: [
				'logger',
				/**
				 * Description of the function.
				 *
				 * @func sequence[1]
				 * @memberof! app
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 * @todo Add description for the function and its params
				 */
				function(scope, cb) {
					var sequence = new Sequence({
						onWarning(current) {
							scope.logger.warn('Main queue', current);
						},
					});
					cb(null, sequence);
				},
			],

			balancesSequence: [
				'logger',
				/**
				 * Description of the function.
				 *
				 * @func balancesSequence[1]
				 * @memberof! app
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 * @todo Add description for the function and its params
				 */
				function(scope, cb) {
					var sequence = new Sequence({
						onWarning(current) {
							scope.logger.warn('Balance queue', current);
						},
					});
					cb(null, sequence);
				},
			],

			connect: [
				'config',
				'genesisblock',
				'logger',
				'build',
				'network',
				/**
				 * Description of the function.
				 *
				 * @func connect[5]
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 */
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
						'search',
					];

					scope.network.app.use(
						queryParser({
							parser(value, radix, name) {
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

					/**
					 * Instruct browser to deny display of <frame>, <iframe> regardless of origin.
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

					/**
					 * Set Content-Security-Policy headers.
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
				/**
				 * Description of the function.
				 *
				 * @func swagger[4]
				 * @memberof! app
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 * @todo Add description for the function and its params
				 */
				function(scope, cb) {
					swagger(scope.network.app, config, scope.logger, scope, cb);
				},
			],

			/**
			 * Description of the function.
			 *
			 * @func ed
			 * @memberof! app
			 * @param {function} cb - Callback function
			 * @todo Add description for the function and its params
			 */
			ed(cb) {
				cb(null, require('./helpers/ed.js'));
			},

			bus: [
				'ed',
				/**
				 * Description of the function.
				 *
				 * @func bus[1]
				 * @memberof! app
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 * @todo Add description for the function and its params
				 */
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

			/**
			 * Description of the function.
			 *
			 * @memberof! app
			 * @param {function} cb - Callback function
			 * @todo Add description for the function and its params
			 */
			db(cb) {
				var db = require('./db');
				db
					.connect(config.db, dbLogger)
					.then(db => cb(null, db))
					.catch(err => cb(err));
			},

			/**
			 * Description of the function.
			 *
			 * @memberof! app
			 * @param {function} cb
			 * @todo Add description for the params
			 */
			cache(cb) {
				var cache = require('./helpers/cache.js');
				cache.connect(config.cacheEnabled, config.cache, logger, cb);
			},

			logic: [
				'db',
				'bus',
				'schema',
				'genesisblock',
				/**
				 * Description of the function.
				 *
				 * @func logic[4]
				 * @memberof! app
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 */
				function(scope, cb) {
					var Transaction = require('./logic/transaction.js');
					var Block = require('./logic/block.js');
					var Account = require('./logic/account.js');
					var Peers = require('./logic/peers.js');

					async.auto(
						{
							bus(cb) {
								cb(null, scope.bus);
							},
							db(cb) {
								cb(null, scope.db);
							},
							ed(cb) {
								cb(null, scope.ed);
							},
							logger(cb) {
								cb(null, logger);
							},
							schema(cb) {
								cb(null, scope.schema);
							},
							genesisblock(cb) {
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

			modules: [
				'network',
				'connect',
				'webSocket',
				'config',
				'logger',
				'bus',
				'sequence',
				'balancesSequence',
				'db',
				'logic',
				'cache',
				/**
				 * Description of the function.
				 *
				 * @func modules[12]
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 */
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
								// eslint-disable-next-line import/no-dynamic-require
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

			api: [
				'modules',
				'logger',
				'network',
				'webSocket',
				/**
				 * Description of the function.
				 *
				 * @func api[4]
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 */
				function(scope, cb) {
					Object.keys(config.api).forEach(moduleName => {
						Object.keys(config.api[moduleName]).forEach(protocol => {
							var apiEndpointPath = config.api[moduleName][protocol];
							try {
								// eslint-disable-next-line import/no-dynamic-require
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
				/**
				 * Description of the function.
				 *
				 * @func ready[4]
				 * @memberof! app
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 * @todo Add description for the function and its params
				 */
				function(scope, cb) {
					scope.modules.swagger = scope.swagger;

					// Fire onBind event in every module
					scope.bus.message('bind', scope.modules);

					scope.logic.peers.bindModules(scope.modules);
					cb();
				},
			],

			listen: [
				'ready',
				/**
				 * Description of the function.
				 *
				 * @func listen[1]
				 * @memberof! app
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 */
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
				scope.logger.info('Modules ready and launched');

				// Receives a 'cleanup' signal and cleans all modules
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

				process.once('SIGTERM', () => {
					process.emit('cleanup');
				});

				process.once('exit', () => {
					process.emit('cleanup');
				});

				process.once('SIGINT', () => {
					process.emit('cleanup');
				});
			}
		}
	);
});

process.on('uncaughtException', err => {
	// Handle error safely
	logger.fatal('System error', { message: err.message, stack: err.stack });
	process.emit('cleanup');
});

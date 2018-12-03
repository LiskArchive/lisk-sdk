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

// eslint-disable-next-line import/order
const AppConfig = require('./helpers/config.js');

/**
 * Default list of configuration options. Can be overridden by CLI.
 *
 * @memberof! app
 * @default 'config.json'
 */
// As newrelic is using `LISK_NETWORK` to initialize app name
// so we have to initialize configuration before requiring the newrelic
// eslint-disable-next-line import/order
const appConfig = AppConfig(require('./package.json'));

// eslint-disable-next-line import/order
const NewRelicConfig = require('./newrelic.js').config;

if (NewRelicConfig.license_key || process.env.NEW_RELIC_LICENSE_KEY) {
	require('./helpers/newrelic_lisk');
}

var path = require('path');
var fs = require('fs');
var d = require('domain').create();
var dns = require('dns');
var net = require('net');
var SocketCluster = require('socketcluster');
var async = require('async');
var Logger = require('./logger.js');
var wsRPC = require('./api/ws/rpc/ws_rpc').wsRPC;
var wsTransport = require('./api/ws/transport');
var git = require('./helpers/git.js');
var Sequence = require('./helpers/sequence.js');
var httpApi = require('./helpers/http_api.js');
// eslint-disable-next-line import/order
var swaggerHelper = require('./helpers/swagger');

/**
 * Main application entry point.
 *
 * @namespace app
 * @requires async
 * @requires domain.create
 * @requires fs
 * @requires socketcluster
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
 * @property {Object} genesisBlock
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

// Global objects to be utilized under modules/helpers where scope is not accessible
global.constants = appConfig.constants;
global.exceptions = appConfig.exceptions;

/**
 * Application config object.
 *
 * @memberof! app
 */
var config = {
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
	// since log levels for database monitor are different than node app, i.e. "query", "info", "error" etc, which is decided using "logEvents" property
	dbLogger = new Logger({
		echo: process.env.DB_LOG_LEVEL || 'log',
		errorLevel: process.env.FILE_LOG_LEVEL || 'log',
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
	process.emit('cleanup', err);
});

logger.info(`Starting lisk with "${appConfig.network}" genesis block.`);
// Run domain
d.run(() => {
	var modules = [];
	async.auto(
		{
			/**
			 * Prepare the config object.
			 *
			 * @func config
			 * @memberof! app
			 * @param {function} cb - Callback function
			 * @throws {Error} If unable to assign nethash from genesis block
			 */
			config(cb) {
				if (!appConfig.nethash) {
					throw Error('Failed to assign nethash from genesis block');
				}

				// In case domain names are used, resolve those to IP addresses.
				var peerDomainLookupTasks = appConfig.peers.list.map(
					peer => callback => {
						if (net.isIPv4(peer.ip)) {
							return setImmediate(() => {
								callback(null, peer);
							});
						}
						dns.lookup(peer.ip, { family: 4 }, (err, address) => {
							if (err) {
								console.error(
									`Failed to resolve peer domain name ${
										peer.ip
									} to an IP address`
								);
								return callback(err, peer);
							}
							callback(null, Object.assign({}, peer, { ip: address }));
						});
					}
				);

				async.parallel(peerDomainLookupTasks, (err, results) => {
					if (err) {
						cb(err, appConfig);
						return;
					}
					appConfig.peers.list = results;
					cb(null, appConfig);
				});
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

			genesisBlock(cb) {
				cb(null, {
					block: appConfig.genesisBlock,
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
						// eslint-disable-next-line import/no-extraneous-dependencies
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

					if (scope.config.api.ssl.enabled) {
						privateKey = fs.readFileSync(scope.config.api.ssl.options.key);
						certificate = fs.readFileSync(scope.config.api.ssl.options.cert);

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

			swagger: [
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
					httpApi.bootstrapSwagger(
						scope.network.app,
						scope.config,
						scope.logger,
						scope,
						cb
					);
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
					.catch(err => {
						console.error(err);
					});
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
				logger.debug(
					`Cache ${appConfig.cacheEnabled ? 'Enabled' : 'Disabled'}`
				);
				cache.connect(config.cacheEnabled, config.cache, logger, cb);
			},

			webSocket: [
				'config',
				'logger',
				'network',
				'db',
				/**
				 * Description of the function.
				 *
				 * @func webSocket[5]
				 * @memberof! app
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 * @todo Add description for the function and its params
				 */
				function(scope, cb) {
					var webSocketConfig = {
						workers: scope.config.wsWorkers,
						port: scope.config.wsPort,
						host: '0.0.0.0',
						wsEngine: scope.config.peers.options.wsEngine,
						appName: 'lisk',
						workerController: workersControllerPath,
						perMessageDeflate: false,
						secretKey: 'liskSecretKey',
						// Because our node is constantly sending messages, we don't
						// need to use the ping feature to detect bad connections.
						pingTimeoutDisabled: true,
						// Maximum amount of milliseconds to wait before force-killing
						// a process after it was passed a 'SIGTERM' or 'SIGUSR2' signal
						processTermTimeout: 10000,
						logLevel: 0,
					};

					var childProcessOptions = {
						version: scope.config.version,
						minVersion: scope.config.minVersion,
						nethash: scope.config.nethash,
						port: scope.config.wsPort,
						nonce: scope.config.nonce,
						blackListedPeers: scope.config.peers.access.blackList,
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

					// The 'fail' event aggregates errors from all SocketCluster processes.
					scope.socketCluster.on('fail', err => {
						scope.logger.error(err);
						if (err.name === 'WSEngineInitError') {
							var extendedError =
								'If you are not able to install sc-uws, you can try setting the wsEngine property in config.json to "ws" before starting the node';
							scope.logger.error(extendedError);
						}
					});

					scope.socketCluster.on('workerExit', workerInfo => {
						var exitMessage = `Worker with pid ${workerInfo.pid} exited`;
						if (workerInfo.signal) {
							exitMessage += ` due to signal: '${workerInfo.signal}'`;
						}
						scope.logger.error(exitMessage);
					});
				},
			],

			logic: [
				'db',
				'bus',
				'schema',
				'genesisBlock',
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
							config(cb) {
								cb(null, scope.config);
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
							genesisBlock(cb) {
								cb(null, scope.genesisBlock);
							},
							account: [
								'db',
								'bus',
								'ed',
								'schema',
								'genesisBlock',
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
								'genesisBlock',
								'account',
								'logger',
								function(scope, cb) {
									new Transaction(
										scope.db,
										scope.ed,
										scope.schema,
										scope.genesisBlock,
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
								'genesisBlock',
								'account',
								'transaction',
								function(scope, cb) {
									new Block(scope.ed, scope.schema, scope.transaction, cb);
								},
							],
							peers: [
								'logger',
								'config',
								function(scope, cb) {
									new Peers(scope.logger, scope.config, cb);
								},
							],
						},
						cb
					);
				},
			],

			modules: [
				'network',
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

			listenWebSocket: [
				'ready',
				/**
				 * Description of the function.
				 *
				 * @func api[1]
				 * @param {Object} scope
				 * @param {function} cb - Callback function
				 */
				function(scope, cb) {
					new wsTransport(scope.modules.transport);
					cb();
				},
			],

			listenHttp: [
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
								if (scope.config.api.ssl.enabled) {
									scope.network.https.listen(
										scope.config.api.ssl.options.port,
										scope.config.api.ssl.options.address,
										err => {
											scope.logger.info(
												`Lisk https started: ${
													scope.config.api.ssl.options.address
												}:${scope.config.api.ssl.options.port}`
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
			// Receives a 'cleanup' signal and cleans all modules
			process.once('cleanup', (error, code) => {
				if (error) {
					logger.fatal(error.toString());
					if (code === undefined) {
						code = 1;
					}
				} else if (code === undefined || code === null) {
					code = 0;
				}
				logger.info('Cleaning up...');
				if (scope.socketCluster) {
					scope.socketCluster.removeAllListeners('fail');
					scope.socketCluster.destroy();
				}
				// Run cleanup operation on each module before shutting down the node;
				// this includes operations like snapshotting database tables.
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
							logger.error(err);
						} else {
							logger.info('Cleaned up successfully');
						}
						process.exit(code);
					}
				);
			});

			process.once('SIGTERM', () => {
				process.emit('cleanup');
			});

			process.once('exit', code => {
				process.emit('cleanup', null, code);
			});

			process.once('SIGINT', () => {
				process.emit('cleanup');
			});

			if (err) {
				logger.fatal(err);
				process.emit('cleanup', err);
			} else {
				scope.logger.info('Modules ready and launched');
			}
		}
	);
});

// TODO: This should be the only place in the master process where
// 'uncaughtException' is handled. Right now, one of our dependencies (js-nacl;
// which is a dependency of lisk-elements) adds its own handler which interferes
// with our own process exit logic.
process.on('uncaughtException', err => {
	// Handle error safely
	logger.fatal('System error', { message: err.message, stack: err.stack });
	process.emit('cleanup', err);
});

process.on('unhandledRejection', err => {
	// Handle unhandledRejection safely
	logger.fatal('System promise rejection', {
		message: err.message,
		stack: err.stack,
	});
	process.emit('cleanup', err);
});

process.on('unhandledRejection', err => {
	// Handle error safely
	logger.fatal('System error', { message: err.message, stack: err.stack });
	process.emit('cleanup', err);
});

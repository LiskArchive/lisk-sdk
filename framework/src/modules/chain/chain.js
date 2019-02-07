const path = require('path');
const fs = require('fs');
const d = require('domain').create();
const dns = require('dns');
const net = require('net');
const SocketCluster = require('socketcluster');
const async = require('async');
const wsRPC = require('./api/ws/rpc/ws_rpc').wsRPC;
const WsTransport = require('./api/ws/transport');
const git = require('./helpers/git.js');
const Sequence = require('./helpers/sequence.js');
const httpApi = require('./helpers/http_api.js');
// eslint-disable-next-line import/order
const swaggerHelper = require('./helpers/swagger');
const { createStorageComponent } = require('../../components/storage');
const { createCacheComponent } = require('../../components/cache');
const { createLoggerComponent } = require('../../components/logger');
const { createSystemComponent } = require('../../components/system');
const defaults = require('./defaults');

// Define workers_controller path
const workersControllerPath = path.join(__dirname, 'workers_controller');

// Begin reading from stdin
process.stdin.resume();

// Read build version from file
const versionBuild = fs
	.readFileSync(path.join(__dirname, '../../../../', '.build'), 'utf8')
	.toString()
	.trim();

/**
 * Hash of the last git commit.
 *
 * @memberof! app
 */
let lastCommit = '';

if (typeof gc !== 'undefined') {
	setInterval(() => {
		gc(); // eslint-disable-line no-undef
	}, 60000);
}

const config = {
	modules: {
		accounts: './modules/accounts.js',
		blocks: './modules/blocks.js',
		dapps: './modules/dapps.js',
		delegates: './modules/delegates.js',
		rounds: './modules/rounds.js',
		loader: './modules/loader.js',
		multisignatures: './modules/multisignatures.js',
		node: './modules/node.js',
		peers: './modules/peers.js',
		signatures: './modules/signatures.js',
		transactions: './modules/transactions.js',
		transport: './modules/transport.js',
	},
};
const modules = [];

/**
 * Chain Module
 *
 * @namespace Framework.modules.chain
 * @type {module.Chain}
 */
module.exports = class Chain {
	constructor(channel, options) {
		this.channel = channel;
		this.options = options;
		this.logger = null;
		this.scope = null;
	}

	async bootstrap() {
		const loggerConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'logger'
		);
		const storageConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'storage'
		);

		const cacheConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'cache'
		);

		const systemConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'system'
		);

		this.logger = createLoggerComponent(loggerConfig);
		const dbLogger =
			storageConfig.logFileName &&
			storageConfig.logFileName === loggerConfig.logFileName
				? this.logger
				: createLoggerComponent(
						Object.assign({}, loggerConfig, {
							logFileName: storageConfig.logFileName,
						})
					);

		// Try to get the last git commit
		try {
			lastCommit = git.getLastCommit();
		} catch (err) {
			this.logger.debug('Cannot get last git commit', err.message);
		}

		global.constants = this.options.constants;
		global.exceptions = Object.assign(
			{},
			defaults.exceptions,
			this.options.exceptions
		);

		// Domain error handler
		d.on('error', err => {
			this.logger.fatal('Domain master', {
				message: err.message,
				stack: err.stack,
			});
			process.emit('cleanup', err);
		});

		// Cache
		this.logger.debug('Initiating cache...');
		const cache = createCacheComponent(cacheConfig, this.logger);

		// Storage
		this.logger.debug('Initiating storage...');
		const storage = createStorageComponent(storageConfig, dbLogger);

		// System
		this.logger.debug('Initiating system...');
		const system = createSystemComponent(systemConfig, this.logger, storage);

		// Config
		const appConfig = this.options.config;

		const self = this;

		async.auto(
			{
				config(cb) {
					if (!appConfig.nethash) {
						throw Error('Failed to assign nethash from genesis block');
					}

					// If peers layer is not enabled there is no need to create the peer's list
					if (!appConfig.peers.enabled) {
						appConfig.peers.list = [];
						return cb(null, appConfig);
					}

					// In case domain names are used, resolve those to IP addresses.
					const peerDomainLookupTasks = appConfig.peers.list.map(peer =>
						async.reflect(callback => {
							if (net.isIPv4(peer.ip)) {
								return setImmediate(() => callback(null, peer));
							}
							return dns.lookup(peer.ip, { family: 4 }, (err, address) => {
								if (err) {
									console.error(
										`Failed to resolve peer domain name ${
											peer.ip
										} to an IP address`
									);
									return callback(err, peer);
								}
								return callback(null, Object.assign({}, peer, { ip: address }));
							});
						})
					);

					return async.parallel(peerDomainLookupTasks, (_, results) => {
						appConfig.peers.list = results
							.filter(result =>
								Object.prototype.hasOwnProperty.call(result, 'value')
							)
							.map(result => result.value);
						return cb(null, appConfig);
					});
				},

				logger(cb) {
					cb(null, self.logger);
				},

				build(cb) {
					cb(null, versionBuild);
				},

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
						const express = require('express');
						const app = express();

						if (appConfig.coverage) {
							// eslint-disable-next-line import/no-extraneous-dependencies
							const im = require('istanbul-middleware');
							self.logger.debug(
								'Hook loader for coverage - Do not use in production environment!'
							);
							im.hookLoader(__dirname);
							app.use('/coverage', im.createHandler());
						}

						if (appConfig.trustProxy) {
							app.enable('trust proxy');
						}

						const server = require('http').createServer(app);
						const io = require('socket.io')(server);

						let privateKey;
						let certificate;
						let https;
						let https_io;

						if (scope.config.api.ssl && scope.config.api.ssl.enabled) {
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
						const sequence = new Sequence({
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
						const sequence = new Sequence({
							onWarning(current) {
								scope.logger.warn('Balance queue', current);
							},
						});
						cb(null, sequence);
					},
				],

				swagger: [
					'components',
					'modules',
					'logger',
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

				ed(cb) {
					cb(null, require('./helpers/ed.js'));
				},

				bus: [
					'ed',
					function(scope, cb) {
						const changeCase = require('change-case');
						const Bus = function() {
							this.message = function(...args) {
								const topic = args.shift();
								const eventName = `on${changeCase.pascalCase(topic)}`;

								// Iterate over modules and execute event functions (on*)
								Object.keys(scope.modules).forEach(key => {
									const module = scope.modules[key];

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
						cb(null, new Bus());
					},
				],

				storage(cb) {
					storage
						.bootstrap()
						.then(status => {
							storage.entities.Account.extendDefaultOptions({
								limit: global.constants.ACTIVE_DELEGATES,
							});
							return status;
						})
						.then(async status => {
							if (status) {
								await storage.entities.Migration.applyAll();
								await storage.entities.Migration.applyRunTime();
							}
							cb(!status, storage);
						})
						.catch(err => {
							self.logger.error(err);
							cb(err);
						});
				},

				cache(cb) {
					if (!cache.options.enabled) {
						self.logger.debug('Cache not enabled');
						return cb();
					}
					return cache
						.bootstrap()
						.then(() => cb(null, cache))
						.catch(err => {
							cb(err);
						});
				},

				system(cb) {
					return cb(null, system);
				},

				components: [
					'cache',
					'storage',
					'system',
					(scope, cb) => {
						cb(null, {
							cache: scope.cache,
							storage: scope.storage,
							logger: scope.logger,
							system: scope.system,
						});
					},
				],

				webSocket: [
					'config',
					'logger',
					'network',
					'storage',
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
						if (!appConfig.peers.enabled) {
							scope.logger.info(
								'Skipping P2P server initialization due to the config settings - "peers.enabled" is set to false.'
							);
							return cb();
						}
						const webSocketConfig = {
							workers: 1,
							port: scope.config.wsPort,
							host: '0.0.0.0',
							wsEngine: scope.config.peers.options.wsEngine,
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

						const childProcessOptions = {
							version: scope.config.version,
							minVersion: scope.config.minVersion,
							protocolVersion: scope.config.protocolVersion,
							nethash: scope.config.nethash,
							port: scope.config.wsPort,
							nonce: scope.config.nonce,
							blackListedPeers: scope.config.peers.access.blackList,
						};

						scope.socketCluster = new SocketCluster(webSocketConfig);
						const MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
						scope.network.app.rpc = wsRPC.setServer(
							new MasterWAMPServer(scope.socketCluster, childProcessOptions)
						);

						scope.socketCluster.on('ready', () => {
							scope.logger.info(
								'Socket Cluster ready for incoming connections'
							);
							return cb();
						});

						// The 'fail' event aggregates errors from all SocketCluster processes.
						scope.socketCluster.on('fail', err => {
							scope.logger.error(err);
							if (err.name === 'WSEngineInitError') {
								const extendedError = scope.logger.error(extendedError);
							}
						});

						return scope.socketCluster.on('workerExit', workerInfo => {
							let exitMessage = `Worker with pid ${workerInfo.pid} exited`;
							if (workerInfo.signal) {
								exitMessage += ` due to signal: '${workerInfo.signal}'`;
							}
							scope.logger.error(exitMessage);
						});
					},
				],

				logic: [
					'components',
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
						const Transaction = require('./logic/transaction.js');
						const Block = require('./logic/block.js');
						const Account = require('./logic/account.js');
						const Peers = require('./logic/peers.js');

						async.auto(
							{
								bus(busCb) {
									busCb(null, scope.bus);
								},
								config(configCb) {
									configCb(null, scope.config);
								},
								storage(storageCb) {
									storageCb(null, scope.storage);
								},
								ed(edCb) {
									edCb(null, scope.ed);
								},
								logger(loggerCb) {
									loggerCb(null, scope.logger);
								},
								schema(schemaCb) {
									schemaCb(null, scope.schema);
								},
								genesisBlock(genesisBlockCb) {
									genesisBlockCb(null, scope.genesisBlock);
								},
								account: [
									'storage',
									'bus',
									'ed',
									'schema',
									'genesisBlock',
									'logger',
									function(accountScope, accountCb) {
										new Account(
											accountScope.storage,
											accountScope.schema,
											accountScope.logger,
											accountCb
										);
									},
								],
								transaction: [
									'storage',
									'bus',
									'ed',
									'schema',
									'genesisBlock',
									'account',
									'logger',
									function(transactionScope, transactionCb) {
										new Transaction(
											transactionScope.storage,
											transactionScope.ed,
											transactionScope.schema,
											transactionScope.genesisBlock,
											transactionScope.account,
											transactionScope.logger,
											transactionCb
										);
									},
								],
								block: [
									'storage',
									'bus',
									'ed',
									'schema',
									'genesisBlock',
									'account',
									'transaction',
									function(blockScope, blockCb) {
										new Block(
											blockScope.ed,
											blockScope.schema,
											blockScope.transaction,
											blockCb
										);
									},
								],
								peers: [
									'logger',
									'config',
									function(peersScope, peersCb) {
										new Peers(peersScope.config, peersScope.logger, peersCb);
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
					'storage',
					'logic',
					/**
					 * Description of the function.
					 *
					 * @func modules[12]
					 * @param {Object} modulesScope
					 * @param {function} modulesCb - Callback function
					 */
					function(modulesScope, modulesCb) {
						const tasks = {};

						Object.keys(config.modules).forEach(name => {
							tasks[name] = function(configModulesCb) {
								const domain = require('domain').create();

								domain.on('error', err => {
									modulesScope.logger.fatal(`Domain ${name}`, {
										message: err.message,
										stack: err.stack,
									});
								});

								domain.run(() => {
									self.logger.debug('Loading module', name);
									// eslint-disable-next-line import/no-dynamic-require
									const DynamicModule = require(config.modules[name]);
									const obj = new DynamicModule(configModulesCb, modulesScope);
									modules.push(obj);
								});
							};
						});

						async.parallel(tasks, (err, results) => {
							modulesCb(err, results);
						});
					},
				],

				ready: [
					'components',
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
						scope.bus.message('bind', scope);

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
						if (!appConfig.peers.enabled) {
							return cb();
						}
						new WsTransport(scope.modules.transport);
						return cb();
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
						// Security vulnerabilities fixed by Node v8.14.0 - "Slowloris (cve-2018-12122)"
						scope.network.server.headersTimeout =
							appConfig.api.options.limits.headersTimeout;
						// Disconnect idle clients
						scope.network.server.setTimeout(
							appConfig.api.options.limits.serverSetTimeout
						);

						scope.network.server.on('timeout', socket => {
							scope.logger.info(
								`Disconnecting idle socket: ${socket.remoteAddress}:${
									socket.remotePort
								}`
							);
							socket.destroy();
						});

						return scope.network.server.listen(
							scope.config.httpPort,
							scope.config.address,
							serverListenErr => {
								scope.logger.info(
									`Lisk started: ${scope.config.address}:${
										scope.config.httpPort
									}`
								);

								if (!serverListenErr) {
									if (scope.config.api.ssl.enabled) {
										// Security vulnerabilities fixed by Node v8.14.0 - "Slowloris (cve-2018-12122)"
										scope.network.https.headersTimeout =
											appConfig.api.options.limits.headersTimeout;
										scope.network.https.setTimeout(
											appConfig.api.options.limits.serverTimeout
										);
										scope.network.https.on('timeout', socket => {
											scope.logger.info(
												`Disconnecting idle socket: ${socket.remoteAddress}:${
													socket.remotePort
												}`
											);
											socket.destroy();
										});
										return scope.network.https.listen(
											scope.config.api.ssl.options.port,
											scope.config.api.ssl.options.address,
											httpsListenErr => {
												scope.logger.info(
													`Lisk https started: ${
														scope.config.api.ssl.options.address
													}:${scope.config.api.ssl.options.port}`
												);

												return cb(httpsListenErr, scope.network);
											}
										);
									}
									return cb(null, scope.network);
								}
								return cb(serverListenErr, scope.network);
							}
						);
					},
				],
			},
			(err, scope) => {
				this.scope = scope;
				if (err) {
					this.cleanup(1, err);
					process.emit('cleanup', err);
				} else {
					this.logger.info('Modules ready and launched');
				}
			}
		);
	}

	async cleanup(code, error) {
		if (error) {
			this.logger.fatal(error.toString());
			if (code === undefined) {
				code = 1;
			}
		} else if (code === undefined || code === null) {
			code = 0;
		}
		this.logger.info('Cleaning chain...');
		if (this.scope.socketCluster) {
			this.scope.socketCluster.removeAllListeners('fail');
			this.scope.socketCluster.destroy();
		}

		if (this.scope.components !== undefined) {
			Object.keys(this.scope.components)
				.filter(key => typeof this.scope.components[key].cleanup === 'function')
				.map(key => this.scope.components[key].cleanup());
		}

		// Run cleanup operation on each module before shutting down the node;
		// this includes operations like snapshotting database tables.
		return new Promise((resolve, reject) => {
			async.eachSeries(
				modules,
				(module, cb) => {
					if (typeof module.cleanup === 'function') {
						module.cleanup(cb);
					} else {
						setImmediate(cb);
					}
				},
				eachSeriesErr => {
					if (eachSeriesErr) {
						this.logger.error(eachSeriesErr);
						reject();
					} else {
						resolve();
						this.logger.info('Cleaned up successfully');
					}
				}
			);
		});
	}
};

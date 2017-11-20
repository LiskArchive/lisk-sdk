'use strict';

// Root object
var node = {};

var Promise = require('bluebird');
var rewire  = require('rewire');
var sinon   = require('sinon');

// Application specific
var Sequence  = require('../helpers/sequence.js');
var slots     = require('../helpers/slots.js');
var swagger = require('../config/swagger');
var swaggerHelper = require('../helpers/swagger');

// Requires
node.bignum = require('../helpers/bignum.js');
node.config = require('../config.json');
node.constants = require('../helpers/constants.js');
node.dappCategories = require('../helpers/dappCategories.js');
node.dappTypes = require('../helpers/dappTypes.js');
node.transactionTypes = require('../helpers/transactionTypes.js');
node._ = require('lodash');
node.async = require('async');
node.popsicle = require('popsicle');
node.chai = require('chai');
node.chai.config.includeStack = true;
node.chai.use(require('chai-bignumber')(node.bignum));
node.expect = node.chai.expect;
node.should = node.chai.should();
node.lisk = require('lisk-js');
node.supertest = require('supertest');
node.Promise = require('bluebird');
node.randomString = require('randomstring');

var jobsQueue = require('../helpers/jobsQueue.js');

node.config.root = process.cwd();

require('colors');

// Node configuration
node.baseUrl = 'http://' + node.config.address + ':' + node.config.httpPort;
node.api = node.supertest(node.baseUrl);

node.normalizer = 100000000; // Use this to convert LISK amount to normal value
node.blockTime = 10000; // Block time in miliseconds
node.blockTimePlus = 12000; // Block time + 2 seconds in miliseconds
node.version = node.config.version; // Node version
node.nonce = node.randomString.generate(16);

// Transaction fees
node.fees = {
	voteFee: node.constants.fees.vote,
	transactionFee: node.constants.fees.send,
	secondPasswordFee: node.constants.fees.secondSignature,
	delegateRegistrationFee: node.constants.fees.delegate,
	multisignatureRegistrationFee: node.constants.fees.multisignature,
	dappRegistrationFee: node.constants.fees.dappRegistration,
	dappDepositFee: node.constants.fees.dappDeposit,
	dappWithdrawalFee: node.constants.fees.dappWithdrawal,
	dataFee: node.constants.fees.data
};

// Existing delegate account
node.eAccount = {
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	password: 'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	balance: '0',
	delegateName: 'genesis_100'
};

// Genesis account, initially holding 100M total supply
node.gAccount = {
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	password: 'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
	balance: '10000000000000000',
	encryptedSecret: 'ddbb37d465228d52a78ad13555e609750ec30e8f5912a1b8fbdb091f50e269cbcc3875dad032115e828976f0c7f5ed71ce925e16974233152149e902b48cec51d93c2e40a6c95de75c1c5a2c369e6d24',
	key: 'elephant tree paris dragon chair galaxy',
};

node.swaggerDef = swaggerHelper.getSwaggerSpec();;

// Optional logging
if (process.env.SILENT === 'true') {
	node.debug = function () {};
} else {
	node.debug = console.log;
}

// Random LSK amount
node.LISK = Math.floor(Math.random() * (100000 * 100000000)) + 1;

// Returns a random property from the given object
node.randomProperty = function (obj, needKey) {
	var keys = Object.keys(obj);

	if (!needKey) {
		return obj[keys[keys.length * Math.random() << 0]];
	} else {
		return keys[keys.length * Math.random() << 0];
	}
};

// Returns random LSK amount
node.randomLISK = function () {
	return Math.floor(Math.random() * (10000 * 100000000)) + (1000 * 100000000);
};

// Returns current block height
node.getHeight = function (cb) {
	var request = node.popsicle.get(node.baseUrl + '/api/node/status');

	request.use(node.popsicle.plugins.parse(['json']));

	request.then(function (res) {
		if (res.status !== 200) {
			return setImmediate(cb, ['Received bad response code', res.status, res.url].join(' '));
		} else {
			return setImmediate(cb, null, res.body.data.height);
		}
	});

	request.catch(function (err) {
		return setImmediate(cb, err);
	});
};

// Run callback on new round
node.onNewRound = function (cb) {
	node.getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			var nextRound = slots.calcRound(height);
			var blocksToWait = nextRound * slots.delegates - height;
			node.debug('blocks to wait: '.grey, blocksToWait);
			node.waitForNewBlock(height, blocksToWait, cb);
		}
	});
};

// Upon detecting a new block, do something
node.onNewBlock = function (cb) {
	node.getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			node.waitForNewBlock(height, 2, cb);
		}
	});
};

// Waits for (n) blocks to be created
node.waitForBlocks = function (blocksToWait, cb) {
	node.getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			node.waitForNewBlock(height, blocksToWait, cb);
		}
	});
};

// Waits for a new block to be created
node.waitForNewBlock = function (height, blocksToWait, cb) {
	if (blocksToWait === 0) {
		return setImmediate(cb, null, height);
	}

	var actualHeight = height;
	var counter = 1;
	var target = height + blocksToWait;

	node.async.doWhilst(
		function (cb) {
			var request = node.popsicle.get(node.baseUrl + '/api/node/status');

			request.use(node.popsicle.plugins.parse(['json']));

			request.then(function (res) {
				if (res.status !== 200) {
					return cb(['Received bad response code', res.status, res.url].join(' '));
				}

				node.debug('	Waiting for block:'.grey, 'Height:'.grey, res.body.data.height, 'Target:'.grey, target, 'Second:'.grey, counter++);

				if (target === res.body.data.height) {
					height = res.body.data.height;
				}

				setTimeout(cb, 1000);
			});

			request.catch(function (err) {
				return cb(err);
			});
		},
		function () {
			return actualHeight >= height;
		},
		function (err) {
			if (err) {
				return setImmediate(cb, err);
			} else {
				return setImmediate(cb, null, height);
			}
		}
	);
};

// Returns a random index for an array
node.randomizeSelection = function (length) {
	return Math.floor(Math.random() * length);
};

// Returns a random number between min (inclusive) and max (exclusive)
node.randomNumber = function (min, max) {
	return	Math.floor(Math.random() * (max - min) + min);
};

// Returns the expected fee for the given amount
node.expectedFee = function (amount) {
	return parseInt(node.fees.transactionFee);
};

// Returns the expected fee for the given amount with data property
node.expectedFeeForTransactionWithData = function (amount) {
	return parseInt(node.fees.transactionFee) + parseInt(node.fees.dataFee);
};

// Returns a random username of 16 characters
node.randomUsername = function () {
	var randomLetter = node.randomString.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'lowercase'
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = node.randomString.generate({
		length: 15,
		charset: custom
	});

	return randomLetter.concat(username);
};

// Returns a random delegate name of 20 characters
node.randomDelegateName = function () {
	var randomLetter = node.randomString.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'lowercase'
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = node.randomString.generate({
		length: 19,
		charset: custom
	});

	return randomLetter.concat(username);
};

// Returns a random capitialized username of 16 characters
node.randomCapitalUsername = function () {
	var randomLetter = node.randomString.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'uppercase'
	});
	var custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	var username = node.randomString.generate({
		length: 16,
		charset: custom
	});

	return randomLetter.concat(username);
};

// Returns a random application name of 32 characteres
node.randomApplicationName = function () {
	var custom = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	return node.randomString.generate({
		length: node.randomNumber(5, 32),
		charset: custom
	});
};

// Test random application
node.randomApplication = function () {
	var application = {
		category: node.randomNumber(0, 9),
		name: node.randomApplicationName(),
		description: 'Blockchain based home monitoring tool',
		tags: 'monitoring temperature power sidechain',
		type: node.randomNumber(0, 2),
		link: 'https://' + node.randomApplicationName() + '.zip',
		icon: 'https://raw.githubusercontent.com/MaxKK/blockDataDapp/master/icon.png'
	};

	return application;
};

// Test applications
node.guestbookDapp = node.randomApplication();
node.blockDataDapp = node.randomApplication();

// Returns a basic random account
node.randomAccount = function () {
	var account = {
		balance: '0'
	};

	account.password = node.randomPassword();
	account.secondPassword = node.randomPassword();
	account.username = node.randomDelegateName();
	account.publicKey = node.lisk.crypto.getKeys(account.password).publicKey;
	account.address = node.lisk.crypto.getAddress(account.publicKey);
	account.secondPublicKey = node.lisk.crypto.getKeys(account.secondPassword).publicKey;

	return account;
};

// Returns an random basic transaction to send 1 LSK from genesis account to a random account
node.randomTransaction = function (offset) {
	var randomAccount = node.randomAccount();

	return node.lisk.transaction.createTransaction(randomAccount.address, 1, node.gAccount.password, offset);
};

// Returns a random password
node.randomPassword = function () {
	return Math.random().toString(36).substring(7);
};

var currentAppScope;

// Init whole application inside tests
node.initApplication = function (cb, initScope) {

	initScope.waitForGenesisBlock = initScope.waitForGenesisBlock !== false;

	jobsQueue.jobs = {};
	var modules = [], rewiredModules = {};
	// Init dummy connection with database - valid, used for tests here
	var options = {
		promiseLib: Promise
	};
	var db = initScope.db;
	if (!db) {
		var pgp = require('pg-promise')(options);
		node.config.db.user = node.config.db.user || process.env.USER;
		db = pgp(node.config.db);
	}

	// Clear tables
	db.task(function (t) {
		return t.batch([
			t.none('DELETE FROM blocks WHERE height > 1'),
			t.none('DELETE FROM blocks'),
			t.none('DELETE FROM mem_accounts')
		]);
	}).then(function () {
		var logger = initScope.logger || {
			trace: sinon.spy(),
			debug: sinon.spy(),
			info:  sinon.spy(),
			log:   sinon.spy(),
			warn:  sinon.spy(),
			error: sinon.spy()
		};

		var modulesInit = {
			accounts: '../modules/accounts.js',
			blocks: '../modules/blocks.js',
			dapps: '../modules/dapps.js',
			delegates: '../modules/delegates.js',
			loader: '../modules/loader.js',
			multisignatures: '../modules/multisignatures.js',
			node: '../modules/node.js',
			peers: '../modules/peers.js',
			signatures: '../modules/signatures.js',
			system: '../modules/system.js',
			transactions: '../modules/transactions.js',
			transport: '../modules/transport.js',
			voters: '../modules/voters.js',
		};

		// Init limited application layer
		node.async.auto({
			config: function (cb) {
				cb(null, node.config);
			},
			genesisblock: function (cb) {
				var genesisblock = require('../genesisBlock.json');
				cb(null, {block: genesisblock});
			},

			schema: function (cb) {
				var z_schema = require('../helpers/z_schema.js');
				cb(null, new z_schema());
			},
			network: function (cb) {
				// Init with empty function
				cb(null, {io: {sockets: {emit: function () {}}}, app: require('express')()});
			},
			webSocket: ['config', 'logger', 'network', function (scope, cb) {
				// Init with empty functions
				var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

				var dummySocketCluster = {on: function () {}};
				var dummyWAMPServer = new MasterWAMPServer(dummySocketCluster, {});
				var wsRPC = require('../api/ws/rpc/wsRPC.js').wsRPC;

				wsRPC.setServer(dummyWAMPServer);
				wsRPC.clientsConnectionsMap = {};
				cb();
			}],
			logger: function (cb) {
				cb(null, logger);
			},
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

			swagger: ['network', 'modules', 'logger', function (scope, cb) {
				swagger(scope.network.app, scope.config, scope.logger, scope, cb);
			}],

			ed: function (cb) {
				cb(null, require('../helpers/ed.js'));
			},

			bus: ['ed', function (scope, cb) {
				var changeCase = require('change-case');

				var bus = initScope.bus || new (function () {
					this.message = function () {
						var args = [];
						Array.prototype.push.apply(args, arguments);
						var topic = args.shift();
						var eventName = 'on' + changeCase.pascalCase(topic);

						// Iterate over modules and execute event functions (on*)
						modules.forEach(function (module) {
							if (typeof(module[eventName]) === 'function') {
								jobsQueue.jobs = {};
								module[eventName].apply(module[eventName], args);
							}
							if (module.submodules) {
								node.async.each(module.submodules, function (submodule) {
									if (submodule && typeof(submodule[eventName]) === 'function') {
										submodule[eventName].apply(submodule[eventName], args);
									}
								});
							}
						});
					};
				})();
				cb(null, bus);
			}],
			db: function (cb) {
				cb(null, db);
			},
			pg_notify: ['db', 'bus', 'logger', function (scope, cb) {
				var pg_notify = require('../helpers/pg-notify.js');
				pg_notify.init(scope.db, scope.bus, scope.logger, cb);
			}],
			rpc: ['db', 'bus', 'logger', function (scope, cb) {
				var wsRPC = require('../api/ws/rpc/wsRPC').wsRPC;
				var transport = require('../api/ws/transport');
				var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

				var socketClusterMock = {
					on: sinon.spy()
				};
				wsRPC.setServer(new MasterWAMPServer(socketClusterMock));

				// Register RPC
				var transportModuleMock = {internal: {}, shared: {}};
				transport(transportModuleMock);
				cb();
			}],
			logic: ['db', 'bus', 'schema', 'network', 'genesisblock', function (scope, cb) {
				var Transaction = require('../logic/transaction.js');
				var Block = require('../logic/block.js');
				var Multisignature = require('../logic/multisignature.js');
				var Account = require('../logic/account.js');
				var Peers = require('../logic/peers.js');

				node.async.auto({
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
						cb(null, scope.logger);
					},
					schema: function (cb) {
						cb(null, scope.schema);
					},
					genesisblock: function (cb) {
						cb(null, {
							block: scope.genesisblock.block
						});
					},
					account: ['db', 'bus', 'ed', 'schema', 'genesisblock', 'logger', function (scope, cb) {
						new Account(scope.db, scope.schema, scope.logger, cb);
					}],
					transaction: ['db', 'bus', 'ed', 'schema', 'genesisblock', 'account', 'logger', function (scope, cb) {
						new Transaction(scope.db, scope.ed, scope.schema, scope.genesisblock, scope.account, scope.logger, cb);
					}],
					block: ['db', 'bus', 'ed', 'schema', 'genesisblock', 'account', 'transaction', function (scope, cb) {
						new Block(scope.ed, scope.schema, scope.transaction, cb);
					}],
					peers: ['logger', function (scope, cb) {
						new Peers(scope.logger, cb);
					}],
					multisignature: ['schema', 'transaction', 'logger', function (scope, cb) {
						cb(null, new Multisignature(scope.schema, scope.network, scope.transaction, scope.logger));
					}]
				}, cb);
			}],
			modules: ['network', 'webSocket', 'logger', 'bus', 'sequence', 'dbSequence', 'balancesSequence', 'db', 'logic', 'rpc', function (scope, cb) {
				var tasks = {};
				scope.rewiredModules = {};

				Object.keys(modulesInit).forEach(function (name) {
					tasks[name] = function (cb) {
						var Instance = rewire(modulesInit[name]);
						rewiredModules[name] = Instance;
						var obj = new rewiredModules[name](cb, scope);
						modules.push(obj);
					};
				});

				node.async.parallel(tasks, function (err, results) {
					cb(err, results);
				});
			}],
			ready: ['modules', 'bus', 'logic', function (scope, cb) {
				// Fire onBind event in every module
				scope.bus.message('bind', scope.modules);
				scope.logic.peers.bindModules(scope.modules);
				cb();
			}]
		}, function (err, scope) {
			// Overwrite onBlockchainReady function to prevent automatic forging
			scope.rewiredModules = rewiredModules;

			scope.modules.delegates.onBlockchainReady = function () {
				// Wait for genesis block's transactions to be applied into mem_accounts
				if (initScope.waitForGenesisBlock) {
					return cb(err, scope);
				}
			};
			currentAppScope = scope;
			if (!initScope.waitForGenesisBlock || initScope.bus) {
				return cb(err, scope);
			}
		});
	});
};

node.appCleanup = function (done) {
	node.async.eachSeries(currentAppScope.modules, function (module, cb) {
		if (typeof(module.cleanup) === 'function') {
			module.cleanup(cb);
		} else {
			cb();
		}
	}, function (err) {
		if (err) {
			currentAppScope.logger.error(err);
		} else {
			currentAppScope.logger.info('Cleaned up successfully');
		}
		done();
	});
};

before(function (done) {
	require('./common/globalBefore').waitUntilBlockchainReady(done);
});

// Exports
module.exports = node;

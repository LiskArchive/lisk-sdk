'use strict';

var repl = require('repl');
var fs = require('fs');
var path = require('path');
var rewire = require('rewire');
var async = require('async');

var AppConfig = require('../helpers/config.js');
var Sequence = require('../helpers/sequence.js');
var cache = require('../helpers/cache.js');
var z_schema = require('../helpers/z_schema.js');
var Logger = require('../logger.js');
var appConfig = AppConfig(require('../package.json'));

var logger = new Logger({
	echo: appConfig.consoleLogLevel, errorLevel: appConfig.fileLogLevel,
	filename: appConfig.logFileName
});
var genesisblock = require('../genesisBlock.json');
var modules = [];

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
	transport: '../modules/transport.js'
};

async.auto({
	config: function (cb) {
		cb(null, appConfig);
	},

	logger: function (cb) {
		cb(null, logger);
	},

	schema: function (cb) {
		cb(null, new z_schema());
	},

	cache: function (cb) {
		var cache = require('../helpers/cache.js');
		cache.connect(appConfig.cacheEnabled, appConfig.redis, logger, cb);
	},

	genesisblock: function (cb) {
		cb(null, {
			block: genesisblock
		});
	},

	db: function (cb) {
		var db = require('../helpers/database.js');
		db.connect(appConfig.db, logger, cb);
	},

	pg_notify: ['db', function (scope, cb) {
		var pg_notify = require('../helpers/pg-notify.js');
		pg_notify.init(scope.db, scope.bus, scope.logger, cb);
	}],

	ed: function (cb) {
		cb(null, require('../helpers/ed.js'));
	},

	bus: ['ed', function (scope, cb) {
		var changeCase = require('change-case');
		var bus = function () {
			this.message = function () {
				var args = [];
				Array.prototype.push.apply(args, arguments);
				var topic = args.shift();
				var eventName = 'on' + changeCase.pascalCase(topic);

				// Iterate over modules and execute event functions (on*)
				modules.forEach(function (module) {
					if (typeof (module[eventName]) === 'function') {
						module[eventName].apply(module[eventName], args);
					}
					if (module.submodules) {
						async.each(module.submodules, function (submodule) {
							if (submodule && typeof (submodule[eventName]) === 'function') {
								submodule[eventName].apply(submodule[eventName], args);
							}
						});
					}
				});
			};
		};
		cb(null, new bus());
	}],

	logic: ['db', 'schema', 'genesisblock', function (scope, cb) {
		var Transaction = require('../logic/transaction.js');
		var Block = require('../logic/block.js');
		var Account = require('../logic/account.js');
		var Peers = require('../logic/peers.js');

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
			}]
		}, cb);
	}],

	modules: ['logic', function (scope, cb) {
		var tasks = {};

		Object.keys(modulesInit).forEach(function (name) {
			tasks[name] = function (cb) {
				var Instance = rewire(modulesInit[name]);
				var obj = new Instance(cb, scope);
				modules.push(obj);
			};
		});

		async.parallel(tasks, function (err, results) {
			cb(err, results);
		});
	}],

	helpers: ['modules', function (scope, cb) {
		var helpers = {};

		fs.readdirSync(path.join(__dirname, '..', 'helpers')).forEach(function (file) {
			var filePath = '../helpers/' + file;
			var fileName = path.basename(filePath, path.extname(filePath));
			helpers[fileName] = require(filePath);
		});

		cb(null, helpers);
	}],

	bind: ['modules', function (scope, cb) {
		scope.bus.message('bind', scope.modules);
		scope.logic.peers.bindModules(scope.modules);
	}],

	ready: ['modules', function (scope, cb) {

		var replServer = repl.start({
			prompt: 'lisk-core [' + appConfig.db.database + '] > ',
		});

		replServer.context.config = appConfig;
		replServer.context.modules = scope.modules;
		replServer.context.logic = scope.logic;
		replServer.context.helpers = scope.helpers;

		// A callback method to be utilized in repl 
		replServer.context.cb = function (err, data) {
			logger.log(data);
		};

		cb(null);
	}]
});

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

var express = require('express');
var path = require('path');
var randomstring = require('randomstring');
var async = require('async');

var dirname = path.join(__dirname, '..', '..');
var config = require(path.join(dirname, '/test/data/config.json'));
var Sequence = require(path.join(dirname, '/helpers', 'sequence.js'));
var database = require(path.join(dirname, '/db'));
var genesisblock = require(path.join(dirname, '/test/data/genesisBlock.json'));
var Logger = require(dirname + '/logger.js');

var z_schema = require('../../helpers/z_schema.js');
var cacheHelper = require('../../helpers/cache.js');
var Cache = require('../../modules/cache.js');
var ed = require('../../helpers/ed');
var jobsQueue = require('../../helpers/jobsQueue');
var Transaction = require('../../logic/transaction.js');
var Account = require('../../logic/account.js');

var modulesLoader = new function () {

	this.db = null;
	this.logger = new Logger({ echo: null, errorLevel: config.fileLogLevel, filename: config.logFileName });
	config.nonce = randomstring.generate(16);
	this.scope = {
		config: config,
		genesisblock: { block: genesisblock },
		logger: this.logger,
		network: {
			app: express(),
			io: {
				sockets: express()
			}
		},
		schema: new z_schema(),
		ed: ed,
		bus: {
			argsMessages: [],
			message: function () {
				Array.prototype.push.apply(this.argsMessages, arguments);
			},
			getMessages: function () {
				return this.argsMessages;
			},
			clearMessages: function () {
				this.argsMessages = [];
			}
		},
		nonce: randomstring.generate(16),
		dbSequence: new Sequence({
			onWarning: function (current, limit) {
				this.logger.warn('DB queue', current);
			}
		}),
		sequence: new Sequence({
			onWarning: function (current, limit) {
				this.logger.warn('Main queue', current);
			}
		}),
		balancesSequence: new Sequence({
			onWarning: function (current, limit) {
				this.logger.warn('Balance queue', current);
			}
		})
	};

	/**
	 * Initializes Logic class with params
	 *
	 * @param {function} Logic
	 * @param {Object} scope
	 * @param {function} cb
	 */
	this.initLogic = function (Logic, scope, cb) {
		jobsQueue.jobs = {};
		scope = _.assign({}, this.scope, scope);
		switch (Logic.name) {
			case 'Account':
				new Logic(scope.db, scope.schema, scope.logger, cb);
				break;
			case 'Transaction':
				async.series({
					account: function (cb) {
						new Account(scope.db, scope.schema, scope.logger, cb);
					}
				}, function (err, result) {
					new Logic(scope.db, scope.ed, scope.schema, scope.genesisblock, result.account, scope.logger, cb);
				});
				break;
			case 'Block':
				async.waterfall([
					function (waterCb) {
						return new Account(scope.db, scope.schema, scope.logger, waterCb);
					},
					function (account, waterCb) {
						return new Transaction(scope.db, scope.ed, scope.schema, scope.genesisblock, account, scope.logger, waterCb);
					}
				], function (err, transaction) {
					new Logic(scope.ed, scope.schema, transaction, cb);
				});
				break;
			case 'Peers':
				new Logic(scope.logger, cb);
				break;
			default:
				console.log('no Logic case initLogic');
		}
	};

	/**
	 * Initializes Module class with params
	 *
	 * @param {function} Module
	 * @param {Object} scope
	 * @param {function} cb
	 */
	this.initModule = function (Module, scope, cb) {
		jobsQueue.jobs = {};
		scope = _.assign({}, this.scope, scope);
		return new Module(cb, scope);
	};

	/**
	 * Initializes multiple Modules
	 *
	 * @param {Array<{name: Module}>} modules
	 * @param {Array<{name: Logic}>} logic
	 * @param {Object>} scope
	 * @param {function} cb
	 */
	this.initModules = function (modules, logic, scope, cb) {
		scope = _.merge({}, this.scope, scope);
		async.waterfall([
			function (waterCb) {
				async.reduce(logic, {}, function (memo, logicObj, mapCb) {
					var name = _.keys(logicObj)[0];
					return this.initLogic(logicObj[name], scope, function (err, initializedLogic) {
						memo[name] = initializedLogic;
						return mapCb(err, memo);
					});
				}.bind(this), waterCb);
			}.bind(this),
			function (logic, waterCb) {
				scope = _.merge({}, this.scope, scope, {logic: logic});
				async.reduce(modules, {}, function (memo, moduleObj, mapCb) {
					var name = _.keys(moduleObj)[0];
					return this.initModule(moduleObj[name], scope, function (err, module) {
						memo[name] = module;
						return mapCb(err, memo);
					}.bind(this));
				}.bind(this), waterCb);
			}.bind(this),

			function (modules, waterCb) {
				_.each(scope.logic, function (logic) {
					if (typeof logic.bind === 'function') {
						logic.bind({modules: modules});
					}
					if (typeof logic.bindModules === 'function') {
						logic.bindModules(modules);
					}
				});
				waterCb(null, modules);
			}
		], cb);
	};

	/**
	 * Initializes all created Modules in directory
	 *
	 * @param {function} cb
	 * @param {Object} [scope={}] scope
	 */
	this.initAllModules = function (cb, scope) {
		this.initModules([
			{accounts: require('../../modules/accounts')},
			{blocks: require('../../modules/blocks')},
			{delegates: require('../../modules/delegates')},
			{loader: require('../../modules/loader')},
			{multisignatures: require('../../modules/multisignatures')},
			{peers: require('../../modules/peers')},
			{rounds: require('../../modules/rounds')},
			{signatures: require('../../modules/signatures')},
			{system: require('../../modules/system')},
			{transactions: require('../../modules/transactions')},
			{transport: require('../../modules/transport')}
		], [
			{'transaction': require('../../logic/transaction')},
			{'account': require('../../logic/account')},
			{'block': require('../../logic/block')},
			{'peers': require('../../logic/peers.js')}
		], scope || {}, cb);
	};

	/**
	 * Accepts Class to invoke (Logic or Module) and fills the scope with basic conf
	 *
	 * @param {function} Klass
	 * @param {function} moduleConstructor
	 * @param {function} cb
	 * @param {Object=} scope
	 */
	this.initWithDb = function (Klass, moduleConstructor, cb, scope) {
		this.getDbConnection(function (err, db) {
			if (err) {
				return cb(err);
			}

			moduleConstructor(Klass, _.merge(this.scope, {db: db}, scope), cb);
		}.bind(this));
	};

	/**
	 * Starts and returns db connection
	 *
	 * @param {function} cb
	 */
	this.getDbConnection = function (cb) {
		if (this.db) {
			return cb(null, this.db);
		}
		database.connect(this.scope.config.db, this.logger)
			.then(db => {
				this.db = db;
				cb(null, db);
			})
			.catch(err => cb(err));
	};

	/**
	 * Initializes Cache module
	 * @param {function} cb
	 */
	this.initCache = function (cb) {
		var cacheEnabled, cacheConfig;
		cacheEnabled = this.scope.config.cacheEnabled;
		cacheConfig = this.scope.config.redis;
		cacheHelper.connect(cacheEnabled, cacheConfig, this.logger, function (err, __cache) {
			if (err) {
				cb(err, __cache);
			} else {
				this.initModule(Cache, _.merge(this.scope, {cache: __cache}), cb);
			}
		}.bind(this));
	};
};

module.exports = modulesLoader;

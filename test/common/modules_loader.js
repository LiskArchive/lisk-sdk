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

const express = require('express');
const randomstring = require('randomstring');
const async = require('async');
const Sequence = require('../../helpers/sequence.js');
const Logger = require('../../logger.js');
const Z_schema = require('../../helpers/z_schema.js');
const RedisConnector = require('../../helpers/redis_connector.js');
const Cache = require('../../modules/cache.js');
const ed = require('../../helpers/ed');
const jobsQueue = require('../../helpers/jobs_queue');
const Transaction = require('../../logic/transaction.js');
const Account = require('../../logic/account.js');

const modulesLoader = new function() {
	this.storage = null;
	this.logger = new Logger({
		echo: null,
		errorLevel: __testContext.config.fileLogLevel,
		filename: __testContext.config.logFileName,
	});
	this.scope = {
		config: __testContext.config,
		genesisBlock: { block: __testContext.config.genesisBlock },
		logger: this.logger,
		network: {
			app: express(),
			io: {
				sockets: express(),
			},
		},
		schema: new Z_schema(),
		ed,
		bus: {
			argsMessages: [],
			message(...args) {
				Array.prototype.push.apply(this.argsMessages, ...args);
			},
			getMessages() {
				return this.argsMessages;
			},
			clearMessages() {
				this.argsMessages = [];
			},
		},
		nonce: randomstring.generate(16),
		sequence: new Sequence({
			onWarning(current) {
				this.logger.warn('Main queue', current);
			},
		}),
		balancesSequence: new Sequence({
			onWarning(current) {
				this.logger.warn('Balance queue', current);
			},
		}),
	};

	/**
	 * Initializes Logic class with params
	 *
	 * @param {function} Logic
	 * @param {Object} scope
	 * @param {function} cb
	 */
	this.initLogic = function(Logic, scope, cb) {
		jobsQueue.jobs = {};
		scope = _.assign({}, this.scope, scope);
		switch (Logic.name) {
			case 'Account':
				new Logic(scope.storage, scope.schema, scope.logger, cb);
				break;
			case 'Transaction':
				async.series(
					{
						account(accountCb) {
							new Account(scope.storage, scope.schema, scope.logger, accountCb);
						},
					},
					(err, result) => {
						new Logic(
							scope.storage,
							scope.ed,
							scope.schema,
							scope.genesisBlock,
							result.account,
							scope.logger,
							cb
						);
					}
				);
				break;
			case 'Block':
				async.waterfall(
					[
						function(waterCb) {
							return new Account(scope.schema, scope.logger, waterCb);
						},
						function(account, waterCb) {
							return new Transaction(
								scope.storage,
								scope.ed,
								scope.schema,
								scope.genesisBlock,
								account,
								scope.logger,
								waterCb
							);
						},
					],
					(err, transaction) => {
						new Logic(scope.ed, scope.schema, transaction, cb);
					}
				);
				break;
			case 'Peers':
				new Logic(scope.logger, scope.config, cb);
				break;
			default:
				console.info('no Logic case initLogic');
		}
	};

	/**
	 * Initializes Module class with params
	 *
	 * @param {function} Module
	 * @param {Object} scope
	 * @param {function} cb
	 */
	this.initModule = function(Module, scope, cb) {
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
	this.initModules = function(modules, logics, scope, cb) {
		scope = _.merge({}, this.scope, scope);
		async.waterfall(
			[
				function(waterCb) {
					async.reduce(
						logics,
						{},
						(memo, logicObj, mapCb) => {
							const name = _.keys(logicObj)[0];
							return this.initLogic(
								logicObj[name],
								scope,
								(err, initializedLogic) => {
									memo[name] = initializedLogic;
									return mapCb(err, memo);
								}
							);
						},
						waterCb
					);
				}.bind(this),
				function(logic, waterCb) {
					scope = _.merge({}, this.scope, scope, {
						logic,
					});
					async.reduce(
						modules,
						{},
						(memo, moduleObj, mapCb) => {
							const name = _.keys(moduleObj)[0];
							return this.initModule(moduleObj[name], scope, (err, module) => {
								memo[name] = module;
								return mapCb(err, memo);
							});
						},
						waterCb
					);
				}.bind(this),

				function(modules1, waterCb) {
					_.each(scope.logic, logic => {
						if (typeof logics.bind === 'function') {
							logic.bind({ modules });
						}
						if (typeof logic.bindModules === 'function') {
							logic.bindModules(modules);
						}
					});
					waterCb(null, modules1);
				},
			],
			cb
		);
	};

	/**
	 * Initializes all created Modules in directory
	 *
	 * @param {function} cb
	 * @param {Object} [scope={}] scope
	 */
	this.initAllModules = function(cb, scope) {
		this.initModules(
			[
				{ accounts: require('../../modules/accounts') },
				{ blocks: require('../../modules/blocks') },
				{ delegates: require('../../modules/delegates') },
				{ loader: require('../../modules/loader') },
				{ multisignatures: require('../../modules/multisignatures') },
				{ peers: require('../../modules/peers') },
				{ rounds: require('../../modules/rounds') },
				{ signatures: require('../../modules/signatures') },
				{ system: require('../../modules/system') },
				{ transactions: require('../../modules/transactions') },
				{ transport: require('../../modules/transport') },
			],
			[
				{ transaction: require('../../logic/transaction') },
				{ account: require('../../logic/account') },
				{ block: require('../../logic/block') },
				{ peers: require('../../logic/peers.js') },
			],
			scope || {},
			cb
		);
	};

	/**
	 * Initializes Cache module
	 * @param {function} cb
	 */
	this.initCache = function(cb) {
		const cacheEnabled = this.scope.config.cacheEnabled;
		const cacheConfig = this.scope.config.redis;
		const redisConnector = new RedisConnector(
			cacheEnabled,
			cacheConfig,
			this.logger
		);
		redisConnector.connect((_, client) =>
			this.initModule(
				Cache,
				Object.assign(this.scope, { cache: { client, cacheEnabled } }),
				cb
			)
		);
	};
}();

module.exports = modulesLoader;

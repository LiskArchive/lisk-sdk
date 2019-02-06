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
const Sequence = require('../../src/modules/chain/helpers/sequence.js');
const { createLoggerComponent } = require('../../src/components/logger');
const { createSystemComponent } = require('../../src/components/system');

const Z_schema = require('../../src/modules/chain/helpers/z_schema.js');
const ed = require('../../src/modules/chain/helpers/ed');
const jobsQueue = require('../../src/modules/chain/helpers/jobs_queue');
const Transaction = require('../../src/modules/chain/logic/transaction.js');
const Account = require('../../src/modules/chain/logic/account.js');

const modulesLoader = new function() {
	this.storage = null;
	this.logger = createLoggerComponent({
		echo: null,
		errorLevel: __testContext.config.fileLogLevel,
		filename: __testContext.config.logFileName,
	});
	this.system = createSystemComponent(
		__testContext.config,
		this.logger,
		this.storage
	);
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
							return new Account(
								scope.storage,
								scope.schema,
								scope.logger,
								waterCb
							);
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
				new Logic(scope.config, scope.logger, cb);
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
				{ accounts: require('../../src/modules/chain/modules/accounts') },
				{ blocks: require('../../src/modules/chain/modules/blocks') },
				{ delegates: require('../../src/modules/chain/modules/delegates') },
				{ loader: require('../../src/modules/chain/modules/loader') },
				{
					multisignatures: require('../../src/modules/chain/modules/multisignatures'),
				},
				{ peers: require('../../src/modules/chain/modules/peers') },
				{ rounds: require('../../src/modules/chain/modules/rounds') },
				{ signatures: require('../../src/modules/chain/modules/signatures') },
				{
					transactions: require('../../src/modules/chain/modules/transactions'),
				},
				{ transport: require('../../src/modules/chain/modules/transport') },
			],
			[
				{ transaction: require('../../src/modules/chain/logic/transaction') },
				{ account: require('../../src/modules/chain/logic/account') },
				{ block: require('../../src/modules/chain/logic/block') },
				{ peers: require('../../src/modules/chain/logic/peers.js') },
			],
			scope || {},
			cb
		);
	};
}();

module.exports = modulesLoader;

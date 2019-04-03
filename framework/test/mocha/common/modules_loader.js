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
const Sequence = require('../../../src/modules/chain/helpers/sequence');
const { createLoggerComponent } = require('../../../src/components/logger');
const { ZSchema } = require('../../../src/controller/helpers/validator');
const ed = require('../../../src/modules/chain/helpers/ed');
const jobsQueue = require('../../../src/modules/chain/helpers/jobs_queue');
const Transaction = require('../../../src/modules/chain/logic/transaction');
const Account = require('../../../src/modules/chain/logic/account');

const modulesLoader = new function() {
	this.storage = null;
	this.logger = createLoggerComponent({
		echo: null,
		errorLevel: __testContext.config.fileLogLevel,
		filename: __testContext.config.logFileName,
	});

	this.scope = {
		lastCommit: '',
		build: '',
		config: __testContext.config,
		genesisBlock: { block: __testContext.config.genesisBlock },
		components: {
			logger: this.logger,
		},
		network: {
			expressApp: express(),
			io: {
				sockets: express(),
			},
		},
		schema: new ZSchema(),
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
		channel: {
			invoke: sinonSandbox.stub(),
			publish: sinonSandbox.stub(),
			suscribe: sinonSandbox.stub(),
		},
		applicationState: {
			nethash: __testContext.nethash,
			version: __testContext.version,
			wsPort: __testContext.wsPort,
			httpPort: __testContext.httpPort,
			minVersion: __testContext.minVersion,
			protocolVersion: __testContext.protocolVersion,
			nonce: __testContext.nonce,
		},
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
		scope = _.defaultsDeep(scope, this.scope);
		switch (Logic.name) {
			case 'Account':
				new Logic(
					scope.components.storage,
					scope.schema,
					scope.components.logger,
					cb
				);
				break;
			case 'Transaction':
				async.series(
					{
						account(accountCb) {
							new Account(
								scope.components.storage,
								scope.schema,
								scope.components.logger,
								accountCb
							);
						},
					},
					(err, result) => {
						new Logic(
							scope.components.storage,
							scope.ed,
							scope.schema,
							scope.genesisBlock,
							result.account,
							scope.components.logger,
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
								scope.components.storage,
								scope.schema,
								scope.components.logger,
								waterCb
							);
						},
						function(account, waterCb) {
							return new Transaction(
								scope.components.storage,
								scope.ed,
								scope.schema,
								scope.genesisBlock,
								account,
								scope.components.logger,
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
				new Logic(scope.components.logger, scope.config, scope.channel, cb);
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
		scope = _.defaultsDeep(scope, this.scope);
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
		scope = _.defaultsDeep(scope, this.scope);
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
				{ accounts: require('../../../src/modules/chain/submodules/accounts') },
				{ blocks: require('../../../src/modules/chain/submodules/blocks') },
				{
					delegates: require('../../../src/modules/chain/submodules/delegates'),
				},
				{ loader: require('../../../src/modules/chain/submodules/loader') },
				{
					multisignatures: require('../../../src/modules/chain/submodules/multisignatures'),
				},
				{ peers: require('../../../src/modules/chain/submodules/peers') },
				{ rounds: require('../../../src/modules/chain/submodules/rounds') },
				{
					signatures: require('../../../src/modules/chain/submodules/signatures'),
				},
				{
					transactions: require('../../../src/modules/chain/submodules/transactions'),
				},
				{
					transport: require('../../../src/modules/chain/submodules/transport'),
				},
			],
			[
				{
					transaction: require('../../../src/modules/chain/logic/transaction'),
				},
				{ account: require('../../../src/modules/chain/logic/account') },
				{ block: require('../../../src/modules/chain/logic/block') },
				{ peers: require('../../../src/modules/chain/logic/peers') },
			],
			scope || {},
			cb
		);
	};
}();

module.exports = modulesLoader;

/*
 * Copyright © 2019 Lisk Foundation
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
const async = require('async');
const { Sequence } = require('../../../src/application/node/utils/sequence');
const { createLoggerComponent } = require('../../../src/components/logger');
const jobsQueue = require('../../../src/application/node/utils/jobs_queue');

// TODO: Remove this file
const modulesLoader = new (function() {
	this.storage = null;
	this.logger = createLoggerComponent(__testContext.config.components.logger);

	this.scope = {
		lastCommit: '',
		build: '',
		config: __testContext.config.modules.chain,
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
		sequence: new Sequence({
			onWarning(current) {
				this.logger.warn('Main queue', current);
			},
		}),
		channel: {
			invoke: sinonSandbox.stub(),
			once: sinonSandbox.stub(),
			publish: sinonSandbox.stub(),
			suscribe: sinonSandbox.stub(),
		},
		applicationState: {
			networkId: __testContext.networkId,
			version: __testContext.version,
			wsPort: __testContext.wsPort,
			httpPort: __testContext.httpPort,
			minVersion: __testContext.minVersion,
			protocolVersion: __testContext.protocolVersion,
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
		if (Logic.name === 'Block') {
			return new Logic(scope.ed, this.transactions, cb);
		}

		return console.info('no Logic case initLogic');
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
								},
							);
						},
						waterCb,
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
						waterCb,
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
			cb,
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
				{ blocks: require('@liskhq/lisk-blocks') },
				{ loader: require('../../../src/application/node/loader') },
				{
					transport: require('../../../src/application/node/transport'),
				},
			],
			[],
			scope || {},
			cb,
		);
	};
})();

module.exports = modulesLoader;

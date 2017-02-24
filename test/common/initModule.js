'use strict';

var express = require('express');
var path = require('path');
var _ = require('lodash');

var dirname = path.join(__dirname, '..', '..');
var config = require(path.join(dirname, '/config.json'));
var database = require(path.join(dirname, '/helpers', 'database.js'));
var genesisblock = require(path.join(dirname, '/genesisBlock.json'));
var Logger = require(dirname + '/logger.js');
var z_schema = require('../../helpers/z_schema.js');

var modulesLoader = new function () {

	this.db = null;
	this.logger = new Logger({ echo: null, errorLevel: config.fileLogLevel, filename: config.logFileName });
	this.scope = {
		config: config,
		genesisblock: { block: genesisblock },
		logger: this.logger,
		network: {
			app: express()
		},
		public: '../../public',
		schema: new z_schema()
	};

	/**
	 * Initializes Logic class with params
	 *
	 * @param {Function} Logic
	 * @param {Object} scope
	 * @param {Function} cb
	 */
	this.initLogic = function (Logic, scope, cb) {
		new Logic(scope, cb);
	};

	/**
	 * Initializes Module class with params
	 *
	 * @param {Function} Module
	 * @param {Object} scope
	 * @param {Function} cb
	 */
	this.initModule = function (Module, scope, cb) {
		return new Module(cb, scope);
	};

	/**
	 * Initializes Module class with basic conf
	 *
	 * @param {Function} Module
	 * @param {Function} cb
	 * @param {Object=} scope
	 */
	this.initModuleWithDb = function (Module, cb, scope) {
		this.initWithDb(Module, this.initModule, cb, scope);
	};

	/**
	 * Initializes Logic class with basic conf
	 *
	 * @param {Function} Logic
	 * @param {Function} cb
	 * @param {Object=} scope
	 */
	this.initLogicWithDb = function (Logic, cb, scope) {
		this.initWithDb(Logic, this.initLogic, cb, scope);
	};

	/**
	 * Accepts Class to invoke (Logic or Module) and fills the scope with basic conf
	 *
	 * @param {Function} Klass
	 * @param {Function} moduleConstructor
	 * @param {Function} cb
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
	 * @param {Function} cb
	 */
	this.getDbConnection = function (cb) {
		if (this.db) {
			return cb(null, this.db);
		}
		database.connect(config.db, this.logger, function (err, db) {
			if (err) {
				return cb(err);
			}
			this.db = db;
			cb(null, this.db);
		}.bind(this));
	};
};

module.exports = {
	modulesLoader: modulesLoader
};
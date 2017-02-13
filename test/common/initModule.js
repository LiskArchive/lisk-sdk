'use strict';

var express = require('express');

var path = require('path');
var dirname = path.join(__dirname, '..', '..');
var config = require(path.join(dirname, '/config.json'));
var database = require(path.join(dirname, '/helpers', 'database.js'));
var genesisblock = require(path.join(dirname, '/genesisBlock.json'));
var Logger = require(dirname + '/logger.js');

var modulesLoader = new function() {

	this.db = null;
	this.logger = new Logger({ echo: null, errorLevel: config.fileLogLevel, filename: config.logFileName });

	/**
	 * Initializes Logic class with params
	 *
	 * @param {Function} Logic
	 * @param {Object} scope
	 * @param {Function} cb
	 */
	this.initLogic = function (Logic, scope, cb) {
		new Logic(scope, function (err, module) { return cb(err, module); });
	};

	/**
	 * Initializes Module class with params
	 *
	 * @param {Function} Module
	 * @param {Object} scope
	 * @param {Function} cb
	 */
	this.initModule = function (Module, scope, cb) {
		new Module(function (err, module) { return cb(err, module); }, scope);
	};

	/**
	 * Initializes Module class with basic conf
	 *
	 * @param {Function} Module
	 * @param {Function} cb
	 */
	this.initModuleWithDb = function (Module, cb) {
		this.initWithDb(Module, this.initModule, cb);
	};

	/**
	 * Initializes Logic class with basic conf
	 *
	 * @param {Function} Logic
	 * @param {Function} cb
	 */
	this.initLogicWithDb = function (Logic, cb) {
		this.initWithDb(Logic, this.initLogic, cb);
	};

	/**
	 * Accepts Class to invoke (Logic or Module) and fills the scope with basic conf
	 *
	 * @param {Function} Klass
	 * @param {Function} moduleConstructor
	 * @param {Function} cb
	 */
	this.initWithDb = function (Klass, moduleConstructor, cb) {
		this.getDbConnection(function (err, db) {
			if (err) {
				return cb(err);
			}
			moduleConstructor(Klass, {
				config: config,
				db: db,
				genesisblock: genesisblock,
				logger: this.logger,
				network: {
					app: express()
				}
			}, cb);
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
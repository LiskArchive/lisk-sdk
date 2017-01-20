'use strict';

var express = require('express');
var merge = require('lodash/merge');

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
	 * @param {Function} Module
	 * @param {Object} scope
	 * @param {Function} cb
	 */
	this.init = function (Module, scope, cb) {
		new Module(function (err, module) {
			return cb(err, module);
		}, merge({}, scope, {
			network: {
				app: express()
			},
			genesisblock: genesisblock
		}));
	};

	/**
	 * @param {Function} Module
	 * @param {Function} cb
	 */
	this.initWithDb = function(Module, cb) {
		this.getDbConnection(function (err, db) {
			if (err) {
				return cb(err);
			}
			this.init(Module, {db: db}, cb);
		}.bind(this));
	};

	/**
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
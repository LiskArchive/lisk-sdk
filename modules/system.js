'use strict';

var async = require('async');
var crypto = require('crypto');
var os = require('os');
var sandboxHelper = require('../helpers/sandbox.js');
var semver = require('semver');
var sql = require('../sql/system.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

var rcRegExp = /[a-z]+$/;

// Constructor
function System (cb, scope) {
	library = scope;
	self = this;

	__private.os = os.platform() + os.release();
	__private.version = library.config.version;
	__private.port = library.config.port;
	__private.height = 1;
	__private.nethash = library.config.nethash;
	__private.broadhash = library.config.nethash;
	__private.minVersion = library.config.minVersion;
	__private.nonce = library.nonce;

	if (rcRegExp.test(__private.minVersion)) {
		this.minVersion = __private.minVersion.replace(rcRegExp, '');
		this.minVersionChar = __private.minVersion.charAt(__private.minVersion.length - 1);
	} else {
		this.minVersion = __private.minVersion;
	}

	setImmediate(cb, null, self);
}

// Public methods
System.prototype.headers = function () {
	return __private;
};

System.prototype.getOS = function () {
	return __private.os;
};

System.prototype.getVersion = function () {
	return __private.version;
};

System.prototype.getPort = function () {
	return __private.port;
};

System.prototype.getHeight = function () {
	return __private.height;
};

System.prototype.getNethash = function () {
	return __private.nethash;
};

System.prototype.networkCompatible = function (nethash) {
	return __private.nethash === nethash;
};

System.prototype.getMinVersion = function () {
	return __private.minVersion;
};

System.prototype.versionCompatible = function (version) {
	var versionChar;

	if (rcRegExp.test(version)) {
		versionChar = version.charAt(version.length - 1);
		version = version.replace(rcRegExp, '');
	}

	// if no range specifier is used for minVersion, check the complete version string (inclusive versionChar)
	var rangeRegExp = /[\^~\*]/;
	if (this.minVersionChar && versionChar && !rangeRegExp.test(this.minVersion)) {
		return (version + versionChar) === (this.minVersion + this.minVersionChar);
	}

	// ignore versionChar, check only version
	return semver.satisfies(version, this.minVersion);
};

System.prototype.getBroadhash = function (cb) {
	if (typeof cb !== 'function') {
		return __private.broadhash;
	}

	library.db.query(sql.getBroadhash, { limit: 5 }).then(function (rows) {
		if (rows.length <= 1) {
			return setImmediate(cb, null, __private.nethash);
		} else {
			var seed = rows.map(function (row) { return row.id; }).join('');
			var hash = crypto.createHash('sha256').update(seed, 'utf8').digest();

			return setImmediate(cb, null, hash.toString('hex'));
		}
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, err);
	});
};

System.prototype.update = function (cb) {
	async.series({
		getBroadhash: function (seriesCb) {
			self.getBroadhash(function (err, hash) {
				if (!err) {
					__private.broadhash = hash;
				}

				return setImmediate(seriesCb);
			});
		},
		getHeight: function (seriesCb) {
			__private.height = modules.blocks.getLastBlock().height;
			return setImmediate(seriesCb);
		}
	}, function (err) {
		library.logger.debug('System headers', __private);
		modules.transport.headers(__private);
		return setImmediate(cb, err);
	});
};

System.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
System.prototype.onBind = function (scope) {
	modules = scope;
};

// Export
module.exports = System;

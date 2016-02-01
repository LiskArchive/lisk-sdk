var os = require("os"),
	sandboxHelper = require('../helpers/sandbox.js');

// Private fields
var modules, library, self, private = {}, shared = {};

private.version, private.osName, private.port, private.sharePort;

// Constructor
function System(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;

	private.version = library.config.version;
	private.port = library.config.port;
	private.sharePort = Number(!!library.config.sharePort);
	private.osName = os.platform() + os.release();

	setImmediate(cb, null, self);
}

// Private methods

// Public methods
System.prototype.getOS = function () {
	return private.osName;
}

System.prototype.getVersion = function () {
	return private.version;
}

System.prototype.getPort = function () {
	return private.port;
}

System.prototype.getSharePort = function () {
	return private.sharePort;
}

System.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
System.prototype.onBind = function (scope) {
	modules = scope;
}

// Shared

// Export
module.exports = System;

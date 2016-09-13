'use strict';

const os = require("os");
const { sandboxHelper } = require("../helpers");

// Private fields
let modules, library, self, __private = {}, shared = {};

// Constructor
class System {

	constructor(cb, scope) {
		library = scope;
		self = this;

		__private.version = library.config.version;
		__private.port = library.config.port;
		__private.nethash = library.config.nethash;
		__private.osName = os.platform() + os.release();

		setImmediate(cb, null, self);
	}

	// Private methods

	// Public methods
	getOS() {
		return __private.osName;
	}

	getVersion() {
		return __private.version;
	}

	getPort() {
		return __private.port;
	}

	getNethash() {
		return __private.nethash;
	}

	sandboxApi(call, args, cb) {
		sandboxHelper.callMethod(shared, call, args, cb);
	}

	// Events
	onBind(scope) {
		modules = scope;
	}
}

// Export
module.exports = System;

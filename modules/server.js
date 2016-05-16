var util = require("util");
var async = require("async");
var path = require("path");
var Router = require("../helpers/router.js");
var sandboxHelper = require("../helpers/sandbox.js");

// Private fields
var modules, library, self, private = {}, shared = {};

private.loaded = false

// Constructor
function Server(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;
	private.attachApi();

	setImmediate(cb, null, self);
}

// Private methods
private.attachApi = function() {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) return next();
		res.status(500).send({success: false, error: "Blockchain is loading"});
	});

	router.get('/', function (req, res) {
		if (private.loaded) {
			res.render('wallet.html', {layout: false});
		} else {
			res.render('loading.html');
		}
	});

	router.use(function (req, res, next) {
		if (req.url.indexOf('/api/') == -1 && req.url.indexOf('/peer/') == -1) {
			return res.redirect('/');
		}
		next();
		// res.status(500).send({ success: false, error: 'api not found' });
	});

	library.network.app.use('/', router);
}

// Public methods

Server.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Server.prototype.onBind = function (scope) {
	modules = scope;
}

Server.prototype.onBlockchainReady = function () {
	private.loaded = true;
}

Server.prototype.cleanup = function (cb) {
	private.loaded = false;
	cb();
}

// Shared

// Export
module.exports = Server;

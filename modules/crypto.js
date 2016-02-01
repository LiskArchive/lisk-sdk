var util = require('util'),
	request = require('request'),
	fs = require('fs'),
	crypto = require('crypto'),
	ed = require('ed25519'),
	// encryptHelper = require('../helpers/encrypt.js'),
	sandboxHelper = require('../helpers/sandbox.js');

var modules, library, self, private = {}, shared = {};

private.loaded = false;

// shared.keypair = function (req, cb) {
// 	var data = req.body;
// 	try {
// 		var hash = crypto.createHash('sha256').update(data.secret, 'utf8').digest();
// 		var keypair = ed.MakeKeypair(hash);
// 	} catch (e) {
// 		return cb(e);
// 	}
//
// 	return cb(null, keypair);
// }
//
// shared.sign = function (req, cb) {
// 	var data = req.body;
// 	library.scheme.validate(data, {
// 		type: "object",
// 		properties: {
// 			data: {
// 				type: "string",
// 				minLength: 1,
// 				format: "hex"
// 			},
// 			secret: {
// 				type: "string",
// 				minLength: 1
// 			}
// 		},
// 		required: ['data', 'secret']
// 	}, function (err) {
// 		if (err) {
// 			return cb(err[0].message);
// 		}
//
// 		try {
// 			var hash = new Buffer(data.data, 'hex');
// 			var secretHash = crypto.createHash('sha256').update(data.secret, 'utf8').digest();
// 			var keypair = ed.MakeKeypair(secretHash);
//
// 			return setImmediate(cb, null, ed.Sign(hash, keypair).toString('hex'));
// 		} catch (e) {
// 			return setImmediate(cb, e.toString());
// 		}
// 	});
// }
//
// shared.sha256 = function (req, cb) {
// 	var data = req.body;
// 	library.scheme.validate(data, {
// 		type: "object",
// 		properties: {
// 			data: {
// 				type: "string",
// 				minLength: 1,
// 				format: "hex"
// 			}
// 		},
// 		required: ['data']
// 	}, function (err) {
// 		if (err) {
// 			return cb(err[0].message);
// 		}
//
// 		try {
// 			var buf = new Buffer(data.data, 'hex');
// 			var hash = crypto.createHash('sha256').update(buf).toString('utf8');
// 		} catch (e) {
// 			return cb(e.toString());
// 		}
//
// 		return cb(null, hash);
// 	});
// }
//
// shared.encryptbox = function (req, cb) {
// 	var data = req.body;
// 	library.scheme.validate(data, {
// 		type: "object",
// 		properties: {
// 			secret: {
// 				type: "string",
// 				minLength: 1,
// 				maxLength: 100
// 			},
// 			message: {
// 				type: "string",
// 				minLength: 1
// 			}
// 		},
// 		required: ["secret", "message"]
// 	}, function (err) {
// 		if (err) {
// 			return cb(err[0].message);
// 		}
//
// 		var hash = crypto.createHash('sha256').update(data.secret, 'utf8').digest();
// 		var keypair = ed.MakeKeypair(hash);
//
// 		var nonce = encryptHelper.getNonce();
// 		var encrypted = encryptHelper.cryptobox(data.message, nonce, keypair.privateKey);
//
// 		return cb(null, {
// 			nonce: new Buffer(nonce).toString('hex'),
// 			message: new Buffer(encrypted).toString('hex')
// 		});
// 	});
// }
//
// shared.decryptbox = function (req, cb) {
// 	var data = req.body;
// 	library.scheme.validate(data, {
// 		type: "object",
// 		properties: {
// 			secret: {
// 				type: "string",
// 				minLength: 1,
// 				maxLength: 100
// 			},
// 			message: {
// 				type: "string",
// 				minLength: 1,
// 				format: "hex"
// 			},
// 			nonce: {
// 				type: "string",
// 				minLength: 1,
// 				format: "hex"
// 			}
// 		},
// 		required: ["secret", "message", "nonce"]
// 	}, function (err) {
// 		if (err) {
// 			return cb(err[0].message);
// 		}
//
// 		var hash = crypto.createHash('sha256').update(data.secret, 'utf8').digest();
// 		var keypair = ed.MakeKeypair(hash);
//
// 		var decrypted = encryptHelper.decrypt_cryptobox(new Buffer(data.message, 'hex'), new Buffer(data.nonce, 'hex'), keypair.privateKey);
//
// 		return cb(null, {
// 			decrypted: new Buffer(decrypted).toString('utf8')
// 		});
// 	});
// }

// Constructor
function Crypto(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;

	setImmediate(cb, null, self);
}

// Public methods
Crypto.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Crypto.prototype.onBind = function (scope) {
	modules = scope;
}

Crypto.prototype.onBlockchainReady = function () {
	private.loaded = true;
}

// Shared
module.exports = Crypto;

'use strict';

var async = require('async');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var ed = require('ed25519');
var MilestoneBlocks = require('../helpers/milestoneBlocks.js');
var Router = require('../helpers/router.js');
var sandboxHelper = require('../helpers/sandbox.js');
var slots = require('../helpers/slots.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};

// Constructor
function Signatures (cb, scope) {
	library = scope;
	self = this;
	self.__private = __private;
	__private.attachApi();

	var Signature = require('../logic/signature.js');
	__private.assetTypes[transactionTypes.SIGNATURE] = library.logic.transaction.attachAssetType(
		transactionTypes.SIGNATURE, new Signature()
	);

	setImmediate(cb, null, self);
}

// Private methods
__private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) { return next(); }
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	});


	router.map(shared, {
		'get /fee': 'getFee',
		'put /': 'addSignature'
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: 'API endpoint not found'});
	});

	library.network.app.use('/api/signatures', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err});
	});
};

// Public methods
Signatures.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Signatures.prototype.onBind = function (scope) {
	modules = scope;

	__private.assetTypes[transactionTypes.SIGNATURE].bind({
		modules: modules, library: library
	});
};

// Shared
shared.getFee = function (req, cb) {
	var fee = null;

	fee = constants.fees.secondsignature;

	cb(null, {fee: fee});
};

shared.addSignature = function (req, cb) {
	var body = req.body;
	library.scheme.validate(body, {
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1
			},
			secondSecret: {
				type: 'string',
				minLength: 1
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			},
			multisigAccountPublicKey: {
				type: 'string',
				format: 'publicKey'
			}
		},
		required: ['secret', 'secondSecret']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
		var keypair = ed.MakeKeypair(hash);

		if (body.publicKey) {
			if (keypair.publicKey.toString('hex') !== body.publicKey) {
				return cb('Invalid passphrase');
			}
		}

		library.balancesSequence.add(function (cb) {
			if (body.multisigAccountPublicKey && body.multisigAccountPublicKey !== keypair.publicKey.toString('hex')) {
				modules.accounts.getAccount({publicKey: body.multisigAccountPublicKey}, function (err, account) {
					if (err) {
						return cb(err);
					}

					if (!account || !account.publicKey) {
						return cb('Multisignature account not found');
					}

					if (!account.multisignatures || !account.multisignatures) {
						return cb('Account does not have multisignatures enabled');
					}

					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return cb('Account does not belong to multisignature group');
					}

					if (account.secondSignature || account.u_secondSignature) {
						return cb('Invalid second passphrase');
					}

					modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
						if (err) {
							return cb(err);
						}

						if (!requester || !requester.publicKey) {
							return cb('Invalid requester');
						}

						if (requester.secondSignature && !body.secondSecret) {
							return cb('Invalid second passphrase');
						}

						if (requester.publicKey === account.publicKey) {
							return cb('Invalid requester');
						}

						var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
						var secondKeypair = ed.MakeKeypair(secondHash);
						var transaction;

						try {
							transaction = library.logic.transaction.create({
								type: transactionTypes.SIGNATURE,
								sender: account,
								keypair: keypair,
								requester: keypair,
								secondKeypair: secondKeypair,

							});
						} catch (e) {
							return cb(e.toString());
						}

						modules.transactions.receiveTransactions([transaction], cb);
					});
				});
			} else {
				modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
					if (err) {
						return cb(err);
					}
					if (!account || !account.publicKey) {
						return cb('Account not found');
					}

					if (account.secondSignature || account.u_secondSignature) {
						return cb('Invalid second passphrase');
					}

					var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
					var secondKeypair = ed.MakeKeypair(secondHash);
					var transaction;

					try {
						transaction = library.logic.transaction.create({
							type: transactionTypes.SIGNATURE,
							sender: account,
							keypair: keypair,
							secondKeypair: secondKeypair
						});
					} catch (e) {
						return cb(e.toString());
					}
					modules.transactions.receiveTransactions([transaction], cb);
				});
			}

		}, function (err, transaction) {
			if (err) {
				return cb(err);
			}
			cb(null, {transaction: transaction[0]});
		});

	});
};

// Export
module.exports = Signatures;

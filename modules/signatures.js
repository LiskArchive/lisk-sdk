'use strict';

var ed = require('ed25519');
var ByteBuffer = require('bytebuffer');
var crypto = require('crypto');
var constants = require('../helpers/constants.js');
var slots = require('../helpers/slots.js');
var Router = require('../helpers/router.js');
var async = require('async');
var transactionTypes = require('../helpers/transactionTypes.js');
var MilestoneBlocks = require('../helpers/milestoneBlocks.js');
var sandboxHelper = require('../helpers/sandbox.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

function Signature () {
	this.create = function (data, trs) {
		trs.recipientId = null;
		trs.amount = 0;
		trs.asset.signature = {
			publicKey: data.secondKeypair.publicKey.toString('hex')
		};

		return trs;
	};

	this.calculateFee = function (trs, sender) {
		return constants.fees.secondsignature;
	};

	this.verify = function (trs, sender, cb) {
		if (!trs.asset.signature) {
			return setImmediate(cb, 'Invalid transaction asset');
		}

		if (trs.amount !== 0) {
			return setImmediate(cb, 'Invalid transaction amount');
		}

		try {
			if (!trs.asset.signature.publicKey || new Buffer(trs.asset.signature.publicKey, 'hex').length !== 32) {
				return setImmediate(cb, 'Invalid signature length');
			}
		} catch (e) {
			library.logger.error(e.toString());
			return setImmediate(cb, 'Invalid signature hex');
		}

		setImmediate(cb, null, trs);
	};

	this.process = function (trs, sender, cb) {
		setImmediate(cb, null, trs);
	};

	this.getBytes = function (trs) {
		var bb;

		try {
			bb = new ByteBuffer(32, true);
			var publicKeyBuffer = new Buffer(trs.asset.signature.publicKey, 'hex');

			for (var i = 0; i < publicKeyBuffer.length; i++) {
				bb.writeByte(publicKeyBuffer[i]);
			}

			bb.flip();
		} catch (e) {
			throw Error(e.toString());
		}
		return bb.toBuffer();
	};

	this.apply = function (trs, block, sender, cb) {
		modules.accounts.setAccountAndGet({
			address: sender.address,
			secondSignature: 1,
			u_secondSignature: 0,
			secondPublicKey: trs.asset.signature.publicKey
		}, cb);
	};

	this.undo = function (trs, block, sender, cb) {
		modules.accounts.setAccountAndGet({
			address: sender.address,
			secondSignature: 0,
			u_secondSignature: 1,
			secondPublicKey: null
		}, cb);
	};

	this.applyUnconfirmed = function (trs, sender, cb) {
		if (sender.u_secondSignature || sender.secondSignature) {
			return setImmediate(cb, 'Failed second signature: ' + trs.id);
		}

		modules.accounts.setAccountAndGet({address: sender.address, u_secondSignature: 1}, cb);
	};

	this.undoUnconfirmed = function (trs, sender, cb) {
		modules.accounts.setAccountAndGet({address: sender.address, u_secondSignature: 0}, cb);
	};

	this.objectNormalize = function (trs) {
		var report = library.scheme.validate(trs.asset.signature, {
			object: true,
			properties: {
				publicKey: {
					type: 'string',
					format: 'publicKey'
				}
			},
			required: ['publicKey']
		});

		if (!report) {
			throw Error('Can\'t parse signature: ' + library.scheme.getLastError());
		}

		return trs;
	};

	this.dbRead = function (raw) {
		if (!raw.s_publicKey) {
			return null;
		} else {
			var signature = {
				transactionId: raw.t_id,
				publicKey: raw.s_publicKey
			};

			return {signature: signature};
		}
	};

	this.dbTable = 'signatures';

	this.dbFields = [
		'transactionId',
		'publicKey'
	];

	this.dbSave = function (trs) {
		var publicKey;

		try {
			publicKey = new Buffer(trs.asset.signature.publicKey, 'hex');
		} catch (e) {
			throw Error(e.toString());
		}

		return {
			table: this.dbTable,
			fields: this.dbFields,
			values: {
				transactionId: trs.id,
				publicKey: publicKey
			}
		};
	};

	this.ready = function (trs, sender) {
		if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
			if (!Array.isArray(trs.signatures)) {
				return false;
			}
			return trs.signatures.length >= sender.multimin;
		} else {
			return true;
		}
	};
}

// Constructor
function Signatures(cb, scope) {
	library = scope;
	self = this;
	self.__private = __private;
	__private.attachApi();

	library.logic.transaction.attachAssetType(transactionTypes.SIGNATURE, new Signature());

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

module.exports = Signatures;

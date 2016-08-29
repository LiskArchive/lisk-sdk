'use strict';

var ByteBuffer = require('bytebuffer');
var constants = require('../helpers/constants.js');

// Private fields
var modules, library;

function Signature () {
	this.bind = function (scope) {
		modules = scope.modules;
		library = scope.library;
	};

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
		if (!trs.asset || !trs.asset.signature) {
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

		return setImmediate(cb, null, trs);
	};

	this.process = function (trs, sender, cb) {
		return setImmediate(cb, null, trs);
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
			throw Error('Failed to normalize signature: ' + library.scheme.getLastError());
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

// Export
module.exports = Signature;

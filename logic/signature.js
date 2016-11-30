'use strict';

var ByteBuffer = require('bytebuffer');
var constants = require('../helpers/constants.js');

// Private fields
var modules, library;

// Constructor
function Signature () {}

Signature.prototype.bind = function (scope) {
	modules = scope.modules;
	library = scope.library;
};

Signature.prototype.create = function (data, trs) {
	trs.recipientId = null;
	trs.amount = 0;
	trs.asset.signature = {
		publicKey: data.secondKeypair.publicKey.toString('hex')
	};

	return trs;
};

Signature.prototype.calculateFee = function (trs, sender) {
	return constants.fees.secondsignature;
};

Signature.prototype.verify = function (trs, sender, cb) {
	if (!trs.asset || !trs.asset.signature) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (trs.amount !== 0) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	try {
		if (!trs.asset.signature.publicKey || new Buffer(trs.asset.signature.publicKey, 'hex').length !== 32) {
			return setImmediate(cb, 'Invalid public key');
		}
	} catch (e) {
		library.logger.error(e.stack);
		return setImmediate(cb, 'Invalid public key');
	}

	return setImmediate(cb, null, trs);
};

Signature.prototype.process = function (trs, sender, cb) {
	return setImmediate(cb, null, trs);
};

Signature.prototype.getBytes = function (trs) {
	var bb;

	try {
		bb = new ByteBuffer(32, true);
		var publicKeyBuffer = new Buffer(trs.asset.signature.publicKey, 'hex');

		for (var i = 0; i < publicKeyBuffer.length; i++) {
			bb.writeByte(publicKeyBuffer[i]);
		}

		bb.flip();
	} catch (e) {
		throw e;
	}
	return bb.toBuffer();
};

Signature.prototype.apply = function (trs, block, sender, cb) {
	modules.accounts.setAccountAndGet({
		address: sender.address,
		secondSignature: 1,
		u_secondSignature: 0,
		secondPublicKey: trs.asset.signature.publicKey
	}, cb);
};

Signature.prototype.undo = function (trs, block, sender, cb) {
	modules.accounts.setAccountAndGet({
		address: sender.address,
		secondSignature: 0,
		u_secondSignature: 1,
		secondPublicKey: null
	}, cb);
};

Signature.prototype.applyUnconfirmed = function (trs, sender, cb) {
	if (sender.u_secondSignature || sender.secondSignature) {
		return setImmediate(cb, 'Second signature already enabled');
	}

	modules.accounts.setAccountAndGet({address: sender.address, u_secondSignature: 1}, cb);
};

Signature.prototype.undoUnconfirmed = function (trs, sender, cb) {
	modules.accounts.setAccountAndGet({address: sender.address, u_secondSignature: 0}, cb);
};

Signature.prototype.schema = {
	id: 'Signature',
	object: true,
	properties: {
		publicKey: {
			type: 'string',
			format: 'publicKey'
		}
	},
	required: ['publicKey']
};

Signature.prototype.objectNormalize = function (trs) {
	var report = library.schema.validate(trs.asset.signature, Signature.prototype.schema);

	if (!report) {
		throw 'Failed to validate signature schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
};

Signature.prototype.dbRead = function (raw) {
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

Signature.prototype.dbTable = 'signatures';

Signature.prototype.dbFields = [
	'transactionId',
	'publicKey'
];

Signature.prototype.dbSave = function (trs) {
	var publicKey;

	try {
		publicKey = new Buffer(trs.asset.signature.publicKey, 'hex');
	} catch (e) {
		throw e;
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

Signature.prototype.ready = function (trs, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(trs.signatures)) {
			return false;
		}
		return trs.signatures.length >= sender.multimin;
	} else {
		return true;
	}
};

// Export
module.exports = Signature;

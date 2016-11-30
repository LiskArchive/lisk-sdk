'use strict';

var async = require('async');
var ByteBuffer = require('bytebuffer');
var constants = require('../helpers/constants.js');
var Diff = require('../helpers/diff.js');
var exceptions = require('../helpers/exceptions.js');

// Private fields
var modules, library, __private = {};

__private.unconfirmedSignatures = {};

// Constructor
function Multisignature () {}

// Public methods
Multisignature.prototype.bind = function (scope) {
	modules = scope.modules;
	library = scope.library;
};

Multisignature.prototype.create = function (data, trs) {
	trs.recipientId = null;
	trs.amount = 0;
	trs.asset.multisignature = {
		min: data.min,
		keysgroup: data.keysgroup,
		lifetime: data.lifetime
	};

	return trs;
};

Multisignature.prototype.calculateFee = function (trs, sender) {
	return (trs.asset.multisignature.keysgroup.length + 1) * constants.fees.multisignature;
};

Multisignature.prototype.verify = function (trs, sender, cb) {
	if (!trs.asset || !trs.asset.multisignature) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (!Array.isArray(trs.asset.multisignature.keysgroup)) {
		return setImmediate(cb, 'Invalid multisignature keysgroup. Must be an array');
	}

	if (trs.asset.multisignature.keysgroup.length === 0) {
		return setImmediate(cb, 'Invalid multisignature keysgroup. Must not be empty');
	}

	if (trs.asset.multisignature.min <= 1 || trs.asset.multisignature.min > 16) {
		return setImmediate(cb, 'Invalid multisignature min. Must be between 1 and 16');
	}

	if (trs.asset.multisignature.min > trs.asset.multisignature.keysgroup.length) {
		var err = 'Invalid multisignature min. Must be less than keysgroup size';

		if (exceptions.multisignatures.indexOf(trs.id) > -1) {
			this.scope.logger.debug(err);
			this.scope.logger.debug(JSON.stringify(trs));
		} else {
			return setImmediate(cb, err);
		}
	}

	if (trs.asset.multisignature.lifetime < 1 || trs.asset.multisignature.lifetime > 72) {
		return setImmediate(cb, 'Invalid multisignature lifetime. Must be between 1 and 72');
	}

	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		return setImmediate(cb, 'Account already has multisignatures enabled');
	}

	if (this.ready(trs, sender)) {
		try {
			for (var s = 0; s < trs.asset.multisignature.keysgroup.length; s++) {
				var valid = false;

				if (trs.signatures) {
					for (var d = 0; d < trs.signatures.length && !valid; d++) {
						if (trs.asset.multisignature.keysgroup[s][0] !== '-' && trs.asset.multisignature.keysgroup[s][0] !== '+') {
							valid = false;
						} else {
							valid = library.logic.transaction.verifySignature(trs, trs.asset.multisignature.keysgroup[s].substring(1), trs.signatures[d]);
						}
					}
				}

				if (!valid) {
					return setImmediate(cb, 'Failed to verify signature in multisignature keysgroup');
				}
			}
		} catch (e) {
			library.logger.error(e.stack);
			return setImmediate(cb, 'Failed to verify signature in multisignature keysgroup');
		}
	}

	if (trs.asset.multisignature.keysgroup.indexOf('+' + sender.publicKey) !== -1) {
		return setImmediate(cb, 'Invalid multisignature keysgroup. Can not contain sender');
	}

	async.eachSeries(trs.asset.multisignature.keysgroup, function (key, cb) {
		var math = key[0];
		var publicKey = key.slice(1);

		if (math !== '+') {
			return setImmediate(cb, 'Invalid math operator in multisignature keysgroup');
		}

		try {
			var b = new Buffer(publicKey, 'hex');
			if (b.length !== 32) {
				return setImmediate(cb, 'Invalid public key in multisignature keysgroup');
			}
		} catch (e) {
			library.logger.error(e.stack);
			return setImmediate(cb, 'Invalid public key in multisignature keysgroup');
		}

		return setImmediate(cb);
	}, function (err) {
		if (err) {
			return setImmediate(cb, err);
		}

		var keysgroup = trs.asset.multisignature.keysgroup.reduce(function (p, c) {
			if (p.indexOf(c) < 0) { p.push(c); }
			return p;
		}, []);

		if (keysgroup.length !== trs.asset.multisignature.keysgroup.length) {
			return setImmediate(cb, 'Encountered duplicate public key in multisignature keysgroup');
		}

		return setImmediate(cb, null, trs);
	});
};

Multisignature.prototype.process = function (trs, sender, cb) {
	return setImmediate(cb, null, trs);
};

Multisignature.prototype.getBytes = function (trs, skip) {
	var keysgroupBuffer = new Buffer(trs.asset.multisignature.keysgroup.join(''), 'utf8');

	var bb = new ByteBuffer(1 + 1 + keysgroupBuffer.length, true);
	bb.writeByte(trs.asset.multisignature.min);
	bb.writeByte(trs.asset.multisignature.lifetime);
	for (var i = 0; i < keysgroupBuffer.length; i++) {
		bb.writeByte(keysgroupBuffer[i]);
	}
	bb.flip();

	return bb.toBuffer();
};

Multisignature.prototype.apply = function (trs, block, sender, cb) {
	__private.unconfirmedSignatures[sender.address] = false;

	this.scope.account.merge(sender.address, {
		multisignatures: trs.asset.multisignature.keysgroup,
		multimin: trs.asset.multisignature.min,
		multilifetime: trs.asset.multisignature.lifetime,
		blockId: block.id,
		round: modules.rounds.calc(block.height)
	}, function (err) {
		if (err) {
			return setImmediate(cb, err);
		}

		// Get public keys
		async.eachSeries(trs.asset.multisignature.keysgroup, function (transaction, cb) {
			var key = transaction.substring(1);
			var address = modules.accounts.generateAddressByPublicKey(key);

			// Create accounts
			modules.accounts.setAccountAndGet({
				address: address,
				publicKey: key
			}, function (err) {
				return setImmediate(cb, err);
			});
		}, cb);
	});
};

Multisignature.prototype.undo = function (trs, block, sender, cb) {
	var multiInvert = Diff.reverse(trs.asset.multisignature.keysgroup);

	__private.unconfirmedSignatures[sender.address] = true;

	this.scope.account.merge(sender.address, {
		multisignatures: multiInvert,
		multimin: -trs.asset.multisignature.min,
		multilifetime: -trs.asset.multisignature.lifetime,
		blockId: block.id,
		round: modules.rounds.calc(block.height)
	}, function (err) {
		return setImmediate(cb, err);
	});
};

Multisignature.prototype.applyUnconfirmed = function (trs, sender, cb) {
	if (__private.unconfirmedSignatures[sender.address]) {
		return setImmediate(cb, 'Signature on this account is pending confirmation');
	}

	__private.unconfirmedSignatures[sender.address] = true;

	this.scope.account.merge(sender.address, {
		u_multisignatures: trs.asset.multisignature.keysgroup,
		u_multimin: trs.asset.multisignature.min,
		u_multilifetime: trs.asset.multisignature.lifetime
	}, function (err) {
		return setImmediate(cb);
	});
};

Multisignature.prototype.undoUnconfirmed = function (trs, sender, cb) {
	var multiInvert = Diff.reverse(trs.asset.multisignature.keysgroup);

	__private.unconfirmedSignatures[sender.address] = false;

	this.scope.account.merge(sender.address, {
		u_multisignatures: multiInvert,
		u_multimin: -trs.asset.multisignature.min,
		u_multilifetime: -trs.asset.multisignature.lifetime
	}, function (err) {
		return setImmediate(cb, err);
	});
};

Multisignature.prototype.schema = {
	id: 'Multisignature',
	type: 'object',
	properties: {
		min: {
			type: 'integer',
			minimum: 1,
			maximum: 15
		},
		keysgroup: {
			type: 'array',
			minLength: 1,
			maxLength: 16
		},
		lifetime: {
			type: 'integer',
			minimum: 1,
			maximum: 72
		}
	},
	required: ['min', 'keysgroup', 'lifetime']
};

Multisignature.prototype.objectNormalize = function (trs) {
	var report = library.schema.validate(trs.asset.multisignature, Multisignature.prototype.schema);

	if (!report) {
		throw 'Failed to validate multisignature schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
};

Multisignature.prototype.dbRead = function (raw) {
	if (!raw.m_keysgroup) {
		return null;
	} else {
		var multisignature = {
			min: raw.m_min,
			lifetime: raw.m_lifetime,
		};

		if (typeof raw.m_keysgroup === 'string') {
			multisignature.keysgroup = raw.m_keysgroup.split(',');
		} else {
			multisignature.keysgroup = [];
		}

		return {multisignature: multisignature};
	}
};

Multisignature.prototype.dbTable = 'multisignatures';

Multisignature.prototype.dbFields = [
	'min',
	'lifetime',
	'keysgroup',
	'transactionId'
];

Multisignature.prototype.dbSave = function (trs) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			min: trs.asset.multisignature.min,
			lifetime: trs.asset.multisignature.lifetime,
			keysgroup: trs.asset.multisignature.keysgroup.join(','),
			transactionId: trs.id
		}
	};
};

Multisignature.prototype.afterSave = function (trs, cb) {
	library.network.io.sockets.emit('multisignatures/change', trs);
	return setImmediate(cb);
};

Multisignature.prototype.ready = function (trs, sender) {
	if (!Array.isArray(trs.signatures)) {
		return false;
	}

	if (!Array.isArray(sender.multisignatures) || !sender.multisignatures.length) {
		return trs.signatures.length === trs.asset.multisignature.keysgroup.length;
	} else {
		return trs.signatures.length >= sender.multimin;
	}
};

// Export
module.exports = Multisignature;

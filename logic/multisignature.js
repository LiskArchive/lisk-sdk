'use strict';

var async = require('async');
var ByteBuffer = require('bytebuffer');
var constants = require('../helpers/constants.js');
var Diff = require('../helpers/diff.js');
var exceptions = require('../helpers/exceptions.js');

// Private fields
var modules, library, __private = {};

__private.unconfirmedSignatures = {};

/**
 * Initializes library.
 * @memberof module:multisignatures
 * @class
 * @classdesc Main multisignature logic.
 * @param {ZSchema} schema
 * @param {Object} network
 * @param {Transaction} transaction
 * @param {Object} logger
 */
// Constructor
function Multisignature (schema, network, transaction, logger) {
	library = {
		schema: schema,
		network: network,
		logger: logger,
		logic: {
			transaction: transaction,
		},
	};
}

// Public methods
/**
 * Binds input parameters to private variable modules
 * @param {Rounds} rounds
 * @param {Accounts} accounts
 */
Multisignature.prototype.bind = function (rounds, accounts) {
	modules = {
		rounds: rounds,
		accounts: accounts,
	};
};

/**
 * Creates a multisignature.
 * @param {multisignature} data - Entry information: min, keysgroup, lifetime.
 * @param {transaction} trs - Transaction to add multisignature data.
 * @returns {transaction} trs with new data
 */
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

/**
 * Obtains constant fee multisignature and multiply by quantity of signatures.
 * @see {@link module:helpers~constants}
 * @param {transaction} trs
 * @param {account} sender - Unnecessary parameter.
 * @returns {number} Quantity of multisignature keysgroup * multisignature fees.
 */
Multisignature.prototype.calculateFee = function (trs, sender) {
	return (trs.asset.multisignature.keysgroup.length + 1) * constants.fees.multisignature;
};

/**
 * Verifies multisignature fields from transaction asset and sender.
 * @implements module:transactions#Transaction~verifySignature
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback|transaction} returns error string if invalid parameter |
 * trs validated.
 */
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

	if (trs.asset.multisignature.min < constants.multisigConstraints.min.minimum || trs.asset.multisignature.min > constants.multisigConstraints.min.maximum) {
		return setImmediate(cb, ['Invalid multisignature min. Must be between', constants.multisigConstraints.min.minimum,
			'and', constants.multisigConstraints.min.maximum].join(' '));
	}

	if (trs.asset.multisignature.min > trs.asset.multisignature.keysgroup.length) {
		var err = 'Invalid multisignature min. Must be less than or equal to keysgroup size';

		if (exceptions.multisignatures.indexOf(trs.id) > -1) {
			this.scope.logger.debug(err);
			this.scope.logger.debug(JSON.stringify(trs));
		} else {
			return setImmediate(cb, err);
		}
	}

	if (trs.asset.multisignature.lifetime < constants.multisigConstraints.lifetime.minimum  ||
		trs.asset.multisignature.lifetime > constants.multisigConstraints.lifetime.maximum) {
		return setImmediate(cb, ['Invalid multisignature lifetime. Must be between', constants.multisigConstraints.lifetime.minimum, 'and',
			constants.multisigConstraints.lifetime.maximum].join(' '));
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
		if (!key || typeof key !== 'string') {
			return setImmediate(cb, 'Invalid member in keysgroup');
		}

		var math = key[0];
		var publicKey = key.slice(1);

		if (math !== '+') {
			return setImmediate(cb, 'Invalid math operator in multisignature keysgroup');
		}

		try {
			var b = Buffer.from(publicKey, 'hex');
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

/**
 * Returns transaction with setImmediate.
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} Null error
 * @todo check extra parameter sender.
 */
Multisignature.prototype.process = function (trs, sender, cb) {
	return setImmediate(cb, null, trs);
};

/**
 * Returns a buffer with bytes from transaction asset information.
 * @requires bytebuffer
 * @see {@link https://github.com/dcodeIO/bytebuffer.js/wiki/API}
 * @param {transaction} trs - Uses multisignature from asset.
 * @param {boolean} skip
 * @returns {!Array} Contents as an ArrayBuffer.
 */
Multisignature.prototype.getBytes = function (trs, skip) {
	var keysgroupBuffer = Buffer.from(trs.asset.multisignature.keysgroup.join(''), 'utf8');

	var bb = new ByteBuffer(1 + 1 + keysgroupBuffer.length, true);
	bb.writeByte(trs.asset.multisignature.min);
	bb.writeByte(trs.asset.multisignature.lifetime);
	for (var i = 0; i < keysgroupBuffer.length; i++) {
		bb.writeByte(keysgroupBuffer[i]);
	}
	bb.flip();

	return bb.toBuffer();
};

/**
 * Merges transaction data into mem_accounts table.
 * Checks public keys from multisignature and creates accounts.
 * @implements module:accounts#Accounts~setAccountAndGet
 * @param {transaction} trs - Uses multisignature from asset.
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} for errors
 */
Multisignature.prototype.apply = function (trs, block, sender, cb) {
	__private.unconfirmedSignatures[sender.address] = false;

	this.scope.account.merge(sender.address, {
		multisignatures: trs.asset.multisignature.keysgroup,
		multimin: trs.asset.multisignature.min,
		multilifetime: trs.asset.multisignature.lifetime,
		blockId: block.id,
		round: modules.rounds.calc(block.height)
	}, function (mergeErr) {
		if (mergeErr) {
			return setImmediate(cb, mergeErr);
		}

		// Get public keys
		async.eachSeries(trs.asset.multisignature.keysgroup, function (transaction, cb) {
			var key = transaction.substring(1);
			var address = modules.accounts.generateAddressByPublicKey(key);

			// Create accounts
			modules.accounts.setAccountAndGet({
				address: address,
				publicKey: key
			}, function (setAccountAndGetErr) {
				return setImmediate(cb, setAccountAndGetErr);
			});
		}, cb);
	});
};

/**
 * Inverts multisignature signs and merges into sender address.
 * Stores sender address into private unconfirmedSignatures.
 * @param {transaction} trs - Uses multisignature from asset.
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} For error.
 */
Multisignature.prototype.undo = function (trs, block, sender, cb) {
	var multiInvert = Diff.reverse(trs.asset.multisignature.keysgroup);

	__private.unconfirmedSignatures[sender.address] = true;

	this.scope.account.merge(sender.address, {
		multisignatures: multiInvert,
		multimin: -trs.asset.multisignature.min,
		multilifetime: -trs.asset.multisignature.lifetime,
		blockId: block.id,
		round: modules.rounds.calc(block.height)
	}, function (mergeErr) {
		return setImmediate(cb, mergeErr);
	});
};

/**
 * Stores sender address into private unconfirmedSignatures.
 * Merges into sender address transaction asset to unconfirmed fields.
 * @param {transaction} trs - Uses multisignature from asset.
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} For error.
 */
Multisignature.prototype.applyUnconfirmed = function (trs, sender, cb) {
	if (__private.unconfirmedSignatures[sender.address]) {
		return setImmediate(cb, 'Signature on this account is pending confirmation');
	}

	__private.unconfirmedSignatures[sender.address] = true;

	this.scope.account.merge(sender.address, {
		u_multisignatures: trs.asset.multisignature.keysgroup,
		u_multimin: trs.asset.multisignature.min,
		u_multilifetime: trs.asset.multisignature.lifetime
	}, function (mergeErr) {
		return setImmediate(cb, mergeErr);
	});
};

/**
 * Turns off unconfirmedSignatures for sender address.
 * Inverts multisignature signs and merges into sender address
 * to unconfirmed fields.
 *
 * @param {transaction} trs - Uses multisignature from asset.
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} For error.
 */
Multisignature.prototype.undoUnconfirmed = function (trs, sender, cb) {
	var multiInvert = Diff.reverse(trs.asset.multisignature.keysgroup);

	__private.unconfirmedSignatures[sender.address] = false;

	this.scope.account.merge(sender.address, {
		u_multisignatures: multiInvert,
		u_multimin: -trs.asset.multisignature.min,
		u_multilifetime: -trs.asset.multisignature.lifetime
	}, function (mergeErr) {
		return setImmediate(cb, mergeErr);
	});
};

/**
 * @typedef {Object} multisignature
 * @property {number} min - From 1 to 15
 * @property {Array} keysgroup - Between 1 and 16 keys
 * @property {number} lifetime - From 1 to 72
 */
Multisignature.prototype.schema = {
	id: 'Multisignature',
	type: 'object',
	properties: {
		min: {
			type: 'integer',
			minimum: constants.multisigConstraints.min.minimum,
			maximum: constants.multisigConstraints.min.maximum
		},
		keysgroup: {
			type: 'array',
			minItems: constants.multisigConstraints.keysgroup.minItems,
			maxItems: constants.multisigConstraints.keysgroup.maxItems
		},
		lifetime: {
			type: 'integer',
			minimum: constants.multisigConstraints.lifetime.minimum,
			maximum: constants.multisigConstraints.lifetime.maximum
		}
	},
	required: ['min', 'keysgroup', 'lifetime']
};

/**
 * Validates multisignature schema.
 * @param {transaction} trs - Uses multisignature from asset.
 * @return {transaction} Transaction validated.
 * @throws {string} Error message.
 */
Multisignature.prototype.objectNormalize = function (trs) {
	var report = library.schema.validate(trs.asset.multisignature, Multisignature.prototype.schema);

	if (!report) {
		throw 'Failed to validate multisignature schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
};

/**
 * Creates multisignature object based on raw data.
 * @param {Object} raw - Data from database.
 * @return {multisignature} multisignature Object.
 * @todo check if this function is called.
 */
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

/**
 * Creates database Object based on trs data.
 * @param {transaction} trs - Contains multisignature object.
 * @returns {Object} {table:multisignatures, values: multisignature and transaction id}.
 * @todo check if this function is called.
 */
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

/**
 * Emits a 'multisignatures/change' socket signal with transaction info.
 * @param {transaction} trs
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
Multisignature.prototype.afterSave = function (trs, cb) {
	library.network.io.sockets.emit('multisignatures/change', trs);
	return setImmediate(cb);
};

/**
 * Evaluates transaction signatures and sender multisignatures.
 * @param {transaction} trs - signatures.
 * @param {account} sender
 * @return {boolean} logic based on trs signatures and sender multisignatures.
 */
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

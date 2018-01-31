/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var async = require('async');
var ByteBuffer = require('bytebuffer');
var constants = require('../helpers/constants.js');
var Diff = require('../helpers/diff.js');
var exceptions = require('../helpers/exceptions.js');
var slots = require('../helpers/slots.js');

// Private fields
var modules;
var library;
var __private = {};

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
function Multisignature(schema, network, transaction, account, logger) {
	library = {
		schema: schema,
		network: network,
		logger: logger,
		logic: {
			transaction: transaction,
			account: account,
		},
	};
}

// Public methods
/**
 * Binds input parameters to private variable modules
 * @param {Accounts} accounts
 */
Multisignature.prototype.bind = function(accounts) {
	modules = {
		accounts: accounts,
	};
};

/**
 * Obtains constant fee multisignature and multiply by quantity of signatures.
 * @see {@link module:helpers~constants}
 * @param {transaction} transaction
 * @returns {number} Quantity of multisignature keysgroup * multisignature fees.
 */
Multisignature.prototype.calculateFee = function(transaction) {
	return (
		(transaction.asset.multisignature.keysgroup.length + 1) *
		constants.fees.multisignature
	);
};

/**
 * Verifies multisignature fields from transaction asset and sender.
 * @implements module:transactions#Transaction~verifySignature
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback|transaction} returns error string if invalid parameter |
 * transaction validated.
 */
Multisignature.prototype.verify = function(transaction, sender, cb) {
	if (!transaction.asset || !transaction.asset.multisignature) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (!Array.isArray(transaction.asset.multisignature.keysgroup)) {
		return setImmediate(
			cb,
			'Invalid multisignature keysgroup. Must be an array'
		);
	}

	if (transaction.asset.multisignature.keysgroup.length === 0) {
		return setImmediate(
			cb,
			'Invalid multisignature keysgroup. Must not be empty'
		);
	}

	if (
		transaction.asset.multisignature.min <
			constants.multisigConstraints.min.minimum ||
		transaction.asset.multisignature.min >
			constants.multisigConstraints.min.maximum
	) {
		return setImmediate(
			cb,
			[
				'Invalid multisignature min. Must be between',
				constants.multisigConstraints.min.minimum,
				'and',
				constants.multisigConstraints.min.maximum,
			].join(' ')
		);
	}

	if (
		transaction.asset.multisignature.min >
		transaction.asset.multisignature.keysgroup.length
	) {
		var err =
			'Invalid multisignature min. Must be less than or equal to keysgroup size';

		if (exceptions.multisignatures.indexOf(transaction.id) > -1) {
			library.logger.debug(err);
			library.logger.debug(JSON.stringify(transaction));
		} else {
			return setImmediate(cb, err);
		}
	}

	if (
		transaction.asset.multisignature.lifetime <
			constants.multisigConstraints.lifetime.minimum ||
		transaction.asset.multisignature.lifetime >
			constants.multisigConstraints.lifetime.maximum
	) {
		return setImmediate(
			cb,
			[
				'Invalid multisignature lifetime. Must be between',
				constants.multisigConstraints.lifetime.minimum,
				'and',
				constants.multisigConstraints.lifetime.maximum,
			].join(' ')
		);
	}

	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		return setImmediate(cb, 'Account already has multisignatures enabled');
	}

	if (this.ready(transaction, sender)) {
		try {
			for (
				var s = 0;
				s < transaction.asset.multisignature.keysgroup.length;
				s++
			) {
				var valid = false;

				if (transaction.signatures) {
					for (var d = 0; d < transaction.signatures.length && !valid; d++) {
						if (
							transaction.asset.multisignature.keysgroup[s][0] !== '-' &&
							transaction.asset.multisignature.keysgroup[s][0] !== '+'
						) {
							valid = false;
						} else {
							valid = library.logic.transaction.verifySignature(
								transaction,
								transaction.asset.multisignature.keysgroup[s].substring(1),
								transaction.signatures[d]
							);
						}
					}
				}

				if (!valid) {
					return setImmediate(
						cb,
						'Failed to verify signature in multisignature keysgroup'
					);
				}
			}
		} catch (e) {
			library.logger.error(e.stack);
			return setImmediate(
				cb,
				'Failed to verify signature in multisignature keysgroup'
			);
		}
	}

	if (
		transaction.asset.multisignature.keysgroup.indexOf(
			`+${sender.publicKey}`
		) !== -1
	) {
		return setImmediate(
			cb,
			'Invalid multisignature keysgroup. Can not contain sender'
		);
	}

	async.eachSeries(
		transaction.asset.multisignature.keysgroup,
		(key, cb) => {
			if (!key || typeof key !== 'string') {
				return setImmediate(cb, 'Invalid member in keysgroup');
			}

			var math = key[0];
			var publicKey = key.slice(1);

			if (math !== '+') {
				return setImmediate(
					cb,
					'Invalid math operator in multisignature keysgroup'
				);
			}

			try {
				var b = Buffer.from(publicKey, 'hex');
				if (b.length !== 32) {
					return setImmediate(
						cb,
						'Invalid public key in multisignature keysgroup'
					);
				}
			} catch (e) {
				library.logger.trace(e.stack);
				return setImmediate(
					cb,
					'Invalid public key in multisignature keysgroup'
				);
			}

			return setImmediate(cb);
		},
		err => {
			if (err) {
				return setImmediate(cb, err);
			}

			var keysgroup = transaction.asset.multisignature.keysgroup.reduce(
				(p, c) => {
					if (p.indexOf(c) < 0) {
						p.push(c);
					}
					return p;
				},
				[]
			);

			if (
				keysgroup.length !== transaction.asset.multisignature.keysgroup.length
			) {
				return setImmediate(
					cb,
					'Encountered duplicate public key in multisignature keysgroup'
				);
			}

			return setImmediate(cb, null, transaction);
		}
	);
};

/**
 * Returns transaction with setImmediate.
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} Null error
 * @todo check extra parameter sender.
 */
Multisignature.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Returns a buffer with bytes from transaction asset information.
 * @requires bytebuffer
 * @see {@link https://github.com/dcodeIO/bytebuffer.js/wiki/API}
 * @param {transaction} transaction - Uses multisignature from asset.
 * @returns {!Array} Contents as an ArrayBuffer.
 */
Multisignature.prototype.getBytes = function(transaction) {
	var keysgroupBuffer = Buffer.from(
		transaction.asset.multisignature.keysgroup.join(''),
		'utf8'
	);

	var bb = new ByteBuffer(1 + 1 + keysgroupBuffer.length, true);
	bb.writeByte(transaction.asset.multisignature.min);
	bb.writeByte(transaction.asset.multisignature.lifetime);
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
 * @param {transaction} transaction - Uses multisignature from asset.
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} for errors
 */
Multisignature.prototype.apply = function(transaction, block, sender, cb, tx) {
	__private.unconfirmedSignatures[sender.address] = false;

	library.logic.account.merge(
		sender.address,
		{
			multisignatures: transaction.asset.multisignature.keysgroup,
			multimin: transaction.asset.multisignature.min,
			multilifetime: transaction.asset.multisignature.lifetime,
			blockId: block.id,
			round: slots.calcRound(block.height),
		},
		err => {
			if (err) {
				return setImmediate(cb, err);
			}

			// Get public keys
			async.eachSeries(
				transaction.asset.multisignature.keysgroup,
				(transaction, cb) => {
					var key = transaction.substring(1);
					var address = modules.accounts.generateAddressByPublicKey(key);

					// Create accounts
					modules.accounts.setAccountAndGet(
						{
							address: address,
							publicKey: key,
						},
						err => setImmediate(cb, err),
						tx
					);
				},
				cb
			);
		},
		tx
	);
};

/**
 * Inverts multisignature signs and merges into sender address.
 * Stores sender address into private unconfirmedSignatures.
 * @param {transaction} transaction - Uses multisignature from asset.
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} For error.
 */
Multisignature.prototype.undo = function(transaction, block, sender, cb) {
	var multiInvert = Diff.reverse(transaction.asset.multisignature.keysgroup);

	__private.unconfirmedSignatures[sender.address] = true;

	library.logic.account.merge(
		sender.address,
		{
			multisignatures: multiInvert,
			multimin: -transaction.asset.multisignature.min,
			multilifetime: -transaction.asset.multisignature.lifetime,
			blockId: block.id,
			round: slots.calcRound(block.height),
		},
		err => setImmediate(cb, err)
	);
};

/**
 * Stores sender address into private unconfirmedSignatures.
 * Merges into sender address transaction asset to unconfirmed fields.
 * @param {transaction} transaction - Uses multisignature from asset.
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} For error.
 */
Multisignature.prototype.applyUnconfirmed = function(
	transaction,
	sender,
	cb,
	tx
) {
	if (__private.unconfirmedSignatures[sender.address]) {
		return setImmediate(
			cb,
			'Signature on this account is pending confirmation'
		);
	}

	__private.unconfirmedSignatures[sender.address] = true;

	library.logic.account.merge(
		sender.address,
		{
			u_multisignatures: transaction.asset.multisignature.keysgroup,
			u_multimin: transaction.asset.multisignature.min,
			u_multilifetime: transaction.asset.multisignature.lifetime,
		},
		err => setImmediate(cb, err),
		tx
	);
};

/**
 * Turns off unconfirmedSignatures for sender address.
 * Inverts multisignature signs and merges into sender address
 * to unconfirmed fields.
 *
 * @param {transaction} transaction - Uses multisignature from asset.
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} For error.
 */
Multisignature.prototype.undoUnconfirmed = function(
	transaction,
	sender,
	cb,
	tx
) {
	var multiInvert = Diff.reverse(transaction.asset.multisignature.keysgroup);

	__private.unconfirmedSignatures[sender.address] = false;

	library.logic.account.merge(
		sender.address,
		{
			u_multisignatures: multiInvert,
			u_multimin: -transaction.asset.multisignature.min,
			u_multilifetime: -transaction.asset.multisignature.lifetime,
		},
		err => setImmediate(cb, err),
		tx
	);
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
			maximum: constants.multisigConstraints.min.maximum,
		},
		keysgroup: {
			type: 'array',
			minItems: constants.multisigConstraints.keysgroup.minItems,
			maxItems: constants.multisigConstraints.keysgroup.maxItems,
		},
		lifetime: {
			type: 'integer',
			minimum: constants.multisigConstraints.lifetime.minimum,
			maximum: constants.multisigConstraints.lifetime.maximum,
		},
	},
	required: ['min', 'keysgroup', 'lifetime'],
};

/**
 * Validates multisignature schema.
 * @param {transaction} transaction - Uses multisignature from asset.
 * @return {transaction} Transaction validated.
 * @throws {string} Error message.
 */
Multisignature.prototype.objectNormalize = function(transaction) {
	var report = library.schema.validate(
		transaction.asset.multisignature,
		Multisignature.prototype.schema
	);

	if (!report) {
		throw `Failed to validate multisignature schema: ${library.schema
			.getLastErrors()
			.map(err => err.message)
			.join(', ')}`;
	}

	return transaction;
};

/**
 * Creates multisignature object based on raw data.
 * @param {Object} raw - Data from database.
 * @return {multisignature} multisignature Object.
 * @todo check if this function is called.
 */
Multisignature.prototype.dbRead = function(raw) {
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

		return { multisignature: multisignature };
	}
};

/**
 * Emits a 'multisignatures/change' socket signal with transaction info.
 * @param {transaction} transaction
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
Multisignature.prototype.afterSave = function(transaction, cb) {
	library.network.io.sockets.emit('multisignatures/change', transaction);
	return setImmediate(cb);
};

/**
 * Evaluates transaction signatures and sender multisignatures.
 * @param {transaction} transaction - signatures.
 * @param {account} sender
 * @return {boolean} logic based on transaction signatures and sender multisignatures.
 */
Multisignature.prototype.ready = function(transaction, sender) {
	if (!Array.isArray(transaction.signatures)) {
		return false;
	}

	if (
		!Array.isArray(sender.multisignatures) ||
		!sender.multisignatures.length
	) {
		return (
			transaction.signatures.length ===
			transaction.asset.multisignature.keysgroup.length
		);
	} else {
		return transaction.signatures.length >= sender.multimin;
	}
};

// Export
module.exports = Multisignature;

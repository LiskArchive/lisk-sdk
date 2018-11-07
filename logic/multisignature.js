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

const async = require('async');
const ByteBuffer = require('bytebuffer');
const ed = require('../helpers/ed.js');
const Diff = require('../helpers/diff.js');
const slots = require('../helpers/slots.js');
const Bignum = require('../helpers/bignum.js');

let modules;
let library;
const exceptions = global.exceptions;
const { FEES, MULTISIG_CONSTRAINTS } = global.constants;
const __private = {};

__private.unconfirmedSignatures = {};

/**
 * Main multisignature logic. Initializes library.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires async
 * @requires bytebuffer
 * @requires helpers/diff
 * @requires helpers/slots
 * @param {ZSchema} schema
 * @param {Object} network
 * @param {Transaction} transaction
 * @param {Object} logger
 * @todo Add description for the params
 */
class Multisignature {
	constructor(schema, network, transaction, account, logger) {
		library = {
			schema,
			network,
			logger,
			logic: {
				transaction,
				account,
			},
		};
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * Binds input parameters to private variable modules.
 *
 * @param {Accounts} accounts
 * @todo Add description for the params
 */
Multisignature.prototype.bind = function(accounts) {
	modules = {
		accounts,
	};
};

/**
 * Obtains constant fee multisignature and multiply by quantity of signatures.
 *
 * @param {transaction} transaction
 * @returns {Bignumber} Quantity of multisignature keysgroup * multisignature fees
 * @todo Add description for the params
 */
Multisignature.prototype.calculateFee = function(transaction) {
	const keys = transaction.asset.multisignature.keysgroup.length + 1;
	const amount = new Bignum(FEES.MULTISIGNATURE);
	return amount.multipliedBy(keys);
};

/**
 * Verifies multisignature fields from transaction asset and sender.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error, transaction
 * @todo Add description for the params
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
		transaction.asset.multisignature.min < MULTISIG_CONSTRAINTS.MIN.MINIMUM ||
		transaction.asset.multisignature.min > MULTISIG_CONSTRAINTS.MIN.MAXIMUM
	) {
		return setImmediate(
			cb,
			[
				'Invalid multisignature min. Must be between',
				MULTISIG_CONSTRAINTS.MIN.MINIMUM,
				'and',
				MULTISIG_CONSTRAINTS.MIN.MAXIMUM,
			].join(' ')
		);
	}

	if (
		transaction.asset.multisignature.min >
		transaction.asset.multisignature.keysgroup.length
	) {
		const err =
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
			MULTISIG_CONSTRAINTS.LIFETIME.MINIMUM ||
		transaction.asset.multisignature.lifetime >
			MULTISIG_CONSTRAINTS.LIFETIME.MAXIMUM
	) {
		return setImmediate(
			cb,
			[
				'Invalid multisignature lifetime. Must be between',
				MULTISIG_CONSTRAINTS.LIFETIME.MINIMUM,
				'and',
				MULTISIG_CONSTRAINTS.LIFETIME.MAXIMUM,
			].join(' ')
		);
	}

	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		return setImmediate(cb, 'Account already has multisignatures enabled');
	}

	if (this.ready(transaction, sender)) {
		try {
			for (
				let s = 0;
				s < transaction.asset.multisignature.keysgroup.length;
				s++
			) {
				let valid = false;

				if (transaction.signatures) {
					for (let d = 0; d < transaction.signatures.length && !valid; d++) {
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

			const math = key[0];
			const publicKey = key.slice(1);

			if (math !== '+') {
				return setImmediate(
					cb,
					'Invalid math operator in multisignature keysgroup'
				);
			}

			try {
				const b = ed.hexToBuffer(publicKey);
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

			const keysgroup = transaction.asset.multisignature.keysgroup.reduce(
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
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} null
 * @todo Check extra parameter sender
 * @todo Add description for the params
 */
Multisignature.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Returns a buffer with bytes from transaction asset information.
 *
 * @requires bytebuffer
 * @see {@link https://github.com/dcodeIO/bytebuffer.js/wiki/API}
 * @param {transaction} transaction - Uses multisignature from asset
 * @returns {!Array} Contents as an ArrayBuffer
 */
Multisignature.prototype.getBytes = function(transaction) {
	const keysgroupBuffer = Buffer.from(
		transaction.asset.multisignature.keysgroup.join(''),
		'utf8'
	);

	const byteBuffer = new ByteBuffer(1 + 1 + keysgroupBuffer.length, true);
	byteBuffer.writeByte(transaction.asset.multisignature.min);
	byteBuffer.writeByte(transaction.asset.multisignature.lifetime);
	for (let i = 0; i < keysgroupBuffer.length; i++) {
		byteBuffer.writeByte(keysgroupBuffer[i]);
	}
	byteBuffer.flip();

	return byteBuffer.toBuffer();
};

/**
 * Merges transaction data into mem_accounts table.
 * Checks public keys from multisignature and creates accounts.
 *
 * @param {transaction} transaction - Uses multisignature from asset
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
Multisignature.prototype.applyConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	__private.unconfirmedSignatures[sender.address] = false;

	library.logic.account.merge(
		sender.address,
		{
			multisignatures: transaction.asset.multisignature.keysgroup,
			multimin: transaction.asset.multisignature.min,
			multilifetime: transaction.asset.multisignature.lifetime,
			round: slots.calcRound(block.height),
		},
		mergeErr => {
			if (mergeErr) {
				return setImmediate(cb, mergeErr);
			}

			// Get public keys
			async.eachSeries(
				transaction.asset.multisignature.keysgroup,
				(transaction, cb) => {
					const key = transaction.substring(1);
					const address = modules.accounts.generateAddressByPublicKey(key);

					// Create accounts
					modules.accounts.setAccountAndGet(
						{
							address,
							publicKey: key,
						},
						setAccountAndGetErr => setImmediate(cb, setAccountAndGetErr),
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
 *
 * @param {transaction} transaction - Uses multisignature from asset
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
Multisignature.prototype.undoConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	const multiInvert = Diff.reverse(transaction.asset.multisignature.keysgroup);

	__private.unconfirmedSignatures[sender.address] = true;

	library.logic.account.merge(
		sender.address,
		{
			multisignatures: multiInvert,
			multimin: -transaction.asset.multisignature.min,
			multilifetime: -transaction.asset.multisignature.lifetime,
			round: slots.calcRound(block.height),
		},
		mergeErr => setImmediate(cb, mergeErr),
		tx
	);
};

/**
 * Stores sender address into private unconfirmedSignatures.
 * Merges into sender address transaction asset to unconfirmed fields.
 *
 * @param {transaction} transaction - Uses multisignature from asset
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
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
		mergeErr => setImmediate(cb, mergeErr),
		tx
	);
};

/**
 * Turns off unconfirmedSignatures for sender address.
 * Inverts multisignature signs and merges into sender address
 * to unconfirmed fields.
 *
 * @param {transaction} transaction - Uses multisignature from asset
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
Multisignature.prototype.undoUnconfirmed = function(
	transaction,
	sender,
	cb,
	tx
) {
	const multiInvert = Diff.reverse(transaction.asset.multisignature.keysgroup);

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
			minimum: MULTISIG_CONSTRAINTS.MIN.MINIMUM,
			maximum: MULTISIG_CONSTRAINTS.MIN.MAXIMUM,
		},
		keysgroup: {
			type: 'array',
			minItems: MULTISIG_CONSTRAINTS.KEYSGROUP.MIN_ITEMS,
			maxItems: MULTISIG_CONSTRAINTS.KEYSGROUP.MAX_ITEMS,
		},
		lifetime: {
			type: 'integer',
			minimum: MULTISIG_CONSTRAINTS.LIFETIME.MINIMUM,
			maximum: MULTISIG_CONSTRAINTS.LIFETIME.MAXIMUM,
		},
	},
	required: ['min', 'keysgroup', 'lifetime'],
};

/**
 * Validates multisignature schema.
 *
 * @param {transaction} transaction - Uses multisignature from asset
 * @throws {string}
 * @returns {transaction} Validated transaction
 */
Multisignature.prototype.objectNormalize = function(transaction) {
	const report = library.schema.validate(
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
 *
 * @param {Object} raw - Data from database
 * @returns {multisignature} Multisignature object
 * @todo Check if this function is called
 */
Multisignature.prototype.dbRead = function(raw) {
	if (!raw.m_keysgroup) {
		return null;
	}
	const multisignature = {
		min: raw.m_min,
		lifetime: raw.m_lifetime,
	};

	if (typeof raw.m_keysgroup === 'string') {
		multisignature.keysgroup = raw.m_keysgroup.split(',');
	} else {
		multisignature.keysgroup = [];
	}

	return { multisignature };
};

/**
 * Emits a 'multisignatures/change' socket signal with transaction info.
 *
 * @param {transaction} transaction
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the params
 */
Multisignature.prototype.afterSave = function(transaction, cb) {
	library.network.io.sockets.emit('multisignatures/change', transaction);
	return setImmediate(cb);
};

/**
 * Evaluates transaction signatures and sender multisignatures.
 *
 * @param {transaction} transaction - Signatures
 * @param {account} sender
 * @returns {boolean} true - If transaction is deemed ready
 * @todo Add description for the params
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
	}
	return transaction.signatures.length >= sender.multimin;
};

module.exports = Multisignature;

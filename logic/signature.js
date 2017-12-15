'use strict';

var ByteBuffer = require('bytebuffer');
var constants = require('../helpers/constants.js');

// Private fields
var modules, library;

/**
 * Initializes library.
 * @memberof module:signatures
 * @class
 * @classdesc Main signature logic.
 * @param {ZSchema} schema
 * @param {Object} logger
 */
// Constructor
function Signature (schema, logger) {
	library ={
		schema: schema,
		logger: logger,
	};
}

/**
 * Binds input parameters to private variable modules
 * @param {Accounts} accounts
 */
Signature.prototype.bind = function (accounts) {
	modules = {
		accounts: accounts,
	};
};

/**
 * Obtains constant fee secondSignature.
 * @see {@link module:helpers~constants}
 * @param {transaction} transaction - Unnecessary parameter.
 * @param {account} sender - Unnecessary parameter.
 * @returns {number} Secondsignature fee.
 */
Signature.prototype.calculateFee = function (transaction, sender) {
	return constants.fees.secondSignature;
};

/**
 * Verifies signature fields from transaction asset and sender.
 * @implements module:transactions#Transaction~verifySignature
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback|transaction} returns error string if invalid parameter |
 * transaction validated.
 */
Signature.prototype.verify = function (transaction, sender, cb) {
	if (!transaction.asset || !transaction.asset.signature) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (transaction.amount !== 0) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	try {
		if (!transaction.asset.signature.publicKey || Buffer.from(transaction.asset.signature.publicKey, 'hex').length !== 32) {
			return setImmediate(cb, 'Invalid public key');
		}
	} catch (e) {
		library.logger.error(e.stack);
		return setImmediate(cb, 'Invalid public key');
	}

	return setImmediate(cb, null, transaction);
};

/**
 * Returns transaction with setImmediate.
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} Null error
 * @todo check extra parameter sender.
 */
Signature.prototype.process = function (transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Returns a buffer with bytes from transaction asset information.
 * @requires bytebuffer
 * @see {@link https://github.com/dcodeIO/bytebuffer.js/wiki/API}
 * @param {transaction} transaction - Uses multisignature from asset.
 * @returns {!Array} Contents as an ArrayBuffer.
 * @throws {error} If buffer fails.
 * @todo check if this function is called.
 */
Signature.prototype.getBytes = function (transaction) {
	var bb;

	try {
		bb = new ByteBuffer(32, true);
		var publicKeyBuffer = Buffer.from(transaction.asset.signature.publicKey, 'hex');

		for (var i = 0; i < publicKeyBuffer.length; i++) {
			bb.writeByte(publicKeyBuffer[i]);
		}

		bb.flip();
	} catch (e) {
		throw e;
	}
	return bb.toBuffer();
};

/**
 * @typedef signature
 * @property {publicKey} publicKey
 */
Signature.prototype.schema = {
	id: 'Signature',
	type: 'object',
	properties: {
		publicKey: {
			type: 'string',
			format: 'publicKey'
		}
	},
	required: ['publicKey']
};

/**
 * Validates signature schema.
 * @param {transaction} transaction - Uses signature from asset.
 * @return {transaction} Transaction validated.
 * @throws {string} Error message.
 */
Signature.prototype.objectNormalize = function (transaction) {
	var report = library.schema.validate(transaction.asset.signature, Signature.prototype.schema);

	if (!report) {
		throw 'Failed to validate signature schema: ' + library.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return transaction;
};

/**
 * Creates signature object based on raw data.
 * @param {Object} raw - Data from database.
 * @return {multisignature} signature Object with transaction id.
 * @todo check if this function is called.
 */
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

Signature.prototype.dbTable = 'second_signature';

Signature.prototype.dbFields = [
	'transaction_id',
	'second_public_key',
	'public_key'
];

/**
 * Creates database Object based on transaction data.
 * @param {transaction} transaction - Contains signature object.
 * @returns {Object} {table:signatures, values: publicKey and transaction id}.
 * @todo check if this function is called.
 */
Signature.prototype.dbSave = function (transaction) {
	var publicKey;
	var secondPublicKey;
	
	try {
		publicKey = Buffer.from(transaction.senderPublicKey, 'hex');
		secondPublicKey = Buffer.from(transaction.asset.signature.publicKey, 'hex');
	} catch (e) {
		throw e;
	}
	
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			transaction_id: transaction.id,
			second_public_key: secondPublicKey,
			public_key: publicKey
		}
	};
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 * @param {transaction} transaction
 * @param {account} sender
 * @return {boolean} True if transaction signatures greather than sender multimin, or there are no sender multisignatures.
 */
Signature.prototype.ready = function (transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	} else {
		return true;
	}
};

// Export
module.exports = Signature;

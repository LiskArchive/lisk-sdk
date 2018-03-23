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

const apiCodes = require('../helpers/api_codes.js');
const ApiError = require('../helpers/api_error.js');
const Signature = require('../logic/signature.js');
const transactionTypes = require('../helpers/transaction_types.js');

// Private fields
let modules;
let library;
let self;
const __private = {};

__private.assetTypes = {};

/**
 * Main signatures methods. Initializes library with scope content and generates a Signature instance.
 * Calls logic.transaction.attachAssetType().
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires helpers/api_codes
 * @requires helpers/api_error
 * @requires helpers/transaction_types
 * @requires logic/signature
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
class Signatures {
	constructor(cb, scope) {
		library = {
			schema: scope.schema,
			ed: scope.ed,
			balancesSequence: scope.balancesSequence,
			logic: {
				transaction: scope.logic.transaction,
			},
		};
		self = this;

		__private.assetTypes[
			transactionTypes.SIGNATURE
		] = library.logic.transaction.attachAssetType(
			transactionTypes.SIGNATURE,
			new Signature(scope.schema, scope.logger)
		);

		setImmediate(cb, null, self);
	}
}

// Public methods
/**
 * Checks if `modules` is loaded.
 *
 * @returns {boolean} True if `modules` is loaded
 */
Signatures.prototype.isLoaded = function() {
	return !!modules;
};

// Events
/**
 * Calls Signature.bind() with modules params.
 *
 * @param {modules} scope - Loaded modules
 */
Signatures.prototype.onBind = function(scope) {
	modules = {
		accounts: scope.accounts,
		transactions: scope.transactions,
		transport: scope.transport,
	};

	__private.assetTypes[transactionTypes.SIGNATURE].bind(scope.accounts);
};

__private.processPostResult = function(err, res, cb) {
	let error = null;
	let response = null;

	// TODO: Need to improve error handling so that we don't
	// need to parse the error message to determine the error type.
	const processingError = /^Error processing signature/;
	const badRequestBodyError = /^Invalid signature body/;

	if (err) {
		error = new ApiError(err, apiCodes.PROCESSING_ERROR);
	} else if (res.success) {
		response = { status: 'Signature Accepted' };
	} else if (processingError.test(res.message)) {
		error = new ApiError(res.message, apiCodes.PROCESSING_ERROR);
	} else if (badRequestBodyError.test(res.message)) {
		error = new ApiError(res.message, apiCodes.BAD_REQUEST);
	} else {
		error = new ApiError(res.message, apiCodes.INTERNAL_SERVER_ERROR);
	}
	return setImmediate(cb, error, response);
};

// Shared API
/**
 * Public methods, accessible via API.
 *
 * @property {function} postSignature - Post signature for transaction
 * @property {function} postSignatures - Post signatures for transactions
 */
Signatures.prototype.shared = {
	/**
	 * Post signature for a transaction.
	 *
	 * @param {Object.<{transactionId: string, publicKey: string, signature: string}>} - Signature
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 */
	postSignature(signature, cb) {
		return modules.transport.shared.postSignature({ signature }, (err, res) => {
			__private.processPostResult(err, res, cb);
		});
	},

	/**
	 * Post signatures for transactions.
	 *
	 * @param {Array.<{transactionId: string, publicKey: string, signature: string}>} signatures - Array of signatures
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 */
	postSignatures(signatures, cb) {
		return modules.transport.shared.postSignatures(
			{ signatures },
			(err, res) => {
				__private.processPostResult(err, res, cb);
			}
		);
	},
};

// Export
module.exports = Signatures;

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

var apiCodes = require('../helpers/api_codes.js');
var ApiError = require('../helpers/api_error.js');
var Signature = require('../logic/signature.js');
var transactionTypes = require('../helpers/transaction_types.js');

// Private fields
var modules;
var library;
var self;
var __private = {};

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
 * @returns {setImmediateCallback} Callback function with `self` as data
 */
function Signatures(cb, scope) {
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

/**
 * Public methods, accessible via API.
 *
 * @property {function} postSignatures - Post signatures for transactions
 */
Signatures.prototype.shared = {
	/**
	 * Post signatures for transactions.
	 *
	 * @param {Array.<{transactionId: string, publicKey: string, signature: string}>} signatures - Array of signatures
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback}
	 * @todo Add description for the return value
	 */
	postSignatures(signatures, cb) {
		return modules.transport.shared.postSignatures(
			{ signatures },
			(err, res) => {
				var processingError = /(error|processing)/gi;
				var badRequestBodyError = /(invalid|signature)/gi;

				if (res.success === false) {
					if (processingError.exec(res.message).length === 2) {
						return setImmediate(
							cb,
							new ApiError(res.message, apiCodes.PROCESSING_ERROR)
						);
					} else if (badRequestBodyError.exec(res.message).length === 2) {
						return setImmediate(
							cb,
							new ApiError(res.message, apiCodes.BAD_REQUEST)
						);
					}
					return setImmediate(
						cb,
						new ApiError(res.message, apiCodes.INTERNAL_SERVER_ERROR)
					);
				}
				return setImmediate(cb, null, { status: 'Signature Accepted' });
			}
		);
	},
};

// Export
module.exports = Signatures;

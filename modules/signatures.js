'use strict';

var apiCodes = require('../helpers/apiCodes.js');
var ApiError = require('../helpers/apiError.js');
var Signature = require('../logic/signature.js');
var transactionTypes = require('../helpers/transactionTypes.js');
var _ = require('lodash');

// Private fields
var modules, library, self, __private = {};

__private.assetTypes = {};

/**
 * Initializes library with scope content and generates a Signature instance.
 * Calls logic.transaction.attachAssetType().
 * @memberof module:signatures
 * @class
 * @classdesc Main signatures methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Signatures (cb, scope) {
	library = {
		schema: scope.schema,
		ed: scope.ed,
		balancesSequence: scope.balancesSequence,
		logic: {
			transaction: scope.logic.transaction
		}
	};
	self = this;

	__private.assetTypes[transactionTypes.SIGNATURE] = library.logic.transaction.attachAssetType(
		transactionTypes.SIGNATURE,
		new Signature(
			scope.schema,
			scope.logger
		)
	);

	setImmediate(cb, null, self);
}

// Public methods
/**
 * Checks if `modules` is loaded.
 * @return {boolean} True if `modules` is loaded.
 */
Signatures.prototype.isLoaded = function () {
	return !!modules;
};

// Events
/**
 * Calls Signature.bind() with modules params.
 * @implements module:signatures#Signature~bind
 * @param {modules} scope - Loaded modules.
 */
Signatures.prototype.onBind = function (scope) {
	modules = {
		accounts: scope.accounts,
		transactions: scope.transactions,
		transport: scope.transport
	};

	__private.assetTypes[transactionTypes.SIGNATURE].bind(
		scope.accounts
	);
};

// Shared API
/**
 * Public methods, accessible via API
 */
Signatures.prototype.shared = {

	/**
	 * Post signatures for transactions
	 *
	 * @param {Array.<{transactionId: string, publicKey: string, signature: string}>} signatures - Array of signatures
	 * @param {function} cb - Callback function
	 * @return {setImmediateCallback}
	 */
	postSignatures: function (signatures, cb) {
		var modifiedSignatures = _.map(signatures, function (signature) {
			signature.transaction = signature.transactionId;
			delete signature.transactionId;
			return signature;
		});

		return modules.transport.shared.postSignatures({signatures: modifiedSignatures}, function (err, res) {
			var processingError = /(error|processing)/ig;
			var badRequestBodyError = /(invalid|signature)/ig;

			if (res.success === false) {
				if (processingError.exec(res.message).length === 2) {
					return setImmediate(cb, new ApiError(res.message, apiCodes.PROCESSING_ERROR));
				} else if(badRequestBodyError.exec(res.message).length === 2) {
					return setImmediate(cb, new ApiError(res.message, apiCodes.BAD_REQUEST));
				} else {
					return setImmediate(cb, new ApiError(res.message, apiCodes.INTERNAL_SERVER_ERROR));
				}
			} else {
				return setImmediate(cb, null, {status: 'Signature Accepted'});
			}
		});
	}
};

// Export
module.exports = Signatures;

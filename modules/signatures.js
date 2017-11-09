'use strict';

var apiCodes = require('../helpers/apiCodes.js');
var ApiError = require('../helpers/apiError.js');
var Signature = require('../logic/signature.js');
var transactionTypes = require('../helpers/transactionTypes.js');

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
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Signatures.prototype.shared = {
	postSignatures: function (req, cb) {
		return modules.transport.shared.postSignatures(req.body, function (err, res) {
			if (res.success === false) {
				var errorCode = res.message === 'Invalid signatures body' ? apiCodes.BAD_REQUEST : apiCodes.INTERNAL_SERVER_ERROR;
				return setImmediate(cb, new ApiError(res.message, errorCode));
			} else {
				return setImmediate(cb, null, {status: 'Signature Accepted'});
			}
		});
	}
};

// Export
module.exports = Signatures;

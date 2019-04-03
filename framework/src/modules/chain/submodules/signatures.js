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

const Signature = require('../logic/signature');

const { TRANSACTION_TYPES } = global.constants;

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
			TRANSACTION_TYPES.SIGNATURE
		] = library.logic.transaction.attachAssetType(
			TRANSACTION_TYPES.SIGNATURE,
			new Signature({
				components: {
					logger: scope.components.logger,
				},
				schema: scope.schema,
			})
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
		accounts: scope.modules.accounts,
		transactions: scope.modules.transactions,
		transport: scope.modules.transport,
	};

	__private.assetTypes[TRANSACTION_TYPES.SIGNATURE].bind(
		scope.modules.accounts
	);
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
		return modules.transport.shared.postSignature({ signature }, (err, res) =>
			setImmediate(cb, err, res)
		);
	},

	/**
	 * Post signatures for transactions.
	 *
	 * @param {Array.<{transactionId: string, publicKey: string, signature: string}>} signatures - Array of signatures
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 */
	postSignatures(signatures, cb) {
		return modules.transport.shared.postSignatures({ signatures }, (err, res) =>
			setImmediate(cb, err, res)
		);
	},
};

// Export
module.exports = Signatures;

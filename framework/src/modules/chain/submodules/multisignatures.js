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

const {
	Status: TransactionStatus,
	TransactionError,
} = require('@liskhq/lisk-transactions');

// Private fields
let modules;
let library;
let self;

/**
 * Main multisignatures methods. Initializes library with scope content and generates a Multisignature instance.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires logic/multisignature
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
class Multisignatures {
	constructor(cb, scope) {
		library = {
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			schema: scope.schema,
			bus: scope.bus,
			balancesSequence: scope.balancesSequence,
			logic: {
				account: scope.logic.account,
			},
		};
		self = this;

		setImmediate(cb, null, self);
	}

	/**
	 * Main function for processing received signature, includes:
	 * - multisignature account creation
	 * - send from multisignature account
	 *
	 * @public
	 * @param {Object} signature - Signature data
	 * @param {string} [signature.publicKey] - Public key of account that created the signature (optional)
	 * @param {string} signature.transactionId - Id of transaction that signature was created for
	 * @param {string} signature.signature - Actual signature
	 * @param {function} cb - Callback function
	 * @implements {library.balancesSequence.add} - All processing here is done through balancesSequence
	 * @returns {setImmediateCallback} cb, err
	 */
	// eslint-disable-next-line class-methods-use-this
	getTransactionAndProcessSignature(signature, cb) {
		if (!signature) {
			const message = 'Unable to process signature, signature not provided';
			library.logger.error(message);
			return setImmediate(cb, [
				new TransactionError(message, '', '.signature'),
			]);
		}
		// Grab transaction with corresponding ID from transaction pool
		const transaction = modules.transactions.getMultisignatureTransaction(
			signature.transactionId
		);

		if (!transaction) {
			const message =
				'Unable to process signature, corresponding transaction not found';
			library.logger.error(message, { signature });
			return setImmediate(cb, [
				new TransactionError(message, '', '.signature'),
			]);
		}

		return modules.processTransactions
			.processSignature(transaction, signature)
			.then(transactionResponse => {
				if (
					transactionResponse.status === TransactionStatus.FAIL &&
					transactionResponse.errors.length > 0
				) {
					const message = transactionResponse.errors[0].message;
					library.logger.error(message, { signature });
					return setImmediate(cb, transactionResponse.errors);
				}
				// Emit events
				library.channel.publish(
					'chain:multisignatures:signature:change',
					transaction.id
				);
				library.bus.message('signature', signature, true);

				return setImmediate(cb);
			})
			.catch(err => setImmediate(cb, [err]));
	}

	// Events
	/**
	 * Calls Multisignature.bind() with modules params.
	 *
	 * @param {modules} scope - Loaded modules
	 */
	// eslint-disable-next-line class-methods-use-this
	onBind(scope) {
		modules = {
			transactions: scope.modules.transactions,
			processTransactions: scope.modules.processTransactions,
		};
	}

	/**
	 * Checks if `modules` is loaded.
	 *
	 * @returns {boolean} True if `modules` is loaded
	 */
	// eslint-disable-next-line class-methods-use-this
	isLoaded() {
		return !!modules;
	}
}

// Export
module.exports = Multisignatures;

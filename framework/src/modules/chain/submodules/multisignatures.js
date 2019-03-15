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
const Multisignature = require('../logic/multisignature');

const { TRANSACTION_TYPES } = global.constants;

// Private fields
let submodules;
let library;
let self;
const __private = {};

__private.assetTypes = {};

/**
 * Main multisignatures methods. Initializes library with scope content and generates a Multisignature instance.
 * Calls logic.transaction.attachAssetType().
 *
 * @class
 * @memberof submodules
 * @see Parent: {@link submodules}
 * @requires async
 * @requires logic/multisignature
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
function Multisignatures(cb, scope) {
	library = {
		channel: scope.channel,
		logger: scope.components.logger,
		storage: scope.components.storage,
		schema: scope.schema,
		bus: scope.bus,
		balancesSequence: scope.balancesSequence,
		logic: {
			transaction: scope.logic.transaction,
			account: scope.logic.account,
			multisignature: new Multisignature({
				components: {
					logger: scope.components.logger,
				},
				schema: scope.schema,
				logic: {
					account: scope.logic.account,
					transaction: scope.logic.transaction,
				},
				channel: scope.channel,
			}),
		},
	};
	self = this;

	__private.assetTypes[
		TRANSACTION_TYPES.MULTI
	] = library.logic.transaction.attachAssetType(
		TRANSACTION_TYPES.MULTI,
		library.logic.multisignature
	);

	setImmediate(cb, null, self);
}

// Public methods

/**
 * Check if the provided signature is valid
 *
 * @private
 * @param {Object} signature - Signature data
 * @param {string} [signature.publicKey] - Public key of account that created the signature (optional)
 * @param {string} signature.transactionId - Id of transaction that signature was created for
 * @param {string} signature.signature - Actual signature
 * @param {Array} membersPublicKeys - Public keys of multisignature account members
 * @param {Object} transaction - Corresponding transaction grabbed from transaction pool
 * @returns {boolean} isValid - true if signature passed verification, false otherwise
 */
__private.isValidSignature = (signature, membersPublicKeys, transaction) => {
	let isValid = false;

	try {
		// If publicKey is provided we can perform direct verify
		if (signature.publicKey) {
			// Check if publicKey is present as member of multisignature account in transaction
			if (!membersPublicKeys.includes(signature.publicKey)) {
				library.logger.error(
					'Unable to process signature, signer not in keysgroup.',
					{ signature, membersPublicKeys, transaction }
				);
				return false;
			}

			// Try to verify the signature
			isValid = library.logic.transaction.verifySignature(
				transaction,
				signature.publicKey,
				signature.signature
			);
		} else {
			// publicKey is not there - we need to iterate through all members of multisignature account in transaction
			// Try to find public key for which the signature is passing validation
			const found = membersPublicKeys.find(memberPublicKey =>
				// Try to verify the signature
				library.logic.transaction.verifySignature(
					transaction,
					memberPublicKey,
					signature.signature
				)
			);
			// When public key found - mark signature as valid
			isValid = !!found;
		}
	} catch (e) {
		library.logger.error('Unable to process signature, verification failed.', {
			signature,
			membersPublicKeys,
			transaction,
			error: e.stack,
		});
	}
	return isValid;
};

/**
 * Validate signature against provided transaction, add signature to transaction if valid and emit events
 *
 * @private
 * @param {Object} signature - Signature data
 * @param {string} [signature.publicKey] - Public key of account that created the signature (optional)
 * @param {string} signature.transactionId - Id of transaction that signature was created for
 * @param {string} signature.signature - Actual signature
 * @param {Array} membersPublicKeys - Public keys of multisignature account members
 * @param {Object} transaction - Corresponding transaction grabbed from transaction pool
 * @param {Object} sender - Account data of sender of the transaction provided above
 * @param {function} cb - Callback function
 * @implements {library.logic.multisignature.ready}
 * @returns {setImmediateCallback} cb, err
 */
__private.validateSignature = (
	signature,
	membersPublicKeys,
	transaction,
	sender,
	cb
) => {
	// Check if signature is valid
	if (!__private.isValidSignature(signature, membersPublicKeys, transaction)) {
		return setImmediate(
			cb,
			new Error('Unable to process signature, verification failed')
		);
	}

	// Add signature to transaction
	transaction.signatures.push(signature.signature);
	// Check if transaction is ready to be processed
	transaction.ready = library.logic.multisignature.ready(transaction, sender);

	// Emit events
	library.channel.publish(
		'chain:multisignatures:signature:change',
		transaction
	);

	library.bus.message('signature', signature, true);
	return setImmediate(cb);
};

/**
 * Process signature for multisignature account creation, transaction type 4 (MULTI)
 *
 * @private
 * @param {Object} signature - Signature data
 * @param {string} [signature.publicKey] - Public key of account that created the signature (optional)
 * @param {string} signature.transactionId - Id of transaction that signature was created for
 * @param {string} signature.signature - Actual signature
 * @param {Object} transaction - Corresponding transaction grabbed from transaction pool
 * @param {function} cb - Callback function
 * @implements {__private.validateSignature}
 * @returns {setImmediateCallback} cb, err
 */
__private.processSignatureForMultisignatureAccountCreation = (
	signature,
	transaction,
	cb
) => {
	// Normalize members of multisignature account from transaction
	const membersPublicKeys = transaction.asset.multisignature.keysgroup.map(
		member => member.substring(1) // Remove first character, which is '+'
	);

	// Set empty object as sender, as we don't need sender in case of multisignature registration
	const sender = {};

	return __private.validateSignature(
		signature,
		membersPublicKeys,
		transaction,
		sender,
		cb
	);
};

/**
 * Process signature for transactions that comes from already estabilished multisignature account
 *
 * @private
 * @param {Object} signature - Signature data
 * @param {string} [signature.publicKey] - Public key of account that created the signature (optional)
 * @param {string} signature.transactionId - Id of transaction that signature was created for
 * @param {string} signature.signature - Actual signature
 * @param {Object} transaction - Corresponding transaction grabbed from transaction pool
 * @param {function} cb - Callback function
 * @implements {__private.validateSignature}
 * @returns {setImmediateCallback} cb, err
 */
__private.processSignatureFromMultisignatureAccount = (
	signature,
	transaction,
	cb
) => {
	// Get sender account of correscponding transaction
	submodules.accounts.getAccount(
		{ address: transaction.senderId },
		(err, sender) => {
			if (err || !sender) {
				const message = 'Unable to process signature, account not found';
				library.logger.error(message, { signature, transaction, error: err });
				return setImmediate(cb, new Error(message));
			}

			// Assign members of multisignature account from transaction
			const membersPublicKeys = sender.membersPublicKeys;

			return __private.validateSignature(
				signature,
				membersPublicKeys,
				transaction,
				sender,
				cb
			);
		}
	);
};

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
Multisignatures.prototype.processSignature = function(signature, cb) {
	if (!signature) {
		const message = 'Unable to process signature, signature not provided';
		library.logger.error(message);
		return setImmediate(cb, new Error(message));
	}

	// From now perform all the operations via balanceSequence
	return library.balancesSequence.add(balanceSequenceCb => {
		// Grab transaction with corresponding ID from transaction pool
		const transaction = submodules.transactions.getMultisignatureTransaction(
			signature.transactionId
		);

		if (!transaction) {
			const message =
				'Unable to process signature, corresponding transaction not found';
			library.logger.error(message, { signature });
			return setImmediate(balanceSequenceCb, new Error(message));
		}

		// If there are no signatures yet - initialise with empty array
		transaction.signatures = transaction.signatures || [];

		// Check if received signature already exists in transaction
		if (transaction.signatures.includes(signature.signature)) {
			const message = 'Unable to process signature, signature already exists';
			library.logger.error(message, { signature, transaction });
			return setImmediate(balanceSequenceCb, new Error(message));
		}

		// Process signature for multisignature account creation transaction
		if (transaction.type === TRANSACTION_TYPES.MULTI) {
			return __private.processSignatureForMultisignatureAccountCreation(
				signature,
				transaction,
				balanceSequenceCb
			);
		}

		// Process signature for send from multisignature account transaction
		return __private.processSignatureFromMultisignatureAccount(
			signature,
			transaction,
			balanceSequenceCb
		);
	}, cb);
};

/**
 * Description of getGroup.
 *
 * @todo Add @returns and @param tags
 * @todo Add description for the function
 */
Multisignatures.prototype.getGroup = function(address, cb) {
	const scope = {};

	async.series(
		{
			getAccount(seriesCb) {
				library.logic.account.getMultiSignature({ address }, (err, account) => {
					if (err) {
						return setImmediate(seriesCb, err);
					}

					if (!account) {
						return setImmediate(
							seriesCb,
							new Error('Multisignature account not found')
						);
					}

					scope.group = {
						address: account.address,
						publicKey: account.publicKey,
						secondPublicKey: account.secondPublicKey || '',
						balance: account.balance,
						unconfirmedBalance: account.u_balance,
						min: account.multiMin,
						lifetime: account.multiLifetime,
						members: [],
					};

					return setImmediate(seriesCb);
				});
			},
			getMembers(seriesCb) {
				library.storage.entities.Account.getOne(
					{ address: scope.group.address },
					{ extended: true }
				).then(memberAccount => {
					const memberAccountKeys = memberAccount.membersPublicKeys || [];
					const addresses = [];

					memberAccountKeys.forEach(key => {
						addresses.push(submodules.accounts.generateAddressByPublicKey(key));
					});

					submodules.accounts.getAccounts(
						{ address_in: addresses },
						['address', 'publicKey', 'secondPublicKey'],
						(err, accounts) => {
							accounts.forEach(account => {
								scope.group.members.push({
									address: account.address,
									publicKey: account.publicKey,
									secondPublicKey: account.secondPublicKey || '',
								});
							});

							return setImmediate(seriesCb);
						}
					);
				});
			},
		},
		err => {
			if (err) {
				return setImmediate(cb, err);
			}
			return setImmediate(cb, null, scope.group);
		}
	);
};

// Events
/**
 * Calls Multisignature.bind() with submodules params.
 *
 * @param {submodules} scope - Loaded submodules
 */
Multisignatures.prototype.onBind = function(scope) {
	submodules = {
		accounts: scope.submodules.accounts,
		transactions: scope.submodules.transactions,
	};

	__private.assetTypes[TRANSACTION_TYPES.MULTI].bind(scope.submodules.accounts);
};

/**
 * Checks if `submodules` is loaded.
 *
 * @returns {boolean} True if `submodules` is loaded
 */
Multisignatures.prototype.isLoaded = function() {
	return !!submodules;
};

// Export
module.exports = Multisignatures;

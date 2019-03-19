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
 * @requires helpers/transaction_types
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
			account: scope.logic.account,
		},
	};
	self = this;

	setImmediate(cb, null, self);
}

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
						addresses.push(modules.accounts.generateAddressByPublicKey(key));
					});

					modules.accounts.getAccounts(
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
 * Calls Multisignature.bind() with modules params.
 *
 * @param {modules} scope - Loaded modules
 */
Multisignatures.prototype.onBind = function(scope) {
	modules = {
		accounts: scope.modules.accounts,
		transactions: scope.modules.transactions,
	};
};

/**
 * Checks if `modules` is loaded.
 *
 * @returns {boolean} True if `modules` is loaded
 */
Multisignatures.prototype.isLoaded = function() {
	return !!modules;
};

// Export
module.exports = Multisignatures;

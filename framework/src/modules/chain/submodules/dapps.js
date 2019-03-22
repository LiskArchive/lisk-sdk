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

// Private fields
let modules;
let library;
let self;
const __private = {};
const shared = {};

__private.assetTypes = {};

/**
 * Main dapps methods. Initializes library
 * Listens for an `exit` signal.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires logic/dapp
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @returns {setImmediateCallback} cb, null, self
 * @todo Apply node pattern for callbacks: callback always at the end
 * @todo Add 'use strict';
 */
class DApps {
	constructor(cb, scope) {
		library = {
			logger: scope.components.logger,
			storage: scope.components.storage,
			network: scope.network,
			schema: scope.schema,
			ed: scope.ed,
			balancesSequence: scope.balancesSequence,
			config: {
				dapp: scope.config.dapp,
			},
		};
		self = this;

		/**
		 * Receives an 'exit' signal and calls stopDApp for each launched application.
		 *
		 * @listens exit
		 */
		process.on('exit', () => {});

		setImmediate(cb, null, self);
	}
}

// Events
/**
 * Bounds used scope modules to private modules constant and sets params
 * to private Dapp, InTransfer and OutTransfer instances.
 *
 * @param {Object} scope - Loaded modules
 */
DApps.prototype.onBind = function(scope) {
	modules = {
		transactions: scope.modules.transactions,
		accounts: scope.modules.accounts,
		peers: scope.modules.peers,
		sql: scope.modules.sql,
	};
};

/**
 * Checks if `modules` is loaded.
 *
 * @returns {boolean} True if `modules` is loaded.
 */
DApps.prototype.isLoaded = function() {
	return !!modules;
};

// Shared API
/**
 * Description of getGenesis.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
shared.getGenesis = function(req, cb, tx) {
	library.storage.entities.Transaction.get(
		{
			id: req.dappid,
		},
		{ limit: 1 },
		tx
	)
		.then(rows => {
			if (rows.length === 0) {
				return setImmediate(cb, 'Application genesis block not found');
			}
			const row = rows[0];

			return setImmediate(cb, null, {
				pointId: row.id,
				pointHeight: row.height,
				authorId: row.senderId,
				dappid: req.dappid,
			});
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'DApp#getGenesis error');
		});
};

// Export
module.exports = DApps;

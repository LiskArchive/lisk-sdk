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

const DApp = require('../logic/dapp');
const InTransfer = require('../logic/in_transfer');
const OutTransfer = require('../logic/out_transfer');

const { TRANSACTION_TYPES } = global.constants;

// Private fields
let modules;
let library;
let self;
const __private = {};
const shared = {};

__private.assetTypes = {};

/**
 * Main dapps methods. Initializes library with scope content and generates instances for:
 * - DApp
 * - InTransfer
 * - OutTransfer
 *
 * Calls logic.transaction.attachAssetType().
 *
 * Listens for an `exit` signal.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires logic/dapp
 * @requires helpers/in_transfer
 * @requires helpers/out_transfer
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
			logic: {
				transaction: scope.logic.transaction,
			},
			config: {
				dapp: scope.config.dapp,
			},
		};
		self = this;

		__private.assetTypes[
			TRANSACTION_TYPES.DAPP
		] = library.logic.transaction.attachAssetType(
			TRANSACTION_TYPES.DAPP,
			new DApp({
				components: {
					storage: scope.components.storage,
					logger: scope.components.logger,
				},
				schema: scope.schema,
				channel: scope.channel,
			})
		);

		__private.assetTypes[
			TRANSACTION_TYPES.IN_TRANSFER
		] = library.logic.transaction.attachAssetType(
			TRANSACTION_TYPES.IN_TRANSFER,
			new InTransfer({
				components: {
					storage: scope.components.storage,
				},
				schema: scope.schema,
			})
		);

		__private.assetTypes[
			TRANSACTION_TYPES.OUT_TRANSFER
		] = library.logic.transaction.attachAssetType(
			TRANSACTION_TYPES.OUT_TRANSFER,

			new OutTransfer({
				components: {
					storage: scope.components.storage,
					logger: scope.components.logger,
				},
				schema: scope.schema,
			})
		);

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

	__private.assetTypes[TRANSACTION_TYPES.IN_TRANSFER].bind(
		scope.modules.accounts,
		scope.modules.blocks,
		shared
	);

	__private.assetTypes[TRANSACTION_TYPES.OUT_TRANSFER].bind(
		scope.modules.accounts,
		scope.modules.blocks,
		scope.modules.dapps
	);
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

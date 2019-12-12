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
	StorageSandbox,
	clearDatabaseTable,
} = require('../../../mocha/common/storage_sandbox');

const getAccount = async (storage, address) =>
	storage.entities.Account.getOne({ address }, { extended: true });

const getBlock = async (storage, blockId) =>
	storage.entities.Block.getOne({ id: blockId }, { extended: true });

const getTransaction = async (storage, id) =>
	storage.entities.Transaction.getOne({ id }, { extended: true });

const getTransactions = async (storage, filter) =>
	storage.entities.Transaction.get(filter, { extended: true });

module.exports = {
	clearDatabaseTable,
	StorageSandbox,
	getAccount,
	getBlock,
	getTransaction,
	getTransactions,
};

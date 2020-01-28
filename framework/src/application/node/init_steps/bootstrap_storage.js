/*
 * Copyright © 2019 Lisk Foundation
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
	Account,
	Block,
	RoundDelegates,
	Transaction,
	ChainState,
	ForgerInfo,
	TempBlock,
} = require('../components/storage/entities');

module.exports = async ({ components: { storage, logger } }, accountLimit) => {
	try {
		storage.registerEntity('Account', Account, {
			replaceExisting: true,
		});
		storage.registerEntity('Block', Block, {
			replaceExisting: true,
		});
		storage.registerEntity('RoundDelegates', RoundDelegates);
		storage.registerEntity('Transaction', Transaction, {
			replaceExisting: true,
		});
		storage.registerEntity('ChainState', ChainState);
		storage.registerEntity('ForgerInfo', ForgerInfo);
		storage.registerEntity('TempBlock', TempBlock);
		const status = await storage.bootstrap();
		if (!status) {
			throw new Error('Can not bootstrap the storage component');
		}
		storage.entities.Account.extendDefaultOptions({
			limit: accountLimit,
		});
	} catch (err) {
		logger.error(err);
		throw err;
	}
};

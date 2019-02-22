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

const { Migration, Peer, Round } = require('../storage/entities');

module.exports = async ({ components: { storage, logger } }, accountLimit) => {
	try {
		storage.registerEntity('Migration', Migration);
		storage.registerEntity('Peer', Peer);
		storage.registerEntity('Round', Round);
		const status = await storage.bootstrap();
		if (!status) {
			throw new Error('Can not bootstrap the storage component');
		}
		storage.entities.Account.extendDefaultOptions({
			limit: accountLimit,
		});
		await storage.entities.Migration.applyAll();
		await storage.entities.Migration.applyRunTime();
	} catch (err) {
		logger.error(err);
		throw err;
	}
};

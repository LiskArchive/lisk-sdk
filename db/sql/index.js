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

const { link } = require('./config');

/**
 * @namespace sql
 * @memberof db
 * @see Parent: {@link db}
 * @property {module:db/sql} SQL
 */

/**
 * Description of the module.
 *
 * @module db/sql
 * @see Parent: {@link db.sql}
 */
module.exports = {
	accounts: {},
	blocks: {},
	multisignatures: {
		getMemberPublicKeys: link('multisignatures/get_member_public_keys.sql'),
		getGroupIds: link('multisignatures/get_group_ids.sql'),
	},
	migrations: {
		getLastId: link('migrations/get_last_id.sql'),
		add: link('migrations/add.sql'),
		runtime: link('migrations/runtime.sql'),
	},
};

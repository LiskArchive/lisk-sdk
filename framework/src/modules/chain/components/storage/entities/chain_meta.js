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

const path = require('path');
const {
	entities: { BaseEntity },
	utils: {
		filterTypes: { BOOLEAN },
	},
} = require('../../../../../components/storage');

const sqlFiles = {
	create: 'chain_meta/create.sql',
	update: 'chain_meta/update.sql',
	upsert: 'chain_meta/upsert.sql',
};

class ChainMeta extends BaseEntity {
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('key', 'string', { filter: BOOLEAN });
		this.addField('value', 'string');

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');
		this.SQLs = this.loadSQLFiles('chain_meta', sqlFiles, this.sqlDirectory);
	}

	update({ key, value }, tx) {
		const expectedResultCount = 0;

		return this.adapter.executeFile(
			this.SQLs.update,
			{ key, value },
			{ expectedResultCount },
			tx
		);
	}

	create({ key, value }, tx) {
		const expectedResultCount = 0;

		return this.adapter.executeFile(
			this.SQLs.create,
			{ key, value },
			{ expectedResultCount },
			tx
		);
	}

	upsert({ key, value }, tx) {
		const expectedResultCount = 0;

		return this.adapter.executeFile(
			this.SQLs.upsert,
			{ key, value },
			{ expectedResultCount },
			tx
		);
	}
}

module.exports = ChainMeta;

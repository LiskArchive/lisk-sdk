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

/* eslint-disable no-console */

const moment = require('moment');
const fs = require('fs');

const createMigration = name => {
	const migration = {
		id: moment().format('YYYYMMDDHHmmss'),
		name: String(name),
	};
	if (!migration.name.match(/^[a-z_]+$/i)) {
		throw new Error('Invalid migration name');
	}

	migration.filename = `${migration.id}_${migration.name}.sql`;

	console.log(`Creating migration file: ${migration.filename}`);

	const filePath = `${__dirname}/../components/sql/migrations/updates/${
		migration.filename
	}`;

	fs.writeFileSync(filePath, '');
};

module.exports = createMigration;

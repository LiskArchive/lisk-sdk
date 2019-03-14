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

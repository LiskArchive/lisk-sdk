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

const queriesHelper = require('../common/integration/sql/queriesHelper.js');
var DBSandbox = require('../common/db_sandbox').DBSandbox;

describe('Dependency versions', () => {
	describe('node version', () => {
		it('should be v8.x.x', () => {
			return expect(process.version).to.contain('v8');
		});
	});

	describe('postgresql version', () => {
		let dbSandbox;

		after(done => {
			if (dbSandbox) {
				dbSandbox.destroy();
				done();
			}
		});

		it('should be 10.x', done => {
			dbSandbox = new DBSandbox(__testContext.config.db, 'postgresql-version');
			dbSandbox.create((err, __db) => {
				const Queries = new queriesHelper(null, __db);
				Queries.getPostgresVersion().then(data => {
					try {
						expect(data[0].version).to.contain('PostgreSQL 10.');
						done(err);
					} catch (err) {
						done(err);
					}
				});
			});
		});
	});
});

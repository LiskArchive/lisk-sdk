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
const application = require('../common/application.js');

describe('Dependency versions', () => {
	describe('node version', () => {
		it('should be v8.x.x', () => {
			return expect(process.version).to.contain('v8');
		});
	});

	describe('postgresql version', () => {
		it('should be 10.x', done => {
			application.init({ sandbox: { name: 'lisk_test_app' } }, (err, lib) => {
				const Queries = new queriesHelper(lib, lib.db);
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

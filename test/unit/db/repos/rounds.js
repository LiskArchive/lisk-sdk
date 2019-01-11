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

const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const seeder = require('../../../common/db_seed');

let db;
let dbSandbox;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'lisk_test_db_rounds');

		dbSandbox.create((err, __db) => {
			db = __db;

			done(err);
		});
	});

	after(done => {
		dbSandbox.destroy();
		done();
	});

	beforeEach(done => {
		seeder
			.seed(db)
			.then(() => done())
			.catch(done);
	});

	afterEach(done => {
		sinonSandbox.restore();
		seeder
			.reset(db)
			.then(() => done(null))
			.catch(done);
	});

	it('should initialize db.blocks repo', done => {
		expect(db.rounds).to.be.not.null;
		done();
	});

	describe('RoundsRepository', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.rounds.db).to.be.eql(db);
				return expect(db.rounds.pgp).to.be.eql(db.$config.pgp);
			});
		});
	});
});

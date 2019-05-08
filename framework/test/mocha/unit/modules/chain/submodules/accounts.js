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

const AccountModule = require('../../../../../../src/modules/chain/submodules/accounts');
const application = require('../../../../common/application');

describe('accounts', () => {
	let accounts;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_accounts' } },
			(err, scope) => {
				// For correctly initializing setting blocks module
				scope.modules.blocks.lastBlock.set({ height: 10 });
				accounts = scope.modules.accounts;
				done(err);
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('constructor', () => {
		it('should throw with no params', async () =>
			expect(() => {
				new AccountModule();
			}).to.throw());
	});

	describe('onBind', () => {
		it('should throw error with empty params', async () =>
			expect(accounts.onBind).to.throw());
	});

	describe('isLoaded', () => {
		it('should return true when modules are loaded', async () =>
			expect(accounts.isLoaded).to.be.ok);
	});
});

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
const accountFixtures = require('../../../../fixtures').accounts;
const application = require('../../../../common/application');

const validAccount = {
	username: 'genesis_100',
	isDelegate: 1,
	u_isDelegate: 1,
	secondSignature: 0,
	u_secondSignature: 0,
	u_username: 'genesis_100',
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	secondPublicKey: null,
	vote: '9820020609280331',
	rate: '0',
	delegates: null,
	u_delegates: null,
	multisignatures: null,
	u_multisignatures: null,
	multimin: 0,
	u_multimin: 0,
	multilifetime: 0,
	u_multilifetime: 0,
	blockId: '10352824351134264746',
	nameexist: 0,
	u_nameexist: 0,
	producedBlocks: 27,
	missedBlocks: 1,
	fees: '231386135',
	rewards: '0',
};

describe('accounts', () => {
	let accounts;
	let accountLogic;
	let storage;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_accounts' } },
			(err, scope) => {
				// For correctly initializing setting blocks module
				scope.modules.blocks.lastBlock.set({ height: 10 });
				accounts = scope.modules.accounts;
				accountLogic = scope.logic.account;
				storage = scope.components.storage;
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

	describe('generateAddressByPublicKey', () => {
		it('should generate correct address for the publicKey provided', async () =>
			expect(
				accounts.generateAddressByPublicKey(validAccount.publicKey)
			).to.equal(validAccount.address));

		/* eslint-disable mocha/no-skipped-tests */
		// TODO: Design a throwable test
		it.skip('should throw error for invalid publicKey', async () => {
			const invalidPublicKey = 'invalidPublicKey';

			return expect(() => {
				accounts.generateAddressByPublicKey(invalidPublicKey);
			}).to.throw('Invalid public key: ', invalidPublicKey);
		});
		/* eslint-enable mocha/no-skipped-tests */
	});

	describe('getAccount', () => {
		it('should convert publicKey filter to address and call account.get', done => {
			const getAccountStub = sinonSandbox.stub(accountLogic, 'get');

			accounts.getAccount({ publicKey: validAccount.publicKey });
			expect(getAccountStub.calledOnce).to.be.ok;
			expect(getAccountStub.calledWith({ address: validAccount.address })).to.be
				.ok;
			getAccountStub.restore();
			done();
		});

		it('should get correct account for address', done => {
			accounts.getAccount({ address: validAccount.address }, (err, res) => {
				expect(err).to.not.exist;
				expect(res.address).to.equal(validAccount.address);
				expect(res.publicKey).to.equal(validAccount.publicKey);
				expect(res.username).to.equal(validAccount.username);
				done();
			});
		});
	});

	describe('getAccounts', () => {
		it('should get accounts for the filter provided', done => {
			accounts.getAccounts({ secondSignature: false }, (err, res) => {
				expect(err).to.not.exist;
				expect(res).to.be.an('Array');
				expect(res.filter(a => a.secondSignature !== false).length).to.equal(0);
				done();
			});
		});

		it('should internally call logic/account.getAll method', done => {
			const getAllSpy = sinonSandbox.spy(accountLogic, 'getAll');

			accounts.getAccounts({ address: validAccount.address }, (err, res) => {
				expect(err).to.not.exist;
				expect(res)
					.to.be.an('Array')
					.to.have.length(1);
				expect(getAllSpy.withArgs({ address: validAccount.address })).to.be.ok;
				getAllSpy.restore();
				done();
			});
		});
	});

	describe('setAccountAndGet', () => {
		it('should fail if address and publicKey is missing', done => {
			const account = new accountFixtures.Account();

			delete account.address;
			delete account.publicKey;

			accounts.setAccountAndGet(account, (error, data) => {
				expect(error.message).to.be.eql('Invalid public key');
				expect(data).to.be.undefined;
				done();
			});
		});

		it('should set and get account when sending address but no publicKey', done => {
			const account = new accountFixtures.Account();

			delete account.publicKey;

			accounts.setAccountAndGet(account, (error, data) => {
				expect(error).to.be.null;
				expect(data.address).to.be.eql(account.address);
				expect(data.publicKey).to.not.exist;
				done();
			});
		});

		it('should set and get account with address when publicKey is provided but address is not provided', done => {
			const account = new accountFixtures.Account();

			delete account.address;

			accounts.setAccountAndGet(account, (error, data) => {
				expect(error).to.be.null;
				expect(data.publicKey).to.be.eql(account.publicKey);
				expect(data.address).to.exist;
				done();
			});
		});

		it('should set and get account using `Accounts:setAccountAndGet` database transaction with txLevel = 0', done => {
			const account = new accountFixtures.Account();
			let eventCtx;

			storage.adapter.db.$config.options.query = function(event) {
				eventCtx = event.ctx;
			};

			accounts.setAccountAndGet(account, (error, data) => {
				expect(error).to.be.null;
				expect(data.address).to.be.eql(account.address);

				expect(eventCtx).to.not.null;
				expect(eventCtx.isTX).to.be.true;
				expect(eventCtx.txLevel).to.be.eql(0);
				expect(eventCtx.tag).to.be.eql('Accounts:setAccountAndGet');
				delete storage.adapter.db.$config.options.query;

				done();
			});
		});

		it('should set and get account using `Tests:setAccountAndGet` database transaction with txLevel = 0', done => {
			const account = new accountFixtures.Account();
			let eventCtx;

			storage.adapter.db.$config.options.query = function(event) {
				eventCtx = event.ctx;
			};

			const task = t =>
				accounts.setAccountAndGet(
					account,
					(error, data) => {
						expect(error).to.be.null;
						expect(data.address).to.be.eql(account.address);

						expect(eventCtx).to.not.null;
						expect(eventCtx.isTX).to.be.true;
						expect(eventCtx.txLevel).to.be.eql(0);
						expect(eventCtx.tag).to.be.eql('Tests:setAccountAndGet');
						delete storage.adapter.db.$config.options.query;

						done();
					},
					t
				);

			storage.adapter.db.tx('Tests:setAccountAndGet', task);
		});
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

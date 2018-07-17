/* eslint-disable mocha/no-skipped-tests */
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

var Bignum = require('../../../helpers/bignum.js');
var AccountModule = require('../../../modules/accounts.js');
var randomUtil = require('../../common/utils/random');
var application = require('../../common/application');

var validAccount = {
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
	var accounts;
	var accountLogic;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_accounts' } },
			(err, scope) => {
				// For correctly initializing setting blocks module
				scope.modules.blocks.lastBlock.set({ height: 10 });
				accounts = scope.modules.accounts;
				accountLogic = scope.logic.account;
				done(err);
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('constructor', () => {
		it('should throw with no params', () => {
			return expect(() => {
				new AccountModule();
			}).to.throw();
		});
	});

	describe('generateAddressByPublicKey', () => {
		it('should generate correct address for the publicKey provided', () => {
			return expect(
				accounts.generateAddressByPublicKey(validAccount.publicKey)
			).to.equal(validAccount.address);
		});

		// TODO: Design a throwable test
		it.skip('should throw error for invalid publicKey', () => {
			var invalidPublicKey = 'invalidPublicKey';

			return expect(() => {
				accounts.generateAddressByPublicKey(invalidPublicKey);
			}).to.throw('Invalid public key: ', invalidPublicKey);
		});
	});

	describe('getAccount', () => {
		it('should convert publicKey filter to address and call account.get', done => {
			var getAccountStub = sinonSandbox.stub(accountLogic, 'get');

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
			accounts.getAccounts({ secondSignature: 0 }, (err, res) => {
				expect(err).to.not.exist;
				expect(res).to.be.an('Array');
				expect(
					res.filter(a => {
						return a.secondSignature != 0;
					}).length
				).to.equal(0);
				done();
			});
		});

		it('should internally call logic/account.getAll method', done => {
			var getAllSpy = sinonSandbox.spy(accountLogic, 'getAll');

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

	describe('onBind', () => {
		it('should throw error with empty params', () => {
			return expect(accounts.onBind).to.throw();
		});
	});

	describe('isLoaded', () => {
		it('should return true when modules are loaded', () => {
			return expect(accounts.isLoaded).to.be.ok;
		});
	});

	describe('shared', () => {
		describe('getAccounts', () => {
			it('should return empty accounts array when account does not exist', done => {
				accounts.shared.getAccounts(
					{
						address: randomUtil.account().address,
					},
					(err, res) => {
						expect(err).to.not.exist;
						expect(res)
							.be.an('array')
							.which.has.length(0);
						done();
					}
				);
			});

			it('should return account using publicKey', done => {
				accounts.shared.getAccounts(
					{
						publicKey: validAccount.publicKey,
					},
					(err, res) => {
						expect(err).to.not.exist;
						expect(res).to.be.an('array');
						done();
					}
				);
			});

			it('should return account using address', done => {
				accounts.shared.getAccounts(
					{
						address: validAccount.address,
					},
					(err, res) => {
						expect(err).to.not.exist;
						expect(res).to.be.an('array');
						done();
					}
				);
			});

			it('should return top 10 accounts ordered by descending balance', done => {
				var limit = 10;
				var sort = 'balance:desc';

				accounts.shared.getAccounts(
					{
						limit,
						sort,
					},
					(err, res) => {
						expect(err).to.not.exist;
						expect(res).to.have.length(10);
						for (var i = 0; i < limit - 1; i++) {
							expect(
								new Bignum(res[i].balance).gte(new Bignum(res[i + 1].balance))
							).to.equal(true);
						}
						done();
					}
				);
			});

			it('should return accounts in the range 10 to 20 ordered by descending balance', done => {
				var limit = 10;
				var offset = 10;
				var sort = 'balance:desc';

				accounts.shared.getAccounts(
					{
						limit,
						offset,
						sort,
					},
					(err, res) => {
						expect(err).to.not.exist;
						expect(res).to.have.length(10);
						for (var i = 0; i < limit - 1; i++) {
							expect(
								new Bignum(res[i].balance).gte(new Bignum(res[i + 1].balance))
							).to.equal(true);
						}
						done();
					}
				);
			});
		});
	});
});

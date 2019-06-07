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

const rewire = require('rewire');
const BigNum = require('@liskhq/bignum');
const application = require('../../../../common/application');
const modulesLoader = require('../../../../common/modules_loader');

const Account = rewire('../../../../../../src/modules/chain/rounds/account');

const validAccount = {
	username: 'genesis_100',
	isDelegate: 1,
	secondSignature: 0,
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	secondPublicKey: null,
	balance: new BigNum('0'),
	multiMin: 0,
	multiLifetime: 1,
	nameExist: 0,
	fees: new BigNum('0'),
	rank: '70',
	rewards: new BigNum('0'),
	vote: 10000000000000000,
	producedBlocks: 0,
	missedBlocks: 0,
	approval: 100,
	productivity: 0,
	membersPublicKeys: null,
	votedDelegatesPublicKeys: null,
	asset: null,
};

describe('account', () => {
	let account;
	let accountLogic;
	let storage;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_logic_accounts' } },
			(err, scope) => {
				if (err) {
					done(err);
				}
				account = new Account(
					scope.components.storage,
					scope.schema,
					scope.components.logger,
					scope.modules.rounds
				);
				storage = scope.components.storage;
				done();
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('constructor', () => {
		let library;
		let storageStub;

		before(async () => {
			storageStub = {
				entities: {
					Account: {
						get: sinonSandbox.stub().resolves(),
					},
				},
			};

			accountLogic = new Account(
				storageStub,
				modulesLoader.scope.components.logger
			);

			library = Account.__get__('library');
		});

		it('should attach storage to scope variable', async () =>
			expect(accountLogic.scope.storage).to.eql(storageStub));

		it('should attach logger to library variable', async () =>
			expect(library.logger).to.eql(modulesLoader.scope.components.logger));
	});

	describe('verifyPublicKey', () => {
		it('should be okay for empty params', async () =>
			expect(account.verifyPublicKey()).to.be.undefined);

		it('should throw error if parameter is not a string', async () =>
			expect(() => {
				account.verifyPublicKey(1);
			}).to.throw('Invalid public key, must be a string'));

		it('should throw error if parameter is of invalid length', async () =>
			expect(() => {
				account.verifyPublicKey('231312312321');
			}).to.throw('Invalid public key, must be 64 characters long'));

		it('should throw error if parameter is not a hex string', async () =>
			expect(() => {
				account.verifyPublicKey(
					'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2az'
				);
			}).to.throw('Invalid public key, must be a hex string'));

		it('should be okay if parameter is in correct format', async () =>
			expect(() => {
				account.verifyPublicKey(
					'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a2'
				);
			}).to.not.throw());
	});

	describe('merge', () => {
		before(async () =>
			storage.entities.Account.upsert(
				{ address: validAccount.address },
				{ u_username: 'test_set', vote: 1, address: validAccount.address }
			)
		);

		it('should merge diff when values are correct', done => {
			account.merge(
				validAccount.address,
				{ membersPublicKeys: ['MS1'], votedDelegatesPublicKeys: ['DLG1'] },
				(err, res) => {
					expect(err).to.not.exist;
					expect(res.votedDelegatesPublicKeys).to.deep.equal(['DLG1']);
					expect(res.membersPublicKeys).to.deep.equal(['MS1']);
					done();
				}
			);
		});

		it('should throw error when a numeric field receives non numeric value', done => {
			const balance = 'Not a Number';
			account.merge(validAccount.address, { balance }, err => {
				expect(err).to.equal(`Encountered insane number: ${balance}`);
				done();
			});
		});

		describe('verify public key', () => {
			it('should throw error if parameter is not a string', async () =>
				expect(() => {
					account.merge(validAccount.address, { publicKey: 1 });
				}).to.throw('Invalid public key, must be a string'));

			it('should throw error if parameter is of invalid length', async () =>
				expect(() => {
					account.merge(validAccount.address, { publicKey: '231312312321' });
				}).to.throw('Invalid public key, must be 64 characters long'));

			it('should throw error if parameter is not a hex string', async () =>
				expect(() => {
					account.merge(validAccount.address, {
						publicKey:
							'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2az',
					});
				}).to.throw('Invalid public key, must be a hex string'));
		});

		describe('check database constraints', () => {
			it('should throw error when address does not exist for delegates', done => {
				account.merge(
					'1L',
					{ votedDelegatesPublicKeys: [validAccount.publicKey] },
					err => {
						expect(err).to.equal('Account#merge error');
						done();
					}
				);
			});

			it('should throw error when address does not exist for multisignatures', done => {
				account.merge(
					'1L',
					{ membersPublicKeys: [validAccount.publicKey] },
					err => {
						expect(err).to.equal('Account#merge error');
						done();
					}
				);
			});
		});
	});
});

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

var genesisDelegates = require('../../data/genesis_delegates.json');
var accountFixtures = require('../../fixtures/accounts');

var application = require('../../common/application');

describe('delegates', () => {
	var library;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_modules_delegates' } },
			(err, scope) => {
				library = scope;
				// Set delegates module as loaded to allow manual forging
				library.rewiredModules.delegates.__set__('__private.loaded', true);
				// Load forging delegates
				library.rewiredModules.delegates.__get__('__private');
				done(err);
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('__private', () => {
		describe('loadDelegates', () => {
			var loadDelegates;
			var config;
			var __private;

			var encryptedSecret = [
				{
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedSecret:
						'19e9f8eee5d9516234a10953669518bf23371d34e114713c8043a98378fd866834946380c4cc0e40f23305643206c1c5be496074f350d09d87735c42eae30c604cabea9862f4fe8f906313c67a7146d54fa844171e6cf925b7c953987082cdd6',
				},
				{
					publicKey:
						'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					encryptedSecret:
						'14ac6a589c2d3690dd1638eeccfa5ea6f88bfcf01bdcd65665ede305260f63f3d4ee87cb35ade7c237255a898f080fb160110ab2900108bb99cb9215771b1aaa6892ae48789f6a985b3cedf7ad42e94c',
				},
				{
					publicKey:
						'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					encryptedSecret:
						'2df503fb168552063136a479fe5598a28e90261b8ba6c16a8a27ff3ac9b3398aeebe6cf7afe6e84279f204bfcd2a62a18d71e08b14792a456bd3b78e60e215263a3aa2ed401346016e72c2a841e0d236',
				},
			];

			before(() => {
				loadDelegates = library.rewiredModules.delegates.__get__(
					'__private.loadDelegates'
				);
				config = library.rewiredModules.delegates.__get__('library.config');
				__private = library.rewiredModules.delegates.__get__('__private');
			});

			beforeEach(() => {
				__private.keypairs = {};
				config.forging.force = true;
				config.forging.secret = [];
			});

			it('should not load any delegates when forging.force is false', done => {
				config.forging.force = false;
				config.forging.secret = encryptedSecret;

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should not load any delegates when forging.secret array is empty', done => {
				config.forging.secret = [];

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should not load any delegates when forging.secret list is undefined', done => {
				config.forging.secret = undefined;

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted secret does not decrypt with default secret', done => {
				var accountDetails = {
					encryptedSecret:
						'1cc653f6bc2a458ae758dcd618b310e31e1598f237c4c4d96321173050e49c3652876808c73ebc2aa75f49044375077108ca7b8594efc6ae4ce0aa239d7e11f',
					publicKey:
						'35b9364d1733e503599a1e9eefdb4994dd07bb9924acebfec06195cf1a0fa6db',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${accountDetails.publicKey}`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if publicKeys do not match', done => {
				var accountDetails = {
					encryptedSecret:
						'60cc653f6bc2a458ae758dcd618b310e31e1598f237c4c4d96321173050e49c3652876808c73ebc2aa75f49044375077108ca7b8594efc6ae4ce0aa239d7e11f',
					publicKey: 'randomKey',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal('Public keys do not match');
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if account does not exist', done => {
				var randomAccount = {
					publicKey:
						'35b9364d1733e503599a1e9eefdb4994dd07bb9924acebfec06195cf1a0fa6db',
					secret:
						'robust swift deputy enable forget peasant grocery road convince',
					encryptedSecret:
						'60cc653f6bc2a458ae758dcd618b310e31e1598f237c4c4d96321173050e49c3652876808c73ebc2aa75f49044375077108ca7b8594efc6ae4ce0aa239d7e11f',
					key: 'elephant tree paris dragon chair galaxy',
				};
				var accountDetails = {
					encryptedSecret: randomAccount.encryptedSecret,
					publicKey: randomAccount.publicKey,
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						[
							'Account with public key:',
							accountDetails.publicKey.toString('hex'),
							'not found',
						].join(' ')
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should ignore secrets which do not belong to a delegate', done => {
				config.forging.secret = [
					{
						encryptedSecret: accountFixtures.genesis.encryptedSecret,
						publicKey: accountFixtures.genesis.publicKey,
					},
				];

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should load secrets in encrypted format with the key', done => {
				config.forging.secret = encryptedSecret;

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(
						encryptedSecret.length
					);
					done();
				});
			});

			it('should load all 101 delegates', done => {
				config.forging.secret = genesisDelegates.delegates.map(delegate => {
					return {
						encryptedSecret: delegate.encryptedSecret,
						publicKey: delegate.publicKey,
					};
				});

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(101);
					done();
				});
			});
		});
	});
});

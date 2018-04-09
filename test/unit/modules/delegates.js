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
						'$5$rounds=1$5d502e8156eeeaf2acf23d801351dda7$f856ab7731c046da5bf7b9f11fdf20fbc1870845633627b82f84151e432d4e4ca5f69a9c40f15bc2a749e28a66c2e11bbdc45049e0a1f53087fbdd542536c19059e294d231f7aaf30a0600a79ef78519$iv=4a500624cba9c3cb3b6e380556e197d6$tag=24a118a1abab32d256a5de013c20539e$version=1.0.0',
				},
				{
					publicKey:
						'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					encryptedSecret:
						'$5$rounds=1$f8f2c6b925f76f8b23b2aeb7973c73df$1f555db5bf44d505bcb0f6ef0b659da8fa81c2e0855ef519855936f7b72448156ace3cb60f65866f936ca3e503b296764168101db8e45b33579b8af35b4dea269efed2f3e0ec2a3a91c07592$iv=99da43bd3ac4c541059fce74024a945b$tag=45af72fcb5040d525521b839dab5580b$version=1.0.0',
				},
				{
					publicKey:
						'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					encryptedSecret:
						'$5$rounds=1$4fe5555adfae3b7dbe740c72dc355929$9ea3d061ada369a30777ebbca2b844f960b486a43375096b7d42cd1adaf8c879e5f4516770f43419fbb9c02b8a848de02cc6916fe932f1b5268f70329604b3476bf88a1b499614130b8c0c664dac$iv=01f3eb51c0de8a8e58525c7c2fef777b$tag=8a088c96970567e05dbfa65b7478ea39$version=1.0.0',
				},
			];

			before(done => {
				loadDelegates = library.rewiredModules.delegates.__get__(
					'__private.loadDelegates'
				);
				config = library.rewiredModules.delegates.__get__('library.config');
				__private = library.rewiredModules.delegates.__get__('__private');
				done();
			});

			beforeEach(done => {
				__private.keypairs = {};
				config.forging.force = true;
				config.forging.secret = [];
				done();
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

			it('should return error if encrypted secret uses unsupported hash algorithm', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// method is set to 1: MD5
					encryptedSecret:
						'$1$rounds=1$5d502e8156eeeaf2acf23d801351dda7$f856ab7731c046da5bf7b9f11fdf20fbc1870845633627b82f84151e432d4e4ca5f69a9c40f15bc2a749e28a66c2e11bbdc45049e0a1f53087fbdd542536c19059e294d231f7aaf30a0600a79ef78519$iv=4a500624cba9c3cb3b6e380556e197d6$tag=24a118a1abab32d256a5de013c20539e$version=1.0.0',
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

			it('should return error if number of rounds is incorrect', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// rounds is set to 2 instead of 1
					encryptedSecret:
						'$5$rounds=2$5d502e8156eeeaf2acf23d801351dda7$f856ab7731c046da5bf7b9f11fdf20fbc1870845633627b82f84151e432d4e4ca5f69a9c40f15bc2a749e28a66c2e11bbdc45049e0a1f53087fbdd542536c19059e294d231f7aaf30a0600a79ef78519$iv=4a500624cba9c3cb3b6e380556e197d6$tag=24a118a1abab32d256a5de013c20539e$version=1.0.0',
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

			it('should return error if number of rounds is omitted', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// rounds is removed
					encryptedSecret:
						'$5$5d502e8156eeeaf2acf23d801351dda7$f856ab7731c046da5bf7b9f11fdf20fbc1870845633627b82f84151e432d4e4ca5f69a9c40f15bc2a749e28a66c2e11bbdc45049e0a1f53087fbdd542536c19059e294d231f7aaf30a0600a79ef78519$iv=4a500624cba9c3cb3b6e380556e197d6$tag=24a118a1abab32d256a5de013c20539e$version=1.0.0',
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

			it('should return error if encrypted secret does not decrypt with default secret', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// cipher text is one character short
					encryptedSecret:
						'$5$rounds=1$5d502e8156eeeaf2acf23d801351dda7$f856ab7731c046da5bf7b9f11fdf20fbc1870845633627b82f84151e432d4e4ca5f69a9c40f15bc2a749e28a66c2e11bbdc45049e0a1f53087fbdd542536c19059e294d231f7aaf30a0600a79ef7851$iv=4a500624cba9c3cb3b6e380556e197d6$tag=24a118a1abab32d256a5de013c20539e$version=1.0.0',
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

			it('should return error if encrypted secret has invalid iv', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// iv is 1 character different
					encryptedSecret:
						'$5$rounds=1$5d502e8156eeeaf2acf23d801351dda7$f856ab7731c046da5bf7b9f11fdf20fbc1870845633627b82f84151e432d4e4ca5f69a9c40f15bc2a749e28a66c2e11bbdc45049e0a1f53087fbdd542536c19059e294d231f7aaf30a0600a79ef78519$iv=4a500624cba9c3cb3b6e380556e197d7$tag=24a118a1abab32d256a5de013c20539e$version=1.0.0',
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

			it('should return error if encrypted secret has invalid tag', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// tag is 1 character different
					encryptedSecret:
						'$5$rounds=1$5d502e8156eeeaf2acf23d801351dda7$f856ab7731c046da5bf7b9f11fdf20fbc1870845633627b82f84151e432d4e4ca5f69a9c40f15bc2a749e28a66c2e11bbdc45049e0a1f53087fbdd542536c19059e294d231f7aaf30a0600a79ef78519$iv=4a500624cba9c3cb3b6e380556e197d6$tag=24a118a1abab32d256a5de013c20539f$version=1.0.0',
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

			it('should return error if encrypted secret has shortened tag', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// tag is 4 characters shorter
					encryptedSecret:
						'$5$rounds=1$5d502e8156eeeaf2acf23d801351dda7$f856ab7731c046da5bf7b9f11fdf20fbc1870845633627b82f84151e432d4e4ca5f69a9c40f15bc2a749e28a66c2e11bbdc45049e0a1f53087fbdd542536c19059e294d231f7aaf30a0600a79ef78519$iv=4a500624cba9c3cb3b6e380556e197d6$tag=24a118a1abab32d256a5de013c20$version=1.0.0',
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
					publicKey:
						'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					encryptedSecret:
						'$5$rounds=1$5d502e8156eeeaf2acf23d801351dda7$f856ab7731c046da5bf7b9f11fdf20fbc1870845633627b82f84151e432d4e4ca5f69a9c40f15bc2a749e28a66c2e11bbdc45049e0a1f53087fbdd542536c19059e294d231f7aaf30a0600a79ef78519$iv=4a500624cba9c3cb3b6e380556e197d6$tag=24a118a1abab32d256a5de013c20539e$version=1.0.0',
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
					secret:
						'robust swift deputy enable forget peasant grocery road convince',
					publicKey:
						'35b9364d1733e503599a1e9eefdb4994dd07bb9924acebfec06195cf1a0fa6db',
					encryptedSecret:
						'$5$rounds=1$9fa6f33b0ec75f625e7966e89a9e6f5f$d29a48a96de16df8206dcd26fa95e5692cebbc6bf5a752d9b13a85e83338258297a7432ef28b75dffcc983454bc36cadfa5641f6b8d5eca7f789e08ea5875c$iv=422495961ff94f75d41bc1feccb175dd$tag=ef9295c93120457e0811d62b86f3b736$version=1.0.0',
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
				config.forging.secret = genesisDelegates.delegates.map(delegate => ({
					encryptedSecret: delegate.encryptedSecret,
					publicKey: delegate.publicKey,
				}));

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(101);
					done();
				});
			});
		});
	});
});

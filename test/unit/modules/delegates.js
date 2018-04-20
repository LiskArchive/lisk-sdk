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
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				},
				{
					publicKey:
						'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					encryptedSecret:
						'iterations=1&salt=5c709afdae35d43d4090e9ef31d14d85&cipherText=c205189b91f797c3914f5d82ccc7cccfb3c620cef512c3bf8f50cd280bd5ff1450e8b9be997179582e62bec0cb655ca2eb8ff6833892f9e350dc5182b61bd648cd02f7f95468c7ec51aa3b43&iv=bfae7a255077c6de61a1ec59&tag=59cfd0a55d39a765a84725f4be464179&version=1',
				},
				{
					publicKey:
						'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					encryptedSecret:
						'iterations=1&salt=588600600cd7660cf2346cd390093900&cipherText=6469aca1fe386e709c89c9a1d644abd969e64326f0f27f7be25248727892ec860e1e2dae54d283e65b1d21657a74047fb46ba732d1c83b93c8e2c0c96e98c2a9c4d87d0ac23db6dec9e3728426e3&iv=357d723a607f5baaf1fb218a&tag=f42bc3722b2964806d83a8ca3da2f94d&version=1',
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

			it('should return error if number of iterations is omitted', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// iterations is removed but should be set to 1
					encryptedSecret:
						'salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if number of iterations is incorrect', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// iterations is set to 2 instead of 1
					encryptedSecret:
						'iterations=2&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted secret has no salt', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedSecret:
						'iterations=1&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. No salt provided`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted secret has a modified salt', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// salt is 1 character different
					encryptedSecret:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bc&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted secret has no cipher text', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedSecret:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. No cipher text provided`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted secret has a modified ciphertext', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// cipher text is 1 character different
					encryptedSecret:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d05&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted secret has no iv', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedSecret:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. No IV provided`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted secret has a modified iv', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// iv is 1 character different
					encryptedSecret:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c933&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted secret has no tag', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedSecret:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. No tag provided`
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
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967cb&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
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
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b35859&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. Tag must be 16 bytes`
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
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.secret = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedSecret for publicKey: ${
							accountDetails.publicKey
						}. Public keys do not match`
					);
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
						'iterations=1&salt=b51aba5a50cc44a8badd26bb89eb19c9&cipherText=9e345573201d8d064409deaa9d4125f85974c1309f7bd5087ea84b77cb0d46f1fc71b6f317bcd14de0f1cf76fd25293671273f57266876dc6afd4732b24db6&iv=ecc42c613ad6a72e4320231a&tag=7febd325fbcd7f81f3cd39f055ef356a&version=1',
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

			it('should load secrets in encrypted format with the key with default 1e6 iterations if not set', done => {
				config.forging.secret = [
					{
						publicKey:
							'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
						encryptedSecret:
							'salt=2a9e020d122c1209024b6e8403caf19c&cipherText=d284aeb944666a50acf2bd305b8c7079e20501604529cf89ccf58f5b26f266c5d82f164bc811d39c027bd88aed7e770ce921cf3f362ed3ff0f15a58b48a5646690fab5e9a23a21a799013618b7c59fbd&iv=4e539dfb9a44be708aa17837&tag=8edbb37ca097b772373da97ad00c33b3&version=1',
					},
					{
						publicKey:
							'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
						encryptedSecret:
							'salt=ef9a589ad0a075ac193430695cc232d6&cipherText=67065a7f32cc2fda559c49c34d1263b90571adb36ddf6b733daa52bd6b69e406a302e04b8a48246bf7d617be0145a020c1d50e58bd9db1f825bf363699fe49148038d10d1b74bf42f8de6423&iv=fd598c901751805b524fd33f&tag=90bd6525ba1d23ea2983ccbbb3d87a10&version=1',
					},
					{
						publicKey:
							'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
						encryptedSecret:
							'salt=bed21effed5c283bb137a97077bfd7bf&cipherText=be1937d2aacf07a1f2134ad41d6e2eb0cced3c43ae34b04fba8104a3b19b0a9acf3228fbf1807f21d6ddce32fee226889e1f49f4e7a7b316395b09db7bb36b3aef34f4beef5ac519a2f2a9366227&iv=c22c6fd26486de0de00e5ad9&tag=82bea097c4f4f5fab5fe64c62a92ed89&version=1',
					},
				];

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

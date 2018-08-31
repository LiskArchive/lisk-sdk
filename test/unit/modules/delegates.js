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
const seeder = require('../../common/db_seed');

let db;

describe('delegates', () => {
	var library;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_modules_delegates' } },
			(err, scope) => {
				library = scope;
				db = scope.db;

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

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('__private', () => {
		describe('loadDelegates', () => {
			var loadDelegates;
			var config;
			var __private;

			var delegates = [
				{
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				},
				{
					publicKey:
						'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					encryptedPassphrase:
						'iterations=1&salt=5c709afdae35d43d4090e9ef31d14d85&cipherText=c205189b91f797c3914f5d82ccc7cccfb3c620cef512c3bf8f50cd280bd5ff1450e8b9be997179582e62bec0cb655ca2eb8ff6833892f9e350dc5182b61bd648cd02f7f95468c7ec51aa3b43&iv=bfae7a255077c6de61a1ec59&tag=59cfd0a55d39a765a84725f4be464179&version=1',
				},
				{
					publicKey:
						'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					encryptedPassphrase:
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
				config.forging.delegates = [];
				done();
			});

			it('should not load any delegates when forging.force is false', done => {
				config.forging.force = false;
				config.forging.delegates = delegates;

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should not load any delegates when forging.delegates array is empty', done => {
				config.forging.delegates = [];

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should not load any delegates when forging.delegates list is undefined', done => {
				config.forging.delegates = undefined;

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
					encryptedPassphrase:
						'salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
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
					encryptedPassphrase:
						'iterations=2&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has no salt', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/688
				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Argument must be a string.`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has a modified salt', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// salt is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bc&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has no cipher text', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/688
				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Argument must be a string.`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has a modified ciphertext', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// cipher text is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d05&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has no iv', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/688
				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Argument must be a string.`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has a modified iv', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// iv is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c933&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has no tag', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&version=1',
				};

				config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/688
				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Argument must be a string.`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has invalid tag', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// tag is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967cb&version=1',
				};

				config.forging.delegates = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Unsupported state or unable to authenticate data`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has shortened tag', done => {
				var accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// tag is 4 characters shorter
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b35859&version=1',
				};

				config.forging.delegates = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Tag must be 16 bytes.`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if publicKeys do not match', done => {
				var accountDetails = {
					publicKey:
						'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Public keys do not match`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if account does not exist', done => {
				var randomAccount = {
					passphrase:
						'robust swift deputy enable forget peasant grocery road convince',
					publicKey:
						'35b9364d1733e503599a1e9eefdb4994dd07bb9924acebfec06195cf1a0fa6db',
					encryptedPassphrase:
						'iterations=1&salt=b51aba5a50cc44a8badd26bb89eb19c9&cipherText=9e345573201d8d064409deaa9d4125f85974c1309f7bd5087ea84b77cb0d46f1fc71b6f317bcd14de0f1cf76fd25293671273f57266876dc6afd4732b24db6&iv=ecc42c613ad6a72e4320231a&tag=7febd325fbcd7f81f3cd39f055ef356a&version=1',
				};
				var accountDetails = {
					encryptedPassphrase: randomAccount.encryptedPassphrase,
					publicKey: randomAccount.publicKey,
				};

				config.forging.delegates = [accountDetails];

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

			it('should ignore passphrases which do not belong to a delegate', done => {
				config.forging.delegates = [
					{
						encryptedPassphrase: accountFixtures.genesis.encryptedPassphrase,
						publicKey: accountFixtures.genesis.publicKey,
					},
				];

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should load delegates in encrypted format with the key', done => {
				config.forging.delegates = delegates;

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(
						delegates.length
					);
					done();
				});
			});

			it('should load delegates in encrypted format with the key with default 1e6 iterations if not set', done => {
				config.forging.delegates = [
					{
						publicKey:
							'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
						encryptedPassphrase:
							'salt=2a9e020d122c1209024b6e8403caf19c&cipherText=d284aeb944666a50acf2bd305b8c7079e20501604529cf89ccf58f5b26f266c5d82f164bc811d39c027bd88aed7e770ce921cf3f362ed3ff0f15a58b48a5646690fab5e9a23a21a799013618b7c59fbd&iv=4e539dfb9a44be708aa17837&tag=8edbb37ca097b772373da97ad00c33b3&version=1',
					},
					{
						publicKey:
							'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
						encryptedPassphrase:
							'salt=ef9a589ad0a075ac193430695cc232d6&cipherText=67065a7f32cc2fda559c49c34d1263b90571adb36ddf6b733daa52bd6b69e406a302e04b8a48246bf7d617be0145a020c1d50e58bd9db1f825bf363699fe49148038d10d1b74bf42f8de6423&iv=fd598c901751805b524fd33f&tag=90bd6525ba1d23ea2983ccbbb3d87a10&version=1',
					},
					{
						publicKey:
							'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
						encryptedPassphrase:
							'salt=bed21effed5c283bb137a97077bfd7bf&cipherText=be1937d2aacf07a1f2134ad41d6e2eb0cced3c43ae34b04fba8104a3b19b0a9acf3228fbf1807f21d6ddce32fee226889e1f49f4e7a7b316395b09db7bb36b3aef34f4beef5ac519a2f2a9366227&iv=c22c6fd26486de0de00e5ad9&tag=82bea097c4f4f5fab5fe64c62a92ed89&version=1',
					},
				];

				loadDelegates(err => {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(
						delegates.length
					);
					done();
				});
			});

			it('should load all 101 delegates', done => {
				config.forging.delegates = genesisDelegates.delegates.map(delegate => ({
					encryptedPassphrase: delegate.encryptedPassphrase,
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

	describe('shared', () => {
		const validDelegate = genesisDelegates.delegates[0];

		describe('getForgingStatistics', () => {
			it('should fail if invalid address is passed', done => {
				library.modules.delegates.shared.getForgingStatistics(
					{ address: 'InvalidAddress' },
					(err, data) => {
						expect(err).to.be.eql('Account not found');
						expect(data).to.be.undefined;
						done();
					}
				);
			});
			it('should fail if non-delegate address is passed', done => {
				// To keep the genesis delegates we are not resetting the seeds
				seeder
					.seedAccounts(db)
					.then(() => {
						const validAccount = seeder.getAccounts()[0];
						library.modules.delegates.shared.getForgingStatistics(
							{ address: validAccount.address },
							(err, data) => {
								expect(err).to.be.eql('Account is not a delegate');
								expect(data).to.be.undefined;
								done();
							}
						);
					})
					.catch(done);
			});
			it('should be ok if a valid delegate address is passed', done => {
				library.modules.delegates.shared.getForgingStatistics(
					{ address: validDelegate.address },
					(err, data) => {
						expect(err).to.be.null;
						expect(data).to.have.keys('count', 'rewards', 'fees', 'forged');
						done();
					}
				);
			});
			it('should aggregate the data runtime if start and end is provided', done => {
				sinonSandbox.spy(library.modules.blocks.utils, 'aggregateBlocksReward');
				sinonSandbox.spy(library.modules.accounts, 'getAccount');

				const params = {
					address: validDelegate.address,
					end: Date.now(),
					start: Date.now() - 7,
				};

				library.modules.delegates.shared.getForgingStatistics(
					params,
					(err, data) => {
						expect(err).to.be.null;
						expect(data).to.have.keys('count', 'rewards', 'fees', 'forged');
						expect(library.modules.blocks.utils.aggregateBlocksReward).to.be
							.calledOnce;
						expect(
							library.modules.blocks.utils.aggregateBlocksReward.firstCall
								.args[0]
						).to.be.eql(params);
						expect(library.modules.accounts.getAccount).to.not.been.called;
						done();
					}
				);
			});
			it('should aggregate the data runtime if start is omitted', done => {
				sinonSandbox.spy(library.modules.blocks.utils, 'aggregateBlocksReward');
				sinonSandbox.spy(library.modules.accounts, 'getAccount');

				const params = {
					address: validDelegate.address,
					end: Date.now(),
				};

				library.modules.delegates.shared.getForgingStatistics(
					params,
					(err, data) => {
						expect(err).to.be.null;
						expect(data).to.have.keys('count', 'rewards', 'fees', 'forged');
						expect(library.modules.blocks.utils.aggregateBlocksReward).to.be
							.calledOnce;
						expect(
							library.modules.blocks.utils.aggregateBlocksReward.firstCall
								.args[0]
						).to.be.eql(params);
						expect(library.modules.accounts.getAccount).to.not.been.called;
						done();
					}
				);
			});

			it('should aggregate the data runtime if end is omitted', done => {
				sinonSandbox.spy(library.modules.blocks.utils, 'aggregateBlocksReward');
				sinonSandbox.spy(library.modules.accounts, 'getAccount');

				const params = {
					address: validDelegate.address,
					start: Date.now() - 7,
				};

				library.modules.delegates.shared.getForgingStatistics(
					params,
					(err, data) => {
						expect(err).to.be.null;
						expect(data).to.have.keys('count', 'rewards', 'fees', 'forged');
						expect(library.modules.blocks.utils.aggregateBlocksReward).to.be
							.calledOnce;
						expect(
							library.modules.blocks.utils.aggregateBlocksReward.firstCall
								.args[0]
						).to.be.eql(params);
						expect(library.modules.accounts.getAccount).to.not.been.called;
						done();
					}
				);
			});

			it('should fetch data from accounts if both start and end is omitted', done => {
				sinonSandbox.spy(library.modules.blocks.utils, 'aggregateBlocksReward');
				sinonSandbox.spy(library.modules.accounts, 'getAccount');

				const params = {
					address: validDelegate.address,
				};

				library.modules.delegates.shared.getForgingStatistics(
					params,
					(err, data) => {
						expect(err).to.be.null;
						expect(data).to.have.keys('count', 'rewards', 'fees', 'forged');
						expect(library.modules.blocks.utils.aggregateBlocksReward).to.not
							.been.called;
						expect(
							library.modules.accounts.getAccount.firstCall.args[0]
						).to.be.eql(params);
						expect(library.modules.accounts.getAccount).to.be.calledOnce;
						done();
					}
				);
			});
		});
	});
});

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

const {
	getPrivateAndPublicKeyFromPassphrase,
} = require('@liskhq/lisk-cryptography');
const genesisDelegates = require('../../../../data/genesis_delegates.json');
const delegatesRoundsList = require('../../../../data/delegates_rounds_list.json');
const accountFixtures = require('../../../../fixtures/accounts');
const application = require('../../../../common/application');

const exceptions = global.exceptions;

describe('delegates', () => {
	let library;
	let defaultPassword;
	const testDelegate = genesisDelegates.delegates[0];

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_modules_delegates' } },
			(err, scope) => {
				library = scope;
				// Set delegates module as loaded to allow manual forging
				library.rewiredModules.delegates.__set__('__private.loaded', true);
				// Load forging delegates
				library.rewiredModules.delegates.__get__('__private');
				defaultPassword = library.config.forging.defaultPassword;
				done(err);
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	afterEach(() => sinonSandbox.restore());

	describe('fork', () => {
		const cause = 'aCause';
		const dummyBlock = {
			height: 1,
			generaterPublicKey: 'aDelegatePublicKey',
			timestamp: 12312344,
			id: 1231234234,
			previousBlock: 1243453543,
			cause,
		};

		beforeEach(async () => {
			sinonSandbox
				.stub(library.components.storage.entities.Account, 'insertFork')
				.resolves();
			library.modules.delegates.fork(dummyBlock, cause);
		});

		it('should call library.channel.publish with "chain:delegates:fork"', async () => {
			const fork = {
				delegatePublicKey: dummyBlock.generatorPublicKey,
				blockTimestamp: dummyBlock.timestamp,
				blockId: dummyBlock.id,
				blockHeight: dummyBlock.height,
				previousBlockId: dummyBlock.previousBlock,
				cause,
			};
			const channel = library.rewiredModules.delegates.__get__(
				'library.channel'
			);
			expect(channel.publish).to.be.calledWithExactly(
				'chain:delegates:fork',
				fork
			);
		});
	});

	describe('updateForgingStatus', () => {
		let __private;

		beforeEach(async () => {
			__private = library.rewiredModules.delegates.__get__('__private');
		});

		it('should return error with invalid password', async () => {
			try {
				await library.modules.delegates.updateForgingStatus(
					testDelegate.publicKey,
					'Invalid password',
					true
				);
			} catch (err) {
				expect(err.message).to.equal(
					'Invalid password and public key combination'
				);
			}
		});

		it('should return error with invalid publicKey', async () => {
			const invalidPublicKey =
				'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';

			try {
				await library.modules.delegates.updateForgingStatus(
					invalidPublicKey,
					defaultPassword,
					true
				);
			} catch (err) {
				expect(err.message).to.equal(
					'Delegate with publicKey: 9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a not found'
				);
			}
		});

		it('should return error with non delegate account', async () => {
			try {
				await library.modules.delegates.updateForgingStatus(
					accountFixtures.genesis.publicKey,
					accountFixtures.genesis.password,
					true
				);
			} catch (err) {
				expect(err.message).to.equal(
					'Delegate with publicKey: c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f not found'
				);
			}
		});

		it('should update forging from enabled to disabled', async () => {
			library.modules.accounts.getAccount(
				{ publicKey: testDelegate.publicKey },
				async (err, account) => {
					expect(err).to.be.null;
					expect(__private.keypairs[testDelegate.publicKey]).to.not.be
						.undefined;
					expect(account.publicKey).to.equal(testDelegate.publicKey);

					const data = await library.modules.delegates.updateForgingStatus(
						testDelegate.publicKey,
						testDelegate.password,
						false
					);

					expect(__private.keypairs[testDelegate.publicKey]).to.be.undefined;
					expect(data.publicKey).to.equal(testDelegate.publicKey);
				}
			);
		});

		it('should update forging from disabled to enabled', async () => {
			library.modules.accounts.getAccount(
				{ publicKey: testDelegate.publicKey },
				async (err, account) => {
					expect(err).to.be.null;
					expect(__private.keypairs[testDelegate.publicKey]).to.be.undefined;
					expect(account.publicKey).to.equal(testDelegate.publicKey);

					const data = await library.modules.delegates.updateForgingStatus(
						testDelegate.publicKey,
						testDelegate.password,
						true
					);

					expect(__private.keypairs[testDelegate.publicKey]).to.not.be
						.undefined;
					expect(data.publicKey).to.equal(testDelegate.publicKey);
				}
			);
		});
	});

	describe('generateDelegateList', () => {
		let __private;
		let sourceStub;
		let originalExceptions;
		const dummyDelegateList = ['x', 'y', 'z'];
		beforeEach(done => {
			__private = library.rewiredModules.delegates.__get__('__private');
			sourceStub = sinonSandbox.stub().callsArgWith(0, null, dummyDelegateList);
			originalExceptions = _.clone(exceptions.ignoreDelegateListCacheForRounds);
			done();
		});

		afterEach(done => {
			exceptions.ignoreDelegateListCacheForRounds = originalExceptions;
			done();
		});

		it('should return the cached delegate list when there is cache for the round', done => {
			// Arrange
			const initialSate = {
				1: ['j', 'k', 'l'],
			};
			__private.delegatesListCache = { ...initialSate };

			// Act
			library.modules.delegates.generateDelegateList(
				1,
				sourceStub,
				(err, delegateList) => {
					// Assert
					expect(delegateList).to.deep.equal(initialSate[1]);
					expect(sourceStub).to.not.been.called;
					done();
				}
			);
		});

		it('should call the source function when cache not found', done => {
			// Arrange
			const initialSate = {
				1: ['j', 'k', 'l'],
			};
			__private.delegatesListCache = { ...initialSate };

			// Act
			library.modules.delegates.generateDelegateList(
				2,
				sourceStub,
				(err, delegateList) => {
					// Assert
					expect(sourceStub).to.been.called;
					expect(delegateList).to.deep.equal(dummyDelegateList);
					done();
				}
			);
		});

		it('should update the delegate list cache when source function was executed', done => {
			// Arrange
			const initialSate = {
				1: ['j', 'k', 'l'],
			};
			__private.delegatesListCache = { ...initialSate };
			const shuffledDummyDelegateList = ['y', 'z', 'x'];

			// Act
			library.modules.delegates.generateDelegateList(
				2,
				sourceStub,
				(err, delegateList) => {
					// Assert
					expect(delegateList).to.deep.equal(dummyDelegateList);
					expect(__private.delegatesListCache['2']).to.deep.equal(
						shuffledDummyDelegateList
					);
					done();
				}
			);
		});

		it('should not update the delegate list cache when round is an exception', done => {
			// Arrange
			const initialSate = {
				1: ['j', 'k', 'l'],
			};
			__private.delegatesListCache = { ...initialSate };
			exceptions.ignoreDelegateListCacheForRounds.push(666);

			// Act
			library.modules.delegates.generateDelegateList(
				666,
				sourceStub,
				(err, delegateList) => {
					// Assert

					expect(delegateList).to.deep.equal(dummyDelegateList);
					expect(__private.delegatesListCache).to.not.have.property('666');
					done();
				}
			);
		});
	});

	describe('__private', () => {
		describe('loadDelegates', () => {
			let loadDelegates;
			let config;
			let __private;

			const delegates = [
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
				const accountDetails = {
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
				const accountDetails = {
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
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Encrypted passphrase to parse must have only one value per key.`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has a modified salt', done => {
				const accountDetails = {
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
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Encrypted passphrase to parse must have only one value per key.`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has a modified ciphertext', done => {
				const accountDetails = {
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
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Encrypted passphrase to parse must have only one value per key.`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has a modified iv', done => {
				const accountDetails = {
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
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&version=1',
				};

				config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				loadDelegates(err => {
					expect(err).to.equal(
						`Invalid encryptedPassphrase for publicKey: ${
							accountDetails.publicKey
						}. Encrypted passphrase to parse must have only one value per key.`
					);
					expect(Object.keys(__private.keypairs).length).to.equal(0);
					done();
				});
			});

			it('should return error if encrypted passphrase has invalid tag', done => {
				const accountDetails = {
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
				const accountDetails = {
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
				const accountDetails = {
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
				const randomAccount = {
					passphrase:
						'robust swift deputy enable forget peasant grocery road convince',
					publicKey:
						'35b9364d1733e503599a1e9eefdb4994dd07bb9924acebfec06195cf1a0fa6db',
					encryptedPassphrase:
						'iterations=1&salt=b51aba5a50cc44a8badd26bb89eb19c9&cipherText=9e345573201d8d064409deaa9d4125f85974c1309f7bd5087ea84b77cb0d46f1fc71b6f317bcd14de0f1cf76fd25293671273f57266876dc6afd4732b24db6&iv=ecc42c613ad6a72e4320231a&tag=7febd325fbcd7f81f3cd39f055ef356a&version=1',
				};
				const accountDetails = {
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

		describe('getDelegateKeypairForCurrentSlot', () => {
			let delegates;
			let __private;
			let originalGenerateDelegateList;

			const genesis1 = {
				passphrase:
					'robust swift grocery peasant forget share enable convince deputy road keep cheap',
				publicKey:
					'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
			};

			const genesis2 = {
				passphrase:
					'weapon van trap again sustain write useless great pottery urge month nominee',
				publicKey:
					'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
			};

			const genesis3 = {
				passphrase:
					'course genuine appear elite library fabric armed chat pipe scissors mask novel',
				publicKey:
					'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
			};

			let genesis1Keypair;
			let genesis2Keypair;
			let genesis3Keypair;

			before(done => {
				delegates = library.rewiredModules.delegates.__get__('self');
				__private = library.rewiredModules.delegates.__get__('__private');

				genesis1Keypair = getPrivateAndPublicKeyFromPassphrase(
					genesis1.passphrase
				);
				genesis2Keypair = getPrivateAndPublicKeyFromPassphrase(
					genesis2.passphrase
				);
				genesis3Keypair = getPrivateAndPublicKeyFromPassphrase(
					genesis3.passphrase
				);

				__private.keypairs = {};
				__private.keypairs[genesis1.publicKey] = genesis1Keypair;
				__private.keypairs[genesis2.publicKey] = genesis2Keypair;
				__private.keypairs[genesis3.publicKey] = genesis3Keypair;

				originalGenerateDelegateList = delegates.generateDelegateList;

				done();
			});

			after(done => {
				delegates.generateDelegateList = originalGenerateDelegateList;
				done();
			});

			it('should return genesis_1 keypair for slot N where (N % 101 === 35) in the first round', done => {
				// For round 1, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 35, 53 and 16 respectively.
				const currentSlot = 35;
				const round = 1;

				delegates.generateDelegateList = (roundArg, source, cb) => {
					cb(null, delegatesRoundsList[roundArg]);
				};

				__private.getDelegateKeypairForCurrentSlot(
					currentSlot,
					round,
					(err, keyPair) => {
						expect(err).to.be.null;
						expect(keyPair).to.have.keys('publicKey', 'privateKey');
						expect(keyPair.publicKey).to.deep.equal(genesis1Keypair.publicKey);
						expect(keyPair.privateKey).to.deep.equal(
							genesis1Keypair.privateKey
						);

						done();
					}
				);
			});

			it('should return genesis_2 keypair for slot N where (N % 101 === 73) in the second round', done => {
				// For round 2, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 50, 73 and 100 respectively.
				const currentSlot = 578;
				const round = 2;

				delegates.generateDelegateList = (roundArg, source, cb) => {
					cb(null, delegatesRoundsList[roundArg]);
				};

				__private.getDelegateKeypairForCurrentSlot(
					currentSlot,
					round,
					(err, keyPair) => {
						expect(err).to.be.null;
						expect(keyPair).to.have.keys('publicKey', 'privateKey');
						expect(keyPair.publicKey).to.deep.equal(genesis2Keypair.publicKey);
						expect(keyPair.privateKey).to.deep.equal(
							genesis2Keypair.privateKey
						);

						done();
					}
				);
			});

			it('should return genesis_3 keypair for slot N where (N % 101 === 41) in the third round', done => {
				// For round 3, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 12, 16 and 41 respectively.
				const currentSlot = 1051;
				const round = 3;

				delegates.generateDelegateList = (roundArg, source, cb) => {
					cb(null, delegatesRoundsList[roundArg]);
				};

				__private.getDelegateKeypairForCurrentSlot(
					currentSlot,
					round,
					(err, keyPair) => {
						expect(err).to.be.null;
						expect(keyPair).to.have.keys('publicKey', 'privateKey');
						expect(keyPair.publicKey).to.deep.equal(genesis3Keypair.publicKey);
						expect(keyPair.privateKey).to.deep.equal(
							genesis3Keypair.privateKey
						);

						done();
					}
				);
			});

			it('should return null when the slot does not belong to a public key set in __private.keypairs', done => {
				// For round 4, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 93, 68 and 87 respectively.
				// Any other slot should return null as genesis_1, genesis_2 and genesis_3 are the only one forging delegates set for this test
				const currentSlot = 1;
				const round = 4;

				delegates.generateDelegateList = (roundArg, source, cb) => {
					cb(null, delegatesRoundsList[roundArg]);
				};

				__private.getDelegateKeypairForCurrentSlot(
					currentSlot,
					round,
					(err, keyPair) => {
						expect(err).to.be.null;
						expect(keyPair).to.be.null;
						done();
					}
				);
			});

			it('should return error when `generateDelegateList` fails', done => {
				const currentSlot = 1;
				const round = 4;

				delegates.generateDelegateList = (__round, source, cb) => {
					cb('generateDelegateList error');
				};

				__private.getDelegateKeypairForCurrentSlot(
					currentSlot,
					round,
					(err, keyPair) => {
						expect(err).to.be.eql('generateDelegateList error');
						expect(keyPair).to.be.undefined;
						done();
					}
				);
			});
		});

		describe('__private.delegatesListCache operations', () => {
			let __private;
			beforeEach(done => {
				__private = library.rewiredModules.delegates.__get__('__private');
				done();
			});

			describe('__private.updateDelegateListCache', () => {
				it('should insert the given delegateList array to __private.delegateListCache for given round.', async () => {
					// Arrange
					__private.delegatesListCache = {};
					const delegateListArray = ['a', 'b', 'c'];
					const round = 1;

					// Act
					__private.updateDelegateListCache(round, delegateListArray);

					// Assert
					expect(__private.delegatesListCache).to.have.property(round);
					return expect(__private.delegatesListCache[round]).to.deep.equal(
						delegateListArray
					);
				});

				it('should sort rounds in ascending order.', async () => {
					// Arrange
					__private.delegatesListCache = {
						2: ['x', 'y', 'z'],
					};
					const delegateListArray = ['a', 'b', 'c'];
					const round = 1;

					// Act
					__private.updateDelegateListCache(round, delegateListArray);

					// Assert
					return expect(
						Object.keys(__private.delegatesListCache)
					).to.deep.equal(['1', '2']);
				});

				it('should keep only the last two rounds in the __private.delegateListCache.', async () => {
					// Arrange
					const initialSate = {
						1: ['j', 'k', 'l'],
						2: ['x', 'y', 'z'],
					};
					__private.delegatesListCache = { ...initialSate };
					const delegateListArray = ['a', 'b', 'c'];
					const round = 3;

					// Act
					__private.updateDelegateListCache(round, delegateListArray);

					// Assert
					expect(Object.keys(__private.delegatesListCache)).to.deep.equal([
						'2',
						'3',
					]);
					expect(__private.delegatesListCache['2']).to.deep.equal(
						initialSate['2']
					);
					return expect(__private.delegatesListCache[round]).to.deep.equal(
						delegateListArray
					);
				});

				// See: https://github.com/LiskHQ/lisk/issues/2652
				it('ensures ordering rounds correctly', async () => {
					// Arrange
					const initialSate = {
						9: ['j', 'k', 'l'],
						10: ['x', 'y', 'z'],
					};
					__private.delegatesListCache = { ...initialSate };
					const delegateListArray = ['a', 'b', 'c'];
					const round = 11;

					// Act
					__private.updateDelegateListCache(round, delegateListArray);

					// Assert
					expect(Object.keys(__private.delegatesListCache)).to.deep.equal([
						'10',
						'11',
					]);
					expect(__private.delegatesListCache['10']).to.deep.equal(
						initialSate['10']
					);
					return expect(__private.delegatesListCache[round]).to.deep.equal(
						delegateListArray
					);
				});
			});

			describe('__private.clearDelegateListCache', () => {
				it('should clear __private.delegateListCache object.', async () => {
					// Arrange
					const initialSate = {
						1: ['j', 'k', 'l'],
						2: ['x', 'y', 'z'],
					};
					__private.delegatesListCache = { ...initialSate };

					// Act
					library.modules.delegates.clearDelegateListCache();

					// Assert
					return expect(__private.delegatesListCache).to.deep.equal({});
				});

				it('should not mutate empty __private.delegateListCache object.', async () => {
					// Arrange
					__private.delegatesListCache = {};

					// Act
					library.modules.delegates.clearDelegateListCache();

					// Assert
					return expect(__private.delegatesListCache).to.deep.equal({});
				});
			});
		});
	});
});

/*
 * Copyright © 2019 Lisk Foundation
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
	getPrivateAndPublicKeyBytesFromPassphrase,
} = require('@liskhq/lisk-cryptography');
const forger = require('../../../../../src/modules/chain/forger');
const genesisDelegates = require('../../../data/genesis_delegates.json');
const delegatesRoundsList = require('../../../data/delegates_rounds_list.json');
const accountFixtures = require('../../../fixtures/accounts');

const { Forger, getDelegateKeypairForCurrentSlot } = forger;

describe('forge', () => {
	const mockChannel = {
		publish: sinonSandbox.stub(),
	};
	const mockLogger = {
		debug: sinonSandbox.stub(),
		info: sinonSandbox.stub(),
		warn: sinonSandbox.stub(),
		error: sinonSandbox.stub(),
	};
	const mockStorage = {
		entities: {
			Account: {
				get: sinonSandbox.stub(),
			},
		},
	};
	const testDelegate = genesisDelegates.delegates[0];
	const numOfActiveDelegates = 101;
	const forgingWaitThreshold = 2;

	let forgeModule;
	let defaultPassword;

	afterEach(async () => {
		sinonSandbox.reset();
		sinonSandbox.restore();
	});

	describe('Forger', () => {
		beforeEach(async () => {
			forgeModule = new Forger({
				channel: mockChannel,
				logger: mockLogger,
				storage: mockStorage,
				forgingDelegates: genesisDelegates.delegates,
				forgingForce: false,
				forgingDefaultPassword: testDelegate.password,
				forgingWaitThreshold,
				slots: {
					getSlotNumber: sinonSandbox.stub(),
					getSlotTime: sinonSandbox.stub(),
					calcRound: sinonSandbox.stub(),
					getRealTime: sinonSandbox.stub(),
				},
				roundsModule: {
					generateDelegateList: sinonSandbox.stub(),
				},
				transactionPoolModule: {
					getUnconfirmedTransactionList: sinonSandbox.stub(),
				},
				blocksModule: {
					generateBlock: sinonSandbox.stub(),
				},
				peersModule: {
					isPoorConsensus: sinonSandbox.stub(),
					getLastConsensus: sinonSandbox.stub(),
				},
			});
		});

		describe('updateForgingStatus', () => {
			it('should return error with invalid password', async () => {
				try {
					await forgeModule.updateForgingStatus(
						testDelegate.publicKey,
						'Invalid password',
						true,
					);
				} catch (err) {
					expect(err.message).to.equal(
						'Invalid password and public key combination',
					);
				}
			});

			it('should return error with invalid publicKey', async () => {
				const invalidPublicKey =
					'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';

				try {
					await forgeModule.updateForgingStatus(
						invalidPublicKey,
						defaultPassword,
						true,
					);
				} catch (err) {
					expect(err.message).to.equal(
						'Delegate with publicKey: 9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a not found',
					);
				}
			});

			it('should return error with non delegate account', async () => {
				try {
					await forgeModule.updateForgingStatus(
						accountFixtures.genesis.publicKey,
						accountFixtures.genesis.password,
						true,
					);
				} catch (err) {
					expect(err.message).to.equal(
						'Delegate with publicKey: c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f not found',
					);
				}
			});

			it('should update forging from enabled to disabled', async () => {
				// Arrange
				mockStorage.entities.Account.get.resolves([
					{
						isDelegate: true,
						address: testDelegate.address,
					},
				]);
				forgeModule.keypairs[testDelegate.publicKey] = Buffer.from(
					'privateKey',
					'utf8',
				);

				// Act
				const data = await forgeModule.updateForgingStatus(
					testDelegate.publicKey,
					testDelegate.password,
					false,
				);

				// Assert
				expect(forgeModule.keypairs[testDelegate.publicKey]).to.be.undefined;
				expect(data.publicKey).to.equal(testDelegate.publicKey);
			});

			it('should update forging from disabled to enabled', async () => {
				const data = await forgeModule.updateForgingStatus(
					testDelegate.publicKey,
					testDelegate.password,
					true,
				);

				expect(forgeModule.keypairs[testDelegate.publicKey]).not.to.be
					.undefined;
				expect(data.publicKey).to.equal(testDelegate.publicKey);
			});
		});

		describe('loadDelegates', () => {
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

			beforeEach(async () => {
				forgeModule.config.forging.force = true;
				forgeModule.config.forging.delegates = [];
				mockStorage.entities.Account.get.resolves([
					{
						isDelegate: true,
						address: testDelegate.address,
					},
				]);
			});

			it('should not load any delegates when forging.force is false', async () => {
				forgeModule.config.forging.force = false;
				forgeModule.config.forging.delegates = delegates;

				await forgeModule.loadDelegates();
				return expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
			});

			it('should not load any delegates when forging.delegates array is empty', async () => {
				forgeModule.config.forging.force = true;
				forgeModule.config.forging.delegates = [];

				await forgeModule.loadDelegates();
				return expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
			});

			it('should not load any delegates when forging.delegates list is undefined', async () => {
				forgeModule.config.forging.delegates = undefined;

				await forgeModule.loadDelegates();
				return expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
			});

			it('should return error if number of iterations is omitted', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// iterations is removed but should be set to 1
					encryptedPassphrase:
						'salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Unsupported state or unable to authenticate data`,
				);
			});

			it('should return error if number of iterations is incorrect', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// iterations is set to 2 instead of 1
					encryptedPassphrase:
						'iterations=2&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Unsupported state or unable to authenticate data`,
				);
			});

			it('should return error if encrypted passphrase has no salt', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Encrypted passphrase to parse must have only one value per key.`,
				);
			});

			it('if encrypted passphrase has no salt forgeModule.keypairs should be empty', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should return error if encrypted passphrase has a modified salt', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// salt is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bc&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Unsupported state or unable to authenticate data`,
				);
			});

			it('if encrypted passphrase has a modified salt forgeModule.keypairs should be empty', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// salt is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bc&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should return error if encrypted passphrase has no cipher text', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Encrypted passphrase to parse must have only one value per key.`,
				);
			});

			it('if encrypted passphrase has no cipher text forgeModule.keypairs should be empty', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should return error if encrypted passphrase has a modified ciphertext', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// cipher text is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d05&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Unsupported state or unable to authenticate data`,
				);
			});

			it('if encrypted passphrase has a modified ciphertext forgeModule.keypairs should be empty', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// cipher text is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d05&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should return error if encrypted passphrase has no iv', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Encrypted passphrase to parse must have only one value per key.`,
				);
			});

			it('if encrypted passphrase has no iv forgeModule.keypairs should be empty', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should return error if encrypted passphrase has a modified iv', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// iv is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c933&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Unsupported state or unable to authenticate data`,
				);
			});

			it('if encrypted passphrase has a modified iv forgeModule.keypairs should be empty', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// iv is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c933&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should return error if encrypted passphrase has no tag', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Encrypted passphrase to parse must have only one value per key.`,
				);
			});

			it('if encrypted passphrase has no tag forgeModule.keypairs should be empty', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				// TODO: Update the expectation after fixing
				// https://github.com/LiskHQ/lisk-elements/issues/1162
				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should return error if encrypted passphrase has invalid tag', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// tag is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967cb&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Unsupported state or unable to authenticate data`,
				);
			});

			it('if encrypted passphrase has invalid tag forgeModule.keypairs should be empty', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// tag is 1 character different
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967cb&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should return error if encrypted passphrase has shortened tag', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// tag is 4 characters shorter
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b35859&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Tag must be 16 bytes.`,
				);
			});

			it('if encrypted passphrase has shortened tag forgeModule.keypairs should be empty', async () => {
				const accountDetails = {
					publicKey:
						'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					// tag is 4 characters shorter
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b35859&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should return error if publicKeys do not match', async () => {
				const accountDetails = {
					publicKey:
						'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					`Invalid encryptedPassphrase for publicKey: ${
						accountDetails.publicKey
					}. Public keys do not match`,
				);
			});

			it('if publicKeys do not match forgeModule.keypairs should be empty', async () => {
				const accountDetails = {
					publicKey:
						'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					encryptedPassphrase:
						'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
				};

				forgeModule.config.forging.delegates = [accountDetails];

				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should return error if account does not exist', async () => {
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

				mockStorage.entities.Account.get.resolves([]);

				forgeModule.config.forging.delegates = [accountDetails];

				return expect(forgeModule.loadDelegates()).to.be.rejectedWith(
					[
						'Account with public key:',
						accountDetails.publicKey.toString('hex'),
						'not found',
					].join(' '),
				);
			});

			it('if account does not exist forgeModule.keypairs should be empty', async () => {
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

				mockStorage.entities.Account.get.resolves([]);

				forgeModule.config.forging.delegates = [accountDetails];

				try {
					await forgeModule.loadDelegates();
					// Next line is to make sure the above method actually failed; should never execute.
					expect(false).to.be(true);
				} catch (err) {
					expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
				}
			});

			it('should ignore passphrases which do not belong to a delegate', async () => {
				forgeModule.config.forging.delegates = [
					{
						encryptedPassphrase: accountFixtures.genesis.encryptedPassphrase,
						publicKey: accountFixtures.genesis.publicKey,
					},
				];
				mockStorage.entities.Account.get.resolves([
					{
						isDelegate: false,
						address: accountFixtures.genesis.address,
					},
				]);

				await forgeModule.loadDelegates();
				return expect(Object.keys(forgeModule.keypairs).length).to.equal(0);
			});

			it('should load delegates in encrypted format with the key', async () => {
				forgeModule.config.forging.delegates = delegates;

				await forgeModule.loadDelegates();
				return expect(Object.keys(forgeModule.keypairs).length).to.equal(
					delegates.length,
				);
			});

			it('should load delegates in encrypted format with the key with default 1e6 iterations if not set', async () => {
				forgeModule.config.forging.delegates = [
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

				await forgeModule.loadDelegates();
				return expect(Object.keys(forgeModule.keypairs).length).to.equal(
					delegates.length,
				);
			});

			it('should load all 101 delegates', async () => {
				forgeModule.config.forging.delegates = genesisDelegates.delegates.map(
					delegate => ({
						encryptedPassphrase: delegate.encryptedPassphrase,
						publicKey: delegate.publicKey,
					}),
				);

				await forgeModule.loadDelegates();
				return expect(Object.keys(forgeModule.keypairs).length).to.equal(101);
			});
		});

		describe('forge', () => {
			let getSlotNumberStub;

			const lastBlock = {
				id: '6846255774763267134',
				height: 9187702,
				timestamp: 93716450,
			};
			const currentSlot = 5;
			const lastBlockSlot = 4;
			const forgedBlock = {
				height: 1,
				id: '1',
				timestamp: Date.now(),
				reward: 1,
			};

			beforeEach(async () => {
				forgeModule.blocksModule.lastBlock = lastBlock;
				getSlotNumberStub = forgeModule.slots.getSlotNumber;

				getSlotNumberStub.withArgs().returns(currentSlot);
				getSlotNumberStub.withArgs(lastBlock.timestamp).returns(lastBlockSlot);
				forgeModule.peersModule.isPoorConsensus.resolves(false);
				forgeModule.blocksModule.generateBlock.resolves(forgedBlock);
				forgeModule.keypairs[testDelegate.publicKey] = Buffer.from(
					'privateKey',
					'utf8',
				);

				// TODO: Check why its not reset through sandbox.reset in after each of previous tests
				mockLogger.error.reset();
				mockLogger.debug.reset();
				mockLogger.info.reset();
			});

			it('should log message and return if current block slot is same as last block slot', async () => {
				getSlotNumberStub.withArgs().returns(currentSlot);
				getSlotNumberStub.withArgs(lastBlock.timestamp).returns(currentSlot);

				const data = await forgeModule.forge();

				expect(data).to.be.undefined;
				expect(mockLogger.debug).to.be.calledOnce;
				expect(mockLogger.debug).to.be.calledWith(
					'Block already forged for the current slot',
				);
			});

			it('should log message and return if getDelegateKeypairForCurrentSlot failed', async () => {
				const rejectionError = new Error('CustomKeypairForCurrentError');
				sinonSandbox
					.stub(forger, 'getDelegateKeypairForCurrentSlot')
					.rejects(rejectionError);
				let data;

				try {
					data = await forgeModule.forge();
				} catch (e) {
					expect(data).to.be.undefined;
					expect(mockLogger.error).to.be.calledOnce;
					expect(mockLogger.error).to.be.calledWithExactly(
						'Skipping delegate slot',
						rejectionError,
					);
				}
			});

			it('should log message and return if getDelegateKeypairForCurrentSlot return no result', async () => {
				sinonSandbox
					.stub(forger, 'getDelegateKeypairForCurrentSlot')
					.resolves(null);

				const data = await forgeModule.forge();
				expect(data).to.be.undefined;
				expect(mockLogger.debug).to.be.calledOnce;
				expect(mockLogger.debug).to.be.calledWith('Waiting for delegate slot');
			});

			it('should log message and return if there is poor consensus', async () => {
				const lastConsensus = 10;

				sinonSandbox
					.stub(forger, 'getDelegateKeypairForCurrentSlot')
					.resolves(testDelegate);
				forgeModule.peersModule.isPoorConsensus.resolves(true);
				forgeModule.peersModule.getLastConsensus.returns(lastConsensus);

				const data = await forgeModule.forge();

				expect(data).to.be.undefined;
				expect(mockLogger.error).to.be.calledOnce;
				expect(mockLogger.error).to.be.calledWithExactly(
					'Failed to generate block within delegate slot',
					`Inadequate broadhash consensus before forging a block: ${lastConsensus} %`,
				);
			});

			it('should wait for threshold time if last block not received', async () => {
				sinonSandbox
					.stub(forger, 'getDelegateKeypairForCurrentSlot')
					.resolves(testDelegate);
				const waitThresholdMs = forgingWaitThreshold * 1000;
				const currentSlotTime = new Date(2019, 0, 1, 0, 0, 0).getTime();
				const currentTime = new Date(2019, 0, 1, 0, 0, 2).getTime();
				const clock = sinonSandbox.useFakeTimers({
					now: currentTime,
					shouldAdvanceTime: true,
				});

				forgeModule.slots.getRealTime.returns(currentSlotTime);

				const changedLastBlockSlot = currentSlot - 2;
				getSlotNumberStub
					.withArgs(lastBlock.timestamp)
					.returns(changedLastBlockSlot);

				await forgeModule.forge();
				expect(forgeModule.blocksModule.generateBlock).to.not.been.called;
				expect(mockLogger.info).to.be.calledTwice;
				expect(mockLogger.info.secondCall.args).to.be.eql([
					'Skipping forging to wait for last block',
				]);
				expect(mockLogger.debug).to.be.calledWithExactly('Slot information', {
					currentSlot,
					lastBlockSlot: changedLastBlockSlot,
					waitThreshold: waitThresholdMs,
				});

				clock.restore();
			});

			it('should not wait if threshold time passed and last block not received', async () => {
				sinonSandbox
					.stub(forger, 'getDelegateKeypairForCurrentSlot')
					.resolves(testDelegate);
				const currentSlotTime = new Date(2019, 0, 1, 0, 0, 0).getTime();
				const currentTime = new Date(2019, 0, 1, 0, 0, 3).getTime();
				const clock = sinonSandbox.useFakeTimers({
					now: currentTime,
					shouldAdvanceTime: true,
				});

				const changedLastBlockSlot = currentSlot - 2;

				forgeModule.slots.getRealTime.returns(currentSlotTime);
				getSlotNumberStub
					.withArgs(lastBlock.timestamp)
					.returns(changedLastBlockSlot);

				await forgeModule.forge();
				expect(forgeModule.blocksModule.generateBlock).to.be.calledOnce;
				clock.restore();
			});

			it('should not wait if threshold remaining but last block already received', async () => {
				sinonSandbox
					.stub(forger, 'getDelegateKeypairForCurrentSlot')
					.resolves(testDelegate);
				const currentSlotTime = new Date(2019, 0, 1, 0, 0, 0).getTime();
				const currentTime = new Date(2019, 0, 1, 0, 0, 1).getTime();
				const clock = sinonSandbox.useFakeTimers({
					now: currentTime,
					shouldAdvanceTime: true,
				});

				const lastBlockSlotChanged = currentSlot - 1;
				forgeModule.slots.getRealTime.returns(currentSlotTime);
				getSlotNumberStub
					.withArgs(lastBlock.timestamp)
					.returns(lastBlockSlotChanged);

				await forgeModule.forge();
				expect(forgeModule.blocksModule.generateBlock).to.be.calledOnce;
				clock.restore();
			});
		});
	});

	describe('getDelegateKeypairForCurrentSlot', () => {
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
		let delegatesModuleStub;

		beforeEach(async () => {
			const genesis1KeypairBuffer = getPrivateAndPublicKeyBytesFromPassphrase(
				genesis1.passphrase,
			);
			genesis1Keypair = {
				publicKey: genesis1KeypairBuffer.publicKeyBytes,
				privateKey: genesis1KeypairBuffer.privateKeyBytes,
			};
			const genesis2KeypairBuffer = getPrivateAndPublicKeyBytesFromPassphrase(
				genesis2.passphrase,
			);
			genesis2Keypair = {
				publicKey: genesis2KeypairBuffer.publicKeyBytes,
				privateKey: genesis2KeypairBuffer.privateKeyBytes,
			};
			const genesis3KeypairBuffer = getPrivateAndPublicKeyBytesFromPassphrase(
				genesis3.passphrase,
			);
			genesis3Keypair = {
				publicKey: genesis3KeypairBuffer.publicKeyBytes,
				privateKey: genesis3KeypairBuffer.privateKeyBytes,
			};

			forgeModule.keypairs[genesis1.publicKey] = genesis1Keypair;
			forgeModule.keypairs[genesis2.publicKey] = genesis2Keypair;
			forgeModule.keypairs[genesis3.publicKey] = genesis3Keypair;

			delegatesModuleStub = {
				generateDelegateList: sinonSandbox.stub(),
			};
		});

		it('should return genesis_1 keypair for slot N where (N % 101 === 35) in the first round', async () => {
			// For round 1, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 35, 53 and 16 respectively.
			const currentSlot = 35;
			const round = 1;

			delegatesModuleStub.generateDelegateList
				.withArgs(round)
				.resolves(delegatesRoundsList[round]);

			const { publicKey, privateKey } = await getDelegateKeypairForCurrentSlot(
				delegatesModuleStub,
				forgeModule.keypairs,
				currentSlot,
				round,
				numOfActiveDelegates,
			);
			expect(publicKey).to.deep.equal(genesis1Keypair.publicKey);
			expect(privateKey).to.deep.equal(genesis1Keypair.privateKey);
		});

		it('should return genesis_2 keypair for slot N where (N % 101 === 73) in the second round', async () => {
			// For round 2, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 50, 73 and 100 respectively.
			const currentSlot = 578;
			const round = 2;

			delegatesModuleStub.generateDelegateList.resolves(
				delegatesRoundsList[round],
			);

			const { publicKey, privateKey } = await getDelegateKeypairForCurrentSlot(
				delegatesModuleStub,
				forgeModule.keypairs,
				currentSlot,
				round,
				numOfActiveDelegates,
			);
			expect(publicKey).to.deep.equal(genesis2Keypair.publicKey);
			expect(privateKey).to.deep.equal(genesis2Keypair.privateKey);
		});

		it('should return genesis_3 keypair for slot N where (N % 101 === 41) in the third round', async () => {
			// For round 3, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 12, 16 and 41 respectively.
			const currentSlot = 1051;
			const round = 3;

			delegatesModuleStub.generateDelegateList.resolves(
				delegatesRoundsList[round],
			);

			const { publicKey, privateKey } = await getDelegateKeypairForCurrentSlot(
				delegatesModuleStub,
				forgeModule.keypairs,
				currentSlot,
				round,
				numOfActiveDelegates,
			);
			expect(publicKey).to.deep.equal(genesis3Keypair.publicKey);
			expect(privateKey).to.deep.equal(genesis3Keypair.privateKey);
		});

		it('should return null when the slot does not belong to a public key set in keypairs', async () => {
			// For round 4, delegates genesis_1, genesis_2 and genesis_3 should forge for slots 93, 68 and 87 respectively.
			// Any other slot should return null as genesis_1, genesis_2 and genesis_3 are the only one forging delegates set for this test
			const currentSlot = 1;
			const round = 4;

			delegatesModuleStub.generateDelegateList.resolves(
				delegatesRoundsList[round],
			);

			const keyPair = await getDelegateKeypairForCurrentSlot(
				delegatesModuleStub,
				forgeModule.keypairs,
				currentSlot,
				round,
				numOfActiveDelegates,
			);
			expect(keyPair).to.be.null;
		});

		it('should return error when `generateDelegateList` fails', async () => {
			const currentSlot = 1;
			const round = 4;

			const expectedError = new Error('generateDelegateList error');

			delegatesModuleStub.generateDelegateList.rejects(expectedError);

			try {
				await getDelegateKeypairForCurrentSlot(
					delegatesModuleStub,
					forgeModule.keypairs,
					currentSlot,
					round,
					numOfActiveDelegates,
				);
			} catch (error) {
				expect(error).to.equal(expectedError);
			}
		});
	});
});

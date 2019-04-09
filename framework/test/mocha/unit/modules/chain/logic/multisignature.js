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

const crypto = require('crypto');
const rewire = require('rewire');
const { registerMultisignature } = require('@liskhq/lisk-transactions');
const { getKeys } = require('@liskhq/lisk-cryptography');
const modulesLoader = require('../../../../common/modules_loader');
const randomUtil = require('../../../../common/utils/random');
const accountFixtures = require('../../../../fixtures/accounts');
const slots = require('../../../../../../src/modules/chain/helpers/slots');
const testData = require('./test_data/multisignature');
const {
	createInvalidRegisterMultisignatureTransaction,
} = require('../../../../common/utils/elements');

const { FEES, MULTISIG_CONSTRAINTS } = __testContext.config.constants;
const Multisignature = rewire(
	'../../../../../../src/modules/chain/logic/multisignature'
);

const validKeypair = testData.validKeypair;
const validSender = testData.validSender;
const validTransaction = testData.validTransaction;
const rawValidTransaction = testData.rawValidTransaction;
const multiSigAccount1 = testData.multiSigAccount1;
const multiSigAccount2 = testData.multiSigAccount2;

describe('multisignature', () => {
	let transactionMock;
	// logic is singular, modules are plural
	let accountMock;
	let accountsMock;

	let dummyBlock;
	let multisignature;
	let transaction;
	let rawTransaction;
	let sender;
	let channelStub;

	beforeEach(() => {
		transactionMock = {
			verifySignature: sinonSandbox.stub().returns(1),
			reverse: sinonSandbox.stub().returns(),
		};
		accountMock = {
			merge: sinonSandbox.mock().callsArg(2),
		};
		accountsMock = {
			generateAddressByPublicKey: sinonSandbox
				.stub()
				.returns(getKeys(randomUtil.password()).publicKey),
			setAccountAndGet: sinonSandbox.stub().callsArg(1),
		};
		channelStub = {
			publish: sinonSandbox.stub(),
		};
		transaction = _.cloneDeep(validTransaction);
		rawTransaction = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
		dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};
		multisignature = new Multisignature({
			components: {
				logger: modulesLoader.logger,
			},
			schema: modulesLoader.scope.schema,
			channel: channelStub,
			logic: {
				transaction: transactionMock,
				account: accountMock,
			},
		});
		return multisignature.bind(accountsMock);
	});

	afterEach(() => {
		accountMock.merge.resetHistory();
		accountsMock.generateAddressByPublicKey.resetHistory();
		sinonSandbox.restore();
		return accountsMock.setAccountAndGet.resetHistory();
	});

	describe('constructor', () => {
		let __scope;

		beforeEach(done => {
			new Multisignature({
				components: {
					logger: modulesLoader.logger,
				},
				schema: modulesLoader.scope.schema,
				channel: channelStub,
				logic: {
					transaction: transactionMock,
					account: accountMock,
				},
			});
			__scope = Multisignature.__get__('__scope');
			done();
		});

		it('should attach schema to __scope', async () =>
			expect(__scope.schema).to.eql(modulesLoader.scope.schema));

		it('should attach channel to __scope', async () =>
			expect(__scope.channel).to.eql(channelStub));

		it('should attach logger to __scope.components', async () =>
			expect(__scope.components.logger).to.eql(modulesLoader.logger));

		it('should attach logic.transaction to __scope.logic', async () =>
			expect(__scope.logic.transaction).to.eql(transactionMock));

		it('should attach account to __scope.logic', async () =>
			expect(__scope.logic.account).to.eql(accountMock));
	});

	describe('afterSave', () => {
		const dummyTransaction = {
			id: 'aTransactionId',
		};

		beforeEach(async () => {
			multisignature.afterSave(dummyTransaction, () => {});
		});

		it('should call __scope.channel.publish with "chain:multisignatures:change" and transaction object', async () => {
			expect(channelStub.publish).to.be.calledWithExactly(
				'chain:multisignatures:change',
				dummyTransaction
			);
		});
	});

	describe('bind', () => {
		describe('modules', () => {
			it('should assign accounts', async () => {
				multisignature.bind(accountsMock);
				const modules = Multisignature.__get__('__scope.modules');

				return expect(modules).to.eql({
					accounts: accountsMock,
				});
			});
		});
	});

	describe('calculateFee', () => {
		it('should return correct fee based on formula for 1 keysgroup', async () => {
			transaction.asset.multisignature.keysgroup = [
				`${getKeys(randomUtil.password()).publicKey}`,
			];
			return expect(
				multisignature.calculateFee(transaction).isEqualTo('1000000000')
			).to.be.true;
		});

		it('should return correct fee based on formula for 4 keysgroup', async () => {
			transaction.asset.multisignature.keysgroup = new Array(4).fill(
				`${getKeys(randomUtil.password()).publicKey}`
			);

			return expect(
				multisignature.calculateFee(transaction).isEqualTo('2500000000')
			).to.be.true;
		});

		it('should return correct fee based on formula for 8 keysgroup', async () => {
			transaction.asset.multisignature.keysgroup = new Array(8).fill(
				`${getKeys(randomUtil.password()).publicKey}`
			);

			return expect(
				multisignature.calculateFee(transaction).isEqualTo('4500000000')
			).to.be.true;
		});

		it('should return correct fee based on formula for 16 keysgroup', async () => {
			transaction.asset.multisignature.keysgroup = new Array(16).fill(
				`${getKeys(randomUtil.password()).publicKey}`
			);

			return expect(
				multisignature.calculateFee(transaction).isEqualTo('8500000000')
			).to.be.true;
		});
	});

	describe('verify', () => {
		describe('from multisignature.verify tests', () => {
			it('should return error when min value is smaller than minimum acceptable value', done => {
				const minimum = MULTISIG_CONSTRAINTS.MIN.MINIMUM - 1;
				const keysgroup = [
					multiSigAccount1.publicKey,
					multiSigAccount2.publicKey,
				];
				const multisigRegistration = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime: 1,
						minimum: 1,
						baseFee: FEES.MULTISIGNATURE,
					}
				);
				multisigRegistration.asset.multisignature.min = minimum.toString();

				multisignature.verify(
					multisigRegistration,
					accountFixtures.genesis,
					err => {
						expect(err).to.equal(
							'Invalid multisignature min. Must be between 1 and 15'
						);
						done();
					}
				);
			});
		});

		it('should return error when min value is greater than maximum acceptable value', done => {
			const minimum = MULTISIG_CONSTRAINTS.MIN.MAXIMUM + 1;
			const keysgroup = [
				multiSigAccount1.publicKey,
				multiSigAccount2.publicKey,
			];
			const multisigRegistration2 = createInvalidRegisterMultisignatureTransaction(
				{
					passphrase: accountFixtures.genesis.passphrase,
					keysgroup,
					lifetime: 1,
					minimum,
					baseFee: FEES.MULTISIGNATURE,
				}
			);

			multisignature.verify(
				multisigRegistration2,
				accountFixtures.genesis,
				err => {
					expect(err).to.equal(
						'Invalid multisignature min. Must be between 1 and 15'
					);
					done();
				}
			);
		});

		describe('when asset = undefined', () => {
			it('should call callback with error = "Invalid transaction asset"', done => {
				delete transaction.asset;

				multisignature.verify(transaction, sender, err => {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});
		});

		describe('when asset.multisignature = undefined', () => {
			it('should call callback with error = "Invalid transaction asset"', done => {
				delete transaction.asset.multisignature;

				multisignature.verify(transaction, sender, err => {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});
		});

		describe('when asset.multisignature = []', () => {
			it('should call callback with error = "Invalid multisignature keysgroup. Must not be empty"', done => {
				transaction.asset.multisignature.keysgroup = [];

				multisignature.verify(transaction, sender, err => {
					expect(err).to.equal(
						'Invalid multisignature keysgroup. Must not be empty'
					);
					done();
				});
			});
		});

		describe('when min <= 1', () => {
			it('should call callback with error = "Invalid multisignature min. Must be between 1 and 16"', done => {
				transaction.asset.multisignature.min = 0;

				multisignature.verify(transaction, sender, err => {
					expect(err).to.equal(
						'Invalid multisignature min. Must be between 1 and 15'
					);
					done();
				});
			});
		});

		describe('when min >= 16', () => {
			it('should call callback with error = "Invalid multisignature min. Must be between 1 and 15"', done => {
				transaction.asset.multisignature.min = 16;

				multisignature.verify(transaction, sender, err => {
					expect(err).to.equal(
						'Invalid multisignature min. Must be between 1 and 15'
					);
					done();
				});
			});
		});

		describe('when min = 2', () => {
			it('should call callback with error = null', done => {
				transaction.asset.multisignature.min = 2;

				multisignature.verify(transaction, sender, err => {
					expect(err).to.not.exist;
					done();
				});
			});
		});

		describe('when min = 15', () => {
			before(done => {
				transaction.asset.multisignature.min = 15;
				transaction.asset.keysgroup = _.map(
					new Array(16),
					async () => `${randomUtil.account().publicKey}`
				);
				done();
			});

			it('should call callback with error = null', done => {
				multisignature.verify(transaction, sender, err => {
					expect(err).to.not.exist;
					done();
				});
			});
		});

		describe('when lifetime < 1', () => {
			it('should call callback with error = "Invalid multisignature lifetime. Must be between 1 and 72"', done => {
				transaction.asset.multisignature.lifetime = 0;

				multisignature.verify(transaction, sender, err => {
					expect(err).to.equal(
						'Invalid multisignature lifetime. Must be between 1 and 72'
					);
					done();
				});
			});
		});

		describe('when lifetime > 72', () => {
			it('should call callback with error = "Invalid multisignature lifetime. Must be between 1 and 72"', done => {
				transaction.asset.multisignature.lifetime = 73;

				multisignature.verify(transaction, sender, err => {
					expect(err).to.equal(
						'Invalid multisignature lifetime. Must be between 1 and 72'
					);
					done();
				});
			});
		});

		describe('when sender has multisignature enbled', () => {
			it('should call callback with error = "Account already has multisignatures enabled"', done => {
				sender.membersPublicKeys = [getKeys(randomUtil.password()).publicKey];

				multisignature.verify(transaction, sender, err => {
					expect(err).to.equal('Account already has multisignatures enabled');
					done();
				});
			});
		});

		describe('when keysgroup contains sender', () => {
			// check for case where we have a ready transaction - nit done; (reference confusion)
			it('should call callback with error = "Invalid multisignature keysgroup. Can not contain sender"', done => {
				transaction.asset.multisignature.keysgroup.push(`+${sender.publicKey}`);

				multisignature.verify(transaction, sender, err => {
					expect(err).to.equal(
						'Invalid multisignature keysgroup. Can not contain sender'
					);
					done();
				});
			});
		});

		describe('when keysgroup has an entry which does not start with + character', () => {
			it('should call callback with error = "Invalid math operator in multisignature keysgroup"', done => {
				transaction.asset.multisignature.keysgroup.push(
					`-${getKeys(randomUtil.password()).publicKey}`
				);

				multisignature.verify(transaction, accountFixtures.genesis, err => {
					expect(err).to.equal(
						'Invalid math operator in multisignature keysgroup'
					);
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is null', () => {
			it('should call callback with error = "Invalid member in keysgroup"', done => {
				transaction.asset.multisignature.keysgroup.push(null);

				multisignature.verify(transaction, accountFixtures.genesis, err => {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is undefined', () => {
			it('should return error = "Invalid member in keysgroup"', done => {
				transaction.asset.multisignature.keysgroup.push(undefined);

				multisignature.verify(transaction, accountFixtures.genesis, err => {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is an integer', () => {
			it('should return error = "Invalid member in keysgroup"', done => {
				transaction.asset.multisignature.keysgroup.push(1);

				multisignature.verify(transaction, accountFixtures.genesis, err => {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has an entry which is not an hex string', () => {
			it('should call callback with error = Invalid member in keysgroup', done => {
				transaction.asset.multisignature.keysgroup.push(1);

				multisignature.verify(transaction, accountFixtures.genesis, err => {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});
		});

		describe('when multisignature keysgroup has non unique elements', () => {
			it('should call callback with error = Encountered duplicate public key in multisignature keysgroup', done => {
				transaction.asset.multisignature.keysgroup.push(
					transaction.asset.multisignature.keysgroup[0]
				);

				multisignature.verify(transaction, accountFixtures.genesis, err => {
					expect(err).to.equal(
						'Encountered duplicate public key in multisignature keysgroup'
					);
					done();
				});
			});
		});

		it('should be okay for valid transaction', done => {
			multisignature.verify(transaction, sender, (err, result) => {
				expect(err).to.not.exist;
				expect(transaction).to.eql(result);
				done();
			});
		});
	});

	describe('process', () => {
		it('should call callback with error = null', done => {
			multisignature.process(transaction, sender, err => {
				expect(err).to.be.null;
				done();
			});
		});

		it('should call callback with result = transaction', done => {
			multisignature.process(transaction, sender, (err, result) => {
				expect(result).to.eql(transaction);
				done();
			});
		});
	});

	describe('getBytes', () => {
		describe('when transaction.asset.multisignature.keysgroup is undefined', () => {
			beforeEach(done => {
				transaction.asset.multisignature.keysgroup = undefined;
				done();
			});

			it('should throw', async () =>
				expect(multisignature.getBytes.bind(null, transaction)).to.throw());
		});

		describe('when transaction.asset.multisignature.keysgroup is a valid keysgroup', () => {
			it('should not throw', async () =>
				expect(multisignature.getBytes.bind(null, transaction)).not.to.throw());

			it('should get bytes of valid transaction', async () => {
				const bytes = multisignature.getBytes(transaction);
				expect(bytes.toString('utf8')).to.equal(
					'\u0002\u0002+bd6d0388dcc0b07ab2035689c60a78d3ebb27901c5a5ed9a07262eab1a2e9bd2+addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9'
				);
				return expect(bytes.length).to.equal(132);
			});

			it('should return result as a Buffer type', async () =>
				expect(multisignature.getBytes(transaction)).to.be.instanceOf(Buffer));
		});
	});

	describe('applyConfirmed', () => {
		beforeEach(done => {
			accountMock.merge = sinonSandbox.stub().callsArg(2);
			multisignature.applyConfirmed(transaction, dummyBlock, sender, done);
		});

		it('should set __scope.unconfirmedSignatures[sender.address] = false', async () => {
			const unconfirmedSignatures = Multisignature.__get__(
				'__scope.unconfirmedSignatures'
			);
			return expect(unconfirmedSignatures)
				.to.contain.property(sender.address)
				.equal(false);
		});

		it('should call __scope.logic.account.merge', async () =>
			expect(accountMock.merge.calledOnce).to.be.true);

		it('should call __scope.logic.account.merge with sender.address', async () =>
			expect(accountMock.merge.calledWith(sender.address)).to.be.true);

		it('should call __scope.logic.account.merge with expected params', async () => {
			const expectedParams = {
				membersPublicKeys: transaction.asset.multisignature.keysgroup,
				multiMin: transaction.asset.multisignature.min,
				multiLifetime: transaction.asset.multisignature.lifetime,
				round: slots.calcRound(dummyBlock.height),
			};
			return expect(accountMock.merge.args[0][1]).to.eql(expectedParams);
		});

		describe('when __scope.logic.account.merge fails', () => {
			beforeEach(done => {
				accountMock.merge = sinonSandbox.stub().callsArgWith(2, 'merge error');
				done();
			});

			it('should call callback with error', async () =>
				multisignature.applyConfirmed(transaction, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				}));
		});

		describe('when __scope.logic.account.merge succeeds', () => {
			describe('for every keysgroup member', () => {
				validTransaction.asset.multisignature.keysgroup.forEach(member => {
					it('should call modules.accounts.generateAddressByPublicKey', async () =>
						expect(accountsMock.generateAddressByPublicKey.callCount).to.equal(
							validTransaction.asset.multisignature.keysgroup.length
						));

					it('should call __scope.modules.accounts.generateAddressByPublicKey with member.substring(1)', async () =>
						expect(
							accountsMock.generateAddressByPublicKey.calledWith(
								member.substring(1)
							)
						).to.be.true);

					describe('when key and the address', () => {
						let key;
						let address;

						beforeEach(done => {
							key = member.substring(1);
							address = accountsMock.generateAddressByPublicKey(key);
							done();
						});

						it('should call __scope.logic.account.setAccountAndGet', async () =>
							expect(accountsMock.setAccountAndGet.callCount).to.equal(
								validTransaction.asset.multisignature.keysgroup.length
							));

						it('should call __scope.logic.account.setAccountAndGet with {address: address}', async () =>
							expect(
								accountsMock.setAccountAndGet.calledWith(
									sinonSandbox.match({ address })
								)
							).to.be.true);

						it('should call __scope.logic.account.setAccountAndGet with sender.address', async () =>
							expect(
								accountsMock.setAccountAndGet.calledWith(
									sinonSandbox.match({ publicKey: key })
								)
							).to.be.true);

						describe('when __scope.modules.accounts.setAccountAndGet fails', () => {
							beforeEach(done => {
								accountsMock.setAccountAndGet = sinonSandbox
									.stub()
									.callsArgWith(1, 'mergeAccountAndGet error');
								done();
							});

							it('should call callback with error', async () =>
								multisignature.applyConfirmed(
									transaction,
									dummyBlock,
									sender,
									err => {
										expect(err).not.to.be.empty;
									}
								));
						});

						describe('when __scope.modules.accounts.mergeAccountAndGet succeeds', () => {
							it('should call callback with error = null', async () =>
								multisignature.applyConfirmed(
									transaction,
									dummyBlock,
									sender,
									err => {
										expect(err).to.be.null;
									}
								));

							it('should call callback with result = undefined', async () =>
								multisignature.applyConfirmed(
									transaction,
									dummyBlock,
									sender,
									(err, res) => {
										expect(res).to.be.undefined;
									}
								));
						});
					});
				});
			});
		});
	});

	describe('undoConfirmed', () => {
		beforeEach(done => {
			transaction = _.cloneDeep(validTransaction);
			accountMock.merge = sinonSandbox.stub().callsArg(2);
			multisignature.undoConfirmed(transaction, dummyBlock, sender, done);
		});
		/* eslint-enable */

		it('should set __scope.unconfirmedSignatures[sender.address] = true', async () => {
			const unconfirmedSignatures = Multisignature.__get__(
				'__scope.unconfirmedSignatures'
			);
			return expect(unconfirmedSignatures)
				.to.contain.property(sender.address)
				.equal(true);
		});

		it('should call __scope.logic.account.merge', async () =>
			expect(accountMock.merge.calledOnce).to.be.true);

		it('should call __scope.logic.account.merge with sender.address', async () =>
			expect(accountMock.merge.calledWith(sender.address)).to.be.true);

		it('should call __scope.logic.account.merge with expected params', async () => {
			const expectedParams = {
				membersPublicKeys: transactionMock.reverse(
					transaction.asset.multisignature.keysgroup
				),
				multiMin: -transaction.asset.multisignature.min,
				multiLifetime: -transaction.asset.multisignature.lifetime,
				round: slots.calcRound(dummyBlock.height),
			};
			return expect(accountMock.merge.args[0][1]).to.eql(expectedParams);
		});

		describe('when __scope.logic.account.merge fails', () => {
			beforeEach(done => {
				accountMock.merge = sinonSandbox.stub().callsArgWith(2, 'merge error');
				done();
			});

			it('should call callback with error', async () =>
				multisignature.undoConfirmed(transaction, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				}));
		});

		describe('when __scope.logic.account.merge succeeds', () => {
			it('should call callback with error = null', async () =>
				multisignature.applyConfirmed(transaction, dummyBlock, sender, err => {
					expect(err).to.be.null;
				}));

			it('should call callback with result = undefined', async () =>
				multisignature.applyConfirmed(
					transaction,
					dummyBlock,
					sender,
					(err, res) => {
						expect(res).to.be.undefined;
					}
				));
		});
		/* eslint-enable */
	});

	describe('applyUnconfirmed', () => {
		describe('when transaction is pending for confirmation', () => {
			beforeEach(done => {
				const unconfirmedSignatures = Multisignature.__get__(
					'__scope.unconfirmedSignatures'
				);
				unconfirmedSignatures[sender.address] = true;
				done();
			});

			it('should call callback with error = "Signature on this account is pending confirmation"', done => {
				multisignature.applyUnconfirmed(transaction, sender, err => {
					expect(err).to.equal(
						'Signature on this account is pending confirmation'
					);
					done();
				});
			});
		});

		describe('when transaction is not pending confirmation', () => {
			beforeEach(done => {
				const unconfirmedSignatures = Multisignature.__get__(
					'__scope.unconfirmedSignatures'
				);
				unconfirmedSignatures[sender.address] = false;
				done();
			});

			it('should set __scope.unconfirmedSignatures[sender.address] = true', done => {
				const unconfirmedSignatures = Multisignature.__get__(
					'__scope.unconfirmedSignatures'
				);
				multisignature.applyUnconfirmed(transaction, sender, async () => {
					expect(unconfirmedSignatures)
						.to.contain.property(sender.address)
						.equal(true);
					done();
				});
			});

			it('should call __scope.logic.account.merge', done => {
				multisignature.applyUnconfirmed(transaction, sender, async () => {
					expect(accountMock.merge.calledOnce).to.be.true;
					done();
				});
			});

			it('should call __scope.logic.account.merge with sender.address', done => {
				multisignature.applyUnconfirmed(transaction, sender, async () => {
					expect(accountMock.merge.calledWith(sender.address)).to.be.true;
					done();
				});
			});

			it('should call __scope.logic.account.merge with expected params', done => {
				const expectedParams = {
					u_membersPublicKeys: transaction.asset.multisignature.keysgroup,
					u_multiMin: transaction.asset.multisignature.min,
					u_multiLifetime: transaction.asset.multisignature.lifetime,
				};
				multisignature.applyUnconfirmed(transaction, sender, async () => {
					expect(accountMock.merge.args[0][1]).to.eql(expectedParams);
					done();
				});
			});

			describe('when __scope.logic.account.merge fails', () => {
				beforeEach(() => accountMock.merge.callsArgWith(2, 'merge error'));

				afterEach(() => accountMock.merge.resetHistory());

				it('should call callback with error = merge error', done => {
					multisignature.applyUnconfirmed(transaction, sender, err => {
						expect(err).not.to.be.empty;
						expect(err).to.equal('merge error');
						done();
					});
				});
			});

			describe('when __scope.logic.account.merge succeeds', () => {
				it('should call callback with error = null', done => {
					multisignature.applyUnconfirmed(transaction, sender, err => {
						expect(err).to.be.not.exist;
						done();
					});
				});

				it('should call callback with result = undefined', done => {
					multisignature.applyUnconfirmed(transaction, sender, (err, res) => {
						expect(res).to.be.undefined;
						done();
					});
				});
			});
		});
	});

	describe('undoUnconfirmed', () => {
		beforeEach(done => {
			accountMock.merge = sinonSandbox.stub().callsArg(2);
			multisignature.undoUnconfirmed(transaction, sender, done);
		});

		it('should set __scope.unconfirmedSignatures[sender.address] = false', async () => {
			const unconfirmedSignatures = Multisignature.__get__(
				'__scope.unconfirmedSignatures'
			);
			return expect(unconfirmedSignatures)
				.to.contain.property(sender.address)
				.equal(false);
		});

		it('should call __scope.logic.account.merge', async () =>
			expect(accountMock.merge.calledOnce).to.be.true);

		it('should call __scope.logic.account.merge with sender.address', async () =>
			expect(accountMock.merge.calledWith(sender.address)).to.be.true);

		it('should call __scope.logic.account.merge with expected params', async () => {
			const expectedParams = {
				u_membersPublicKeys: transactionMock.reverse(
					transaction.asset.multisignature.keysgroup
				),
				u_multiMin: -transaction.asset.multisignature.min,
				u_multiLifetime: -transaction.asset.multisignature.lifetime,
			};
			return expect(accountMock.merge.args[0][1]).to.eql(expectedParams);
		});

		describe('when __scope.logic.account.merge fails', () => {
			beforeEach(done => {
				accountMock.merge = sinonSandbox.stub().callsArgWith(2, 'merge error');
				done();
			});

			it('should call callback with error', async () =>
				multisignature.undoConfirmed(transaction, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				}));
		});

		describe('when __scope.logic.account.merge succeeds', () => {
			it('should call callback with error = null', async () =>
				multisignature.applyConfirmed(transaction, dummyBlock, sender, err => {
					expect(err).to.be.null;
				}));

			it('should call callback with result = undefined', async () =>
				multisignature.applyConfirmed(
					transaction,
					dummyBlock,
					sender,
					(err, res) => {
						expect(res).to.be.undefined;
					}
				));
		});
	});

	describe('objectNormalize', () => {
		describe('min', () => {
			it('should return error when value is not an integer', async () => {
				const minimum = '2';
				const keysgroup = [
					multiSigAccount1.publicKey,
					multiSigAccount2.publicKey,
				];
				const multisigRegistration3 = registerMultisignature({
					passphrase: accountFixtures.genesis.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 1,
				});
				multisigRegistration3.asset.multisignature.min = minimum;

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration3);
				}).to.throw(
					'Failed to validate multisignature schema: Expected type integer but found type string'
				);
			});

			it('should return error when value is a negative integer', async () => {
				const minimum = -1;
				const keysgroup = [
					multiSigAccount1.publicKey,
					multiSigAccount2.publicKey,
				];
				const multisigRegistration4 = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime: 1,
						minimum: 1,
						baseFee: FEES.MULTISIGNATURE,
					}
				);
				multisigRegistration4.asset.multisignature.min = minimum;

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration4);
				}).to.throw(
					'Failed to validate multisignature schema: Value -1 is less than minimum 1'
				);
			});

			it('should return error when value is smaller than minimum acceptable value', async () => {
				const minimum = MULTISIG_CONSTRAINTS.MIN.MINIMUM - 1;
				const keysgroup = [
					multiSigAccount1.publicKey,
					multiSigAccount2.publicKey,
				];
				const multisigRegistration5 = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime: 1,
						minimum,
						baseFee: FEES.MULTISIGNATURE,
					}
				);

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration5);
				}).to.throw(
					'Failed to validate multisignature schema: Value 0 is less than minimum 1'
				);
			});

			it('should return error when value is greater than maximum acceptable value', async () => {
				const minimum = MULTISIG_CONSTRAINTS.MIN.MAXIMUM + 1;
				const keysgroup = [
					multiSigAccount1.publicKey,
					multiSigAccount2.publicKey,
				];
				const multisigRegistration6 = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime: 1,
						minimum,
						baseFee: FEES.MULTISIGNATURE,
					}
				);

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration6);
				}).to.throw(
					'Failed to validate multisignature schema: Value 16 is greater than maximum 15'
				);
			});

			it('should return error when value is an overflow number', async () => {
				const minimum = Number.MAX_VALUE + 1;
				const keysgroup = [
					multiSigAccount1.publicKey,
					multiSigAccount2.publicKey,
				];
				const multisigRegistration7 = registerMultisignature({
					passphrase: accountFixtures.genesis.passphrase,
					keysgroup,
					lifetime: 1,
					minimum: 2,
				});
				multisigRegistration7.asset.multisignature.min = minimum;

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration7);
				}).to.throw(
					'Failed to validate multisignature schema: Value 1.7976931348623157e+308 is greater than maximum 15'
				);
			});
		});

		describe('lifetime', () => {
			it('should return error when value is not an integer', async () => {
				const lifetime = '2';
				const keysgroup = [
					multiSigAccount1.publicKey,
					multiSigAccount2.publicKey,
				];
				const multisigRegistration8 = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime: 1,
						minimum: 2,
						baseFee: FEES.MULTISIGNATURE,
					}
				);
				multisigRegistration8.asset.multisignature.lifetime = lifetime;

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration8);
				}).to.throw(
					'Failed to validate multisignature schema: Expected type integer but found type string'
				);
			});

			it('should return error when value is smaller than minimum acceptable value', async () => {
				const lifetime = MULTISIG_CONSTRAINTS.LIFETIME.MINIMUM - 1;
				const keysgroup = [
					multiSigAccount1.publicKey,
					multiSigAccount2.publicKey,
				];
				const multisigRegistration9 = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime,
						minimum: 2,
						baseFee: FEES.MULTISIGNATURE,
					}
				);

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration9);
				}).to.throw(
					'Failed to validate multisignature schema: Value 0 is less than minimum 1'
				);
			});

			it('should return error when value is greater than maximum acceptable value', async () => {
				const lifetime = MULTISIG_CONSTRAINTS.LIFETIME.MAXIMUM + 1;
				const keysgroup = [
					multiSigAccount1.publicKey,
					multiSigAccount2.publicKey,
				];
				const multisigRegistration10 = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime,
						minimum: 2,
						baseFee: FEES.MULTISIGNATURE,
					}
				);

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration10);
				}).to.throw(
					'Failed to validate multisignature schema: Value 73 is greater than maximum 72'
				);
			});

			it('should return error when value is an overflow number', async () => {
				const lifetime = Number.MAX_VALUE;
				const keysgroup = [
					multiSigAccount1.publicKey,
					multiSigAccount2.publicKey,
				];
				const multisigRegistration11 = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime: 1,
						minimum: 2,
						baseFee: FEES.MULTISIGNATURE,
					}
				);
				multisigRegistration11.asset.multisignature.lifetime = lifetime;

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration11);
				}).to.throw(
					'Failed to validate multisignature schema: Value 1.7976931348623157e+308 is greater than maximum 72'
				);
			});
		});

		describe('keysgroup', () => {
			it('should return error when it is not an array', async () => {
				const keysgroup = [multiSigAccount1.publicKey];
				const multisigRegistration12 = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime: 1,
						minimum: 2,
						baseFee: FEES.MULTISIGNATURE,
					}
				);
				multisigRegistration12.asset.multisignature.keysgroup = '';

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration12);
				}).to.throw(
					'Failed to validate multisignature schema: Expected type array but found type string'
				);
			});

			it('should return error when array length is smaller than minimum acceptable value', async () => {
				const keysgroup = [multiSigAccount1.publicKey];
				const multisigRegistration13 = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime: 1,
						minimum: 2,
						baseFee: FEES.MULTISIGNATURE,
					}
				);
				multisigRegistration13.asset.multisignature.keysgroup = [];

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration13);
				}).to.throw(
					'Failed to validate multisignature schema: Array is too short (0), minimum 1'
				);
			});

			it('should return error when array length is greater than maximum acceptable value', async () => {
				const keysgroup = Array(
					...Array(MULTISIG_CONSTRAINTS.KEYSGROUP.MAX_ITEMS + 1)
				).map(() => `${getKeys(randomUtil.password()).publicKey}`);
				const multisigRegistration14 = createInvalidRegisterMultisignatureTransaction(
					{
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup,
						lifetime: 1,
						minimum: 2,
						baseFee: FEES.MULTISIGNATURE,
					}
				);

				return expect(() => {
					multisignature.objectNormalize(multisigRegistration14);
				}).to.throw(
					'Failed to validate multisignature schema: Array is too long (16), maximum 15'
				);
			});
		});

		it('should return transaction when created using createMultisignature', async () => {
			const keysgroup = Array(...Array(10)).map(
				() => `${getKeys(randomUtil.password()).publicKey}`
			);

			const multisigRegistration15 = registerMultisignature({
				passphrase: accountFixtures.genesis.passphrase,
				keysgroup,
				lifetime: 1,
				minimum: 2,
			});

			return expect(
				multisignature.objectNormalize(multisigRegistration15)
			).to.eql(multisigRegistration15);
		});

		it('should use the correct format to validate against', async () => {
			const __scope = Multisignature.__get__('__scope');
			const schemaSpy = sinonSandbox.spy(__scope.schema, 'validate');
			multisignature.objectNormalize(transaction);
			expect(schemaSpy.calledOnce).to.equal(true);
			expect(
				schemaSpy.calledWithExactly(
					transaction.asset.multisignature,
					Multisignature.prototype.schema
				)
			).to.equal(true);
			return schemaSpy.restore();
		});

		it('should return error asset schema is invalid', async () => {
			transaction.asset.multisignature.min = -1;

			return expect(() => {
				multisignature.objectNormalize(transaction);
			}).to.throw(
				'Failed to validate multisignature schema: Value -1 is less than minimum 1'
			);
		});

		it('should return transaction when asset is valid', async () =>
			expect(multisignature.objectNormalize(transaction)).to.eql(transaction));
	});

	describe('dbRead', () => {
		describe('when raw.m_keysgroup does not exist', () => {
			beforeEach(async () => delete rawTransaction.m_keysgroup);

			it('should return null', async () =>
				expect(multisignature.dbRead(rawTransaction)).to.eql(null));
		});

		describe('when raw.m_keysgroup exists', () => {
			it('should return result containing multisignature', async () =>
				expect(multisignature.dbRead(rawTransaction)).to.have.property(
					'multisignature'
				));

			it('should return result containing multisignature.min = raw.m_min', async () =>
				expect(multisignature.dbRead(rawTransaction))
					.to.have.nested.property('multisignature.min')
					.equal(rawTransaction.m_min));

			it('should return result containing multisignature.lifetime = raw.lifetime', async () =>
				expect(multisignature.dbRead(rawTransaction))
					.to.have.nested.property('multisignature.lifetime')
					.equal(rawTransaction.m_lifetime));

			describe('when raw.m_keysgroup is not a string', () => {
				beforeEach(done => {
					rawTransaction.m_keysgroup = {};
					done();
				});

				it('should return result containing multisignature.keysgroup = []', async () =>
					expect(multisignature.dbRead(rawTransaction))
						.to.have.nested.property('multisignature.keysgroup')
						.eql([]));
			});

			describe('when raw.m_keysgroup = "a,b,c"', () => {
				beforeEach(done => {
					rawTransaction.m_keysgroup = 'a,b,c';
					done();
				});

				it('should return result containing multisignature.keysgroup = ["a", "b", "c"]', async () =>
					expect(multisignature.dbRead(rawTransaction))
						.to.have.nested.property('multisignature.keysgroup')
						.eql(['a', 'b', 'c']));
			});
		});
	});

	describe('ready', () => {
		it('should return true for single signature transaction', async () =>
			expect(multisignature.ready(transaction, sender)).to.equal(true));

		it('should return false for multi signature transaction with less signatures', async () => {
			sender.membersPublicKeys = [validKeypair.publicKey.toString('hex')];

			return expect(multisignature.ready(transaction, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with alteast min signatures', async () => {
			sender.membersPublicKeys = [validKeypair.publicKey.toString('hex')];
			sender.multiMin = 1;

			delete transaction.signature;
			// Not really correct signature, but we are not testing that over here
			transaction.signature = crypto.randomBytes(64).toString('hex');
			transaction.signatures = [crypto.randomBytes(64).toString('hex')];

			return expect(multisignature.ready(transaction, sender)).to.equal(true);
		});
	});
});

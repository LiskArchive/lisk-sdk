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
const modulesLoader = require('../../../../common/modules_loader');
const typesRepresentatives = require('../../../../fixtures/types_representatives'); // eslint-disable-line no-unused-vars
const slots = require('../../../../../../src/modules/chain/helpers/slots');
const testData = require('./test_data/out_transfer');

const { FEES } = __testContext.config.constants;
const exceptions = __testContext.config.exceptions;
const OutTransfer = rewire(
	'../../../../../../src/modules/chain/logic/out_transfer'
);
const validKeypair = testData.validKeypair;
const validSender = testData.validSender;
const validTransaction = testData.validTransaction;
const rawValidTransaction = testData.rawValidTransaction;

describe('outTransfer', () => {
	let outTransfer;
	let storageStub;
	let accountsStub;
	let blocksStub;

	let dummyBlock;
	let transaction;
	let rawTransaction;
	let sender;

	beforeEach(() => {
		storageStub = {
			entities: {
				Transaction: {
					isPersisted: sinonSandbox.stub().resolves(),
				},
			},
		};

		accountsStub = {
			mergeAccountAndGet: sinonSandbox.stub().callsArg(1),
			setAccountAndGet: sinonSandbox.stub().callsArg(1),
		};

		blocksStub = {
			lastBlock: {
				get: sinonSandbox.stub().returns(dummyBlock),
			},
		};

		dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};

		transaction = _.cloneDeep(validTransaction);
		rawTransaction = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);

		OutTransfer.__set__('__scope.unconfirmedOutTansfers', {});

		outTransfer = new OutTransfer({
			components: {
				storage: storageStub,
				logger: modulesLoader.logger,
			},
			schema: modulesLoader.scope.schema,
		});

		return outTransfer.bind(accountsStub, blocksStub);
	});

	describe('constructor', () => {
		describe('__scope', () => {
			let __scope;

			beforeEach(done => {
				new OutTransfer({
					components: {
						storage: storageStub,
						logger: modulesLoader.logger,
					},
					schema: modulesLoader.scope.schema,
				});
				__scope = OutTransfer.__get__('__scope');
				done();
			});

			it('should assign storage', async () =>
				expect(__scope)
					.to.have.nested.property('components.storage')
					.eql(storageStub));

			it('should assign schema', async () =>
				expect(__scope)
					.to.have.property('schema')
					.eql(modulesLoader.scope.schema));
		});
	});

	describe('bind', () => {
		let modules;

		beforeEach(done => {
			outTransfer.bind(accountsStub, blocksStub);
			modules = OutTransfer.__get__('__scope.modules');
			done();
		});

		describe('modules', () => {
			it('should assign accounts', async () =>
				expect(modules)
					.to.have.property('accounts')
					.eql(accountsStub));

			it('should assign blocks', async () =>
				expect(modules)
					.to.have.property('blocks')
					.eql(blocksStub));
		});
	});

	describe('calculateFee', () => {
		it('should return constants.fees.send', async () =>
			expect(outTransfer.calculateFee(transaction).isEqualTo(FEES.SEND)).to.be
				.true);
	});

	describe('verify', () => {
		beforeEach(() => outTransfer.bind(accountsStub, blocksStub));

		it('should call modules.blocks.lastBlock.get', done => {
			outTransfer.verify(transaction, sender, () => {
				expect(blocksStub.lastBlock.get).to.be.calledOnce;
				done();
			});
		});

		describe('when transaction.recipientId does not exist', () => {
			it('should call callback with error = "Transaction type 7 is frozen"', done => {
				delete transaction.recipientId;
				outTransfer.verify(transaction, sender, err => {
					expect(err).to.equal('Transaction type 7 is frozen');
					done();
				});
			});
		});

		describe('when transaction.amount = 0', () => {
			describe('when type 7 is frozen', () => {
				it('should call callback with error = "Transaction type 7 is frozen"', done => {
					transaction.amount = 0;
					outTransfer.verify(transaction, sender, err => {
						expect(err).to.equal('Transaction type 7 is frozen');
						done();
					});
				});
			});
			describe('when type 7 is not frozen', () => {
				it('should call callback with error = "Invalid transaction amount"', done => {
					const originalLimit = exceptions.precedent.disableDappTransfer;
					exceptions.precedent.disableDappTransfer = 5;
					transaction.amount = 0;
					outTransfer.verify(transaction, sender, err => {
						expect(err).to.equal('Invalid transaction amount');
						exceptions.precedent.disableDappTransfer = originalLimit;
						done();
					});
				});
			});
		});

		describe('when transaction.amount is less than zero', () => {
			describe('when type 7 is frozen', () => {
				it('should call callback with error = "Transaction type 7 is frozen"', done => {
					transaction.amount = -1;
					outTransfer.verify(transaction, sender, err => {
						expect(err).to.equal('Transaction type 7 is frozen');
						done();
					});
				});
			});
			describe('when type 7 is not frozen', () => {
				it('should call callback with error = "Invalid transaction amount"', done => {
					const originalLimit = exceptions.precedent.disableDappTransfer;
					exceptions.precedent.disableDappTransfer = 5;
					transaction.amount = -1;
					outTransfer.verify(transaction, sender, err => {
						expect(err).to.equal('Invalid transaction amount');
						exceptions.precedent.disableDappTransfer = originalLimit;
						done();
					});
				});
			});
		});

		describe('when transaction.asset does not exist', () => {
			it('should call callback with error = "Transaction type 7 is frozen"', done => {
				delete transaction.asset;
				outTransfer.verify(transaction, sender, err => {
					expect(err).to.equal('Transaction type 7 is frozen');
					done();
				});
			});
		});

		describe('when transaction.asset.outTransfer does not exist', () => {
			it('should call callback with error = "Transaction type 7 is frozen"', done => {
				delete transaction.asset.outTransfer;
				outTransfer.verify(transaction, sender, err => {
					expect(err).to.equal('Transaction type 7 is frozen');
					done();
				});
			});
		});

		describe('when transaction.asset.outTransfer = 0', () => {
			it('should call callback with error = "Transaction type 7 is frozen"', done => {
				transaction.asset.outTransfer = 0;
				outTransfer.verify(transaction, sender, err => {
					expect(err).to.equal('Transaction type 7 is frozen');
					done();
				});
			});
		});

		describe('when transaction.asset.outTransfer.dappId is invalid', () => {
			it('should call callback with error = "Transaction type 7 is frozen"', done => {
				transaction.asset.outTransfer.dappId = 'ab1231';
				outTransfer.verify(transaction, sender, err => {
					expect(err).to.equal('Transaction type 7 is frozen');
					done();
				});
			});
		});

		describe('when transaction.asset.outTransfer.transactionId is invalid', () => {
			it('should call callback with error = "Transaction type 7 is frozen"', done => {
				transaction.asset.outTransfer.transactionId = 'ab1231';
				outTransfer.verify(transaction, sender, err => {
					expect(err).to.equal('Transaction type 7 is frozen');
					done();
				});
			});
		});

		describe('when transaction is valid', () => {
			it('should call callback with error = null', done => {
				outTransfer.verify(transaction, sender, err => {
					expect(err).to.equal('Transaction type 7 is frozen');
					done();
				});
			});

			it('should call callback with result = transaction', done => {
				outTransfer.verify(transaction, sender, (err, res) => {
					expect(res).to.be.undefined;
					done();
				});
			});
		});
	});

	describe('process', () => {
		beforeEach(() => OutTransfer.__set__('__scope.unconfirmedOutTansfers', {}));

		it('should call storageStub.entities.Transaction.isPersisted', done => {
			outTransfer.process(transaction, sender, async () => {
				expect(storageStub.entities.Transaction.isPersisted.calledOnce).to.be
					.true;
				done();
			});
		});

		it('should call storageStub.entities.Transaction.isPersisted with dappId', done => {
			outTransfer.process(transaction, sender, async () => {
				expect(
					storageStub.entities.Transaction.isPersisted.calledWith({
						id: transaction.asset.outTransfer.dappId,
						type: 5,
					})
				).to.be.true;
				done();
			});
		});

		it('should call storageStub.entities.Transaction.isPersisted with transaction.asset.outTransfer.dappId}', done => {
			outTransfer.process(transaction, sender, async () => {
				expect(
					storageStub.entities.Transaction.isPersisted.calledWith({
						id: transaction.asset.outTransfer.dappId,
						type: 5,
					})
				).to.be.true;
				done();
			});
		});

		describe('when storageStub.entities.Transaction.isPersisted fails', () => {
			beforeEach(done => {
				storageStub.entities.Transaction.isPersisted = sinonSandbox
					.stub()
					.rejects('Rejection error');
				done();
			});

			it('should call callback with error', done => {
				outTransfer.process(transaction, sender, err => {
					expect(err).not.to.be.empty;
					done();
				});
			});
		});

		describe('when storageStub.entities.Transaction.isPersisted succeeds', () => {
			describe('when dapp does not exist', () => {
				beforeEach(done => {
					storageStub.entities.Transaction.isPersisted = sinonSandbox
						.stub()
						.resolves(false);
					done();
				});

				it('should call callback with error', done => {
					outTransfer.process(transaction, sender, err => {
						expect(err).to.equal(
							`Application not found: ${transaction.asset.outTransfer.dappId}`
						);
						done();
					});
				});
			});

			describe('when dapp exists', () => {
				beforeEach(done => {
					storageStub.entities.Transaction.isPersisted = sinonSandbox
						.stub()
						.resolves(true);
					done();
				});

				describe('when unconfirmed out transfer exists', () => {
					beforeEach(() => {
						const unconfirmedTransactionExistsMap = {};
						unconfirmedTransactionExistsMap[
							transaction.asset.outTransfer.transactionId
						] = true;

						return OutTransfer.__set__(
							'__scope.unconfirmedOutTansfers',
							unconfirmedTransactionExistsMap
						);
					});

					it('should call callback with error', done => {
						outTransfer.process(transaction, sender, err => {
							expect(err).to.equal(
								`Transaction is already processed: ${
									transaction.asset.outTransfer.transactionId
								}`
							);
							done();
						});
					});
				});

				describe('when unconfirmed out transfer does not exist', () => {
					beforeEach(() =>
						OutTransfer.__set__('__scope.unconfirmedOutTansfers', {})
					);

					it('should call storageStub.entities.Transaction.isPersisted second time', done => {
						outTransfer.process(transaction, sender, async () => {
							expect(storageStub.entities.Transaction.isPersisted.calledTwice)
								.to.be.true;
							done();
						});
					});

					it('should call storageStub.entities.Transaction.isPersisted', done => {
						outTransfer.process(transaction, sender, async () => {
							expect(
								storageStub.entities.Transaction.isPersisted.secondCall.calledWith(
									{ id: '14144353162277138821', type: 7 }
								)
							).to.be.true;
							done();
						});
					});

					describe('when storageStub.entities.Transaction.isPersisted fails on call', () => {
						beforeEach(() =>
							storageStub.entities.Transaction.isPersisted
								.withArgs({ id: transaction.id }, {})
								.onSecondCall()
								.rejects('isPersisted error')
						);

						it('should call callback with error', done => {
							outTransfer.process(transaction, sender, err => {
								expect(err).not.to.be.empty;
								done();
							});
						});
					});

					describe('when library.db.one succeeds on the second call', () => {
						describe('when confirmed outTransfer transaction exists', () => {
							beforeEach(() =>
								storageStub.entities.Transaction.isPersisted
									.withArgs(transaction.id)
									.resolves(true)
							);

							it('should call callback with error', done => {
								outTransfer.process(transaction, sender, err => {
									expect(err).to.equal(
										`Transaction is already confirmed: ${
											transaction.asset.outTransfer.transactionId
										}`
									);
									done();
								});
							});
						});

						describe('when confirmed outTransfer transaction does not exist', () => {
							beforeEach(done => {
								storageStub.entities.Transaction.isPersisted = sinonSandbox
									.stub()
									.onFirstCall()
									.resolves(true)
									.onSecondCall()
									.resolves(false);
								done();
							});

							it('should call callback with error = null', done => {
								outTransfer.process(transaction, sender, err => {
									expect(err).to.be.null;
									done();
								});
							});

							it('should call callback with result = transaction', done => {
								outTransfer.process(transaction, sender, (err, res) => {
									expect(res).to.eql(transaction);
									done();
								});
							});
						});
					});
				});
			});
		});
	});

	describe('getBytes', () => {
		describe('when transaction.asset.outTransfer.dappId = undefined', () => {
			beforeEach(done => {
				transaction.asset.outTransfer.dappId = undefined;
				done();
			});

			it('should throw', async () =>
				expect(outTransfer.getBytes.bind(null, transaction)).to.throw);
		});

		describe('when transaction.asset.outTransfer.dappId is a valid dapp id', () => {
			describe('when transaction.asset.outTransfer.transactionId = undefined', () => {
				beforeEach(done => {
					transaction.asset.outTransfer.transactionId = undefined;
					done();
				});

				it('should throw', async () =>
					expect(outTransfer.getBytes.bind(null, transaction)).to.throw);
			});

			describe('when transaction.asset.outTransfer.transactionId is valid transaction id', () => {
				it('should not throw', async () =>
					expect(outTransfer.getBytes.bind(null, transaction)).not.to.throw);

				it('should get bytes of valid transaction', async () =>
					expect(outTransfer.getBytes(transaction).toString('hex')).to.equal(
						'343136333731333037383236363532343230393134313434333533313632323737313338383231'
					));

				it('should return result as a Buffer type', async () =>
					expect(outTransfer.getBytes(transaction)).to.be.instanceOf(Buffer));
			});
		});
	});

	describe('applyConfirmed', () => {
		beforeEach(done => {
			outTransfer.applyConfirmed(transaction, dummyBlock, sender, done);
		});

		it('should set __scope.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = false', async () => {
			const unconfirmedOutTransfers = OutTransfer.__get__(
				'__scope.unconfirmedOutTansfers'
			);
			return expect(unconfirmedOutTransfers)
				.to.contain.property(transaction.asset.outTransfer.transactionId)
				.equal(false);
		});

		it('should call __scope.modules.accounts.setAccountAndGet', async () =>
			expect(accountsStub.setAccountAndGet.calledOnce).to.be.true);

		it('should call __scope.modules.accounts.setAccountAndGet with {address: transaction.recipientId}', async () =>
			expect(
				accountsStub.setAccountAndGet.calledWith({
					address: transaction.recipientId,
				})
			).to.be.true);

		describe('when __scope.modules.accounts.setAccountAndGet fails', () => {
			beforeEach(done => {
				accountsStub.setAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'setAccountAndGet error');
				done();
			});

			it('should call callback with error', async () =>
				outTransfer.applyConfirmed(transaction, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				}));
		});

		describe('when __scope.modules.accounts.setAccountAndGet succeeds', () => {
			beforeEach(done => {
				accountsStub.setAccountAndGet = sinonSandbox.stub().callsArg(1);
				done();
			});

			it('should call __scope.modules.accounts.mergeAccountAndGet', async () =>
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.be.true);

			it('should call __scope.modules.accounts.mergeAccountAndGet with address = transaction.recipientId', async () =>
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ address: transaction.recipientId })
					)
				).to.be.true);

			it('should call __scope.modules.accounts.mergeAccountAndGet with balance = transaction.amount', async () =>
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ balance: transaction.amount })
					)
				).to.be.true);

			it('should call __scope.modules.accounts.mergeAccountAndGet with u_balance = transaction.amount', async () =>
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ u_balance: transaction.amount })
					)
				).to.be.true);

			it('should call __scope.modules.accounts.mergeAccountAndGet with round = slots.calcRound result', async () =>
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ round: slots.calcRound(dummyBlock.height) })
					)
				).to.be.true);

			describe('when __scope.modules.accounts.mergeAccountAndGet fails', () => {
				beforeEach(done => {
					accountsStub.mergeAccountAndGet = sinonSandbox
						.stub()
						.callsArgWith(1, 'mergeAccountAndGet error');
					done();
				});

				it('should call callback with error', async () =>
					outTransfer.applyConfirmed(transaction, dummyBlock, sender, err => {
						expect(err).not.to.be.empty;
					}));
			});

			describe('when __scope.modules.accounts.mergeAccountAndGet succeeds', () => {
				it('should call callback with error = undefined', async () =>
					outTransfer.applyConfirmed(transaction, dummyBlock, sender, err => {
						expect(err).to.be.undefined;
					}));

				it('should call callback with result = undefined', async () =>
					outTransfer.applyConfirmed(
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

	describe('undoConfirmed', () => {
		beforeEach(done => {
			outTransfer.undoConfirmed(transaction, dummyBlock, sender, done);
		});

		it('should set __scope.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = true', async () => {
			const unconfirmedOutTransfers = OutTransfer.__get__(
				'__scope.unconfirmedOutTansfers'
			);
			return expect(unconfirmedOutTransfers)
				.to.contain.property(transaction.asset.outTransfer.transactionId)
				.equal(true);
		});

		it('should call __scope.modules.accounts.setAccountAndGet', async () =>
			expect(accountsStub.setAccountAndGet.calledOnce).to.be.true);

		it('should call __scope.modules.accounts.setAccountAndGet with {address: transaction.recipientId}', async () =>
			expect(
				accountsStub.setAccountAndGet.calledWith({
					address: transaction.recipientId,
				})
			).to.be.true);

		describe('when __scope.modules.accounts.setAccountAndGet fails', () => {
			beforeEach(done => {
				accountsStub.setAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'setAccountAndGet error');
				done();
			});

			it('should call callback with error', async () =>
				outTransfer.undoConfirmed(transaction, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				}));
		});

		describe('when __scope.modules.accounts.setAccountAndGet succeeds', () => {
			beforeEach(done => {
				accountsStub.setAccountAndGet = sinonSandbox.stub().callsArg(1);
				done();
			});

			it('should call __scope.modules.accounts.mergeAccountAndGet', async () =>
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.be.true);

			it('should call __scope.modules.accounts.mergeAccountAndGet with address = transaction.recipientId', async () =>
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ address: transaction.recipientId })
					)
				).to.be.true);

			it('should call __scope.modules.accounts.mergeAccountAndGet with balance = -transaction.amount', async () =>
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ balance: -transaction.amount })
					)
				).to.be.true);

			it('should call __scope.modules.accounts.mergeAccountAndGet with u_balance = -transaction.amount', async () =>
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ u_balance: -transaction.amount })
					)
				).to.be.true);

			it('should call __scope.modules.accounts.mergeAccountAndGet with round = slots.calcRound result', async () =>
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ round: slots.calcRound(dummyBlock.height) })
					)
				).to.be.true);
		});

		describe('when __scope.modules.accounts.mergeAccountAndGet fails', () => {
			beforeEach(done => {
				accountsStub.mergeAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'mergeAccountAndGet error');
				done();
			});

			it('should call callback with error', async () =>
				outTransfer.undoConfirmed(transaction, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				}));
		});

		describe('when __scope.modules.accounts.mergeAccountAndGet succeeds', () => {
			it('should call callback with error = undefined', async () =>
				outTransfer.undoConfirmed(transaction, dummyBlock, sender, err => {
					expect(err).to.be.undefined;
				}));

			it('should call callback with result = undefined', async () =>
				outTransfer.undoConfirmed(
					transaction,
					dummyBlock,
					sender,
					(err, res) => {
						expect(res).to.be.undefined;
					}
				));
		});
	});

	describe('applyUnconfirmed', () => {
		it('should set __scope.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = true', done => {
			const unconfirmedOutTransfers = OutTransfer.__get__(
				'__scope.unconfirmedOutTansfers'
			);
			outTransfer.applyUnconfirmed(transaction, sender, async () => {
				expect(unconfirmedOutTransfers)
					.to.contain.property(transaction.asset.outTransfer.transactionId)
					.equal(true);
				done();
			});
		});

		it('should call callback with error = undefined', done => {
			outTransfer.applyUnconfirmed(transaction, sender, err => {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call callback with result = undefined', done => {
			outTransfer.applyUnconfirmed(transaction, sender, (err, result) => {
				expect(result).to.be.undefined;
				done();
			});
		});
	});

	describe('undoUnconfirmed', () => {
		it('should set __scope.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = false', done => {
			const unconfirmedOutTransfers = OutTransfer.__get__(
				'__scope.unconfirmedOutTansfers'
			);
			outTransfer.undoUnconfirmed(transaction, sender, async () => {
				expect(unconfirmedOutTransfers)
					.to.contain.property(transaction.asset.outTransfer.transactionId)
					.equal(false);
				done();
			});
		});

		it('should call callback with error = undefined', done => {
			outTransfer.undoUnconfirmed(transaction, sender, err => {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call callback with result = undefined', done => {
			outTransfer.undoUnconfirmed(transaction, sender, (err, result) => {
				expect(result).to.be.undefined;
				done();
			});
		});
	});

	describe('objectNormalize', () => {
		let __scope;
		let schemaSpy;

		beforeEach(done => {
			__scope = OutTransfer.__get__('__scope');
			schemaSpy = sinonSandbox.spy(__scope.schema, 'validate');
			done();
		});

		afterEach(() => schemaSpy.restore());

		it('should call __scope.schema.validate', async () => {
			outTransfer.objectNormalize(transaction);
			return expect(schemaSpy.calledOnce).to.be.true;
		});

		it('should call __scope.schema.validate with transaction.asset.outTransfer', async () => {
			outTransfer.objectNormalize(transaction);
			return expect(schemaSpy.calledWith(transaction.asset.outTransfer)).to.be
				.true;
		});

		it('should call __scope.schema.validate outTransfer.prototype.schema', async () => {
			outTransfer.objectNormalize(transaction);
			return expect(schemaSpy.args[0][1]).to.eql(OutTransfer.prototype.schema);
		});

		describe('when transaction.asset.outTransfer is invalid object argument', () => {
			typesRepresentatives.nonObjects.forEach(nonObject => {
				it(`should throw for transaction.asset.outTransfer = ${
					nonObject.description
				}`, async () =>
					expect(
						outTransfer.objectNormalize.bind(null, nonObject.input)
					).to.throw());
			});
		});

		describe('when transaction.asset.outTransfer.dappId is invalid string argument', () => {
			typesRepresentatives.nonStrings.forEach(nonString => {
				it(`should throw for transaction.asset.outTransfer.dappId = ${
					nonString.description
				}`, async () => {
					transaction.asset.outTransfer.dappId = nonString.input;
					return expect(
						outTransfer.objectNormalize.bind(null, transaction)
					).to.throw();
				});
			});
		});

		describe('when transaction.asset.outTransfer.transactionId is invalid string argument', () => {
			typesRepresentatives.nonStrings.forEach(nonString => {
				it(`should throw for transaction.asset.outTransfer.transactionId = ${
					nonString.description
				}`, async () => {
					transaction.asset.outTransfer.transactionId = nonString.input;
					return expect(
						outTransfer.objectNormalize.bind(null, nonString.input)
					).to.throw();
				});
			});
		});

		describe('when when transaction.asset.outTransfer is valid', () => {
			it('should return transaction', async () =>
				expect(outTransfer.objectNormalize(transaction)).to.eql(transaction));
		});
	});

	describe('dbRead', () => {
		describe('when raw.ot_dappId does not exist', () => {
			beforeEach(async () => delete rawTransaction.ot_dappId);

			it('should return null', async () =>
				expect(outTransfer.dbRead(rawTransaction)).to.eql(null));
		});

		describe('when raw.in_dappId exists', () => {
			it('should return result containing outTransfer', async () =>
				expect(outTransfer.dbRead(rawTransaction)).to.have.property(
					'outTransfer'
				));

			it('should return result containing outTransfer.dappId = raw.ot_dappId', async () =>
				expect(outTransfer.dbRead(rawTransaction))
					.to.have.nested.property('outTransfer.dappId')
					.equal(rawTransaction.ot_dappId));

			it('should return result containing outTransfer.transactionId = raw.ot_outTransactionId', async () =>
				expect(outTransfer.dbRead(rawTransaction))
					.to.have.nested.property('outTransfer.transactionId')
					.equal(rawTransaction.ot_outTransactionId));
		});
	});

	describe('ready', () => {
		it('should return true for single signature transaction', async () =>
			expect(outTransfer.ready(transaction, sender)).to.equal(true));

		it('should return false for multi signature transaction with less signatures', async () => {
			sender.membersPublicKeys = [validKeypair.publicKey.toString('hex')];

			return expect(outTransfer.ready(transaction, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with at least min signatures', async () => {
			sender.membersPublicKeys = [validKeypair.publicKey.toString('hex')];
			sender.multiMin = 1;

			delete transaction.signature;
			// Not really correct signature, but we are not testing that over here
			transaction.signature = crypto.randomBytes(64).toString('hex');
			transaction.signatures = [crypto.randomBytes(64).toString('hex')];

			return expect(outTransfer.ready(transaction, sender)).to.equal(true);
		});
	});
});

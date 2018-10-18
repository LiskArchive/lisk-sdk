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

var crypto = require('crypto');
var rewire = require('rewire');
var modulesLoader = require('../../common/modules_loader');
var typesRepresentatives = require('../../fixtures/types_representatives'); // eslint-disable-line no-unused-vars
var slots = require('../../../helpers/slots');
var testData = require('./test_data/out_transfer');

const { FEES } = __testContext.config.constants;
const exceptions = __testContext.config.exceptions;
var OutTransfer = rewire('../../../logic/out_transfer');
var validKeypair = testData.validKeypair;
var validSender = testData.validSender;
var validTransaction = testData.validTransaction;
var rawValidTransaction = testData.rawValidTransaction;

describe('outTransfer', () => {
	var outTransfer;
	var dbStub;
	var accountsStub;
	var blocksStub;

	var dummyBlock;
	var transaction;
	var rawTransaction;
	var sender;

	beforeEach(() => {
		dbStub = {
			dapps: {
				countByTransactionId: sinonSandbox.stub().resolves(),
				countByOutTransactionId: sinonSandbox.stub().resolves(),
				getExisting: sinonSandbox.stub().resolves(),
				list: sinonSandbox.stub().resolves(),
				getGenesis: sinonSandbox.stub().resolves(),
			},
		};

		accountsStub = {
			mergeAccountAndGet: sinonSandbox.stub().callsArg(1),
			setAccountAndGet: sinonSandbox.stub().callsArg(1),
		};

		dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};

		blocksStub = {
			lastBlock: {
				get: sinonSandbox.stub().returns(dummyBlock),
			},
		};

		transaction = _.cloneDeep(validTransaction);
		rawTransaction = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);

		OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
		outTransfer = new OutTransfer(
			dbStub,
			modulesLoader.scope.schema,
			modulesLoader.logger
		);
		return outTransfer.bind(accountsStub);
	});

	describe('constructor', () => {
		describe('library', () => {
			var library;

			beforeEach(done => {
				new OutTransfer(
					dbStub,
					modulesLoader.scope.schema,
					modulesLoader.logger
				);
				library = OutTransfer.__get__('library');
				done();
			});

			it('should assign db', () => {
				return expect(library)
					.to.have.property('db')
					.eql(dbStub);
			});

			it('should assign schema', () => {
				return expect(library)
					.to.have.property('schema')
					.eql(modulesLoader.scope.schema);
			});

			it('should assign logger', () => {
				return expect(library)
					.to.have.property('logger')
					.eql(modulesLoader.logger);
			});
		});
	});

	describe('bind', () => {
		var modules;

		beforeEach(done => {
			outTransfer.bind(accountsStub, blocksStub);
			modules = OutTransfer.__get__('modules');
			done();
		});

		describe('modules', () => {
			it('should assign accounts', () => {
				return expect(modules)
					.to.have.property('accounts')
					.eql(accountsStub);
			});

			it('should assign blocks', () => {
				return expect(modules)
					.to.have.property('blocks')
					.eql(blocksStub);
			});
		});
	});

	describe('calculateFee', () => {
		it('should return constants.fees.send', () => {
			return expect(outTransfer.calculateFee(transaction).isEqualTo(FEES.SEND))
				.to.be.true;
		});
	});

	describe('verify', () => {
		beforeEach(() => {
			return outTransfer.bind(accountsStub, blocksStub);
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
		beforeEach(() => {
			return OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
		});

		it('should call library.db.dapps.countByTransactionId', done => {
			outTransfer.process(transaction, sender, () => {
				expect(dbStub.dapps.countByTransactionId.calledOnce).to.be.true;
				done();
			});
		});

		it('should call library.db.dapps.countByTransactionId with dappId', done => {
			outTransfer.process(transaction, sender, () => {
				expect(
					dbStub.dapps.countByTransactionId.calledWith(
						transaction.asset.outTransfer.dappId
					)
				).to.be.true;
				done();
			});
		});

		it('should call library.db.dapps.countByTransactionId with transaction.asset.outTransfer.dappId}', done => {
			outTransfer.process(transaction, sender, () => {
				expect(
					dbStub.dapps.countByTransactionId.calledWith(
						transaction.asset.outTransfer.dappId
					)
				).to.be.true;
				done();
			});
		});

		describe('when library.db.one fails', () => {
			beforeEach(done => {
				dbStub.dapps.countByTransactionId = sinonSandbox
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

		describe('when library.db.dapps.countByTransactionId succeeds', () => {
			describe('when dapp does not exist', () => {
				beforeEach(done => {
					dbStub.dapps.countByTransactionId = sinonSandbox.stub().resolves(0);
					dbStub.dapps.countByOutTransactionId = sinonSandbox
						.stub()
						.resolves(0);
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
					dbStub.dapps.countByTransactionId = sinonSandbox.stub().resolves(1);
					dbStub.dapps.countByOutTransactionId = sinonSandbox
						.stub()
						.resolves(1);
					done();
				});

				describe('when unconfirmed out transfer exists', () => {
					beforeEach(() => {
						var unconfirmedTransactionExistsMap = {};
						unconfirmedTransactionExistsMap[
							transaction.asset.outTransfer.transactionId
						] = true;
						return OutTransfer.__set__(
							'__private.unconfirmedOutTansfers',
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
					beforeEach(() => {
						return OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
					});

					it('should call library.db.dapps.countByTransactionId second time', done => {
						outTransfer.process(transaction, sender, () => {
							expect(dbStub.dapps.countByTransactionId.calledOnce).to.be.true;
							expect(dbStub.dapps.countByOutTransactionId.calledOnce).to.be
								.true;
							done();
						});
					});

					it('should call library.db.dapps.countByOutTransactionId', done => {
						outTransfer.process(transaction, sender, () => {
							expect(
								dbStub.dapps.countByOutTransactionId.calledWith(
									transaction.asset.outTransfer.transactionId
								)
							).to.be.true;
							done();
						});
					});

					it('should call library.db.dapps.countByOutTransactionId transaction.asset.outTransfer.transactionId', done => {
						outTransfer.process(transaction, sender, () => {
							expect(
								dbStub.dapps.countByOutTransactionId.calledWith(
									transaction.asset.outTransfer.transactionId
								)
							).to.be.true;
							done();
						});
					});

					describe('when library.db.dapps.countByOutTransactionId fails on call', () => {
						beforeEach(() => {
							return dbStub.dapps.countByOutTransactionId
								.withArgs(transaction.id)
								.rejects('countByOutTransactionId error');
						});

						it('should call callback with error', done => {
							outTransfer.process(transaction, sender, err => {
								expect(err).not.to.be.empty;
								done();
							});
						});
					});

					describe('when library.db.one succeeds on the second call', () => {
						describe('when confirmed outTransfer transaction exists', () => {
							beforeEach(() => {
								return dbStub.dapps.countByOutTransactionId
									.withArgs(transaction.id)
									.resolves(1);
							});

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
								dbStub.dapps.countByTransactionId = sinonSandbox
									.stub()
									.resolves(1);
								dbStub.dapps.countByOutTransactionId = sinonSandbox
									.stub()
									.resolves(0);
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

			it('should throw', () => {
				return expect(outTransfer.getBytes.bind(null, transaction)).to.throw;
			});
		});

		describe('when transaction.asset.outTransfer.dappId is a valid dapp id', () => {
			describe('when transaction.asset.outTransfer.transactionId = undefined', () => {
				beforeEach(done => {
					transaction.asset.outTransfer.transactionId = undefined;
					done();
				});

				it('should throw', () => {
					return expect(outTransfer.getBytes.bind(null, transaction)).to.throw;
				});
			});

			describe('when transaction.asset.outTransfer.transactionId is valid transaction id', () => {
				it('should not throw', () => {
					return expect(outTransfer.getBytes.bind(null, transaction)).not.to
						.throw;
				});

				it('should get bytes of valid transaction', () => {
					return expect(
						outTransfer.getBytes(transaction).toString('hex')
					).to.equal(
						'343136333731333037383236363532343230393134313434333533313632323737313338383231'
					);
				});

				it('should return result as a Buffer type', () => {
					return expect(outTransfer.getBytes(transaction)).to.be.instanceOf(
						Buffer
					);
				});
			});
		});
	});

	describe('applyConfirmed', () => {
		beforeEach(done => {
			outTransfer.applyConfirmed(transaction, dummyBlock, sender, done);
		});

		it('should set __private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = false', () => {
			var unconfirmedOutTransfers = OutTransfer.__get__(
				'__private.unconfirmedOutTansfers'
			);
			return expect(unconfirmedOutTransfers)
				.to.contain.property(transaction.asset.outTransfer.transactionId)
				.equal(false);
		});

		it('should call modules.accounts.setAccountAndGet', () => {
			return expect(accountsStub.setAccountAndGet.calledOnce).to.be.true;
		});

		it('should call modules.accounts.setAccountAndGet with {address: transaction.recipientId}', () => {
			return expect(
				accountsStub.setAccountAndGet.calledWith({
					address: transaction.recipientId,
				})
			).to.be.true;
		});

		describe('when modules.accounts.setAccountAndGet fails', () => {
			beforeEach(done => {
				accountsStub.setAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'setAccountAndGet error');
				done();
			});

			it('should call callback with error', () => {
				return outTransfer.applyConfirmed(
					transaction,
					dummyBlock,
					sender,
					err => {
						expect(err).not.to.be.empty;
					}
				);
			});
		});

		describe('when modules.accounts.setAccountAndGet succeeds', () => {
			beforeEach(done => {
				accountsStub.setAccountAndGet = sinonSandbox.stub().callsArg(1);
				done();
			});

			it('should call modules.accounts.mergeAccountAndGet', () => {
				return expect(accountsStub.mergeAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with address = transaction.recipientId', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ address: transaction.recipientId })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with balance = transaction.amount', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ balance: transaction.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with u_balance = transaction.amount', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ u_balance: transaction.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with round = slots.calcRound result', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ round: slots.calcRound(dummyBlock.height) })
					)
				).to.be.true;
			});

			describe('when modules.accounts.mergeAccountAndGet fails', () => {
				beforeEach(done => {
					accountsStub.mergeAccountAndGet = sinonSandbox
						.stub()
						.callsArgWith(1, 'mergeAccountAndGet error');
					done();
				});

				it('should call callback with error', () => {
					return outTransfer.applyConfirmed(
						transaction,
						dummyBlock,
						sender,
						err => {
							expect(err).not.to.be.empty;
						}
					);
				});
			});

			describe('when modules.accounts.mergeAccountAndGet succeeds', () => {
				it('should call callback with error = undefined', () => {
					return outTransfer.applyConfirmed(
						transaction,
						dummyBlock,
						sender,
						err => {
							expect(err).to.be.undefined;
						}
					);
				});

				it('should call callback with result = undefined', () => {
					return outTransfer.applyConfirmed(
						transaction,
						dummyBlock,
						sender,
						(err, res) => {
							expect(res).to.be.undefined;
						}
					);
				});
			});
		});
	});

	describe('undoConfirmed', () => {
		beforeEach(done => {
			outTransfer.undoConfirmed(transaction, dummyBlock, sender, done);
		});

		it('should set __private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = true', () => {
			var unconfirmedOutTransfers = OutTransfer.__get__(
				'__private.unconfirmedOutTansfers'
			);
			return expect(unconfirmedOutTransfers)
				.to.contain.property(transaction.asset.outTransfer.transactionId)
				.equal(true);
		});

		it('should call modules.accounts.setAccountAndGet', () => {
			return expect(accountsStub.setAccountAndGet.calledOnce).to.be.true;
		});

		it('should call modules.accounts.setAccountAndGet with {address: transaction.recipientId}', () => {
			return expect(
				accountsStub.setAccountAndGet.calledWith({
					address: transaction.recipientId,
				})
			).to.be.true;
		});

		describe('when modules.accounts.setAccountAndGet fails', () => {
			beforeEach(done => {
				accountsStub.setAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'setAccountAndGet error');
				done();
			});

			it('should call callback with error', () => {
				return outTransfer.undoConfirmed(
					transaction,
					dummyBlock,
					sender,
					err => {
						expect(err).not.to.be.empty;
					}
				);
			});
		});

		describe('when modules.accounts.setAccountAndGet succeeds', () => {
			beforeEach(done => {
				accountsStub.setAccountAndGet = sinonSandbox.stub().callsArg(1);
				done();
			});

			it('should call modules.accounts.mergeAccountAndGet', () => {
				return expect(accountsStub.mergeAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with address = transaction.recipientId', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ address: transaction.recipientId })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with balance = -transaction.amount', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ balance: -transaction.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with u_balance = -transaction.amount', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ u_balance: -transaction.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with round = slots.calcRound result', () => {
				return expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ round: slots.calcRound(dummyBlock.height) })
					)
				).to.be.true;
			});
		});

		describe('when modules.accounts.mergeAccountAndGet fails', () => {
			beforeEach(done => {
				accountsStub.mergeAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'mergeAccountAndGet error');
				done();
			});

			it('should call callback with error', () => {
				return outTransfer.undoConfirmed(
					transaction,
					dummyBlock,
					sender,
					err => {
						expect(err).not.to.be.empty;
					}
				);
			});
		});

		describe('when modules.accounts.mergeAccountAndGet succeeds', () => {
			it('should call callback with error = undefined', () => {
				return outTransfer.undoConfirmed(
					transaction,
					dummyBlock,
					sender,
					err => {
						expect(err).to.be.undefined;
					}
				);
			});

			it('should call callback with result = undefined', () => {
				return outTransfer.undoConfirmed(
					transaction,
					dummyBlock,
					sender,
					(err, res) => {
						expect(res).to.be.undefined;
					}
				);
			});
		});
	});

	describe('applyUnconfirmed', () => {
		it('should set __private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = true', done => {
			var unconfirmedOutTransfers = OutTransfer.__get__(
				'__private.unconfirmedOutTansfers'
			);
			outTransfer.applyUnconfirmed(transaction, sender, () => {
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
		it('should set __private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = false', done => {
			var unconfirmedOutTransfers = OutTransfer.__get__(
				'__private.unconfirmedOutTansfers'
			);
			outTransfer.undoUnconfirmed(transaction, sender, () => {
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
		var library;
		var schemaSpy;

		beforeEach(done => {
			library = OutTransfer.__get__('library');
			schemaSpy = sinonSandbox.spy(library.schema, 'validate');
			done();
		});

		afterEach(() => {
			return schemaSpy.restore();
		});

		it('should call library.schema.validate', () => {
			outTransfer.objectNormalize(transaction);
			return expect(schemaSpy.calledOnce).to.be.true;
		});

		it('should call library.schema.validate with transaction.asset.outTransfer', () => {
			outTransfer.objectNormalize(transaction);
			return expect(schemaSpy.calledWith(transaction.asset.outTransfer)).to.be
				.true;
		});

		it('should call library.schema.validate outTransfer.prototype.schema', () => {
			outTransfer.objectNormalize(transaction);
			return expect(schemaSpy.args[0][1]).to.eql(OutTransfer.prototype.schema);
		});

		describe('when transaction.asset.outTransfer is invalid object argument', () => {
			typesRepresentatives.nonObjects.forEach(nonObject => {
				it(`should throw for transaction.asset.outTransfer = ${
					nonObject.description
				}`, () => {
					return expect(
						outTransfer.objectNormalize.bind(null, nonObject.input)
					).to.throw();
				});
			});
		});

		describe('when transaction.asset.outTransfer.dappId is invalid string argument', () => {
			typesRepresentatives.nonStrings.forEach(nonString => {
				it(`should throw for transaction.asset.outTransfer.dappId = ${
					nonString.description
				}`, () => {
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
				}`, () => {
					transaction.asset.outTransfer.transactionId = nonString.input;
					return expect(
						outTransfer.objectNormalize.bind(null, nonString.input)
					).to.throw();
				});
			});
		});

		describe('when when transaction.asset.outTransfer is valid', () => {
			it('should return transaction', () => {
				return expect(outTransfer.objectNormalize(transaction)).to.eql(
					transaction
				);
			});
		});
	});

	describe('dbRead', () => {
		describe('when raw.ot_dappId does not exist', () => {
			beforeEach(() => {
				return delete rawTransaction.ot_dappId;
			});

			it('should return null', () => {
				return expect(outTransfer.dbRead(rawTransaction)).to.eql(null);
			});
		});

		describe('when raw.in_dappId exists', () => {
			it('should return result containing outTransfer', () => {
				return expect(outTransfer.dbRead(rawTransaction)).to.have.property(
					'outTransfer'
				);
			});

			it('should return result containing outTransfer.dappId = raw.ot_dappId', () => {
				return expect(outTransfer.dbRead(rawTransaction))
					.to.have.nested.property('outTransfer.dappId')
					.equal(rawTransaction.ot_dappId);
			});

			it('should return result containing outTransfer.transactionId = raw.ot_outTransactionId', () => {
				return expect(outTransfer.dbRead(rawTransaction))
					.to.have.nested.property('outTransfer.transactionId')
					.equal(rawTransaction.ot_outTransactionId);
			});
		});
	});

	describe('ready', () => {
		it('should return true for single signature transaction', () => {
			return expect(outTransfer.ready(transaction, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', () => {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			return expect(outTransfer.ready(transaction, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with at least min signatures', () => {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete transaction.signature;
			// Not really correct signature, but we are not testing that over here
			transaction.signature = crypto.randomBytes(64).toString('hex');
			transaction.signatures = [crypto.randomBytes(64).toString('hex')];

			return expect(outTransfer.ready(transaction, sender)).to.equal(true);
		});
	});
});

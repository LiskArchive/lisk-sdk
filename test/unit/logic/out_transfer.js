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

var OutTransfer = rewire('../../../logic/out_transfer');
var constants = require('../../../helpers/constants');
var slots = require('../../../helpers/slots');

var testData = require('./test_data/out_transfer');

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

		OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
		outTransfer = new OutTransfer(
			dbStub,
			modulesLoader.scope.schema,
			modulesLoader.logger
		);
		outTransfer.bind(accountsStub);

		transaction = _.cloneDeep(validTransaction);
		rawTransaction = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
	});

	describe('constructor', () => {
		describe('library', () => {
			var library;

			beforeEach(() => {
				new OutTransfer(
					dbStub,
					modulesLoader.scope.schema,
					modulesLoader.logger
				);
				library = OutTransfer.__get__('library');
			});

			it('should assign db', () => {
				expect(library)
					.to.have.property('db')
					.eql(dbStub);
			});

			it('should assign schema', () => {
				expect(library)
					.to.have.property('schema')
					.eql(modulesLoader.scope.schema);
			});

			it('should assign logger', () => {
				expect(library)
					.to.have.property('logger')
					.eql(modulesLoader.logger);
			});
		});
	});

	describe('bind', () => {
		var modules;

		beforeEach(() => {
			outTransfer.bind(accountsStub, blocksStub);
			modules = OutTransfer.__get__('modules');
		});

		describe('modules', () => {
			it('should assign accounts', () => {
				expect(modules)
					.to.have.property('accounts')
					.eql(accountsStub);
			});

			it('should assign blocks', () => {
				expect(modules)
					.to.have.property('blocks')
					.eql(blocksStub);
			});
		});
	});

	describe('calculateFee', () => {
		it('should return constants.fees.send', () => {
			expect(outTransfer.calculateFee(transaction)).to.equal(
				constants.fees.send
			);
		});
	});

	describe('verify', () => {
		beforeEach(() => {
			outTransfer.bind(accountsStub, blocksStub);
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

		describe('when transaction.amount does not exist', () => {
			it('should call callback with error = "Transaction type 7 is frozen"', done => {
				delete transaction.amount;
				outTransfer.verify(transaction, sender, err => {
					expect(err).to.equal('Transaction type 7 is frozen');
					done();
				});
			});
		});

		describe('when transaction.amount = 0', () => {
			it('should call callback with error = "Transaction type 7 is frozen"', done => {
				transaction.amount = 0;
				outTransfer.verify(transaction, sender, err => {
					expect(err).to.equal('Transaction type 7 is frozen');
					done();
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

		describe('when transaction.asset.inTransfer does not exist', () => {
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
			OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
		});

		it('should call library.db.dapps.countByTransactionId', done => {
			outTransfer.process(transaction, sender, () => {
				expect(dbStub.dapps.countByTransactionId.calledOnce).to.be.true;
				done();
			});
		});

		it('should call library.db.dapps.countByTransactionId', done => {
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
			beforeEach(() => {
				dbStub.dapps.countByTransactionId = sinonSandbox
					.stub()
					.rejects('Rejection error');
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
				beforeEach(() => {
					dbStub.dapps.countByTransactionId = sinonSandbox.stub().resolves(0);
					dbStub.dapps.countByOutTransactionId = sinonSandbox
						.stub()
						.resolves(0);
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
				beforeEach(() => {
					dbStub.dapps.countByTransactionId = sinonSandbox.stub().resolves(1);
					dbStub.dapps.countByOutTransactionId = sinonSandbox
						.stub()
						.resolves(1);
				});

				describe('when unconfirmed out transfer exists', () => {
					beforeEach(() => {
						var unconfirmedTransactionExistsMap = {};
						unconfirmedTransactionExistsMap[
							transaction.asset.outTransfer.transactionId
						] = true;
						OutTransfer.__set__(
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
						OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
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
							dbStub.dapps.countByOutTransactionId
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
								dbStub.dapps.countByOutTransactionId
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
							beforeEach(() => {
								dbStub.dapps.countByTransactionId = sinonSandbox
									.stub()
									.resolves(1);
								dbStub.dapps.countByOutTransactionId = sinonSandbox
									.stub()
									.resolves(0);
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
			beforeEach(() => {
				transaction.asset.outTransfer.dappId = undefined;
			});

			it('should throw', () => {
				expect(outTransfer.getBytes.bind(null, transaction)).to.throw;
			});
		});

		describe('when transaction.asset.outTransfer.dappId is a valid dapp id', () => {
			describe('when transaction.asset.outTransfer.transactionId = undefined', () => {
				beforeEach(() => {
					transaction.asset.outTransfer.transactionId = undefined;
				});

				it('should throw', () => {
					expect(outTransfer.getBytes.bind(null, transaction)).to.throw;
				});
			});

			describe('when transaction.asset.outTransfer.transactionId is valid transaction id', () => {
				it('should not throw', () => {
					expect(outTransfer.getBytes.bind(null, transaction)).not.to.throw;
				});

				it('should get bytes of valid transaction', () => {
					expect(outTransfer.getBytes(transaction).toString('hex')).to.equal(
						'343136333731333037383236363532343230393134313434333533313632323737313338383231'
					);
				});

				it('should return result as a Buffer type', () => {
					expect(outTransfer.getBytes(transaction)).to.be.instanceOf(Buffer);
				});
			});
		});
	});

	describe('apply', () => {
		beforeEach(done => {
			outTransfer.apply(transaction, dummyBlock, sender, done);
		});

		it('should set __private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = false', () => {
			var unconfirmedOutTransfers = OutTransfer.__get__(
				'__private.unconfirmedOutTansfers'
			);
			expect(unconfirmedOutTransfers)
				.to.contain.property(transaction.asset.outTransfer.transactionId)
				.equal(false);
		});

		it('should call modules.accounts.setAccountAndGet', () => {
			expect(accountsStub.setAccountAndGet.calledOnce).to.be.true;
		});

		it('should call modules.accounts.setAccountAndGet with {address: transaction.recipientId}', () => {
			expect(
				accountsStub.setAccountAndGet.calledWith({
					address: transaction.recipientId,
				})
			).to.be.true;
		});

		describe('when modules.accounts.setAccountAndGet fails', () => {
			beforeEach(() => {
				accountsStub.setAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'setAccountAndGet error');
			});

			it('should call callback with error', () => {
				outTransfer.apply(transaction, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when modules.accounts.setAccountAndGet succeeds', () => {
			beforeEach(() => {
				accountsStub.setAccountAndGet = sinonSandbox.stub().callsArg(1);
			});

			it('should call modules.accounts.mergeAccountAndGet', () => {
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with address = transaction.recipientId', () => {
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ address: transaction.recipientId })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with balance = transaction.amount', () => {
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ balance: transaction.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with u_balance = transaction.amount', () => {
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ u_balance: transaction.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with blockId = block.id', () => {
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ blockId: dummyBlock.id })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with round = slots.calcRound result', () => {
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ round: slots.calcRound(dummyBlock.height) })
					)
				).to.be.true;
			});

			describe('when modules.accounts.mergeAccountAndGet fails', () => {
				beforeEach(() => {
					accountsStub.mergeAccountAndGet = sinonSandbox
						.stub()
						.callsArgWith(1, 'mergeAccountAndGet error');
				});

				it('should call callback with error', () => {
					outTransfer.apply(transaction, dummyBlock, sender, err => {
						expect(err).not.to.be.empty;
					});
				});
			});

			describe('when modules.accounts.mergeAccountAndGet succeeds', () => {
				it('should call callback with error = undefined', () => {
					outTransfer.apply(transaction, dummyBlock, sender, err => {
						expect(err).to.be.undefined;
					});
				});

				it('should call callback with result = undefined', () => {
					outTransfer.apply(transaction, dummyBlock, sender, (err, res) => {
						expect(res).to.be.undefined;
					});
				});
			});
		});
	});

	describe('undo', () => {
		beforeEach(done => {
			outTransfer.undo(transaction, dummyBlock, sender, done);
		});

		it('should set __private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = true', () => {
			var unconfirmedOutTransfers = OutTransfer.__get__(
				'__private.unconfirmedOutTansfers'
			);
			expect(unconfirmedOutTransfers)
				.to.contain.property(transaction.asset.outTransfer.transactionId)
				.equal(true);
		});

		it('should call modules.accounts.setAccountAndGet', () => {
			expect(accountsStub.setAccountAndGet.calledOnce).to.be.true;
		});

		it('should call modules.accounts.setAccountAndGet with {address: transaction.recipientId}', () => {
			expect(
				accountsStub.setAccountAndGet.calledWith({
					address: transaction.recipientId,
				})
			).to.be.true;
		});

		describe('when modules.accounts.setAccountAndGet fails', () => {
			beforeEach(() => {
				accountsStub.setAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'setAccountAndGet error');
			});

			it('should call callback with error', () => {
				outTransfer.undo(transaction, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when modules.accounts.setAccountAndGet succeeds', () => {
			beforeEach(() => {
				accountsStub.setAccountAndGet = sinonSandbox.stub().callsArg(1);
			});

			it('should call modules.accounts.mergeAccountAndGet', () => {
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with address = transaction.recipientId', () => {
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ address: transaction.recipientId })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with balance = -transaction.amount', () => {
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ balance: -transaction.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with u_balance = -transaction.amount', () => {
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ u_balance: -transaction.amount })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with blockId = block.id', () => {
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ blockId: dummyBlock.id })
					)
				).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with round = slots.calcRound result', () => {
				expect(
					accountsStub.mergeAccountAndGet.calledWith(
						sinonSandbox.match({ round: slots.calcRound(dummyBlock.height) })
					)
				).to.be.true;
			});
		});

		describe('when modules.accounts.mergeAccountAndGet fails', () => {
			beforeEach(() => {
				accountsStub.mergeAccountAndGet = sinonSandbox
					.stub()
					.callsArgWith(1, 'mergeAccountAndGet error');
			});

			it('should call callback with error', () => {
				outTransfer.undo(transaction, dummyBlock, sender, err => {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when modules.accounts.mergeAccountAndGet succeeds', () => {
			it('should call callback with error = undefined', () => {
				outTransfer.undo(transaction, dummyBlock, sender, err => {
					expect(err).to.be.undefined;
				});
			});

			it('should call callback with result = undefined', () => {
				outTransfer.undo(transaction, dummyBlock, sender, (err, res) => {
					expect(res).to.be.undefined;
				});
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

		beforeEach(() => {
			library = OutTransfer.__get__('library');
			schemaSpy = sinonSandbox.spy(library.schema, 'validate');
		});

		afterEach(() => {
			schemaSpy.restore();
		});

		it('should call library.schema.validate', () => {
			outTransfer.objectNormalize(transaction);
			expect(schemaSpy.calledOnce).to.be.true;
		});

		it('should call library.schema.validate with transaction.asset.outTransfer', () => {
			outTransfer.objectNormalize(transaction);
			expect(schemaSpy.calledWith(transaction.asset.outTransfer)).to.be.true;
		});

		it('should call library.schema.validate outTransfer.prototype.schema', () => {
			outTransfer.objectNormalize(transaction);
			expect(schemaSpy.args[0][1]).to.eql(OutTransfer.prototype.schema);
		});

		describe('when transaction.asset.outTransfer is invalid object argument', () => {
			typesRepresentatives.nonObjects.forEach(nonObject => {
				it(`should throw for transaction.asset.outTransfer = ${
					nonObject.description
				}`, () => {
					expect(
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
					expect(
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
					expect(
						outTransfer.objectNormalize.bind(null, nonString.input)
					).to.throw();
				});
			});
		});

		describe('when when transaction.asset.outTransfer is valid', () => {
			it('should return transaction', () => {
				expect(outTransfer.objectNormalize(transaction)).to.eql(transaction);
			});
		});
	});

	describe('dbRead', () => {
		describe('when raw.ot_dappId does not exist', () => {
			beforeEach(() => {
				delete rawTransaction.ot_dappId;
			});

			it('should return null', () => {
				expect(outTransfer.dbRead(rawTransaction)).to.eql(null);
			});
		});

		describe('when raw.in_dappId exists', () => {
			it('should return result containing outTransfer', () => {
				expect(outTransfer.dbRead(rawTransaction)).to.have.property(
					'outTransfer'
				);
			});

			it('should return result containing outTransfer.dappId = raw.ot_dappId', () => {
				expect(outTransfer.dbRead(rawTransaction))
					.to.have.nested.property('outTransfer.dappId')
					.equal(rawTransaction.ot_dappId);
			});

			it('should return result containing outTransfer.dappId = raw.ot_dappId', () => {
				expect(outTransfer.dbRead(rawTransaction))
					.to.have.nested.property('outTransfer.transactionId')
					.equal(rawTransaction.ot_outTransactionId);
			});
		});
	});

	describe('ready', () => {
		it('should return true for single signature transaction', () => {
			expect(outTransfer.ready(transaction, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', () => {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(outTransfer.ready(transaction, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with at least min signatures', () => {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete transaction.signature;
			// Not really correct signature, but we are not testing that over here
			transaction.signature = crypto.randomBytes(64).toString('hex');
			transaction.signatures = [crypto.randomBytes(64).toString('hex')];

			expect(outTransfer.ready(transaction, sender)).to.equal(true);
		});
	});
});

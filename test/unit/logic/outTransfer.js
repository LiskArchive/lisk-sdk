'use strict';/*eslint*/

var crypto = require('crypto');
var _  = require('lodash');

var expect = require('chai').expect;
var rewire = require('rewire');
var sinon   = require('sinon');

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var slots = require('../../../helpers/slots.js');
var modulesLoader = require('../../common/modulesLoader');
var typesRepresentatives = require('../../fixtures/typesRepresentatives');

var OutTransfer = rewire('../../../logic/outTransfer.js');
var sql = require('../../../sql/dapps.js');

var testData = require('./testData/outTransfer.js');

var validPassword = testData.validPassword;
var validKeypair = testData.validKeypair;
var senderHash = testData.senderHash;
var senderKeypair = testData.senderKeypair;
var validSender = testData.validSender;
var validTransaction = testData.validTransaction;
var rawValidTransaction = testData.rawValidTransaction;
var validGetGensisResult = testData.validGetGensisResult;

describe('outTransfer', function () {

	var outTransfer;
	var dbStub;
	var sharedStub;
	var accountsStub;

	var dummyBlock;
	var transaction;
	var rawTransaction;
	var sender;

	beforeEach(function () {
		dbStub = {
			query: sinon.stub().resolves(),
			one: sinon.stub().resolves()
		};

		sharedStub = {
			getGenesis: sinon.stub().callsArgWith(1, null, validGetGensisResult)
		};

		accountsStub = {
			mergeAccountAndGet: sinon.stub().callsArg(1),
			setAccountAndGet: sinon.stub().callsArg(1)
		};
		dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};
		OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
		outTransfer = new OutTransfer(dbStub, modulesLoader.scope.schema, modulesLoader.logger);
		outTransfer.bind(accountsStub);

		transaction = _.cloneDeep(validTransaction);
		rawTransaction = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
	});

	describe('constructor', function () {

		describe('library', function () {

			var library;

			beforeEach(function () {
				new OutTransfer(dbStub, modulesLoader.scope.schema, modulesLoader.logger);
				library = OutTransfer.__get__('library');
			});

			it('should assign db', function () {
				expect(library).to.have.property('db').eql(dbStub);
			});

			it('should assign schema', function () {
				expect(library).to.have.property('schema').eql(modulesLoader.scope.schema);
			});

			it('should assign logger', function () {
				expect(library).to.have.property('logger').eql(modulesLoader.logger);
			});
		});
	});

	describe('bind', function () {

		var modules;

		beforeEach(function () {
			outTransfer.bind(accountsStub);
			modules = OutTransfer.__get__('modules');
		});

		describe('modules', function () {

			it('should assign accounts', function () {
				expect(modules).to.have.property('accounts').eql(accountsStub);
			});
		});
	});

	describe('calculateFee', function () {

		it('should return constants.fees.send', function () {
			expect(outTransfer.calculateFee(transaction)).to.equal(node.constants.fees.send);
		});
	});

	describe('verify', function () {

		describe('when transaction.recipientId does not exist', function () {

			it('should call callback with error = "Invalid recipient"', function (done) {
				delete transaction.recipientId;
				outTransfer.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid recipient');
					done();
				});
			});
		});

		describe('when transaction.amount does not exist', function () {

			it('should call callback with error = "Invalid transaction amount"', function (done) {
				delete transaction.amount;
				outTransfer.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid transaction amount');
					done();
				});
			});
		});

		describe('when transaction.amount = 0', function () {

			it('should call callback with error = "Invalid transaction amount"', function (done) {
				transaction.amount = 0;
				outTransfer.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid transaction amount');
					done();
				});
			});
		});

		describe('when transaction.asset does not exist', function () {

			it('should call callback with error = "Invalid transaction asset"', function (done) {
				delete transaction.asset;
				outTransfer.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});
		});

		describe('when transaction.asset.inTransfer does not exist', function () {

			it('should call callback with error = "Invalid transaction asset"', function (done) {
				delete transaction.asset.outTransfer;
				outTransfer.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});
		});

		describe('when transaction.asset.outTransfer = 0', function () {

			it('should call callback with error = "Invalid transaction asset"', function (done) {
				transaction.asset.outTransfer = 0;
				outTransfer.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});
		});

		describe('when transaction.asset.outTransfer.dappId is invalid', function () {

			it('should call callback with error = "Invalid outTransfer dappId"', function (done) {
				transaction.asset.outTransfer.dappId = 'ab1231';
				outTransfer.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid outTransfer dappId');
					done();
				});
			});
		});

		describe('when transaction.asset.outTransfer.transactionId is invalid', function () {

			it('should call callback with error = "Invalid outTransfer transactionId"', function (done) {
				transaction.asset.outTransfer.transactionId = 'ab1231';
				outTransfer.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid outTransfer transactionId');
					done();
				});
			});
		});

		describe('when transaction is valid', function () {

			it('should call callback with error = null', function (done) {
				outTransfer.verify(transaction, sender, function (err) {
					expect(err).to.be.null;
					done();
				});
			});

			it('should call callback with result = transaction', function (done) {
				outTransfer.verify(transaction, sender, function (err, res) {
					expect(res).to.eql(transaction);
					done();
				});
			});
		});
	});

	describe('process', function () {

		beforeEach(function () {
			OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
		});

		it('should call library.db.one', function (done) {
			outTransfer.process(transaction, sender, function () {
				expect(dbStub.one.calledOnce).to.be.true;
				done();
			});
		});

		it('should call library.db.one with sql.countByTransactionId', function (done) {
			outTransfer.process(transaction, sender, function () {
				expect(dbStub.one.calledWith(sql.countByTransactionId)).to.be.true;
				done();
			});
		});

		it('should call library.db.one with {id: transaction.asset.outTransfer.dappId}', function (done) {
			outTransfer.process(transaction, sender, function () {
				expect(dbStub.one.args[0][1]).to.eql({id: transaction.asset.outTransfer.dappId});
				done();
			});
		});

		describe('when library.db.one fails', function () {

			beforeEach(function () {
				dbStub.one = sinon.stub().rejects('Rejection error');
			});

			it('should call callback with error', function (done) {
				outTransfer.process(transaction, sender, function (err) {
					expect(err).not.to.be.empty;
					done();
				});
			});
		});

		describe('when library.db.one succeeds', function () {

			describe('when dapp does not exist', function () {

				beforeEach(function () {
					dbStub.one = sinon.stub().resolves({count: 0});
				});

				it('should call callback with error', function (done) {
					outTransfer.process(transaction, sender, function (err) {
						expect(err).to.equal('Application not found: ' + transaction.asset.outTransfer.dappId);
						done();
					});
				});
			});

			describe('when dapp exists', function () {

				beforeEach(function () {
					dbStub.one = sinon.stub().resolves({count: 1});
				});

				describe('when unconfirmed out transfer exists', function () {

					beforeEach(function () {
						var unconfirmedTransactionExistsMap = {};
						unconfirmedTransactionExistsMap[transaction.asset.outTransfer.transactionId] = true;
						OutTransfer.__set__('__private.unconfirmedOutTansfers', unconfirmedTransactionExistsMap);
					});

					it('should call callback with error', function (done) {
						outTransfer.process(transaction, sender, function (err) {
							expect(err).to.equal('Transaction is already processed: ' + transaction.asset.outTransfer.transactionId);
							done();
						});
					});
				});

				describe('when unconfirmed out transfer does not exist', function () {

					beforeEach(function () {
						OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
					});

					it('should call library.db.one second time', function (done) {
						outTransfer.process(transaction, sender, function () {
							expect(dbStub.one.calledTwice).to.be.true;
							done();
						});
					});

					it('should call library.db.one with sql.countByTransactionId', function (done) {
						outTransfer.process(transaction, sender, function () {
							expect(dbStub.one.calledWith(sql.countByOutTransactionId)).to.be.true;
							done();
						});
					});

					it('should call library.db.one with {id: transaction.asset.outTransfer.transactionId}', function (done) {
						outTransfer.process(transaction, sender, function () {
							expect(dbStub.one.args[1][1]).to.eql({transactionId: transaction.asset.outTransfer.transactionId});
							done();
						});
					});

					describe('when library.db.one fails on the second call', function () {

						beforeEach(function () {
							dbStub.one.withArgs(sql.countByOutTransactionId).rejects('countByOutTransactionId error');
						});

						it('should call callback with error', function (done) {
							outTransfer.process(transaction, sender, function (err) {
								expect(err).not.to.be.empty;
								done();
							});
						});
					});

					describe('when library.db.one succeeds on the second call', function () {

						describe('when confirmed outTransfer transaction exists', function () {

							beforeEach(function () {
								dbStub.one.withArgs(sql.countByOutTransactionId).resolves({count: 1});
							});

							it('should call callback with error', function (done) {
								outTransfer.process(transaction, sender, function (err) {
									expect(err).to.equal('Transaction is already confirmed: ' + transaction.asset.outTransfer.transactionId);
									done();
								});
							});
						});

						describe('when confirmed outTransfer transaction does not exist', function () {

							beforeEach(function () {
								dbStub.one.withArgs(sql.countByOutTransactionId).resolves({count: 0});
							});

							it('should call callback with error = null', function (done) {
								outTransfer.process(transaction, sender, function (err) {
									expect(err).to.be.null;
									done();
								});
							});

							it('should call callback with result = transaction', function (done) {
								outTransfer.process(transaction, sender, function (err, res) {
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

	describe('getBytes', function () {

		describe('when transaction.asset.outTransfer.dappId = undefined', function () {

			beforeEach(function () {
				transaction.asset.outTransfer.dappId = undefined;
			});

			it('should throw', function () {
				expect(outTransfer.getBytes.bind(null, transaction)).to.throw;
			});
		});

		describe('when transaction.asset.outTransfer.dappId is a valid dapp id', function () {

			describe('when transaction.asset.outTransfer.transactionId = undefined', function () {

				beforeEach(function () {
					transaction.asset.outTransfer.transactionId = undefined;
				});

				it('should throw', function () {
					expect(outTransfer.getBytes.bind(null, transaction)).to.throw;
				});
			});

			describe('when transaction.asset.outTransfer.transactionId is valid transaction id', function () {

				it('should not throw', function () {
					expect(outTransfer.getBytes.bind(null, transaction)).not.to.throw;
				});

				it('should get bytes of valid transaction', function () {
					expect(outTransfer.getBytes(transaction).toString('hex')).to.equal('343136333731333037383236363532343230393134313434333533313632323737313338383231');
				});

				it('should return result as a Buffer type', function () {
					expect(outTransfer.getBytes(transaction)).to.be.instanceOf(Buffer);
				});
			});
		});
	});

	describe('apply', function () {

		beforeEach(function (done) {
			outTransfer.apply(transaction, dummyBlock, sender, done);
		});

		it('should set __private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = false', function () {
			var unconfirmedOutTransfers = OutTransfer.__get__('__private.unconfirmedOutTansfers');
			expect(unconfirmedOutTransfers).to.contain.property(transaction.asset.outTransfer.transactionId).equal(false);
		});

		it('should call modules.accounts.setAccountAndGet', function () {
			expect(accountsStub.setAccountAndGet.calledOnce).to.be.true;
		});

		it('should call modules.accounts.setAccountAndGet with {address: transaction.recipientId}', function () {
			expect(accountsStub.setAccountAndGet.calledWith({address: transaction.recipientId})).to.be.true;
		});

		describe('when modules.accounts.setAccountAndGet fails', function () {

			beforeEach(function () {
				accountsStub.setAccountAndGet = sinon.stub.callsArgWith(1, 'setAccountAndGet error');
			});

			it('should call callback with error', function () {
				outTransfer.apply(transaction, dummyBlock, sender, function (err) {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when modules.accounts.setAccountAndGet succeeds', function () {

			beforeEach(function () {
				accountsStub.setAccountAndGet = sinon.stub.callsArg(1);
			});

			it('should call modules.accounts.mergeAccountAndGet', function () {
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with address = transaction.recipientId', function () {
				expect(accountsStub.mergeAccountAndGet.calledWith(sinon.match({address: transaction.recipientId}))).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with balance = transaction.amount', function () {
				expect(accountsStub.mergeAccountAndGet.calledWith(sinon.match({balance: transaction.amount}))).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with u_balance = transaction.amount', function () {
				expect(accountsStub.mergeAccountAndGet.calledWith(sinon.match({u_balance: transaction.amount}))).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with blockId = block.id', function () {
				expect(accountsStub.mergeAccountAndGet.calledWith(sinon.match({blockId: dummyBlock.id}))).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with round = slots.calcRound result', function () {
				expect(accountsStub.mergeAccountAndGet.calledWith(sinon.match({round: slots.calcRound(dummyBlock.height)}))).to.be.true;
			});

			describe('when modules.accounts.mergeAccountAndGet fails', function () {

				beforeEach(function () {
					accountsStub.mergeAccountAndGet = sinon.stub().callsArgWith(1, 'mergeAccountAndGet error');
				});

				it('should call callback with error', function () {
					outTransfer.apply(transaction, dummyBlock, sender, function (err) {
						expect(err).not.to.be.empty;
					});
				});
			});

			describe('when modules.accounts.mergeAccountAndGet succeeds', function () {

				it('should call callback with error = undefined', function () {
					outTransfer.apply(transaction, dummyBlock, sender, function (err) {
						expect(err).to.be.undefined;
					});
				});

				it('should call callback with result = undefined', function () {
					outTransfer.apply(transaction, dummyBlock, sender, function (err, res) {
						expect(res).to.be.undefined;
					});
				});
			});
		});
	});

	describe('undo', function () {

		beforeEach(function (done) {
			outTransfer.undo(transaction, dummyBlock, sender, done);
		});

		it('should set __private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = true', function () {
			var unconfirmedOutTransfers = OutTransfer.__get__('__private.unconfirmedOutTansfers');
			expect(unconfirmedOutTransfers).to.contain.property(transaction.asset.outTransfer.transactionId).equal(true);
		});

		it('should call modules.accounts.setAccountAndGet', function () {
			expect(accountsStub.setAccountAndGet.calledOnce).to.be.true;
		});

		it('should call modules.accounts.setAccountAndGet with {address: transaction.recipientId}', function () {
			expect(accountsStub.setAccountAndGet.calledWith({address: transaction.recipientId})).to.be.true;
		});

		describe('when modules.accounts.setAccountAndGet fails', function () {

			beforeEach(function () {
				accountsStub.setAccountAndGet = sinon.stub.callsArgWith(1, 'setAccountAndGet error');
			});

			it('should call callback with error', function () {
				outTransfer.undo(transaction, dummyBlock, sender, function (err) {
					expect(err).not.to.be.empty;
				});
			});
		});

		describe('when modules.accounts.setAccountAndGet succeeds', function () {

			beforeEach(function () {
				accountsStub.setAccountAndGet = sinon.stub.callsArg(1);
			});

			it('should call modules.accounts.mergeAccountAndGet', function () {
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with address = transaction.recipientId', function () {
				expect(accountsStub.mergeAccountAndGet.calledWith(sinon.match({address: transaction.recipientId}))).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with balance = -transaction.amount', function () {
				expect(accountsStub.mergeAccountAndGet.calledWith(sinon.match({balance: -transaction.amount}))).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with u_balance = -transaction.amount', function () {
				expect(accountsStub.mergeAccountAndGet.calledWith(sinon.match({u_balance: -transaction.amount}))).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with blockId = block.id', function () {
				expect(accountsStub.mergeAccountAndGet.calledWith(sinon.match({blockId: dummyBlock.id}))).to.be.true;
			});

			it('should call modules.accounts.mergeAccountAndGet with round = slots.calcRound result', function () {
				expect(accountsStub.mergeAccountAndGet.calledWith(sinon.match({round: slots.calcRound(dummyBlock.height)}))).to.be.true;
			});

			describe('when modules.accounts.mergeAccountAndGet fails', function () {

				beforeEach(function () {
					accountsStub.mergeAccountAndGet = sinon.stub().callsArgWith(1, 'mergeAccountAndGet error');
				});

				it('should call callback with error', function () {
					outTransfer.undo(transaction, dummyBlock, sender, function (err) {
						expect(err).not.to.be.empty;
					});
				});
			});

			describe('when modules.accounts.mergeAccountAndGet succeeds', function () {

				it('should call callback with error = undefined', function () {
					outTransfer.undo(transaction, dummyBlock, sender, function (err) {
						expect(err).to.be.undefined;
					});
				});

				it('should call callback with result = undefined', function () {
					outTransfer.undo(transaction, dummyBlock, sender, function (err, res) {
						expect(res).to.be.undefined;
					});
				});
			});
		});
	});

	describe('applyUnconfirmed', function () {

		it('should set __private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = true', function (done) {
			var unconfirmedOutTransfers = OutTransfer.__get__('__private.unconfirmedOutTansfers');
			outTransfer.applyUnconfirmed(transaction, sender, function () {
				expect(unconfirmedOutTransfers).to.contain.property(transaction.asset.outTransfer.transactionId).equal(true);
				done();
			});
		});

		it('should call callback with error = undefined', function (done) {
			outTransfer.applyUnconfirmed(transaction, sender, function (err) {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call callback with result = undefined', function (done) {
			outTransfer.applyUnconfirmed(transaction, sender, function (err, result) {
				expect(result).to.be.undefined;
				done();
			});
		});
	});

	describe('undoUnconfirmed', function () {

		it('should set __private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = false', function (done) {
			var unconfirmedOutTransfers = OutTransfer.__get__('__private.unconfirmedOutTansfers');
			outTransfer.undoUnconfirmed(transaction, sender, function () {
				expect(unconfirmedOutTransfers).to.contain.property(transaction.asset.outTransfer.transactionId).equal(false);
				done();
			});
		});

		it('should call callback with error = undefined', function (done) {
			outTransfer.undoUnconfirmed(transaction, sender, function (err) {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call callback with result = undefined', function (done) {
			outTransfer.undoUnconfirmed(transaction, sender, function (err, result) {
				expect(result).to.be.undefined;
				done();
			});
		});
	});

	describe('objectNormalize', function () {

		var library;
		var schemaSpy;

		beforeEach(function () {
			library = OutTransfer.__get__('library');
			schemaSpy = sinon.spy(library.schema, 'validate');
		});

		afterEach(function () {
			schemaSpy.restore();
		});

		it('should call library.schema.validate', function () {
			outTransfer.objectNormalize(transaction);
			expect(schemaSpy.calledOnce).to.be.true;
		});

		it('should call library.schema.validate with transaction.asset.outTransfer', function () {
			outTransfer.objectNormalize(transaction);
			expect(schemaSpy.calledWith(transaction.asset.outTransfer)).to.be.true;
		});

		it('should call library.schema.validate outTransfer.prototype.schema', function () {
			outTransfer.objectNormalize(transaction);
			expect(schemaSpy.args[0][1]).to.eql(OutTransfer.prototype.schema);
		});

		describe('when transaction.asset.outTransfer is invalid object argument', function () {

			typesRepresentatives.nonObjects.forEach(function (nonObject) {
				it('should throw for transaction.asset.outTransfer = ' + nonObject.description, function () {
					expect(outTransfer.objectNormalize.bind(null, nonObject.input)).to.throw();
				});
			});
		});

		describe('when transaction.asset.outTransfer.dappId is invalid string argument', function () {

			typesRepresentatives.nonStrings.forEach(function (nonString) {
				it('should throw for transaction.asset.outTransfer.dappId = ' + nonString.description, function () {
					transaction.asset.outTransfer.dappId = nonString.input;
					expect(outTransfer.objectNormalize.bind(null, transaction)).to.throw();
				});
			});
		});

		describe('when transaction.asset.outTransfer.transactionId is invalid string argument', function () {

			typesRepresentatives.nonStrings.forEach(function (nonString) {
				it('should throw for transaction.asset.outTransfer.transactionId = ' + nonString.description, function () {
					transaction.asset.outTransfer.transactionId = nonString.input;
					expect(outTransfer.objectNormalize.bind(null, nonString.input)).to.throw();
				});
			});
		});

		describe('when when transaction.asset.outTransfer is valid', function () {

			it('should return transaction', function () {
				expect(outTransfer.objectNormalize(transaction)).to.eql(transaction);
			});
		});
	});

	describe('dbRead', function () {

		describe('when raw.ot_dappId does not exist', function () {

			beforeEach(function () {
				delete rawTransaction.ot_dappId;
			});

			it('should return null', function () {
				expect(outTransfer.dbRead(rawTransaction)).to.eql(null);
			});
		});

		describe('when raw.in_dappId exists', function () {

			it('should return result containing outTransfer', function () {
				expect(outTransfer.dbRead(rawTransaction)).to.have.property('outTransfer');
			});

			it('should return result containing outTransfer.dappId = raw.ot_dappId', function () {
				expect(outTransfer.dbRead(rawTransaction)).to.have.nested.property('outTransfer.dappId').equal(rawTransaction.ot_dappId);
			});

			it('should return result containing outTransfer.dappId = raw.ot_dappId', function () {
				expect(outTransfer.dbRead(rawTransaction)).to.have.nested.property('outTransfer.transactionId').equal(rawTransaction.ot_outTransactionId);
			});
		});
	});

	describe('dbSave', function () {

		var dbSaveResult;

		beforeEach(function () {
			dbSaveResult = outTransfer.dbSave(transaction);
		});

		it('should return result containing table = "outtransfer"', function () {
			expect(dbSaveResult).to.have.property('table').equal('outtransfer');
		});

		it('should return result containing fields = ["dappId", "outTransactionId", "transactionId"]', function () {
			expect(dbSaveResult).to.have.property('fields').eql(['dappId', 'outTransactionId', 'transactionId']);
		});

		it('should return result containing values', function () {
			expect(dbSaveResult).to.have.property('values');
		});

		it('should return result containing values.dappId = transaction.asset.outTransfer.dappId', function () {
			expect(dbSaveResult).to.have.nested.property('values.dappId').equal(transaction.asset.outTransfer.dappId);
		});

		it('should return result containing values.transactionId = transaction.id', function () {
			expect(dbSaveResult).to.have.nested.property('values.transactionId').equal(transaction.id);
		});
	});

	describe('ready', function () {

		it('should return true for single signature transaction', function () {
			expect(outTransfer.ready(transaction, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(outTransfer.ready(transaction, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with at least min signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete transaction.signature;
			// Not really correct signature, but we are not testing that over here
			transaction.signature = crypto.randomBytes(64).toString('hex');;
			transaction.signatures = [crypto.randomBytes(64).toString('hex')];

			expect(outTransfer.ready(transaction, sender)).to.equal(true);
		});
	});
});

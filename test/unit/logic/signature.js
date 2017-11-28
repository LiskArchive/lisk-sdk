'use strict';/*eslint*/

var crypto = require('crypto');
var _  = require('lodash');

var expect = require('chai').expect;
var rewire = require('rewire');
var sinon   = require('sinon');

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var modulesLoader = require('../../common/modulesLoader');

var typesRepresentatives = require('../../fixtures/typesRepresentatives.js');

var Signature = rewire('../../../logic/signature.js');
var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var validSender = {
	password: 'yjyhgnu32jmwuii442t9',
	secondPassword: 'kub8gm2w330pvptx1or',
	username: 'mix8',
	publicKey: '5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	address: '4835566122337813671L',
	secondPublicKey: 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7' 
};

var senderHash = crypto.createHash('sha256').update(validSender.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var validTransaction = {
	id: '5197781214824378819',
	height: 6,
	blockId: '341020236706783045',
	type: 1,
	timestamp: 38871652,
	senderPublicKey: '5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	senderId: '4835566122337813671L',
	recipientId: null,
	recipientPublicKey: null,
	amount: 0,
	fee: 500000000,
	signature: '14c49a60016f63d9692821540895e1b126ab27908aefa77f4423ac0e079b6f87c8998db3e0e280aae268366adae9792d9ca279be1a372b6c52cc59b874143c07',
	signatures: [],
	confirmations: 16,
	asset: {
		signature: {
			transactionId: '5197781214824378819',
			publicKey: 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7'
		}
	}
};

var rawValidTransaction = {
	t_id: '5197781214824378819',
	b_height: 6,
	t_blockId: '341020236706783045',
	t_type: 1,
	t_timestamp: 38871652,
	t_senderPublicKey: '5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	m_recipientPublicKey: null,
	t_senderId: '4835566122337813671L',
	t_recipientId: null,
	t_amount: '0',
	t_fee: '500000000',
	t_signature: '14c49a60016f63d9692821540895e1b126ab27908aefa77f4423ac0e079b6f87c8998db3e0e280aae268366adae9792d9ca279be1a372b6c52cc59b874143c07',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 4,
	s_publicKey: 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7' 
};

describe('signature', function () {

	var transactionMock;
	var accountsMock;
	var signature;
	var dummyBlock;

	beforeEach(function (done) {
		dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};
		transactionMock = sinon.mock({});
		accountsMock = {
			setAccountAndGet: sinon.mock().callsArg(1)
		};
		signature = new Signature(modulesLoader.scope.schema, modulesLoader.scope.logger);
		signature.bind(accountsMock);

		done();
	});

	afterEach(function () {
		transactionMock.restore();
		accountsMock.setAccountAndGet.reset();
	});

	describe('with transaction and sender objects', function () {

		var transaction;
		var rawTransaction;
		var sender;

		beforeEach(function () {
			transaction = _.cloneDeep(validTransaction);
			rawTransaction = _.cloneDeep(rawValidTransaction);
			sender = _.cloneDeep(validSender);
		});

		describe('constructor', function () {

			var library;

			beforeEach(function () {
				new Signature(modulesLoader.scope.schema, modulesLoader.scope.logger);
				library = Signature.__get__('library');
			});

			it('should attach schema to library variable', function () {
				expect(library.schema).to.eql(modulesLoader.scope.schema);
			});

			it('should attach logger to library variable', function () {
				expect(library.logger).to.eql(modulesLoader.scope.logger);
			});
		});

		describe('bind', function () {

			describe('modules', function () {

				it('should assign accounts', function () {
					signature.bind(accountsMock);
					var modules = Signature.__get__('modules');
					expect(modules).to.eql({
						accounts: accountsMock
					});
				});
			});
		});

		describe('calculateFee', function () {

			var fee;

			beforeEach(function () {
				fee = signature.calculateFee.call(transactionMock, transaction);
			});

			it('should return constants.fees.secondSignature', function () {
				expect(fee).to.equal(node.constants.fees.secondSignature);
			});
		});

		describe('verify', function () {

			describe('when transaction is invalid', function () {

				describe('when asset = undefined', function () {

					it('should call callback with error = "Invalid transaction asset"', function (done) {
						delete transaction.asset;

						signature.verify(transaction, sender, function (err) {
							expect(err).to.equal('Invalid transaction asset');
							done();
						});
					});
				});

				describe('when signature = undefined', function () {

					it('should call callback with error = "Invalid transaction asset', function (done) {
						delete transaction.asset.signature;

						signature.verify(transaction, sender, function (err) {
							expect(err).to.equal('Invalid transaction asset');
							done();
						});
					});
				});

				describe('when amount != 0', function () {

					it('should call callback with error = "Invalid transaction amount', function (done) {
						transaction.amount = 1;

						signature.verify(transaction, sender, function (err) {
							expect(err).to.equal('Invalid transaction amount');
							done();
						});
					});
				});

				describe('when publicKey = undefined', function () {

					it('should call callback with error = "Invalid public key', function (done) {
						delete transaction.asset.signature.publicKey;

						signature.verify(transaction, sender, function (err) {
							expect(err).to.equal('Invalid public key');
							done();
						});
					});
				});

				describe('when publicKey is invalid', function () {

					it('should call callback with error = "Invalid public key', function (done) {
						transaction.asset.signature.publicKey = 'invalid-public-key';

						signature.verify(transaction, sender, function (err) {
							expect(err).to.equal('Invalid public key');
							done();
						});
					});
				});
			});

			describe('when transaction is valid', function () {

				it('should call callback with error = null', function (done) {
					signature.verify(transaction, sender, done);
				});
			});
		});

		describe('process', function () {

			it('should call callback with error = null', function (done) {
				signature.process(transaction, sender, done);
			});

			it('should call callback with result = transaction', function (done) {
				signature.process(transaction, sender, function (err, res) {
					expect(res).to.eql(transaction);
					done();
				});
			});
		});

		describe('getBytes', function () {

			describe('when asset is invalid', function () {

				describe('when transaction.asset.signature.publicKey is a number', function () {

					var validNumber = 1;

					beforeEach(function () {
						transaction.asset.signature.publicKey = validNumber;
					});

					it('should throw', function () {
						expect(signature.getBytes.bind(transaction)).to.throw();
					});
				});

				describe('when transaction.asset = undefined', function () {

					beforeEach(function () {
						delete transaction.asset;
					});

					it('should throw', function () {
						expect(signature.getBytes.bind(transaction)).to.throw();
					});
				});
			});

			describe('when asset is valid', function () {

				describe('when transaction.asset.signature.publicKey is defined', function () {

					var signatureBytes;

					beforeEach(function () {
						signatureBytes = signature.getBytes(transaction);
					});

					it('should return bytes in hex format', function () {
						expect(signatureBytes).to.eql(Buffer.from(transaction.asset.signature.publicKey, 'hex'));
					});

					it('should return bytes of length 32', function () {
						expect(signatureBytes.length).to.equal(32);
					});
				});
			});
		});

		describe('apply', function () {

			beforeEach(function (done) {
				signature.apply(validTransaction, dummyBlock, sender, done);
			});

			it('should call modules.accounts.setAccountAndGet', function () {
				expect(accountsMock.setAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with address = sender.address', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({address: sender.address}))).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with secondSignature = 1', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({secondSignature: 1}))).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with u_secondSignature = 0', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({u_secondSignature: 0}))).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with secondPublicKey = validTransaction.asset.signature.publicKey', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({secondPublicKey: validTransaction.asset.signature.publicKey}))).to.be.true;
			});
		});

		describe('undo', function () {

			beforeEach(function (done) {
				signature.undo(validTransaction, dummyBlock, sender, done);
			});

			it('should call modules.accounts.setAccountAndGet', function () {
				expect(accountsMock.setAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with address = sender.address', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({address: sender.address}))).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with secondSignature = 0', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({secondSignature: 0}))).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with u_secondSignature = 1', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({u_secondSignature: 1}))).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with secondPublicKey = null', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({secondPublicKey: null}))).to.be.true;
			});
		});

		describe('applyUnconfirmed', function () {

			describe('when sender has u_secondSignature', function () {

				beforeEach(function () {
					sender.u_secondSignature = 'some-second-siganture';
				});

				it('should call callback with error', function (done) {
					signature.applyUnconfirmed.call(transactionMock, transaction, sender, function (err) {
						expect(err).to.equal('Second signature already enabled');
						done();
					});
				});
			});

			describe('when sender has secondSignature', function () {

				beforeEach(function () {
					sender.secondSignature = 'some-second-siganture';
				});


				it('should call callback with error', function (done) {
					signature.applyUnconfirmed.call(transactionMock, transaction, sender, function (err) {
						expect(err).to.equal('Second signature already enabled');
						done();
					});
				});
			});

			beforeEach(function (done) {
				signature.applyUnconfirmed(validTransaction, sender, done);
			});

			it('should call modules.accounts.setAccountAndGet', function () {
				expect(accountsMock.setAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with address = sender.address', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({address: sender.address}))).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with u_secondSignature = 1', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({u_secondSignature: 1}))).to.be.true;
			});
		});

		describe('undoUnconfirmed', function () {

			beforeEach(function (done) {
				signature.undoUnconfirmed(validTransaction, sender, done);
			});

			it('should call modules.accounts.setAccountAndGet', function () {
				expect(accountsMock.setAccountAndGet.calledOnce).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with address = sender.address', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({address: sender.address}))).to.be.true;
			});

			it('should call modules.accounts.setAccountAndGet with u_secondSignature = 0', function () {
				expect(accountsMock.setAccountAndGet.calledWith(sinon.match({u_secondSignature: 0}))).to.be.true;
			});
		});

		describe('objectNormalize', function () {

			describe('schema.validate should validate against signature schema', function () {

				var library;
				var schemaSpy;

				beforeEach(function () {
					library = Signature.__get__('library');
					schemaSpy = sinon.spy(library.schema, 'validate');
					signature.objectNormalize(transaction);
				});

				afterEach(function () {
					schemaSpy.restore();
				});

				it('call schema validate once', function () {
					expect(schemaSpy.calledOnce).to.equal(true);
				});

				it('signature schema', function () {
					expect(schemaSpy.calledWithExactly(transaction.asset.signature, Signature.prototype.schema)).to.equal(true);
				});
			});

			describe('when schema.validate fails', function () {

				describe('for non-string types', function () {

					var nonStrings = _.difference(typesRepresentatives.allTypes, typesRepresentatives.strings);

					nonStrings.forEach(function (type) {
						it('should throw when username type is ' + type.description, function () {
							transaction.asset.signature.publicKey = type.input;
							expect(function () {
								signature.objectNormalize(transaction);
							}).to.throw('Failed to validate signature schema: Expected type string but found type ' + type.expectation);
						});
					});
				});

				describe('for non-publicKey format strings', function () {

					var nonEmptyStrings = typesRepresentatives.nonEmptyStrings;

					nonEmptyStrings.forEach(function (type) {
						it('should throw when username is: ' + type.description, function () {
							transaction.asset.signature.publicKey = type.input;
							expect(function () {
								signature.objectNormalize(transaction);
							}).to.throw('Failed to validate signature schema: Object didn\'t pass validation for format publicKey: ' + type.input);
						});
					});
				});
			});

			describe('when library.schema.validate succeeds', function () {

				it('should return transaction', function () {
					expect(signature.objectNormalize(transaction)).to.eql(transaction);
				});
			});
		});

		describe('dbRead', function () {

			describe('when publicKey is undefined', function () {

				beforeEach(function () {
					delete rawTransaction.s_publicKey;
				});

				it('should return null', function () {
					expect(signature.dbRead(rawTransaction)).to.eql(null);
				});
			});

			describe('with valid signature properties', function () {

				var publicKey = 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7';
				var transactionId = '5197781214824378819';

				it('should return publicKey property', function () {
					expect(signature.dbRead(rawTransaction).signature.publicKey).to.equal(publicKey);
				});

				it('should return transactionId', function () {
					expect(signature.dbRead(rawTransaction).signature.transactionId).to.eql(transactionId);
				});
			});
		});

		describe('dbSave', function () {

			it('should return an error when publicKey is a number', function () {
				var invalidPublicKey = 12;
				transaction.asset.signature.publicKey = invalidPublicKey;
				expect(function () {
					signature.dbSave(transaction);
				}).to.throw();
			});

			describe('for valid transaction', function () {

				var expectedPromise;

				beforeEach(function () {
					expectedPromise = {
						table: 'signatures',
						fields: [
							'transactionId',
							'publicKey'
						],
						values: {
							transactionId: transaction.id,
							publicKey: Buffer.from(transaction.asset.signature.publicKey, 'hex')
						}
					};
				});

				it('should return signature db promise for signature transaction', function () {
					expect(signature.dbSave(transaction)).to.eql(expectedPromise);
				});
			});
		});

		describe('ready', function () {

			it('should return true for single signature transaction', function () {
				expect(signature.ready(transaction, sender)).to.equal(true);
			});

			it('should return false for multi signature transaction with less signatures', function () {
				sender.multisignatures = [validKeypair.publicKey.toString('hex')];

				expect(signature.ready(transaction, sender)).to.equal(false);
			});

			it('should return true for multi signature transaction with at least min signatures', function () {
				sender.multisignatures = [validKeypair.publicKey.toString('hex')];
				sender.multimin = 1;

				delete transaction.signature;
				// Not really correct signature, but we are not testing that over here
				transaction.signature = crypto.randomBytes(64).toString('hex');;
				transaction.signatures = [crypto.randomBytes(64).toString('hex')];

				expect(signature.ready(transaction, sender)).to.equal(true);
			});
		});
	});
});

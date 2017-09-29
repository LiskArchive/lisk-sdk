'use strict';/*eslint*/

var crypto = require('crypto');
var _  = require('lodash');

var expect = require('chai').expect;
var rewire = require('rewire');
var sinon   = require('sinon');

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var modulesLoader = require('../../common/initModule').modulesLoader;

var typesRepresentatives = require('../../common/typesRepresentatives.js');

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


	beforeEach(function (done) {
		transactionMock = sinon.mock({});
		accountsMock = {
			setAccountAndGet: sinon.mock()
		};
		signature = new Signature(modulesLoader.scope.schema, modulesLoader.scope.logger);
		signature.bind(accountsMock);

		done();
	});

	afterEach(function () {
		debugger;
		transactionMock.restore();
		accountsMock.setAccountAndGet.reset();
	});

	describe('with transaction and sender objects', function () {

		var trs;
		var rawTrs; 
		var sender;

		beforeEach(function () {
			trs = _.cloneDeep(validTransaction);
			rawTrs = _.cloneDeep(rawValidTransaction);
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

			it('should attach empty object to private modules.accounts variable', function () {
				signature.bind({});
				var modules = Signature.__get__('modules');
				expect(modules.accounts).to.eql({});
			});

			it('should attach accounts object to private modules.accounts variable', function () {
				signature.bind(accountsMock);
				var modules = Signature.__get__('modules');
				expect(modules).to.eql({
					accounts: accountsMock
				});
			});
		});

		describe('calculateFee', function () {

			var fee;

			beforeEach(function () {
				fee = signature.calculateFee.call(transactionMock, trs);
			});

			it('should return the correct fee for second signature transaction', function () {
				expect(fee).to.equal(node.constants.fees.secondsignature);
			});
		});

		describe('verify', function () {

			describe('when transaction is invalid', function () {

				it('should call callback with error if asset is undefined', function (done) {
					delete trs.asset;

					signature.verify(trs, sender, function (err) {
						expect(err).to.equal('Invalid transaction asset');
						done();
					});
				});

				it('should call callback with error if signature is undefined', function (done) {
					delete trs.asset.signature;

					signature.verify(trs, sender, function (err) {
						expect(err).to.equal('Invalid transaction asset');
						done();
					});
				});

				it('should call callback with error if amount is not equal to 0', function (done) {
					trs.amount = 1;

					signature.verify(trs, sender, function (err) {
						expect(err).to.equal('Invalid transaction amount');
						done();
					});
				});

				it('should call callback with error if publicKey is undefined', function (done) {
					delete trs.asset.signature.publicKey;

					signature.verify(trs, sender, function (err) {
						expect(err).to.equal('Invalid public key');
						done();
					});
				});

				it('should call callback with error if publicKey is invalid', function (done) {
					trs.asset.signature.publicKey = 'invalid-public-key';

					signature.verify(trs, sender, function (err) {
						expect(err).to.equal('Invalid public key');
						done();
					});
				});
			});

			describe('when transaction is valid', function () {

				it('should call callback with error = null for valid transaction', function (done) {
					signature.verify(trs, sender, done);
				});
			});
		});

		describe('process', function () {

			it('should call callback', function (done) {
				signature.process(trs, sender, done);
			});
		});

		describe('getBytes', function () {

			describe('when asset is invalid', function () {

				describe('when trs.asset.signature.publicKey is a number', function () {

					var validNumber = 1;

					beforeEach(function () {
						trs.asset.signature.publicKey = validNumber;
					});

					it('should throw', function () {
						expect(signature.getBytes.bind(trs)).to.throw();
					});
				});

				describe('when trs.asset is undefined', function () {

					beforeEach(function () {
						delete trs.asset;
					});

					it('should throw', function () {
						expect(signature.getBytes.bind(trs)).to.throw();
					});
				});
			});

			describe('when asset is valid', function () {

				describe('when trs.asset.signature.publicKey is defined', function () {

					var signatureBytes;

					beforeEach(function () {
						signatureBytes = signature.getBytes(trs);
					});

					it('should return bytes in hex format', function () {
						expect(signatureBytes).to.eql(Buffer.from(trs.asset.signature.publicKey, 'hex'));
					});

					it('should return bytes of length 32', function () {
						expect(signatureBytes.length).to.equal(32);
					});
				});
			});
		});

		describe('apply', function () {

			var dummyBlock = {
				id: '9314232245035524467',
				height: 1
			};

			it('should call accounts.setAccountAndGet module with correct parameters', function (done) {
				function callback () {}

				accountsMock.setAccountAndGet.once().withExactArgs({
					address: sender.address,
					secondSignature: 1,
					u_secondSignature: 0,
					secondPublicKey: trs.asset.signature.publicKey
				}, callback);

				signature.apply.call(transactionMock, trs, dummyBlock, sender, callback);
				accountsMock.setAccountAndGet.verify();

				done();
			});
		});

		describe('undo', function () {

			var dummyBlock = {
				id: '9314232245035524467',
				height: 1
			};

			it('should call accounts.setAccountAndGet module with correct parameters', function (done) {
				function callback () {}

				accountsMock.setAccountAndGet.once().withExactArgs({
					address: sender.address,
					secondSignature: 0,
					u_secondSignature: 1,
					secondPublicKey: null
				}, callback);

				signature.undo.call(transactionMock, trs, dummyBlock, sender, callback);
				accountsMock.setAccountAndGet.verify();

				done();
			});
		});

		describe('applyUnconfirmed', function () {

			it('should call callback with error if u_secondSignature already exists', function (done) {
				sender.u_secondSignature = 'some-second-siganture';

				signature.applyUnconfirmed.call(transactionMock, trs, sender, function (err) {
					expect(err).to.equal('Second signature already enabled');
					done();
				}); 
			});

			it('should call callback with error if secondSignature already exists', function (done) {
				sender.secondSignature = 'some-second-siganture';

				signature.applyUnconfirmed.call(transactionMock, trs, sender, function (err) {
					expect(err).to.equal('Second signature already enabled');
					done();
				}); 
			});

			it('should call accounts.setAccountAndGet module with correct parameters', function (done) {
				function callback () {}

				accountsMock.setAccountAndGet.once().withExactArgs({
					address: sender.address,
					u_secondSignature: 1
				}, callback);

				signature.applyUnconfirmed.call(transactionMock, trs, sender, callback);
				accountsMock.setAccountAndGet.verify();

				done();
			});
		});

		describe('undoUnconfirmed', function () {

			it('should call accounts.setAccountAndGet module with correct parameters', function (done) {
				function callback () {}

				accountsMock.setAccountAndGet.once().withExactArgs({
					address: sender.address,
					u_secondSignature: 0
				}, callback);

				signature.undoUnconfirmed.call(transactionMock, trs, sender, callback);
				accountsMock.setAccountAndGet.verify();

				done();
			});
		});

		describe('objectNormalize', function () {

			describe('schema.validate should validate against signature schema', function () {

				var library;
				var schemaSpy;

				beforeEach(function () {
					library = Signature.__get__('library');
					schemaSpy = sinon.spy(library.schema, 'validate');
					signature.objectNormalize(trs);
				});

				afterEach(function () {
					schemaSpy.restore();
				});

				it('call schema validate once', function () {
					expect(schemaSpy.calledOnce).to.equal(true);
				});

				it('signature schema', function () {
					expect(schemaSpy.calledWithExactly(trs.asset.signature, Signature.prototype.schema)).to.equal(true);
				});
			});

			describe('when schema.validate fails', function () {

				describe('for non-string types', function () {

					var nonStrings = _.difference(typesRepresentatives.allTypes, typesRepresentatives.strings);

					nonStrings.forEach(function (type) {
						it('should throw when username type is ' + type.description, function () {
							trs.asset.signature.publicKey = type.input;
							expect(function () {
								signature.objectNormalize(trs);
							}).to.throw('Failed to validate signature schema: Expected type string but found type ' + type.expectation);
						});
					});
				});

				describe('for non-publicKey format strings', function () {

					var nonEmptyStrings = typesRepresentatives.nonEmptyStrings;

					nonEmptyStrings.forEach(function (type) {
						it('should throw when username is: ' + type.description, function () {
							trs.asset.signature.publicKey = type.input;
							expect(function () {
								signature.objectNormalize(trs);
							}).to.throw('Failed to validate signature schema: Object didn\'t pass validation for format publicKey: ' + type.input);
						});
					});
				});
			});

			describe('when library.schema.validate succeeds', function () {

				it('should return transaction', function () {
					expect(signature.objectNormalize(trs)).to.eql(trs);
				});
			});
		});

		describe('dbRead', function () {

			it('should return null if publicKey undefined', function () {
				delete rawTrs.s_publicKey;
				expect(signature.dbRead(rawTrs)).to.eql(null);
			});

			it('should return signature asset for raw signature transaction', function () {
				expect(signature.dbRead(rawTrs)).to.eql({
					signature: {
						publicKey: 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7',
						transactionId: '5197781214824378819'
					}
				});
			});
		});

		describe('dbSave', function () {

			it('should return an error when publicKey is a number', function () {
				var invalidPublicKey = 12;
				trs.asset.signature.publicKey = invalidPublicKey;
				expect(function () {
					signature.dbSave(trs);
				}).to.throw();
			});

			it('should return signature db promise for signature transaction', function () {
				expect(signature.dbSave(trs)).to.eql({
					table: 'signatures',
					fields: [
						'transactionId',
						'publicKey'
					],
					values: {
						transactionId: trs.id,
						publicKey: Buffer.from(trs.asset.signature.publicKey, 'hex')
					}
				});
			});
		});

		describe('ready', function () {

			it('should return true for single signature trs', function () {
				expect(signature.ready(trs, sender)).to.equal(true);
			});

			it('should return false for multi signature transaction with less signatures', function () {
				sender.multisignatures = [validKeypair.publicKey.toString('hex')];

				expect(signature.ready(trs, sender)).to.equal(false);
			});

			it('should return true for multi signature transaction with at least min signatures', function () {
				sender.multisignatures = [validKeypair.publicKey.toString('hex')];
				sender.multimin = 1;

				delete trs.signature;
				// Not really correct signature, but we are not testing that over here
				trs.signature = crypto.randomBytes(64).toString('hex');;
				trs.signatures = [crypto.randomBytes(64).toString('hex')];

				expect(signature.ready(trs, sender)).to.equal(true);
			});
		});
	});
});

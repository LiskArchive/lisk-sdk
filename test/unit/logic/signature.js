'use strict';/*eslint*/

var crypto = require('crypto');
var _  = require('lodash');

var expect = require('chai').expect;
var rewire = require('rewire');
var sinon   = require('sinon');

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var modulesLoader = require('../../common/initModule').modulesLoader;

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

	var trs;
	var rawTrs; 
	var sender;

	before(function () {
		transactionMock = sinon.mock({});
	});

	beforeEach(function () {
		trs = _.cloneDeep(validTransaction);
		rawTrs = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
	});

	beforeEach(function (done) {
		accountsMock = {
			setAccountAndGet: sinon.mock()
		};

		signature = new Signature(modulesLoader.scope.schema, modulesLoader.scope.logger);
		signature.bind(accountsMock);

		done();
	});

	describe('constructor', function () {

		it('should be attach schema and logger to library variable', function () {
			new Signature(modulesLoader.scope.schema, modulesLoader.scope.logger);
			var library = Signature.__get__('library');

			expect(library).to.eql({
				logger: modulesLoader.scope.logger,
				schema: modulesLoader.scope.schema
			});
		});
	});

	describe('bind', function () {

		it('should attach empty object to private modules.accounts variable', function () {
			signature.bind({});
			var modules = Signature.__get__('modules');

			expect(modules).to.eql({
				accounts: {}
			});
		});

		it('should be okay with correct params', function () {
			signature.bind(accountsMock);
			var modules = Signature.__get__('modules');

			expect(modules).to.eql({
				accounts: accountsMock
			});
		});
	});

	describe('calculateFee', function () {

		it('should return the correct fee when data field is not set', function () {
			expect(signature.calculateFee.call(transactionMock, trs)).to.equal(node.constants.fees.secondsignature);
		});
	});

	describe('verify', function () {

		it('should return error if signature is undefined', function (done) {
			delete trs.asset.signature;

			signature.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction asset');
				done();
			});
		});

		it('should return error if amount is not equal to 0', function (done) {
			trs.amount = 1;

			signature.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction amount');
				done();
			});
		});

		it('should return error if publicKey is undefined', function (done) {
			delete trs.asset.signature.publicKey;

			signature.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should return error if publicKey is invalid', function (done) {
			trs.asset.signature.publicKey = 'invalid-public-key';

			signature.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should verify okay for valid transaction', function (done) {
			signature.verify(trs, sender, done);
		});
	});

	describe('process', function () {

		it('should call the callback', function (done) {
			signature.process(trs, sender, done);
		});
	});

	describe('getBytes', function () {

		it('should throw for empty asset', function () {
			delete trs.asset;

			expect(function () {
				signature.getBytes(trs);
			}).to.throw();
		});

		it.skip('should throw error for invalid publicKey', function () {
			trs.asset.signature.publicKey = 'invalid-public-key';

			expect(function () {
				signature.getBytes(trs);
			}).to.throw();
		});

		it('should return bytes for signature asset', function () {
			var signatureBytes = signature.getBytes(trs);
			expect(signatureBytes).to.eql(Buffer.from(trs.asset.signature.publicKey, 'hex'));
			expect(signatureBytes.length).to.equal(32);
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
		
		it('should return when asset schema is invalid', function () {
			trs.asset.signature.publicKey = 'invalid-public-key';

			expect(function () {
				signature.objectNormalize(trs);
			}).to.throw('Failed to validate signature schema: Object didn\'t pass validation for format publicKey: invalid-public-key');
		});

		it('should return transaction when asset is valid', function () {
			expect(signature.objectNormalize(trs)).to.eql(trs);
		});
	});

	describe('dbRead', function () {

		it('should return null publicKey is not set ', function () {
			delete rawTrs.s_publicKey;

			expect(signature.dbRead(rawTrs)).to.eql(null);
		});

		it('should be okay for valid input', function () {
			expect(signature.dbRead(rawTrs)).to.eql({
				signature: {
					publicKey: 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7',
					transactionId: '5197781214824378819'
				}
			});
		});
	});

	describe('dbSave', function () {

		it.skip('should return an error when publicKey is invalid', function () {
			var invalidPublicKey = 'invalid-public-key';
			trs.asset.signature.publicKey = invalidPublicKey;
			expect(function () {
				signature.dbSave(trs);
			}).to.throw();
		});

		it('should be okay for valid input', function () {
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

		it('should return true for multi signature transaction with alteast min signatures', function () {
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

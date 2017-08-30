'use strict';

var crypto = require('crypto');
var sinon   = require('sinon');

var node = require('../../node.js');
var expect = node.expect;

var modulesLoader = require('../../common/initModule').modulesLoader;

var Delegate = require('../../../logic/delegate.js');

describe('delegate', function () {

	var delegate;
	var accountsMock;
	var validTransaction;
	var validSender;
	var dummyBlock;

	beforeEach(function () {
		accountsMock = {
			setAccountAndGet: sinon.stub(),
			getAccount: sinon.stub()
		};
		delegate = new Delegate(modulesLoader.scope.schema);
		delegate.bind(accountsMock);

		validTransaction = {
			type: 2,
			amount: 0,
			fee: 0,
			timestamp: 0,
			recipientId: null,
			senderId: '10881167371402274308L',
			senderPublicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
			asset: {
				delegate: {
					username: 'genesis_100'
				}
			},
			signature: '5495bea66b026b0d6b72bab8611fca9c655c1f023267f3c51453c950aa3d0e0eb08b0bc04e6355909abd75cd1d4df8c3048a55c3a98d0719b4b71e5d527e580a',
			id: '8500285156990763245'
		};

		validSender = {
			secret: 'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
			address: '10881167371402274308L',
			publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
			username: 'genesis_100',
			encryptedSecret: '8c639a2e1eb86b19644c820584d72ff5c6c896e633342b1ecc4c450f92d4cf7b6b143c6fc8b3be4fb85077028fd75197e17e46fe6f319bcffff7c9c8c2c13e77c24ef529d290f3c7632f0ae66b6111233bfad9fd99adff3f45f2ced65b0e9ef7',
			key: 'elephant tree paris dragon chair galaxy',
			nameexist: 1
		};

		dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};
	});

	describe('verify', function () {

		describe('when username was not registered before', function () {

			beforeEach(function () {
				accountsMock.getAccount.callsArgWith(1, null, null);
			});

			it('should not return an error for valid params', function (done) {
				delegate.verify(validTransaction, validSender, function (err) {
					expect(err).to.be.null;
					done();
				});
			});

			it('should check if confirmed username already exists', function (done) {
				delegate.verify(validTransaction, validSender, function () {
					expect(accountsMock.getAccount.calledWith({username: validTransaction.asset.delegate.username})).to.be.true;
					done();
				});
			});

			it('should check if unconfirmed username already exists', function (done) {
				delegate.verify(validTransaction, validSender, function () {
					expect(accountsMock.getAccount.calledWith({u_username: validTransaction.asset.delegate.username})).to.be.true;
					done();
				});
			});
		});

		describe('when username already exists as unconfirmed', function () {

			beforeEach(function () {
				accountsMock.getAccount.withArgs({u_username: node.eAccount.delegateName}, sinon.match.any).yields(null, node.eAccount);
				accountsMock.getAccount.withArgs({username: node.eAccount.delegateName}, sinon.match.any).yields(null, null);
			});

			it('should return an error for valid params', function (done) {
				delegate.verify(validTransaction, validSender, function (err) {
					expect(err).to.equal('Username already exists');
					done();
				});
			});
		});

		describe('when username already exists as confirmed', function () {

			beforeEach(function () {
				accountsMock.getAccount.withArgs({u_username: node.eAccount.delegateName}, sinon.match.any).yields(null, null);
				accountsMock.getAccount.withArgs({username: node.eAccount.delegateName}, sinon.match.any).yields(null, node.eAccount);
			});

			it('should return an error for valid params', function (done) {
				delegate.verify(validTransaction, validSender, function (err) {
					expect(err).to.equal('Username already exists');
					done();
				});
			});
		});
	});

	describe('apply', function () {

		describe('when username was not registered before', function () {

			var validConfirmedAccount;

			beforeEach(function () {
				accountsMock.getAccount.withArgs({username: node.eAccount.delegateName}, sinon.match.any).yields(null, null);
				accountsMock.setAccountAndGet = sinon.stub().callsArg(1);
				validConfirmedAccount = {
					address: validSender.address,
					u_isDelegate: 0,
					isDelegate: 1,
					vote: 0,
					u_username: null,
					username: validTransaction.asset.delegate.username
				};
			});

			it('should call accounts.setAccountAndGet module with correct parameter', function (done) {
				delegate.apply(validTransaction, dummyBlock, validSender, function () {
					expect(accountsMock.setAccountAndGet.calledWith(validConfirmedAccount)).to.be.true;
					done();
				});
			});
		});

		describe('when username is already confirmed', function () {

			beforeEach(function () {
				accountsMock.getAccount.withArgs({username: node.eAccount.delegateName}, sinon.match.any).yields(null, node.eAccount);
			});

			it('should not call accounts.setAccountAndGet', function (done) {
				delegate.apply(validTransaction, dummyBlock, validSender, function () {
					expect(accountsMock.setAccountAndGet.notCalled).to.be.true;
					done();
				});
			});

			it('should return an error', function (done) {
				delegate.apply(validTransaction, dummyBlock, validSender, function (err) {
					expect(err).to.be.equal('Username already exists');
					done();
				});
			});
		});
	});

	describe('applyUnconfirmed', function () {

		describe('when username was not registered before', function () {

			var validUnconfirmedAccount;

			beforeEach(function () {
				accountsMock.getAccount.withArgs({u_username: node.eAccount.delegateName}, sinon.match.any).yields(null, null);
				accountsMock.setAccountAndGet = sinon.stub().callsArg(1);
				validUnconfirmedAccount = {
					address: validSender.address,
					u_isDelegate: 1,
					isDelegate: 0,
					username: null,
					u_username: validTransaction.asset.delegate.username
				};
			});

			it('should call accounts.setAccountAndGet module with correct parameter', function (done) {
				delegate.applyUnconfirmed(validTransaction, validSender, function () {
					expect(accountsMock.setAccountAndGet.calledWith(validUnconfirmedAccount)).to.be.true;
					done();
				});
			});
		});

		describe('when username is already unconfirmed', function () {

			beforeEach(function () {
				accountsMock.getAccount.withArgs({u_username: node.eAccount.delegateName}, sinon.match.any).yields(null, node.eAccount);
			});

			it('should not call accounts.setAccountAndGet', function (done) {
				delegate.applyUnconfirmed(validTransaction, validSender, function () {
					expect(accountsMock.setAccountAndGet.notCalled).to.be.true;
					done();
				});
			});

			it('should return an error', function (done) {
				delegate.applyUnconfirmed(validTransaction, validSender, function (err) {
					expect(err).to.be.equal('Username already exists');
					done();
				});
			});
		});
	});
});

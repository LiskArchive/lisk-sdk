'use strict';

var sinon   = require('sinon');

var node = require('../../node');
var expect = node.expect;

var modulesLoader = require('../../common/initModule').modulesLoader;

var Delegate = require('../../../logic/delegate');
var exceptions = require('../../../helpers/exceptions');

describe.skip('delegate', function () {

	var delegate;
	var accountsMock;
	var validTransaction;
	var validSender;
	var dummyBlock;
	var loggerMock;

	beforeEach(function () {
		accountsMock = {
			setAccountAndGet: sinon.stub().callsArg(1),
			getAccount: sinon.stub().callsArg(2)
		};
		loggerMock = {
			debug: sinon.spy()
		};
		delegate = new Delegate(loggerMock, modulesLoader.scope.schema);
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
					username: node.eAccount.delegateName
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

		describe('when delegate was not confirmed before', function () {

			var checkConfirmedStub;

			beforeEach(function () {
				checkConfirmedStub = sinon.stub(delegate, 'checkConfirmed').callsArgWith(1, null);
			});

			afterEach(function () {
				checkConfirmedStub.restore();
			});

			it('should not return an error for valid params', function (done) {
				delegate.verify(validTransaction, validSender, function (err) {
					expect(err).to.be.null;
					done();
				});
			});
		});

		describe('when delegate is confirmed', function () {

			var checkConfirmedStub;

			beforeEach(function () {
				checkConfirmedStub = sinon.stub(delegate, 'checkConfirmed').callsArgWith(1, 'Delegate exists');
			});

			afterEach(function () {
				checkConfirmedStub.restore();
			});

			it('should return an error for valid params', function (done) {
				delegate.verify(validTransaction, validSender, function (err) {
					expect(err).to.be.equal('Delegate exists');
					done();
				});
			});
		});
	});

	describe('checkDuplicates', function () {

		var validUsernameField;
		var validIsDelegateField;

		beforeEach(function () {
			validUsernameField = 'username';
			validIsDelegateField = 'isDelegate';
		});

		it('should check if username already exists', function (done) {
			delegate.checkDuplicates(validTransaction, validUsernameField, validIsDelegateField, function () {
				expect(accountsMock.getAccount.calledWith({username: validTransaction.asset.delegate.username})).to.be.true;
				done();
			});
		});

		it('should check if sender is already a delegate', function (done) {
			delegate.checkDuplicates(validTransaction, validUsernameField, validIsDelegateField, function () {
				expect(accountsMock.getAccount.calledWith({publicKey: validTransaction.senderPublicKey, isDelegate: 1})).to.be.true;
				done();
			});
		});

		describe('when modules.accounts.getAccount error occurs', function () {

			var validGetAccountErrorMessage;

			beforeEach(function () {
				validGetAccountErrorMessage = 'getAccount error';
				accountsMock.getAccount = sinon.stub().callsArgWith(2, validGetAccountErrorMessage);
			});

			it('should call callback with getAccount error', function (done) {
				delegate.checkDuplicates(validTransaction, validUsernameField, validIsDelegateField, function (err) {
					expect(err).to.equal(validGetAccountErrorMessage);
					done();
				});
			});
		});

		describe('when sender is already a delegate', function () {

			beforeEach(function () {
				accountsMock.getAccount.withArgs({username: node.eAccount.delegateName}, ['username'], sinon.match.any).yields(null, null);
				accountsMock.getAccount.withArgs({publicKey: node.eAccount.publicKey, isDelegate: 1}, ['username'], sinon.match.any).yields(null, node.eAccount);
			});

			it('should call a callback with proper error', function (done) {
				delegate.checkDuplicates(validTransaction, validUsernameField, validIsDelegateField, function (err) {
					expect(err).to.equal('Delegate registration violation - account is already a delegate');
					done();
				});
			});
		});

		describe('when username is already assigned', function () {

			beforeEach(function () {
				accountsMock.getAccount.withArgs({username: node.eAccount.delegateName}, ['username'], sinon.match.any).yields(null, node.eAccount);
				accountsMock.getAccount.withArgs({publicKey: node.eAccount.publicKey, isDelegate: 1}, ['username'], sinon.match.any).yields(null, null);
			});

			it('should call a callback with proper error', function (done) {
				delegate.checkDuplicates(validTransaction, validUsernameField, validIsDelegateField, function (err) {
					expect(err).to.equal('Delegate registration violation - username ' + validTransaction.asset.delegate.username + ' already exists');
					done();
				});
			});
		});

		describe('when delegate is already registered with the same username', function () {

			beforeEach(function () {
				accountsMock.getAccount.withArgs({username: node.eAccount.delegateName}, ['username'], sinon.match.any).yields(null, node.eAccount);
				accountsMock.getAccount.withArgs({publicKey: node.eAccount.publicKey, isDelegate: 1}, ['username'], sinon.match.any).yields(null, node.eAccount);
			});

			it('should call a callback with registered before error', function (done) {
				delegate.checkDuplicates(validTransaction, validUsernameField, validIsDelegateField, function (err) {
					expect(err).to.equal('Delegate registration violation - account is already a delegate');
					done();
				});
			});
		});
	});

	describe('checkConfirmed', function () {

		var dummyConfirmedAccount;
		var validUsername;
		var checkDuplicatesStub;
		var transactionsExceptionsIndexOfStub;

		beforeEach(function () {
			validUsername = validSender.username;
			dummyConfirmedAccount = {username: validUsername};
			checkDuplicatesStub = sinon.stub(delegate, 'checkDuplicates').callsArg(3);
			transactionsExceptionsIndexOfStub = sinon.spy(exceptions.delegates, 'indexOf');
		});

		afterEach(function () {
			transactionsExceptionsIndexOfStub.restore();
			checkDuplicatesStub.restore();
		});

		it('should call checkDuplicates with valid transaction', function (done) {
			delegate.checkConfirmed(validTransaction, function () {
				expect(checkDuplicatesStub.calledWith(validTransaction)).to.be.true;
				done();
			});
		});

		it('should call checkDuplicates with valid username', function (done) {
			delegate.checkConfirmed(validTransaction, function () {
				expect(checkDuplicatesStub.args[0][1] === 'username').to.be.true;
				done();
			});
		});

		it('should call checkDuplicates with valid isDelegate', function (done) {
			delegate.checkConfirmed(validTransaction, function () {
				expect(checkDuplicatesStub.args[0][2] === 'isDelegate').to.be.true;
				done();
			});
		});

		it('should not return an error when username was not registered before', function (done) {
			delegate.checkConfirmed(validTransaction, done);
		});

		describe('when delegate is already confirmed', function () {

			var validDelegateRegistrationError = 'Delegate registration violation';

			beforeEach(function () {
				checkDuplicatesStub.restore();
				checkDuplicatesStub = sinon.stub(delegate, 'checkDuplicates').callsArgWith(3, validDelegateRegistrationError);
			});

			it('should call a callback with error', function (done) {
				delegate.checkConfirmed(validTransaction, function (err) {
					expect(err).equal(validDelegateRegistrationError);
					done();
				});
			});

			it('should check if transaction exception occurred', function (done) {
				delegate.checkConfirmed(validTransaction, function () {
					expect(transactionsExceptionsIndexOfStub.called).to.be.true;
					done();
				});
			});

			describe('when transaction is on exceptions list', function () {

				var originalDelegatesExceptions;

				beforeEach(function () {
					originalDelegatesExceptions = exceptions.delegates.slice(0); //copy
					exceptions.delegates = [validTransaction.id];
				});

				afterEach(function () {
					exceptions.delegates = originalDelegatesExceptions;
				});

				it('should call a callback with error = null', function (done) {
					delegate.checkConfirmed(validTransaction, function () {
						expect(loggerMock.debug.calledWith('Username already exists')).to.be.true;
						done();
					});
				});

				it('should call debug with error message', function (done) {
					delegate.checkConfirmed(validTransaction, dummyConfirmedAccount, done);
				});
			});
		});

		describe('when other checkDuplicates error occurs', function () {

			var invalidDelegateRegistrationError = 'Other checkDuplicates error';

			beforeEach(function () {
				checkDuplicatesStub.restore();
				checkDuplicatesStub = sinon.stub(delegate, 'checkDuplicates').callsArgWith(3, invalidDelegateRegistrationError);
			});

			it('should call a callback with that error', function (done) {
				delegate.checkConfirmed(validTransaction, function (err) {
					expect(err).equal(invalidDelegateRegistrationError);
					done();
				});
			});

			it('should not check if transaction exception occurred', function (done) {
				delegate.checkConfirmed(validTransaction, function () {
					expect(transactionsExceptionsIndexOfStub.notCalled).to.be.true;
					done();
				});
			});
		});
	});

	describe('checkUnconfirmed', function () {

		var dummyUnconfirmedAccount;
		var validUsername;
		var checkDuplicatesStub;

		beforeEach(function () {
			validUsername = validSender.username;
			dummyUnconfirmedAccount = {u_username: validUsername};
			checkDuplicatesStub = sinon.stub(delegate, 'checkDuplicates');
		});

		afterEach(function () {
			checkDuplicatesStub.restore();
		});

		it('should call checkDuplicates with valid params', function () {
			delegate.checkUnconfirmed(dummyUnconfirmedAccount);
			expect(checkDuplicatesStub.calledWith({u_username: validSender.username})).to.be.true;
		});
	});

	describe('apply', function () {

		var checkConfirmedStub;

		describe('when username was not registered before', function () {

			var validConfirmedAccount;

			beforeEach(function () {
				checkConfirmedStub = sinon.stub(delegate, 'checkConfirmed').callsArg(2);
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

			afterEach(function () {
				checkConfirmedStub.restore();
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
				checkConfirmedStub = sinon.stub(delegate, 'checkConfirmed').callsArgWith(2, 'Username already exists');
			});

			afterEach(function () {
				checkConfirmedStub.restore();
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

		var checkUnconfirmedStub;

		describe('when username was not registered before', function () {

			var validUnconfirmedAccount;

			beforeEach(function () {
				checkUnconfirmedStub = sinon.stub(delegate, 'checkUnconfirmed').callsArg(1);
				accountsMock.setAccountAndGet = sinon.stub().callsArg(1);
				validUnconfirmedAccount = {
					address: validSender.address,
					u_isDelegate: 1,
					isDelegate: 0,
					username: null,
					u_username: validTransaction.asset.delegate.username
				};
			});

			afterEach(function () {
				checkUnconfirmedStub.restore();
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
				checkUnconfirmedStub = sinon.stub(delegate, 'checkUnconfirmed').callsArgWith(1, 'Username already exists');
			});

			afterEach(function () {
				checkUnconfirmedStub.restore();
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

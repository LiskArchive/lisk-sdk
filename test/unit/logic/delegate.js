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

var accounts = require('../../fixtures/accounts');
var constants = require('../../../helpers/constants');
var ed = require('../../../helpers/ed');
var exceptions = require('../../../helpers/exceptions');
var modulesLoader = require('../../common/modules_loader');
var random = require('../../common/utils/random');
var SchemaDynamicTest = require('../common/schema_dynamic_test.js');

var Delegate = rewire('../../../logic/delegate.js');

var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(
	crypto
		.createHash('sha256')
		.update(validPassword, 'utf8')
		.digest()
);

var validSender = {
	secret:
		'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	username: 'genesis_100',
	encryptedSecret:
		'8c639a2e1eb86b19644c820584d72ff5c6c896e633342b1ecc4c450f92d4cf7b6b143c6fc8b3be4fb85077028fd75197e17e46fe6f319bcffff7c9c8c2c13e77c24ef529d290f3c7632f0ae66b6111233bfad9fd99adff3f45f2ced65b0e9ef7',
	key: 'elephant tree paris dragon chair galaxy',
	nameexist: 1,
};

var validTransaction = {
	type: 2,
	amount: 0,
	fee: 0,
	timestamp: 0,
	recipientId: null,
	senderId: '10881167371402274308L',
	senderPublicKey:
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	asset: {
		delegate: {
			username: 'genesis_100',
			publicKey:
				'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		},
	},
	signature:
		'5495bea66b026b0d6b72bab8611fca9c655c1f023267f3c51453c950aa3d0e0eb08b0bc04e6355909abd75cd1d4df8c3048a55c3a98d0719b4b71e5d527e580a',
	id: '8500285156990763245',
};

var rawValidTransaction = {
	t_id: '8500285156990763245',
	b_height: 1,
	t_blockId: '6524861224470851795',
	t_type: 2,
	t_timestamp: 0,
	t_senderPublicKey:
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	m_recipientPublicKey: null,
	t_senderId: '10881167371402274308L',
	t_recipientId: null,
	t_amount: '0',
	t_fee: '0',
	t_signature:
		'5495bea66b026b0d6b72bab8611fca9c655c1f023267f3c51453c950aa3d0e0eb08b0bc04e6355909abd75cd1d4df8c3048a55c3a98d0719b4b71e5d527e580a',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 284,
	d_username: 'genesis_100',
};

describe('delegate', () => {
	var accountsMock;
	var delegate;
	var loggerMock;

	var dummyBlock;
	var transaction;
	var rawTransaction;
	var sender;

	beforeEach(() => {
		transaction = _.cloneDeep(validTransaction);
		rawTransaction = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
		dummyBlock = {
			id: '9314232245035524467',
			height: 1,
		};
		accountsMock = {
			getAccount: sinonSandbox.stub().callsArg(3),
			setAccountAndGet: sinonSandbox.stub().callsArg(1),
		};

		loggerMock = {
			debug: sinonSandbox.spy(),
		};

		delegate = new Delegate(loggerMock, modulesLoader.scope.schema);
		delegate.bind(accountsMock);
	});

	describe('constructor', () => {
		it('should attach schema to library variable', () => {
			var library = Delegate.__get__('library');
			expect(library)
				.to.have.property('schema')
				.equal(modulesLoader.scope.schema);
		});

		it('should attach schema to library variable', () => {
			var library = Delegate.__get__('library');
			expect(library)
				.to.have.property('logger')
				.equal(loggerMock);
		});
	});

	describe('bind', () => {
		it('should attach empty object to private modules.accounts variable', () => {
			delegate.bind({});
			var modules = Delegate.__get__('modules');

			expect(modules).to.eql({
				accounts: {},
			});
		});

		it('should bind modules with accounts object', () => {
			delegate.bind(accountsMock);
			var modules = Delegate.__get__('modules');

			expect(modules).to.eql({
				accounts: accountsMock,
			});
		});
	});

	describe('calculateFee', () => {
		it('should return the correct fee for delegate transaction', () => {
			expect(delegate.calculateFee(transaction)).to.equal(
				constants.fees.delegate
			);
		});
	});

	describe('verify', () => {
		describe('when transaction is not valid', () => {
			it('should call callback with error if recipientId exists', done => {
				transaction.recipientId = '123456';

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal('Invalid recipient');
					done();
				});
			});

			it('should call callback with error if amount is not equal to 0', done => {
				transaction.amount = 1;

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal('Invalid transaction amount');
					done();
				});
			});

			it('should call callback with error if sender is already a delegate', done => {
				sender.isDelegate = 1;

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal('Account is already a delegate');
					done();
				});
			});

			it('should call callback with error if asset is undefined', done => {
				transaction.asset = undefined;

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});

			it('should call callback with error if asset is empty', done => {
				transaction.asset = {};

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});

			it('should call callback with error if username does not exist', done => {
				transaction.asset.delegate.username = undefined;

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal('Username is undefined');
					done();
				});
			});

			it('should call callback with error if username is not lower case', done => {
				transaction.asset.delegate.username = 'UiOjKl';

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal('Username must be lowercase');
					done();
				});
			});

			it('should call callback with error if username is longer than 20 characters', done => {
				transaction.asset.delegate.username = Array(...Array(21))
					.map(() => {
						return 'n';
					})
					.join('');

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal(
						'Username is too long. Maximum is 20 characters'
					);
					done();
				});
			});

			it('should call callback with error if username is empty', done => {
				transaction.asset.delegate.username = '';

				delegate.verify(transaction, sender, err => {
					// Cannot check specific error because '' coerces to false and we get error: Username is undefined
					expect(err).to.exist;
					done();
				});
			});

			it('should call callback with error if username is address like', done => {
				transaction.asset.delegate.username = '163137396616706346l';

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal('Username can not be a potential address');
					done();
				});
			});

			it('should call callback with error when username contains symbols', done => {
				transaction.asset.delegate.username = '^%)';

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal(
						'Username can only contain alphanumeric characters with the exception of !@$&_.'
					);
					done();
				});
			});
		});

		describe('when transaction is valid', () => {
			var checkConfirmedStub;

			beforeEach(() => {
				checkConfirmedStub = sinonSandbox
					.stub(delegate, 'checkConfirmed')
					.callsArgWith(1, null);
			});

			afterEach(() => {
				checkConfirmedStub.restore();
			});

			it('should call checkConfirmed with correct transaction', done => {
				delegate.verify(transaction, sender, () => {
					expect(checkConfirmedStub.calledWith(transaction)).to.be.true;
					done();
				});
			});

			describe('when delegate was not registered before', () => {
				it('should call callback with valid transaction when username contains symbols which are valid', done => {
					transaction.asset.delegate.username = `${random.username()}!@.`;
					delegate.verify(transaction, sender, () => {
						expect(checkConfirmedStub.calledWith(transaction)).to.be.true;
						done();
					});
				});

				it('should call callback with error = null', done => {
					delegate.verify(transaction, sender, err => {
						expect(err).to.be.null;
						done();
					});
				});
			});

			describe('when username already exists as unconfirmed', () => {
				beforeEach(() => {
					checkConfirmedStub.restore();
					accountsMock.getAccount
						.withArgs(
							{ username: accounts.existingDelegate.delegateName },
							['username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
					accountsMock.getAccount
						.withArgs(
							{ u_username: accounts.existingDelegate.delegateName },
							['u_username'],
							sinonSandbox.match.any
						)
						.yields(null, accounts.existingDelegate);
					accountsMock.getAccount
						.withArgs(
							{
								publicKey: accounts.existingDelegate.publicKey,
								u_isDelegate: 1,
							},
							['u_username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
					accountsMock.getAccount
						.withArgs(
							{ publicKey: accounts.existingDelegate.publicKey, isDelegate: 1 },
							['username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
				});

				it('should not return an error', done => {
					delegate.verify(validTransaction, validSender, err => {
						expect(err).to.be.undefined;
						done();
					});
				});
			});

			describe('when username already exists as confirmed', () => {
				beforeEach(() => {
					checkConfirmedStub.restore();
					accountsMock.getAccount
						.withArgs(
							{ username: accounts.existingDelegate.delegateName },
							['username'],
							sinonSandbox.match.any
						)
						.yields(null, accounts.existingDelegate);
					accountsMock.getAccount
						.withArgs(
							{ u_username: accounts.existingDelegate.delegateName },
							['u_username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
					accountsMock.getAccount
						.withArgs(
							{
								publicKey: accounts.existingDelegate.publicKey,
								u_isDelegate: 1,
							},
							['u_username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
					accountsMock.getAccount
						.withArgs(
							{ publicKey: accounts.existingDelegate.publicKey, isDelegate: 1 },
							['username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
				});

				it('should return an error for valid params', done => {
					delegate.verify(validTransaction, validSender, err => {
						expect(err).to.equal(
							`Username ${
								accounts.existingDelegate.delegateName
							} already exists`
						);
						done();
					});
				});
			});

			describe('when publicKey already exists as unconfirmed delegate', () => {
				beforeEach(() => {
					checkConfirmedStub.restore();
					accountsMock.getAccount
						.withArgs(
							{ username: accounts.existingDelegate.delegateName },
							['username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
					accountsMock.getAccount
						.withArgs(
							{ u_username: accounts.existingDelegate.delegateName },
							['u_username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
					accountsMock.getAccount
						.withArgs(
							{
								publicKey: accounts.existingDelegate.publicKey,
								u_isDelegate: 1,
							},
							['u_username'],
							sinonSandbox.match.any
						)
						.yields(null, accounts.existingDelegate);
					accountsMock.getAccount
						.withArgs(
							{ publicKey: accounts.existingDelegate.publicKey, isDelegate: 1 },
							['username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
				});

				it('should return not return an error', done => {
					delegate.verify(validTransaction, validSender, err => {
						expect(err).to.be.undefined;
						done();
					});
				});
			});

			describe('when publicKey already exists as confirmed delegate', () => {
				beforeEach(() => {
					checkConfirmedStub.restore();
					accountsMock.getAccount
						.withArgs(
							{ username: accounts.existingDelegate.delegateName },
							['username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
					accountsMock.getAccount
						.withArgs(
							{ u_username: accounts.existingDelegate.delegateName },
							['u_username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
					accountsMock.getAccount
						.withArgs(
							{
								publicKey: accounts.existingDelegate.publicKey,
								u_isDelegate: 1,
							},
							['u_username'],
							sinonSandbox.match.any
						)
						.yields(null, null);
					accountsMock.getAccount
						.withArgs(
							{ publicKey: accounts.existingDelegate.publicKey, isDelegate: 1 },
							['username'],
							sinonSandbox.match.any
						)
						.yields(null, accounts.existingDelegate);
				});

				it('should return an error = "Account is already a delegate"', done => {
					delegate.verify(validTransaction, validSender, err => {
						expect(err).equal('Account is already a delegate');
						done();
					});
				});
			});
		});
	});

	describe('process', () => {
		it('should call the callback', done => {
			delegate.process(transaction, sender, done);
		});
	});

	describe('getBytes', () => {
		it('should return null when username is empty', () => {
			delete transaction.asset.delegate.username;

			expect(delegate.getBytes(transaction)).to.eql(null);
		});

		it('should return bytes for signature asset', () => {
			var delegateBytes = delegate.getBytes(transaction);
			expect(delegateBytes.toString()).to.equal(
				transaction.asset.delegate.username
			);
		});
	});

	describe('checkDuplicates', () => {
		var error;
		var result;
		var validUsernameField;
		var validIsDelegateField;

		beforeEach(done => {
			validUsernameField = 'u_username';
			validIsDelegateField = 'u_isDelegate';
			accountsMock.getAccount.callsArg(2);
			delegate.checkDuplicates(
				validTransaction,
				validUsernameField,
				validIsDelegateField,
				(err, res) => {
					error = err;
					result = res;
					done();
				}
			);
		});

		it('should call modules.accounts.getAccount twice', () => {
			expect(accountsMock.getAccount.calledTwice).to.be.true;
		});

		it('should call modules.accounts.getAccount with checking delegate registration params', () => {
			expect(
				accountsMock.getAccount.calledWith({
					publicKey: accounts.existingDelegate.publicKey,
					u_isDelegate: 1,
				})
			).to.be.true;
		});

		it('should call modules.accounts.getAccount with checking username params', () => {
			expect(
				accountsMock.getAccount.calledWith({
					u_username: accounts.existingDelegate.delegateName,
				})
			).to.be.true;
		});

		describe('when username exists', () => {
			beforeEach(done => {
				accountsMock.getAccount
					.withArgs(
						{ u_username: accounts.existingDelegate.delegateName },
						['u_username'],
						sinonSandbox.match.any
					)
					.yields(null, accounts.existingDelegate);
				delegate.checkDuplicates(
					validTransaction,
					validUsernameField,
					validIsDelegateField,
					(err, res) => {
						error = err;
						result = res;
						done();
					}
				);
			});

			it('should call callback with the error', () => {
				expect(error).to.equal(
					`Username ${accounts.existingDelegate.delegateName} already exists`
				);
			});
		});

		describe('when publicKey already exists as a delegate', () => {
			beforeEach(done => {
				accountsMock.getAccount
					.withArgs(
						{ publicKey: accounts.existingDelegate.publicKey, u_isDelegate: 1 },
						['u_username'],
						sinonSandbox.match.any
					)
					.yields(null, accounts.existingDelegate);
				delegate.checkDuplicates(
					validTransaction,
					validUsernameField,
					validIsDelegateField,
					(err, res) => {
						error = err;
						result = res;
						done();
					}
				);
			});

			it('should return an error = "Account is already a delegate"', () => {
				expect(error).to.equal('Account is already a delegate');
			});
		});

		describe('when publicKey and username does not match any account', () => {
			it('should not return the error', () => {
				expect(error).to.be.undefined;
			});

			it('should not return the result', () => {
				expect(result).to.be.undefined;
			});
		});
	});

	describe('checkConfirmed', () => {
		var checkDuplicatesStub;
		var transactionsExceptionsIndexOfStub;

		beforeEach(() => {
			checkDuplicatesStub = sinonSandbox
				.stub(delegate, 'checkDuplicates')
				.callsArg(3);
			transactionsExceptionsIndexOfStub = sinonSandbox.spy(
				exceptions.delegates,
				'indexOf'
			);
		});

		afterEach(() => {
			transactionsExceptionsIndexOfStub.restore();
			checkDuplicatesStub.restore();
		});

		it('should call checkDuplicates with valid transaction', done => {
			delegate.checkConfirmed(validTransaction, () => {
				expect(checkDuplicatesStub.calledWith(validTransaction)).to.be.true;
				done();
			});
		});

		it('should call checkDuplicates with "username"', done => {
			delegate.checkConfirmed(validTransaction, () => {
				expect(checkDuplicatesStub.args[0][1] === 'username').to.be.true;
				done();
			});
		});

		it('should call checkDuplicates with "isDelegate"', done => {
			delegate.checkConfirmed(validTransaction, () => {
				expect(checkDuplicatesStub.args[0][2] === 'isDelegate').to.be.true;
				done();
			});
		});

		describe('when checkDuplicates succeeds', () => {
			beforeEach(() => {
				checkDuplicatesStub.restore();
				checkDuplicatesStub = sinonSandbox
					.stub(delegate, 'checkDuplicates')
					.callsArgWith(3, null);
			});

			it('should call callback with error = undefined', done => {
				delegate.checkConfirmed(validTransaction, done);
			});
		});

		describe('when checkDuplicates fails', () => {
			var validDelegateRegistrationError = 'Account is already a delegate';

			beforeEach(() => {
				checkDuplicatesStub.restore();
				checkDuplicatesStub = sinonSandbox
					.stub(delegate, 'checkDuplicates')
					.callsArgWith(3, validDelegateRegistrationError);
			});

			it('should call callback with an error', done => {
				delegate.checkConfirmed(validTransaction, err => {
					expect(err).equal(validDelegateRegistrationError);
					done();
				});
			});

			it('should check if transaction exception occurred', done => {
				delegate.checkConfirmed(validTransaction, () => {
					expect(transactionsExceptionsIndexOfStub.called).to.be.true;
					done();
				});
			});

			describe('when transaction is on exceptions list', () => {
				var originalDelegatesExceptions;

				beforeEach(() => {
					originalDelegatesExceptions = exceptions.delegates.slice(0); // copy
					exceptions.delegates = [validTransaction.id];
				});

				afterEach(() => {
					exceptions.delegates = originalDelegatesExceptions;
				});

				it('should call callback with an error = null', done => {
					delegate.checkConfirmed(validTransaction, err => {
						expect(err).to.be.null;
						done();
					});
				});

				it('should call library.logger.debug with an error message', done => {
					delegate.checkConfirmed(validTransaction, () => {
						expect(loggerMock.debug.calledWith(validDelegateRegistrationError))
							.to.be.true;
						done();
					});
				});

				it('should call library.logger.debug with stringified transaction', done => {
					delegate.checkConfirmed(validTransaction, () => {
						expect(
							loggerMock.debug.calledWith(JSON.stringify(validTransaction))
						).to.be.true;
						done();
					});
				});
			});
		});
	});

	describe('checkUnconfirmed', () => {
		var checkDuplicatesStub;

		beforeEach(() => {
			checkDuplicatesStub = sinonSandbox
				.stub(delegate, 'checkDuplicates')
				.callsArg(3);
		});

		afterEach(() => {
			checkDuplicatesStub.restore();
		});

		it('should call checkDuplicates with valid transaction', done => {
			delegate.checkUnconfirmed(validTransaction, () => {
				expect(checkDuplicatesStub.calledWith(validTransaction)).to.be.true;
				done();
			});
		});

		it('should call checkDuplicates with "u_username"', done => {
			delegate.checkUnconfirmed(validTransaction, () => {
				expect(checkDuplicatesStub.args[0][1] === 'u_username').to.be.true;
				done();
			});
		});

		it('should call checkDuplicates with "u_isDelegate"', done => {
			delegate.checkUnconfirmed(validTransaction, () => {
				expect(checkDuplicatesStub.args[0][2] === 'u_isDelegate').to.be.true;
				done();
			});
		});

		describe('when delegate is not unconfirmed', () => {
			beforeEach(() => {
				checkDuplicatesStub.restore();
				checkDuplicatesStub = sinonSandbox
					.stub(delegate, 'checkDuplicates')
					.callsArgWith(3, null);
			});

			it('should not return an error', done => {
				delegate.checkUnconfirmed(validTransaction, done);
			});
		});

		describe('when delegate is already unconfirmed', () => {
			var validDelegateRegistrationError = 'Account is already a delegate';

			beforeEach(() => {
				checkDuplicatesStub.restore();
				checkDuplicatesStub = sinonSandbox
					.stub(delegate, 'checkDuplicates')
					.callsArgWith(3, validDelegateRegistrationError);
			});

			it('should call callback with an error', done => {
				delegate.checkUnconfirmed(validTransaction, err => {
					expect(err).equal(validDelegateRegistrationError);
					done();
				});
			});
		});
	});

	describe('apply', () => {
		var checkConfirmedStub;

		describe('when username was not registered before', () => {
			var validConfirmedAccount;

			beforeEach(() => {
				checkConfirmedStub = sinonSandbox
					.stub(delegate, 'checkConfirmed')
					.callsArg(1);
				accountsMock.setAccountAndGet = sinonSandbox.stub().callsArg(1);
				validConfirmedAccount = {
					publicKey: validSender.publicKey,
					address: validSender.address,
					u_isDelegate: 0,
					isDelegate: 1,
					vote: 0,
					u_username: null,
					username: validTransaction.asset.delegate.username,
				};
			});

			afterEach(() => {
				checkConfirmedStub.restore();
			});

			it('should call accounts.setAccountAndGet module with correct parameter', done => {
				delegate.apply(validTransaction, dummyBlock, validSender, () => {
					expect(
						accountsMock.setAccountAndGet.calledWith(validConfirmedAccount)
					).to.be.true;
					done();
				});
			});
		});

		describe('when username is already confirmed', () => {
			beforeEach(() => {
				checkConfirmedStub = sinonSandbox
					.stub(delegate, 'checkConfirmed')
					.callsArgWith(1, 'Username already exists');
			});

			afterEach(() => {
				checkConfirmedStub.restore();
			});

			it('should not call accounts.setAccountAndGet', done => {
				delegate.apply(validTransaction, dummyBlock, validSender, () => {
					expect(accountsMock.setAccountAndGet.notCalled).to.be.true;
					done();
				});
			});

			it('should return an error', done => {
				delegate.apply(validTransaction, dummyBlock, validSender, err => {
					expect(err).to.be.equal('Username already exists');
					done();
				});
			});
		});
	});

	describe('applyUnconfirmed', () => {
		var checkUnconfirmedStub;

		describe('when username was not registered before', () => {
			var validUnconfirmedAccount;

			beforeEach(() => {
				checkUnconfirmedStub = sinonSandbox
					.stub(delegate, 'checkUnconfirmed')
					.callsArg(1);
				accountsMock.setAccountAndGet = sinonSandbox.stub().callsArg(1);
				validUnconfirmedAccount = {
					publicKey: validSender.publicKey,
					address: validSender.address,
					u_isDelegate: 1,
					isDelegate: 0,
					username: null,
					u_username: validTransaction.asset.delegate.username,
				};
			});

			afterEach(() => {
				checkUnconfirmedStub.restore();
			});

			it('should call accounts.setAccountAndGet module with correct parameter', done => {
				delegate.applyUnconfirmed(validTransaction, validSender, () => {
					expect(
						accountsMock.setAccountAndGet.calledWith(validUnconfirmedAccount)
					).to.be.true;
					done();
				});
			});
		});

		describe('when username is already unconfirmed', () => {
			beforeEach(() => {
				checkUnconfirmedStub = sinonSandbox
					.stub(delegate, 'checkUnconfirmed')
					.callsArgWith(1, 'Username already exists');
			});

			afterEach(() => {
				checkUnconfirmedStub.restore();
			});

			it('should not call accounts.setAccountAndGet', done => {
				delegate.applyUnconfirmed(validTransaction, validSender, () => {
					expect(accountsMock.setAccountAndGet.notCalled).to.be.true;
					done();
				});
			});

			it('should return an error', done => {
				delegate.applyUnconfirmed(validTransaction, validSender, err => {
					expect(err).to.be.equal('Username already exists');
					done();
				});
			});
		});
	});

	describe('undo', () => {
		it('should call accounts.setAccountAndGet module with correct parameters', done => {
			delegate.undo(transaction, dummyBlock, sender, () => {
				expect(
					accountsMock.setAccountAndGet.calledWith({
						address: sender.address,
						u_isDelegate: 1,
						isDelegate: 0,
						vote: 0,
						username: null,
						u_username: transaction.asset.delegate.username,
					})
				);
				done();
			});
		});

		it('should update username value to null if sender.nameexist is not true', done => {
			delete sender.username;
			sender.nameexist = 0;

			delegate.undo(transaction, dummyBlock, sender, () => {
				expect(
					accountsMock.setAccountAndGet.calledWith({
						address: sender.address,
						u_isDelegate: 1,
						isDelegate: 0,
						vote: 0,
						username: null,
						u_username: transaction.asset.delegate.username,
					})
				);
				done();
			});
		});
	});

	describe('undoUnconfirmed', () => {
		it('should call accounts.setAccountAndGet module with correct parameters', done => {
			delegate.undoUnconfirmed(transaction, sender, () => {
				expect(
					accountsMock.setAccountAndGet.calledWith({
						address: sender.address,
						u_isDelegate: 0,
						isDelegate: 0,
						username: null,
						u_username: null,
					})
				);
				done();
			});
		});
	});

	describe('objectNormalize', () => {
		it('should use the correct format to validate against', () => {
			var library = Delegate.__get__('library');
			var schemaSpy = sinonSandbox.spy(library.schema, 'validate');
			delegate.objectNormalize(transaction);
			expect(schemaSpy.calledOnce).to.equal(true);
			expect(
				schemaSpy.calledWithExactly(
					transaction.asset.delegate,
					Delegate.prototype.schema
				)
			).to.equal(true);
			schemaSpy.restore();
		});

		describe('when library.schema.validate fails', () => {
			var schemaDynamicTest = new SchemaDynamicTest({
				testStyle: SchemaDynamicTest.TEST_STYLE.THROWABLE,
				customPropertyAssertion: function(input, expectedType, property, err) {
					expect(err).to.equal(
						`Failed to validate delegate schema: Expected type ${expectedType} but found type ${
							input.expectation
						}`
					);
				},
			});

			after(() => {
				describe('schema dynamic tests: delegate', () => {
					schemaDynamicTest.schema.shouldFailAgainst.nonObject.property(
						delegate.objectNormalize,
						transaction,
						'asset.delegate'
					);

					describe('username', () => {
						schemaDynamicTest.schema.shouldFailAgainst.nonString.property(
							delegate.objectNormalize,
							transaction,
							'asset.delegate.username'
						);
					});
				});
			});

			it('should throw error', () => {
				transaction.asset.delegate.username = '*';

				expect(() => {
					delegate.objectNormalize(transaction);
				}).to.throw(
					"Failed to validate delegate schema: Object didn't pass validation for format username: "
				);
			});
		});

		describe('when library.schema.validate succeeds', () => {
			it('should return transaction', () => {
				expect(delegate.objectNormalize(transaction)).to.eql(transaction);
			});
		});
	});

	describe('dbRead', () => {
		it('should return null when d_username is not set', () => {
			delete rawTransaction.d_username;

			expect(delegate.dbRead(rawTransaction)).to.eql(null);
		});

		it('should return delegate asset for raw transaction passed', () => {
			var expectedAsset = {
				address: rawValidTransaction.t_senderId,
				publicKey: rawValidTransaction.t_senderPublicKey,
				username: rawValidTransaction.d_username,
			};

			expect(delegate.dbRead(rawTransaction).delegate).to.eql(expectedAsset);
		});
	});

	describe('ready', () => {
		it('should return true for single signature transasction', () => {
			expect(delegate.ready(transaction, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', () => {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(delegate.ready(transaction, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with at least min signatures', () => {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete transaction.signature;
			// Not really correct signature, but we are not testing that over here
			transaction.signature = crypto.randomBytes(64).toString('hex');
			transaction.signatures = [crypto.randomBytes(64).toString('hex')];

			expect(delegate.ready(transaction, sender)).to.equal(true);
		});
	});
});

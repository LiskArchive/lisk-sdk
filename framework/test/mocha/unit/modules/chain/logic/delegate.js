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
const accounts = require('../../../../fixtures/accounts');
const ed = require('../../../../../../src/modules/chain/helpers/ed');
const Bignum = require('../../../../../../src/modules/chain/helpers/bignum');
const modulesLoader = require('../../../../common/modules_loader');
const random = require('../../../../common/utils/random');
const SchemaDynamicTest = require('../common/schema_dynamic_test');

const Delegate = rewire('../../../../../../src/modules/chain/logic/delegate');

const { FEES } = global.constants;
const validPassphrase =
	'robust weapon course unknown head trial pencil latin acid';
const validKeypair = ed.makeKeypair(
	crypto
		.createHash('sha256')
		.update(validPassphrase, 'utf8')
		.digest()
);

const validSender = {
	passphrase:
		'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	username: 'genesis_100',
	encryptedPassphrase:
		'iterations=1&salt=25e9932aaa4c885bdcafb1913058fce6&cipherText=94cd85840ca2397e609e39d9c2902000d90d98bc3a24d0d5f086219c8365b84ab67a82e4e7680e9cec0da71b6c7f930e326d3bbece8e963d9664fcfaa80bd6f2e96befb033ad84ab3e6b0e32300cb304512f3f&iv=6bff91449f495bae345ab15a&tag=91c1eaa254a80c5d51a15b75929ca335&version=1',
	password: 'elephant tree paris dragon chair galaxy',
	nameexist: 1,
};

const validTransaction = {
	type: 2,
	amount: new Bignum('0'),
	fee: new Bignum('0'),
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

const rawValidTransaction = {
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
	t_amount: new Bignum('0'),
	t_fee: new Bignum('0'),
	t_signature:
		'5495bea66b026b0d6b72bab8611fca9c655c1f023267f3c51453c950aa3d0e0eb08b0bc04e6355909abd75cd1d4df8c3048a55c3a98d0719b4b71e5d527e580a',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 284,
	d_username: 'genesis_100',
};

describe('delegate', () => {
	let accountsMock;
	let delegate;
	let dummyBlock;
	let transaction;
	let rawTransaction;
	let sender;

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

		delegate = new Delegate({
			schema: modulesLoader.scope.schema,
		});

		return delegate.bind(accountsMock);
	});

	describe('constructor', () => {
		let __scope;

		beforeEach(done => {
			__scope = Delegate.__get__('__scope');
			done();
		});

		it('should attach schema to __scope', async () => {
			return expect(__scope)
				.to.have.property('schema')
				.equal(modulesLoader.scope.schema);
		});
	});

	describe('bind', () => {
		it('should attach empty object to __scope.modules.accounts', async () => {
			delegate.bind({});
			const modules = Delegate.__get__('__scope.modules');

			return expect(modules).to.eql({
				accounts: {},
			});
		});

		it('should bind __scope.modules with accounts object', async () => {
			delegate.bind(accountsMock);
			const modules = Delegate.__get__('__scope.modules');

			return expect(modules).to.eql({
				accounts: accountsMock,
			});
		});
	});

	describe('calculateFee', () => {
		it('should return the correct fee for delegate transaction', async () =>
			expect(delegate.calculateFee(transaction).isEqualTo(FEES.DELEGATE)).to.be
				.true);
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
				transaction.amount = new Bignum('1');

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

			it('should call callback with error if username is not lowercase', done => {
				transaction.asset.delegate.username = 'UiOjKl';

				delegate.verify(transaction, sender, err => {
					expect(err).to.equal('Username must be lowercase');
					done();
				});
			});

			it('should call callback with error if username is longer than 20 characters', done => {
				transaction.asset.delegate.username = Array(...Array(21))
					.map(() => 'n')
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
			let checkConfirmedStub;

			beforeEach(done => {
				checkConfirmedStub = sinonSandbox
					.stub(delegate, 'checkConfirmed')
					.callsArgWith(1, null);
				done();
			});

			afterEach(() => checkConfirmedStub.restore());

			it('should call checkConfirmed with correct transaction', done => {
				delegate.verify(transaction, sender, async () => {
					expect(checkConfirmedStub.calledWith(transaction)).to.be.true;
					done();
				});
			});

			describe('when delegate was not registered before', () => {
				it('should call callback with valid transaction when username contains symbols which are valid', done => {
					transaction.asset.delegate.username = `${random.username()}!@.`;
					delegate.verify(transaction, sender, async () => {
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
					return accountsMock.getAccount
						.withArgs(
							{
								publicKey: accounts.existingDelegate.publicKey,
								isDelegate: true,
							},
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
					return accountsMock.getAccount
						.withArgs(
							{
								publicKey: accounts.existingDelegate.publicKey,
								isDelegate: true,
							},
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
					return accountsMock.getAccount
						.withArgs(
							{
								publicKey: accounts.existingDelegate.publicKey,
								isDelegate: true,
							},
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
					return accountsMock.getAccount
						.withArgs(
							{
								publicKey: accounts.existingDelegate.publicKey,
								isDelegate: true,
							},
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
		it('should return null when username is empty', async () => {
			delete transaction.asset.delegate.username;

			return expect(delegate.getBytes(transaction)).to.eql(null);
		});

		it('should return bytes for signature asset', async () => {
			const delegateBytes = delegate.getBytes(transaction);
			return expect(delegateBytes.toString()).to.equal(
				transaction.asset.delegate.username
			);
		});
	});

	describe('checkDuplicates', () => {
		let error;
		let result;
		let validUsernameField;
		let validIsDelegateField;

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

		it('should call modules.accounts.getAccount twice', async () =>
			expect(accountsMock.getAccount.calledTwice).to.be.true);

		it('should call modules.accounts.getAccount with checking delegate registration params', async () =>
			expect(
				accountsMock.getAccount.calledWith({
					publicKey: accounts.existingDelegate.publicKey,
					u_isDelegate: true,
				})
			).to.be.true);

		it('should call modules.accounts.getAccount with checking username params', async () =>
			expect(
				accountsMock.getAccount.calledWith({
					u_username: accounts.existingDelegate.delegateName,
				})
			).to.be.true);

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

			it('should call callback with the error', async () =>
				expect(error).to.equal(
					`Username ${accounts.existingDelegate.delegateName} already exists`
				));
		});

		describe('when publicKey already exists as a delegate', () => {
			beforeEach(done => {
				accountsMock.getAccount
					.withArgs(
						{
							publicKey: accounts.existingDelegate.publicKey,
							u_isDelegate: true,
						},
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

			it('should return an error = "Account is already a delegate"', async () =>
				expect(error).to.equal('Account is already a delegate'));
		});

		describe('when publicKey and username does not match any account', () => {
			it('should not return the error', async () =>
				expect(error).to.be.undefined);

			it('should not return the result', async () =>
				expect(result).to.be.undefined);
		});
	});

	describe('checkConfirmed', () => {
		let checkDuplicatesStub;

		beforeEach(done => {
			checkDuplicatesStub = sinonSandbox
				.stub(delegate, 'checkDuplicates')
				.callsArg(3);
			done();
		});

		afterEach(() => checkDuplicatesStub.restore());

		it('should call checkDuplicates with valid transaction', done => {
			delegate.checkConfirmed(validTransaction, async () => {
				expect(checkDuplicatesStub.calledWith(validTransaction)).to.be.true;
				done();
			});
		});

		it('should call checkDuplicates with "username"', done => {
			delegate.checkConfirmed(validTransaction, async () => {
				expect(checkDuplicatesStub.args[0][1]).to.equal('username');
				done();
			});
		});

		it('should call checkDuplicates with "isDelegate"', done => {
			delegate.checkConfirmed(validTransaction, async () => {
				expect(checkDuplicatesStub.args[0][2]).to.equal('isDelegate');
				done();
			});
		});

		describe('when checkDuplicates succeeds', () => {
			beforeEach(done => {
				checkDuplicatesStub.restore();
				checkDuplicatesStub = sinonSandbox
					.stub(delegate, 'checkDuplicates')
					.callsArgWith(3, null);
				done();
			});

			it('should call callback with error = undefined', done => {
				delegate.checkConfirmed(validTransaction, done);
			});
		});

		describe('when checkDuplicates fails', () => {
			const validDelegateRegistrationError = 'Account is already a delegate';

			beforeEach(done => {
				checkDuplicatesStub.restore();
				checkDuplicatesStub = sinonSandbox
					.stub(delegate, 'checkDuplicates')
					.callsArgWith(3, validDelegateRegistrationError);
				done();
			});

			it('should call callback with an error', done => {
				delegate.checkConfirmed(validTransaction, err => {
					expect(err).equal(validDelegateRegistrationError);
					done();
				});
			});
		});
	});

	describe('checkUnconfirmed', () => {
		let checkDuplicatesStub;

		beforeEach(done => {
			checkDuplicatesStub = sinonSandbox
				.stub(delegate, 'checkDuplicates')
				.callsArg(3);
			done();
		});

		afterEach(() => checkDuplicatesStub.restore());

		it('should call checkDuplicates with valid transaction', done => {
			delegate.checkUnconfirmed(validTransaction, async () => {
				expect(checkDuplicatesStub.calledWith(validTransaction)).to.be.true;
				done();
			});
		});

		it('should call checkDuplicates with "u_username"', done => {
			delegate.checkUnconfirmed(validTransaction, async () => {
				expect(checkDuplicatesStub.args[0][1]).to.equal('u_username');
				done();
			});
		});

		it('should call checkDuplicates with "u_isDelegate"', done => {
			delegate.checkUnconfirmed(validTransaction, async () => {
				expect(checkDuplicatesStub.args[0][2]).to.equal('u_isDelegate');
				done();
			});
		});

		describe('when delegate is not unconfirmed', () => {
			beforeEach(done => {
				checkDuplicatesStub.restore();
				checkDuplicatesStub = sinonSandbox
					.stub(delegate, 'checkDuplicates')
					.callsArgWith(3, null);
				done();
			});

			it('should not return an error', done => {
				delegate.checkUnconfirmed(validTransaction, done);
			});
		});

		describe('when delegate is already unconfirmed', () => {
			const validDelegateRegistrationError = 'Account is already a delegate';

			beforeEach(done => {
				checkDuplicatesStub.restore();
				checkDuplicatesStub = sinonSandbox
					.stub(delegate, 'checkDuplicates')
					.callsArgWith(3, validDelegateRegistrationError);
				done();
			});

			it('should call callback with an error', done => {
				delegate.checkUnconfirmed(validTransaction, err => {
					expect(err).equal(validDelegateRegistrationError);
					done();
				});
			});
		});
	});

	describe('applyConfirmed', () => {
		let checkConfirmedStub;

		describe('when username was not registered before', () => {
			let validConfirmedAccount;

			beforeEach(done => {
				checkConfirmedStub = sinonSandbox
					.stub(delegate, 'checkConfirmed')
					.callsArg(1);
				accountsMock.setAccountAndGet = sinonSandbox.stub().callsArg(1);
				validConfirmedAccount = {
					publicKey: validSender.publicKey,
					address: validSender.address,
					isDelegate: 1,
					vote: 0,
					username: validTransaction.asset.delegate.username,
				};
				done();
			});

			afterEach(() => checkConfirmedStub.restore());

			it('should call accounts.setAccountAndGet module with correct parameter', done => {
				delegate.applyConfirmed(
					validTransaction,
					dummyBlock,
					validSender,
					async () => {
						expect(
							accountsMock.setAccountAndGet.calledWith(validConfirmedAccount)
						).to.be.true;
						done();
					}
				);
			});
		});

		describe('when username is already confirmed', () => {
			beforeEach(done => {
				checkConfirmedStub = sinonSandbox
					.stub(delegate, 'checkConfirmed')
					.callsArgWith(1, 'Username already exists');
				done();
			});

			afterEach(() => checkConfirmedStub.restore());

			it('should not call accounts.setAccountAndGet', done => {
				delegate.applyConfirmed(
					validTransaction,
					dummyBlock,
					validSender,
					async () => {
						expect(accountsMock.setAccountAndGet.notCalled).to.be.true;
						done();
					}
				);
			});

			it('should return an error', done => {
				delegate.applyConfirmed(
					validTransaction,
					dummyBlock,
					validSender,
					err => {
						expect(err).to.be.equal('Username already exists');
						done();
					}
				);
			});
		});
	});

	describe('applyUnconfirmed', () => {
		let checkUnconfirmedStub;

		describe('when username was not registered before', () => {
			let validUnconfirmedAccount;

			beforeEach(done => {
				checkUnconfirmedStub = sinonSandbox
					.stub(delegate, 'checkUnconfirmed')
					.callsArg(1);
				accountsMock.setAccountAndGet = sinonSandbox.stub().callsArg(1);
				validUnconfirmedAccount = {
					publicKey: validSender.publicKey,
					address: validSender.address,
					u_isDelegate: 1,
					u_username: validTransaction.asset.delegate.username,
				};
				done();
			});

			afterEach(() => checkUnconfirmedStub.restore());

			it('should call accounts.setAccountAndGet module with correct parameter', done => {
				delegate.applyUnconfirmed(validTransaction, validSender, async () => {
					expect(
						accountsMock.setAccountAndGet.calledWith(validUnconfirmedAccount)
					).to.be.true;
					done();
				});
			});
		});

		describe('when username is already unconfirmed', () => {
			beforeEach(done => {
				checkUnconfirmedStub = sinonSandbox
					.stub(delegate, 'checkUnconfirmed')
					.callsArgWith(1, 'Username already exists');
				done();
			});

			afterEach(() => checkUnconfirmedStub.restore());

			it('should not call accounts.setAccountAndGet', done => {
				delegate.applyUnconfirmed(validTransaction, validSender, async () => {
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

	describe('undoConfirmed', () => {
		it('should call accounts.setAccountAndGet module with correct parameters', done => {
			delegate.undoConfirmed(transaction, dummyBlock, sender, async () => {
				expect(
					accountsMock.setAccountAndGet.calledWith({
						address: sender.address,
						isDelegate: 0,
						vote: 0,
						username: null,
					})
				).to.be.true;
				done();
			});
		});

		it('should update username value to null if sender.nameexist is not true', done => {
			delete sender.username;
			sender.nameexist = 0;

			delegate.undoConfirmed(transaction, dummyBlock, sender, async () => {
				expect(
					accountsMock.setAccountAndGet.calledWith({
						address: sender.address,
						isDelegate: 0,
						vote: 0,
						username: null,
					})
				).to.be.true;
				done();
			});
		});
	});

	describe('undoUnconfirmed', () => {
		it('should call accounts.setAccountAndGet module with correct parameters', done => {
			delegate.undoUnconfirmed(transaction, sender, async () => {
				expect(
					accountsMock.setAccountAndGet.calledWith({
						address: sender.address,
						u_isDelegate: 0,
						u_username: null,
					})
				).to.be.true;
				done();
			});
		});
	});

	describe('objectNormalize', () => {
		it('should use the correct format to validate against', async () => {
			const __scope = Delegate.__get__('__scope');
			const schemaSpy = sinonSandbox.spy(__scope.schema, 'validate');
			delegate.objectNormalize(transaction);
			expect(schemaSpy.calledOnce).to.equal(true);
			expect(
				schemaSpy.calledWithExactly(
					transaction.asset.delegate,
					Delegate.prototype.schema
				)
			).to.equal(true);
			return schemaSpy.restore();
		});

		describe('when __scope.schema.validate fails', () => {
			const schemaDynamicTest = new SchemaDynamicTest({
				testStyle: SchemaDynamicTest.TEST_STYLE.THROWABLE,
				customPropertyAssertion(input, expectedType, property, err) {
					expect(err).to.equal(
						`Failed to validate delegate schema: Expected type ${expectedType} but found type ${
							input.expectation
						}`
					);
				},
			});

			after(done => {
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
				done();
			});

			it('should throw error', async () => {
				transaction.asset.delegate.username = '*';

				return expect(() => {
					delegate.objectNormalize(transaction);
				}).to.throw(
					"Failed to validate delegate schema: Object didn't pass validation for format username: "
				);
			});
		});

		describe('when __scope.schema.validate succeeds', () => {
			it('should return transaction', async () =>
				expect(delegate.objectNormalize(transaction)).to.eql(transaction));
		});
	});

	describe('dbRead', () => {
		it('should return null when d_username is not set', async () => {
			delete rawTransaction.d_username;

			return expect(delegate.dbRead(rawTransaction)).to.eql(null);
		});

		it('should return delegate asset for raw transaction passed', async () => {
			const expectedAsset = {
				address: rawValidTransaction.t_senderId,
				publicKey: rawValidTransaction.t_senderPublicKey,
				username: rawValidTransaction.d_username,
			};

			return expect(delegate.dbRead(rawTransaction).delegate).to.eql(
				expectedAsset
			);
		});
	});

	describe('ready', () => {
		it('should return true for single signature transasction', async () =>
			expect(delegate.ready(transaction, sender)).to.equal(true));

		it('should return false for multi signature transaction with less signatures', async () => {
			sender.membersPublicKeys = [validKeypair.publicKey.toString('hex')];

			return expect(delegate.ready(transaction, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with at least min signatures', async () => {
			sender.membersPublicKeys = [validKeypair.publicKey.toString('hex')];
			sender.multiMin = 1;

			delete transaction.signature;
			// Not really correct signature, but we are not testing that over here
			transaction.signature = crypto.randomBytes(64).toString('hex');
			transaction.signatures = [crypto.randomBytes(64).toString('hex')];

			return expect(delegate.ready(transaction, sender)).to.equal(true);
		});
	});
});

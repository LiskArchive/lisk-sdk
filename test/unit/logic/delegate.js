'use strict';/*eslint*/

var crypto = require('crypto');
var _  = require('lodash');
var rewire = require('rewire');
var sinon   = require('sinon');

var node = require('../../node.js');
var accountFixtures = require('../../fixtures/accounts');

var ed = require('../../../helpers/ed');
var constants = require('../../../helpers/constants');
var Delegate = rewire('../../../logic/delegate.js');

var modulesLoader = require('../../common/modulesLoader');
var SchemaDynamicTest = require('../common/schemaDynamicTest.js');
var randomUtil = require('../../common/utils/random');

var expect = node.expect;

var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var validSender = {
	secret: 'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	username: 'genesis_100',
	encryptedSecret: '8c639a2e1eb86b19644c820584d72ff5c6c896e633342b1ecc4c450f92d4cf7b6b143c6fc8b3be4fb85077028fd75197e17e46fe6f319bcffff7c9c8c2c13e77c24ef529d290f3c7632f0ae66b6111233bfad9fd99adff3f45f2ced65b0e9ef7',
	key: 'elephant tree paris dragon chair galaxy',
	nameexist: 1
};

var senderHash = crypto.createHash('sha256').update(validSender.secret, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var validTransaction = {
	type: 2,
	amount: 0,
	fee: 0,
	timestamp: 0,
	recipientId: null,
	senderId: '10881167371402274308L',
	senderPublicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	asset: {
		delegate: {
			username: 'genesis_100',
			publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9'
		}
	},
	signature: '5495bea66b026b0d6b72bab8611fca9c655c1f023267f3c51453c950aa3d0e0eb08b0bc04e6355909abd75cd1d4df8c3048a55c3a98d0719b4b71e5d527e580a',
	id: '8500285156990763245'
};

var rawValidTransaction = {
	t_id: '8500285156990763245',
	b_height: 1,
	t_blockId: '6524861224470851795',
	t_type: 2,
	t_timestamp: 0,
	t_senderPublicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	m_recipientPublicKey: null,
	t_senderId: '10881167371402274308L',
	t_recipientId: null,
	t_amount: '0',
	t_fee: '0',
	t_signature: '5495bea66b026b0d6b72bab8611fca9c655c1f023267f3c51453c950aa3d0e0eb08b0bc04e6355909abd75cd1d4df8c3048a55c3a98d0719b4b71e5d527e580a',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 284,
	d_username: 'genesis_100'
};

describe('delegate', function () {

	var transactionMock;
	var accountsMock;
	var delegate;

	var transaction;
	var rawTransaction;
	var sender;

	function dummyCb () {};

	before(function () {
		transactionMock = sinon.mock({});
	});

	beforeEach(function () {
		transaction = _.cloneDeep(validTransaction);
		rawTransaction = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);

		accountsMock = {
			setAccountAndGet: sinon.mock(),
			getAccount: sinon.mock()
		};

		delegate = new Delegate(modulesLoader.scope.schema);
		delegate.bind(accountsMock);
	});

	describe('constructor', function () {

		it('should attach schema to library variable', function () {
			new Delegate(modulesLoader.scope.schema);
			var library = Delegate.__get__('library');

			expect(library).to.eql({
				schema: modulesLoader.scope.schema
			});
		});
	});

	describe('bind', function () {

		it('should attach empty object to private modules.accounts variable', function () {
			delegate.bind({});
			var modules = Delegate.__get__('modules');

			expect(modules).to.eql({
				accounts: {}
			});
		});

		it('should bind modules with accounts object', function () {
			delegate.bind(accountsMock);
			var modules = Delegate.__get__('modules');

			expect(modules).to.eql({
				accounts: accountsMock
			});
		});
	});

	describe('calculateFee', function () {

		it('should return the correct fee for delegate transaction', function () {
			expect(delegate.calculateFee(transaction)).to.equal(constants.fees.delegate);
		});
	});

	describe('verify', function () {

		describe('when transaction is not valid', function () {

			it('should call callback with error if recipientId exists', function (done) {
				transaction.recipientId = '123456';

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid recipient');
					done();
				});
			});

			it('should call callback with error if amount is not equal to 0', function (done) {
				transaction.amount = 1;

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid transaction amount');
					done();
				});
			});

			it('should call callback with error if sender is already a delegate', function (done) {
				sender.isDelegate = 1;

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Account is already a delegate');
					done();
				});
			});

			it('should call callback with error if asset is undefined', function (done) {
				transaction.asset = undefined;

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});

			it('should call callback with error if asset is empty', function (done) {
				transaction.asset = {};

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Invalid transaction asset');
					done();
				});
			});

			it('should call callback with error if username does not exist', function (done) {
				transaction.asset.delegate.username = undefined;

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Username is undefined');
					done();
				});
			});

			it('should call callback with error if username is not lower case', function (done) {
				transaction.asset.delegate.username = 'UiOjKl';

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Username must be lowercase');
					done();
				});
			});

			it('should call callback with error if username is longer than 20 characters', function (done) {
				transaction.asset.delegate.username = Array.apply(null, Array(21)).map(function () {
					return 'n';
				}).join('');

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Username is too long. Maximum is 20 characters');
					done();
				});
			});

			it('should call callback with error if username is empty', function (done) {
				transaction.asset.delegate.username = '';

				delegate.verify(transaction, sender, function (err) {
					// Cannot check specific error because '' coerces to false and we get error: Username is undefined
					expect(err).to.exist;
					done();
				});
			});

			it('should call callback with error if username is address like', function (done) {
				transaction.asset.delegate.username = '163137396616706346l';

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Username can not be a potential address');
					done();
				});
			});

			it('should call callback with error when username contains symbols', function (done) {
				transaction.asset.delegate.username = '^%)';

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Username can only contain alphanumeric characters with the exception of !@$&_.');
					done();
				});
			});

			it('should call callback with error when accounts.getAccount returns error', function (done) {
				var expectedError = 'Error: could not connect to server: Connection refused';
				accountsMock.getAccount.withArgs({username: accountFixtures.existingDelegate.delegateName}, sinon.match.any).yields(expectedError);

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal(expectedError);
					accountsMock.getAccount.verify();
					done();
				});
			});

			it('should call callback with error when username already exists', function (done) {
				accountsMock.getAccount.withArgs({username: accountFixtures.existingDelegate.delegateName}, sinon.match.any).yields(null, accountFixtures.existingDelegate);

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.equal('Username already exists');
					accountsMock.getAccount.verify();
					done();
				});
			});
		});

		describe('when transaction is valid', function () {

			it('should call accounts.getAccount with correct parameters', function (done) {
				accountsMock.getAccount.withArgs({username: accountFixtures.existingDelegate.delegateName}, sinon.match.any).yields(null, null);

				delegate.verify(transaction, sender, function (err) {
					expect(err).to.not.exist;
					accountsMock.getAccount.verify();
					done();
				});
			});

			it('should call callback with error = null and valid transaction when username contains symbols which are valid', function (done) {
				transaction.asset.delegate.username = randomUtil.username() + '!@.';
				accountsMock.getAccount.withArgs({username: transaction.asset.delegate.username}, sinon.match.any).yields(null, null);

				delegate.verify(transaction, sender, function (err, returnedTransaction) {
					expect(err).to.not.exist;
					expect(returnedTransaction).to.equal(returnedTransaction);
					done();
				});
			});

			it('should call callback with error = null and valid transaction', function (done) {
				accountsMock.getAccount.withArgs({username: accountFixtures.existingDelegate.delegateName}, sinon.match.any).yields(null, null);

				delegate.verify(transaction, sender, function (err, returnedTransaction) {
					expect(err).to.not.exist;
					expect(returnedTransaction).to.equal(transaction);
					accountsMock.getAccount.verify();
					done();
				});
			});
		});
	});

	describe('process', function () {

		it('should call the callback', function (done) {
			delegate.process(transaction, sender, done);
		});
	});

	describe('getBytes', function () {

		it('should return null when username is empty', function () {
			delete transaction.asset.delegate.username;

			expect(delegate.getBytes(transaction)).to.eql(null);
		});

		it('should return bytes for signature asset', function () {
			var delegateBytes = delegate.getBytes(transaction);
			expect(delegateBytes.toString()).to.equal(transaction.asset.delegate.username);
		});
	});

	describe('apply', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		it('should call accounts.setAccountAndGet module with correct parameters', function (done) {
			accountsMock.setAccountAndGet.once().withExactArgs({
				address: sender.address,
				u_isDelegate: 0,
				isDelegate: 1,
				vote: 0,
				u_username: null,
				username: transaction.asset.delegate.username
			}, dummyCb);

			delegate.apply(transaction, dummyBlock, sender, dummyCb);
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
			accountsMock.setAccountAndGet.once().withExactArgs({
				address: sender.address,
				u_isDelegate: 1,
				isDelegate: 0,
				vote: 0,
				username: null,
				u_username: transaction.asset.delegate.username
			}, dummyCb);

			delegate.undo(transaction, dummyBlock, sender, dummyCb);
			accountsMock.setAccountAndGet.verify();

			done();
		});

		it('should update username value to null if sender.nameexist is not true', function (done) {
			delete sender.username;
			sender.nameexist = 0;

			accountsMock.setAccountAndGet.once().withExactArgs({
				address: sender.address,
				u_isDelegate: 1,
				isDelegate: 0,
				vote: 0,
				username: null,
				u_username: transaction.asset.delegate.username
			}, dummyCb);

			delegate.undo(transaction, dummyBlock, sender, dummyCb);
			accountsMock.setAccountAndGet.verify();

			done();
		});
	});

	describe('applyUnconfirmed', function () {

		it('should call accounts.setAccountAndGet module with correct parameters', function (done) {
			delete sender.username;
			sender.nameexist = 0;

			accountsMock.setAccountAndGet.once().withExactArgs({
				address: sender.address,
				u_isDelegate: 1,
				isDelegate: 0,
				username: null,
				u_username: transaction.asset.delegate.username
			}, dummyCb);

			delegate.applyUnconfirmed(transaction, sender, dummyCb);
			accountsMock.setAccountAndGet.verify();

			done();
		});
	});

	describe('undoUnconfirmed', function () {

		it('should call accounts.setAccountAndGet module with correct parameters', function (done) {
			accountsMock.setAccountAndGet.once().withExactArgs({
				address: sender.address,
				u_isDelegate: 0,
				isDelegate: 0,
				username: null,
				u_username: null
			}, dummyCb);

			delegate.undoUnconfirmed(transaction, sender, dummyCb);
			accountsMock.setAccountAndGet.verify();

			done();
		});
	});

	describe('objectNormalize', function () {

		it('should use the correct format to validate against', function () {
			var library = Delegate.__get__('library');
			var schemaSpy = sinon.spy(library.schema, 'validate');
			delegate.objectNormalize(transaction);
			expect(schemaSpy.calledOnce).to.equal(true);
			expect(schemaSpy.calledWithExactly(transaction.asset.delegate, Delegate.prototype.schema)).to.equal(true);
			schemaSpy.restore();
		});

		describe('when library.schema.validate fails', function () {

			var schemaDynamicTest = new SchemaDynamicTest({
				testStyle: SchemaDynamicTest.TEST_STYLE.THROWABLE,
				customPropertyAssertion: function (input, expectedType, property, err) {
					expect(err).to.equal('Failed to validate delegate schema: Expected type ' + expectedType + ' but found type ' + input.expectation);
				}
			});

			after(function () {
				describe('schema dynamic tests: delegate', function () {

					schemaDynamicTest.schema.shouldFailAgainst.nonObject.property(delegate.objectNormalize, transaction, 'asset.delegate');

					describe('username', function () {

						schemaDynamicTest.schema.shouldFailAgainst.nonString.property(delegate.objectNormalize, transaction, 'asset.delegate.username');
					});
				});
			});

			it('should throw error', function () {
				transaction.asset.delegate.username = '*';

				expect(function () {
					delegate.objectNormalize(transaction);
				}).to.throw('Failed to validate delegate schema: Object didn\'t pass validation for format username: ');
			});
		});

		describe('when library.schema.validate succeeds', function () {

			it('should return transaction', function () {
				expect(delegate.objectNormalize(transaction)).to.eql(transaction);
			});
		});
	});

	describe('dbRead', function () {

		it('should return null when d_username is not set', function () {
			delete rawTransaction.d_username;

			expect(delegate.dbRead(rawTransaction)).to.eql(null);
		});

		it('should return delegate asset for raw transaction passed', function () {
			var expectedAsset = {
				address: rawValidTransaction.t_senderId,
				publicKey: rawValidTransaction.t_senderPublicKey,
				username: rawValidTransaction.d_username
			};

			expect(delegate.dbRead(rawTransaction).delegate).to.eql(expectedAsset);
		});
	});

	describe('dbSave', function () {

		it('should return promise object for delegate transaction', function () {
			expect(delegate.dbSave(transaction)).to.eql({
				table: 'delegates',
				fields: [
					'tx_id',
					'name',
					'pk',
					'address'
				],
				values: {
					tx_id: transaction.id,
					name: transaction.asset.delegate.username,
					pk: Buffer.from(transaction.senderPublicKey, 'hex'),
					address: transaction.senderId
				}
			});
		});
	});

	describe('ready', function () {

		it('should return true for single signature transasction', function () {
			expect(delegate.ready(transaction, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(delegate.ready(transaction, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with at least min signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete transaction.signature;
			// Not really correct signature, but we are not testing that over here
			transaction.signature = crypto.randomBytes(64).toString('hex');;
			transaction.signatures = [crypto.randomBytes(64).toString('hex')];

			expect(delegate.ready(transaction, sender)).to.equal(true);
		});
	});
});

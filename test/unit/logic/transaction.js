'use strict';/*eslint*/

var crypto = require('crypto');
var async = require('async');

var chai = require('chai');
var expect = require('chai').expect;
var _  = require('lodash');

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var bignum = require('../../../helpers/bignum.js');
var DBSandbox = require('../../common/globalBefore').DBSandbox;

var transactionTypes = require('../../../helpers/transactionTypes');
var slots = require('../../../helpers/slots');

var modulesLoader = require('../../common/modulesLoader');
var Transaction = require('../../../logic/transaction.js');

var Vote = require('../../../logic/vote.js');
var Transfer = require('../../../logic/transfer.js');
var Delegate = require('../../../logic/delegate.js');
var Signature = require('../../../logic/signature.js');
var Multisignature = require('../../../logic/multisignature.js');
var Dapp = require('../../../logic/dapp.js');
var InTransfer = require('../../../logic/inTransfer.js');
var OutTransfer = require('../../../logic/outTransfer.js');

var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var senderPassword = node.gAccount.password;
var senderHash = crypto.createHash('sha256').update(senderPassword, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var sender = {
	username: null,
	isDelegate: 0,
	secondSignature: 0,
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	secondPublicKey: null,
	balance: 9850458911801508,
	u_balance: 9850458911801508,
	vote: 0,
	multisignatures: null,
	multimin: 0,
	multilifetime: 0,
	blockId: '8505659485551877884',
	nameexist: 0,
	producedblocks: 0,
	missedblocks: 0,
	fees: 0,
	rewards: 0,
	virgin: 0
};

var transactionData = {
	type: 0,
	amount: 8067474861277,
	sender: sender,
	senderId: '16313739661670634666L',
	recipientId: '5649948960790668770L',
	fee: 10000000,
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	secret: senderPassword
};

var validTransaction = {
	id: '16140284222734558289',
	rowId: 133,
	blockId: '1462190441827192029',
	type: 0,
	timestamp: 33363661,
	senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	senderId: '16313739661670634666L',
	recipientId: '5649948960790668770L',
	amount: 8067474861277,
	fee: 10000000,
	signature: '7ff5f0ee2c4d4c83d6980a46efe31befca41f7aa8cda5f7b4c2850e4942d923af058561a6a3312005ddee566244346bdbccf004bc8e2c84e653f9825c20be008',
	signSignature: null,
	requesterPublicKey: null,
	signatures: null,
	asset: {},
};

var rawTransaction = {
	t_id: '16140284222734558289',
	b_height: 981,
	t_blockId: '1462190441827192029',
	t_type: 0,
	t_timestamp: 33363661,
	t_senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	m_recipientPublicKey: null,
	t_senderId: '16313739661670634666L',
	t_recipientId: '5649948960790668770L',
	t_amount: 8067474861277,
	t_fee: 10000000,
	t_signature: '7ff5f0ee2c4d4c83d6980a46efe31befca41f7aa8cda5f7b4c2850e4942d923af058561a6a3312005ddee566244346bdbccf004bc8e2c84e653f9825c20be008',
	tf_data: '123',
	confirmations: 8343
};

var genesisTransaction = {
	type: 0,
	amount: 10000000000000000,
	fee: 0,
	timestamp: 0,
	recipientId: '16313739661670634666L',
	senderId: '1085993630748340485L',
	senderPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
	signature: 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
	blockId: '9314232245035524467',
	id: '1465651642158264047'
};

var unconfirmedTransaction = {
	type: 0,
	amount: 8067474861277,
	senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	senderId: '16313739661670634666L',
	requesterPublicKey: null,
	timestamp: 33641482,
	asset: {},
	data: undefined,
	recipientId: '5649948960790668770L',
	signature: '24c65ac5562a8ae252aa308926b60342829e82f285e704814d0d3c3954078c946d113aa0bd5388b2c863874e63f71e8e0a284a03274e66c719e69d443d91f309',
	fee: 10000000,
	id: '16580139363949197645'
};

describe('transaction', function () {

	var transactionLogic;
	var accountModule;
	var db;
	var dbSandbox;

	before(function (done) {
		var transfer = new Transfer(modulesLoader.scope.logger, modulesLoader.scope.schema);
		dbSandbox = new DBSandbox(node.config.db, 'lisk_test_logic_transactions');
		dbSandbox.create(function (err, __db) {
			db = __db;
			node.initApplication(function (err, scope) {
				transactionLogic = scope.logic.transaction;
				accountModule = scope.modules.accounts;
				transfer.bind(accountModule);
				transactionLogic.attachAssetType(transactionTypes.SEND, transfer);
				done();
			}, {db: db});
		});
	});

	after(function (done) {
		dbSandbox.destroy();
		node.appCleanup(done);
	});

	describe('attachAssetType', function () {

		it('should attach all transaction types', function () {
			var appliedLogic;
			appliedLogic = transactionLogic.attachAssetType(transactionTypes.VOTE, new Vote());
			expect(appliedLogic).to.be.an.instanceof(Vote);
			appliedLogic = transactionLogic.attachAssetType(transactionTypes.SEND, new Transfer(modulesLoader.scope.logger, modulesLoader.scope.schema));
			expect(appliedLogic).to.be.an.instanceof(Transfer);
			appliedLogic = transactionLogic.attachAssetType(transactionTypes.DELEGATE, new Delegate());
			expect(appliedLogic).to.be.an.instanceof(Delegate);
			appliedLogic = transactionLogic.attachAssetType(transactionTypes.SIGNATURE, new Signature());
			expect(appliedLogic).to.be.an.instanceof(Signature);
			appliedLogic = transactionLogic.attachAssetType(transactionTypes.MULTI, new Multisignature());
			expect(appliedLogic).to.be.an.instanceof(Multisignature);
			appliedLogic = transactionLogic.attachAssetType(transactionTypes.DAPP, new Dapp());
			expect(appliedLogic).to.be.an.instanceof(Dapp);
			appliedLogic = transactionLogic.attachAssetType(transactionTypes.IN_TRANSFER, new InTransfer());
			expect(appliedLogic).to.be.an.instanceof(InTransfer);
			appliedLogic = transactionLogic.attachAssetType(transactionTypes.OUT_TRANSFER, new OutTransfer());
			expect(appliedLogic).to.be.an.instanceof(OutTransfer);
			return transactionLogic;
		});

		it('should throw an error on invalid asset', function () {
			expect(function () {
				var invalidAsset = {};
				transactionLogic.attachAssetType(-1, invalidAsset);
			}).to.throw('Invalid instance interface');
		});

		it('should throw an error with no param', function () {
			expect(transactionLogic.attachAssetType).to.throw();
		});
	});

	describe('sign', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.sign).to.throw();
		});

		it('should sign transaction', function () {
			expect(transactionLogic.sign(senderKeypair, validTransaction)).to.be.a('string').which.is.equal('8f9c4242dc562599f95f5481469d22567987536112663156761e4b2b3f1142c4f5355a2a7c7b254f40d370bef7e76b4a11c8a1836e0c9b0bcab3e834ca1e7502');
		});

		it('should update signature when data is changed', function () {
			var originalSignature = validTransaction.signature;
			var transaction = _.cloneDeep(validTransaction);
			transaction.data = '123';

			expect(transactionLogic.sign(senderKeypair, transaction)).to.be.a('string').which.is.not.equal(originalSignature);
		});
	});

	describe('multisign', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.multisign).to.throw();
		});

		it('should multisign the transaction', function () {
			expect(transactionLogic.multisign(senderKeypair, validTransaction)).to.equal(validTransaction.signature);
		});
	});

	describe('getId', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.getId).to.throw();
		});

		it('should generate the id of the transaction', function () {
			expect(transactionLogic.getId(validTransaction)).to.be.a('string').which.is.equal(validTransaction.id);
		});

		it('should update id if a field in transaction value changes', function () {
			var id = validTransaction.id;
			var transaction = _.cloneDeep(validTransaction);
			transaction.amount = 4000;

			expect(transactionLogic.getId(transaction)).to.not.equal(id);
		});
	});

	describe('getHash', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.getHash).to.throw();
		});

		it('should return hash for transaction', function () {
			var transaction = validTransaction;
			var expectedHash = '5164ef55fccefddf72360ea6e05f19eed7c8d2653c5069df4db899c47246dd2f';

			expect(transactionLogic.getHash(transaction).toString('hex')).to.be.a('string').which.is.equal(expectedHash);
		});

		it('should update hash if a field is transaction value changes', function () {
			var originalTransactionHash = '5164ef55fccefddf72360ea6e05f19eed7c8d2653c5069df4db899c47246dd2f';
			var transaction = _.cloneDeep(validTransaction);
			transaction.amount = 4000;

			expect(transactionLogic.getHash(transaction).toString('hex')).to.not.equal(originalTransactionHash);
		});
	});

	describe('getBytes', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.getBytes).to.throw();
		});

		it('should return same result when called multiple times (without data field)', function () {
			var firstCalculation = transactionLogic.getBytes(validTransaction);
			var secondCalculation = transactionLogic.getBytes(validTransaction);

			expect(firstCalculation.equals(secondCalculation)).to.be.ok;
		});

		it('should return same result of getBytes using /logic/transaction and lisk-js package (without data field)', function () {
			var transactionBytesFromLogic = transactionLogic.getBytes(validTransaction);
			var transactionBytesFromLiskJs = node.lisk.crypto.getBytes(validTransaction);

			expect(transactionBytesFromLogic.equals(transactionBytesFromLiskJs)).to.be.ok;
		});

		it('should skip signature, second signature for getting bytes', function () {
			var transactionBytes = transactionLogic.getBytes(validTransaction, true);

			expect(transactionBytes.length).to.equal(53);
		});
	});

	describe('ready', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.ready).to.throw();
		});

		it('should throw error when transaction type is invalid', function () {
			var transaction = _.cloneDeep(validTransaction);
			var invalidTransactionType = -1;
			transaction.type = invalidTransactionType;

			expect(function () {
				transactionLogic.ready(transaction, sender);
			}).to.throw('Unknown transaction type ' + invalidTransactionType);
		});

		it('should return false when sender not provided', function () {
			expect(transactionLogic.ready(validTransaction)).to.equal(false);
		});

		it('should return true for valid transaction and sender', function () {
			expect(transactionLogic.ready(validTransaction, sender)).to.equal(true);
		});
	});

	describe('countById', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.countById).to.throw();
		});

		it('should return count of transaction in db with transaction id', function (done) {
			transactionLogic.countById(validTransaction, function (err, count) {
				expect(err).to.not.exist;
				expect(count).to.equal(0);
				done();
			});
		});

		it('should return 1 for transaction from genesis block', function (done) {
			transactionLogic.countById(genesisTransaction, function (err, count) {
				expect(err).to.not.exist;
				expect(count).to.equal(1);
				done();
			});
		});
	});

	describe('checkConfirmed', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.checkConfirmed).to.throw();
		});

		it('should not return error when transaction is not confirmed', function (done) {
			var transaction = node.lisk.transaction.createTransaction(transactionData.recipientId, transactionData.amount, transactionData.secret);

			transactionLogic.checkConfirmed(transaction, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it('should return error for transaction which is already confirmed', function (done) {
			var dummyConfirmedTransaction = {
				id: '1465651642158264047'
			};

			transactionLogic.checkConfirmed(dummyConfirmedTransaction, function (err) {
				expect(err).to.include('Transaction is already confirmed');
				done();
			});
		});
	});

	describe('checkBalance', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.checkBalance).to.throw();
		});

		it('should return error when sender has insufficiant balance', function () {
			var amount =  '9850458911801509';
			var balanceKey = 'balance';
			var res = transactionLogic.checkBalance(amount, balanceKey, validTransaction, sender);

			expect(res.exceeded).to.equal(true);
			expect(res.error).to.include('Account does not have enough LSK:');
		});

		it('should be okay if insufficient balance from genesis account', function () {
			var amount =  '999823366072900';
			var balanceKey = 'balance';
			var res = transactionLogic.checkBalance(amount, balanceKey, genesisTransaction, sender);

			expect(res.exceeded).to.equal(false);
			expect(res.error).to.not.exist;
		});

		it('should be okay if sender has sufficient balance', function () {
			var balanceKey = 'balance';
			var res = transactionLogic.checkBalance(validTransaction.amount, balanceKey, validTransaction, sender);

			expect(res.exceeded).to.equal(false);
			expect(res.error).to.not.exist;
		});
	});

	describe('process', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.process).to.throw();
		});

		it('should return error sender is not supplied', function (done) {
			transactionLogic.process(validTransaction, null, function (err, res) {
				expect(err).to.equal('Missing sender');
				done();
			});
		});

		it('should return error if generated id is different from id supplied of transaction', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			transaction.id = 'invalid transaction id';

			transactionLogic.process(transaction, sender, function (err, res) {
				expect(err).to.equal('Invalid transaction id');
				done();
			});
		});

		it('should return error when failed to generate id', function (done) {
			var transaction = {
				type: 0
			};

			transactionLogic.process(transaction, sender, function (err, res) {
				expect(err).to.equal('Failed to get transaction id');
				done();
			});
		});

		it('should process the transaction', function (done) {
			transactionLogic.process(validTransaction, sender, function (err, res) {
				expect(err).to.not.be.ok;
				expect(res).to.be.an('object');
				expect(res.senderId).to.be.a('string').which.is.equal(sender.address);
				done();
			});
		});
	});

	describe('verify', function () {

		function createAndProcess (transactionData, sender, cb) {
			var transaction = node.lisk.transaction.createTransaction(transactionData.recipientId, transactionData.amount, transactionData.secret, transactionData.secondSecret);

			transactionLogic.process(transaction, sender, function (err, transaction) {
				cb(err, transaction);
			});
		}

		it('should return error when sender is missing', function (done) {
			transactionLogic.verify(validTransaction, null, {}, function (err) {
				expect(err).to.equal('Missing sender');
				done();
			});
		});

		it('should return error with invalid transaction type', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			transaction.type = -1;

			transactionLogic.verify(transaction, sender, {}, function (err) {
				expect(err).to.include('Unknown transaction type');
				done();
			});
		});

		it('should return error when missing sender second signature', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			var vs = _.cloneDeep(sender);
			vs.secondSignature = '839eba0f811554b9f935e39a68b3078f90bea22c5424d3ad16630f027a48362f78349ddc3948360045d6460404f5bc8e25b662d4fd09e60c89453776962df40d';

			transactionLogic.verify(transaction, vs, {}, function (err) {
				expect(err).to.include('Missing sender second signature');
				done();
			});
		});

		it('should return error when sender does not have a second signature', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			transaction.signSignature = [transactionLogic.sign(validKeypair, transaction)];

			transactionLogic.verify(transaction, sender, {}, function (err) {
				expect(err).to.include('Sender does not have a second signature');
				done();
			});
		});

		it('should return error when requester does not have a second signature', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			var dummyRequester = {
				secondSignature : 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f'
			};
			transaction.requesterPublicKey = '839eba0f811554b9f935e39a68b3078f90bea22c5424d3ad16630f027a48362f78349ddc3948360045d6460404f5bc8e25b662d4fd09e60c89453776962df40d';

			transactionLogic.verify(transaction, sender, dummyRequester, function (err) {
				expect(err).to.include('Missing requester second signature');
				done();
			});
		});

		it('should return error when transaction sender publicKey and sender public key are different', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			var invalidPublicKey =  '01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746';
			transaction.senderPublicKey = invalidPublicKey;

			transactionLogic.verify(transaction, sender, {}, function (err) {
				expect(err).to.include(['Invalid sender public key:', invalidPublicKey, 'expected:', sender.publicKey].join(' '));
				done();
			});
		});

		it('should be impossible to send the money from genesis account', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			//genesis account info
			transaction.senderPublicKey = 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			var vs = _.cloneDeep(sender);
			vs.publicKey = 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';

			transactionLogic.verify(transaction, vs, {}, function (err) {
				expect(err).to.include('Invalid sender. Can not send from genesis account');
				done();
			});
		});

		it('should return error on different sender address in transaction and sender', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			transaction.senderId = '2581762640681118072L';

			transactionLogic.verify(transaction, sender, {}, function (err) {
				expect(err).to.include('Invalid sender address');
				done();
			});
		});

		it('should return error when Account does not belong to multisignature group', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			var vs = _.cloneDeep(sender);
			// Different publicKey for multisignature account
			vs.multisignatures = [node.eAccount.publicKey];
			transaction.requesterPublicKey = validKeypair.publicKey.toString('hex');
			delete transaction.signature;
			transaction.signature = transactionLogic.sign(validKeypair, transaction);

			transactionLogic.verify(transaction, vs, {}, function (err) {
				expect(err).to.equal('Account does not belong to multisignature group');
				done();
			});
		});

		it('should return error when signature is not correct', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			// valid keypair is a different account
			transaction.signature = transactionLogic.sign(validKeypair, transaction);

			transactionLogic.verify(transaction, sender, {}, function (err) {
				expect(err).to.equal('Failed to verify signature');
				done();
			});
		});

		it('should return error when duplicate signature in transaction', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			var vs = _.cloneDeep(sender);
			vs.multisignatures = [validKeypair.publicKey.toString('hex')];
			delete transaction.signature;
			transaction.signatures = Array.apply(null, Array(2)).map(function () { return transactionLogic.sign(validKeypair, transaction); });
			transaction.signature = transactionLogic.sign(senderKeypair, transaction);
			transactionLogic.verify(transaction, vs, {}, function (err) {
				expect(err).to.equal('Encountered duplicate signature in transaction');
				done();
			});
		});

		it('should return error when failed to verify multisignature', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			var vs = _.cloneDeep(sender);
			vs.multisignatures = [validKeypair.publicKey.toString('hex')];
			transaction.requesterPublicKey = validKeypair.publicKey.toString('hex');
			delete transaction.signature;
			// using validKeypair as opposed to senderKeypair
			transaction.signatures = [transactionLogic.sign(validKeypair, transaction)];
			transaction.signature = transactionLogic.sign(validKeypair, transaction);

			transactionLogic.verify(transaction, vs, {}, function (err) {
				expect(err).to.equal('Failed to verify multisignature');
				done();
			});
		});

		it('should be okay with valid multisignature', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			var vs = _.cloneDeep(sender);
			vs.multisignatures = [validKeypair.publicKey.toString('hex')];
			delete transaction.signature;
			transaction.signature = transactionLogic.sign(senderKeypair, transaction);
			transaction.signatures = [transactionLogic.multisign(validKeypair, transaction)];

			transactionLogic.verify(transaction, vs, {}, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it('should return error when second signature is invalid', function (done) {
			var vs = _.cloneDeep(sender);
			vs.secondPublicKey = validKeypair.publicKey.toString('hex');
			vs.secondSignature = 1;

			var transactionDataClone = _.cloneDeep(transactionData);
			transactionDataClone.secret = senderPassword;
			transactionDataClone.secondSecret = validPassword;

			createAndProcess(transactionDataClone, vs, function (err, transaction) {
				transaction.signSignature = '7af5f0ee2c4d4c83d6980a46efe31befca41f7aa8cda5f7b4c2850e4942d923af058561a6a3312005ddee566244346bdbccf004bc8e2c84e653f9825c20be008';
				transactionLogic.verify(transaction, vs, function (err) {
					expect(err).to.equal('Failed to verify second signature');
					done();
				});
			});
		});

		it('should be okay for valid second signature', function (done) {
			var vs = _.cloneDeep(sender);
			vs.secondPublicKey = validKeypair.publicKey.toString('hex');
			vs.secondSignature = 1;

			var transactionDataClone = _.cloneDeep(transactionData);
			transactionDataClone.secret = senderPassword;
			transactionDataClone.secondSecret = validPassword;

			createAndProcess(transactionDataClone, vs, function (err, transaction) {
				transactionLogic.verify(transaction, vs, {}, function (err) {
					expect(err).to.not.exist;
					done();
				});
			});
		});

		it('should throw return error transaction fee is incorrect', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			transaction.fee = -100;

			transactionLogic.verify(transaction, sender, {}, function (err) {
				expect(err).to.include('Invalid transaction fee');
				done();
			});
		});

		it('should verify transaction with correct fee (with data field)', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {data: '123'};
			transaction.fee += 10000000;
			delete transaction.signature;
			transaction.signature = transactionLogic.sign(senderKeypair, transaction);

			transactionLogic.verify(transaction, sender, {}, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it('should verify transaction with correct fee (without data field)', function (done) {
			transactionLogic.verify(validTransaction, sender, {}, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it('should return error when transaction amount is invalid', function (done) {
			var transactionDataClone = _.cloneDeep(transactionData);
			transactionDataClone.amount = node.constants.totalAmount + 10;

			createAndProcess(transactionDataClone, sender, function (err, transaction) {
				transactionLogic.verify(transaction, sender, {}, function (err) {
					expect(err).to.include('Invalid transaction amount');
					done();
				});
			});
		});

		it('should return error when account balance is less than transaction amount', function (done) {
			var transactionDataClone = _.cloneDeep(transactionData);
			transactionDataClone.amount = node.constants.totalAmount;

			createAndProcess(transactionDataClone, sender, function (err, transaction) {
				transactionLogic.verify(transaction, sender, {}, function (err) {
					expect(err).to.include('Account does not have enough LSK:');
					done();
				});
			});
		});

		it('should return error on future timestamp', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			transaction.timestamp = slots.getTime() + 100;
			delete transaction.signature;

			transaction.signature = transactionLogic.sign(senderKeypair, transaction);

			transactionLogic.verify(transaction, sender, {}, function (err) {
				expect(err).to.include('Invalid transaction timestamp');
				done();
			});
		});

		it('should verify proper transaction with proper sender', function (done) {
			transactionLogic.verify(validTransaction, sender, {}, function (err) {
				expect(err).to.not.be.ok;
				done();
			});
		});

		it('should throw an error with no param', function () {
			expect(transactionLogic.verify).to.throw();
		});
	});

	describe('verifySignature', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.verifySignature).to.throw();
		});

		it('should return false if transaction is changed', function () {
			var transaction = _.cloneDeep(validTransaction);
			// change transaction value
			transaction.amount = 1001;

			expect(transactionLogic.verifySignature(transaction, sender.publicKey, transaction.signature)).to.equal(false);
		});

		it('should return false if signature not provided', function () {
			expect(transactionLogic.verifySignature(validTransaction, sender.publicKey, null)).to.equal(false);
		});

		it('should return valid signature for correct transaction', function () {
			expect(transactionLogic.verifySignature(validTransaction, sender.publicKey, validTransaction.signature)).to.equal(true);
		});

		it('should throw if public key is invalid', function () {
			var transaction = _.cloneDeep(validTransaction);
			var invalidPublicKey = '123123123';

			expect(function () {
				transactionLogic.verifySignature(transaction, invalidPublicKey, transaction.signature);
			}).to.throw();
		});
	});

	describe('verifySecondSignature', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.verifySecondSignature).to.throw();
		});

		it('should verify the second signature correctly', function () {
			var signature = transactionLogic.sign(validKeypair, validTransaction);

			expect(transactionLogic.verifySecondSignature(validTransaction, validKeypair.publicKey.toString('hex'), signature)).to.equal(true);
		});
	});

	describe('verifyBytes', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.verifyBytes).to.throw();
		});

		it('should return when sender public is different', function () {
			var transactionBytes = transactionLogic.getBytes(validTransaction);
			var invalidPublicKey = 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9';

			expect(transactionLogic.verifyBytes(transactionBytes, invalidPublicKey, validTransaction.signature)).to.equal(false);
		});

		it('should throw when publickey is not in the right format', function () {
			var transactionBytes = transactionLogic.getBytes(validTransaction);
			var invalidPublicKey = 'iddb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9';

			expect(function () {
				transactionLogic.verifyBytes(transactionBytes, invalidPublicKey, validTransaction.signature);
			}).to.throw();
		});

		it('should be okay for valid bytes', function () {
			var transactionBytes = transactionLogic.getBytes(validTransaction, true, true);
			var res = transactionLogic.verifyBytes(transactionBytes, validTransaction.senderPublicKey, validTransaction.signature);

			expect(res).to.equal(true);
		});
	});

	describe('apply', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		function undoTransaction (transaction, sender, done) {
			transactionLogic.undo(transaction, dummyBlock, sender, done);
		}

		it('should throw an error with no param', function () {
			expect(function () { transactionLogic.apply(); }).to.throw();
		});

		it('should be okay with valid params', function (done) {
			transactionLogic.apply(unconfirmedTransaction, dummyBlock, sender, done);
		});

		it('should return error on if balance is low', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			transaction.amount = '9850458911801908';

			transactionLogic.apply(transaction, dummyBlock, sender, function (err) {
				expect(err).to.include('Account does not have enough ');
				done();
			});
		});

		it('should subtract balance from sender account on valid transaction', function (done) {
			accountModule.getAccount({publicKey: validTransaction.senderPublicKey}, function (err, accountBefore) {
				var amount = new bignum(validTransaction.amount.toString()).plus(validTransaction.fee.toString());
				var balanceBefore = new bignum(accountBefore.balance.toString());

				transactionLogic.apply(validTransaction, dummyBlock, sender, function (err) {
					accountModule.getAccount({publicKey: validTransaction.senderPublicKey}, function (err, accountAfter) {
						expect(err).to.not.exist;
						var balanceAfter = new bignum(accountAfter.balance.toString());

						expect(err).to.not.exist;
						expect(balanceAfter.plus(amount).toString()).to.equal(balanceBefore.toString());
						undoTransaction(validTransaction, sender, done);
					});
				});
			});
		});
	});

	describe('undo', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		function applyTransaction (transaction, sender, done) {
			transactionLogic.apply(transaction, dummyBlock, sender, done);
		}

		it('should throw an error with no param', function () {
			expect(transactionLogic.undo).to.throw();
		});

		it('should not update sender balance when transaction is invalid', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			var amount = new bignum(transaction.amount.toString()).plus(transaction.fee.toString());
			delete transaction.recipientId;

			accountModule.getAccount({publicKey: transaction.senderPublicKey}, function (err, accountBefore) {
				var balanceBefore = new bignum(accountBefore.balance.toString());

				transactionLogic.undo(transaction, dummyBlock, sender, function (err) {
					accountModule.getAccount({publicKey: transaction.senderPublicKey}, function (err, accountAfter) {
						var balanceAfter = new bignum(accountAfter.balance.toString());

						expect(balanceBefore.plus(amount.mul(2)).toString()).to.not.equal(balanceAfter.toString());
						expect(balanceBefore.toString()).to.equal(balanceAfter.toString());
						done();
					});
				});
			});
		});

		it('should be okay with valid params', function (done) {
			var transaction = validTransaction;
			var amount = new bignum(transaction.amount.toString()).plus(transaction.fee.toString());

			accountModule.getAccount({publicKey: transaction.senderPublicKey}, function (err, accountBefore) {
				var balanceBefore = new bignum(accountBefore.balance.toString());

				transactionLogic.undo(transaction, dummyBlock, sender, function (err) {
					accountModule.getAccount({publicKey: transaction.senderPublicKey}, function (err, accountAfter) {
						var balanceAfter = new bignum(accountAfter.balance.toString());

						expect(err).to.not.exist;
						expect(balanceBefore.plus(amount).toString()).to.equal(balanceAfter.toString());
						applyTransaction(transaction, sender, done);
					});
				});
			});
		});
	});

	describe('applyUnconfirmed', function () {

		function undoUnconfirmedTransaction (transaction, sender, done) {
			transactionLogic.undoUnconfirmed(transaction, sender, done);
		}

		it('should throw an error with no param', function () {
			expect(function () { transactionLogic.applyUnconfirmed(); }).to.throw();
		});

		it('should be okay with valid params', function (done) {
			var transaction = validTransaction;
			transactionLogic.applyUnconfirmed(transaction, sender, done);
		});

		it('should return error on if balance is low', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			transaction.amount = '9850458911801908';

			transactionLogic.applyUnconfirmed(transaction, sender, function (err) {
				expect(err).to.include('Account does not have enough ');
				done();
			});
		});

		it('should okay for valid params', function (done) {
			transactionLogic.applyUnconfirmed(validTransaction, sender, function (err) {
				expect(err).to.not.exist;
				undoUnconfirmedTransaction(validTransaction, sender, done);
			});
		});
	});

	describe('undoUnconfirmed', function () {

		function applyUnconfirmedTransaction (transaction, sender, done) {
			transactionLogic.applyUnconfirmed(transaction, sender, done);
		}

		it('should throw an error with no param', function () {
			expect(transactionLogic.undoUnconfirmed).to.throw();
		});

		it('should be okay with valid params', function (done) {
			transactionLogic.undoUnconfirmed(validTransaction, sender, function (err) {
				expect(err).to.not.exist;
				applyUnconfirmedTransaction(validTransaction, sender, done);
			});
		});
	});

	describe('dbSave', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.dbSave).to.throw();
		});

		it('should throw an error when type is not specified', function () {
			var transaction = _.cloneDeep(validTransaction);
			delete transaction.type;

			expect(function () {
				transactionLogic.dbSave(transaction);
			}).to.throw();
		});

		it('should create comma separated transaction signatures', function () {
			var transaction = _.cloneDeep(validTransaction);
			var vs = _.cloneDeep(sender);
			vs.multisignatures = [validKeypair.publicKey.toString('hex')];

			delete transaction.signature;
			transaction.signature = transactionLogic.sign(senderKeypair, transaction);
			transaction.signatures = [transactionLogic.multisign(validKeypair, transaction)];

			var savePromise = transactionLogic.dbSave(transaction);
			var transactionValues = savePromise[0].values;

			expect(savePromise).to.be.an('Array');
			expect(savePromise).to.have.length(1);
			expect(savePromise).to.be.an('Array');
			expect(transactionValues).to.have.property('signatures').which.is.equal(transaction.signatures.join(','));
		});

		it('should return response for valid parameters with data field', function () {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {data : '123'};
			var savePromise = transactionLogic.dbSave(transaction);

			expect(savePromise).to.be.an('Array');
			expect(savePromise).to.have.length(2);
			expect(savePromise[1].values).to.have.property('data').to.eql(new Buffer('123'));
		});

		it('should return promise object for valid parameters', function () {
			var savePromise = transactionLogic.dbSave(validTransaction);
			var keys = [
				'table',
				'fields',
				'values'
			];
			var valuesKeys = [
				'id',
				'blockId',
				'type',
				'timestamp',
				'senderPublicKey',
				'requesterPublicKey',
				'senderId',
				'recipientId',
				'amount',
				'fee',
				'signature',
				'signSignature',
				'signatures'
			];

			expect(savePromise).to.be.an('Array');
			expect(savePromise).to.have.length(1);
			expect(savePromise[0]).to.have.keys(keys);
			expect(savePromise[0].values).to.have.keys(valuesKeys);
		});
	});

	describe('afterSave', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.afterSave).to.throw();
		});

		it('should invoke the passed callback', function (done) {
			transactionLogic.afterSave(validTransaction, done);
		});
	});

	describe('objectNormalize', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.objectNormalize).to.throw();
		});

		it('should remove keys with null or undefined attribute', function () {
			var transaction = _.cloneDeep(validTransaction);
			transaction.amount = null;

			expect(_.keys(transactionLogic.objectNormalize(transaction))).to.not.include('amount');
		});

		it('should not remove any keys with valid entries', function () {
			expect(_.keys(transactionLogic.objectNormalize(validTransaction))).to.have.length(11);
		});

		it('should not remove data field after normalization', function () {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset= {
				data: '123'
			};
			var normalizedTransaction = transactionLogic.objectNormalize(transaction);

			expect(normalizedTransaction).to.have.property('asset').which.is.eql(transaction.asset);
		});

		it('should throw error for invalid schema types', function () {
			var transaction = _.cloneDeep(validTransaction);
			transaction.amount = 'Invalid value';
			transaction.data = 124;

			expect(function () {
				transactionLogic.objectNormalize(transaction);
			}).to.throw();
		});
	});

	describe('dbRead', function () {

		it('should throw an error with no param', function () {
			expect(transactionLogic.dbRead).to.throw();
		});

		it('should return transaction object with data field', function () {
			var rawTransactionClone = _.cloneDeep(rawTransaction);
			var transactionFromDb = transactionLogic.dbRead(rawTransactionClone);

			expect(transactionFromDb).to.be.an('object');
			expect(transactionFromDb.asset).to.have.property('data');
		});

		it('should return null if id field is not present', function () {
			var rawTransactionClone = _.cloneDeep(rawTransaction);
			delete rawTransactionClone.t_id;

			var transaction = transactionLogic.dbRead(rawTransactionClone);

			expect(transaction).to.be.a('null');
		});

		it('should return transaction object with correct fields', function () {
			var transaction = transactionLogic.dbRead(rawTransaction);
			var expectedKeys = [
				'id',
				'height',
				'blockId',
				'type',
				'timestamp',
				'senderPublicKey',
				'requesterPublicKey',
				'senderId',
				'recipientId',
				'recipientPublicKey',
				'amount',
				'fee',
				'signature',
				'signSignature',
				'signatures',
				'confirmations',
				'asset'
			];

			expect(transaction).to.be.an('object');
			expect(transaction).to.have.keys(expectedKeys);
			expect(transaction.asset).to.have.property('data').which.is.equal(rawTransaction.tf_data);
		});
	});
});

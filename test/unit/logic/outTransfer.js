'use strict';/*eslint*/

var crypto = require('crypto');
var _  = require('lodash');

var expect = require('chai').expect;
var rewire = require('rewire');
var sinon   = require('sinon');

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var slots = require('../../../helpers/slots.js');
var modulesLoader = require('../../common/initModule').modulesLoader;

var OutTransfer = rewire('../../../logic/outTransfer.js');
var sql = require('../../../sql/dapps.js');

var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var validSender = {
	password: '1vi3igdedurk9ctbj4i',
	secondPassword: 'lpdrphar6g5fcac3di',
	username: 'p1obslna292ypj',
	publicKey: '8d556dca10bb8294895df5477117ca2ceaae7795e7ffc4f7c7d51398a65e4911',
	address: '12566082625150495618L',
	secondPublicKey: '32f8c9b4b674c027de01fa685596bdc4ed07caabf6ecac3a8273be6fc4cbe842'
};

var senderHash = crypto.createHash('sha256').update(validSender.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var validTransaction =  {
	id: '12010334009048463571',
	height: 382,
	blockId: '7608840392099654665',
	type: 7,
	timestamp: 41287231,
	senderPublicKey: '8d556dca10bb8294895df5477117ca2ceaae7795e7ffc4f7c7d51398a65e4911',
	requesterPublicKey: undefined,
	senderId: '12566082625150495618L',
	recipientId: '477547807936790449L',
	recipientPublicKey: null,
	amount: 100,
	fee: 10000000,
	signature: '126de9603da232b0ada5158c43640849a62736351be1f39cd98606f6d81bedff895183f12c517c96dcc71368af111e7ddde04f62c54ecd1ea47d557af69f330d',
	signSignature: undefined,
	signatures: [],
	confirmations: 12,
	asset: {
		outTransfer: {
			dappId: '4163713078266524209',
			transactionId: '14144353162277138821' 
		}
	}
};

var rawValidTransaction = {
	t_id: '12010334009048463571',
	b_height: 382,
	t_blockId: '7608840392099654665',
	t_type: 7,
	t_timestamp: 41287231,
	t_senderPublicKey: '8d556dca10bb8294895df5477117ca2ceaae7795e7ffc4f7c7d51398a65e4911',
	m_recipientPublicKey: null,
	t_senderId: '12566082625150495618L',
	t_recipientId: '477547807936790449L',
	t_amount: '100',
	t_fee: '10000000',
	t_signature: '126de9603da232b0ada5158c43640849a62736351be1f39cd98606f6d81bedff895183f12c517c96dcc71368af111e7ddde04f62c54ecd1ea47d557af69f330d',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 12,
	ot_dappId: '4163713078266524209',
	ot_outTransactionId: '14144353162277138821'
};

describe('outTransfer', function () {

	var outTransfer;
	var dbStub;
	var sharedStub;
	var accountsStub;

	var trs;
	var rawTrs; 
	var sender;

	before(function () {
		dbStub = {
			query: sinon.stub(),
			one: sinon.stub()
		};

		sharedStub = {
			getGenesis: sinon.stub()
		};

		accountsStub = {
			mergeAccountAndGet: sinon.stub(),
			setAccountAndGet: sinon.stub()
		};
		outTransfer = new OutTransfer(dbStub, modulesLoader.scope.schema, modulesLoader.logger);
		outTransfer.bind(accountsStub);
	});

	beforeEach(function () {
		dbStub.one.reset();
		dbStub.query.reset();
		accountsStub.mergeAccountAndGet.reset();
		accountsStub.setAccountAndGet.reset();
		OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
	});

	beforeEach(function () {
		trs = _.cloneDeep(validTransaction);
		rawTrs = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
	});

	describe('constructor', function () {

		it('should be attach schema and logger to library variable', function () {
			new OutTransfer(dbStub, modulesLoader.scope.schema, modulesLoader.logger);
			var library = OutTransfer.__get__('library');

			expect(library).to.eql({
				db: dbStub,
				schema: modulesLoader.scope.schema,
				logger: modulesLoader.logger
			});
		});
	});

	describe('bind', function () {

		it('should be okay with empty params', function () {
			outTransfer.bind();
		});

		it('should bind dependent module mocks', function () {
			outTransfer.bind(accountsStub);
			var privateModules = OutTransfer.__get__('modules');
			expect(privateModules).to.eql({
				accounts: accountsStub
			});
		});
	});

	describe('calculateFee', function () {

		it('should return the correct fee for second signature transaction', function () {
			expect(outTransfer.calculateFee(trs)).to.equal(node.constants.fees.send);
		});
	});

	describe('verify', function () {

		it('should return error if receipient does not exists', function (done) {
			trs.recipientId = '';

			outTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid recipient');
				done();
			});
		});

		it('should return error if amount is undefined', function (done) {
			trs.amount = undefined;

			outTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction amount');
				done();
			});
		});

		it('should return error if amount is equal to 0', function (done) {
			trs.amount = 0;

			outTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction amount');
				done();
			});
		});

		it('should return error if asset is undefined', function (done) {
			trs.asset = undefined;

			outTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction asset');
				done();
			});
		});

		it('should return error if outtransfer property is undefined', function (done) {
			trs.asset.outTransfer = undefined;

			outTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction asset');
				done();
			});
		});

		it('should return error if dapp id is a hex string', function (done) {
			trs.asset.outTransfer.dappId = 'ab1231';

			outTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid outTransfer dappId');
				done();
			});
		});

		it('should return error if dapp transaction id is a hex string', function (done) {
			trs.asset.outTransfer.transactionId = 'ab1231';

			outTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid outTransfer transactionId');
				done();
			});
		});
	});

	describe('process', function () {

		beforeEach(function () {
			OutTransfer.__set__('__private.unconfirmedOutTansfers', {});
		});

		it('should call the callback', function (done) {
			outTransfer.process(trs, sender, done);
		});

		it('should return error if database (mocked) does not return dapp against dappId', function (done) {
			dbStub.one.withArgs(sql.countByTransactionId, {
				id: trs.asset.outTransfer.dappId
			}).resolves({
				count: 0
			});

			outTransfer.process(trs, validSender, function (err) {
				expect(err).to.equal('Application not found: ' + trs.asset.outTransfer.dappId);
				expect(dbStub.one.calledOnce).to.equal(true);
				done();
			});
		});

		it('should return error if database (mocked) rejects promise on finding dappId', function (done) {
			var error = 'Database error'; 
			dbStub.one.withArgs(sql.countByTransactionId, {
				id: trs.asset.outTransfer.dappId
			}).reject(error);

			outTransfer.process(trs, validSender, function (err) {
				expect(err).to.equal(error);
				expect(dbStub.one.calledOnce).to.equal(true);
				done();
			});
		});

		it('should return error if database (mocked) does not return dapp against dappId', function (done) {
			dbStub.one.withArgs(sql.countByTransactionId, {
				id: trs.asset.outTransfer.dappId
			}).resolves({
				count: 0
			});

			outTransfer.process(trs, validSender, function (err) {
				expect(dbStub.one.calledOnce).to.equal(true);
				expect(err).to.equal('Application not found: ' + trs.asset.outTransfer.dappId);
				done();
			});
		});

		it('should return error if it is already processed (unconfirmed)', function (done) {
			dbStub.one.onCall(0).resolves({
				count: 1
			});

			OutTransfer.__set__('__private.unconfirmedOutTansfers', {
				[trs.asset.outTransfer.transactionId]: true
			});

			outTransfer.process(trs, validSender, function (err) {
				expect(dbStub.one.calledOnce).to.equal(true);
				expect(err).to.equal('Transaction is already processed: ' + trs.asset.outTransfer.transactionId);
				done();
			});
		});

		it('should return error if it is already applied (unconfirmed)', function (done) {
			dbStub.one.onCall(0).resolves({
				count: 1
			});

			dbStub.one.withArgs(sql.countByOutTransactionId, {
				transactionId: trs.asset.outTransfer.transactionId
			}).resolves({
				count: 1
			});

			outTransfer.process(trs, validSender, function (err) {
				expect(dbStub.one.calledTwice).to.equal(true);
				expect(err).to.equal('Transaction is already confirmed: ' + trs.asset.outTransfer.transactionId);
				done();
			});
		});

		it('should return if database (mocked) rejects promise on finding transactionId', function (done) {
			var error = 'Database error';
			dbStub.one.onCall(0).resolves({
				count: 1
			});

			dbStub.one.withArgs(sql.countByOutTransactionId, {
				transactionId: trs.asset.outTransfer.transactionId
			}).rejects(error);

			outTransfer.process(trs, validSender, function (err) {
				expect(dbStub.one.calledTwice).to.equal(true);
				expect(err).to.equal(error);
				done();
			});
		});

		it('should be okay if transaction is processed properly', function (done) {
			dbStub.one.withArgs(sql.countByTransactionId, {
				id: trs.asset.outTransfer.dappId
			}).resolves({
				count: 1
			});

			dbStub.one.withArgs(sql.countByOutTransactionId, {
				transactionId: trs.asset.outTransfer.transactionId
			}).resolves({
				count: 0
			});

			outTransfer.process(trs, validSender, function (err) {
				expect(dbStub.one.calledTwice).to.equal(true);
				expect(err).to.not.exist;
				done();
			});
		});
	});

	describe('getBytes', function () {

		it('should get bytes of valid transaction', function () {
			expect(outTransfer.getBytes(trs).toString('hex')).to.equal('343136333731333037383236363532343230393134313434333533313632323737313338383231');
		});

		it('should get bytes of valid transaction', function () {
			expect(outTransfer.getBytes(trs).length).to.be.lte(39);
		});
	});

	describe('apply', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		it('should return error when unable to get account', function (done) {
			var error = 'Could not connect to the database';
			accountsStub.setAccountAndGet.withArgs({
				address: trs.recipientId
			}, sinon.match.any).yields(error);

			outTransfer.apply(trs, dummyBlock, validSender, function (err) {
				expect(err).to.equal(err);
			});
		});

		it('should update account with correct params', function (done) {
			accountsStub.setAccountAndGet.withArgs({
				address: trs.recipientId
			}, sinon.match.any).yields(null);

			accountsStub.mergeAccountAndGet.withArgs({
				address: trs.recipientId,
				balance: trs.amount,
				u_balance: trs.amount,
				blockId: dummyBlock.id,
				round: slots.calcRound(dummyBlock.height)
			}).yields(null);

			outTransfer.apply(trs, dummyBlock, sender, function (err) {
				expect(err).to.not.exist;
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.equal(true);
				done();
			});
		});

		it.skip('should remove transaction from unconfirmedOutTransfer object', function (done) {
			var unconfirmedTrs = OutTransfer.__get__('__private.unconfirmedOutTansfers');

			accountsStub.setAccountAndGet.withArgs({
				address: trs.recipientId
			}, sinon.match.any).yields(null);

			accountsStub.mergeAccountAndGet.withArgs({
				address: trs.recipientId,
				balance: trs.amount,
				u_balance: trs.amount,
				blockId: dummyBlock.id,
				round: slots.calcRound(dummyBlock.height)
			}).yields(null);

			outTransfer.apply(trs, dummyBlock, sender, function (err) {
				expect(err).to.not.exist;
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.equal(true);
				expect(unconfirmedTrs[trs.asset.outTransfer.transactionId]).to.not.exist;
				done();
			});
		});
	});

	describe('undo', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		it('should return error when unable to get account', function (done) {
			var error = 'Could not connect to the database';
			accountsStub.setAccountAndGet.withArgs({
				address: trs.recipientId
			}, sinon.match.any).yields(error);

			outTransfer.undo(trs, dummyBlock, validSender, function (err) {
				expect(err).to.equal(err);
			});
		});

		it('should update account with correct params', function (done) {
			accountsStub.setAccountAndGet.withArgs({
				address: trs.recipientId
			}, sinon.match.any).yields(null);

			accountsStub.mergeAccountAndGet.withArgs({
				address: trs.recipientId,
				balance: -trs.amount,
				u_balance: -trs.amount,
				blockId: dummyBlock.id,
				round: slots.calcRound(dummyBlock.height)
			}).yields(null);

			outTransfer.undo(trs, dummyBlock, sender, function (err) {
				expect(err).to.not.exist;
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.equal(true);
				done();
			});
		});

		it.skip('should remove transaction from unconfirmedOutTransfer object', function (done) {
			var unconfirmedTrs = OutTransfer.__get__('__private.unconfirmedOutTansfers');

			accountsStub.setAccountAndGet.withArgs({
				address: trs.recipientId
			}, sinon.match.any).yields(null);

			accountsStub.mergeAccountAndGet.withArgs({
				address: trs.recipientId,
				balance: -trs.amount,
				u_balance: -trs.amount,
				blockId: dummyBlock.id,
				round: slots.calcRound(dummyBlock.height)
			}).yields(null);

			outTransfer.undo(trs, dummyBlock, sender, function (err) {
				expect(err).to.not.exist;
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.equal(true);
				expect(unconfirmedTrs[trs.asset.outTransfer.transactionId]).to.equal(true);
				done();
			});
		});
	});

	describe('applyUnconfirmed', function () {

		it('should call the callback function', function (done) {
			var unconfirmedTrs = OutTransfer.__get__('__private.unconfirmedOutTansfers');
			outTransfer.applyUnconfirmed(trs, sender, function () {
				expect(unconfirmedTrs[trs.asset.outTransfer.transactionId]).to.equal(true);
				done();
			});
		});
	});

	describe('undoUnconfirmed', function () {

		it.skip('should call the callback function', function (done) {
			var unconfirmedTrs = OutTransfer.__get__('__private.unconfirmedOutTansfers');
			outTransfer.undoUnconfirmed(trs, sender, function () {
				expect(unconfirmedTrs[trs.asset.outTransfer.transactionId]).to.equal(false);
				done();
			});
		});
	});

	describe('objectNormalize', function () {

		it('should use the correct format to validate against', function () {
			var library = OutTransfer.__get__('library');
			var schemaSpy = sinon.spy(library.schema, 'validate');
			outTransfer.objectNormalize(trs);
			expect(schemaSpy.calledOnce).to.equal(true);
			expect(schemaSpy.calledWithExactly(trs.asset.inTransfer, OutTransfer.prototype.schema)).to.equal(true);
			schemaSpy.restore();
		});

		it('should return error asset schema is invalid', function () {
			trs.asset.inTransfer.dappId = 2;

			expect(function () {
				outTransfer.objectNormalize(trs);
			}).to.throw('Failed to validate inTransfer schema: Expected type string but found type integer');
		});

		it('should return transaction when asset is valid', function () {
			expect(outTransfer.objectNormalize(trs)).to.eql(trs);
		});
	});

	describe('dbRead', function () {

		it('should return null dappId does not exist', function () {
			delete rawTrs.in_dappId;

			expect(outTransfer.dbRead(rawTrs)).to.eql(null);
		});

		it('should be okay for valid input', function () {
			expect(outTransfer.dbRead(rawTrs)).to.eql({
				inTransfer: {
					dappId: trs.asset.inTransfer.dappId
				}
			});
		});
	});

	describe('dbSave', function () {

		it('should be okay for valid input', function () {
			expect(outTransfer.dbSave(trs)).to.eql({
				table: 'intransfer',
				fields: [
					'dappId',
					'transactionId'
				],
				values: {
					dappId: trs.asset.inTransfer.dappId,
					transactionId: trs.id
				}
			});
		});
	});

	describe('ready', function () {

		it('should return true for single signature trs', function () {
			expect(outTransfer.ready(trs, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(outTransfer.ready(trs, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with alteast min signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete trs.signature;
			// Not really correct signature, but we are not testing that over here
			trs.signature = crypto.randomBytes(64).toString('hex');;
			trs.signatures = [crypto.randomBytes(64).toString('hex')];

			expect(outTransfer.ready(trs, sender)).to.equal(true);
		});
	});
});

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

var InTransfer = rewire('../../../logic/inTransfer.js');
var sql = require('../../../sql/dapps.js');

var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var validSender = {
	balance: '0',
	password: 'zdv72jrts9y8613e4s4i',
	secondPassword: '33ibzztls7xlrocpzxgvi',
	username: '9bzuu',
	publicKey: '967e00fbf215b6227a6521226decfdc14c92cb88d35268787a47ff0e6b92f94a',
	address: '17603529232728446942L',
	secondPublicKey: 'b9aa5c8d1e1cbcf97eb6393cda8315b7d35cecbc8e2eb0629fa3cf80df4cdda7'
};

var senderHash = crypto.createHash('sha256').update(validSender.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var validTransaction =  { 
	id: '2273003018673898961',
	height: 843,
	blockId: '11870363750006389009',
	type: 6,
	timestamp: 40420761,
	senderPublicKey: '6dc3f3f8bcf9fb689a1ec6703ed08c649cdc98619ac4689794bf72b579d6cf25',
	requesterPublicKey: undefined,
	senderId: '2623857243537009424L',
	recipientId: null,
	recipientPublicKey: null,
	amount: 999,
	fee: 10000000,
	signature: '46b57a56f3a61c815224e4396c9c39316ca62568951f84c2e7404225cf67c489f517db6a848a0a5fd4f311b98102c36098543cecb277c7d039a07ed069d90b0b',
	signSignature: undefined,
	signatures: [],
	confirmations: 113,
	asset: {
		inTransfer:{
			dappId: '7400202127695414450'
		}
	}
};

var rawValidTransaction = {
	t_id: '2273003018673898961',
	b_height: 843,
	t_blockId: '11870363750006389009',
	t_type: 6,
	t_timestamp: 40420761,
	t_senderPublicKey: '6dc3f3f8bcf9fb689a1ec6703ed08c649cdc98619ac4689794bf72b579d6cf25',
	m_recipientPublicKey: null,
	t_senderId: '2623857243537009424L',
	t_recipientId: null,
	t_amount: '999',
	t_fee: '10000000',
	t_signature: '46b57a56f3a61c815224e4396c9c39316ca62568951f84c2e7404225cf67c489f517db6a848a0a5fd4f311b98102c36098543cecb277c7d039a07ed069d90b0b',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 113,
	in_dappId: '7400202127695414450'
};

describe('inTransfer', function () {

	var inTransfer;
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
			getAccount: sinon.stub()
		};
		inTransfer = new InTransfer(dbStub, modulesLoader.scope.schema);
		inTransfer.bind(accountsStub, sharedStub);
	});

	beforeEach(function () {
		dbStub.one.reset();
		dbStub.query.reset();
		sharedStub.getGenesis.reset();
		accountsStub.mergeAccountAndGet.reset();
		accountsStub.getAccount.reset();
	});

	beforeEach(function () {
		trs = _.cloneDeep(validTransaction);
		rawTrs = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
	});

	describe('constructor', function () {

		it('should be attach schema and logger to library variable', function () {
			new InTransfer(dbStub, modulesLoader.scope.schema);
			var library = InTransfer.__get__('library');


			expect(library).to.eql({
				db: dbStub,
				schema: modulesLoader.scope.schema,
			});
		});
	});

	describe('bind', function () {

		it('should be okay with empty params', function () {
			inTransfer.bind();
		});

		it('should bind dependent module mocks', function () {
			inTransfer.bind(accountsStub, sharedStub);
			var privateShared = InTransfer.__get__('shared');
			var privateModules = InTransfer.__get__('modules');
			expect(privateShared).to.eql(sharedStub);
			expect(privateModules).to.eql({
				accounts: accountsStub
			});
		});
	});

	describe('calculateFee', function () {

		it('should return the correct fee for second signature transaction', function () {
			expect(inTransfer.calculateFee(trs)).to.equal(node.constants.fees.send);
		});
	});

	describe('verify', function () {

		it('should return error if receipient exists', function (done) {
			trs.recipientId = '4835566122337813671L';

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid recipient');
				done();
			});
		});

		it('should return error if amount is undefined', function (done) {
			trs.amount = undefined;

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction amount');
				done();
			});
		});

		it('should return error if amount is equal to 0', function (done) {
			trs.amount = 0;

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction amount');
				done();
			});
		});

		it('should return error if asset is undefined', function (done) {
			trs.asset.inTransfer = undefined;

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction asset');
				done();
			});
		});

		it('should return error if intransfer property is undefined', function (done) {
			trs.asset.inTransfer = undefined;

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction asset');
				done();
			});
		});

		it('should return error if intransfer property is equal to 0', function (done) {
			trs.asset.inTransfer = 0;

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction asset');
				done();
			});
		});

		it('should return error if dapp does not exist', function (done) {
			trs.asset.inTransfer.dappId = '10223892440757987952';
			console.log(' sql.countByTransactionId');
			console.log( sql.countByTransactionId);
			console.log('{ id: trs.asset.inTransfer.dappId } ');
			console.log({ id: trs.asset.inTransfer.dappId } );

			dbStub.one.withArgs(sql.countByTransactionId, {
				id: trs.asset.inTransfer.dappId
			}).resolves({
				count: 0
			});

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Application not found: ' + trs.asset.inTransfer.dappId);
				done();
			});
		});

		it('should be okay with valid transaction', function (done) {
			dbStub.one.withArgs(sql.countByTransactionId, {
				id: trs.asset.inTransfer.dappId
			}).resolves({
				count: 1
			});

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});
	});

	describe('process', function () {

		it('should call the callback', function (done) {
			inTransfer.process(trs, sender, done);
		});
	});

	describe('getBytes', function () {

		it('should get bytes of valid transaction', function () {
			expect(inTransfer.getBytes(trs).toString('hex')).to.equal('37343030323032313237363935343134343530');
		});

		it('should get bytes of valid transaction', function () {
			expect(inTransfer.getBytes(trs).length).to.be.lte(20);
		});
	});

	describe('apply', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		it('should return error if dapp does not exist', function (done) {
			var error = 'Application genesis block not found';
			sharedStub.getGenesis.withArgs({
				dappid: trs.asset.inTransfer.dappId
			}, sinon.match.any).yields(error);

			inTransfer.apply(trs, dummyBlock, sender, function (err) {
				expect(err).to.equal(error);
				done();
			});
		});

		it('should update account with correct params', function (done) {
			sharedStub.getGenesis.withArgs({
				dappid: trs.asset.inTransfer.dappId
			}, sinon.match.any).yields(null, {
				authorId: validSender.address
			});

			accountsStub.mergeAccountAndGet.withArgs({
				address: validSender.address,
				balance: trs.amount,
				u_balance: trs.amount,
				blockId: dummyBlock.id,
				round: slots.calcRound(dummyBlock.height)
			}).yields(null);

			inTransfer.apply(trs, dummyBlock, sender, function (err) {
				expect(err).to.not.exist;
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.equal(true);
				done();
			});
		});
	});

	describe('undo', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		it('should return error if dapp does not exist', function (done) {
			var error = 'Application genesis block not found';
			sharedStub.getGenesis.withArgs({
				dappid: trs.asset.inTransfer.dappId
			}, sinon.match.any).yields(error);

			inTransfer.undo(trs, dummyBlock, sender, function (err) {
				expect(err).to.equal(error);
				done();
			});
		});

		it('should update account with correct params', function (done) {
			sharedStub.getGenesis.withArgs({
				dappid: trs.asset.inTransfer.dappId
			}, sinon.match.any).yields(null, {
				authorId: validSender.address
			});

			accountsStub.getAccount.withArgs({
				address: sender.address 
			}, sinon.match.any).yields();

			accountsStub.mergeAccountAndGet.withArgs({
				address: validSender.address,
				balance: trs.amount,
				u_balance: trs.amount,
				blockId: dummyBlock.id,
				round: slots.calcRound(dummyBlock.height)
			}).yields(null);

			inTransfer.apply(trs, dummyBlock, sender, function (err) {
				expect(err).to.not.exist;
				expect(accountsStub.mergeAccountAndGet.calledOnce).to.equal(true);
				done();
			});
		});
	});

	describe('applyUnconfirmed', function () {

		it('should call the callback function', function (done) {
			inTransfer.applyUnconfirmed(trs, sender, done);
		});
	});

	describe('undoUnconfirmed', function () {

		it('should call the callback function', function (done) {
			inTransfer.undoUnconfirmed(trs, sender, done);
		});
	});

	describe('objectNormalize', function () {

		it('should use the correct format to validate against', function () {
			var library = InTransfer.__get__('library');
			var schemaSpy = sinon.spy(library.schema, 'validate');
			inTransfer.objectNormalize(trs);
			expect(schemaSpy.calledOnce).to.equal(true);
			expect(schemaSpy.calledWithExactly(trs.asset.inTransfer, InTransfer.prototype.schema)).to.equal(true);
			schemaSpy.restore();
		});

		it('should return error asset schema is invalid', function () {
			trs.asset.inTransfer.dappId = 2;

			expect(function () {
				inTransfer.objectNormalize(trs);
			}).to.throw('Failed to validate inTransfer schema: Expected type string but found type integer');
		});

		it('should return transaction when asset is valid', function () {
			expect(inTransfer.objectNormalize(trs)).to.eql(trs);
		});
	});

	describe('dbRead', function () {

		it('should return null dappId does not exist', function () {
			delete rawTrs.in_dappId;

			expect(inTransfer.dbRead(rawTrs)).to.eql(null);
		});

		it('should be okay for valid input', function () {
			expect(inTransfer.dbRead(rawTrs)).to.eql({
				inTransfer: {
					dappId: trs.asset.inTransfer.dappId
				}
			});
		});
	});

	describe('dbSave', function () {

		it('should be okay for valid input', function () {
			expect(inTransfer.dbSave(trs)).to.eql({
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
			expect(inTransfer.ready(trs, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(inTransfer.ready(trs, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with alteast min signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete trs.signature;
			// Not really correct signature, but we are not testing that over here
			trs.signature = crypto.randomBytes(64).toString('hex');;
			trs.signatures = [crypto.randomBytes(64).toString('hex')];

			expect(inTransfer.ready(trs, sender)).to.equal(true);
		});
	});
});

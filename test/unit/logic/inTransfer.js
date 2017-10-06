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
	var dummyBlock;

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
		dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};
	});

	describe('constructor', function () {

		describe('library', function () {

			it('should assign db');

			it('should assign schema');
		});

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

		describe('modules', function () {

			it('should assign accounts');
		});

		it('should assign shared');

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

		it('should return constants.fees.send');

		it('should return the correct fee for second signature transaction', function () {
			expect(inTransfer.calculateFee(trs)).to.equal(node.constants.fees.send);
		});
	});

	describe('verify', function () {

		describe('when trs.recipientId exists', function () {

			it('should call callback with error = "Invalid recipient"');
		});

		describe('when trs.amount does not exist', function () {

			it('should call callback with error = "Invalid transaction amount"');
		});

		describe('when trs.amount = 0', function () {

			it('should call callback with error = "Invalid transaction amount"');
		});

		describe('when trs.asset does not exist', function () {

			it('should call callback with error = "Invalid transaction asset"');
		});

		describe('when trs.asset.inTransfer does not exist', function () {

			it('should call callback with error = "Invalid transaction asset"');
		});

		describe('when trs.asset.inTransfer = 0', function () {

			it('should call callback with error = "Invalid transaction asset"');
		});

		it('should call library.db.one');

		it('should call library.db.one with sql.countByTransactionId');

		it('should call library.db.one with {id: trs.asset.inTransfer.dappId}');

		describe('when library.db.one fails', function () {

			it('should call callback with error');
		});

		describe('when library.db.one succeeds', function () {

			describe('when dapp exists', function () {

				it('should call callback with error = undefined');

				it('should call callback with result = undefined');
			});

			describe('when dapp does not exist', function () {

				it('should call callback with error');
			});
		});

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
			trs.asset = undefined;

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

		it('should call callback with error = null', function (done) {
			inTransfer.process(trs, sender, function (err) {
				expect(err).to.be.null;
				done();
			});
		});

		it('should call callback with result = transaction', function (done) {
			inTransfer.process(trs, sender, function (err, result) {
				expect(result).to.eql(trs);
				done();
			});
		});
	});

	describe('getBytes', function () {

		describe('when trs.asset.inTransfer.dappId = undefined', function () {

			beforeEach(function () {
				trs.asset.inTransfer.dappId = undefined;
			});

			it('should throw', function () {
				expect(inTransfer.getBytes.bind(null, trs)).to.throw;
			});
		});

		describe('when trs.asset.inTransfer.dappId is a valid dapp id', function () {

			it('should not throw', function () {
				expect(inTransfer.getBytes.bind(null, trs)).not.to.throw;
			});

			it('should get bytes of valid transaction', function () {
				expect(inTransfer.getBytes(trs).toString('utf8')).to.equal(validTransaction.asset.inTransfer.dappId);
			});

			it('should return result as a Buffer type', function () {
				expect(inTransfer.getBytes(trs)).to.be.instanceOf(Buffer);
			});
		});
	});

	describe('apply', function () {

		it('should call shared.getGenesis');

		it('should call shared.getGenesis with {dappid: trs.asset.inTransfer.dappId}');

		describe('when shared.getGenesis fails', function () {

			it('should call callback with error');
		});

		describe('when shared.getGenesis succeeds', function () {

			it('should call modules.accounts.mergeAccountAndGet');

			it('should call modules.accounts.mergeAccountAndGet with address = dapp.authorId');

			it('should call modules.accounts.mergeAccountAndGet with balance = trs.amount');

			it('should call modules.accounts.mergeAccountAndGet with u_balance = trs.amount');

			it('should call modules.accounts.mergeAccountAndGet with blockId = block.id');

			it('should call modules.accounts.mergeAccountAndGet with round = slots.calcRound result');

			describe('when modules.accounts.mergeAccountAndGet fails', function () {

				it('should call callback with error');
			});

			describe('when modules.accounts.mergeAccountAndGet succeeds', function () {

				it('should call callback with error = undefined');

				it('should call callback with result = undefined');
			});
		});

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

		it('should call shared.getGenesis');

		it('should call shared.getGenesis with {dappid: trs.asset.inTransfer.dappId}');

		describe('when shared.getGenesis fails', function () {

			it('should call callback with error');
		});

		describe('when shared.getGenesis succeeds', function () {

			it('should call modules.accounts.mergeAccountAndGet');

			it('should call modules.accounts.mergeAccountAndGet with address = dapp.authorId');

			it('should call modules.accounts.mergeAccountAndGet with balance = trs.amount');

			it('should call modules.accounts.mergeAccountAndGet with u_balance = trs.amount');

			it('should call modules.accounts.mergeAccountAndGet with blockId = block.id');

			it('should call modules.accounts.mergeAccountAndGet with round = slots.calcRound result');

			describe('when modules.accounts.mergeAccountAndGet fails', function () {

				it('should call callback with error');
			});

			describe('when modules.accounts.mergeAccountAndGet succeeds', function () {

				it('should call callback with error = undefined');

				it('should call callback with result = undefined');
			});
		});

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

		it('should call callback with error = undefined', function (done) {
			inTransfer.applyUnconfirmed(trs, sender, function (err) {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call callback with result = undefined', function (done) {
			inTransfer.applyUnconfirmed(trs, sender, function (err, result) {
				expect(result).to.be.undefined;
				done();
			});
		});
	});

	describe('undoUnconfirmed', function () {

		it('should call callback with error = undefined', function (done) {
			inTransfer.undoUnconfirmed(trs, sender, function (err) {
				expect(err).to.be.undefined;
				done();
			});
		});

		it('should call callback with result = undefined', function (done) {
			inTransfer.undoUnconfirmed(trs, sender, function (err, result) {
				expect(result).to.be.undefined;
				done();
			});
		});
	});

	describe('objectNormalize', function () {

		it('should call library.schema.validate');

		it('should call library.schema.validate with trs.asset.inTransfer');

		it('should call library.schema.validate InTransfer.prototype.schema');

		describe('when transaction is invalid', function () {

			it('should throw', function () {

			});
		});

		describe('when transaction is valid', function () {

			it('should return transaction');
		});

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

		describe('when raw.in_dappId does not exist', function () {

			beforeEach(function () {
				delete rawTrs.in_dappId;
			});

			it('should return null', function () {
				expect(inTransfer.dbRead(rawTrs)).to.eql(null);
			});
		});

		describe('when raw.in_dappId exists', function () {

			it('should return result containing inTransfer', function () {
				expect(inTransfer.dbRead(rawTrs)).to.have.property('inTransfer');
			});

			it('should return result containing inTransfer.dappId = raw.dapp_id', function () {
				expect(inTransfer.dbRead(rawTrs)).to.have.nested.property('inTransfer.dappId').equal(rawTrs.in_dappId);
			});
		});
	});

	describe('dbSave', function () {

		it('should return result containing table = "intransfer"');

		it('should return result containing fields = ["dappId", "transactionId"]');

		it('should return result containing values');

		it('should return result containing values.dappId = trs.asset.inTransfer.dappId');

		it('should return result containing values.transactionId = trs.id');

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

	describe('afterSave', function () {

		it('should call callback with error = undefined', function () {

		});

		it('should call callback with result = undefined', function () {

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
			trs.signature = crypto.randomBytes(64).toString('hex');
			trs.signatures = [crypto.randomBytes(64).toString('hex')];

			expect(inTransfer.ready(trs, sender)).to.equal(true);
		});
	});
});

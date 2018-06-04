var async = require('async');
var sinon = require('sinon');
var chai = require('chai');
var expect = require('chai').expect;
var Promise = require('bluebird');
var _  = require('lodash');
var common = require('../common.js');
var genesisBlock = require('../../genesisBlock.json');
var node = require('../../node.js');
var slots = require('../../../helpers/slots.js');
var application = require('../../common/application');

describe('chain', function () {

	var library;

	before('init sandboxed application', function (done) {
		application.init({sandbox: {name: 'lisk_test_block_deletion'}}, function (scope) {
			library = scope;
			done();
		});
	});

	after('cleanup sandboxed application', function (done) {
		application.cleanup(done);
	});

	describe('saveBlock', function () {

		describe('when block contains invalid transaction - timestamp out of postgres integer range', function () {
			var block = {
				blockSignature: '56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
				generatorPublicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
				numberOfTransactions: 2,
				payloadHash: 'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
				payloadLength: 494,
				previousBlock: genesisBlock.id,
				height: 2,
				reward: 0,
				timestamp: 32578370,
				totalAmount: 10000000000000000,
				totalFee: 0,
				transactions: [
					{
						'type': 0,
						'amount': 10000000000000000,
						'fee': 0,
						'timestamp': -3704634000,
						'recipientId': '16313739661670634666L',
						'senderId': '1085993630748340485L',
						'senderPublicKey': 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
						'signature': 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
						'id': '1465651642158264048'
					},
				],
				version: 0,
				id: '884740302254229983'
			};

			it('should call a callback with proper error', function (done) {
				library.modules.blocks.chain.saveBlock(block, function (err) {
					expect(err).to.eql('Blocks#saveBlock error');
					done();
				});
			});
		});

		describe('when block is invalid - previousBlockId not exists', function () {
			var block = {
				blockSignature: '56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
				generatorPublicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
				numberOfTransactions: 2,
				payloadHash: 'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
				payloadLength: 494,
				previousBlock: '123',
				height: 2,
				reward: 0,
				timestamp: 32578370,
				totalAmount: 10000000000000000,
				totalFee: 0,
				version: 0,
				id: '884740302254229983'
			};

			it('should call a callback with proper error', function (done) {
				library.modules.blocks.chain.saveBlock(block, function (err) {
					expect(err).to.eql('Blocks#saveBlock error');
					done();
				});
			});
		});
	});

	describe('deleteLastBlock', function () {

		var transactions;

		before('forge a block with 25 transactions', function (done) {
			transactions = _.range(25).map(function () {
				var account = node.randomAccount();
				return node.lisk.transaction.createTransaction(account.address, 1000000000*100, node.gAccount.password);
			});
			common.addTransactionsAndForge(library, transactions, done);
		});

		describe('after deleting last block', function () {

			var lastBlock;
			var receiveTransactionsSpy;

			before(function (done) {
				receiveTransactionsSpy = sinon.spy(library.modules.transactions, 'receiveTransactions');
				lastBlock = library.modules.blocks.lastBlock.get();
				library.modules.blocks.chain.deleteLastBlock(done);
			});

			after(function () {
				receiveTransactionsSpy.restore();
			});

			it('should remove block from the database', function (done) {
				library.balancesSequence.add(function (balanceSequenceCb) {
					common.getBlocks(library, function (err, blockIds) {
						expect(blockIds).to.not.include(lastBlock.id);
						balanceSequenceCb();
						done();
					});
				});
			});

			it('should set the last block to genesis block', function (done) {
				library.balancesSequence.add(function (balanceSequenceCb) {
					common.getBlocks(library, function (err, blockIds) {
						expect(blockIds.length).to.equal(1);
						expect(blockIds).to.include(genesisBlock.id);
						expect(library.modules.blocks.lastBlock.get().id).eql(genesisBlock.id);
						balanceSequenceCb();
						done();
					});
				});
			});

			it('should call modules.transactions.receiveTransactions with the deleted transactions', function () {
				var reappliedTransactionIds = _.map(receiveTransactionsSpy.args[0][0], 'id');
				transactions.map(function (transaction) {
					expect(reappliedTransactionIds).to.contain(transaction.id);
				});
			});

			it('should put the block transactions back in the queue', function () {
				transactions.forEach(function (trs) {
					expect(library.modules.transactions.transactionInPool(trs.id)).to.equal(true);
				});
			});
		});
	});
});

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

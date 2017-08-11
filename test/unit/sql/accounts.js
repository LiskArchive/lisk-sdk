'use strict';

var node   = require('../../node.js');
var _      = node._;
var expect = node.expect;

describe('SQL triggers related to accounts', function () {
	var library;

	before(function (done) {
		node.initApplication(function (scope) {
			library = scope;

			// Set delegates module as loaded to allow manual forging
			library.rewiredModules.delegates.__set__('__private.loaded', true);

			setTimeout(done, 10000);
		})
	});

	before(function (done) {
		// Load forging delegates
		var loadDelegates = library.rewiredModules.delegates.__get__('__private.loadDelegates');
		loadDelegates(done);
	});

	function getAccounts () {
		return library.db.query('SELECT * FROM accounts').then(function (rows) {
			var accounts = {};
			_.each(rows, function (row) {
				accounts[row.address] = {
					tx_id: row.tx_id,
					pk: row.pk.toString('hex'),
					pk_tx_id: row.pk_tx_id,
					second_pk: row.second_pk ? row.second_pk.toString('hex') : null,
					address: row.address,
					balance: Number(row.balance)
				};
			});
			return accounts;
		});
	};

	function getExpectedAccounts(transactions) {
		var expected = {};
		_.each(transactions, function (tx) {
			// Update recipient
			if (tx.recipientId) {
				if (!expected[tx.recipientId]) {
					expected[tx.recipientId] = {
						tx_id: tx.id,
						pk: null,
						pk_tx_id: null,
						second_pk: null,
						address: tx.recipientId,
						balance: tx.amount
					}
				} else {
					expected[tx.recipientId].balance += tx.amount;
				}
			}

			// Update sender
			if (!expected[tx.senderId]) {
				expected[tx.senderId] = {
					tx_id: tx.id,
					pk: tx.senderPublicKey,
					pk_tx_id: tx.id,
					second_pk: null,
					address: tx.senderId,
					balance: 0 - (tx.amount+tx.fee)
				};
			} else {
				if (!expected[tx.senderId].pk) {
					expected[tx.senderId].pk = tx.senderPublicKey;
					expected[tx.senderId].pk_tx_id = tx.id;
				}
				expected[tx.senderId].balance -= (tx.amount+tx.fee);
			}
		});
		return expected;
	}

	describe('accounts table', function () {

		it('initial state should match genesis block', function () {
			var genesis_transactions = library.genesisblock.block.transactions;
			var expected = getExpectedAccounts(genesis_transactions);

			return getAccounts().then(function (accounts) {
				expect(accounts).to.deep.equal(expected);
			});
		});
	});
});

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

var Promise = require('bluebird');

module.exports = function (params) {

	describe('blocks', function () {

		var nodesTransactions = [];

		before(function () {
			return Promise.all(params.sockets.map(function (socket) {
				return socket.wampSend('blocks');
			})).then(function (results) {
				nodesTransactions = results.map(function (res) {
					return res.blocks;
				});
				nodesTransactions.should.have.lengthOf(params.configurations.length);
			});
		});

		it('should contain non empty transactions after running functional tests', function () {
			nodesTransactions.forEach(function (transactions) {
				transactions.should.be.an('array').and.not.empty;
			});
		});

		it('should have all peers having same amount of confirmed transactions', function () {
			var uniquePeersTransactionsNumber = _(nodesTransactions).map('length').uniq().value();
			uniquePeersTransactionsNumber.should.have.lengthOf.at.least(1);
		});

		it('should have all transactions the same at all peers', function () {
			var patternTransactions = nodesTransactions[0];
			for (var i = 0; i < patternTransactions.length; i += 1) {
				for (var j = 1; j < nodesTransactions.length; j += 1) {
					_.isEqual(nodesTransactions[j][i], patternTransactions[i]).should.be.true;
				}
			}
		});
	});
};

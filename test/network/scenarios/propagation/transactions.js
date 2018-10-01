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

const Promise = require('bluebird');

module.exports = function(configurations, network) {
	describe('@propagation : transactions', () => {
		let nodesTransactions = [];

		before(() => {
			return network.waitForAllNodesToBeReady()
			.then(() => {
				return Promise.all(
					network.sockets.map(socket => {
						return socket.call('blocks');
					})
				);
			})
			.then(results => {
				nodesTransactions = results.map(res => {
					return res.blocks;
				});
				expect(nodesTransactions).to.have.lengthOf(
					configurations.length
				);
			});
		});

		it('should contain non empty transactions', () => {
			return nodesTransactions.forEach(transactions => {
				expect(transactions).to.be.an('array').and.not.empty;
			});
		});

		it('should have all peers having same amount of confirmed transactions', () => {
			const uniquePeersTransactionsNumber = _(nodesTransactions)
				.map('length')
				.uniq()
				.value();
			return expect(uniquePeersTransactionsNumber).to.have.lengthOf.at.least(1);
		});

		it('should have all transactions the same at all peers', done => {
			const transactionsFromOtherNodes = nodesTransactions.splice(1);
			const transactionsFromNode0 = nodesTransactions[0];

			transactionsFromOtherNodes.forEach(transactionsFromOtherNode =>
				expect(transactionsFromOtherNode).to.include.deep.members(
					transactionsFromNode0
				)
			);
			done();
		});
	});
};

/*
 * Copyright © 2019 Lisk Foundation
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
const utils = require('../../utils');

module.exports = function(configurations, network) {
	describe('@propagation : transactions', () => {
		const genesisBlockId = __testContext.config.genesisBlock.id;
		let nodesTransactions;

		before(() => {
			return network
				.waitForBlocksOnAllNodes(1)
				.then(() => {
					return Promise.all(
						configurations.map(configuration => {
							return utils.http.getTransactionsFromBlock({
								blockId: genesisBlockId,
								port: configuration.modules.http_api.httpPort,
							});
						}),
					);
				})
				.then(transactionsResults => {
					nodesTransactions = transactionsResults;
				});
		});

		it('should contain non empty transactions', async () => {
			return nodesTransactions.map(transactions => {
				return expect(transactions).to.be.an('array').and.not.empty;
			});
		});

		it('should have all peers having same amount of confirmed transactions', async () => {
			const uniquePeersTransactionsNumber = _(nodesTransactions)
				.map('length')
				.uniq()
				.value();
			return expect(uniquePeersTransactionsNumber).to.have.lengthOf.at.least(1);
		});

		it('should have all transactions the same at all peers', async () => {
			const transactionsFromOtherNodes = nodesTransactions.splice(1);
			const transactionsFromNode0 = nodesTransactions[0];

			return transactionsFromOtherNodes.map(transactionsFromOtherNode => {
				return expect(transactionsFromOtherNode).to.include.deep.members(
					transactionsFromNode0,
				);
			});
		});
	});
};

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
const utils = require('../../utils');

module.exports = function(configurations, network) {
	describe('@propagation : blocks', () => {
		let nodesBlocks;

		before(() => {
			return network.waitForBlocksOnAllNodes(1)
			.then(() => {
				return Promise.all(
					configurations.map(configuration => {
						return utils.http.getBlocks(configuration.httpPort);
					})
				);
			})
			.then(blocksResults => {
				nodesBlocks = blocksResults;
			});
		});

		it('should be able to get blocks list from every peer', () => {
			return expect(nodesBlocks).to.have.lengthOf(configurations.length);
		});

		it('should contain non empty blocks', () => {
			return nodesBlocks.forEach(blocks => {
				expect(blocks).to.be.an('array').and.not.to.be.empty;
			});
		});

		it('should have all peers at the same height', () => {
			const uniquePeersHeights = _(nodesBlocks)
				.map('length')
				.uniq()
				.value();
			return expect(uniquePeersHeights).to.have.lengthOf.at.least(1);
		});

		it('should have all blocks the same at all peers', done => {
			const blocksFromOtherNodes = nodesBlocks.splice(1);
			const blocksFromNode0 = nodesBlocks[0];

			blocksFromOtherNodes.forEach(blocksFromNode =>
				expect(blocksFromNode).to.include.deep.members(blocksFromNode0)
			);
			done();
		});
	});
};

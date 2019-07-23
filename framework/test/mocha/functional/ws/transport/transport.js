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

require('../../functional');
const { P2P } = require('@liskhq/lisk-p2p');
const { generatePeerHeader } = require('../../../common/generatePeerHeader');
const waitFor = require('../../../common/utils/wait_for');
const SwaggerEndpoint = require('../../../common/swagger_spec');

describe('RPC', () => {
	let p2p;

	before(async () => {
		p2p = new P2P(generatePeerHeader());
		await p2p.start();
		await waitFor.blocksPromise(1, null);
	});

	after(async () => {
		await p2p.stop();
	});

	describe('blocks', () => {
		it('should return height and broadhash', async () => {
			const blocksEndpoint = new SwaggerEndpoint('GET /blocks');
			const blockRes = await blocksEndpoint.makeRequest({ height: 2 }, 200);
			const blockId = blockRes.body.data[0].id;
			const { data } = await p2p.request({
				procedure: 'blocks',
				data: { lastBlockId: blockId },
			});
			expect(data)
				.to.have.property('blocks')
				.to.be.an('array');
		});
	});
});

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

const blocksLogic = require('../../../../../../src/modules/chain/blocks/block');

describe('blocks/utils', () => {
	const genesisBlock = {
		id: '6524861224470851795',
		height: 1,
	};

	const storageBlocksListRows = [
		{
			id: '13068833527549895884',
			generatorPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			height: 3, // Block 1
			version: 0,
			transactions: [
				{
					id: '6950874693022090568',
					type: 5,
					asset: {
						dapp: {
							category: 0,
							description: 'my app desc',
							icon: 'app.icon',
							link: 'app-link.com',
							name: 'App Name',
							tags: null,
							type: 0,
						},
					},
				},
			],
			totalAmount: 100,
			totalFee: 10,
			reward: 1,
		},
		{
			id: '13068833527549895884',
			generatorPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			height: 3, // Block 1
			version: '0',
			transactions: [
				{
					id: '13831767660337349834',
					type: 1,
				},
			],
			totalAmount: 100,
			totalFee: 10,
			reward: 1,
		},
		{
			id: '7018883617995376402',
			generatorPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			height: 4, // Block 2
			version: '1',
			transactions: [
				{
					id: '10550826199952791739',
					type: 2,
				},
			],
			totalAmount: 100,
			totalFee: 10,
			reward: 1,
		},
		{
			id: '7018883617995376402',
			generatorPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			height: 4, // Block 2
			version: 1,
			transactions: [
				{
					id: '3502881310841638511',
					type: 3,
				},
			],
			totalAmount: 100,
			totalFee: 10,
			reward: 1,
		},
	];

	let storageStub;
	let interfaceAdaptersMock;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Account: {
					delegateBlocksRewards: sinonSandbox.stub().resolves(),
				},
				Block: {
					get: sinonSandbox.stub().resolves(['1']),
					getFirstBlockIdOfLastRounds: sinonSandbox
						.stub()
						.resolves([...storageBlocksListRows]),
				},
			},
		};

		interfaceAdaptersMock = {
			transactions: {
				dbRead(input) {
					return { id: input.t_id, type: input.t_type };
				},
				fromBlock(input) {
					return input;
				},
			},
		};
	});

	afterEach(() => sinonSandbox.restore());

	describe('loadLastBlock', () => {
		it('should return error when library.storage.entities.Block.get fails', async () => {
			storageStub.entities.Block.get.resolves(null);

			try {
				await blocksLogic.loadLastBlock(
					storageStub,
					interfaceAdaptersMock,
					genesisBlock,
				);
			} catch (err) {
				expect(err.message).to.equal('Failed to load last block');
			}
		});

		describe('sorting the block.transactions array', () => {
			it('should return the block', async () => {
				storageStub.entities.Block.get.resolves([...storageBlocksListRows]);
				const block = await blocksLogic.loadLastBlock(
					storageStub,
					interfaceAdaptersMock,
					genesisBlock,
				);

				expect(block).to.be.an('object');
				expect(block.id).to.equal('13068833527549895884');
			});
		});
	});
});

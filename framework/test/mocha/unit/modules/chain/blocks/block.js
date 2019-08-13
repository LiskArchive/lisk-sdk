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

	const fullBlocksListRows = [
		{
			b_id: '13068833527549895884',
			b_height: 3, // Block 1
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '6950874693022090568',
			t_type: 0,
			b_totalAmount: 100,
			b_totalFee: 10,
			b_reward: 1,
			b_version: 1,
		},
		{
			b_id: '13068833527549895884',
			b_height: 3, // Block 1
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '13831767660337349834',
			t_type: 1,
			b_totalAmount: 100,
			b_totalFee: 10,
			b_reward: 1,
			b_version: 1,
		},
		{
			b_id: '7018883617995376402',
			b_height: 4, // Block 2
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '10550826199952791739',
			t_type: 2,
			b_totalAmount: 100,
			b_totalFee: 10,
			b_reward: 1,
			b_version: 1,
		},
		{
			b_id: '7018883617995376402',
			b_height: 4, // Block 2
			b_generatorPublicKey:
				'a24416a05bef8874fb1c638105d892162f7d5736b7a2deda318e976fd80f64e9',
			t_id: '3502881310841638511',
			t_type: 3,
			b_totalAmount: 100,
			b_totalFee: 10,
			b_reward: 1,
			b_version: 1,
		},
	];

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

	describe('readDbRows', () => {
		beforeEach(async () => {
			sinonSandbox.spy(interfaceAdaptersMock.transactions, 'dbRead');
		});

		it('should call library.logic.block.dbRead with each block', async () => {
			blocksLogic.readDbRows(
				fullBlocksListRows,
				interfaceAdaptersMock,
				genesisBlock,
			);

			fullBlocksListRows.forEach(block => {
				expect(interfaceAdaptersMock.transactions.dbRead).to.have.callCount(4);
				expect(
					interfaceAdaptersMock.transactions.dbRead,
				).to.have.been.calledWith(block);
			});
		});

		it('should read an empty array', async () =>
			expect(blocksLogic.readDbRows([])).to.be.an('array'));

		describe('with 2 blocks each containing 2 transactions', () => {
			let blocks;

			beforeEach(async () => {
				blocks = blocksLogic.readDbRows(
					fullBlocksListRows,
					interfaceAdaptersMock,
					genesisBlock,
				);
				expect(blocks).to.be.an('array');
			});

			it('should read the rows correctly', async () => {
				// Block 1
				expect(blocks[0]).to.be.an('object');
				expect(blocks[0].id).to.equal('13068833527549895884');
				expect(blocks[0].height).to.equal(3);
				expect(blocks[0].transactions).to.be.an('array');
				expect(blocks[0].transactions[0]).to.be.an('object');
				expect(blocks[0].transactions[0].id).to.equal('6950874693022090568');
				expect(blocks[0].transactions[0].type).to.equal(0);
				expect(blocks[0].transactions[1]).to.be.an('object');
				expect(blocks[0].transactions[1].id).to.equal('13831767660337349834');
				expect(blocks[0].transactions[1].type).to.equal(1);

				// Block 2
				expect(blocks[1]).to.be.an('object');
				expect(blocks[1].id).to.equal('7018883617995376402');
				expect(blocks[1].height).to.equal(4);
				expect(blocks[1].transactions).to.be.an('array');
				expect(blocks[1].transactions[0]).to.be.an('object');
				expect(blocks[1].transactions[0].id).to.equal('10550826199952791739');
				expect(blocks[1].transactions[0].type).to.equal(2);
				expect(blocks[1].transactions[1]).to.be.an('object');
				expect(blocks[1].transactions[1].id).to.equal('3502881310841638511');
				return expect(blocks[1].transactions[1].type).to.equal(3);
			});
		});

		it('should generate fake signature for genesis block', async () => {
			const genesisBlock_view_full_blocks_list = [
				{
					b_id: '6524861224470851795',
					b_height: 1,
					b_generatorPublicKey:
						'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
					t_id: '1465651642158264047',
					t_type: 0,
					b_totalAmount: 100,
					b_totalFee: 10,
					b_reward: 1,
					b_version: 1,
				},
				{
					b_id: '6524861224470851795',
					b_height: 1,
					b_generatorPublicKey:
						'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
					t_id: '3634383815892709956',
					t_type: 2,
					b_totalAmount: 100,
					b_totalFee: 10,
					b_reward: 1,
					b_version: 1,
				},
			];

			const blockObject = blocksLogic.readDbRows(
				genesisBlock_view_full_blocks_list,
				interfaceAdaptersMock,
				genesisBlock,
			);

			expect(blockObject).to.be.an('array');
			expect(blockObject[0]).to.be.an('object');
			expect(blockObject[0].id).to.equal('6524861224470851795');
			return expect(blockObject[0].generationSignature).to.equal(
				'0000000000000000000000000000000000000000000000000000000000000000',
			);
		});
	});

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

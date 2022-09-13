/*
 * Copyright © 2021 Lisk Foundation
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
import { Block, BlockAssets } from '@liskhq/lisk-chain';
import { createBlock } from '../../../src/testing/create_block';
import { defaultConfig } from '../../../src/testing/fixtures/config';
import { createFakeBlockHeader } from '../../fixtures';

describe('Create Block', () => {
	const chainID = Buffer.from('1000000', 'hex');
	const genesis = {
		passphrase: 'cake cruise harvest senior glare resist acoustic maze stuff lizard autumn educate',
		privateKey: Buffer.from(
			'e3198f98b67c84daccf748587c5bab14c51019c3b9068cc38c67f35032ec0b3af6213e1d20b2fce41b424bd1794e98947b1db6e6bbc53e5013443de829777a04',
			'hex',
		),
		publicKey: Buffer.from(
			'f6213e1d20b2fce41b424bd1794e98947b1db6e6bbc53e5013443de829777a04',
			'hex',
		),
		binaryAddress: Buffer.from('3d865276b83b6c7761fe8a1d9725eb9d45e710ee', 'hex'),
		address: 'lsknecmphq2n9en728fy37a7485tqvf7pn7nmbeb3',
	};

	let genesisBlock: Block;

	beforeAll(() => {
		genesisBlock = new Block(createFakeBlockHeader(), [], new BlockAssets());
	});

	it('should return a valid default block', async () => {
		const block = await createBlock({
			privateKey: genesis.privateKey,
			chainID,
			timestamp: genesisBlock.header.timestamp,
			previousBlockID: genesisBlock.header.id,
			header: {},
			transactions: [],
		});

		const expectedBlock = {
			header: {
				generatorAddress: genesis.binaryAddress,
				height: expect.any(Number),
				id: expect.any(Buffer),
				previousBlockID: expect.any(Buffer),
				signature: expect.any(Buffer),
				timestamp: expect.any(Number),
				transactionRoot: expect.any(Buffer),
				stateRoot: expect.any(Buffer),
				version: expect.any(Number),
			},
			transactions: [],
		};

		expect(block.header.toObject()).toEqual(expect.objectContaining(expectedBlock.header));
		expect(block.transactions).toBeEmpty();
	});

	it('should return a valid block for given block header', async () => {
		const expectedBlock = {
			header: {
				generatorAddress: genesis.binaryAddress,
				height: 200,
				id: expect.any(Buffer),
				previousBlockID: genesisBlock.header.id,
				signature: expect.any(Buffer),
				timestamp: expect.any(Number),
				transactionRoot: expect.any(Buffer),
				version: 0,
			},
			transactions: [],
		};

		const block = await createBlock({
			privateKey: genesis.privateKey,
			chainID,
			timestamp: genesisBlock.header.timestamp,
			previousBlockID: genesisBlock.header.id,
			header: {
				generatorAddress: genesis.binaryAddress,
				height: 200,
				version: 0,
			},
			transactions: [],
		});

		expect(block.header.toObject()).toEqual(expect.objectContaining(expectedBlock.header));
		expect(block.transactions).toBeEmpty();
	});

	it('should return a valid previous block id and timestamp from genesis block', async () => {
		const block = await createBlock({
			privateKey: genesis.privateKey,
			chainID,
			timestamp: genesisBlock.header.timestamp + 10,
			previousBlockID: genesisBlock.header.id,
			header: {},
			transactions: [],
		});

		expect(block.header.previousBlockID).toEqual(genesisBlock.header.id);
		expect(block.header.timestamp).toEqual(
			genesisBlock.header.timestamp + defaultConfig.genesis.blockTime,
		);
	});
});

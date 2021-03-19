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
import { GenesisBlock } from '@liskhq/lisk-chain';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { createBlock } from '../../../src/testing/create_block';

import * as devnetConfig from '../../fixtures/config/devnet/config.json';
import * as devnetGenesisBlock from '../../fixtures/config/devnet/genesis_block.json';
import { genesis } from '../../fixtures/accounts';
import { createGenesisBlock } from '../../../src/testing';
import { TokenModule } from '../../../src/modules/token/token_module';
import { defaultConfig } from '../../../src/testing/fixtures/config';

describe('Create Block', () => {
	const networkIdentifier = getNetworkIdentifier(
		Buffer.from(devnetGenesisBlock.header.id, 'hex'),
		devnetConfig.genesisConfig.communityIdentifier,
	).toString('hex');
	let genesisBlock: GenesisBlock;

	beforeAll(() => {
		const accounts = [{ address: genesis.address }];
		const initDelegates = [genesis.address];
		const modules = [TokenModule];

		genesisBlock = createGenesisBlock({ modules, accounts, initDelegates, timestamp: 0 })
			.genesisBlock;
	});

	it('should return a valid default block', () => {
		const block = createBlock({
			passphrase: genesis.passphrase,
			networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
			timestamp: genesisBlock.header.timestamp,
			previousBlockID: genesisBlock.header.id,
			header: {},
			payload: [],
		});

		const expectedBlock = {
			header: {
				asset: {
					maxHeightPreviouslyForged: expect.any(Number),
					maxHeightPrevoted: expect.any(Number),
					seedReveal: expect.any(Buffer),
				},
				generatorPublicKey: genesis.publicKey,
				height: expect.any(Number),
				id: expect.any(Buffer),
				previousBlockID: expect.any(Buffer),
				reward: expect.any(BigInt),
				signature: expect.any(Buffer),
				timestamp: expect.any(Number),
				transactionRoot: expect.any(Buffer),
				version: expect.any(Number),
			},
			payload: [],
		};

		expect(block).toEqual(expect.objectContaining(expectedBlock));
	});

	it('should return a valid block for given block header', () => {
		const expectedAsset = {
			maxHeightPreviouslyForged: 10,
			maxHeightPrevoted: 10,
			seedReveal: Buffer.from('seed reveal'),
		};

		const expectedBlock = {
			header: {
				asset: { ...expectedAsset },
				generatorPublicKey: genesis.publicKey,
				height: 200,
				id: expect.any(Buffer),
				previousBlockID: genesisBlock.header.id,
				reward: BigInt(5),
				signature: expect.any(Buffer),
				timestamp: expect.any(Number),
				transactionRoot: expect.any(Buffer),
				version: 0,
			},
			payload: [],
		};

		const block = createBlock({
			passphrase: genesis.passphrase,
			networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
			timestamp: genesisBlock.header.timestamp,
			previousBlockID: genesisBlock.header.id,
			header: {
				asset: { ...expectedAsset },
				generatorPublicKey: genesis.publicKey,
				height: 200,
				version: 0,
				reward: BigInt(5),
			},
			payload: [],
		});

		expect(block).toEqual(expect.objectContaining(expectedBlock));
	});

	it('should return a valid previous block id and timestamp from genesis block', () => {
		const block = createBlock({
			passphrase: genesis.passphrase,
			networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
			timestamp: genesisBlock.header.timestamp + 10,
			previousBlockID: genesisBlock.header.id,
			header: {},
			payload: [],
		});

		expect(block.header.previousBlockID).toEqual(genesisBlock.header.id);
		expect(block.header.timestamp).toEqual(
			genesisBlock.header.timestamp + defaultConfig.genesisConfig.blockTime,
		);
	});
});

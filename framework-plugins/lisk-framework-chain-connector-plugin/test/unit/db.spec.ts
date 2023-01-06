/*
 * Copyright © 2022 Lisk Foundation
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

import { AggregateCommit, db, testing, cryptography } from 'lisk-sdk';
import * as fs from 'fs-extra';
import { homedir } from 'os';
import { join } from 'path';
import { ChainConnectorStore, getDBInstance } from '../../src/db';
import { ADDRESS_LENGTH, BLS_PUBLIC_KEY_LENGTH, DB_KEY_SIDECHAIN } from '../../src/constants';
import { BlockHeader, CCMsFromEvents, ValidatorsData } from '../../src/types';

jest.mock('fs-extra');
const mockedFsExtra = fs as jest.Mocked<typeof fs>;

describe('Plugins DB', () => {
	const unresolvedRootPath = '~/.lisk/devnet';
	const dbName = 'lisk-framework-chain-connector-plugin.db';

	beforeEach(() => {
		jest.spyOn(db, 'Database');
	});

	it('should resolve to data directory', async () => {
		await getDBInstance(unresolvedRootPath);
		const rootPath = unresolvedRootPath.replace('~', homedir());
		const dirPath = join(rootPath, 'plugins/data', dbName);

		expect(mockedFsExtra.ensureDir).toHaveBeenCalledWith(dirPath);
	});

	it('should resolve to default plugin data path', async () => {
		const customUnresolvedRootPath = '~/.lisk/devnet/custom/path';

		await getDBInstance(customUnresolvedRootPath);
		const rootPath = customUnresolvedRootPath.replace('~', homedir());
		const dirPath = join(rootPath, 'plugins/data', dbName);

		expect(mockedFsExtra.ensureDir).toHaveBeenCalledWith(dirPath);
	});

	describe('ChainConnectorStore', () => {
		let chainConnectorStore: ChainConnectorStore;

		beforeEach(() => {
			chainConnectorStore = new ChainConnectorStore(
				new db.InMemoryDatabase() as never,
				DB_KEY_SIDECHAIN,
			);
		});

		describe('constructor', () => {
			it('should assign DB in the constructor', () => {
				expect(chainConnectorStore['_db']).toBeInstanceOf(db.InMemoryDatabase);
			});

			it('should assign chainType in the constructor', () => {
				expect(chainConnectorStore['_chainType']).toEqual(DB_KEY_SIDECHAIN);
			});
		});

		describe('blockHeaders', () => {
			let sampleBlockHeaders: BlockHeader[];

			beforeEach(() => {
				sampleBlockHeaders = new Array(4).fill(0).map(() => {
					const { id, ...block } = testing.createFakeBlockHeader().toObject();

					return block;
				});
			});

			it('should return empty array when there is no record', async () => {
				await expect(chainConnectorStore.getBlockHeaders()).resolves.toEqual([]);
			});

			it('should return list of blockHeaders', async () => {
				await chainConnectorStore.setBlockHeaders(sampleBlockHeaders);

				await expect(chainConnectorStore.getBlockHeaders()).resolves.toEqual(sampleBlockHeaders);
			});
		});

		describe('aggregatecommits', () => {
			let sampleAggregateCommits: AggregateCommit[];

			beforeEach(() => {
				sampleAggregateCommits = [
					{
						aggregationBits: Buffer.alloc(1),
						certificateSignature: cryptography.utils.getRandomBytes(32),
						height: 2,
					},
					{
						aggregationBits: Buffer.alloc(1),
						certificateSignature: cryptography.utils.getRandomBytes(32),
						height: 2,
					},
				];
			});

			it('should return empty array when there is no record', async () => {
				await expect(chainConnectorStore.getAggregateCommits()).resolves.toEqual([]);
			});

			it('should return list of aggregateCommits', async () => {
				await chainConnectorStore.setAggregateCommits(sampleAggregateCommits);

				await expect(chainConnectorStore.getAggregateCommits()).resolves.toEqual(
					sampleAggregateCommits,
				);
			});
		});

		describe('validatorsHashPreimage', () => {
			let sampleValidatorsData: ValidatorsData[];

			beforeEach(() => {
				sampleValidatorsData = new Array(2).fill(0).map(() => ({
					certificateThreshold: BigInt(68),
					validators: [
						{
							address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
							bftWeight: BigInt(1),
							blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
						},
						{
							address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
							bftWeight: BigInt(1),
							blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
						},
					],
					validatorsHash: cryptography.utils.getRandomBytes(54),
				}));
			});

			it('should return empty array when there is no record', async () => {
				await expect(chainConnectorStore.getValidatorsHashPreimage()).resolves.toEqual([]);
			});

			it('should return list of validatorsHashPreImage', async () => {
				await chainConnectorStore.setValidatorsHashPreimage(sampleValidatorsData);

				await expect(chainConnectorStore.getValidatorsHashPreimage()).resolves.toEqual(
					sampleValidatorsData,
				);
			});
		});

		describe('crossChainMessages', () => {
			let sampleCrossChainMessages: CCMsFromEvents[];

			beforeEach(() => {
				sampleCrossChainMessages = [
					{
						ccms: [
							{
								crossChainCommand: 'transfer',
								fee: BigInt(1),
								module: 'token',
								nonce: BigInt(10),
								params: Buffer.alloc(2),
								receivingChainID: Buffer.from('10000000', 'hex'),
								sendingChainID: Buffer.from('10000001', 'hex'),
								status: 1,
							},
						],
						height: 10,
						inclusionProof: {
							bitmap: Buffer.alloc(1),
							siblingHashes: [Buffer.alloc(2)],
						},
					},
					{
						ccms: [
							{
								crossChainCommand: 'transfer',
								fee: BigInt(2),
								module: 'token',
								nonce: BigInt(12),
								params: Buffer.alloc(2),
								receivingChainID: Buffer.from('01000000', 'hex'),
								sendingChainID: Buffer.from('00000001', 'hex'),
								status: 1,
							},
							{
								crossChainCommand: 'transfer',
								fee: BigInt(2),
								module: 'token',
								nonce: BigInt(13),
								params: Buffer.alloc(1),
								receivingChainID: Buffer.from('01000000', 'hex'),
								sendingChainID: Buffer.from('00000001', 'hex'),
								status: 1,
							},
						],
						height: 11,
						inclusionProof: {
							bitmap: Buffer.alloc(1),
							siblingHashes: [Buffer.alloc(2)],
						},
					},
				];
			});

			it('should return empty array when there is no record', async () => {
				await expect(chainConnectorStore.getCrossChainMessages()).resolves.toEqual([]);
			});

			it('should return list of crossChainMessages', async () => {
				await chainConnectorStore.setCrossChainMessages(sampleCrossChainMessages);

				await expect(chainConnectorStore.getCrossChainMessages()).resolves.toEqual(
					sampleCrossChainMessages,
				);
			});
		});
	});
});

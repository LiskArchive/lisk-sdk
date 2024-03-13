/* eslint-disable jest/no-commented-out-tests */
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

import {
	db,
	testing,
	cryptography,
	EMPTY_BYTES,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	SubmitMainchainCrossChainUpdateCommand,
	MODULE_NAME_INTEROPERABILITY,
	chain,
	codec,
	certificateSchema,
} from 'lisk-sdk';
import * as fs from 'fs-extra';
import { homedir } from 'os';
import { join } from 'path';
import { ChainConnectorDB, getDBInstance } from '../../src/db';
import { ADDRESS_LENGTH, BLS_PUBLIC_KEY_LENGTH } from '../../src/constants';
import { BlockHeader, CCMWithHeight, LastSentCCM, ValidatorsDataWithHeight } from '../../src/types';
import * as dbApi from '../../src/db';

jest.mock('fs-extra');
const mockedFsExtra = fs as jest.Mocked<typeof fs>;

describe('DB', () => {
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

	describe('ChainConnectorDB', () => {
		const customUnresolvedRootPath = '~/.lisk/devnet/custom/path';
		let chainConnectorDB: ChainConnectorDB;

		beforeEach(async () => {
			jest.spyOn(dbApi, 'getDBInstance').mockResolvedValue(new db.InMemoryDatabase() as never);
			chainConnectorDB = new ChainConnectorDB();
			await chainConnectorDB.load(customUnresolvedRootPath);
		});

		describe('constructor', () => {
			it('should assign DB in the constructor', () => {
				expect(chainConnectorDB['_db']).toBeInstanceOf(db.InMemoryDatabase);
			});
		});

		describe('blockHeader', () => {
			let sampleBlockHeaders: BlockHeader[];

			beforeEach(async () => {
				sampleBlockHeaders = [1, 2, 3, 4].map(index =>
					testing.createFakeBlockHeader({ height: index }).toObject(),
				);

				for (const blockHeader of sampleBlockHeaders) {
					await chainConnectorDB.saveToDBOnNewBlock(blockHeader);
				}
			});
			describe('saveToDBOnNewBlock', () => {
				it('should save block header and aggregateCommit', async () => {
					await chainConnectorDB.saveToDBOnNewBlock(sampleBlockHeaders[0]);
					const blockHeader = await chainConnectorDB.getBlockHeaderByHeight(
						sampleBlockHeaders[0].height,
					);

					expect(blockHeader).toEqual(sampleBlockHeaders[0]);
				});
			});

			describe('getBlockHeaderByHeight', () => {
				it('should get blockHeader by height', async () => {
					const blockHeader = await chainConnectorDB.getBlockHeaderByHeight(
						sampleBlockHeaders[0].height,
					);
					expect(blockHeader).toEqual(sampleBlockHeaders[0]);
				});
			});

			describe('getBlockHeadersBetweenHeights', () => {
				it('should return block headers between the given heights', async () => {
					const fromHeight = 2;
					const toHeight = 4;
					const blockHeaders = await chainConnectorDB.getBlockHeadersBetweenHeights(
						fromHeight,
						toHeight,
					);

					expect(blockHeaders).toHaveLength(toHeight + 1 - fromHeight);
					expect(blockHeaders.reverse()).toEqual(
						sampleBlockHeaders.filter(b => b.height >= fromHeight && b.height <= toHeight),
					);
				});
			});

			describe('deleteBlockHeadersBetweenHeight', () => {
				it('should delete block headers between the given heights', async () => {
					const fromHeight = 2;
					const toHeight = 4;
					await chainConnectorDB.deleteBlockHeadersBetweenHeight(fromHeight, toHeight);
					const blockHeaders = await chainConnectorDB.getBlockHeadersBetweenHeights(
						fromHeight,
						toHeight,
					);

					expect(blockHeaders).toHaveLength(0);
				});
			});
		});

		describe('aggregateCommit', () => {
			let sampleBlockHeaders: BlockHeader[];

			beforeEach(async () => {
				sampleBlockHeaders = [10, 11, 12, 13].map(index =>
					testing
						.createFakeBlockHeader({
							height: index,
							aggregateCommit: {
								aggregationBits: Buffer.alloc(1),
								certificateSignature: cryptography.utils.hash(Buffer.alloc(2)),
								height: index - 4,
							},
						})
						.toObject(),
				);
				for (const blockHeader of sampleBlockHeaders) {
					await chainConnectorDB.saveToDBOnNewBlock(blockHeader);
				}
			});

			describe('getAggregateCommitByHeight', () => {
				it('should return aggregateCommit for the given height', async () => {
					await expect(
						chainConnectorDB.getAggregateCommitByHeight(
							sampleBlockHeaders[0].aggregateCommit.height,
						),
					).resolves.toEqual(sampleBlockHeaders[0].aggregateCommit);
				});

				it('should return undefined for the given height where no aggregateCommit exists', async () => {
					await expect(
						chainConnectorDB.getAggregateCommitByHeight(
							sampleBlockHeaders[0].aggregateCommit.height + 1000,
						),
					).resolves.toBeUndefined();
				});
			});

			describe('getAggregateCommitBetweenHeights', () => {
				it('should return aggregateCommit between the given heights', async () => {
					const fromHeight = 7;
					const toHeight = 9;
					const aggregateCommits = await chainConnectorDB.getAggregateCommitBetweenHeights(
						fromHeight,
						toHeight,
					);

					expect(aggregateCommits).toHaveLength(toHeight + 1 - fromHeight);
					expect(aggregateCommits.reverse()).toEqual(
						sampleBlockHeaders
							.map(h => h.aggregateCommit)
							.filter(b => b.height >= fromHeight && b.height <= toHeight),
					);
				});
			});

			describe('deleteAggregateCommitsBetweenHeight', () => {
				it('should delete block headers between the given heights', async () => {
					const fromHeight = 2;
					const toHeight = 4;
					await chainConnectorDB.deleteAggregateCommitsBetweenHeight(fromHeight, toHeight);
					const aggregateCommits = await chainConnectorDB.getAggregateCommitBetweenHeights(
						fromHeight,
						toHeight,
					);

					expect(aggregateCommits).toHaveLength(0);
				});
			});

			describe('deleteAggregateCommitByHeight', () => {
				it('should delete block headers with the given height', async () => {
					await chainConnectorDB.deleteAggregateCommitByHeight(
						sampleBlockHeaders[0].aggregateCommit.height,
					);
					const aggregateCommit = await chainConnectorDB.getAggregateCommitByHeight(
						sampleBlockHeaders[0].aggregateCommit.height,
					);

					expect(aggregateCommit).toBeUndefined();
				});
			});
		});

		describe('validatorsData', () => {
			let sampleValidatorsData: ValidatorsDataWithHeight[];

			beforeEach(async () => {
				sampleValidatorsData = [20, 21].map(index => ({
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
					height: index,
				}));

				for (const validatorData of sampleValidatorsData) {
					await chainConnectorDB.setValidatorsDataByHash(
						validatorData.validatorsHash,
						validatorData,
						validatorData.height,
					);
				}
			});

			describe('get/setValidatorsDataByHash', () => {
				it('should return validators data by the given hash', async () => {
					await expect(
						chainConnectorDB.getValidatorsDataByHash(sampleValidatorsData[0].validatorsHash),
					).resolves.toEqual(sampleValidatorsData[0]);
				});

				it('should return undefined for hash with no validators data', async () => {
					await expect(
						chainConnectorDB.getValidatorsDataByHash(cryptography.utils.hash(EMPTY_BYTES)),
					).resolves.toBeUndefined();
				});
			});

			describe('deleteValidatorsDataByHash', () => {
				it('should delete validators data for a given hash', async () => {
					await chainConnectorDB.deleteValidatorsDataByHash(sampleValidatorsData[0].validatorsHash);

					await expect(
						chainConnectorDB.getValidatorsDataByHash(sampleValidatorsData[0].validatorsHash),
					).resolves.toBeUndefined();
				});
			});

			describe('deleteValidatorsHashByHeight', () => {
				it('should delete validators data for a given height', async () => {
					await chainConnectorDB.deleteValidatorsHashByHeight(sampleValidatorsData[0].height);

					await expect(
						chainConnectorDB.getValidatorsDataByHeight(sampleValidatorsData[0].height),
					).resolves.toBeUndefined();
				});
			});

			describe('deleteValidatorsHashBetweenHeights', () => {
				it('should delete validators data between given heights', async () => {
					const fromHeight = 20;
					const toHeight = 21;
					await chainConnectorDB.deleteValidatorsHashBetweenHeights(fromHeight, toHeight);
					const validatorsDataAtFromHeight = await chainConnectorDB.getValidatorsDataByHeight(
						fromHeight,
					);
					const validatorsDataAtToHeight = await chainConnectorDB.getValidatorsDataByHeight(
						toHeight,
					);

					expect(validatorsDataAtFromHeight).toBeUndefined();
					expect(validatorsDataAtToHeight).toBeUndefined();
				});
			});

			describe('getAllValidatorsData', () => {
				it('should return all the validators data present in the db', async () => {
					const allValidatorsData = await chainConnectorDB.getAllValidatorsData();
					expect(allValidatorsData).toHaveLength(sampleValidatorsData.length);
				});
			});
		});

		describe('ccmByHeight', () => {
			let sampleCrossChainMessages: Record<string, CCMWithHeight[]>;

			beforeEach(async () => {
				sampleCrossChainMessages = {
					'10': [
						{
							crossChainCommand: 'transfer',
							fee: BigInt(1),
							module: 'token',
							nonce: BigInt(10),
							params: Buffer.alloc(2),
							receivingChainID: Buffer.from('10000000', 'hex'),
							sendingChainID: Buffer.from('10000001', 'hex'),
							status: 1,
							height: 10,
						},
					],
					'11': [
						{
							crossChainCommand: 'transfer',
							fee: BigInt(2),
							module: 'token',
							nonce: BigInt(12),
							params: Buffer.alloc(2),
							receivingChainID: Buffer.from('01000000', 'hex'),
							sendingChainID: Buffer.from('00000001', 'hex'),
							status: 1,
							height: 11,
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
							height: 11,
						},
					],
					'12': [
						{
							crossChainCommand: 'transfer',
							fee: BigInt(2),
							module: 'token',
							nonce: BigInt(12),
							params: Buffer.alloc(2),
							receivingChainID: Buffer.from('01000000', 'hex'),
							sendingChainID: Buffer.from('00000001', 'hex'),
							status: 1,
							height: 12,
						},
					],
					'13': [
						{
							crossChainCommand: 'transfer',
							fee: BigInt(2),
							module: 'token',
							nonce: BigInt(13),
							params: Buffer.alloc(1),
							receivingChainID: Buffer.from('01000000', 'hex'),
							sendingChainID: Buffer.from('00000001', 'hex'),
							status: 1,
							height: 13,
						},
					],
				};
				await chainConnectorDB.setCCMsByHeight(sampleCrossChainMessages['10'], 10);
				await chainConnectorDB.setCCMsByHeight(sampleCrossChainMessages['11'], 11);
				await chainConnectorDB.setCCMsByHeight(sampleCrossChainMessages['12'], 12);
				await chainConnectorDB.setCCMsByHeight(sampleCrossChainMessages['13'], 13);
			});

			describe('set/getCCMsByHeight', () => {
				it('should return empty array when there is no record for a given height', async () => {
					await expect(chainConnectorDB.getCCMsByHeight(14)).resolves.toEqual([]);
				});

				it('should return list of crossChainMessages for a given height', async () => {
					await expect(chainConnectorDB.getCCMsByHeight(11)).resolves.toEqual(
						sampleCrossChainMessages['11'],
					);
				});
			});

			describe('getCCMsBetweenHeights', () => {
				it('should return all the ccms between then given heights', async () => {
					const fromHeight = 10;
					const toHeight = 12;
					const ccms = await chainConnectorDB.getCCMsBetweenHeights(fromHeight, toHeight);
					expect(ccms).toHaveLength(
						sampleCrossChainMessages['10'].length +
							sampleCrossChainMessages['11'].length +
							sampleCrossChainMessages['12'].length,
					);
					expect(ccms).toEqual(
						[
							...sampleCrossChainMessages['10'],
							...sampleCrossChainMessages['11'].reverse(),
							...sampleCrossChainMessages['12'],
						].reverse(),
					);
				});
			});
		});

		describe('lastSentCCM', () => {
			let sampleLastSentCCM: LastSentCCM;

			beforeEach(() => {
				sampleLastSentCCM = {
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
					fee: BigInt(1000),
					height: 1,
					module: 'token',
					nonce: BigInt(1),
					params: Buffer.alloc(1),
					receivingChainID: Buffer.from('04000000', 'hex'),
					sendingChainID: Buffer.from('04000001', 'hex'),
					status: 1,
					outboxSize: 2,
				};
			});

			describe('getLastSentCCM', () => {
				it('should return undefined when there is no record', async () => {
					await expect(chainConnectorDB.getLastSentCCM()).resolves.toBeUndefined();
				});

				it('should return lastSentCCM', async () => {
					await chainConnectorDB.setLastSentCCM(sampleLastSentCCM);

					await expect(chainConnectorDB.getLastSentCCM()).resolves.toEqual(sampleLastSentCCM);
				});
			});
		});

		describe('CCUs', () => {
			let listOfCCUs: chain.TransactionAttrs[];
			let listOfCCUsJSON: Record<string, unknown>[];

			beforeEach(() => {
				const sampleBlockHeader = testing.createFakeBlockHeader({});
				const certificate = {
					aggregationBits: Buffer.alloc(2),
					blockID: sampleBlockHeader.id,
					height: sampleBlockHeader.height,
					signature: sampleBlockHeader.signature,
					stateRoot: sampleBlockHeader.stateRoot,
					timestamp: sampleBlockHeader.timestamp,
					validatorsHash: sampleBlockHeader.validatorsHash,
				};

				const params = {
					activeValidatorsUpdate: {
						blsKeysUpdate: [],
						bftWeightsUpdate: [],
						bftWeightsUpdateBitmap: Buffer.alloc(0),
					},
					certificate: codec.encode(certificateSchema, certificate),
					certificateThreshold: BigInt(1),
					inboxUpdate: {
						crossChainMessages: [],
						messageWitnessHashes: [],
						outboxRootWitness: {
							bitmap: Buffer.alloc(1),
							siblingHashes: [],
						},
					},
					sendingChainID: Buffer.from('04000001', 'hex'),
				};

				const paramsJSON = {
					activeValidatorsUpdate: {
						blsKeysUpdate: [],
						bftWeightsUpdate: [],
						bftWeightsUpdateBitmap: '',
					},
					certificate: {
						aggregationBits: Buffer.alloc(2).toString('hex'),
						blockID: sampleBlockHeader.id.toString('hex'),
						height: sampleBlockHeader.height,
						signature: sampleBlockHeader.signature.toString('hex'),
						stateRoot: sampleBlockHeader.stateRoot?.toString('hex'),
						timestamp: sampleBlockHeader.timestamp,
						validatorsHash: sampleBlockHeader.validatorsHash?.toString('hex'),
					},
					certificateThreshold: '1',
					inboxUpdate: {
						crossChainMessages: [],
						messageWitnessHashes: [],
						outboxRootWitness: {
							bitmap: '00',
							siblingHashes: [],
						},
					},
					sendingChainID: '04000001',
				};

				const ccuOne = testing.createTransaction({
					commandClass: SubmitMainchainCrossChainUpdateCommand as any,
					module: MODULE_NAME_INTEROPERABILITY,
					params,
					chainID: Buffer.from('04000001', 'hex'),
				});

				const ccuTwo = testing.createTransaction({
					commandClass: SubmitMainchainCrossChainUpdateCommand as any,
					module: MODULE_NAME_INTEROPERABILITY,
					params,
					chainID: Buffer.from('04000005', 'hex'),
					fee: BigInt(100000),
					nonce: BigInt(2),
				});

				listOfCCUs = [
					{ ...ccuOne.toObject(), id: ccuOne.id },
					{ ...ccuTwo.toObject(), id: ccuTwo.id },
				].sort((a, b) => Number(BigInt(b.nonce) - BigInt(a.nonce)));

				listOfCCUsJSON = [
					{ ...ccuTwo.toJSON(), params: { ...paramsJSON }, id: ccuTwo.id.toString('hex') },
					{ ...ccuOne.toJSON(), params: { ...paramsJSON }, id: ccuOne.id.toString('hex') },
				].sort((a, b) => Number(BigInt(b.nonce) - BigInt(a.nonce)));
			});

			describe('listOfCCUs', () => {
				it('should return empty array when there is no record', async () => {
					const { list, total } = await chainConnectorDB.getListOfCCUs();
					expect(list).toEqual([]);
					expect(total).toBe(0);
				});

				it('should return list of CCUs', async () => {
					for (const ccu of listOfCCUs) {
						await chainConnectorDB.setCCUTransaction(ccu);
					}

					const { list, total } = await chainConnectorDB.getListOfCCUs();

					expect(list).toEqual(listOfCCUsJSON);
					expect(total).toBe(2);
				});
			});

			describe('deleteCCUTransaction', () => {
				it('should delete ccu by ID when there is no record', async () => {
					for (const ccu of listOfCCUs) {
						await chainConnectorDB.setCCUTransaction(ccu);
					}

					await chainConnectorDB.deleteCCUTransaction(listOfCCUs[0]?.id as Buffer);
					const { list } = await chainConnectorDB.getListOfCCUs();
					const foundCCU = list.find(ccu => ccu.id === listOfCCUs[0]?.id?.toString('hex'));
					expect(foundCCU).toBeUndefined();
				});
			});
		});
	});
});

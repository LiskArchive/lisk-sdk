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
	testing,
	cryptography,
	db,
	chain,
	codec,
	certificateSchema,
	SubmitMainchainCrossChainUpdateCommand,
	MODULE_NAME_INTEROPERABILITY,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	BLS_PUBLIC_KEY_LENGTH,
	PluginEndpointContext,
} from 'lisk-sdk';
import * as chainConnectorDB from '../../src/db';
import { BlockHeader, CCMWithHeight, LastSentCCM, ValidatorsDataWithHeight } from '../../src/types';
import { ChainConnectorEndpoint } from '../../src/endpoint';
import { ADDRESS_LENGTH } from '../../src/constants';
import {
	aggregateCommitToJSON,
	ccmsWithHeightToJSON,
	validatorsHashPreimagetoJSON,
} from '../../src/utils';

describe('endpoints', () => {
	const defaultPrivateKey =
		'6c5e2b24ff1cc99da7a49bd28420b93b2a91e2e2a3b0a0ce07676966b707d3c2859bbd02747cf8e26dab592c02155dfddd4a16b0fe83fd7e7ffaec0b5391f3f7';
	const defaultPassword = '123';

	let connectorDB: chainConnectorDB.ChainConnectorDB;
	let inMemoryDB: db.Database;
	let endpoint: ChainConnectorEndpoint;
	let endpointContext: PluginEndpointContext;

	beforeEach(async () => {
		inMemoryDB = new db.InMemoryDatabase() as any;
		connectorDB = new chainConnectorDB.ChainConnectorDB();
		connectorDB['_db'] = inMemoryDB;
		const encryptedKey = await cryptography.encrypt.encryptMessageWithPassword(
			Buffer.from(defaultPrivateKey, 'hex'),
			defaultPassword,
			{
				kdfparams: {
					iterations: 1,
					memorySize: 256,
					parallelism: 1,
				},
			},
		);
		const defaultEncryptedPrivateKey = cryptography.encrypt.stringifyEncryptedMessage(encryptedKey);
		endpoint = new ChainConnectorEndpoint();
		endpoint.load(defaultEncryptedPrivateKey, connectorDB);
	});

	afterAll(() => {
		connectorDB.close();
	});

	describe('getSentCCUs', () => {
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

		it('should return sent ccus', async () => {
			for (const ccu of listOfCCUs) {
				await connectorDB.setCCUTransaction(ccu);
			}

			const { list, total } = await endpoint.getSentCCUs(endpointContext);

			expect(list).toEqual(listOfCCUsJSON);
			expect(total).toBe(2);
		});
	});

	describe('getAggregateCommits', () => {
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
				await connectorDB.saveToDBOnNewBlock(blockHeader);
			}
		});

		it('should return aggregateCommit between the given heights', async () => {
			const fromHeight = 7;
			const toHeight = 9;
			endpointContext = testing.createTransientModuleEndpointContext({
				params: { from: fromHeight, to: toHeight },
			});
			const aggregateCommits = await endpoint.getAggregateCommits(endpointContext);

			expect(aggregateCommits).toHaveLength(toHeight + 1 - fromHeight);
			expect(aggregateCommits.reverse()).toEqual(
				sampleBlockHeaders
					.map(h => h.aggregateCommit)
					.map(a => aggregateCommitToJSON(a))
					.filter(b => b.height >= fromHeight && b.height <= toHeight),
			);
		});
	});

	describe('getBlockHeaders', () => {
		let sampleBlockHeaders: BlockHeader[];

		beforeEach(async () => {
			sampleBlockHeaders = [1, 2, 3, 4].map(index =>
				testing.createFakeBlockHeader({ height: index }).toObject(),
			);

			for (const blockHeader of sampleBlockHeaders) {
				await connectorDB.saveToDBOnNewBlock(blockHeader);
			}
		});

		it('should return block headers between the given heights', async () => {
			const fromHeight = 2;
			const toHeight = 4;
			endpointContext = testing.createTransientModuleEndpointContext({
				params: { from: fromHeight, to: toHeight },
			});
			const blockHeaders = await endpoint.getBlockHeaders(endpointContext);

			expect(blockHeaders).toHaveLength(toHeight + 1 - fromHeight);
			expect(
				sampleBlockHeaders
					.map(blockHeader => new chain.BlockHeader(blockHeader).toJSON())
					.filter(a => a.height >= 2)
					.reverse(),
			).toEqual(blockHeaders);
		});
	});

	describe('getCrossChainMessages', () => {
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
			await connectorDB.setCCMsByHeight(sampleCrossChainMessages['10'], 10);
			await connectorDB.setCCMsByHeight(sampleCrossChainMessages['11'], 11);
			await connectorDB.setCCMsByHeight(sampleCrossChainMessages['12'], 12);
			await connectorDB.setCCMsByHeight(sampleCrossChainMessages['13'], 13);
		});

		it('should return all the ccms between then given heights', async () => {
			const fromHeight = 10;
			const toHeight = 12;
			endpointContext = testing.createTransientModuleEndpointContext({
				params: { from: fromHeight, to: toHeight },
			});
			const ccms = await endpoint.getCrossChainMessages(endpointContext);
			expect(ccms).toHaveLength(
				sampleCrossChainMessages['10'].length +
					sampleCrossChainMessages['11'].length +
					sampleCrossChainMessages['12'].length,
			);
			expect(ccms).toEqual(
				ccmsWithHeightToJSON([
					...sampleCrossChainMessages['10'],
					...sampleCrossChainMessages['11'].reverse(),
					...sampleCrossChainMessages['12'],
				]).reverse(),
			);
		});
	});

	describe('getLastSentCCM', () => {
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

		it('should return undefined when there is no record', async () => {
			endpointContext = testing.createTransientModuleEndpointContext({});
			await expect(endpoint.getLastSentCCM(endpointContext)).rejects.toThrow(
				'No CCM was sent so far',
			);
		});

		it('should return lastSentCCM', async () => {
			endpointContext = testing.createTransientModuleEndpointContext({});

			await connectorDB.setLastSentCCM(sampleLastSentCCM);

			await expect(endpoint.getLastSentCCM(endpointContext)).resolves.toEqual({
				...sampleLastSentCCM,
				fee: sampleLastSentCCM.fee.toString(),
				nonce: sampleLastSentCCM.nonce.toString(),
				params: sampleLastSentCCM.params.toString('hex'),
				receivingChainID: sampleLastSentCCM.receivingChainID.toString('hex'),
				sendingChainID: sampleLastSentCCM.sendingChainID.toString('hex'),
			});
		});
	});

	describe('getAllValidatorsData', () => {
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
				await connectorDB.setValidatorsDataByHash(
					validatorData.validatorsHash,
					validatorData,
					validatorData.height,
				);
			}
		});

		it('should return all the validators data present in the db', async () => {
			endpointContext = testing.createTransientModuleEndpointContext({});
			const allValidatorsData = await endpoint.getAllValidatorsData(endpointContext);
			expect(allValidatorsData).toHaveLength(sampleValidatorsData.length);
			expect(allValidatorsData).toEqual(
				validatorsHashPreimagetoJSON(
					sampleValidatorsData.sort((a, b) => b.validatorsHash.compare(a.validatorsHash)),
				),
			);
		});
	});
});

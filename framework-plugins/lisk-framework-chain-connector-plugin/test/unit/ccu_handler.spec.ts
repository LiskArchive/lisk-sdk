/*
 * Copyright © 2024 Lisk Foundation
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
	ActiveValidatorsUpdate,
	Certificate,
	CrossChainUpdateTransactionParams,
	EMPTY_BYTES,
	LastCertificate,
	MODULE_NAME_INTEROPERABILITY,
	Transaction,
	ccmSchema,
	ccuParamsSchema,
	certificateSchema,
	codec,
	cryptography,
	testing,
	transactions,
} from 'lisk-sdk';
import { when } from 'jest-when';
import { CCM_SEND_SUCCESS, COMMAND_NAME_SUBMIT_MAINCHAIN_CCU } from '../../src/constants';
import { CCUHandler } from '../../src/ccu_handler';
import { LastSentCCM, Logger, ValidatorsDataWithHeight } from '../../src/types';
import { getSampleCCM } from '../utils/sampleCCM';
import * as inboxUtility from '../../src/inbox_update';
import * as certificateUtility from '../../src/certificate_generation';
import { calculateActiveValidatorsUpdate } from '../../src/active_validators_update';
import { getCertificateFromAggregateCommitByBlockHeader } from '../../src/certificate_generation';

describe('CCUHandler', () => {
	const apiClientMocks = (): any => ({
		connect: jest.fn(),
		disconnect: jest.fn(),
		subscribe: jest.fn(),
		postTransaction: jest.fn(),
		getTransactionByID: jest.fn(),
		getAuthAccountNonceFromPublicKey: jest.fn(),
		getNodeInfo: jest.fn(),
		getChannelAccount: jest.fn(),
		getChainAccount: jest.fn(),
		hasUserTokenAccount: jest.fn(),
		getTokenInitializationFee: jest.fn(),
		getBFTHeights: jest.fn(),
		getEvents: jest.fn(),
		getMetadataByModuleName: jest.fn(),
		getInclusionProof: jest.fn(),
		getSavedInclusionProofAtHeight: jest.fn(),
		getBFTParametersAtHeight: jest.fn(),
	});

	const ccmSendSuccessDataSchema = {
		$id: '/interoperability/events/ccmSendSuccess',
		type: 'object',
		required: ['ccm'],
		properties: {
			ccm: {
				fieldNumber: 1,
				type: ccmSchema.type,
				required: [...ccmSchema.required],
				properties: {
					...ccmSchema.properties,
				},
			},
		},
	};

	let ccuHandler: CCUHandler;
	let config: any;
	let initArgs: any;
	let chainConnectorDBMock: any;
	let receivingChainAPIClientMock: any;
	let sendingChainAPIClientMock: any;
	let sampleLastCertificate: LastCertificate;
	let sampleValidatorsDataAtLastCertificate: ValidatorsDataWithHeight;

	beforeEach(() => {
		config = {
			registrationHeight: 10,
			ownChainID: Buffer.from('04000000', 'hex'),
			receivingChainID: Buffer.from('04000001', 'hex'),
			maxCCUSize: 108000,
			ccuFee: '10000000',
			isSaveCCU: false,
		};
		sampleLastCertificate = {
			height: 12,
			stateRoot: cryptography.utils.hash(cryptography.utils.getRandomBytes(2)),
			timestamp: Math.floor(Date.now() / 1000),
			validatorsHash: cryptography.utils.hash(cryptography.utils.getRandomBytes(2)),
		};
		sampleValidatorsDataAtLastCertificate = {
			validators: [
				{
					address: cryptography.utils.getRandomBytes(32),
					bftWeight: BigInt(1),
					blsKey: cryptography.utils.getRandomBytes(54),
				},
			],
			validatorsHash: sampleLastCertificate.validatorsHash,
			certificateThreshold: BigInt(1),
			height: 20,
		};

		receivingChainAPIClientMock = apiClientMocks();
		sendingChainAPIClientMock = apiClientMocks();

		chainConnectorDBMock = {
			getListOfCCUs: jest.fn(),
			saveToDBOnNewBlock: jest.fn(),
			getBlockHeaderByHeight: jest.fn(),
			deleteBlockHeadersBetweenHeight: jest.fn(),
			deleteBlockHeaderByHeight: jest.fn(),
			getAggregateCommitByHeight: jest.fn(),
			getAggregateCommitBetweenHeights: jest.fn(),
			deleteAggregateCommitsBetweenHeight: jest.fn(),
			deleteAggregateCommitByHeight: jest.fn(),
			getValidatorsDataByHash: jest.fn(),
			setValidatorsDataByHash: jest.fn(),
			getValidatorsDataByHeight: jest.fn(),
			deleteValidatorsHashByHeight: jest.fn(),
			deleteValidatorsHashBetweenHeights: jest.fn(),
			deleteValidatorsDataByHash: jest.fn(),
			getCCMsByHeight: jest.fn(),
			getCCMsBetweenHeights: jest.fn(),
			deleteCCMsBetweenHeight: jest.fn(),
			deleteCCMsByHeight: jest.fn(),
			setCCMsByHeight: jest.fn(),
			getLastSentCCM: jest.fn(),
			setLastSentCCM: jest.fn(),
			setCCUTransaction: jest.fn(),
			deleteCCUTransaction: jest.fn(),
			setPrivateKey: jest.fn(),
			deletePrivateKey: jest.fn(),
			privateKey: undefined,
		};

		sampleLastCertificate = {
			height: 21,
			stateRoot: cryptography.utils.hash(Buffer.alloc(3)),
			timestamp: Math.floor(Date.now() / 1000),
			validatorsHash: cryptography.utils.hash(Buffer.alloc(3)),
		};

		initArgs = {
			logger: testing.mocks.loggerMock,
			db: chainConnectorDBMock,
			sendingChainAPIClient: sendingChainAPIClientMock,
			receivingChainAPIClient: receivingChainAPIClientMock,
			lastCertificate: sampleLastCertificate,
			interoperabilityMetadata: {
				stores: [
					{
						key: '83ed0d250000',
						data: {
							$id: '/modules/interoperability/outbox',
						},
					},
				],
				events: [
					{
						name: CCM_SEND_SUCCESS,
						data: ccmSendSuccessDataSchema,
					},
				],
				name: MODULE_NAME_INTEROPERABILITY,
			},
		};

		ccuHandler = new CCUHandler(config);
	});

	describe('load', () => {
		beforeEach(() => {
			ccuHandler.load(initArgs);
		});

		it('Should set all the properties and calculate _outboxKeyForInclusionProof', () => {
			const expectedOutboxKey = Buffer.concat([
				Buffer.from(initArgs.interoperabilityMetadata.stores[0].key as string, 'hex'),
				cryptography.utils.hash(config.receivingChainID),
			]);

			expect(ccuHandler['_outboxKeyForInclusionProof']).toEqual(expectedOutboxKey);
		});
	});

	describe('computeCCU', () => {
		let sampleLastSentCCM: LastSentCCM;

		beforeEach(() => {
			sampleLastSentCCM = {
				height: 12,
				outboxSize: 2,
				...getSampleCCM(),
			};
			ccuHandler.load(initArgs);
		});

		it('should return if no certificate was found and last certificate height is 0', async () => {
			jest.spyOn(ccuHandler as any, '_findCertificate').mockResolvedValue(undefined);
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 0,
			};
			const result = await ccuHandler.computeCCU(sampleLastCertificate, sampleLastSentCCM);
			expect(result).toBeUndefined();
		});

		it('should return undefined and log when no pending CCMs and no new certificate', async () => {
			jest.spyOn(ccuHandler as any, '_findCertificate').mockResolvedValue(undefined);
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 2,
			};
			jest.spyOn(ccuHandler['_db'], 'getCCMsBetweenHeights').mockResolvedValue([]);
			jest
				.spyOn(ccuHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ outbox: { size: 2 } } as any);
			jest.spyOn(initArgs.logger as Logger, 'info');

			const result = await ccuHandler.computeCCU(sampleLastCertificate, sampleLastSentCCM);

			expect(result).toBeUndefined();
			expect((initArgs.logger as Logger).info).toHaveBeenCalledWith(
				'CCU cant be created as there are no pending CCMs for the last certificate.',
			);
		});

		it('should return valid CCU params when there are pending CCMs with old certificate', async () => {
			const crossChainMessages = [Buffer.alloc(2)];
			const lastCCMToBeSent = { ...getSampleCCM(), height: 2, outboxSize: 2 };
			const messageWitnessHashes: Buffer[] = [];
			const outboxRootWitness = { bitmap: Buffer.alloc(0), siblingHashes: [] };
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 2,
			};

			jest.spyOn(ccuHandler as any, '_findCertificate').mockResolvedValue(undefined);
			jest.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash');
			jest.spyOn(ccuHandler['_db'], 'getCCMsBetweenHeights').mockResolvedValue([]);
			jest
				.spyOn(ccuHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ outbox: { size: 2 } } as any);
			jest.spyOn(initArgs.logger as Logger, 'info');
			jest
				.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash')
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);
			jest.spyOn(inboxUtility, 'calculateMessageWitnesses').mockReturnValue({
				crossChainMessages: [Buffer.alloc(2)],
				lastCCMToBeSent,
				messageWitnessHashes,
			});

			when(ccuHandler['_db'].getValidatorsDataByHash)
				.calledWith(sampleLastCertificate.validatorsHash)
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);

			const result = await ccuHandler.computeCCU(sampleLastCertificate, sampleLastSentCCM);

			expect(result).toEqual({
				ccuParams: {
					sendingChainID: config.ownChainID,
					activeValidatorsUpdate: {
						bftWeightsUpdate: [],
						bftWeightsUpdateBitmap: Buffer.alloc(0),
						blsKeysUpdate: [],
					} as ActiveValidatorsUpdate,
					certificate: EMPTY_BYTES,
					certificateThreshold: sampleValidatorsDataAtLastCertificate.certificateThreshold,
					inboxUpdate: {
						crossChainMessages,
						messageWitnessHashes,
						outboxRootWitness,
					},
				},
				lastCCMToBeSent,
			});
		});

		it('should throw error when no validators data was found for validators hash from last certificate', async () => {
			const lastCCMToBeSent = { ...getSampleCCM(), height: 2, outboxSize: 2 };
			const messageWitnessHashes: Buffer[] = [];
			const sampleBlockHeader = testing.createFakeBlockHeader({ height: 5 });
			const newCertificate: Certificate = {
				aggregationBits: Buffer.alloc(2),
				blockID: sampleBlockHeader.id,
				height: sampleBlockHeader.height,
				signature: sampleBlockHeader.signature,
				stateRoot: sampleBlockHeader.stateRoot as Buffer,
				timestamp: sampleBlockHeader.timestamp,
				validatorsHash: sampleLastCertificate.validatorsHash,
			};
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 2,
			};

			jest.spyOn(ccuHandler as any, '_findCertificate').mockResolvedValue(newCertificate);
			jest.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash');
			jest.spyOn(ccuHandler['_db'], 'getCCMsBetweenHeights').mockResolvedValue([]);
			jest
				.spyOn(ccuHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ outbox: { size: 2 } } as any);
			jest.spyOn(initArgs.logger as Logger, 'info');
			jest
				.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash')
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getSavedInclusionProofAtHeight')
				.mockResolvedValue({
					proof: {
						queries: [
							{
								bitmap: Buffer.alloc(1),
								key: ccuHandler['_outboxKeyForInclusionProof'],
								value: Buffer.alloc(2),
							},
						],
						siblingHashes: [],
					},
				});
			jest.spyOn(inboxUtility, 'calculateMessageWitnesses').mockReturnValue({
				crossChainMessages: [Buffer.alloc(2)],
				lastCCMToBeSent,
				messageWitnessHashes,
			});

			when(ccuHandler['_db'].getValidatorsDataByHash)
				.calledWith(sampleLastCertificate.validatorsHash)
				.mockResolvedValue(undefined);

			await expect(ccuHandler.computeCCU(sampleLastCertificate, sampleLastSentCCM)).rejects.toThrow(
				`No validators data at last certificate with hash at ${sampleLastCertificate.validatorsHash.toString(
					'hex',
				)}`,
			);
		});

		it('should throw error when no validators data was found for validators hash from new certificate', async () => {
			const lastCCMToBeSent = { ...getSampleCCM(), height: 2, outboxSize: 2 };
			const messageWitnessHashes: Buffer[] = [];
			const sampleBlockHeader = testing.createFakeBlockHeader({ height: 5 });
			const newCertificate: Certificate = {
				aggregationBits: Buffer.alloc(2),
				blockID: sampleBlockHeader.id,
				height: sampleBlockHeader.height,
				signature: sampleBlockHeader.signature,
				stateRoot: sampleBlockHeader.stateRoot as Buffer,
				timestamp: sampleBlockHeader.timestamp,
				validatorsHash: sampleBlockHeader.validatorsHash as Buffer,
			};
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 2,
			};

			jest.spyOn(ccuHandler as any, '_findCertificate').mockResolvedValue(newCertificate);
			jest.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash');
			jest.spyOn(ccuHandler['_db'], 'getCCMsBetweenHeights').mockResolvedValue([]);
			jest
				.spyOn(ccuHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ outbox: { size: 2 } } as any);
			jest.spyOn(initArgs.logger as Logger, 'info');
			jest
				.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash')
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getSavedInclusionProofAtHeight')
				.mockResolvedValue({
					proof: {
						queries: [
							{
								bitmap: Buffer.alloc(1),
								key: ccuHandler['_outboxKeyForInclusionProof'],
								value: Buffer.alloc(2),
							},
						],
						siblingHashes: [],
					},
				});
			jest.spyOn(inboxUtility, 'calculateMessageWitnesses').mockReturnValue({
				crossChainMessages: [Buffer.alloc(2)],
				lastCCMToBeSent,
				messageWitnessHashes,
			});

			when(ccuHandler['_db'].getValidatorsDataByHash)
				.calledWith(sampleLastCertificate.validatorsHash)
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);

			when(ccuHandler['_db'].getValidatorsDataByHash)
				.calledWith(newCertificate.validatorsHash)
				.mockResolvedValue(undefined);

			await expect(ccuHandler.computeCCU(sampleLastCertificate, sampleLastSentCCM)).rejects.toThrow(
				`No validators data at new certificate with hash at ${newCertificate.validatorsHash.toString(
					'hex',
				)}`,
			);
		});

		it('should throw error when no inclusion proof was found for the new certificate height', async () => {
			const lastCCMToBeSent = { ...getSampleCCM(), height: 2, outboxSize: 2 };
			const messageWitnessHashes: Buffer[] = [];
			const sampleBlockHeader = testing.createFakeBlockHeader({ height: 5 });
			const newCertificate: Certificate = {
				aggregationBits: Buffer.alloc(2),
				blockID: sampleBlockHeader.id,
				height: sampleBlockHeader.height,
				signature: sampleBlockHeader.signature,
				stateRoot: sampleBlockHeader.stateRoot as Buffer,
				timestamp: sampleBlockHeader.timestamp,
				validatorsHash: sampleLastCertificate.validatorsHash,
			};
			const fakeError = new Error('No inclusion proof for the given height');
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 2,
			};

			jest.spyOn(ccuHandler as any, '_findCertificate').mockResolvedValue(newCertificate);
			jest.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash');
			jest.spyOn(ccuHandler['_db'], 'getCCMsBetweenHeights').mockResolvedValue([]);
			jest
				.spyOn(ccuHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ outbox: { size: 2 } } as any);
			jest.spyOn(initArgs.logger as Logger, 'info');
			jest
				.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash')
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getSavedInclusionProofAtHeight')
				.mockRejectedValue(fakeError);
			jest.spyOn(inboxUtility, 'calculateMessageWitnesses').mockReturnValue({
				crossChainMessages: [Buffer.alloc(2)],
				lastCCMToBeSent,
				messageWitnessHashes,
			});

			when(ccuHandler['_db'].getValidatorsDataByHash)
				.calledWith(sampleLastCertificate.validatorsHash)
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);

			await expect(ccuHandler.computeCCU(sampleLastCertificate, sampleLastSentCCM)).rejects.toThrow(
				fakeError,
			);
		});

		it('should return valid CCU params for the new certificate with no CCMs', async () => {
			const lastCCMToBeSent = { ...getSampleCCM(), height: 2, outboxSize: 2 };
			const messageWitnessHashes: Buffer[] = [];
			const sampleBlockHeader = testing.createFakeBlockHeader({ height: 5 });
			const newCertificate: Certificate = {
				aggregationBits: Buffer.alloc(2),
				blockID: sampleBlockHeader.id,
				height: sampleBlockHeader.height,
				signature: sampleBlockHeader.signature,
				stateRoot: sampleBlockHeader.stateRoot as Buffer,
				timestamp: sampleBlockHeader.timestamp,
				validatorsHash: sampleLastCertificate.validatorsHash,
			};
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 2,
			};

			jest.spyOn(ccuHandler as any, '_findCertificate').mockResolvedValue(newCertificate);
			jest.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash');
			jest.spyOn(ccuHandler['_db'], 'getCCMsBetweenHeights').mockResolvedValue([]);
			jest
				.spyOn(ccuHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ outbox: { size: 2 } } as any);
			jest.spyOn(initArgs.logger as Logger, 'info');
			jest
				.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash')
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getSavedInclusionProofAtHeight')
				.mockResolvedValue({
					proof: {
						queries: [
							{
								bitmap: Buffer.alloc(1),
								key: ccuHandler['_outboxKeyForInclusionProof'],
								value: Buffer.alloc(2),
							},
						],
						siblingHashes: [],
					},
				});
			jest.spyOn(inboxUtility, 'calculateMessageWitnesses').mockReturnValue({
				crossChainMessages: [],
				lastCCMToBeSent,
				messageWitnessHashes,
			});

			when(ccuHandler['_db'].getValidatorsDataByHash)
				.calledWith(sampleLastCertificate.validatorsHash)
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);

			const result = await ccuHandler.computeCCU(sampleLastCertificate, sampleLastSentCCM);

			expect(result).toEqual({
				ccuParams: {
					sendingChainID: config.ownChainID,
					activeValidatorsUpdate: {
						bftWeightsUpdate: [],
						bftWeightsUpdateBitmap: EMPTY_BYTES,
						blsKeysUpdate: [],
					} as ActiveValidatorsUpdate,
					certificate: codec.encode(certificateSchema, newCertificate),
					certificateThreshold: sampleValidatorsDataAtLastCertificate.certificateThreshold,
					inboxUpdate: {
						crossChainMessages: [],
						messageWitnessHashes,
						outboxRootWitness: {
							bitmap: EMPTY_BYTES,
							siblingHashes: [],
						},
					},
				},
				lastCCMToBeSent,
			});
		});

		it('should return valid CCU params for the new certificate with CCMs', async () => {
			const crossChainMessages = [Buffer.alloc(2)];
			const lastCCMToBeSent = { ...getSampleCCM(), height: 2, outboxSize: 2 };
			const messageWitnessHashes: Buffer[] = [];
			const sampleBlockHeader = testing.createFakeBlockHeader({ height: 5 });
			const newCertificate: Certificate = {
				aggregationBits: Buffer.alloc(2),
				blockID: sampleBlockHeader.id,
				height: sampleBlockHeader.height,
				signature: sampleBlockHeader.signature,
				stateRoot: sampleBlockHeader.stateRoot as Buffer,
				timestamp: sampleBlockHeader.timestamp,
				validatorsHash: sampleLastCertificate.validatorsHash,
			};
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 2,
			};

			jest.spyOn(ccuHandler as any, '_findCertificate').mockResolvedValue(newCertificate);
			jest.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash');
			jest.spyOn(ccuHandler['_db'], 'getCCMsBetweenHeights').mockResolvedValue([]);
			jest
				.spyOn(ccuHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ outbox: { size: 2 } } as any);
			jest.spyOn(initArgs.logger as Logger, 'info');
			jest
				.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash')
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getSavedInclusionProofAtHeight')
				.mockResolvedValue({
					proof: {
						queries: [
							{
								bitmap: Buffer.alloc(1),
								key: ccuHandler['_outboxKeyForInclusionProof'],
								value: Buffer.alloc(2),
							},
						],
						siblingHashes: [],
					},
				});
			jest.spyOn(inboxUtility, 'calculateMessageWitnesses').mockReturnValue({
				crossChainMessages: [Buffer.alloc(2)],
				lastCCMToBeSent,
				messageWitnessHashes,
			});

			when(ccuHandler['_db'].getValidatorsDataByHash)
				.calledWith(sampleLastCertificate.validatorsHash)
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);

			const result = await ccuHandler.computeCCU(sampleLastCertificate, sampleLastSentCCM);

			expect(result).toEqual({
				ccuParams: {
					sendingChainID: config.ownChainID,
					activeValidatorsUpdate: {
						bftWeightsUpdate: [],
						bftWeightsUpdateBitmap: EMPTY_BYTES,
						blsKeysUpdate: [],
					} as ActiveValidatorsUpdate,
					certificate: codec.encode(certificateSchema, newCertificate),
					certificateThreshold: sampleValidatorsDataAtLastCertificate.certificateThreshold,
					inboxUpdate: {
						crossChainMessages,
						messageWitnessHashes,
						outboxRootWitness: {
							bitmap: Buffer.alloc(1),
							siblingHashes: [],
						},
					},
				},
				lastCCMToBeSent,
			});
		});

		it('should return valid CCU params for the new certificate with activeValidatorsUpdate', async () => {
			const crossChainMessages = [Buffer.alloc(2)];
			const lastCCMToBeSent = { ...getSampleCCM(), height: 2, outboxSize: 2 };
			const messageWitnessHashes: Buffer[] = [];
			const sampleBlockHeader = testing.createFakeBlockHeader({ height: 5 });
			const newCertificate: Certificate = {
				aggregationBits: Buffer.alloc(2),
				blockID: sampleBlockHeader.id,
				height: sampleBlockHeader.height,
				signature: sampleBlockHeader.signature,
				stateRoot: sampleBlockHeader.stateRoot as Buffer,
				timestamp: sampleBlockHeader.timestamp,
				validatorsHash: sampleBlockHeader.validatorsHash as Buffer,
			};
			const validatorsDataAtNewCertificate: ValidatorsDataWithHeight = {
				validators: [
					{
						address: cryptography.utils.getRandomBytes(32),
						bftWeight: BigInt(2),
						blsKey: cryptography.utils.getRandomBytes(54),
					},
				],
				validatorsHash: sampleBlockHeader.validatorsHash as Buffer,
				certificateThreshold: BigInt(1),
				height: 20,
			};
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 2,
			};

			jest.spyOn(ccuHandler as any, '_findCertificate').mockResolvedValue(newCertificate);
			jest.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash');
			jest.spyOn(ccuHandler['_db'], 'getCCMsBetweenHeights').mockResolvedValue([]);
			jest
				.spyOn(ccuHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ outbox: { size: 2 } } as any);
			jest.spyOn(initArgs.logger as Logger, 'info');
			jest
				.spyOn(ccuHandler['_db'], 'getValidatorsDataByHash')
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);
			jest
				.spyOn(ccuHandler['_sendingChainAPIClient'], 'getSavedInclusionProofAtHeight')
				.mockResolvedValue({
					proof: {
						queries: [
							{
								bitmap: Buffer.alloc(1),
								key: ccuHandler['_outboxKeyForInclusionProof'],
								value: Buffer.alloc(2),
							},
						],
						siblingHashes: [],
					},
				});
			jest.spyOn(inboxUtility, 'calculateMessageWitnesses').mockReturnValue({
				crossChainMessages: [Buffer.alloc(2)],
				lastCCMToBeSent,
				messageWitnessHashes,
			});

			when(ccuHandler['_db'].getValidatorsDataByHash)
				.calledWith(sampleLastCertificate.validatorsHash)
				.mockResolvedValue(sampleValidatorsDataAtLastCertificate);

			when(ccuHandler['_db'].getValidatorsDataByHash)
				.calledWith(newCertificate.validatorsHash)
				.mockResolvedValue(validatorsDataAtNewCertificate);

			const result = await ccuHandler.computeCCU(sampleLastCertificate, sampleLastSentCCM);

			const { activeValidatorsUpdate, certificateThreshold } = calculateActiveValidatorsUpdate(
				sampleValidatorsDataAtLastCertificate,
				validatorsDataAtNewCertificate,
			);

			expect(result).toEqual({
				ccuParams: {
					sendingChainID: config.ownChainID,
					activeValidatorsUpdate,
					certificate: codec.encode(certificateSchema, newCertificate),
					certificateThreshold,
					inboxUpdate: {
						crossChainMessages,
						messageWitnessHashes,
						outboxRootWitness: {
							bitmap: Buffer.alloc(1),
							siblingHashes: [],
						},
					},
				},
				lastCCMToBeSent,
			});
		});
	});

	describe('submitCCU', () => {
		const accountNonce = '2';
		const crossChainMessages = [Buffer.alloc(2)];
		// const lastCCMToBeSent = { ...getSampleCCM(), height: 2, outboxSize: 2 };
		const messageWitnessHashes: Buffer[] = [];
		const sampleBlockHeader = testing.createFakeBlockHeader({ height: 5 });
		const newCertificate: Certificate = {
			aggregationBits: Buffer.alloc(2),
			blockID: sampleBlockHeader.id,
			height: sampleBlockHeader.height,
			signature: sampleBlockHeader.signature,
			stateRoot: sampleBlockHeader.stateRoot as Buffer,
			timestamp: sampleBlockHeader.timestamp,
			validatorsHash: sampleBlockHeader.validatorsHash as Buffer,
		};
		const validatorsDataAtNewCertificate: ValidatorsDataWithHeight = {
			validators: [
				{
					address: cryptography.utils.getRandomBytes(32),
					bftWeight: BigInt(2),
					blsKey: cryptography.utils.getRandomBytes(54),
				},
			],
			validatorsHash: sampleBlockHeader.validatorsHash as Buffer,
			certificateThreshold: BigInt(1),
			height: 20,
		};
		let ccuParams: CrossChainUpdateTransactionParams;
		const { privateKey, publicKey } = testing.fixtures.keysList.keys[0];

		let ccuTx: Transaction;

		beforeEach(() => {
			ccuHandler.load(initArgs);
			(ccuHandler['_db'] as any).privateKey = Buffer.from(privateKey, 'hex');
			receivingChainAPIClientMock.getAuthAccountNonceFromPublicKey.mockResolvedValue(accountNonce);
			(ccuHandler as any)['_isReceivingChainMainchain'] = true;
			jest.spyOn(ccuHandler as any, '_getCcuFee').mockResolvedValue(BigInt(10000000));
			(ccuHandler as any)['_isSaveCCU'] = false;
			receivingChainAPIClientMock.postTransaction.mockResolvedValue({
				transactionId: cryptography.utils.hash(Buffer.from('txID')).toString('hex'),
			});
			receivingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: false });
			jest.spyOn(initArgs.logger as Logger, 'info');

			const { activeValidatorsUpdate, certificateThreshold } = calculateActiveValidatorsUpdate(
				sampleValidatorsDataAtLastCertificate,
				validatorsDataAtNewCertificate,
			);
			ccuParams = {
				sendingChainID: config.ownChainID,
				activeValidatorsUpdate,
				certificate: codec.encode(certificateSchema, newCertificate),
				certificateThreshold,
				inboxUpdate: {
					crossChainMessages,
					messageWitnessHashes,
					outboxRootWitness: {
						bitmap: Buffer.alloc(1),
						siblingHashes: [],
					},
				},
			};
			ccuTx = new Transaction({
				module: MODULE_NAME_INTEROPERABILITY,
				command: COMMAND_NAME_SUBMIT_MAINCHAIN_CCU,
				nonce: BigInt(accountNonce),
				senderPublicKey: Buffer.from(publicKey, 'hex'),
				params: codec.encode(ccuParamsSchema, ccuParams),
				signatures: [],
				fee: BigInt(10000000),
			});
		});

		it('should throw error if there is no privateKey', async () => {
			(ccuHandler['_db'] as any).privateKey = undefined;
			await expect(ccuHandler['submitCCU'](ccuParams, 'txID')).rejects.toThrow(
				'There is no key enabled to submit CCU.',
			);
		});

		it('should throw error when receiving chain is syncing', async () => {
			receivingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: true });
			await expect(ccuHandler['submitCCU'](ccuParams, 'txID')).rejects.toThrow(
				'Receiving node is syncing.',
			);
		});

		it('should return undefined when the tx id is equal to last sent CCU', async () => {
			ccuTx.sign(config.receivingChainID as Buffer, Buffer.from(privateKey, 'hex'));
			const result = await ccuHandler['submitCCU'](ccuParams, ccuTx.id.toString('hex'));
			expect(result).toBeUndefined();
		});

		it('should send CCU transaction and set CCU transaction in the DB', async () => {
			ccuTx.sign(config.receivingChainID as Buffer, Buffer.from(privateKey, 'hex'));
			receivingChainAPIClientMock.postTransaction.mockResolvedValue({
				transactionId: ccuTx.id.toString('hex'),
			});

			const result = await ccuHandler['submitCCU'](ccuParams, 'randomTxID');

			expect(result).toEqual(ccuTx.id.toString('hex'));
			expect(chainConnectorDBMock.setCCUTransaction).toHaveBeenCalledWith(ccuTx.toObject());
			expect((initArgs.logger as Logger).info).toHaveBeenCalledWith(
				{ transactionID: result },
				'Sent CCU transaction',
			);
		});
	});

	describe('_findCertificate', () => {
		beforeEach(() => {
			ccuHandler.load(initArgs);
		});

		it('should return undefined if no aggregate commit is found when last certificate height is zero', async () => {
			chainConnectorDBMock.getAggregateCommitBetweenHeights.mockResolvedValue([]);
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 0,
			};
			const result = await ccuHandler['_findCertificate']();

			expect(result).toBeUndefined();
		});

		it('should return first certificate when last certificate height is zero', async () => {
			const firstAggregateCommit = {
				aggregationBits: Buffer.alloc(1),
				certificateSignature: cryptography.utils.getRandomBytes(54),
				height: 2,
			};
			chainConnectorDBMock.getAggregateCommitBetweenHeights.mockResolvedValue([
				firstAggregateCommit,
			]);

			const blockHeaderAtAggregateCommitHeight = testing.createFakeBlockHeader({ height: 2 });
			const certificate = getCertificateFromAggregateCommitByBlockHeader(
				firstAggregateCommit,
				blockHeaderAtAggregateCommitHeight.toObject(),
			);
			chainConnectorDBMock.getBlockHeaderByHeight.mockResolvedValue(
				blockHeaderAtAggregateCommitHeight,
			);
			ccuHandler['_lastCertificate'] = {
				...sampleLastCertificate,
				height: 0,
			};
			const result = await ccuHandler['_findCertificate']();

			expect(result).toEqual(certificate);
		});

		it('should return undefined if getNextCertificateFromAggregateCommits returns no certificate', async () => {
			const sampleBlockHeader = testing.createFakeBlockHeader({ height: 2 });
			const sampleCertificate = {
				aggregationBits: Buffer.alloc(2),
				blockID: sampleBlockHeader.id,
				height: sampleBlockHeader.height,
				signature: sampleBlockHeader.signature,
				stateRoot: sampleBlockHeader.stateRoot as Buffer,
				timestamp: sampleBlockHeader.timestamp,
				validatorsHash: sampleBlockHeader.validatorsHash as Buffer,
			};
			const bftHeights = {
				maxHeightPrevoted: 12,
				maxHeightPrecommitted: 2,
				maxHeightCertified: 2,
			};

			jest
				.spyOn(certificateUtility, 'getNextCertificateFromAggregateCommits')
				.mockResolvedValue(sampleCertificate);
			sendingChainAPIClientMock.getBFTHeights.mockResolvedValue(bftHeights);

			ccuHandler['_lastCertificate'] = sampleLastCertificate;
			const result = await ccuHandler['_findCertificate']();

			expect(sendingChainAPIClientMock.getBFTHeights).toHaveBeenCalled();
			expect(certificateUtility.getNextCertificateFromAggregateCommits).toHaveBeenCalledWith(
				ccuHandler['_db'],
				bftHeights,
				ccuHandler['_lastCertificate'],
			);
			expect(result).toEqual(sampleCertificate);
		});
	});

	describe('_getCcuFee', () => {
		const accountNonce = '2';
		const userInitializationFee = BigInt('2000000000');
		const crossChainMessages = [Buffer.alloc(2)];
		const messageWitnessHashes: Buffer[] = [];
		const sampleBlockHeader = testing.createFakeBlockHeader({ height: 5 });
		const newCertificate: Certificate = {
			aggregationBits: Buffer.alloc(2),
			blockID: sampleBlockHeader.id,
			height: sampleBlockHeader.height,
			signature: sampleBlockHeader.signature,
			stateRoot: sampleBlockHeader.stateRoot as Buffer,
			timestamp: sampleBlockHeader.timestamp,
			validatorsHash: sampleBlockHeader.validatorsHash as Buffer,
		};
		const validatorsDataAtNewCertificate: ValidatorsDataWithHeight = {
			validators: [
				{
					address: cryptography.utils.getRandomBytes(32),
					bftWeight: BigInt(2),
					blsKey: cryptography.utils.getRandomBytes(54),
				},
			],
			validatorsHash: sampleBlockHeader.validatorsHash as Buffer,
			certificateThreshold: BigInt(1),
			height: 20,
		};

		let ccuParams: CrossChainUpdateTransactionParams;
		const { publicKey } = testing.fixtures.keysList.keys[0];

		let ccuTx: Transaction;

		beforeEach(() => {
			ccuHandler.load(initArgs);
			const { activeValidatorsUpdate, certificateThreshold } = calculateActiveValidatorsUpdate(
				sampleValidatorsDataAtLastCertificate,
				validatorsDataAtNewCertificate,
			);

			ccuParams = {
				sendingChainID: config.ownChainID,
				activeValidatorsUpdate,
				certificate: codec.encode(certificateSchema, newCertificate),
				certificateThreshold,
				inboxUpdate: {
					crossChainMessages,
					messageWitnessHashes,
					outboxRootWitness: {
						bitmap: Buffer.alloc(1),
						siblingHashes: [],
					},
				},
			};
			ccuTx = new Transaction({
				module: MODULE_NAME_INTEROPERABILITY,
				command: COMMAND_NAME_SUBMIT_MAINCHAIN_CCU,
				nonce: BigInt(accountNonce),
				senderPublicKey: Buffer.from(publicKey, 'hex'),
				params: codec.encode(ccuParamsSchema, ccuParams),
				signatures: [],
				fee: BigInt(10000000),
			});
		});

		it('should return min fee including initialization fee when no user account exists', async () => {
			receivingChainAPIClientMock.hasUserTokenAccount.mockResolvedValue({ exists: false });
			receivingChainAPIClientMock.getTokenInitializationFee.mockResolvedValue({
				userAccount: userInitializationFee.toString(),
			});

			(ccuHandler as any)['_ccuFee'] = '1';
			const { fee, ...ccuWithoutFee } = ccuTx.toObject();
			const computedMinFee = transactions.computeMinFee(
				{ ...ccuWithoutFee, params: ccuParams } as any,
				ccuParamsSchema,
				{
					additionalFee: userInitializationFee,
				},
			);

			const computedFee = await ccuHandler['_getCcuFee']({
				...ccuWithoutFee,
				params: ccuParams,
			} as any);
			expect(computedFee).toEqual(computedMinFee);
		});

		it('should return min fee excluding initialization fee when user account exists', async () => {
			receivingChainAPIClientMock.hasUserTokenAccount.mockResolvedValue({ exists: true });
			const { fee, ...ccuWithoutFee } = ccuTx.toObject();

			const computedFee = await ccuHandler['_getCcuFee']({
				...ccuWithoutFee,
				params: ccuParams,
			} as any);

			expect(receivingChainAPIClientMock.getTokenInitializationFee).not.toHaveBeenCalled();
			expect(computedFee).toEqual(BigInt(ccuHandler['_ccuFee']));
		});

		it('should return ccuFee when computed min fee is lower than ccuFee', async () => {
			receivingChainAPIClientMock.hasUserTokenAccount.mockResolvedValue({ exists: false });
			receivingChainAPIClientMock.getTokenInitializationFee.mockResolvedValue({
				userAccount: userInitializationFee.toString(),
			});

			const { fee, ...ccuWithoutFee } = ccuTx.toObject();

			const computedFee = await ccuHandler['_getCcuFee']({
				...ccuWithoutFee,
				params: ccuParams,
			} as any);
			expect(computedFee).toEqual(BigInt(ccuHandler['_ccuFee']) + userInitializationFee);
		});
	});
});

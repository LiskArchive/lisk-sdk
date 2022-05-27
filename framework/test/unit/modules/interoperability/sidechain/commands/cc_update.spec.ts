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

import { when } from 'jest-when';
import * as cryptography from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { BlockAssets } from '@liskhq/lisk-chain';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	testing,
	VerifyStatus,
} from '../../../../../../src';
import {
	ActiveValidator,
	CCMsg,
	ChainAccount,
	ChainValidators,
	ChannelData,
	CrossChainUpdateTransactionParams,
} from '../../../../../../src/modules/interoperability/types';
import { SidechainCCUpdateCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/cc_update';
import { Certificate } from '../../../../../../src/node/consensus/certificate_generation/types';
import { certificateSchema } from '../../../../../../src/node/consensus/certificate_generation/schema';
import * as interopUtils from '../../../../../../src/modules/interoperability/utils';
import {
	ccmSchema,
	chainAccountSchema,
	chainValidatorsSchema,
	channelSchema,
} from '../../../../../../src/modules/interoperability/schema';
import {
	CCM_STATUS_OK,
	CHAIN_ACTIVE,
	CHAIN_REGISTERED,
	CHAIN_TERMINATED,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MAX_CCM_SIZE,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_CHAIN_VALIDATORS,
	STORE_PREFIX_CHANNEL_DATA,
} from '../../../../../../src/modules/interoperability/constants';
import { BlockHeader, EventQueue } from '../../../../../../src/node/state_machine';
import { SidechainInteroperabilityStore } from '../../../../../../src/modules/interoperability/sidechain/store';
import { computeValidatorsHash } from '../../../../../../src/modules/interoperability/utils';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('CrossChainUpdateCommand', () => {
	const getAPIContextMock = jest.fn();
	const getStoreMock = jest.fn();
	const moduleID = 1;
	const networkIdentifier = cryptography.getRandomBytes(32);
	const defaultCertificateValues: Certificate = {
		blockID: cryptography.getRandomBytes(20),
		height: 21,
		timestamp: Math.floor(Date.now() / 1000),
		stateRoot: cryptography.getRandomBytes(38),
		validatorsHash: cryptography.getRandomBytes(48),
		aggregationBits: cryptography.getRandomBytes(38),
		signature: cryptography.getRandomBytes(32),
	};

	const defaultNewCertificateThreshold = BigInt(20);
	const defaultSendingChainID = 20;
	const defaultSendingChainIDBuffer = interopUtils.getIDAsKeyForStore(defaultSendingChainID);
	const defaultCCMs: CCMsg[] = [
		{
			crossChainCommandID: 1,
			fee: BigInt(0),
			moduleID: 1,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: 2,
			sendingChainID: defaultSendingChainID,
			status: CCM_STATUS_OK,
		},
		{
			crossChainCommandID: 2,
			fee: BigInt(0),
			moduleID: 1,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: 3,
			sendingChainID: defaultSendingChainID,
			status: CCM_STATUS_OK,
		},
		{
			crossChainCommandID: 3,
			fee: BigInt(0),
			moduleID: 1,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: 4,
			sendingChainID: defaultSendingChainID,
			status: CCM_STATUS_OK,
		},
	];
	const defaultCCMsEncoded = defaultCCMs.map(ccm => codec.encode(ccmSchema, ccm));
	const defaultInboxUpdateValue = {
		crossChainMessages: defaultCCMsEncoded,
		messageWitness: {
			partnerChainOutboxSize: BigInt(2),
			siblingHashes: [Buffer.alloc(1)],
		},
		outboxRootWitness: {
			bitmap: Buffer.alloc(1),
			siblingHashes: [Buffer.alloc(1)],
		},
	};
	const defaultTransaction = { moduleID: 1 };

	const partnerChainStore = {
		getWithSchema: jest.fn(),
	};

	const partnerChannelStore = {
		getWithSchema: jest.fn(),
	};

	const partnerValidatorStore = {
		getWithSchema: jest.fn(),
		setWithSchema: jest.fn(),
	};

	let encodedDefaultCertificate: Buffer;
	let partnerChainAccount: ChainAccount;
	let partnerChannelAccount: ChannelData;
	let verifyContext: CommandVerifyContext<CrossChainUpdateTransactionParams>;
	let executeContext: CommandExecuteContext<CrossChainUpdateTransactionParams>;
	let sidechainCCUUpdateCommand: SidechainCCUpdateCommand;
	let params: CrossChainUpdateTransactionParams;
	let activeValidatorsUpdate: ActiveValidator[];
	let sortedActiveValidatorsUpdate: ActiveValidator[];

	beforeEach(async () => {
		activeValidatorsUpdate = [
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(1) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: cryptography.getRandomBytes(48), bftWeight: BigInt(3) },
		].sort((v1, v2) => v2.blsKey.compare(v1.blsKey)); // unsorted list
		const partnerValidators: any = {
			certificateThreshold: BigInt(10),
			activeValidators: activeValidatorsUpdate.map(v => ({
				blsKey: v.blsKey,
				bftWeight: v.bftWeight + BigInt(1),
			})),
		};
		const partnerValidatorsData = {
			activeValidators: [...activeValidatorsUpdate],
			certificateThreshold: BigInt(10),
		};
		const validatorsHash = computeValidatorsHash(
			activeValidatorsUpdate,
			partnerValidators.certificateThreshold,
		);
		encodedDefaultCertificate = codec.encode(certificateSchema, {
			...defaultCertificateValues,
			validatorsHash,
		});

		sortedActiveValidatorsUpdate = [...activeValidatorsUpdate].sort((v1, v2) =>
			v1.blsKey.compare(v2.blsKey),
		);
		partnerChainAccount = {
			lastCertificate: {
				height: 10,
				stateRoot: cryptography.getRandomBytes(38),
				timestamp: Math.floor(Date.now() / 1000),
				validatorsHash: cryptography.getRandomBytes(48),
			},
			name: 'sidechain1',
			networkID: cryptography.getRandomBytes(32),
			status: CHAIN_ACTIVE,
		};
		partnerChannelAccount = {
			inbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: cryptography.getRandomBytes(38),
				size: 18,
			},
			messageFeeTokenID: { chainID: 1, localID: 0 },
			outbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: cryptography.getRandomBytes(38),
				size: 18,
			},
			partnerChainOutboxRoot: cryptography.getRandomBytes(38),
		};

		params = {
			activeValidatorsUpdate: sortedActiveValidatorsUpdate,
			certificate: encodedDefaultCertificate,
			inboxUpdate: { ...defaultInboxUpdateValue },
			newCertificateThreshold: defaultNewCertificateThreshold,
			sendingChainID: defaultSendingChainID,
		};

		when(partnerChainStore.getWithSchema)
			.calledWith(defaultSendingChainIDBuffer, chainAccountSchema)
			.mockResolvedValue(partnerChainAccount);

		when(partnerChannelStore.getWithSchema)
			.calledWith(defaultSendingChainIDBuffer, channelSchema)
			.mockResolvedValue(partnerChannelAccount);

		when(getStoreMock)
			.calledWith(defaultTransaction.moduleID, STORE_PREFIX_CHAIN_DATA)
			.mockReturnValueOnce(partnerChainStore);

		when(getStoreMock)
			.calledWith(defaultTransaction.moduleID, STORE_PREFIX_CHANNEL_DATA)
			.mockReturnValueOnce(partnerChannelStore);

		when(getStoreMock)
			.calledWith(moduleID, STORE_PREFIX_CHAIN_VALIDATORS)
			.mockReturnValueOnce(partnerValidatorStore);

		when(partnerValidatorStore.getWithSchema)
			.calledWith(defaultSendingChainIDBuffer, chainValidatorsSchema)
			.mockResolvedValue(partnerValidatorsData);

		jest
			.spyOn(interopUtils, 'checkInboxUpdateValidity')
			.mockReturnValue({ status: VerifyStatus.OK });

		jest.spyOn(SidechainInteroperabilityStore.prototype, 'isLive').mockResolvedValue(true);

		jest.spyOn(interopUtils, 'computeValidatorsHash').mockReturnValue(validatorsHash);
		jest.spyOn(cryptography, 'verifyWeightedAggSig').mockReturnValue(true);
	});

	describe('verify', () => {
		beforeEach(() => {
			verifyContext = {
				getAPIContext: getAPIContextMock,
				getStore: getStoreMock,
				logger: testing.mocks.loggerMock,
				networkIdentifier,
				params,
				transaction: defaultTransaction as any,
			};
			jest.spyOn(SidechainInteroperabilityStore.prototype, 'isLive').mockResolvedValue(true);
			sidechainCCUUpdateCommand = new SidechainCCUpdateCommand(moduleID, new Map(), new Map());
		});

		it('should return error when ccu params validation fails', async () => {
			const { status, error } = await sidechainCCUUpdateCommand.verify({
				...verifyContext,
				params: { ...params, sendingChainID: Buffer.alloc(2) } as any,
			});

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('.sendingChainID');
		});

		it('should return error when chain has terminated status', async () => {
			when(partnerChainStore.getWithSchema)
				.calledWith(defaultSendingChainIDBuffer, chainAccountSchema)
				.mockResolvedValue({ ...partnerChainAccount, status: CHAIN_TERMINATED });

			const { status, error } = await sidechainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Sending partner chain 20 is terminated.');
		});

		it('should return error when chain is active but not live', async () => {
			jest.spyOn(SidechainInteroperabilityStore.prototype, 'isLive').mockResolvedValue(false);
			const { status, error } = await sidechainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Sending partner chain 20 is not live');
		});

		it('should return error checkLivenessRequirementFirstCCU fails', async () => {
			when(partnerChainStore.getWithSchema)
				.calledWith(defaultSendingChainIDBuffer, chainAccountSchema)
				.mockResolvedValue({ ...partnerChainAccount, status: CHAIN_REGISTERED });

			const { status, error } = await sidechainCCUUpdateCommand.verify({
				...verifyContext,
				params: { ...params, certificate: EMPTY_BYTES },
			});
			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				`Sending partner chain ${defaultSendingChainID} has a registered status so certificate cannot be empty.`,
			);
		});

		it('should return error checkCertificateValidity fails when certificate height is less than lastCertificateHeight', async () => {
			const encodedDefaultCertificateWithLowerheight = codec.encode(certificateSchema, {
				...defaultCertificateValues,
				height: 9,
			});

			const { status, error } = await sidechainCCUUpdateCommand.verify({
				...verifyContext,
				params: { ...params, certificate: encodedDefaultCertificateWithLowerheight },
			});
			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				'Certificate height should be greater than last certificate height.',
			);
		});

		it('should return VerifyStatus.FAIL when checkValidatorsHashWithCertificate() throws error', async () => {
			const certificateWithIncorrectValidatorHash = codec.encode(certificateSchema, {
				...defaultCertificateValues,
				validatorsHash: cryptography.getRandomBytes(48),
			});

			const { status, error } = await sidechainCCUUpdateCommand.verify({
				...verifyContext,
				params: { ...params, certificate: certificateWithIncorrectValidatorHash },
			});
			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Validators hash given in the certificate is incorrect.');
		});

		it('should return error checkActiveValidatorsUpdate fails when Validators blsKeys are not unique and lexicographically ordered', async () => {
			const { status, error } = await sidechainCCUUpdateCommand.verify({
				...verifyContext,
				params: { ...params, activeValidatorsUpdate },
			});

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				'Validators blsKeys must be unique and lexicographically ordered.',
			);
		});

		it('should return VerifyStatus.FAIL when verifyCertificateSignature fails', async () => {
			jest.spyOn(interopUtils, 'verifyCertificateSignature').mockReturnValue({
				status: VerifyStatus.FAIL,
				error: new Error('Certificate is invalid due to invalid signature.'),
			});

			const { status, error } = await sidechainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Certificate is invalid due to invalid signature.');
		});

		it('should return error checkInboxUpdateValidity fails', async () => {
			jest.spyOn(interopUtils, 'checkInboxUpdateValidity').mockReturnValue({
				status: VerifyStatus.FAIL,
				error: new Error(
					'Failed at verifying state root when messageWitness is non-empty and certificate is empty.',
				),
			});

			const { status, error } = await sidechainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				'Failed at verifying state root when messageWitness is non-empty and certificate is empty.',
			);
		});

		it('should return Verify.OK when all the checks pass', async () => {
			const { status, error } = await sidechainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.OK);
			expect(error).toBeUndefined();
		});
	});

	describe('execute', () => {
		let blockHeader: any;
		let partnerValidatorsDataVerify: ChainValidators;
		let activeValidatorsVerify: ActiveValidator[];

		beforeEach(async () => {
			activeValidatorsVerify = [...activeValidatorsUpdate];
			blockHeader = {
				height: 25,
				timestamp: Math.floor(Date.now() / 1000) + 100000,
			};

			partnerValidatorsDataVerify = {
				activeValidators: activeValidatorsVerify,
				certificateThreshold: BigInt(10),
			};
			executeContext = {
				getAPIContext: getAPIContextMock,
				getStore: getStoreMock,
				logger: testing.mocks.loggerMock,
				networkIdentifier,
				params,
				transaction: defaultTransaction as any,
				assets: new BlockAssets(),
				eventQueue: new EventQueue(),
				header: blockHeader as BlockHeader,
			};

			when(getStoreMock)
				.calledWith(defaultTransaction.moduleID, STORE_PREFIX_CHAIN_VALIDATORS)
				.mockReturnValueOnce(partnerValidatorStore);

			when(partnerValidatorStore.getWithSchema)
				.calledWith(defaultSendingChainIDBuffer, chainValidatorsSchema)
				.mockResolvedValue(partnerValidatorsDataVerify);

			sidechainCCUUpdateCommand = new SidechainCCUpdateCommand(moduleID, new Map(), new Map());
		});

		it('should throw error when checkValidCertificateLiveness() throws error', async () => {
			const blockHeaderWithInvalidTimestamp = {
				height: 25,
				timestamp: Math.floor(Date.now() / 1000) + LIVENESS_LIMIT,
			};
			await expect(
				sidechainCCUUpdateCommand.execute({
					...executeContext,
					header: { ...blockHeader, timestamp: blockHeaderWithInvalidTimestamp.timestamp },
				}),
			).rejects.toThrow('Certificate is not valid as it passed Liveness limit of 2592000 seconds.');
		});

		it('should throw error when checkCertificateTimestamp() throws error', async () => {
			const blockHeaderWithInvalidTimestamp = {
				height: 25,
				timestamp: Math.floor(Date.now() / 1000) - LIVENESS_LIMIT,
			};
			await expect(
				sidechainCCUUpdateCommand.execute({
					...executeContext,
					header: { ...blockHeader, timestamp: blockHeaderWithInvalidTimestamp.timestamp },
				}),
			).rejects.toThrow('Certificate is invalid due to invalid timestamp.');
		});

		it('should throw error and calls terminateChainInternal() if CCM decoding fails', async () => {
			const invalidCCM = Buffer.from([1]);
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			const terminateChainInternalMock = jest
				.spyOn(SidechainInteroperabilityStore.prototype, 'terminateChainInternal')
				.mockResolvedValue({} as never);
			const invalidCCMContext = {
				...executeContext,
				params: {
					...executeContext.params,
					inboxUpdate: { ...executeContext.params.inboxUpdate, crossChainMessages: [invalidCCM] },
				},
			};
			await expect(sidechainCCUUpdateCommand.execute(invalidCCMContext)).rejects.toThrow(
				'Value yields unsupported wireType',
			);
			expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		});

		it('should throw error when chain.status === CHAIN_REGISTERED and inboxUpdate is non-empty and the first CCM is not a registration CCM', async () => {
			when(partnerChainStore.getWithSchema)
				.calledWith(defaultSendingChainIDBuffer, chainAccountSchema)
				.mockResolvedValue({ ...partnerChainAccount, status: CHAIN_REGISTERED });

			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			const terminateChainInternalMock = jest
				.spyOn(SidechainInteroperabilityStore.prototype, 'terminateChainInternal')
				.mockResolvedValue({} as never);

			await expect(sidechainCCUUpdateCommand.execute(executeContext)).resolves.toBeUndefined();
			expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		});

		it('should call terminateChainInternal() for a ccm when txParams.sendingChainID !== ccm.deserilized.sendingChainID', async () => {
			const invalidCCM = codec.encode(ccmSchema, {
				crossChainCommandID: 1,
				fee: BigInt(0),
				moduleID: 1,
				nonce: BigInt(1),
				params: Buffer.alloc(2),
				receivingChainID: 2,
				sendingChainID: 50,
				status: CCM_STATUS_OK,
			});
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			jest.spyOn(interopUtils, 'commonCCUExecutelogic').mockReturnValue({} as never);
			const terminateChainInternalMock = jest
				.spyOn(SidechainInteroperabilityStore.prototype, 'terminateChainInternal')
				.mockResolvedValue({} as never);

			const invalidCCMContext = {
				...executeContext,
				params: {
					...executeContext.params,
					inboxUpdate: { ...executeContext.params.inboxUpdate, crossChainMessages: [invalidCCM] },
				},
			};
			await expect(sidechainCCUUpdateCommand.execute(invalidCCMContext)).resolves.toBeUndefined();
			expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		});

		it('should call terminateChainInternal() for a ccm when it fails on validateFormat', async () => {
			const invalidCCM = {
				crossChainCommandID: 1,
				fee: BigInt(0),
				moduleID: 1,
				nonce: BigInt(1),
				params: Buffer.alloc(MAX_CCM_SIZE + 10),
				receivingChainID: 2,
				sendingChainID: defaultSendingChainID,
				status: CCM_STATUS_OK,
			};
			const invalidCCMSerialized = codec.encode(ccmSchema, invalidCCM);
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			jest.spyOn(interopUtils, 'commonCCUExecutelogic').mockReturnValue({} as never);

			const terminateChainInternalMock = jest
				.spyOn(SidechainInteroperabilityStore.prototype, 'terminateChainInternal')
				.mockResolvedValue({} as never);

			const invalidCCMContext = {
				...executeContext,
				params: {
					...executeContext.params,
					inboxUpdate: {
						...executeContext.params.inboxUpdate,
						crossChainMessages: [invalidCCMSerialized],
					},
				},
			};
			await expect(sidechainCCUUpdateCommand.execute(invalidCCMContext)).resolves.toBeUndefined();
			expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
			expect(terminateChainInternalMock).toHaveBeenCalledWith(
				invalidCCM.sendingChainID,
				expect.any(Object),
			);
		});

		it('should call apply() for all the valid CCMs', async () => {
			const sidechainCCM = {
				crossChainCommandID: 1,
				fee: BigInt(0),
				moduleID: 1,
				nonce: BigInt(1),
				params: Buffer.alloc(10),
				receivingChainID: 80,
				sendingChainID: defaultSendingChainID,
				status: CCM_STATUS_OK,
			};
			const sidechainCCMSerialized = codec.encode(ccmSchema, sidechainCCM);
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			const commonCCUExecutelogicMock = jest
				.spyOn(interopUtils, 'commonCCUExecutelogic')
				.mockReturnValue({} as never);

			const appendToInboxTreeMock = jest
				.spyOn(SidechainInteroperabilityStore.prototype, 'appendToInboxTree')
				.mockResolvedValue({} as never);
			const applyMock = jest
				.spyOn(SidechainInteroperabilityStore.prototype, 'apply')
				.mockResolvedValue({} as never);

			const invalidCCMContext = {
				...executeContext,
				params: {
					...executeContext.params,
					inboxUpdate: {
						...executeContext.params.inboxUpdate,
						crossChainMessages: [sidechainCCMSerialized],
					},
				},
			};
			await expect(sidechainCCUUpdateCommand.execute(invalidCCMContext)).resolves.toBeUndefined();
			expect(appendToInboxTreeMock).toHaveBeenCalledTimes(1);
			expect(applyMock).toHaveBeenCalledTimes(1);
			expect(applyMock).toHaveBeenCalledTimes(1);
			expect(commonCCUExecutelogicMock).toHaveBeenCalledTimes(1);
		});
	});
});

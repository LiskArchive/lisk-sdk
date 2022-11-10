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
/* eslint-disable max-classes-per-file */

import { utils } from '@liskhq/lisk-cryptography';
import * as cryptography from '@liskhq/lisk-cryptography';
import { BlockAssets } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	testing,
	VerifyStatus,
	MainchainCCUpdateCommand,
	MainchainInteroperabilityModule,
} from '../../../../../../src';
import {
	ActiveValidator,
	CCMsg,
	ChainAccount,
	ChainValidators,
	ChannelData,
	CrossChainMessageContext,
	CrossChainUpdateTransactionParams,
} from '../../../../../../src/modules/interoperability/types';

import { Certificate } from '../../../../../../src/engine/consensus/certificate_generation/types';
import { certificateSchema } from '../../../../../../src/engine/consensus/certificate_generation/schema';
import * as interopUtils from '../../../../../../src/modules/interoperability/utils';
import {
	ccmSchema,
	sidechainTerminatedCCMParamsSchema,
} from '../../../../../../src/modules/interoperability/schemas';
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
	EMPTY_BYTES,
	EMPTY_FEE_ADDRESS,
	HASH_LENGTH,
	LIVENESS_LIMIT,
	MAINCHAIN_ID_BUFFER,
	MAX_CCM_SIZE,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityInternalMethod } from '../../../../../../src/modules/interoperability/mainchain/store';
import { BlockHeader, EventQueue } from '../../../../../../src/state_machine';
import { computeValidatorsHash } from '../../../../../../src/modules/interoperability/utils';
import { CROSS_CHAIN_COMMAND_NAME_FORWARD } from '../../../../../../src/modules/token/constants';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../../../src/modules/interoperability/stores/chain_account';
import { ChannelDataStore } from '../../../../../../src/modules/interoperability/stores/channel_data';
import { ChainValidatorsStore } from '../../../../../../src/modules/interoperability/stores/chain_validators';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../../src/testing/utils';
import {
	createCrossChainMessageContext,
	createTransientMethodContext,
} from '../../../../../../src/testing';
import { BaseInteroperableMethod } from '../../../../../../src/modules/interoperability/base_interoperable_method';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { BaseInteroperabilityInternalMethod } from '../../../../../../src/modules/interoperability/base_interoperability_internal_methods';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../../../../../src/modules/interoperability/events/ccm_processed';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('CrossChainUpdateCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();

	const chainID = cryptography.utils.getRandomBytes(32);
	const defaultCertificateValues: Certificate = {
		blockID: cryptography.utils.getRandomBytes(20),
		height: 21,
		timestamp: Math.floor(Date.now() / 1000),
		stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH),
		validatorsHash: cryptography.utils.getRandomBytes(48),
		aggregationBits: cryptography.utils.getRandomBytes(38),
		signature: cryptography.utils.getRandomBytes(32),
	};

	const defaultNewCertificateThreshold = BigInt(20);
	const defaultSendingChainID = 20;
	const defaultSendingChainIDBuffer = cryptography.utils.intToBuffer(defaultSendingChainID, 4);
	const defaultCCMs: CCMsg[] = [
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: utils.intToBuffer(2, 4),
			sendingChainID: defaultSendingChainIDBuffer,
			status: CCMStatusCode.OK,
		},
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: utils.intToBuffer(3, 4),
			sendingChainID: defaultSendingChainIDBuffer,
			status: CCMStatusCode.OK,
		},
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: utils.intToBuffer(4, 4),
			sendingChainID: defaultSendingChainIDBuffer,
			status: CCMStatusCode.OK,
		},
	];
	const defaultCCMsEncoded = defaultCCMs.map(ccm => codec.encode(ccmSchema, ccm));
	const defaultInboxUpdateValue = {
		crossChainMessages: defaultCCMsEncoded,
		messageWitnessHashes: [Buffer.alloc(32)],
		outboxRootWitness: {
			bitmap: Buffer.alloc(1),
			siblingHashes: [Buffer.alloc(32)],
		},
	};
	const defaultTransaction = { module: MODULE_NAME_INTEROPERABILITY };

	let stateStore: PrefixedStateReadWriter;
	let encodedDefaultCertificate: Buffer;
	let partnerChainAccount: ChainAccount;
	let partnerChannelAccount: ChannelData;
	let verifyContext: CommandVerifyContext<CrossChainUpdateTransactionParams>;
	let executeContext: CommandExecuteContext<CrossChainUpdateTransactionParams>;
	let mainchainCCUUpdateCommand: MainchainCCUpdateCommand;
	let params: CrossChainUpdateTransactionParams;
	let activeValidatorsUpdate: ActiveValidator[];
	let sortedActiveValidatorsUpdate: ActiveValidator[];
	let partnerChainStore: ChainAccountStore;
	let partnerChannelStore: ChannelDataStore;
	let partnerValidatorStore: ChainValidatorsStore;

	beforeEach(async () => {
		mainchainCCUUpdateCommand = new MainchainCCUpdateCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
		);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		activeValidatorsUpdate = [
			{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(1) },
			{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: cryptography.utils.getRandomBytes(48), bftWeight: BigInt(3) },
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
				stateRoot: cryptography.utils.getRandomBytes(38),
				timestamp: Math.floor(Date.now() / 1000),
				validatorsHash: cryptography.utils.getRandomBytes(48),
			},
			name: 'sidechain1',
			status: ChainStatus.ACTIVE,
		};
		partnerChannelAccount = {
			inbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: cryptography.utils.getRandomBytes(38),
				size: 18,
			},
			messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
			outbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: cryptography.utils.getRandomBytes(38),
				size: 18,
			},
			partnerChainOutboxRoot: cryptography.utils.getRandomBytes(38),
		};

		params = {
			activeValidatorsUpdate: sortedActiveValidatorsUpdate,
			certificate: encodedDefaultCertificate,
			inboxUpdate: { ...defaultInboxUpdateValue },
			newCertificateThreshold: defaultNewCertificateThreshold,
			sendingChainID: defaultSendingChainIDBuffer,
		};

		partnerChainStore = interopMod.stores.get(ChainAccountStore);
		await partnerChainStore.set(
			createStoreGetter(stateStore),
			defaultSendingChainIDBuffer,
			partnerChainAccount,
		);

		partnerChannelStore = interopMod.stores.get(ChannelDataStore);
		await partnerChannelStore.set(
			createStoreGetter(stateStore),
			defaultSendingChainIDBuffer,
			partnerChannelAccount,
		);

		partnerValidatorStore = interopMod.stores.get(ChainValidatorsStore);
		await partnerValidatorStore.set(
			createStoreGetter(stateStore),
			defaultSendingChainIDBuffer,
			partnerValidatorsData,
		);

		jest
			.spyOn(interopUtils, 'checkInboxUpdateValidity')
			.mockReturnValue({ status: VerifyStatus.OK });

		jest.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'isLive').mockResolvedValue(true);
		jest.spyOn(interopUtils, 'computeValidatorsHash').mockReturnValue(validatorsHash);
		jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(true);
	});

	describe('verify', () => {
		beforeEach(() => {
			verifyContext = {
				getMethodContext: () => createTransientMethodContext({ stateStore }),
				getStore: createStoreGetter(stateStore).getStore,
				stateStore,
				logger: testing.mocks.loggerMock,
				chainID,
				params,
				transaction: defaultTransaction as any,
			};
			jest
				.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'isLive')
				.mockResolvedValue(true);
			mainchainCCUUpdateCommand = new MainchainCCUpdateCommand(
				interopMod.stores,
				interopMod.events,
				new Map(),
				new Map(),
			);
		});

		it('should return error when ccu params validation fails', async () => {
			const { status, error } = await mainchainCCUUpdateCommand.verify({
				...verifyContext,
				params: { ...params, sendingChainID: 2 } as any,
			});

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('.sendingChainID');
		});

		it('should return error when chain has terminated status', async () => {
			await partnerChainStore.set(createStoreGetter(stateStore), defaultSendingChainIDBuffer, {
				...partnerChainAccount,
				status: ChainStatus.TERMINATED,
			});

			const { status, error } = await mainchainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Sending partner chain 20 is terminated.');
		});

		it('should return error when chain is active but not live', async () => {
			jest
				.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'isLive')
				.mockResolvedValue(false);
			const { status, error } = await mainchainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Sending partner chain 20 is not live');
		});

		it('should return error checkLivenessRequirementFirstCCU fails', async () => {
			await partnerChainStore.set(createStoreGetter(stateStore), defaultSendingChainIDBuffer, {
				...partnerChainAccount,
				status: ChainStatus.REGISTERED,
			});

			const { status, error } = await mainchainCCUUpdateCommand.verify({
				...verifyContext,
				params: { ...params, certificate: EMPTY_BYTES },
			});
			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				`Sending partner chain ${defaultSendingChainIDBuffer.readInt32BE(
					0,
				)} has a registered status so certificate cannot be empty.`,
			);
		});

		it('should return error checkCertificateValidity fails when certificate height is less than lastCertificateHeight', async () => {
			const encodedDefaultCertificateWithLowerheight = codec.encode(certificateSchema, {
				...defaultCertificateValues,
				height: 9,
			});

			const { status, error } = await mainchainCCUUpdateCommand.verify({
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
				validatorsHash: cryptography.utils.getRandomBytes(48),
			});

			const { status, error } = await mainchainCCUUpdateCommand.verify({
				...verifyContext,
				params: { ...params, certificate: certificateWithIncorrectValidatorHash },
			});
			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Validators hash given in the certificate is incorrect.');
		});

		it('should return error verifyValidatorsUpdate fails when Validators blsKeys are not unique and lexicographically ordered', async () => {
			await expect(
				mainchainCCUUpdateCommand.verify({
					...verifyContext,
					params: { ...params, activeValidatorsUpdate },
				}),
			).rejects.toThrow('Keys are not sorted lexicographic order.');
		});

		it('should rejct when verifyCertificateSignature fails', async () => {
			jest
				.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'verifyCertificateSignature')
				.mockRejectedValue(new Error('Certificate is invalid due to invalid signature.'));

			await expect(mainchainCCUUpdateCommand.verify(verifyContext)).rejects.toThrow(
				'Certificate is invalid due to invalid signature',
			);
		});

		it('should return error checkInboxUpdateValidity fails', async () => {
			jest.spyOn(interopUtils, 'checkInboxUpdateValidity').mockReturnValue({
				status: VerifyStatus.FAIL,
				error: new Error(
					'Failed at verifying state root when messageWitnessHashes is non-empty and certificate is empty.',
				),
			});

			const { status, error } = await mainchainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				'Failed at verifying state root when messageWitnessHashes is non-empty and certificate is empty.',
			);
		});

		it('should return Verify.OK when all the checks pass', async () => {
			const { status, error } = await mainchainCCUUpdateCommand.verify(verifyContext);

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
				getMethodContext: () => createTransientMethodContext({ stateStore }),
				getStore: createStoreGetter(stateStore).getStore,
				stateStore,
				logger: testing.mocks.loggerMock,
				chainID,
				params,
				transaction: defaultTransaction as any,
				assets: new BlockAssets(),
				eventQueue: new EventQueue(0),
				header: blockHeader as BlockHeader,
				certificateThreshold: BigInt(0),
				currentValidators: [],
				impliesMaxPrevote: true,
				maxHeightCertified: 0,
			};

			await partnerValidatorStore.set(
				createStoreGetter(stateStore),
				defaultSendingChainIDBuffer,
				partnerValidatorsDataVerify,
			);

			mainchainCCUUpdateCommand = new MainchainCCUpdateCommand(
				interopMod.stores,
				interopMod.events,
				new Map(),
				new Map(),
			);
		});

		it('should throw error when checkValidCertificateLiveness() throws error', async () => {
			const blockHeaderWithInvalidTimestamp = {
				height: 25,
				timestamp: Math.floor(Date.now() / 1000) + LIVENESS_LIMIT,
			};
			await expect(
				mainchainCCUUpdateCommand.execute({
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
				mainchainCCUUpdateCommand.execute({
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
				.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'terminateChainInternal')
				.mockResolvedValue({} as never);
			const invalidCCMContext = {
				...executeContext,
				params: {
					...executeContext.params,
					inboxUpdate: { ...executeContext.params.inboxUpdate, crossChainMessages: [invalidCCM] },
				},
			};
			await expect(mainchainCCUUpdateCommand.execute(invalidCCMContext)).rejects.toThrow(
				'Value yields unsupported wireType',
			);
			expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		});

		it('should throw error when chain.status === ChainStatus.REGISTERED and inboxUpdate is non-empty and the first CCM is not a registration CCM', async () => {
			await partnerChainStore.set(createStoreGetter(stateStore), defaultSendingChainIDBuffer, {
				...partnerChainAccount,
				status: ChainStatus.REGISTERED,
			});

			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			const terminateChainInternalMock = jest
				.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'terminateChainInternal')
				.mockResolvedValue({} as never);

			await expect(mainchainCCUUpdateCommand.execute(executeContext)).resolves.toBeUndefined();
			expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		});

		it('should call terminateChainInternal() for a ccm when txParams.sendingChainID !== ccm.deserilized.sendingChainID', async () => {
			const invalidCCM = codec.encode(ccmSchema, {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(1),
				params: Buffer.alloc(2),
				receivingChainID: utils.intToBuffer(1, 4),
				sendingChainID: utils.intToBuffer(50, 4),
				status: CCMStatusCode.OK,
			});
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			jest.spyOn(interopUtils, 'commonCCUExecutelogic').mockReturnValue({} as never);
			const terminateChainInternalMock = jest
				.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'terminateChainInternal')
				.mockResolvedValue({} as never);

			const invalidCCMContext = {
				...executeContext,
				params: {
					...executeContext.params,
					inboxUpdate: { ...executeContext.params.inboxUpdate, crossChainMessages: [invalidCCM] },
				},
			};
			await expect(mainchainCCUUpdateCommand.execute(invalidCCMContext)).resolves.toBeUndefined();
			expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
		});

		it('should call terminateChainInternal() for a ccm when it fails on validateFormat', async () => {
			const invalidCCM = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(1),
				params: Buffer.alloc(MAX_CCM_SIZE + 10),
				receivingChainID: utils.intToBuffer(2, 4),
				sendingChainID: defaultSendingChainIDBuffer,
				status: CCMStatusCode.OK,
			};
			const invalidCCMSerialized = codec.encode(ccmSchema, invalidCCM);
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			jest.spyOn(interopUtils, 'commonCCUExecutelogic').mockReturnValue({} as never);

			const terminateChainInternalMock = jest
				.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'terminateChainInternal')
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
			await expect(mainchainCCUUpdateCommand.execute(invalidCCMContext)).resolves.toBeUndefined();
			expect(terminateChainInternalMock).toHaveBeenCalledTimes(1);
			expect(terminateChainInternalMock).toHaveBeenCalledWith(
				invalidCCM.sendingChainID,
				expect.any(Object),
			);
		});

		it('should call forward() when ccm.deserilized.receivingChainID !== MAINCHAIN_ID', async () => {
			const nonMainchainCCM = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(1),
				params: Buffer.alloc(10),
				receivingChainID: utils.intToBuffer(2, 4),
				sendingChainID: defaultSendingChainIDBuffer,
				status: CCMStatusCode.OK,
			};
			const nonMainchainCCMSerialized = codec.encode(ccmSchema, nonMainchainCCM);
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			jest.spyOn(interopUtils, 'commonCCUExecutelogic').mockReturnValue({} as never);

			const appendToInboxTreeMock = jest
				.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'appendToInboxTree')
				.mockResolvedValue({} as never);
			const forwardMock = jest
				.spyOn(mainchainCCUUpdateCommand, '_forward' as never)
				.mockResolvedValue({} as never);

			const invalidCCMContext = {
				...executeContext,
				params: {
					...executeContext.params,
					inboxUpdate: {
						...executeContext.params.inboxUpdate,
						crossChainMessages: [nonMainchainCCMSerialized],
					},
				},
			};
			await expect(mainchainCCUUpdateCommand.execute(invalidCCMContext)).resolves.toBeUndefined();
			expect(appendToInboxTreeMock).toHaveBeenCalledTimes(1);
			expect(forwardMock).toHaveBeenCalledTimes(1);
		});

		it('should call apply() when ccm.deserilized.receivingChainID === MAINCHAIN_ID', async () => {
			const mainchainCCM = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
				fee: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				nonce: BigInt(1),
				params: Buffer.alloc(10),
				receivingChainID: MAINCHAIN_ID_BUFFER,
				sendingChainID: defaultSendingChainIDBuffer,
				status: CCMStatusCode.OK,
			};
			const mainchainCCMSerialized = codec.encode(ccmSchema, mainchainCCM);
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			const commonCCUExecutelogicMock = jest
				.spyOn(interopUtils, 'commonCCUExecutelogic')
				.mockReturnValue({} as never);

			const appendToInboxTreeMock = jest
				.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'appendToInboxTree')
				.mockResolvedValue({} as never);
			const forwardMock = jest
				.spyOn(mainchainCCUUpdateCommand, '_forward' as never)
				.mockResolvedValue({} as never);
			const applyMock = jest
				.spyOn(mainchainCCUUpdateCommand, 'apply' as never)
				.mockResolvedValue({} as never);

			const invalidCCMContext = {
				...executeContext,
				params: {
					...executeContext.params,
					inboxUpdate: {
						...executeContext.params.inboxUpdate,
						crossChainMessages: [mainchainCCMSerialized],
					},
				},
			};
			await expect(mainchainCCUUpdateCommand.execute(invalidCCMContext)).resolves.toBeUndefined();
			expect(appendToInboxTreeMock).toHaveBeenCalledTimes(1);
			expect(forwardMock).toHaveBeenCalledTimes(0);
			expect(applyMock).toHaveBeenCalledTimes(1);
			expect(applyMock).toHaveBeenCalledTimes(1);
			expect(commonCCUExecutelogicMock).toHaveBeenCalledTimes(1);
		});
	});

	describe('_forward', () => {
		const defaultCCM = {
			nonce: BigInt(0),
			module: 'token',
			crossChainCommand: 'crossChainTransfer',
			sendingChainID: Buffer.from([0, 0, 2, 0]),
			receivingChainID: Buffer.from([0, 0, 3, 0]),
			fee: BigInt(20000),
			status: 0,
			params: Buffer.alloc(0),
		};
		let context: CrossChainMessageContext;
		let command: MainchainCCUpdateCommand;
		let ccMethods: Map<string, BaseInteroperableMethod>;
		let ccCommands: Map<string, BaseCCCommand[]>;
		let internalMethod: BaseInteroperabilityInternalMethod;

		beforeEach(async () => {
			const interopModule = new MainchainInteroperabilityModule();
			ccMethods = new Map();
			ccMethods.set(
				'token',
				new (class TokenMethod extends BaseInteroperableMethod {
					public verifyCrossChainMessage = jest.fn();
					public beforeCrossChainMessageForwarding = jest.fn();
				})(interopModule.stores, interopModule.events),
			);
			ccCommands = new Map();
			ccCommands.set('token', [
				new (class CrossChainTransfer extends BaseCCCommand {
					public schema = { $id: 'test/ccu', properties: {}, type: 'object' };
					public verify = jest.fn();
					public execute = jest.fn();
				})(interopModule.stores, interopModule.events),
			]);
			command = new MainchainCCUpdateCommand(
				interopModule.stores,
				interopModule.events,
				ccMethods,
				ccCommands,
			);
			internalMethod = ({
				isLive: jest.fn().mockResolvedValue(true),
				addToOutbox: jest.fn(),
				terminateChainInternal: jest.fn(),
				sendInternal: jest.fn(),
			} as unknown) as BaseInteroperabilityInternalMethod;
			jest
				.spyOn(command, 'getInteroperabilityInternalMethod' as never)
				.mockReturnValue(internalMethod as never);
			jest.spyOn(command['events'].get(CcmProcessedEvent), 'log');
			jest.spyOn(command, 'bounce' as never);
			context = createCrossChainMessageContext({
				ccm: defaultCCM,
			});
			await command['stores'].get(ChainAccountStore).set(context, context.ccm.receivingChainID, {
				lastCertificate: {
					height: 0,
					stateRoot: utils.getRandomBytes(32),
					timestamp: 0,
					validatorsHash: utils.getRandomBytes(32),
				},
				name: 'random',
				status: ChainStatus.ACTIVE,
			});
		});

		it('should terminate the chain and log event when sending chain is not live', async () => {
			(internalMethod.isLive as jest.Mock).mockResolvedValue(false);

			await expect(command['_forward'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				context.ccm.sendingChainID,
				expect.anything(),
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should terminate the chain and log event when verifyCrossChainMessage fails', async () => {
			((ccMethods.get('token') as BaseInteroperableMethod)
				.verifyCrossChainMessage as jest.Mock).mockRejectedValue('error');

			await expect(command['_forward'](context)).resolves.toBeUndefined();

			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				context.ccm.sendingChainID,
				expect.anything(),
			);
			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should bounce and return if receiving chain does not exist', async () => {
			await command['stores'].get(ChainAccountStore).del(context, context.ccm.receivingChainID);

			await expect(command['_forward'](context)).resolves.toBeUndefined();

			expect(command['bounce']).toHaveBeenCalledTimes(1);
			expect(command['bounce']).toHaveBeenCalledWith(
				expect.anything(),
				expect.any(Buffer),
				expect.any(Number),
				CCMStatusCode.CHANNEL_UNAVAILABLE,
				CCMProcessedCode.CHANNEL_UNAVAILABLE,
			);
		});

		it('should bounce and return if receiving chain status is registered', async () => {
			await command['stores'].get(ChainAccountStore).set(context, context.ccm.receivingChainID, {
				lastCertificate: {
					height: 0,
					stateRoot: utils.getRandomBytes(32),
					timestamp: 0,
					validatorsHash: utils.getRandomBytes(32),
				},
				name: 'random',
				status: ChainStatus.REGISTERED,
			});

			await expect(command['_forward'](context)).resolves.toBeUndefined();

			expect(command['bounce']).toHaveBeenCalledTimes(1);
			expect(command['bounce']).toHaveBeenCalledWith(
				expect.anything(),
				expect.any(Buffer),
				expect.any(Number),
				CCMStatusCode.CHANNEL_UNAVAILABLE,
				CCMProcessedCode.CHANNEL_UNAVAILABLE,
			);
		});

		it('should terminate the chain and log event when receiving chain is not live', async () => {
			// First check sending chain, and second checks receiving chain
			(internalMethod.isLive as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

			const chainAccount = await command['stores']
				.get(ChainAccountStore)
				.get(context, context.ccm.receivingChainID);
			await expect(command['_forward'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				context.ccm.receivingChainID,
				expect.anything(),
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.CHANNEL_UNAVAILABLE,
					result: CCMProcessedResult.DISCARDED,
				},
			);
			expect(internalMethod.sendInternal).toHaveBeenCalledWith(
				expect.objectContaining({
					fee: BigInt(0),
					receivingChainID: context.ccm.sendingChainID,
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
					status: CCMStatusCode.OK,
					params: codec.encode(sidechainTerminatedCCMParamsSchema, {
						chainID: context.ccm.receivingChainID,
						stateRoot: chainAccount.lastCertificate.stateRoot,
					}),
					feeAddress: EMPTY_FEE_ADDRESS,
				}),
			);
		});

		it('should revert the state and terminate the sending chain if beforeCrossChainMessageForwarding fails', async () => {
			((ccMethods.get('token') as BaseInteroperableMethod)
				.beforeCrossChainMessageForwarding as jest.Mock).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['_forward'](context)).resolves.toBeUndefined();

			expect(internalMethod.terminateChainInternal).toHaveBeenCalledWith(
				context.ccm.sendingChainID,
				expect.anything(),
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_FORWARDING_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('should add ccm to receiving chain outbox and log event when valid', async () => {
			await expect(command['_forward'](context)).resolves.toBeUndefined();

			expect(internalMethod.addToOutbox).toHaveBeenCalledWith(
				context.ccm.receivingChainID,
				context.ccm,
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.SUCCESS,
					result: CCMProcessedResult.FORWARDED,
				},
			);
		});
	});
});

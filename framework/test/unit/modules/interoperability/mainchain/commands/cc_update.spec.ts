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
	CrossChainUpdateTransactionParams,
} from '../../../../../../src/modules/interoperability/types';

import { Certificate } from '../../../../../../src/engine/consensus/certificate_generation/types';
import { certificateSchema } from '../../../../../../src/engine/consensus/certificate_generation/schema';
import * as interopUtils from '../../../../../../src/modules/interoperability/utils';
import { ccmSchema } from '../../../../../../src/modules/interoperability/schemas';
import {
	CCM_STATUS_OK,
	CHAIN_ACTIVE,
	CHAIN_REGISTERED,
	CHAIN_TERMINATED,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MAINCHAIN_ID_BUFFER,
	MAX_CCM_SIZE,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityStore } from '../../../../../../src/modules/interoperability/mainchain/store';
import { BlockHeader, EventQueue } from '../../../../../../src/state_machine';
import { computeValidatorsHash } from '../../../../../../src/modules/interoperability/utils';
import { CROSS_CHAIN_COMMAND_NAME_FORWARD } from '../../../../../../src/modules/token/constants';
import { ChainAccountStore } from '../../../../../../src/modules/interoperability/stores/chain_account';
import { ChannelDataStore } from '../../../../../../src/modules/interoperability/stores/channel_data';
import { ChainValidatorsStore } from '../../../../../../src/modules/interoperability/stores/chain_validators';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../../src/testing/utils';
import { createTransientMethodContext } from '../../../../../../src/testing';

jest.mock('@liskhq/lisk-cryptography', () => ({
	...jest.requireActual('@liskhq/lisk-cryptography'),
}));

describe('CrossChainUpdateCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();

	const networkIdentifier = cryptography.utils.getRandomBytes(32);
	const defaultCertificateValues: Certificate = {
		blockID: cryptography.utils.getRandomBytes(20),
		height: 21,
		timestamp: Math.floor(Date.now() / 1000),
		stateRoot: cryptography.utils.getRandomBytes(38),
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
			status: CCM_STATUS_OK,
		},
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: utils.intToBuffer(3, 4),
			sendingChainID: defaultSendingChainIDBuffer,
			status: CCM_STATUS_OK,
		},
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: utils.intToBuffer(4, 4),
			sendingChainID: defaultSendingChainIDBuffer,
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
			networkID: cryptography.utils.getRandomBytes(32),
			status: CHAIN_ACTIVE,
		};
		partnerChannelAccount = {
			inbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: cryptography.utils.getRandomBytes(38),
				size: 18,
			},
			messageFeeTokenID: { chainID: utils.intToBuffer(1, 4), localID: utils.intToBuffer(0, 4) },
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

		jest.spyOn(MainchainInteroperabilityStore.prototype, 'isLive').mockResolvedValue(true);
		jest.spyOn(interopUtils, 'computeValidatorsHash').mockReturnValue(validatorsHash);
		jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(true);
	});

	describe('verify', () => {
		beforeEach(() => {
			verifyContext = {
				getMethodContext: () => createTransientMethodContext({ stateStore }),
				getStore: createStoreGetter(stateStore).getStore,
				logger: testing.mocks.loggerMock,
				networkIdentifier,
				params,
				transaction: defaultTransaction as any,
			};
			jest.spyOn(MainchainInteroperabilityStore.prototype, 'isLive').mockResolvedValue(true);
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
				status: CHAIN_TERMINATED,
			});

			const { status, error } = await mainchainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Sending partner chain 20 is terminated.');
		});

		it('should return error when chain is active but not live', async () => {
			jest.spyOn(MainchainInteroperabilityStore.prototype, 'isLive').mockResolvedValue(false);
			const { status, error } = await mainchainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain('Sending partner chain 20 is not live');
		});

		it('should return error checkLivenessRequirementFirstCCU fails', async () => {
			await partnerChainStore.set(createStoreGetter(stateStore), defaultSendingChainIDBuffer, {
				...partnerChainAccount,
				status: CHAIN_REGISTERED,
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

		it('should return error checkActiveValidatorsUpdate fails when Validators blsKeys are not unique and lexicographically ordered', async () => {
			const { status, error } = await mainchainCCUUpdateCommand.verify({
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

			const { status, error } = await mainchainCCUUpdateCommand.verify(verifyContext);

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

			const { status, error } = await mainchainCCUUpdateCommand.verify(verifyContext);

			expect(status).toEqual(VerifyStatus.FAIL);
			expect(error?.message).toContain(
				'Failed at verifying state root when messageWitness is non-empty and certificate is empty.',
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
				logger: testing.mocks.loggerMock,
				networkIdentifier,
				params,
				transaction: defaultTransaction as any,
				assets: new BlockAssets(),
				eventQueue: new EventQueue(),
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
				.spyOn(MainchainInteroperabilityStore.prototype, 'terminateChainInternal')
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

		it('should throw error when chain.status === CHAIN_REGISTERED and inboxUpdate is non-empty and the first CCM is not a registration CCM', async () => {
			await partnerChainStore.set(createStoreGetter(stateStore), defaultSendingChainIDBuffer, {
				...partnerChainAccount,
				status: CHAIN_REGISTERED,
			});

			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			const terminateChainInternalMock = jest
				.spyOn(MainchainInteroperabilityStore.prototype, 'terminateChainInternal')
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
				status: CCM_STATUS_OK,
			});
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			jest.spyOn(interopUtils, 'commonCCUExecutelogic').mockReturnValue({} as never);
			const terminateChainInternalMock = jest
				.spyOn(MainchainInteroperabilityStore.prototype, 'terminateChainInternal')
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
				status: CCM_STATUS_OK,
			};
			const invalidCCMSerialized = codec.encode(ccmSchema, invalidCCM);
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			jest.spyOn(interopUtils, 'commonCCUExecutelogic').mockReturnValue({} as never);

			const terminateChainInternalMock = jest
				.spyOn(MainchainInteroperabilityStore.prototype, 'terminateChainInternal')
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
				status: CCM_STATUS_OK,
			};
			const nonMainchainCCMSerialized = codec.encode(ccmSchema, nonMainchainCCM);
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			jest.spyOn(interopUtils, 'commonCCUExecutelogic').mockReturnValue({} as never);

			const appendToInboxTreeMock = jest
				.spyOn(MainchainInteroperabilityStore.prototype, 'appendToInboxTree')
				.mockResolvedValue({} as never);
			const forwardMock = jest
				.spyOn(MainchainInteroperabilityStore.prototype, 'forward')
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
				status: CCM_STATUS_OK,
			};
			const mainchainCCMSerialized = codec.encode(ccmSchema, mainchainCCM);
			jest
				.spyOn(interopUtils, 'computeValidatorsHash')
				.mockReturnValue(defaultCertificateValues.validatorsHash);
			const commonCCUExecutelogicMock = jest
				.spyOn(interopUtils, 'commonCCUExecutelogic')
				.mockReturnValue({} as never);

			const appendToInboxTreeMock = jest
				.spyOn(MainchainInteroperabilityStore.prototype, 'appendToInboxTree')
				.mockResolvedValue({} as never);
			const forwardMock = jest
				.spyOn(MainchainInteroperabilityStore.prototype, 'forward')
				.mockResolvedValue({} as never);
			const applyMock = jest
				.spyOn(MainchainInteroperabilityStore.prototype, 'apply')
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
});

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

import * as cryptography from '@liskhq/lisk-cryptography';
import { bls, utils } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { EMPTY_BUFFER } from '@liskhq/lisk-chain/dist-node/constants';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerifyStatus,
	SubmitMainchainCrossChainUpdateCommand,
	MainchainInteroperabilityModule,
	Transaction,
	BLS_SIGNATURE_LENGTH,
	EMPTY_BYTES,
} from '../../../../../../src';
import {
	ActiveValidator,
	ActiveValidatorsUpdate,
	CCMsg,
	ChainAccount,
	ChannelData,
	CrossChainMessageContext,
	CrossChainUpdateTransactionParams,
	BeforeCCMForwardingContext,
} from '../../../../../../src/modules/interoperability/types';

import { Certificate } from '../../../../../../src/engine/consensus/certificate_generation/types';
import { certificateSchema } from '../../../../../../src/engine/consensus/certificate_generation/schema';
import * as interopUtils from '../../../../../../src/modules/interoperability/utils';
import {
	computeValidatorsHash,
	getDecodedCCMAndID,
} from '../../../../../../src/modules/interoperability/utils';
import {
	ccmSchema,
	crossChainUpdateTransactionParams,
	sidechainTerminatedCCMParamsSchema,
} from '../../../../../../src/modules/interoperability/schemas';
import {
	BLS_PUBLIC_KEY_LENGTH,
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
	EMPTY_FEE_ADDRESS,
	EVENT_TOPIC_CCM_EXECUTION,
	HASH_LENGTH,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
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
	createTransactionContext,
} from '../../../../../../src/testing';
import { BaseCCMethod } from '../../../../../../src/modules/interoperability/base_cc_method';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../../../../../src/modules/interoperability/events/ccm_processed';
import { MainchainInteroperabilityInternalMethod } from '../../../../../../src/modules/interoperability/mainchain/internal_method';
import { CROSS_CHAIN_COMMAND_NAME_TRANSFER } from '../../../../../../src/modules/token/constants';
import { BaseInteroperabilityInternalMethod } from '../../../../../../src/modules/interoperability/base_interoperability_internal_methods';
import {
	OwnChainAccountStore,
	OwnChainAccount,
} from '../../../../../../src/modules/interoperability/stores/own_chain_account';

describe('SubmitMainchainCrossChainUpdateCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const chainID = Buffer.alloc(4, 0);
	const senderPublicKey = utils.getRandomBytes(32);
	const messageFeeTokenID = Buffer.alloc(8, 0);
	const defaultCertificate: Certificate = {
		blockID: cryptography.utils.getRandomBytes(HASH_LENGTH),
		height: 21,
		timestamp: Math.floor(Date.now() / 1000),
		stateRoot: utils.getRandomBytes(HASH_LENGTH),
		validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH),
		aggregationBits: cryptography.utils.getRandomBytes(1),
		signature: cryptography.utils.getRandomBytes(BLS_SIGNATURE_LENGTH),
	};

	const defaultNewCertificateThreshold = BigInt(20);
	const defaultSendingChainID = 20;
	const defaultSendingChainIDBuffer = utils.intToBuffer(defaultSendingChainID, 4);
	const defaultCCMs: CCMsg[] = [
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: Buffer.from([0, 0, 0, 2]),
			sendingChainID: defaultSendingChainIDBuffer,
			status: CCMStatusCode.OK,
		},
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: chainID,
			sendingChainID: defaultSendingChainIDBuffer,
			status: CCMStatusCode.OK,
		},
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: Buffer.from([0, 0, 0, 4]),
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
	const defaultTransaction = {
		fee: BigInt(0),
		module: interopMod.name,
		nonce: BigInt(1),
		senderPublicKey,
		signatures: [],
	};
	const internalMethod = {
		isLive: jest.fn().mockResolvedValue(true),
		addToOutbox: jest.fn(),
		terminateChainInternal: jest.fn(),
		verifyCertificate: jest.fn().mockResolvedValue(undefined),
		verifyCertificateSignature: jest.fn(),
		verifyValidatorsUpdate: jest.fn(),
		verifyPartnerChainOutboxRoot: jest.fn(),
		verifyOutboxRootWitness: jest.fn(),
		updateValidators: jest.fn(),
		updateCertificate: jest.fn(),
		updatePartnerChainOutboxRoot: jest.fn(),
		appendToInboxTree: jest.fn(),
	} as unknown as BaseInteroperabilityInternalMethod;

	let stateStore: PrefixedStateReadWriter;
	let encodedDefaultCertificate: Buffer;
	let partnerChainAccount: ChainAccount;
	let partnerChannelAccount: ChannelData;
	let verifyContext: CommandVerifyContext<CrossChainUpdateTransactionParams>;
	let executeContext: CommandExecuteContext<CrossChainUpdateTransactionParams>;
	let mainchainCCUUpdateCommand: SubmitMainchainCrossChainUpdateCommand;
	let params: CrossChainUpdateTransactionParams;
	let activeValidatorsUpdate: ActiveValidator[];
	let sortedActiveValidatorsUpdate: ActiveValidatorsUpdate;
	let partnerChainStore: ChainAccountStore;
	let partnerChannelStore: ChannelDataStore;
	let partnerValidatorStore: ChainValidatorsStore;

	beforeEach(async () => {
		mainchainCCUUpdateCommand = new SubmitMainchainCrossChainUpdateCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
			internalMethod,
		);
		mainchainCCUUpdateCommand.init(
			{
				getMessageFeeTokenID: jest.fn().mockResolvedValue(messageFeeTokenID),
				getMinReturnFeePerByte: jest.fn().mockResolvedValue(BigInt(10000000)),
			} as any,
			{
				initializeUserAccount: jest.fn(),
			},
		);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		activeValidatorsUpdate = [
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(1) },
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(3) },
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
			...defaultCertificate,
			validatorsHash,
		});

		sortedActiveValidatorsUpdate = {
			blsKeysUpdate: [
				utils.getRandomBytes(48),
				utils.getRandomBytes(48),
				utils.getRandomBytes(48),
				utils.getRandomBytes(48),
			].sort((v1, v2) => v1.compare(v2)),
			bftWeightsUpdate: [BigInt(1), BigInt(3), BigInt(4), BigInt(3)],
			bftWeightsUpdateBitmap: Buffer.from([15]),
		};
		partnerChainAccount = {
			lastCertificate: {
				height: 10,
				stateRoot: utils.getRandomBytes(38),
				timestamp: Math.floor(Date.now() / 1000),
				validatorsHash: utils.getRandomBytes(48),
			},
			name: 'sidechain1',
			status: ChainStatus.ACTIVE,
		};
		partnerChannelAccount = {
			inbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: utils.getRandomBytes(38),
				size: 18,
			},
			messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
			outbox: {
				appendPath: [Buffer.alloc(1), Buffer.alloc(1)],
				root: utils.getRandomBytes(38),
				size: 18,
			},
			partnerChainOutboxRoot: utils.getRandomBytes(38),
			minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
		};

		params = {
			activeValidatorsUpdate: sortedActiveValidatorsUpdate,
			certificate: encodedDefaultCertificate,
			inboxUpdate: { ...defaultInboxUpdateValue },
			certificateThreshold: defaultNewCertificateThreshold,
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

		jest.spyOn(interopMod['internalMethod'], 'isLive').mockResolvedValue(true);
		jest.spyOn(interopUtils, 'computeValidatorsHash').mockReturnValue(validatorsHash);
		jest.spyOn(bls, 'verifyWeightedAggSig').mockReturnValue(true);

		jest.spyOn(interopUtils, 'verifyLivenessConditionForRegisteredChains');
		jest.spyOn(validator, 'validate');
	});

	describe('verify schema', () => {
		it('should reject when sendingChainID has invalid length', () => {
			expect(() =>
				validator.validate(mainchainCCUUpdateCommand.schema, {
					...params,
					sendingChainID: Buffer.from([1, 0, 0, 0, 255]),
				}),
			).toThrow("'.sendingChainID' maxLength exceeded");
		});

		it('should reject when activeValidatorsUpdate.blsKeysUpdate has invalid length', () => {
			expect(() =>
				validator.validate(mainchainCCUUpdateCommand.schema, {
					...params,
					activeValidatorsUpdate: {
						...params.activeValidatorsUpdate,
						blsKeysUpdate: [
							...params.activeValidatorsUpdate.blsKeysUpdate,
							Buffer.alloc(BLS_PUBLIC_KEY_LENGTH + 1, 255),
						],
					},
				}),
			).toThrow("'.activeValidatorsUpdate.blsKeysUpdate.4' maxLength exceeded");
		});

		it('should reject when inboxUpdate.messageWitnessHashes has invalid length', () => {
			expect(() =>
				validator.validate(mainchainCCUUpdateCommand.schema, {
					...params,
					inboxUpdate: {
						...params.inboxUpdate,
						messageWitnessHashes: [
							...params.inboxUpdate.messageWitnessHashes,
							Buffer.alloc(HASH_LENGTH + 1, 255),
						],
					},
				}),
			).toThrow("'.inboxUpdate.messageWitnessHashes.1' maxLength exceeded");
		});

		it('should reject when inboxUpdate.outboxRootWitness.siblingHashes has invalid length', () => {
			expect(() =>
				validator.validate(mainchainCCUUpdateCommand.schema, {
					...params,
					inboxUpdate: {
						...params.inboxUpdate,
						outboxRootWitness: {
							siblingHashes: [
								...params.inboxUpdate.outboxRootWitness.siblingHashes,
								Buffer.alloc(HASH_LENGTH + 1, 255),
							],
						},
					},
				}),
			).toThrow("'.inboxUpdate.outboxRootWitness.siblingHashes.1' maxLength exceeded");
		});
	});

	/**
	 * `verifyLivenessConditionForRegisteredChains` relevant tests are covered in
	 *  framework/test/unit/modules/interoperability/utils.spec.ts
	 */
	describe('verify', () => {
		const ownChainAccount: OwnChainAccount = {
			chainID: EMPTY_BUFFER,
			name: 'ownChain',
			nonce: BigInt(1),
		};

		const activeValidators = [
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(1) },
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(3) },
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(4) },
			{ blsKey: utils.getRandomBytes(48), bftWeight: BigInt(2) },
		].sort((v1, v2) => v1.blsKey.compare(v2.blsKey));

		beforeEach(async () => {
			verifyContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: mainchainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, params),
				}),
			}).createCommandVerifyContext(mainchainCCUUpdateCommand.schema);

			await partnerChainStore.set(stateStore, defaultSendingChainIDBuffer, partnerChainAccount);
			await partnerValidatorStore.set(stateStore, defaultSendingChainIDBuffer, {
				activeValidators,
				certificateThreshold: params.certificateThreshold,
			});

			jest.spyOn(mainchainCCUUpdateCommand['internalMethod'], 'isLive').mockResolvedValue(true);
			jest
				.spyOn(MainchainInteroperabilityInternalMethod.prototype, 'isLive')
				.mockResolvedValue(true);

			await mainchainCCUUpdateCommand['stores']
				.get(OwnChainAccountStore)
				.set(stateStore, EMPTY_BYTES, {
					...ownChainAccount,
				});

			await mainchainCCUUpdateCommand['stores']
				.get(ChainAccountStore)
				.set(stateStore, params.sendingChainID, {
					...partnerChainAccount,
					status: ChainStatus.REGISTERED,
				});
		});

		it('should verify verifyCommon is called', async () => {
			jest.spyOn(mainchainCCUUpdateCommand, 'verifyCommon' as any);

			await expect(mainchainCCUUpdateCommand.verify(verifyContext)).resolves.toEqual({
				status: VerifyStatus.OK,
			});

			expect(mainchainCCUUpdateCommand['verifyCommon']).toHaveBeenCalled();
		});

		it(`should not verify liveness condition when sendingChainAccount.status == ${ChainStatus.REGISTERED} and inboxUpdate is empty`, async () => {
			await expect(
				mainchainCCUUpdateCommand.verify({
					...verifyContext,
					header: { timestamp: Math.floor(Date.now() / 1000), height: 0 },
					params: {
						...params,
						certificate: codec.encode(certificateSchema, {
							...defaultCertificate,
							timestamp: 0,
						}),
						inboxUpdate: {
							crossChainMessages: [],
							messageWitnessHashes: [],
							outboxRootWitness: {
								bitmap: Buffer.alloc(0),
								siblingHashes: [],
							},
						},
					},
				}),
			).resolves.toEqual({ status: VerifyStatus.OK });
			expect(interopUtils.verifyLivenessConditionForRegisteredChains).not.toHaveBeenCalled();
		});

		it(`should verify liveness condition when sendingChainAccount.status == ${ChainStatus.REGISTERED} and inboxUpdate is not empty`, async () => {
			await expect(
				mainchainCCUUpdateCommand.verify({
					...verifyContext,
					params: {
						...params,
						inboxUpdate: {
							crossChainMessages: [utils.getRandomBytes(100)],
							messageWitnessHashes: [utils.getRandomBytes(32)],
							outboxRootWitness: {
								bitmap: utils.getRandomBytes(2),
								siblingHashes: [utils.getRandomBytes(32)],
							},
						},
					},
				}),
			).resolves.toEqual({ status: VerifyStatus.OK });

			expect(interopUtils.verifyLivenessConditionForRegisteredChains).toHaveBeenCalled();
			expect(validator.validate).toHaveBeenCalledWith(
				certificateSchema,
				expect.toBeObject() as Certificate,
			);
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: mainchainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, params),
				}),
			}).createCommandExecuteContext(mainchainCCUUpdateCommand.schema);
			jest
				.spyOn(mainchainCCUUpdateCommand['internalMethod'], 'appendToInboxTree')
				.mockResolvedValue();
			jest.spyOn(mainchainCCUUpdateCommand, 'apply' as never).mockResolvedValue(undefined as never);
			jest
				.spyOn(mainchainCCUUpdateCommand, '_forward' as never)
				.mockResolvedValue(undefined as never);
		});

		it('should call beforeCrossChainMessagesExecution', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: mainchainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
					}),
				}),
			}).createCommandExecuteContext(mainchainCCUUpdateCommand.schema);
			jest
				.spyOn(mainchainCCUUpdateCommand, 'beforeCrossChainMessagesExecution' as never)
				.mockResolvedValue([[], true] as never);

			await expect(mainchainCCUUpdateCommand.execute(executeContext)).resolves.toBeUndefined();
			expect(mainchainCCUUpdateCommand['beforeCrossChainMessagesExecution']).toHaveBeenCalledTimes(
				1,
			);
			expect(mainchainCCUUpdateCommand['beforeCrossChainMessagesExecution']).toHaveBeenCalledWith(
				expect.anything(),
				true,
			);
		});

		it('should call panic which shutdown the application when apply fails', async () => {
			const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
				return undefined as never;
			});
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: mainchainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
					}),
				}),
			}).createCommandExecuteContext(mainchainCCUUpdateCommand.schema);
			jest
				.spyOn(mainchainCCUUpdateCommand, 'apply' as never)
				.mockRejectedValue(new Error('Something went wrong.') as never);
			await expect(mainchainCCUUpdateCommand.execute(executeContext)).resolves.toBeUndefined();
			expect(mockExit).toHaveBeenCalledWith(1);
			expect(mainchainCCUUpdateCommand['apply']).toHaveBeenCalledTimes(1);
		});

		it('should call apply for ccm and add to the inbox where receiving chain is the main chain', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: mainchainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
					}),
				}),
			}).createCommandExecuteContext(mainchainCCUUpdateCommand.schema);

			await expect(mainchainCCUUpdateCommand.execute(executeContext)).resolves.toBeUndefined();
			expect(mainchainCCUUpdateCommand['apply']).toHaveBeenCalledTimes(1);
			// Only second CCM have receivingChainID === ownChainID
			const { ccmID, decodedCCM } = getDecodedCCMAndID(params.inboxUpdate.crossChainMessages[1]);
			expect(mainchainCCUUpdateCommand['apply']).toHaveBeenCalledWith({
				...executeContext,
				ccm: decodedCCM,
				eventQueue: executeContext.eventQueue.getChildQueue(
					Buffer.concat([EVENT_TOPIC_CCM_EXECUTION, ccmID]),
				),
			});
			expect(mainchainCCUUpdateCommand['internalMethod'].appendToInboxTree).toHaveBeenCalledTimes(
				3,
			);
		});

		it('should call forward for ccm and add to the inbox where receiving chain is not the mainchain', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: mainchainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
					}),
				}),
			}).createCommandExecuteContext(mainchainCCUUpdateCommand.schema);

			await expect(mainchainCCUUpdateCommand.execute(executeContext)).resolves.toBeUndefined();
			expect(mainchainCCUUpdateCommand['_forward']).toHaveBeenCalledTimes(2);
			// First and third CCMs have receivingChainID !== ownChainID
			const { ccmID: firstCCMID, decodedCCM: firstDecodedCCM } = getDecodedCCMAndID(
				params.inboxUpdate.crossChainMessages[0],
			);
			expect(mainchainCCUUpdateCommand['_forward']).toHaveBeenCalledWith({
				...executeContext,
				ccm: firstDecodedCCM,
				eventQueue: executeContext.eventQueue.getChildQueue(
					Buffer.concat([EVENT_TOPIC_CCM_EXECUTION, firstCCMID]),
				),
			});
			const { ccmID: thirdCCMID, decodedCCM: thirdDecodedCCM } = getDecodedCCMAndID(
				params.inboxUpdate.crossChainMessages[2],
			);
			expect(mainchainCCUUpdateCommand['_forward']).toHaveBeenCalledWith({
				...executeContext,
				ccm: thirdDecodedCCM,
				eventQueue: executeContext.eventQueue.getChildQueue(
					Buffer.concat([EVENT_TOPIC_CCM_EXECUTION, thirdCCMID]),
				),
			});
			expect(mainchainCCUUpdateCommand['internalMethod'].appendToInboxTree).toHaveBeenCalledTimes(
				3,
			);
		});

		it('should call panic which shutdown the application when forward fails', async () => {
			const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
				return undefined as never;
			});
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: mainchainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
					}),
				}),
			}).createCommandExecuteContext(mainchainCCUUpdateCommand.schema);
			jest
				.spyOn(mainchainCCUUpdateCommand, '_forward' as never)
				.mockRejectedValue(new Error('Something went wrong.') as never);
			await expect(mainchainCCUUpdateCommand.execute(executeContext)).resolves.toBeUndefined();
			expect(mockExit).toHaveBeenCalledWith(1);
			expect(mainchainCCUUpdateCommand['_forward']).toHaveBeenCalledTimes(1);
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
			status: ChainStatus.REGISTERED,
			params: Buffer.alloc(0),
		};
		let context: CrossChainMessageContext;
		let command: SubmitMainchainCrossChainUpdateCommand;
		let ccMethods: Map<string, BaseCCMethod>;
		let ccCommands: Map<string, BaseCCCommand[]>;

		beforeEach(async () => {
			const interopModule = new MainchainInteroperabilityModule();
			ccMethods = new Map();
			ccMethods.set(
				'token',
				new (class TokenMethod extends BaseCCMethod {
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
			command = new SubmitMainchainCrossChainUpdateCommand(
				interopModule.stores,
				interopModule.events,
				ccMethods,
				ccCommands,
				interopMod['internalMethod'],
			);
			command.init(
				{
					getMessageFeeTokenID: jest.fn().mockResolvedValue(messageFeeTokenID),
					getMinReturnFeePerByte: jest.fn().mockResolvedValue(BigInt(10000000)),
				} as any,
				{
					initializeUserAccount: jest.fn(),
				},
			);
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

		// verifyCCM related tests are handled separately in describe('verifyCCM') block
		it('should call verifyCCM & simply return when it fails', async () => {
			jest.spyOn(command, 'verifyCCM' as any).mockResolvedValue(false);

			jest.spyOn(command['stores'], 'get');

			await expect(command['_forward'](context)).resolves.toBeUndefined();
			expect(command['verifyCCM']).toHaveBeenCalled();

			// shouldn't proceed to fetching anything from stores
			expect(command['stores'].get).not.toHaveBeenCalled();
		});

		describe('_beforeCrossChainMessageForwarding', () => {
			let beforeCCMForwardingContext: BeforeCCMForwardingContext;

			beforeEach(() => {
				beforeCCMForwardingContext = { ...context, ccmFailed: false };

				(
					(ccMethods.get('token') as BaseCCMethod).beforeCrossChainMessageForwarding as jest.Mock
				).mockRejectedValue('error');

				jest
					.spyOn(command['internalMethod'], 'terminateChainInternal')
					.mockResolvedValue(undefined);
			});

			it('should revert to the original state/event when beforeCrossChainMessageForwarding fails', async () => {
				jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
				jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);

				jest.spyOn(context.eventQueue, 'restoreSnapshot');
				jest.spyOn(context.stateStore, 'restoreSnapshot');

				const result = await command['_beforeCrossChainMessageForwarding'](
					beforeCCMForwardingContext,
					99,
					10,
				);
				expect(result).toBe(false);

				expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
				expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
			});

			it('should terminate the chain and log event when beforeCrossChainMessageForwarding fails', async () => {
				jest.spyOn(command['internalMethod'], 'terminateChainInternal');

				const result = await command['_beforeCrossChainMessageForwarding'](
					beforeCCMForwardingContext,
					99,
					10,
				);
				expect(result).toBe(false);

				expect(command['internalMethod'].terminateChainInternal).toHaveBeenCalledWith(
					expect.anything(),
					context.ccm.sendingChainID,
				);
				expect(context.eventQueue.getEvents()).toHaveLength(1);
				expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
					expect.anything(),
					context.ccm.sendingChainID,
					context.ccm.receivingChainID,
					{
						ccm: context.ccm,
						code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_FORWARDING_EXCEPTION,
						result: CCMProcessedResult.DISCARDED,
					},
				);
			});
		});

		const runBounceRelevantCommonTests = () => {
			it('should call _beforeCrossChainMessageForwarding & simply return when it fails', async () => {
				jest.spyOn(command, '_beforeCrossChainMessageForwarding' as any).mockResolvedValue(false); // cause failure

				await expect(command['_forward'](context)).resolves.toBeUndefined();

				expect(command['_beforeCrossChainMessageForwarding']).toHaveBeenCalledTimes(1);

				// shouldn't call `bounce`
				expect(command['bounce']).not.toHaveBeenCalled();
			});

			it("should call _beforeCrossChainMessageForwarding then bounce and return when _beforeCrossChainMessageForwarding doesn't cause any error", async () => {
				jest.spyOn(command, '_beforeCrossChainMessageForwarding' as any).mockResolvedValue(true); // make it pass

				await expect(command['_forward'](context)).resolves.toBeUndefined();

				expect(command['_beforeCrossChainMessageForwarding']).toHaveBeenCalledTimes(1);
				expect(command['bounce']).toHaveBeenCalledTimes(1);
				expect(command['bounce']).toHaveBeenCalledWith(
					context,
					expect.any(Number),
					CCMStatusCode.CHANNEL_UNAVAILABLE,
					CCMProcessedCode.CHANNEL_UNAVAILABLE,
				);
			});
		};

		describe('when receiving chain account does not exist', () => {
			beforeEach(async () => {
				await command['stores'].get(ChainAccountStore).del(context, context.ccm.receivingChainID);
				jest.spyOn(command['stores'].get(ChainAccountStore), 'has');
			});

			it('should return false', async () => {
				await expect(command['_forward'](context)).resolves.toBeUndefined();

				expect(
					await command['stores'].get(ChainAccountStore).has(context, context.ccm.receivingChainID),
				).toBe(false);
			});

			runBounceRelevantCommonTests();
		});

		describe('when receiving chain status is registered', () => {
			let receivingChainAccount: ChainAccount;

			beforeEach(async () => {
				receivingChainAccount = {
					lastCertificate: {
						height: 0,
						stateRoot: utils.getRandomBytes(32),
						timestamp: 0,
						validatorsHash: utils.getRandomBytes(32),
					},
					name: 'foo',
					status: ChainStatus.REGISTERED,
				};

				// pre-set account
				await command['stores']
					.get(ChainAccountStore)
					.set(context, context.ccm.receivingChainID, receivingChainAccount);
			});

			it('should return status REGISTERED', async () => {
				await expect(command['_forward'](context)).resolves.toBeUndefined();

				const account = await command['stores']
					.get(ChainAccountStore)
					.get(context, context.ccm.receivingChainID);

				expect(account.status).toBe(ChainStatus.REGISTERED);
			});

			runBounceRelevantCommonTests();
		});

		describe('when receiving chain is not live', () => {
			let chainAccount: ChainAccount;
			const sendInternalMock = jest.fn();

			beforeEach(async () => {
				// first checks sending chain & second receiving
				(interopMod['internalMethod'].isLive as jest.Mock)
					.mockResolvedValueOnce(true)
					.mockResolvedValueOnce(false);

				interopMod['internalMethod'].sendInternal = sendInternalMock;

				chainAccount = await command['stores']
					.get(ChainAccountStore)
					.get(context, context.ccm.receivingChainID);
			});

			it('should terminate the chain when receiving chain is not live', async () => {
				jest.spyOn(interopMod['internalMethod'], 'terminateChainInternal');

				await expect(command['_forward'](context)).resolves.toBeUndefined();

				expect(interopMod['internalMethod'].terminateChainInternal).toHaveBeenCalledWith(
					expect.anything(),
					context.ccm.receivingChainID,
				);
			});

			it('should call sendInternal', async () => {
				await expect(command['_forward'](context)).resolves.toBeUndefined();

				expect(sendInternalMock).toHaveBeenCalledWith(
					expect.anything(),
					EMPTY_FEE_ADDRESS,
					MODULE_NAME_INTEROPERABILITY,
					CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
					context.ccm.sendingChainID,
					BigInt(0),
					CCMStatusCode.OK,
					codec.encode(sidechainTerminatedCCMParamsSchema, {
						chainID: context.ccm.receivingChainID,
						stateRoot: chainAccount.lastCertificate.stateRoot,
					}),
				);
			});

			runBounceRelevantCommonTests();
		});

		it("should call _beforeCrossChainMessageForwarding & if it fails, don't add ccm to receiving chain outbox & don't log event when live", async () => {
			jest.spyOn(command, '_beforeCrossChainMessageForwarding' as any).mockResolvedValue(false); // cause failure

			const addToOutboxMock = jest.fn();
			interopMod['internalMethod'].addToOutbox = addToOutboxMock;

			await expect(command['_forward'](context)).resolves.toBeUndefined();

			expect(command['_beforeCrossChainMessageForwarding']).toHaveBeenCalled();
			expect(addToOutboxMock).not.toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm,
			);
			expect(command['events'].get(CcmProcessedEvent).log).not.toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccm: context.ccm,
					code: CCMProcessedCode.SUCCESS,
					result: CCMProcessedResult.FORWARDED,
				},
			);
		});

		it('should call _beforeCrossChainMessageForwarding & if it pass, add ccm to receiving chain outbox and log event when live', async () => {
			jest.spyOn(command, '_beforeCrossChainMessageForwarding' as any).mockResolvedValue(true); // make it pass

			const addToOutboxMock = jest.fn();
			interopMod['internalMethod'].addToOutbox = addToOutboxMock;

			await expect(command['_forward'](context)).resolves.toBeUndefined();

			expect(command['_beforeCrossChainMessageForwarding']).toHaveBeenCalled();
			expect(addToOutboxMock).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm,
			);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				context.ccm.receivingChainID,
				{
					ccm: context.ccm,
					code: CCMProcessedCode.SUCCESS,
					result: CCMProcessedResult.FORWARDED,
				},
			);
		});
	});
});

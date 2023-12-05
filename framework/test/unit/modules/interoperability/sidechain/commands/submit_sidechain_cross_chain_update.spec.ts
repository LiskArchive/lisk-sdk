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

import { bls, utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { Transaction } from '@liskhq/lisk-chain';
import { EMPTY_BUFFER } from '@liskhq/lisk-chain/dist-node/constants';
import { StateMachine, Modules } from '../../../../../../src';
import {
	ActiveValidator,
	ActiveValidatorsUpdate,
	CCMsg,
	ChainAccount,
	ChannelData,
	CrossChainUpdateTransactionParams,
} from '../../../../../../src/modules/interoperability/types';
import { SubmitSidechainCrossChainUpdateCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/submit_sidechain_cross_chain_update';
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
} from '../../../../../../src/modules/interoperability/schemas';
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
	EVENT_TOPIC_CCM_EXECUTION,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../../../src/modules/interoperability/stores/chain_account';
import { ChannelDataStore } from '../../../../../../src/modules/interoperability/stores/channel_data';
import { ChainValidatorsStore } from '../../../../../../src/modules/interoperability/stores/chain_validators';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../../src/testing/utils';
import { createTransactionContext } from '../../../../../../src/testing';
import { CROSS_CHAIN_COMMAND_NAME_TRANSFER } from '../../../../../../src/modules/token/constants';
import { BaseInteroperabilityInternalMethod } from '../../../../../../src/modules/interoperability/base_interoperability_internal_methods';
import {
	OwnChainAccountStore,
	OwnChainAccount,
} from '../../../../../../src/modules/interoperability/stores/own_chain_account';

describe('SubmitSidechainCrossChainUpdateCommand', () => {
	const interopMod = new Modules.Interoperability.SidechainInteroperabilityModule();
	const senderPublicKey = utils.getRandomBytes(32);
	const messageFeeTokenID = Buffer.alloc(8, 0);

	const chainID = Buffer.from([0, 0, 2, 0]);
	const defaultCertificate: Certificate = {
		blockID: utils.getRandomBytes(20),
		height: 21,
		timestamp: Math.floor(Date.now() / 1000),
		stateRoot: utils.getRandomBytes(38),
		validatorsHash: utils.getRandomBytes(48),
		aggregationBits: utils.getRandomBytes(38),
		signature: utils.getRandomBytes(32),
	};

	const defaultNewCertificateThreshold = BigInt(20);
	const defaultSendingChainID = Buffer.from([0, 0, 0, 0]);
	const defaultCCMs: CCMsg[] = [
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: chainID,
			sendingChainID: defaultSendingChainID,
			status: CCMStatusCode.OK,
		},
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: chainID,
			sendingChainID: defaultSendingChainID,
			status: CCMStatusCode.OK,
		},
		{
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
			fee: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			nonce: BigInt(1),
			params: Buffer.alloc(2),
			receivingChainID: chainID,
			sendingChainID: defaultSendingChainID,
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
	let verifyContext: StateMachine.CommandVerifyContext<CrossChainUpdateTransactionParams>;
	let executeContext: StateMachine.CommandExecuteContext<CrossChainUpdateTransactionParams>;
	let sidechainCCUUpdateCommand: SubmitSidechainCrossChainUpdateCommand;
	let params: CrossChainUpdateTransactionParams;
	let activeValidatorsUpdate: ActiveValidator[];
	let sortedActiveValidatorsUpdate: ActiveValidatorsUpdate;
	let partnerChainStore: ChainAccountStore;
	let partnerChannelStore: ChannelDataStore;
	let partnerValidatorStore: ChainValidatorsStore;

	beforeEach(async () => {
		sidechainCCUUpdateCommand = new SubmitSidechainCrossChainUpdateCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
			internalMethod,
		);
		sidechainCCUUpdateCommand.init(
			{
				getMessageFeeTokenID: jest.fn().mockResolvedValue(messageFeeTokenID),
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
			sendingChainID: defaultSendingChainID,
		};

		partnerChainStore = interopMod.stores.get(ChainAccountStore);
		await partnerChainStore.set(
			createStoreGetter(stateStore),
			defaultSendingChainID,
			partnerChainAccount,
		);

		partnerChannelStore = interopMod.stores.get(ChannelDataStore);
		await partnerChannelStore.set(
			createStoreGetter(stateStore),
			defaultSendingChainID,
			partnerChannelAccount,
		);

		partnerValidatorStore = interopMod.stores.get(ChainValidatorsStore);
		await partnerValidatorStore.set(
			createStoreGetter(stateStore),
			defaultSendingChainID,
			partnerValidatorsData,
		);

		jest.spyOn(sidechainCCUUpdateCommand['internalMethod'], 'isLive').mockResolvedValue(true);

		jest.spyOn(interopUtils, 'computeValidatorsHash').mockReturnValue(validatorsHash);
		jest.spyOn(bls, 'verifyWeightedAggSig').mockReturnValue(true);
	});

	describe('verify', () => {
		const ownChainAccount: OwnChainAccount = {
			chainID: EMPTY_BUFFER,
			name: 'ownChain',
			nonce: BigInt(1),
		};

		beforeEach(async () => {
			verifyContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: sidechainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, params),
				}),
			}).createCommandVerifyContext(sidechainCCUUpdateCommand.schema);

			await sidechainCCUUpdateCommand['stores']
				.get(OwnChainAccountStore)
				.set(stateStore, Modules.Interoperability.EMPTY_BYTES, {
					...ownChainAccount,
				});

			jest.spyOn(sidechainCCUUpdateCommand['internalMethod'], 'isLive').mockResolvedValue(true);
		});

		it('should check if verifyCommon is called', async () => {
			jest.spyOn(sidechainCCUUpdateCommand, 'verifyCommon' as any);

			await expect(sidechainCCUUpdateCommand.verify(verifyContext)).resolves.toEqual({
				status: StateMachine.VerifyStatus.OK,
			});

			expect(sidechainCCUUpdateCommand['verifyCommon']).toHaveBeenCalled();
		});

		it('should call isLive with only 2 params', async () => {
			jest.spyOn(sidechainCCUUpdateCommand['internalMethod'], 'isLive');

			await expect(
				sidechainCCUUpdateCommand.verify({
					...verifyContext,
					params: { ...params } as any,
				}),
			).resolves.toEqual({ status: StateMachine.VerifyStatus.OK });

			expect(sidechainCCUUpdateCommand['internalMethod'].isLive).not.toHaveBeenCalledWith(
				verifyContext,
				verifyContext.params.sendingChainID,
				verifyContext.header.timestamp,
			);

			// should be tested later, otherwise, it can pass even if above fails
			expect(sidechainCCUUpdateCommand['internalMethod'].isLive).toHaveBeenCalledWith(
				verifyContext,
				verifyContext.params.sendingChainID,
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
					command: sidechainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, params),
				}),
			}).createCommandExecuteContext(sidechainCCUUpdateCommand.schema);
			jest
				.spyOn(sidechainCCUUpdateCommand['internalMethod'], 'appendToInboxTree')
				.mockResolvedValue(undefined);
			jest.spyOn(sidechainCCUUpdateCommand, 'apply' as never).mockResolvedValue(undefined as never);
		});

		it('should call beforeCrossChainMessagesExecution', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: sidechainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
					}),
				}),
			}).createCommandExecuteContext(sidechainCCUUpdateCommand.schema);
			jest
				.spyOn(sidechainCCUUpdateCommand, 'beforeCrossChainMessagesExecution' as never)
				.mockResolvedValue([[], true] as never);

			await expect(sidechainCCUUpdateCommand.execute(executeContext)).resolves.toBeUndefined();
			expect(sidechainCCUUpdateCommand['beforeCrossChainMessagesExecution']).toHaveBeenCalledTimes(
				1,
			);
			expect(sidechainCCUUpdateCommand['beforeCrossChainMessagesExecution']).toHaveBeenCalledWith(
				expect.anything(),
				false,
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
					command: sidechainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
					}),
				}),
			}).createCommandExecuteContext(sidechainCCUUpdateCommand.schema);
			jest
				.spyOn(sidechainCCUUpdateCommand, 'apply' as never)
				.mockRejectedValue(new Error('Something went wrong.') as never);
			await expect(sidechainCCUUpdateCommand.execute(executeContext)).resolves.toBeUndefined();
			expect(mockExit).toHaveBeenCalledWith(1);
			expect(sidechainCCUUpdateCommand['apply']).toHaveBeenCalledTimes(1);
		});

		it('should call apply for ccm and add to the inbox where receiving chain is the main chain', async () => {
			executeContext = createTransactionContext({
				chainID,
				stateStore,
				transaction: new Transaction({
					...defaultTransaction,
					command: sidechainCCUUpdateCommand.name,
					params: codec.encode(crossChainUpdateTransactionParams, {
						...params,
					}),
				}),
			}).createCommandExecuteContext(sidechainCCUUpdateCommand.schema);

			await expect(sidechainCCUUpdateCommand.execute(executeContext)).resolves.toBeUndefined();
			expect(sidechainCCUUpdateCommand['apply']).toHaveBeenCalledTimes(3);
			for (const ccm of params.inboxUpdate.crossChainMessages) {
				const { ccmID, decodedCCM } = getDecodedCCMAndID(ccm);
				expect(sidechainCCUUpdateCommand['apply']).toHaveBeenCalledWith({
					...executeContext,
					ccm: decodedCCM,
					eventQueue: executeContext.eventQueue.getChildQueue(
						Buffer.concat([EVENT_TOPIC_CCM_EXECUTION, ccmID]),
					),
				});
			}
			expect(sidechainCCUUpdateCommand['internalMethod'].appendToInboxTree).toHaveBeenCalledTimes(
				3,
			);
		});
	});
});

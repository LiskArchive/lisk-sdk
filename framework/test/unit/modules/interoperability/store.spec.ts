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
import { regularMerkleTree } from '@liskhq/lisk-tree';
import {
	CCM_STATUS_CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
	CCM_STATUS_MODULE_NOT_SUPPORTED,
	CCM_STATUS_OK,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	EMPTY_BYTES,
	EMPTY_FEE_ADDRESS,
	MAINCHAIN_ID,
	MAINCHAIN_ID_BUFFER,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityStore } from '../../../../src/modules/interoperability/mainchain/store';
import { getCCMSize, getIDAsKeyForStore } from '../../../../src/modules/interoperability/utils';
import { MainchainInteroperabilityModule, testing } from '../../../../src';
import { CCMApplyContext, CCUpdateParams } from '../../../../src/modules/interoperability/types';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { ChannelDataStore } from '../../../../src/modules/interoperability/stores/channel_data';
import { OutboxRootStore } from '../../../../src/modules/interoperability/stores/outbox_root';
import {
	TerminatedOutboxAccount,
	TerminatedOutboxStore,
} from '../../../../src/modules/interoperability/stores/terminated_outbox';
import { ChainAccountStore } from '../../../../src/modules/interoperability/stores/chain_account';
import { TerminatedStateStore } from '../../../../src/modules/interoperability/stores/terminated_state';
import { createStoreGetter } from '../../../../src/testing/utils';
import { StoreGetter } from '../../../../src/modules/base_store';
import { NamedRegistry } from '../../../../src/modules/named_registry';
import { EventQueue } from '../../../../src/state_machine';
import { ChainAccountUpdatedEvent } from '../../../../src/modules/interoperability/events/chain_account_updated';
import { TerminatedStateCreatedEvent } from '../../../../src/modules/interoperability/events/terminated_state_created';

describe('Base interoperability store', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const chainID = Buffer.from('01', 'hex');
	const appendData = Buffer.from(
		'0c4c839c0fd8155fd0d52efc7dd29d2a71919dee517d50967cd26f4db2e0d1c5b',
		'hex',
	);
	const CCM = {
		nonce: BigInt(0),
		module: 'token',
		crossChainCommand: 'crossChainTransfer',
		sendingChainID: utils.intToBuffer(2, 4),
		receivingChainID: utils.intToBuffer(3, 4),
		fee: BigInt(1),
		status: 1,
		params: Buffer.alloc(0),
	};
	const inboxTree = {
		root: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: [
			Buffer.from('6d391e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c', 'hex'),
		],
		size: 1,
	};
	const updatedInboxTree = {
		root: Buffer.from('888d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: [
			Buffer.from('aaaa1e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c', 'hex'),
		],
		size: 2,
	};
	const outboxTree = {
		root: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: [
			Buffer.from('6d391e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c', 'hex'),
		],
		size: 1,
	};
	const updatedOutboxTree = {
		root: Buffer.from('888d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: [
			Buffer.from('aaaa1e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c', 'hex'),
		],
		size: 2,
	};
	const channelData = {
		inbox: inboxTree,
		outbox: outboxTree,
		partnerChainOutboxRoot: Buffer.alloc(0),
		messageFeeTokenID: {
			chainID: utils.intToBuffer(0, 4),
			localID: utils.intToBuffer(0, 4),
		},
	};
	const chainAccount = {
		name: 'account1',
		lastCertificate: {
			height: 567467,
			timestamp: 2592000,
			stateRoot: Buffer.alloc(0),
			validatorsHash: Buffer.alloc(0),
		},
		status: 2739,
	};
	const chainAccount2 = {
		name: 'account2',
		lastCertificate: {
			height: 567467,
			timestamp: 2592000,
			stateRoot: Buffer.alloc(0),
			validatorsHash: Buffer.alloc(0),
		},
		status: 4567,
	};
	let mainchainInteroperabilityStore: MainchainInteroperabilityStore;
	let channelDataSubstore: ChannelDataStore;
	let outboxRootSubstore: OutboxRootStore;
	let terminatedOutboxSubstore: TerminatedOutboxStore;
	let stateStore: PrefixedStateReadWriter;
	let chainDataSubstore: ChainAccountStore;
	let terminatedStateSubstore: TerminatedStateStore;
	let context: StoreGetter;

	beforeEach(async () => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		context = createStoreGetter(stateStore);
		regularMerkleTree.calculateMerkleRoot = jest.fn().mockReturnValue(updatedOutboxTree);
		channelDataSubstore = interopMod.stores.get(ChannelDataStore);
		await channelDataSubstore.set(context, chainID, channelData);
		jest.spyOn(channelDataSubstore, 'set');
		outboxRootSubstore = interopMod.stores.get(OutboxRootStore);
		jest.spyOn(outboxRootSubstore, 'set');
		terminatedOutboxSubstore = interopMod.stores.get(TerminatedOutboxStore);
		jest.spyOn(terminatedOutboxSubstore, 'set');
		chainDataSubstore = interopMod.stores.get(ChainAccountStore);
		terminatedStateSubstore = interopMod.stores.get(TerminatedStateStore);
		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			interopMod.stores,
			context,
			new Map(),
			interopMod.events,
		);
	});

	describe('appendToInboxTree', () => {
		it('should update the channel store with the new inbox tree info', async () => {
			// Act
			await mainchainInteroperabilityStore.appendToInboxTree(chainID, appendData);

			// Assert
			expect(channelDataSubstore.set).toHaveBeenCalledWith(expect.anything(), chainID, {
				...channelData,
				inbox: updatedInboxTree,
			});
		});
	});

	describe('appendToOutboxTree', () => {
		it('should update the channel store with the new outbox tree info', async () => {
			// Act
			await mainchainInteroperabilityStore.appendToOutboxTree(chainID, appendData);

			// Assert
			expect(channelDataSubstore.set).toHaveBeenCalledWith(expect.anything(), chainID, {
				...channelData,
				outbox: updatedOutboxTree,
			});
		});
	});

	describe('addToOutbox', () => {
		it('should update the outbox tree root store with the new outbox root', async () => {
			// Act
			await mainchainInteroperabilityStore.addToOutbox(chainID, CCM);

			// Assert
			expect(outboxRootSubstore.set).toHaveBeenCalledWith(
				expect.anything(),
				chainID,
				updatedOutboxTree,
			);
		});
	});

	describe('createTerminatedOutboxAccount', () => {
		it('should initialise terminated outbox account in store', async () => {
			const partnerChainInboxSize = 2;

			// Act
			await mainchainInteroperabilityStore.createTerminatedOutboxAccount(
				chainID,
				outboxTree.root,
				outboxTree.size,
				partnerChainInboxSize,
			);

			// Assert
			expect(terminatedOutboxSubstore.set).toHaveBeenCalledWith(expect.anything(), chainID, {
				outboxRoot: outboxTree.root,
				outboxSize: outboxTree.size,
				partnerChainInboxSize,
			});
		});
	});

	describe('createTerminatedStateAccount', () => {
		const chainId = utils.intToBuffer(5, 4);
		const stateRoot = Buffer.from('888d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex');
		const ownChainAccount1 = {
			name: 'mainchain',
			chainID: MAINCHAIN_ID_BUFFER,
			nonce: BigInt('0'),
		};

		const ownChainAccount2 = {
			name: 'chain1',
			chainID: utils.intToBuffer(7, 4),
			nonce: BigInt('0'),
		};

		const createTerminatedStateAccountContext = {
			eventQueue: new EventQueue(0),
		};
		let chainAccountUpdatedEvent: ChainAccountUpdatedEvent;
		let terminatedStateCreatedEvent: TerminatedStateCreatedEvent;

		beforeEach(() => {
			chainAccountUpdatedEvent = mainchainInteroperabilityStore.events.get(
				ChainAccountUpdatedEvent,
			);
			terminatedStateCreatedEvent = mainchainInteroperabilityStore.events.get(
				TerminatedStateCreatedEvent,
			);
			jest.spyOn(chainAccountUpdatedEvent, 'log');
			jest.spyOn(terminatedStateCreatedEvent, 'log');
		});

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account exists for the id and state root is provided', async () => {
			await chainDataSubstore.set(context, chainId, chainAccount);
			await mainchainInteroperabilityStore.createTerminatedStateAccount(
				createTerminatedStateAccountContext,
				chainId,
				stateRoot,
			);

			await expect(terminatedStateSubstore.get(context, chainId)).resolves.toStrictEqual({
				stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			});
			expect(chainAccountUpdatedEvent.log).toHaveBeenCalledWith(
				{ eventQueue: createTerminatedStateAccountContext.eventQueue },
				chainId,
				chainAccount,
			);
			expect(terminatedStateCreatedEvent.log).toHaveBeenCalledWith(
				{ eventQueue: createTerminatedStateAccountContext.eventQueue },
				chainId,
				{
					stateRoot,
					mainchainStateRoot: EMPTY_BYTES,
					initialized: true,
				},
			);
		});

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account exists for the id but state root is not provided', async () => {
			await chainDataSubstore.set(context, chainId, chainAccount);
			await mainchainInteroperabilityStore.createTerminatedStateAccount(
				createTerminatedStateAccountContext,
				chainId,
			);

			await expect(terminatedStateSubstore.get(context, chainId)).resolves.toStrictEqual({
				stateRoot: chainAccount.lastCertificate.stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			});
		});

		it('should throw error if chain account does not exist for the id and ownchain account id is mainchain id', async () => {
			const chainIdNew = utils.intToBuffer(9, 4);
			jest
				.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount')
				.mockResolvedValue(ownChainAccount1 as never);

			await expect(
				mainchainInteroperabilityStore.createTerminatedStateAccount(
					createTerminatedStateAccountContext,
					chainIdNew,
				),
			).rejects.toThrow('Chain to be terminated is not valid');
		});

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account does not exist for the id and ownchain account id is not the same as mainchain id', async () => {
			const chainIdNew = utils.intToBuffer(10, 4);
			jest
				.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount')
				.mockResolvedValue(ownChainAccount2 as never);
			await chainDataSubstore.set(context, getIDAsKeyForStore(MAINCHAIN_ID), chainAccount);
			await mainchainInteroperabilityStore.createTerminatedStateAccount(
				createTerminatedStateAccountContext,
				chainIdNew,
			);

			await expect(terminatedStateSubstore.get(context, chainIdNew)).resolves.toStrictEqual({
				stateRoot: EMPTY_BYTES,
				mainchainStateRoot: chainAccount.lastCertificate.stateRoot,
				initialized: false,
			});
			expect(terminatedStateCreatedEvent.log).toHaveBeenCalledWith(
				{ eventQueue: createTerminatedStateAccountContext.eventQueue },
				chainIdNew,
				{
					stateRoot: chainAccount.lastCertificate.stateRoot,
					mainchainStateRoot: EMPTY_BYTES,
					initialized: false,
				},
			);
		});
	});

	describe('terminateChainInternal', () => {
		const SIDECHAIN_ID = utils.intToBuffer(2, 4);
		const ccm = {
			nonce: BigInt(0),
			module: 'token',
			crossChainCommand: 'crossChainTransfer',
			sendingChainID: utils.intToBuffer(2, 4),
			receivingChainID: utils.intToBuffer(3, 4),
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};
		const beforeSendCCMContext = testing.createBeforeSendCCMsgMethodContext({
			ccm,
			feeAddress: utils.getRandomBytes(32),
		});

		beforeEach(() => {
			mainchainInteroperabilityStore.sendInternal = jest.fn().mockResolvedValue(true);
			mainchainInteroperabilityStore.createTerminatedStateAccount = jest
				.fn()
				.mockResolvedValue(true);
		});

		it('should return true if sendInternal and createTerminatedStateAccount return true', async () => {
			expect(
				await mainchainInteroperabilityStore.terminateChainInternal(
					SIDECHAIN_ID,
					beforeSendCCMContext,
				),
			).toBe(true);
		});

		it('should return false if sendInternal returns false', async () => {
			// Arrange
			mainchainInteroperabilityStore.sendInternal = jest.fn().mockResolvedValue(false);

			expect(
				await mainchainInteroperabilityStore.terminateChainInternal(
					SIDECHAIN_ID,
					beforeSendCCMContext,
				),
			).toBe(false);
		});
	});

	describe('apply', () => {
		let mainchainStoreLocal: MainchainInteroperabilityStore;

		const ccm = {
			nonce: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
			sendingChainID: utils.intToBuffer(2, 4),
			receivingChainID: utils.intToBuffer(3, 4),
			fee: BigInt(54000),
			status: CCM_STATUS_OK,
			params: Buffer.alloc(0),
		};

		const inboxUpdate = {
			crossChainMessages: [],
			messageWitness: {
				partnerChainOutboxSize: BigInt(0),
				siblingHashes: [],
			},
			outboxRootWitness: {
				bitmap: Buffer.alloc(0),
				siblingHashes: [],
			},
		};

		const ccCommands = [
			{
				name: ccm.crossChainCommand,
				execute: jest.fn(),
			},
		];
		const ccCommandsMap = new Map();
		ccCommandsMap.set(MODULE_NAME_INTEROPERABILITY, ccCommands);

		const ccMethodMod1 = {
			beforeSendCCM: jest.fn(),
			beforeApplyCCM: jest.fn(),
		};
		const ccMethodMod2 = {
			beforeSendCCM: jest.fn(),
			beforeApplyCCM: jest.fn(),
		};

		const ccMethodModsMap = new Map();
		ccMethodModsMap.set('cc1', ccMethodMod1);
		ccMethodModsMap.set('cc2', ccMethodMod2);

		const ccu: CCUpdateParams = {
			activeValidatorsUpdate: [],
			certificate: Buffer.alloc(0),
			inboxUpdate,
			newCertificateThreshold: BigInt(0),
			sendingChainID: utils.intToBuffer(2, 4),
		};

		const beforeSendCCMContext = testing.createBeforeSendCCMsgMethodContext({
			ccm,
			feeAddress: utils.getRandomBytes(32),
		});

		const beforeApplyCCMContext = testing.createBeforeApplyCCMsgMethodContext({
			...beforeSendCCMContext,
			ccm,
			ccu,
			payFromAddress: EMPTY_FEE_ADDRESS,
			trsSender: utils.getRandomBytes(20),
		});

		const ccmApplyContext: CCMApplyContext = {
			ccm,
			ccu,
			ccmSize: getCCMSize(ccm),
			eventQueue: beforeSendCCMContext.eventQueue,
			getMethodContext: beforeSendCCMContext.getMethodContext,
			getStore: beforeSendCCMContext.getStore,
			logger: beforeSendCCMContext.logger,
			chainID: beforeSendCCMContext.chainID,
			feeAddress: Buffer.alloc(0),
			trsSender: beforeApplyCCMContext.trsSender,
		};

		beforeEach(() => {
			mainchainStoreLocal = new MainchainInteroperabilityStore(
				interopMod.stores,
				context,
				ccMethodModsMap,
				new NamedRegistry(),
			);
		});

		it('should return immediately if sending chain is terminated', async () => {
			// Arrange
			mainchainStoreLocal.hasTerminatedStateAccount = jest.fn().mockResolvedValue(true);

			// Act & Assert
			await expect(
				mainchainStoreLocal.apply(ccmApplyContext, ccCommandsMap),
			).resolves.toBeUndefined();
			expect(ccMethodMod1.beforeApplyCCM).toHaveBeenCalledTimes(0);
		});

		it('should call all the interoperable beforeApplyCCM hooks', async () => {
			// Arrange
			const ccMethodSampleMod = {
				beforeSendCCM: jest.fn(),
				beforeApplyCCM: jest.fn(),
			};
			mainchainStoreLocal = new MainchainInteroperabilityStore(
				interopMod.stores,
				context,
				new Map().set('mod1', ccMethodSampleMod),
				new NamedRegistry(),
			);
			mainchainStoreLocal.hasTerminatedStateAccount = jest.fn().mockResolvedValue(false);
			jest.spyOn(mainchainStoreLocal, 'sendInternal');

			// Act & Assert
			await expect(
				mainchainStoreLocal.apply(ccmApplyContext, ccCommandsMap),
			).resolves.toBeUndefined();
			expect(ccMethodSampleMod.beforeApplyCCM).toHaveBeenCalledTimes(1);
			expect(ccMethodSampleMod.beforeApplyCCM).toHaveBeenCalledWith(
				expect.toContainAllKeys(Object.keys(beforeApplyCCMContext)),
			);
		});

		it('should not execute CCMs and return when module is not supported', async () => {
			// Arrange
			const localCCCommandsMap = new Map().set('mod1', [
				{
					name: 'newMod',
					execute: jest.fn(),
				},
			]);
			mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
				interopMod.stores,
				context,
				new Map().set('newMod', ccMethodMod1),
				new NamedRegistry(),
			);
			mainchainStoreLocal.hasTerminatedStateAccount = jest.fn().mockResolvedValue(false);
			jest.spyOn(mainchainStoreLocal, 'sendInternal');

			// Act & Assert
			await expect(
				mainchainStoreLocal.apply(ccmApplyContext, localCCCommandsMap),
			).resolves.toBeUndefined();
			expect(ccMethodMod1.beforeApplyCCM).toHaveBeenCalledTimes(1);
			expect(ccMethodMod1.beforeApplyCCM).toHaveBeenCalledWith(
				expect.toContainAllKeys(Object.keys(beforeApplyCCMContext)),
			);
			expect(mainchainStoreLocal.sendInternal).toHaveBeenCalledTimes(1);
			expect(mainchainStoreLocal.sendInternal).toHaveBeenCalledWith(
				expect.objectContaining({ status: CCM_STATUS_MODULE_NOT_SUPPORTED }),
			);
		});

		it('should not execute CCMs and return when command is not supported', async () => {
			// Arrange
			const localCCCommandsMap = new Map().set(MODULE_NAME_INTEROPERABILITY, [
				{
					name: 'cc1',
					execute: jest.fn(),
				},
			]);
			const ccMethodSampleMod = {
				beforeSendCCM: jest.fn(),
				beforeApplyCCM: jest.fn(),
			};
			mainchainStoreLocal = new MainchainInteroperabilityStore(
				interopMod.stores,
				context,
				new Map().set('mod1', ccMethodSampleMod),
				new NamedRegistry(),
			);

			mainchainStoreLocal.hasTerminatedStateAccount = jest.fn().mockResolvedValue(false);
			jest.spyOn(mainchainStoreLocal, 'sendInternal');

			// Act & Assert
			await expect(
				mainchainStoreLocal.apply(ccmApplyContext, localCCCommandsMap),
			).resolves.toBeUndefined();
			expect(ccMethodSampleMod.beforeApplyCCM).toHaveBeenCalledTimes(1);
			expect(ccMethodSampleMod.beforeApplyCCM).toHaveBeenCalledWith(
				expect.toContainAllKeys(Object.keys(beforeApplyCCMContext)),
			);
			expect(mainchainStoreLocal.sendInternal).toHaveBeenCalledTimes(1);
			expect(mainchainStoreLocal.sendInternal).toHaveBeenCalledWith(
				expect.objectContaining({ status: CCM_STATUS_CROSS_CHAIN_COMMAND_NOT_SUPPORTED }),
			);
		});

		it('should execute the cross chain command of interoperable module with name interoperability', async () => {
			// Arrange
			const ccMethodSampleMod = {
				beforeSendCCM: jest.fn(),
				beforeApplyCCM: jest.fn(),
			};
			mainchainStoreLocal = new MainchainInteroperabilityStore(
				interopMod.stores,
				context,
				new Map().set(MODULE_NAME_INTEROPERABILITY, ccMethodSampleMod),
				new NamedRegistry(),
			);
			mainchainStoreLocal.hasTerminatedStateAccount = jest.fn().mockResolvedValue(false);
			jest.spyOn(mainchainStoreLocal, 'sendInternal');
			const executeCCMContext = testing.createExecuteCCMsgMethodContext({
				...beforeSendCCMContext,
			});

			// Act & Assert
			await expect(
				mainchainStoreLocal.apply(ccmApplyContext, ccCommandsMap),
			).resolves.toBeUndefined();
			expect(ccMethodSampleMod.beforeApplyCCM).toHaveBeenCalledTimes(1);
			expect(ccMethodSampleMod.beforeApplyCCM).toHaveBeenCalledWith(
				expect.objectContaining({ ccu: beforeApplyCCMContext.ccu }),
			);
			expect(mainchainStoreLocal.sendInternal).toHaveBeenCalledTimes(0);
			expect(ccCommands[0].execute).toHaveBeenCalledTimes(1);
			expect(ccCommands[0].execute).toHaveBeenCalledWith(
				expect.objectContaining({ ccm: executeCCMContext.ccm }),
			);
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		let terminatedChainID: Buffer;
		let terminatedOutboxAccount: TerminatedOutboxAccount;

		beforeEach(async () => {
			terminatedChainID = utils.getRandomBytes(32);

			terminatedOutboxAccount = {
				outboxRoot: Buffer.alloc(32),
				outboxSize: 0,
				partnerChainInboxSize: 1,
			};

			await terminatedOutboxSubstore.set(context, terminatedChainID, terminatedOutboxAccount);
		});

		it('should successfully retrieve the account', async () => {
			const account = await mainchainInteroperabilityStore.getTerminatedOutboxAccount(
				terminatedChainID,
			);
			expect(account).toEqual(terminatedOutboxAccount);
		});

		it('should throw when terminated outbox account does not exist', async () => {
			await expect(
				mainchainInteroperabilityStore.getTerminatedOutboxAccount(utils.getRandomBytes(32)),
			).rejects.toThrow();
		});
	});

	describe('setTerminatedOutboxAccount', () => {
		let terminatedChainID: Buffer;
		let terminatedOutboxAccount: TerminatedOutboxAccount;

		beforeEach(async () => {
			terminatedChainID = utils.getRandomBytes(32);

			terminatedOutboxAccount = {
				outboxRoot: Buffer.alloc(32),
				outboxSize: 0,
				partnerChainInboxSize: 1,
			};

			await terminatedOutboxSubstore.set(context, terminatedChainID, terminatedOutboxAccount);
		});

		it('should return false when outbox account does not exist', async () => {
			// Assign
			const isValueChanged = await mainchainInteroperabilityStore.setTerminatedOutboxAccount(
				utils.getRandomBytes(32),
				{ outboxRoot: utils.getRandomBytes(32) },
			);

			// Assert
			expect(isValueChanged).toBeFalse();
		});

		it('should return false when no params provided', async () => {
			// Assign
			const isValueChanged = await mainchainInteroperabilityStore.setTerminatedOutboxAccount(
				utils.getRandomBytes(32),
				{},
			);

			// Assert
			expect(isValueChanged).toBeFalse();
		});

		describe('when setting a new value with the call', () => {
			const testCases: { title: string; changedValues: Partial<TerminatedOutboxAccount> }[] = [
				{
					title: 'should change outboxRoot',
					changedValues: {
						outboxRoot: utils.getRandomBytes(32),
					},
				},
				{
					title: 'should change outboxRoot and outboxSize',
					changedValues: {
						outboxRoot: utils.getRandomBytes(32),
						outboxSize: 2,
					},
				},
				{
					title: 'should change outboxRoot, outboxSize and partnerChainInboxSize',
					changedValues: {
						outboxRoot: utils.getRandomBytes(32),
						outboxSize: 3,
						partnerChainInboxSize: 3,
					},
				},
			];

			// TODO: I have no idea why `$title` is not working, fix this
			it.each(testCases)('$title', async ({ changedValues }) => {
				// Assign
				const isValueChanged = await mainchainInteroperabilityStore.setTerminatedOutboxAccount(
					terminatedChainID,
					changedValues,
				);

				const changedAccount = await terminatedOutboxSubstore.get(context, terminatedChainID);

				// Assert
				expect(isValueChanged).toBeTrue();
				expect(changedAccount).toEqual({ ...terminatedOutboxAccount, ...changedValues });
			});
		});
	});

	describe('getAllChainAccounts', () => {
		const chainId = utils.intToBuffer(1, 4);
		const chainId2 = utils.intToBuffer(100, 4);
		beforeEach(async () => {
			await chainDataSubstore.set(context, chainId, chainAccount);
			await chainDataSubstore.set(context, chainId2, chainAccount2);
		});

		it('should return all stored chains', async () => {
			await expect(
				mainchainInteroperabilityStore.getAllChainAccounts(chainId),
			).resolves.toStrictEqual([chainAccount, chainAccount2]);
		});
		it('should return all stored chains with chainID gte startChainID', async () => {
			await expect(
				mainchainInteroperabilityStore.getAllChainAccounts(chainId2),
			).resolves.toStrictEqual([chainAccount2]);
		});
	});
});

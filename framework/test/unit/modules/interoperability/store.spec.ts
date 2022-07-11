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

import { getRandomBytes, intToBuffer } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { when } from 'jest-when';
import {
	CCM_STATUS_CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
	CCM_STATUS_MODULE_NOT_SUPPORTED,
	EMPTY_BYTES,
	EMPTY_FEE_ADDRESS,
	MAINCHAIN_ID,
	MAINCHAIN_ID_BUFFER,
	MODULE_ID_INTEROPERABILITY_BUFFER,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
	STORE_PREFIX_TERMINATED_OUTBOX,
	STORE_PREFIX_TERMINATED_STATE,
} from '../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityStore } from '../../../../src/modules/interoperability/mainchain/store';
import {
	chainAccountSchema,
	channelSchema,
	outboxRootSchema,
	terminatedOutboxSchema,
	terminatedStateSchema,
} from '../../../../src/modules/interoperability/schema';
import { getIDAsKeyForStore } from '../../../../src/modules/interoperability/utils';
import { testing } from '../../../../src';
import {
	CCMApplyContext,
	CCUpdateParams,
	TerminatedOutboxAccount,
} from '../../../../src/modules/interoperability/types';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { SubStore } from '../../../../src/state_machine/types';

describe('Base interoperability store', () => {
	const chainID = Buffer.from('01', 'hex');
	const appendData = Buffer.from(
		'0c4c839c0fd8155fd0d52efc7dd29d2a71919dee517d50967cd26f4db2e0d1c5b',
		'hex',
	);
	const CCM = {
		nonce: BigInt(0),
<<<<<<< HEAD
		moduleID: intToBuffer(1, 4),
		crossChainCommandID: intToBuffer(1, 4),
=======
		moduleID: 1,
		crossChainCommandID: 1,
>>>>>>> be4327e3da (✅ Fix all interoperability tests)
		sendingChainID: intToBuffer(2, 4),
		receivingChainID: intToBuffer(3, 4),
		fee: BigInt(1),
		status: 1,
		params: Buffer.alloc(0),
	};
	const inboxTree = {
		root: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: Buffer.from(
			'6d391e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c',
			'hex',
		),
		size: 1,
	};
	const updatedInboxTree = {
		root: Buffer.from('888d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: Buffer.from(
			'aaaa1e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c',
			'hex',
		),
		size: 2,
	};
	const outboxTree = {
		root: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: Buffer.from(
			'6d391e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c',
			'hex',
		),
		size: 1,
	};
	const updatedOutboxTree = {
		root: Buffer.from('888d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		appendPath: Buffer.from(
			'aaaa1e95b7cb484862aa577320dbb4999971569e0b7c21fc02e9fda4d1d8485c',
			'hex',
		),
		size: 2,
	};
	const channelData = {
		inbox: inboxTree,
		outbox: outboxTree,
		partnerChainOutboxRoot: Buffer.alloc(0),
		messageFeeTokenID: {
			chainID: intToBuffer(0, 4),
			localID: intToBuffer(0, 4),
		},
	};
	let mainchainInteroperabilityStore: MainchainInteroperabilityStore;
	let channelSubstore: any;
	let outboxRootSubstore: any;
	let terminatedOutboxSubstore: any;
	let stateStore: PrefixedStateReadWriter;
	let chainSubstore: SubStore;
	let terminatedStateSubstore: SubStore;

	let mockGetStore: any;

	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		regularMerkleTree.calculateMerkleRoot = jest.fn().mockReturnValue(updatedOutboxTree);
		channelSubstore = {
			getWithSchema: jest.fn().mockResolvedValue(channelData),
			setWithSchema: jest.fn(),
		};
		outboxRootSubstore = { getWithSchema: jest.fn(), setWithSchema: jest.fn(), del: jest.fn() };
		terminatedOutboxSubstore = { getWithSchema: jest.fn(), setWithSchema: jest.fn() };
		chainSubstore = stateStore.getStore(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHAIN_DATA);
		terminatedStateSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY_BUFFER,
			STORE_PREFIX_TERMINATED_STATE,
		);
		mockGetStore = jest.fn();
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHANNEL_DATA)
			.mockReturnValue(channelSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_OUTBOX_ROOT)
			.mockReturnValue(outboxRootSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_TERMINATED_OUTBOX)
			.mockReturnValue(terminatedOutboxSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHAIN_DATA)
			.mockReturnValue(chainSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_TERMINATED_STATE)
			.mockReturnValue(terminatedStateSubstore);
		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			MODULE_ID_INTEROPERABILITY_BUFFER,
			mockGetStore,
			new Map(),
		);
	});

	describe('appendToInboxTree', () => {
		it('should update the channel store with the new inbox tree info', async () => {
			// Act
			await mainchainInteroperabilityStore.appendToInboxTree(chainID, appendData);

			// Assert
			expect(channelSubstore.setWithSchema).toHaveBeenCalledWith(
				chainID,
				{
					...channelData,
					inbox: updatedInboxTree,
				},
				channelSchema,
			);
		});
	});

	describe('appendToOutboxTree', () => {
		it('should update the channel store with the new outbox tree info', async () => {
			// Act
			await mainchainInteroperabilityStore.appendToOutboxTree(chainID, appendData);

			// Assert
			expect(channelSubstore.setWithSchema).toHaveBeenCalledWith(
				chainID,
				{
					...channelData,
					outbox: updatedOutboxTree,
				},
				channelSchema,
			);
		});
	});

	describe('addToOutbox', () => {
		it('should update the outbox tree root store with the new outbox root', async () => {
			// Act
			await mainchainInteroperabilityStore.addToOutbox(chainID, CCM);

			// Assert
			expect(outboxRootSubstore.setWithSchema).toHaveBeenCalledWith(
				chainID,
				outboxTree.root,
				outboxRootSchema,
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
			expect(terminatedOutboxSubstore.setWithSchema).toHaveBeenCalledWith(
				chainID,
				{
					outboxRoot: outboxTree.root,
					outboxSize: outboxTree.size,
					partnerChainInboxSize,
				},
				terminatedOutboxSchema,
			);
		});
	});

	describe('createTerminatedStateAccount', () => {
		const chainId = intToBuffer(5, 4);
<<<<<<< HEAD
		const chainIdAsStoreKey = chainId;
=======
>>>>>>> be4327e3da (✅ Fix all interoperability tests)
		const chainAccount = {
			name: 'account1',
			networkID: Buffer.alloc(0),
			lastCertificate: {
				height: 567467,
				timestamp: 2592000,
				stateRoot: Buffer.alloc(0),
				validatorsHash: Buffer.alloc(0),
			},
			status: 2739,
		};
		const stateRoot = Buffer.from('888d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex');
		const ownChainAccount1 = {
			name: 'mainchain',
			id: MAINCHAIN_ID_BUFFER,
			nonce: BigInt('0'),
		};

		const ownChainAccount2 = {
			name: 'chain1',
			id: intToBuffer(7, 4),
			nonce: BigInt('0'),
		};

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account exists for the id and state root is provided', async () => {
			await chainSubstore.setWithSchema(chainId, chainAccount, chainAccountSchema);
			await mainchainInteroperabilityStore.createTerminatedStateAccount(chainId, stateRoot);

			await expect(
				terminatedStateSubstore.getWithSchema(chainId, terminatedStateSchema),
			).resolves.toStrictEqual({
				stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			});
		});

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account exists for the id but state root is not provided', async () => {
			await chainSubstore.setWithSchema(chainId, chainAccount, chainAccountSchema);
			await mainchainInteroperabilityStore.createTerminatedStateAccount(chainId);

			await expect(
				terminatedStateSubstore.getWithSchema(chainId, terminatedStateSchema),
			).resolves.toStrictEqual({
				stateRoot: chainAccount.lastCertificate.stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			});
		});

		it('should return false if chain account does not exist for the id and ownchain account id is not the same as mainchain id', async () => {
			const chainIdNew = intToBuffer(9, 4);
			jest
				.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount')
				.mockResolvedValue(ownChainAccount1 as never);

			await expect(
				mainchainInteroperabilityStore.createTerminatedStateAccount(chainIdNew),
			).resolves.toEqual(false);
		});

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account does not exist for the id but ownchain account id is the same as mainchain id', async () => {
			const chainIdNew = intToBuffer(10, 4);
<<<<<<< HEAD
			const chainIdNewAsStoreKey = chainIdNew;
=======
>>>>>>> be4327e3da (✅ Fix all interoperability tests)
			jest
				.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount')
				.mockResolvedValue(ownChainAccount2 as never);
			await chainSubstore.setWithSchema(
				getIDAsKeyForStore(MAINCHAIN_ID),
				chainAccount,
				chainAccountSchema,
			);
			await mainchainInteroperabilityStore.createTerminatedStateAccount(chainIdNew);

			await expect(
				terminatedStateSubstore.getWithSchema(chainIdNew, terminatedStateSchema),
			).resolves.toStrictEqual({
				stateRoot: EMPTY_BYTES,
				mainchainStateRoot: chainAccount.lastCertificate.stateRoot,
				initialized: false,
			});
		});
	});

	describe('terminateChainInternal', () => {
		const SIDECHAIN_ID = intToBuffer(2, 4);
		const ccm = {
			nonce: BigInt(0),
<<<<<<< HEAD
			moduleID: intToBuffer(1, 4),
			crossChainCommandID: intToBuffer(1, 4),
=======
			moduleID: 1,
			crossChainCommandID: 1,
>>>>>>> be4327e3da (✅ Fix all interoperability tests)
			sendingChainID: intToBuffer(2, 4),
			receivingChainID: intToBuffer(3, 4),
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};
		const beforeSendCCMContext = testing.createBeforeSendCCMsgAPIContext({
			ccm,
			feeAddress: getRandomBytes(32),
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
					intToBuffer(SIDECHAIN_ID, 4),
					beforeSendCCMContext,
				),
			).toBe(true);
		});

		it('should return false if sendInternal returns false', async () => {
			// Arrange
			mainchainInteroperabilityStore.sendInternal = jest.fn().mockResolvedValue(false);

			expect(
				await mainchainInteroperabilityStore.terminateChainInternal(
					intToBuffer(SIDECHAIN_ID, 4),
					beforeSendCCMContext,
				),
			).toBe(false);
		});

		it('should return false if createTerminatedStateAccount returns false', async () => {
			// Arrange
			mainchainInteroperabilityStore.createTerminatedStateAccount = jest
				.fn()
				.mockResolvedValue(false);

			expect(
				await mainchainInteroperabilityStore.terminateChainInternal(
					intToBuffer(SIDECHAIN_ID, 4),
					beforeSendCCMContext,
				),
			).toBe(false);
		});
	});

	describe('apply', () => {
		let mainchainStoreLocal: MainchainInteroperabilityStore;

		const ccm = {
			nonce: BigInt(0),
<<<<<<< HEAD
			moduleID: intToBuffer(1, 4),
			crossChainCommandID: intToBuffer(1, 4),
			sendingChainID: intToBuffer(2, 4),
			receivingChainID: intToBuffer(3, 4),
			fee: BigInt(34000),
=======
			moduleID: 1,
			crossChainCommandID: 1,
			sendingChainID: intToBuffer(2, 4),
			receivingChainID: intToBuffer(3, 4),
			fee: BigInt(30000),
>>>>>>> be4327e3da (✅ Fix all interoperability tests)
			status: 0,
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
				ID: ccm.crossChainCommandID,
				execute: jest.fn(),
			},
		];
		const ccCommandsMap = new Map();
		ccCommandsMap.set(1, ccCommands);

		const ccAPIMod1 = {
			beforeSendCCM: jest.fn(),
			beforeApplyCCM: jest.fn(),
		};
		const ccAPIMod2 = {
			beforeSendCCM: jest.fn(),
			beforeApplyCCM: jest.fn(),
		};

		const ccAPIModsMap = new Map();
		ccAPIModsMap.set(1, ccAPIMod1);
		ccAPIModsMap.set(2, ccAPIMod2);

		const ccu: CCUpdateParams = {
			activeValidatorsUpdate: [],
			certificate: Buffer.alloc(0),
			inboxUpdate,
			newCertificateThreshold: BigInt(0),
			sendingChainID: intToBuffer(2, 4),
		};

		const beforeSendCCMContext = testing.createBeforeSendCCMsgAPIContext({
			ccm,
			feeAddress: getRandomBytes(32),
		});

		const beforeApplyCCMContext = testing.createBeforeApplyCCMsgAPIContext({
			...beforeSendCCMContext,
			ccm,
			ccu,
			payFromAddress: EMPTY_FEE_ADDRESS,
			trsSender: getRandomBytes(20),
		});

		const ccmApplyContext: CCMApplyContext = {
			ccm,
			ccu,
			eventQueue: beforeSendCCMContext.eventQueue,
			getAPIContext: beforeSendCCMContext.getAPIContext,
			getStore: beforeSendCCMContext.getStore,
			logger: beforeSendCCMContext.logger,
			networkIdentifier: beforeSendCCMContext.networkIdentifier,
			feeAddress: Buffer.alloc(0),
			trsSender: beforeApplyCCMContext.trsSender,
		};

		beforeEach(async () => {
			mainchainStoreLocal = new MainchainInteroperabilityStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				mockGetStore,
				ccAPIModsMap,
			);
		});

		it('should return immediately if sending chain is terminated', async () => {
			// Arrange
			mainchainStoreLocal.hasTerminatedStateAccount = jest.fn().mockResolvedValue(true);

			// Act & Assert
			await expect(
				mainchainStoreLocal.apply(ccmApplyContext, ccCommandsMap),
			).resolves.toBeUndefined();
			expect(ccAPIMod1.beforeApplyCCM).toBeCalledTimes(0);
		});

		it('should call all the interoperable beforeApplyCCM hooks', async () => {
			// Arrange
			const ccAPISampleMod = {
				beforeSendCCM: jest.fn(),
				beforeApplyCCM: jest.fn(),
			};
			mainchainStoreLocal = new MainchainInteroperabilityStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				mockGetStore,
				new Map().set(1, ccAPISampleMod),
			);
			mainchainStoreLocal.hasTerminatedStateAccount = jest.fn().mockResolvedValue(false);
			jest.spyOn(mainchainStoreLocal, 'sendInternal');

			// Act & Assert
			await expect(
				mainchainStoreLocal.apply(ccmApplyContext, ccCommandsMap),
			).resolves.toBeUndefined();
			expect(ccAPISampleMod.beforeApplyCCM).toBeCalledTimes(1);
			expect(ccAPISampleMod.beforeApplyCCM).toHaveBeenCalledWith(
				expect.toContainAllKeys(Object.keys(beforeApplyCCMContext)),
			);
		});

		it('should not execute CCMs and return when moduleID is not supported', async () => {
			// Arrange
			const localCCCommandsMap = new Map().set(4, [
				{
					ID: intToBuffer(4, 4),
					execute: jest.fn(),
				},
			]);
			mainchainStoreLocal = new MainchainInteroperabilityStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				mockGetStore,
				new Map().set(4, ccAPIMod1),
			);
			mainchainStoreLocal.hasTerminatedStateAccount = jest.fn().mockResolvedValue(false);
			jest.spyOn(mainchainStoreLocal, 'sendInternal');

			// Act & Assert
			await expect(
				mainchainStoreLocal.apply(ccmApplyContext, localCCCommandsMap),
			).resolves.toBeUndefined();
			expect(ccAPIMod1.beforeApplyCCM).toBeCalledTimes(1);
			expect(ccAPIMod1.beforeApplyCCM).toHaveBeenCalledWith(
				expect.toContainAllKeys(Object.keys(beforeApplyCCMContext)),
			);
			expect(mainchainStoreLocal.sendInternal).toBeCalledTimes(1);
			expect(mainchainStoreLocal.sendInternal).toHaveBeenCalledWith(
				expect.objectContaining({ status: CCM_STATUS_MODULE_NOT_SUPPORTED }),
			);
		});

		it('should not execute CCMs and return when commandID is not supported', async () => {
			// Arrange
			const localCCCommandsMap = new Map().set(1, [
				{
					ID: intToBuffer(3, 4),
					execute: jest.fn(),
				},
			]);
			const ccAPISampleMod = {
				beforeSendCCM: jest.fn(),
				beforeApplyCCM: jest.fn(),
			};
			mainchainStoreLocal = new MainchainInteroperabilityStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				mockGetStore,
				new Map().set(1, ccAPISampleMod),
			);
			mainchainStoreLocal.hasTerminatedStateAccount = jest.fn().mockResolvedValue(false);
			jest.spyOn(mainchainStoreLocal, 'sendInternal');

			// Act & Assert
			await expect(
				mainchainStoreLocal.apply(ccmApplyContext, localCCCommandsMap),
			).resolves.toBeUndefined();
			expect(ccAPISampleMod.beforeApplyCCM).toBeCalledTimes(1);
			expect(ccAPISampleMod.beforeApplyCCM).toHaveBeenCalledWith(
				expect.toContainAllKeys(Object.keys(beforeApplyCCMContext)),
			);
			expect(mainchainStoreLocal.sendInternal).toBeCalledTimes(1);
			expect(mainchainStoreLocal.sendInternal).toHaveBeenCalledWith(
				expect.objectContaining({ status: CCM_STATUS_CROSS_CHAIN_COMMAND_NOT_SUPPORTED }),
			);
		});

		it('should execute the cross chain command of interoperable module with ID=1', async () => {
			// Arrange
			const ccAPISampleMod = {
				beforeSendCCM: jest.fn(),
				beforeApplyCCM: jest.fn(),
			};
			mainchainStoreLocal = new MainchainInteroperabilityStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				mockGetStore,
				new Map().set(1, ccAPISampleMod),
			);
			mainchainStoreLocal.hasTerminatedStateAccount = jest.fn().mockResolvedValue(false);
			jest.spyOn(mainchainStoreLocal, 'sendInternal');
			const executeCCMContext = testing.createExecuteCCMsgAPIContext({
				...beforeSendCCMContext,
			});

			// Act & Assert
			await expect(
				mainchainStoreLocal.apply(ccmApplyContext, ccCommandsMap),
			).resolves.toBeUndefined();
			expect(ccAPISampleMod.beforeApplyCCM).toBeCalledTimes(1);
			expect(ccAPISampleMod.beforeApplyCCM).toHaveBeenCalledWith(
				expect.objectContaining({ ccu: beforeApplyCCMContext.ccu }),
			);
			expect(mainchainStoreLocal.sendInternal).toBeCalledTimes(0);
			expect(ccCommands[0].execute).toBeCalledTimes(1);
			expect(ccCommands[0].execute).toHaveBeenCalledWith(
				expect.objectContaining({ ccm: executeCCMContext.ccm }),
			);
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		let terminatedChainID: Buffer;
		let terminatedOutboxAccount: TerminatedOutboxAccount;

		beforeEach(async () => {
			terminatedOutboxSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_TERMINATED_OUTBOX,
			);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_TERMINATED_OUTBOX)
				.mockReturnValue(terminatedOutboxSubstore);

			terminatedChainID = getRandomBytes(32);

			terminatedOutboxAccount = {
				outboxRoot: Buffer.alloc(32),
				outboxSize: 0,
				partnerChainInboxSize: 1,
			};

			await terminatedOutboxSubstore.setWithSchema(
				terminatedChainID,
				terminatedOutboxAccount,
				terminatedOutboxSchema,
			);
		});

		it('should successfully retrieve the account', async () => {
			const account = await mainchainInteroperabilityStore.getTerminatedOutboxAccount(
				terminatedChainID,
			);
			expect(account).toEqual(terminatedOutboxAccount);
		});

		it('should throw when terminated outbox account does not exist', async () => {
			await expect(
				mainchainInteroperabilityStore.getTerminatedOutboxAccount(getRandomBytes(32)),
			).rejects.toThrow();
		});
	});

	describe('setTerminatedOutboxAccount', () => {
		let terminatedChainID: Buffer;
		let terminatedOutboxAccount: TerminatedOutboxAccount;

		beforeEach(async () => {
			terminatedOutboxSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_TERMINATED_OUTBOX,
			);
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_TERMINATED_OUTBOX)
				.mockReturnValue(terminatedOutboxSubstore);

			terminatedChainID = getRandomBytes(32);

			terminatedOutboxAccount = {
				outboxRoot: Buffer.alloc(32),
				outboxSize: 0,
				partnerChainInboxSize: 1,
			};

			await terminatedOutboxSubstore.setWithSchema(
				terminatedChainID,
				terminatedOutboxAccount,
				terminatedOutboxSchema,
			);
		});

		it('should return false when outbox account does not exist', async () => {
			// Assign
			const isValueChanged = await mainchainInteroperabilityStore.setTerminatedOutboxAccount(
				getRandomBytes(32),
				{ outboxRoot: getRandomBytes(32) },
			);

			// Assert
			expect(isValueChanged).toBeFalse();
		});

		it('should return false when no params provided', async () => {
			// Assign
			const isValueChanged = await mainchainInteroperabilityStore.setTerminatedOutboxAccount(
				getRandomBytes(32),
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
						outboxRoot: getRandomBytes(32),
					},
				},
				{
					title: 'should change outboxRoot and outboxSize',
					changedValues: {
						outboxRoot: getRandomBytes(32),
						outboxSize: 2,
					},
				},
				{
					title: 'should change outboxRoot, outboxSize and partnerChainInboxSize',
					changedValues: {
						outboxRoot: getRandomBytes(32),
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

				const changedAccount = await (terminatedOutboxSubstore as SubStore).getWithSchema<TerminatedOutboxAccount>(
					terminatedChainID,
					terminatedOutboxSchema,
				);

				// Assert
				expect(isValueChanged).toBeTrue();
				expect(changedAccount).toEqual({ ...terminatedOutboxAccount, ...changedValues });
			});
		});
	});
});

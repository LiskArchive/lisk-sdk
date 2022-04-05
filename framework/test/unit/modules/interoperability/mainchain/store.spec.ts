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

import { StateStore } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { when } from 'jest-when';
import { testing } from '../../../../../src';
import {
	CCM_STATUS_CHANNEL_UNAVAILABLE,
	MODULE_ID_INTEROPERABILITY,
	MAINCHAIN_ID,
	STORE_PREFIX_TERMINATED_STATE,
	STORE_PREFIX_CHAIN_DATA,
	LIVENESS_LIMIT,
	MAX_CCM_SIZE,
	STORE_PREFIX_OWN_CHAIN_DATA,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
} from '../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityStore } from '../../../../../src/modules/interoperability/mainchain/store';
import {
	chainAccountSchema,
	channelSchema,
	terminatedStateSchema,
} from '../../../../../src/modules/interoperability/schema';
import { SendInternalContext } from '../../../../../src/modules/interoperability/types';
import { getIDAsKeyForStore } from '../../../../../src/modules/interoperability/utils';

describe('Mainchain interoperability store', () => {
	const chainID = Buffer.from(MAINCHAIN_ID.toString(16), 'hex');
	const timestamp = 2592000 * 100;
	let chainAccount: any;
	let ownChainAccount: any;
	let stateStore: StateStore;
	let mainchainInteroperabilityStore: MainchainInteroperabilityStore;
	let terminatedStateSubstore: StateStore;
	let chainSubstore: StateStore;
	let ownChainSubstore: StateStore;
	let channelSubstore: StateStore;
	let outboxRootSubstore: StateStore;
	let mockGetStore: any;

	beforeEach(() => {
		chainAccount = {
			name: 'account1',
			networkID: Buffer.alloc(0),
			lastCertificate: {
				height: 567467,
				timestamp: timestamp - 500000,
				stateRoot: Buffer.alloc(0),
				validatorsHash: Buffer.alloc(0),
			},
			status: 2739,
		};

		ownChainAccount = {
			name: 'mainchain',
			id: MAINCHAIN_ID,
			nonce: BigInt('0'),
		};

		stateStore = new StateStore(new InMemoryKVStore());
		chainSubstore = stateStore.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHAIN_DATA);
		ownChainSubstore = stateStore.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_OWN_CHAIN_DATA);
		channelSubstore = stateStore.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA);
		outboxRootSubstore = stateStore.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_OUTBOX_ROOT);
		terminatedStateSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_STATE,
		);
		mockGetStore = jest.fn();
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHAIN_DATA)
			.mockReturnValue(chainSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_TERMINATED_STATE)
			.mockReturnValue(terminatedStateSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_OWN_CHAIN_DATA)
			.mockReturnValue(ownChainSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA)
			.mockReturnValue(channelSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_OUTBOX_ROOT)
			.mockReturnValue(outboxRootSubstore);

		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			MODULE_ID_INTEROPERABILITY,
			mockGetStore,
			new Map(),
		);
	});

	describe('bounce', () => {
		const ccm = {
			nonce: BigInt(0),
			moduleID: 1,
			crossChainCommandID: 1,
			sendingChainID: 2,
			receivingChainID: 3,
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};

		const newCCM = {
			...ccm,
			sendingChainID: ccm.receivingChainID,
			receivingChainID: ccm.sendingChainID,
			status: CCM_STATUS_CHANNEL_UNAVAILABLE,
		};

		beforeEach(() => {
			mainchainInteroperabilityStore.addToOutbox = jest.fn();
		});

		it('should not call addToOutbox if terminatedStateAccount exists', async () => {
			// Arrange
			terminatedStateSubstore.has = jest.fn().mockResolvedValue(true);

			// Act
			await mainchainInteroperabilityStore.bounce(ccm);

			expect(mainchainInteroperabilityStore.addToOutbox).not.toHaveBeenCalled();
		});

		it('should call addToOutbox with new CCM if terminatedStateAccount does exist', async () => {
			// Arrange
			terminatedStateSubstore.has = jest.fn().mockResolvedValue(false);

			// Act
			await mainchainInteroperabilityStore.bounce(ccm);

			expect(mainchainInteroperabilityStore.addToOutbox).toHaveBeenCalledWith(
				getIDAsKeyForStore(newCCM.receivingChainID),
				newCCM,
			);
		});
	});

	describe('isLive', () => {
		it('should return false if chain is already terminated', async () => {
			await terminatedStateSubstore.setWithSchema(chainID, chainAccount, terminatedStateSchema);
			const isLive = await mainchainInteroperabilityStore.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it('should return false if chain is not terminated & liveness requirement is not satisfied', async () => {
			chainAccount.lastCertificate.timestamp = timestamp - LIVENESS_LIMIT - 1;
			await chainSubstore.setWithSchema(chainID, chainAccount, chainAccountSchema);

			const isLive = await mainchainInteroperabilityStore.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it('should return true if chain is not terminated & liveness requirement is satisfied', async () => {
			chainAccount.lastCertificate.timestamp = timestamp - LIVENESS_LIMIT + 1;
			await chainSubstore.setWithSchema(chainID, chainAccount, chainAccountSchema);
			const isLive = await mainchainInteroperabilityStore.isLive(chainID, timestamp);

			expect(isLive).toBe(true);
		});
	});

	describe('sendInternal', () => {
		const mod1 = {
			crossChainAPI: {
				beforeSendCCM: jest.fn(),
			},
		};
		const mod2 = {
			crossChainAPI: {
				beforeSendCCM: jest.fn(),
			},
		};

		const modsMap = new Map();
		modsMap.set('1', mod1);
		modsMap.set('2', mod2);

		const ccm = {
			nonce: BigInt(0),
			moduleID: 1,
			crossChainCommandID: 1,
			sendingChainID: 2,
			receivingChainID: 3,
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};

		const randomOutboxRoot = getRandomBytes(32);
		const channelData = {
			inbox: {
				appendPath: [],
				size: 0,
				root: getRandomBytes(32),
			},
			outbox: {
				appendPath: [],
				size: 1,
				root: randomOutboxRoot,
			},
			partnerChainOutboxRoot: Buffer.alloc(0),
			messageFeeTokenID: {
				chainID: 1,
				localID: 2,
			},
		};

		const activeChainAccount = {
			name: 'account1',
			networkID: Buffer.alloc(0),
			lastCertificate: {
				height: 567467,
				timestamp: timestamp - 500000,
				stateRoot: Buffer.alloc(0),
				validatorsHash: Buffer.alloc(0),
			},
			status: 1,
		};

		const beforeSendCCMContext = testing.createBeforeSendCCMsgAPIContext({
			ccm,
			feeAddress: getRandomBytes(32),
		});

		const sendInternalContext: SendInternalContext = {
			beforeSendContext: beforeSendCCMContext,
			...ccm,
			timestamp,
		};

		it('should return false if the receiving chain does not exist', async () => {
			await expect(
				mainchainInteroperabilityStore.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
		});

		it('should return false if the receiving chain is not live', async () => {
			jest.spyOn(mainchainInteroperabilityStore, 'isLive');
			chainAccount.lastCertificate.timestamp = timestamp - LIVENESS_LIMIT - 1;
			await chainSubstore.setWithSchema(
				getIDAsKeyForStore(ccm.receivingChainID),
				chainAccount,
				chainAccountSchema,
			);

			await expect(
				mainchainInteroperabilityStore.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the receiving chain is not active', async () => {
			jest.spyOn(mainchainInteroperabilityStore, 'isLive');
			await chainSubstore.setWithSchema(
				getIDAsKeyForStore(ccm.receivingChainID),
				chainAccount,
				chainAccountSchema,
			);

			await expect(
				mainchainInteroperabilityStore.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the created ccm is of invalid size', async () => {
			const invalidCCM = {
				nonce: BigInt(0),
				moduleID: 1,
				crossChainCommandID: 1,
				sendingChainID: 2,
				receivingChainID: 3,
				fee: BigInt(1),
				status: 1,
				params: Buffer.alloc(MAX_CCM_SIZE), // invalid size
			};

			const beforeSendCCMContextLocal = testing.createBeforeSendCCMsgAPIContext({
				ccm: invalidCCM,
				feeAddress: getRandomBytes(32),
			});

			const sendInternalContextLocal: SendInternalContext = {
				beforeSendContext: beforeSendCCMContextLocal,
				...invalidCCM,
				timestamp,
			};

			jest.spyOn(mainchainInteroperabilityStore, 'isLive');
			await chainSubstore.setWithSchema(
				getIDAsKeyForStore(ccm.receivingChainID),
				activeChainAccount,
				chainAccountSchema,
			);
			await mainchainInteroperabilityStore.setOwnChainAccount(ownChainAccount);

			await expect(
				mainchainInteroperabilityStore.sendInternal(sendInternalContextLocal),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the ccm created is invalid schema', async () => {
			const invalidCCM = {
				nonce: BigInt(0),
				moduleID: 1,
				crossChainCommandID: 1,
				sendingChainID: 2,
				receivingChainID: 3,
				fee: BigInt(1),
				status: 'ccm', // invalid field
				params: Buffer.alloc(0),
			};

			const beforeSendCCMContextLocal = testing.createBeforeSendCCMsgAPIContext({
				ccm: invalidCCM as any,
				feeAddress: getRandomBytes(32),
			});

			const sendInternalContextLocal = {
				beforeSendContext: beforeSendCCMContextLocal,
				...invalidCCM,
				timestamp,
			};

			jest.spyOn(mainchainInteroperabilityStore, 'isLive');
			await chainSubstore.setWithSchema(
				getIDAsKeyForStore(ccm.receivingChainID),
				activeChainAccount,
				chainAccountSchema,
			);
			await mainchainInteroperabilityStore.setOwnChainAccount(ownChainAccount);

			await expect(
				mainchainInteroperabilityStore.sendInternal(sendInternalContextLocal as any),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return true and call each module beforeSendCCM crossChainAPI', async () => {
			const mainchainInteropStoreLocal = new MainchainInteroperabilityStore(
				MODULE_ID_INTEROPERABILITY,
				mockGetStore,
				modsMap,
			);

			jest.spyOn(mainchainInteropStoreLocal, 'isLive');
			await chainSubstore.setWithSchema(
				getIDAsKeyForStore(ccm.receivingChainID),
				activeChainAccount,
				chainAccountSchema,
			);
			await mainchainInteropStoreLocal.setOwnChainAccount(ownChainAccount);
			await channelSubstore.setWithSchema(
				getIDAsKeyForStore(ccm.receivingChainID),
				channelData,
				channelSchema,
			);
			jest.spyOn(mainchainInteropStoreLocal, 'appendToOutboxTree').mockResolvedValue({} as never);

			await expect(
				mainchainInteropStoreLocal.sendInternal(sendInternalContext as any),
			).resolves.toEqual(true);
			expect(mainchainInteropStoreLocal.isLive).toHaveBeenCalledTimes(1);
			expect(mainchainInteropStoreLocal.appendToOutboxTree).toHaveBeenCalledTimes(1);
			expect(mod1.crossChainAPI.beforeSendCCM).toHaveBeenCalledTimes(1);
			expect(mod2.crossChainAPI.beforeSendCCM).toHaveBeenCalledTimes(1);
		});
	});
});

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
import { utils } from '@liskhq/lisk-cryptography';
import {
	MAINCHAIN_ID,
	MAX_CCM_SIZE,
	MODULE_ID_INTEROPERABILITY_BUFFER,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
	STORE_PREFIX_OWN_CHAIN_DATA,
	STORE_PREFIX_TERMINATED_STATE,
} from '../../../../../src/modules/interoperability/constants';
import { SidechainInteroperabilityStore } from '../../../../../src/modules/interoperability/sidechain/store';
import {
	chainAccountSchema,
	channelSchema,
	terminatedStateSchema,
} from '../../../../../src/modules/interoperability/schemas';
import { testing } from '../../../../../src';
import {
	ChainAccount,
	ChannelData,
	SendInternalContext,
} from '../../../../../src/modules/interoperability/types';
import { getIDAsKeyForStore } from '../../../../../src/modules/interoperability/utils';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { SubStore } from '../../../../../src/state_machine/types';

describe('Sidechain interoperability store', () => {
	const chainID = Buffer.from('54', 'hex');
	let ownChainAccount: any;
	let chainAccount: any;
	let stateStore: PrefixedStateReadWriter;
	let sidechainInteroperabilityStore: SidechainInteroperabilityStore;
	let terminatedStateSubstore: SubStore;
	let chainSubstore: SubStore;
	let ownChainSubstore: SubStore;
	let channelSubstore: SubStore;
	let outboxRootSubstore: SubStore;
	let mockGetStore: any;

	beforeEach(() => {
		chainAccount = {
			name: 'account1',
			networkID: Buffer.alloc(0),
			lastCertificate: {
				height: 567467,
				timestamp: 500000,
				stateRoot: Buffer.alloc(0),
				validatorsHash: Buffer.alloc(0),
			},
			status: 2739,
		};

		ownChainAccount = {
			name: 'mainchain',
			id: utils.intToBuffer(2, 4),
			nonce: BigInt('0'),
		};

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		chainSubstore = stateStore.getStore(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHAIN_DATA);
		ownChainSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY_BUFFER,
			STORE_PREFIX_OWN_CHAIN_DATA,
		);
		channelSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY_BUFFER,
			STORE_PREFIX_CHANNEL_DATA,
		);
		outboxRootSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY_BUFFER,
			STORE_PREFIX_OUTBOX_ROOT,
		);
		terminatedStateSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY_BUFFER,
			STORE_PREFIX_TERMINATED_STATE,
		);
		mockGetStore = jest.fn();
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHAIN_DATA)
			.mockReturnValue(chainSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_TERMINATED_STATE)
			.mockReturnValue(terminatedStateSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_OWN_CHAIN_DATA)
			.mockReturnValue(ownChainSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_CHANNEL_DATA)
			.mockReturnValue(channelSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_OUTBOX_ROOT)
			.mockReturnValue(outboxRootSubstore);

		sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
			MODULE_ID_INTEROPERABILITY_BUFFER,
			mockGetStore,
			new Map(),
		);
	});

	describe('isLive', () => {
		it('should return false if chain is already terminated', async () => {
			await terminatedStateSubstore.setWithSchema(chainID, chainAccount, terminatedStateSchema);
			const isLive = await sidechainInteroperabilityStore.isLive(chainID);

			expect(isLive).toBe(false);
		});

		it('should return true if chain is not terminated', async () => {
			const isLive = await sidechainInteroperabilityStore.isLive(chainID);

			expect(isLive).toBe(true);
		});
	});

	describe('sendInternal', () => {
		const ccAPIMod1 = {
			beforeSendCCM: jest.fn(),
		};
		const ccAPIMod2 = {
			beforeSendCCM: jest.fn(),
		};

		const modsMap = new Map();
		modsMap.set('1', ccAPIMod1);
		modsMap.set('2', ccAPIMod2);

		const ccm = {
			nonce: BigInt(0),
			moduleID: utils.intToBuffer(1, 4),
			crossChainCommandID: utils.intToBuffer(1, 4),
			sendingChainID: utils.intToBuffer(2, 4),
			receivingChainID: utils.intToBuffer(3, 4),
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};

		const activeChainAccount: ChainAccount = {
			name: 'account1',
			networkID: Buffer.alloc(0),
			lastCertificate: {
				height: 567467,
				timestamp: 500000,
				stateRoot: Buffer.alloc(0),
				validatorsHash: Buffer.alloc(0),
			},
			status: 1,
		};

		const randomOutboxRoot = utils.getRandomBytes(32);
		const channelData: ChannelData = {
			inbox: {
				appendPath: [],
				size: 0,
				root: utils.getRandomBytes(32),
			},
			outbox: {
				appendPath: [],
				size: 1,
				root: randomOutboxRoot,
			},
			partnerChainOutboxRoot: Buffer.alloc(0),
			messageFeeTokenID: {
				chainID: utils.intToBuffer(1, 4),
				localID: utils.intToBuffer(2, 4),
			},
		};

		const beforeSendCCMContext = testing.createBeforeSendCCMsgAPIContext({
			ccm,
			feeAddress: utils.getRandomBytes(32),
		});

		const sendInternalContext: SendInternalContext = {
			...beforeSendCCMContext,
			...ccm,
		};

		// Sidechain case
		it('should return mainchain account if the receiving chain does not exist', async () => {
			const sidechainInteropStoreLocal = new SidechainInteroperabilityStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				mockGetStore,
				modsMap,
			);

			jest.spyOn(sidechainInteropStoreLocal, 'isLive').mockResolvedValue(true);
			jest.spyOn(sidechainInteropStoreLocal, 'getChainAccount');
			jest.spyOn(sidechainInteropStoreLocal, 'appendToOutboxTree').mockResolvedValue();
			await chainSubstore.setWithSchema(
				getIDAsKeyForStore(MAINCHAIN_ID),
				activeChainAccount,
				chainAccountSchema,
			);
			await sidechainInteropStoreLocal.setOwnChainAccount(ownChainAccount);
			await channelSubstore.setWithSchema(
				getIDAsKeyForStore(MAINCHAIN_ID),
				channelData,
				channelSchema,
			);

			await expect(sidechainInteropStoreLocal.sendInternal(sendInternalContext)).resolves.toEqual(
				true,
			);
			expect(sidechainInteropStoreLocal.getChainAccount).toHaveBeenCalledWith(
				getIDAsKeyForStore(MAINCHAIN_ID),
			);
		});

		// Sidechain case
		it('should return receiving chain account if the receiving chain exists', async () => {
			const sidechainInteropStoreLocal = new SidechainInteroperabilityStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				mockGetStore,
				modsMap,
			);

			jest.spyOn(sidechainInteropStoreLocal, 'isLive').mockResolvedValue(true);
			jest.spyOn(sidechainInteropStoreLocal, 'getChainAccount');
			jest.spyOn(sidechainInteropStoreLocal, 'appendToOutboxTree').mockResolvedValue();
			await chainSubstore.setWithSchema(
				ccm.receivingChainID,
				activeChainAccount,
				chainAccountSchema,
			);
			await sidechainInteropStoreLocal.setOwnChainAccount(ownChainAccount);
			await channelSubstore.setWithSchema(ccm.receivingChainID, channelData, channelSchema);

			await expect(sidechainInteropStoreLocal.sendInternal(sendInternalContext)).resolves.toEqual(
				true,
			);
			expect(sidechainInteropStoreLocal.getChainAccount).toHaveBeenCalledWith(ccm.receivingChainID);
		});

		it('should return false if the receiving chain is not live', async () => {
			jest.spyOn(sidechainInteroperabilityStore, 'isLive');
			await chainSubstore.setWithSchema(ccm.receivingChainID, chainAccount, chainAccountSchema);

			await expect(
				sidechainInteroperabilityStore.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(sidechainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the receiving chain is not active', async () => {
			jest.spyOn(sidechainInteroperabilityStore, 'isLive');
			await chainSubstore.setWithSchema(ccm.receivingChainID, chainAccount, chainAccountSchema);

			await expect(
				sidechainInteroperabilityStore.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(sidechainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the created ccm is of invalid size', async () => {
			const invalidCCM = {
				nonce: BigInt(0),
				moduleID: utils.intToBuffer(1, 4),
				crossChainCommandID: utils.intToBuffer(1, 4),
				sendingChainID: utils.intToBuffer(2, 4),
				receivingChainID: utils.intToBuffer(3, 4),
				fee: BigInt(1),
				status: 1,
				params: Buffer.alloc(MAX_CCM_SIZE), // invalid size
			};

			const beforeSendCCMContextLocal = testing.createBeforeSendCCMsgAPIContext({
				ccm: invalidCCM,
				feeAddress: utils.getRandomBytes(32),
			});

			const sendInternalContextLocal: SendInternalContext = {
				...beforeSendCCMContextLocal,
				...invalidCCM,
			};

			jest.spyOn(sidechainInteroperabilityStore, 'isLive');
			await chainSubstore.setWithSchema(
				ccm.receivingChainID,
				activeChainAccount,
				chainAccountSchema,
			);
			await sidechainInteroperabilityStore.setOwnChainAccount(ownChainAccount);

			await expect(
				sidechainInteroperabilityStore.sendInternal(sendInternalContextLocal),
			).resolves.toEqual(false);
			expect(sidechainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the ccm created is invalid schema', async () => {
			const invalidCCM = {
				nonce: BigInt(0),
				moduleID: utils.intToBuffer(1, 4),
				crossChainCommandID: utils.intToBuffer(1, 4),
				sendingChainID: utils.intToBuffer(2, 4),
				receivingChainID: utils.intToBuffer(3, 4),
				fee: BigInt(1),
				status: 'ccm', // invalid field
				params: Buffer.alloc(0),
			};

			const beforeSendCCMContextLocal = testing.createBeforeSendCCMsgAPIContext({
				ccm: invalidCCM as any,
				feeAddress: utils.getRandomBytes(32),
			});

			const sendInternalContextLocal = {
				beforeSendContext: beforeSendCCMContextLocal,
				...invalidCCM,
			};

			jest.spyOn(sidechainInteroperabilityStore, 'isLive');
			await chainSubstore.setWithSchema(
				ccm.receivingChainID,
				activeChainAccount,
				chainAccountSchema,
			);
			await sidechainInteroperabilityStore.setOwnChainAccount(ownChainAccount);

			await expect(
				sidechainInteroperabilityStore.sendInternal(sendInternalContextLocal as any),
			).resolves.toEqual(false);
			expect(sidechainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return true and call each module beforeSendCCM crossChainAPI', async () => {
			const sidechainInteropStoreLocal = new SidechainInteroperabilityStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				mockGetStore,
				modsMap,
			);

			jest.spyOn(sidechainInteropStoreLocal, 'isLive');
			await chainSubstore.setWithSchema(
				ccm.receivingChainID,
				activeChainAccount,
				chainAccountSchema,
			);
			await sidechainInteropStoreLocal.setOwnChainAccount(ownChainAccount);
			await channelSubstore.setWithSchema(ccm.receivingChainID, channelData, channelSchema);
			jest.spyOn(sidechainInteropStoreLocal, 'appendToOutboxTree').mockResolvedValue({} as never);

			await expect(
				sidechainInteropStoreLocal.sendInternal(sendInternalContext as any),
			).resolves.toEqual(true);
			expect(sidechainInteropStoreLocal.isLive).toHaveBeenCalledTimes(1);
			expect(sidechainInteropStoreLocal.appendToOutboxTree).toHaveBeenCalledTimes(1);
			expect(ccAPIMod1.beforeSendCCM).toHaveBeenCalledTimes(1);
			expect(ccAPIMod2.beforeSendCCM).toHaveBeenCalledTimes(1);
		});
	});
});

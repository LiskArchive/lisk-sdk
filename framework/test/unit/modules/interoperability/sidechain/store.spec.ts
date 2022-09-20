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
import {
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	MAINCHAIN_ID,
	MAX_CCM_SIZE,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../src/modules/interoperability/constants';
import { SidechainInteroperabilityStore } from '../../../../../src/modules/interoperability/sidechain/store';
import { SidechainInteroperabilityModule, testing } from '../../../../../src';
import {
	ChainAccount,
	ChannelData,
	SendInternalContext,
} from '../../../../../src/modules/interoperability/types';
import { getIDAsKeyForStore } from '../../../../../src/modules/interoperability/utils';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { ChannelDataStore } from '../../../../../src/modules/interoperability/stores/channel_data';
import { ChainAccountStore } from '../../../../../src/modules/interoperability/stores/chain_account';
import { TerminatedStateStore } from '../../../../../src/modules/interoperability/stores/terminated_state';
import { StoreGetter } from '../../../../../src/modules/base_store';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('Sidechain interoperability store', () => {
	const sidechainInterops = new SidechainInteroperabilityModule();

	const chainID = Buffer.from('54', 'hex');
	let ownChainAccount: any;
	let chainAccount: any;
	let stateStore: PrefixedStateReadWriter;
	let sidechainInteroperabilityStore: SidechainInteroperabilityStore;
	let terminatedStateSubstore: TerminatedStateStore;
	let chainDataSubstore: ChainAccountStore;
	let channelDataSubstore: ChannelDataStore;

	let context: StoreGetter;

	beforeEach(() => {
		chainAccount = {
			name: 'account1',
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
		context = createStoreGetter(stateStore);

		channelDataSubstore = sidechainInterops.stores.get(ChannelDataStore);
		chainDataSubstore = sidechainInterops.stores.get(ChainAccountStore);
		terminatedStateSubstore = sidechainInterops.stores.get(TerminatedStateStore);

		sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
			sidechainInterops.stores,
			context,
			new Map(),
		);
	});

	describe('isLive', () => {
		it('should return false if chain is already terminated', async () => {
			await terminatedStateSubstore.set(context, chainID, chainAccount);
			const isLive = await sidechainInteroperabilityStore.isLive(chainID);

			expect(isLive).toBe(false);
		});

		it('should return true if chain is not terminated', async () => {
			const isLive = await sidechainInteroperabilityStore.isLive(chainID);

			expect(isLive).toBe(true);
		});
	});

	describe('sendInternal', () => {
		const ccMethodMod1 = {
			beforeSendCCM: jest.fn(),
		};
		const ccMethodMod2 = {
			beforeSendCCM: jest.fn(),
		};

		const modsMap = new Map();
		modsMap.set('1', ccMethodMod1);
		modsMap.set('2', ccMethodMod2);

		const ccm = {
			nonce: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
			sendingChainID: utils.intToBuffer(2, 4),
			receivingChainID: utils.intToBuffer(3, 4),
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};

		const activeChainAccount: ChainAccount = {
			name: 'account1',
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

		const beforeSendCCMContext = testing.createBeforeSendCCMsgMethodContext({
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
				sidechainInterops.stores,
				context,
				modsMap,
			);

			jest.spyOn(sidechainInteropStoreLocal, 'isLive').mockResolvedValue(true);
			jest.spyOn(sidechainInteropStoreLocal, 'getChainAccount');
			jest.spyOn(sidechainInteropStoreLocal, 'appendToOutboxTree').mockResolvedValue();
			await chainDataSubstore.set(context, getIDAsKeyForStore(MAINCHAIN_ID), activeChainAccount);
			await sidechainInteropStoreLocal.setOwnChainAccount(ownChainAccount);
			await channelDataSubstore.set(context, getIDAsKeyForStore(MAINCHAIN_ID), channelData);

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
				sidechainInterops.stores,
				context,
				modsMap,
			);

			jest.spyOn(sidechainInteropStoreLocal, 'isLive').mockResolvedValue(true);
			jest.spyOn(sidechainInteropStoreLocal, 'getChainAccount');
			jest.spyOn(sidechainInteropStoreLocal, 'appendToOutboxTree').mockResolvedValue();
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);
			await sidechainInteropStoreLocal.setOwnChainAccount(ownChainAccount);
			await channelDataSubstore.set(context, ccm.receivingChainID, channelData);

			await expect(sidechainInteropStoreLocal.sendInternal(sendInternalContext)).resolves.toEqual(
				true,
			);
			expect(sidechainInteropStoreLocal.getChainAccount).toHaveBeenCalledWith(ccm.receivingChainID);
		});

		it('should return false if the receiving chain is not live', async () => {
			jest.spyOn(sidechainInteroperabilityStore, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, chainAccount);

			await expect(
				sidechainInteroperabilityStore.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(sidechainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the receiving chain is not active', async () => {
			jest.spyOn(sidechainInteroperabilityStore, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, chainAccount);

			await expect(
				sidechainInteroperabilityStore.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(sidechainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the created ccm is of invalid size', async () => {
			const invalidCCM = {
				nonce: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				sendingChainID: utils.intToBuffer(2, 4),
				receivingChainID: utils.intToBuffer(3, 4),
				fee: BigInt(1),
				status: 1,
				params: Buffer.alloc(MAX_CCM_SIZE), // invalid size
			};

			const beforeSendCCMContextLocal = testing.createBeforeSendCCMsgMethodContext({
				ccm: invalidCCM,
				feeAddress: utils.getRandomBytes(32),
			});

			const sendInternalContextLocal: SendInternalContext = {
				...beforeSendCCMContextLocal,
				...invalidCCM,
			};

			jest.spyOn(sidechainInteroperabilityStore, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);
			await sidechainInteroperabilityStore.setOwnChainAccount(ownChainAccount);

			await expect(
				sidechainInteroperabilityStore.sendInternal(sendInternalContextLocal),
			).resolves.toEqual(false);
			expect(sidechainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the ccm created is invalid schema', async () => {
			const invalidCCM = {
				nonce: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				sendingChainID: utils.intToBuffer(2, 4),
				receivingChainID: utils.intToBuffer(3, 4),
				fee: BigInt(1),
				status: 'ccm', // invalid field
				params: Buffer.alloc(0),
			};

			const beforeSendCCMContextLocal = testing.createBeforeSendCCMsgMethodContext({
				ccm: invalidCCM as any,
				feeAddress: utils.getRandomBytes(32),
			});

			const sendInternalContextLocal = {
				beforeSendContext: beforeSendCCMContextLocal,
				...invalidCCM,
			};

			jest.spyOn(sidechainInteroperabilityStore, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);
			await sidechainInteroperabilityStore.setOwnChainAccount(ownChainAccount);

			await expect(
				sidechainInteroperabilityStore.sendInternal(sendInternalContextLocal as any),
			).resolves.toEqual(false);
			expect(sidechainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return true and call each module beforeSendCCM crossChainMethod', async () => {
			const sidechainInteropStoreLocal = new SidechainInteroperabilityStore(
				sidechainInterops.stores,
				context,
				modsMap,
			);

			jest.spyOn(sidechainInteropStoreLocal, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);
			await sidechainInteropStoreLocal.setOwnChainAccount(ownChainAccount);
			await channelDataSubstore.set(context, ccm.receivingChainID, channelData);
			jest.spyOn(sidechainInteropStoreLocal, 'appendToOutboxTree').mockResolvedValue({} as never);

			await expect(
				sidechainInteropStoreLocal.sendInternal(sendInternalContext as any),
			).resolves.toEqual(true);
			expect(sidechainInteropStoreLocal.isLive).toHaveBeenCalledTimes(1);
			expect(sidechainInteropStoreLocal.appendToOutboxTree).toHaveBeenCalledTimes(1);
			expect(ccMethodMod1.beforeSendCCM).toHaveBeenCalledTimes(1);
			expect(ccMethodMod2.beforeSendCCM).toHaveBeenCalledTimes(1);
		});
	});
});

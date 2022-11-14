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
import { when } from 'jest-when';
import { MainchainInteroperabilityModule, testing } from '../../../../../src';
import { StoreGetter } from '../../../../../src/modules/base_store';
import {
	MAINCHAIN_ID,
	LIVENESS_LIMIT,
	MAX_CCM_SIZE,
	MAINCHAIN_ID_BUFFER,
	MODULE_NAME_INTEROPERABILITY,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	EMPTY_BYTES,
} from '../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityInternalMethod } from '../../../../../src/modules/interoperability/mainchain/store';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../../src/modules/interoperability/stores/chain_account';
import { ChannelDataStore } from '../../../../../src/modules/interoperability/stores/channel_data';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';
import { SendInternalContext } from '../../../../../src/modules/interoperability/types';
import { NamedRegistry } from '../../../../../src/modules/named_registry';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('Mainchain interoperability internal method', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const ownChainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
	};
	const chainID = Buffer.from(MAINCHAIN_ID.toString(16), 'hex');
	const timestamp = 2592000 * 100;
	let chainAccount: any;
	let ownChainAccount: any;
	let stateStore: PrefixedStateReadWriter;
	let mainchainInteroperabilityInternalMethod: MainchainInteroperabilityInternalMethod;
	let chainDataSubstore: ChainAccountStore;
	let channelDataSubstore: ChannelDataStore;

	let context: StoreGetter;

	beforeEach(() => {
		chainAccount = {
			name: 'account1',
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
			chainID: MAINCHAIN_ID_BUFFER,
			nonce: BigInt('0'),
		};

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		context = createStoreGetter(stateStore);

		channelDataSubstore = interopMod.stores.get(ChannelDataStore);
		chainDataSubstore = interopMod.stores.get(ChainAccountStore);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
		mainchainInteroperabilityInternalMethod = new MainchainInteroperabilityInternalMethod(
			interopMod.stores,
			interopMod.events,
			context,
			new Map(),
		);
	});

	describe('isLive', () => {
		beforeEach(() => {
			when(ownChainAccountStoreMock.get as never)
				.calledWith(expect.anything(), EMPTY_BYTES)
				.mockResolvedValue(ownChainAccount as never);
		});

		it('should return true if chainID equals ownChainAccount id', async () => {
			const isLive = await mainchainInteroperabilityInternalMethod.isLive(
				ownChainAccount.chainID,
				timestamp,
			);

			expect(isLive).toBe(true);
		});

		it('should return false if ownChainAccount id does not equal mainchain ID', async () => {
			when(ownChainAccountStoreMock.get as never)
				.calledWith(expect.anything(), EMPTY_BYTES)
				.mockResolvedValue({
					...ownChainAccount,
					chainID: utils.getRandomBytes(32),
				} as never);

			const isLive = await mainchainInteroperabilityInternalMethod.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it(`should return false if chain account exists and status is ${ChainStatus.TERMINATED}`, async () => {
			await chainDataSubstore.set(context, chainID, {
				...chainAccount,
				status: ChainStatus.TERMINATED,
			});
			const isLive = await mainchainInteroperabilityInternalMethod.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it(`should return false if chain account exists & status is ${ChainStatus.ACTIVE} & liveness requirement is not satisfied`, async () => {
			chainAccount.lastCertificate.timestamp = timestamp - LIVENESS_LIMIT - 1;
			await chainDataSubstore.set(context, chainID, {
				...chainAccount,
				status: ChainStatus.ACTIVE,
			});

			const isLive = await mainchainInteroperabilityInternalMethod.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it('should return true if chain account does not exist', async () => {
			const isLive = await mainchainInteroperabilityInternalMethod.isLive(
				utils.getRandomBytes(32),
				timestamp,
			);

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
		modsMap.set('cc1', ccMethodMod1);
		modsMap.set('cc2', ccMethodMod2);

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

		const randomOutboxRoot = utils.getRandomBytes(32);
		const channelData = {
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
			messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
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

		const beforeSendCCMContext = testing.createBeforeSendCCMsgMethodContext({
			ccm,
			feeAddress: utils.getRandomBytes(32),
		});

		const sendInternalContext: SendInternalContext = {
			...beforeSendCCMContext,
			...ccm,
			timestamp,
		};

		it('should return false if the receiving chain does not exist', async () => {
			await expect(
				mainchainInteroperabilityInternalMethod.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
		});

		it('should return false if the receiving chain is not live', async () => {
			jest.spyOn(mainchainInteroperabilityInternalMethod, 'isLive').mockResolvedValue(false);
			await chainDataSubstore.set(context, ccm.receivingChainID, chainAccount);

			await expect(
				mainchainInteroperabilityInternalMethod.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityInternalMethod.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the receiving chain is not active', async () => {
			jest.spyOn(mainchainInteroperabilityInternalMethod, 'isLive').mockResolvedValue(false);
			await chainDataSubstore.set(context, ccm.receivingChainID, chainAccount);

			await expect(
				mainchainInteroperabilityInternalMethod.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityInternalMethod.isLive).toHaveBeenCalledTimes(1);
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
				timestamp,
			};

			jest.spyOn(mainchainInteroperabilityInternalMethod, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);

			when(ownChainAccountStoreMock.get as never)
				.calledWith()
				.mockResolvedValue(ownChainAccount as never);

			await expect(
				mainchainInteroperabilityInternalMethod.sendInternal(sendInternalContextLocal),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityInternalMethod.isLive).toHaveBeenCalledTimes(1);
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
				timestamp,
			};

			jest.spyOn(mainchainInteroperabilityInternalMethod, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);
			when(ownChainAccountStoreMock.get as never)
				.calledWith()
				.mockResolvedValue(ownChainAccount as never);

			await expect(
				mainchainInteroperabilityInternalMethod.sendInternal(sendInternalContextLocal as any),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityInternalMethod.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return true and call each module beforeSendCCM crossChainMethod', async () => {
			const mainchainInteropStoreLocal = new MainchainInteroperabilityInternalMethod(
				interopMod.stores,
				new NamedRegistry(),
				context,
				modsMap,
			);

			jest.spyOn(mainchainInteropStoreLocal, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);

			when(interopMod.stores.get(OwnChainAccountStore).get as never)
				.calledWith()
				.mockResolvedValue(ownChainAccount as never);

			await channelDataSubstore.set(context, ccm.receivingChainID, channelData);
			jest.spyOn(mainchainInteropStoreLocal, 'appendToOutboxTree').mockResolvedValue({} as never);

			await expect(mainchainInteropStoreLocal.sendInternal(sendInternalContext)).resolves.toEqual(
				true,
			);
			expect(mainchainInteropStoreLocal.isLive).toHaveBeenCalledTimes(1);
			expect(mainchainInteropStoreLocal.appendToOutboxTree).toHaveBeenCalledTimes(1);
			expect(ccMethodMod1.beforeSendCCM).toHaveBeenCalledTimes(1);
			expect(ccMethodMod2.beforeSendCCM).toHaveBeenCalledTimes(1);
		});
	});
});

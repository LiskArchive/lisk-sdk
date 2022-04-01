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
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { when } from 'jest-when';
import {
	EMPTY_BYTES,
	MAINCHAIN_ID,
	MODULE_ID_INTEROPERABILITY,
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

describe('Base interoperability store', () => {
	const chainID = Buffer.from('01', 'hex');
	const appendData = Buffer.from(
		'0c4c839c0fd8155fd0d52efc7dd29d2a71919dee517d50967cd26f4db2e0d1c5b',
		'hex',
	);
	const CCM = {
		nonce: BigInt(0),
		moduleID: 1,
		crossChainCommandID: 1,
		sendingChainID: 2,
		receivingChainID: 3,
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
			chainID: 0,
			localID: 0,
		},
	};
	let mainchainInteroperabilityStore: MainchainInteroperabilityStore;
	let channelSubstore: any;
	let outboxRootSubstore: any;
	let terminatedOutboxSubstore: any;
	let stateStore: StateStore;
	let chainSubstore: StateStore;
	let terminatedStateSubstore: StateStore;

	let mockGetStore: any;

	beforeEach(() => {
		stateStore = new StateStore(new InMemoryKVStore());
		regularMerkleTree.calculateMerkleRoot = jest.fn().mockReturnValue(updatedOutboxTree);
		channelSubstore = {
			getWithSchema: jest.fn().mockResolvedValue(channelData),
			setWithSchema: jest.fn(),
		};
		outboxRootSubstore = { getWithSchema: jest.fn(), setWithSchema: jest.fn(), del: jest.fn() };
		terminatedOutboxSubstore = { getWithSchema: jest.fn(), setWithSchema: jest.fn() };
		chainSubstore = stateStore.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHAIN_DATA);
		terminatedStateSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_STATE,
		);
		mockGetStore = jest.fn();
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA)
			.mockReturnValue(channelSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_OUTBOX_ROOT)
			.mockReturnValue(outboxRootSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_TERMINATED_OUTBOX)
			.mockReturnValue(terminatedOutboxSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHAIN_DATA)
			.mockReturnValue(chainSubstore);
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_TERMINATED_STATE)
			.mockReturnValue(terminatedStateSubstore);
		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			MODULE_ID_INTEROPERABILITY,
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
		const chainId = 5;
		const chainIdBuffer = Buffer.from(chainId.toString(16), 'hex');
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
			id: MAINCHAIN_ID,
			nonce: BigInt('0'),
		};

		const ownChainAccount2 = {
			name: 'chain1',
			id: 7,
			nonce: BigInt('0'),
		};

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account exists for the id and state root is provided', async () => {
			await chainSubstore.setWithSchema(chainIdBuffer, chainAccount, chainAccountSchema);
			await mainchainInteroperabilityStore.createTerminatedStateAccount(chainId, stateRoot);

			await expect(
				terminatedStateSubstore.getWithSchema(chainIdBuffer, terminatedStateSchema),
			).resolves.toStrictEqual({
				stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			});
		});

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account exists for the id but state root is not provided', async () => {
			await chainSubstore.setWithSchema(chainIdBuffer, chainAccount, chainAccountSchema);
			await mainchainInteroperabilityStore.createTerminatedStateAccount(chainId);

			await expect(
				terminatedStateSubstore.getWithSchema(chainIdBuffer, terminatedStateSchema),
			).resolves.toStrictEqual({
				stateRoot: chainAccount.lastCertificate.stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			});
		});

		it('should return false if chain account does not exist for the id and ownchain account id is not the same as mainchain id', async () => {
			jest
				.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount')
				.mockResolvedValue(ownChainAccount2 as never);
			await chainSubstore.setWithSchema(
				Buffer.from(MAINCHAIN_ID.toString(16), 'hex'),
				chainAccount,
				chainAccountSchema,
			);

			await expect(
				mainchainInteroperabilityStore.createTerminatedStateAccount(chainId),
			).resolves.toEqual(false);
		});

		it('should set appropriate terminated state for chain id in the terminatedState sub store if chain account does not exist for the id but ownchain account id is the same as mainchain id', async () => {
			jest
				.spyOn(mainchainInteroperabilityStore, 'getOwnChainAccount')
				.mockResolvedValue(ownChainAccount1 as never);
			await chainSubstore.setWithSchema(
				Buffer.from(MAINCHAIN_ID.toString(16), 'hex'),
				chainAccount,
				chainAccountSchema,
			);
			await mainchainInteroperabilityStore.createTerminatedStateAccount(chainId);

			await expect(
				terminatedStateSubstore.getWithSchema(chainIdBuffer, terminatedStateSchema),
			).resolves.toStrictEqual({
				stateRoot: EMPTY_BYTES,
				mainchainStateRoot: chainAccount.lastCertificate.stateRoot,
				initialized: false,
			});
		});
	});
});

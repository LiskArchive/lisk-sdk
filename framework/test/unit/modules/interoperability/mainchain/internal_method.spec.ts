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
import { MainchainInteroperabilityModule } from '../../../../../src';
import { StoreGetter } from '../../../../../src/modules/base_store';
import { LIVENESS_LIMIT, EMPTY_BYTES } from '../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityInternalMethod } from '../../../../../src/modules/interoperability/mainchain/internal_method';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../../src/modules/interoperability/stores/chain_account';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('Mainchain interoperability internal method', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const ownChainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
	};
	const chainID = Buffer.from([0, 0, 0, 1]);
	const timestamp = 2592000 * 100;
	let chainAccount: any;
	let ownChainAccount: any;
	let stateStore: PrefixedStateReadWriter;
	let mainchainInteroperabilityInternalMethod: MainchainInteroperabilityInternalMethod;
	let chainDataSubstore: ChainAccountStore;

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
			chainID: Buffer.from([0, 0, 0, 0]),
			nonce: BigInt('0'),
		};

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		context = createStoreGetter(stateStore);

		chainDataSubstore = interopMod.stores.get(ChainAccountStore);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
		mainchainInteroperabilityInternalMethod = new MainchainInteroperabilityInternalMethod(
			interopMod.stores,
			interopMod.events,
			new Map(),
		);
	});

	describe('isLive', () => {
		beforeEach(() => {
			when(ownChainAccountStoreMock.get as never)
				.calledWith(expect.anything(), EMPTY_BYTES)
				.mockResolvedValue(ownChainAccount as never);
		});

		it('should return true if chainID equals ownChainAccount ID', async () => {
			const isLive = await mainchainInteroperabilityInternalMethod.isLive(
				context,
				ownChainAccount.chainID,
				timestamp,
			);

			expect(isLive).toBe(true);
		});

		it(`should return false if chain account exists and status is ${ChainStatus.TERMINATED}`, async () => {
			await chainDataSubstore.set(context, chainID, {
				...chainAccount,
				status: ChainStatus.TERMINATED,
			});
			const isLive = await mainchainInteroperabilityInternalMethod.isLive(
				context,
				chainID,
				timestamp,
			);

			expect(isLive).toBe(false);
		});

		it(`should return false if chain account exists & status is ${ChainStatus.ACTIVE} & liveness requirement is not satisfied`, async () => {
			chainAccount.lastCertificate.timestamp = timestamp - LIVENESS_LIMIT - 1;
			await chainDataSubstore.set(context, chainID, {
				...chainAccount,
				status: ChainStatus.ACTIVE,
			});

			const isLive = await mainchainInteroperabilityInternalMethod.isLive(
				context,
				chainID,
				timestamp,
			);

			expect(isLive).toBe(false);
		});

		it(`should return true if chain account exists & status is ${ChainStatus.REGISTERED}`, async () => {
			await chainDataSubstore.set(context, chainID, {
				...chainAccount,
				status: ChainStatus.REGISTERED,
			});

			const isLive = await mainchainInteroperabilityInternalMethod.isLive(
				context,
				chainID,
				timestamp,
			);

			expect(isLive).toBe(true);
		});

		it('should return false if chain account does not exist', async () => {
			const isLive = await mainchainInteroperabilityInternalMethod.isLive(
				context,
				utils.getRandomBytes(32),
				timestamp,
			);

			expect(isLive).toBe(false);
		});
	});
});

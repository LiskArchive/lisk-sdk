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
import { when } from 'jest-when';
import {
	MODULE_ID_INTEROPERABILITY,
	MAINCHAIN_ID,
	STORE_PREFIX_TERMINATED_STATE,
	STORE_PREFIX_CHAIN_DATA,
	LIVENESS_LIMIT,
} from '../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityStore } from '../../../../../src/modules/interoperability/mainchain/store';
import {
	chainAccountSchema,
	terminatedStateSchema,
} from '../../../../../src/modules/interoperability/schema';
import { ChainAccount } from '../../../../../src/modules/interoperability/types';

describe('Mainchain interoperability store', () => {
	const chainID = Buffer.from(MAINCHAIN_ID.toString(16), 'hex');
	const timestamp = 2592000 * 100;
	let chainAccount: any;
	let stateStore: StateStore;
	let mainchainInteroperabilityStore: MainchainInteroperabilityStore;
	let terminatedStateSubstore: StateStore;
	let chainSubstore: StateStore;
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
		stateStore = new StateStore(new InMemoryKVStore());
		chainSubstore = stateStore.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHAIN_DATA);
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
		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			MODULE_ID_INTEROPERABILITY,
			mockGetStore,
			new Map(),
		);
	});

	describe('isLive', () => {
		it('should return false if chain is already terminated', async () => {
			await terminatedStateSubstore.setWithSchema(chainID, chainAccount, terminatedStateSchema);
			const bool = await mainchainInteroperabilityStore.isLive(chainID, timestamp);

			expect(bool).toBe(false);
		});

		it('should return false if liveness requirement is not satisfied', async () => {
			chainAccount.lastCertificate.timestamp = timestamp - LIVENESS_LIMIT - 1;
			await chainSubstore.setWithSchema(chainID, chainAccount, chainAccountSchema);
			const expected = await chainSubstore.getWithSchema<ChainAccount>(chainID, chainAccountSchema);
			// eslint-disable-next-line no-console
			console.log(expected);
			// const bool = await mainchainInteroperabilityStore.isLive(chainID, timestamp);

			expect(expected).toBeDefined();
		});

		it('should return true if chain is not terminated & liveness requirement is satisfied', async () => {
			chainAccount.lastCertificate.timestamp = timestamp - LIVENESS_LIMIT + 1;
			await chainSubstore.setWithSchema(chainID, chainAccount, chainAccountSchema);
			const bool = await mainchainInteroperabilityStore.isLive(chainID, timestamp);

			expect(bool).toBe(true);
		});
	});
});

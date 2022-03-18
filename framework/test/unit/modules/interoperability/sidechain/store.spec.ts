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
	STORE_PREFIX_TERMINATED_STATE,
} from '../../../../../src/modules/interoperability/constants';
import { SidechainInteroperabilityStore } from '../../../../../src/modules/interoperability/sidechain/store';
import { terminatedStateSchema } from '../../../../../src/modules/interoperability/schema';

describe('Sidechain interoperability store', () => {
	const chainID = Buffer.from('54', 'hex');
	const timestamp = 2592000 * 100;
	let chainAccount: any;
	let stateStore: StateStore;
	let sidechainInteroperabilityStore: SidechainInteroperabilityStore;
	let terminatedStateSubstore: StateStore;
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
		terminatedStateSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_STATE,
		);
		mockGetStore = jest.fn();
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_TERMINATED_STATE)
			.mockReturnValue(terminatedStateSubstore);
		sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
			MODULE_ID_INTEROPERABILITY,
			mockGetStore,
			new Map(),
		);
	});

	describe('isLive', () => {
		it('should return false if chain is already terminated', async () => {
			await terminatedStateSubstore.setWithSchema(chainID, chainAccount, terminatedStateSchema);
			const bool = await sidechainInteroperabilityStore.isLive(chainID);

			expect(bool).toBe(false);
		});

		it('should return true if chain is not terminated', async () => {
			const bool = await sidechainInteroperabilityStore.isLive(chainID);

			expect(bool).toBe(true);
		});
	});
});

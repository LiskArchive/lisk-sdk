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

import { SidechainInteroperabilityInternalMethod } from '../../../../../src/modules/interoperability/sidechain/internal_method';
import { Modules } from '../../../../../src';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../../src/modules/interoperability/stores/chain_account';
import { TerminatedStateStore } from '../../../../../src/modules/interoperability/stores/terminated_state';
import { StoreGetter } from '../../../../../src/modules/base_store';
import { createStoreGetter } from '../../../../../src/testing/utils';
import { NamedRegistry } from '../../../../../src/modules/named_registry';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';
import { EMPTY_BYTES } from '../../../../../src/modules/interoperability/constants';

describe('Sidechain interoperability store', () => {
	const sidechainInterops = new Modules.Interoperability.SidechainInteroperabilityModule();
	const ownChainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};

	const chainID = Buffer.from('54', 'hex');
	let chainAccount: any;
	let stateStore: PrefixedStateReadWriter;
	let sidechainInteroperabilityInternalMethod: SidechainInteroperabilityInternalMethod;
	let terminatedStateSubstore: TerminatedStateStore;
	let chainDataSubstore: ChainAccountStore;

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

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		context = createStoreGetter(stateStore);

		chainDataSubstore = sidechainInterops.stores.get(ChainAccountStore);
		terminatedStateSubstore = sidechainInterops.stores.get(TerminatedStateStore);
		sidechainInterops.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
		// sidechainInterops.stores.register(ChainAccountStore, chainAccountStoreMock as never);

		sidechainInteroperabilityInternalMethod = new SidechainInteroperabilityInternalMethod(
			sidechainInterops.stores,
			new NamedRegistry(),
			new Map(),
		);
	});

	describe('isLive', () => {
		beforeEach(() => {
			ownChainAccountStoreMock.get.mockResolvedValue({ chainID: EMPTY_BYTES });
		});

		it('should return true if chainID equals ownChainAccount ID', async () => {
			ownChainAccountStoreMock.get.mockResolvedValue({ chainID });
			const isLive = await sidechainInteroperabilityInternalMethod.isLive(context, chainID);

			expect(isLive).toBe(true);
		});

		it(`should return false if chain account exists and status is ${ChainStatus.TERMINATED}`, async () => {
			await chainDataSubstore.set(context, chainID, {
				...chainAccount,
				status: ChainStatus.TERMINATED,
			});
			const isLive = await sidechainInteroperabilityInternalMethod.isLive(context, chainID);

			expect(isLive).toBe(false);
		});

		it('should return false if chainID exists in terminated state', async () => {
			await terminatedStateSubstore.set(context, chainID, chainAccount);
			const isLive = await sidechainInteroperabilityInternalMethod.isLive(context, chainID);

			expect(isLive).toBe(false);
		});

		it('should return true if chain is not terminated', async () => {
			const isLive = await sidechainInteroperabilityInternalMethod.isLive(context, chainID);

			expect(isLive).toBe(true);
		});
	});
});

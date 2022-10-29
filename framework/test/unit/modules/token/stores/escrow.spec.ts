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

import { StoreGetter } from '../../../../../src/modules/base_store';
import { EscrowStore } from '../../../../../src/modules/token/stores/escrow';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('EscrowStore', () => {
	const defaultSendingChainID = Buffer.from([2, 0, 0, 0]);
	const defaultTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);

	let store: EscrowStore;
	let context: StoreGetter;

	beforeEach(() => {
		store = new EscrowStore('token');
		const db = new InMemoryPrefixedStateDB();
		const stateStore = new PrefixedStateReadWriter(db);
		context = createStoreGetter(stateStore);
	});

	describe('addAmount', () => {
		it('should create escrow account if previous data does not exist', async () => {
			await store.addAmount(context, defaultSendingChainID, defaultTokenID, BigInt(999));

			const escrowAccount = await store.get(
				context,
				Buffer.concat([defaultSendingChainID, defaultTokenID]),
			);
			expect(escrowAccount.amount).toEqual(BigInt(999));
		});

		it('should add balance to escrow account if previous data exists', async () => {
			await store.set(context, Buffer.concat([defaultSendingChainID, defaultTokenID]), {
				amount: BigInt(1000),
			});

			await store.addAmount(context, defaultSendingChainID, defaultTokenID, BigInt(999));

			const escrowAccount = await store.get(
				context,
				Buffer.concat([defaultSendingChainID, defaultTokenID]),
			);
			expect(escrowAccount.amount).toEqual(BigInt(1999));
		});
	});

	describe('deductEscrowAmountWithTerminate', () => {
		it('should terminate if escrow account does not exist', async () => {
			const terminateChain = jest.fn();

			await store.deductEscrowAmountWithTerminate(
				context as any,
				{ terminateChain } as never,
				defaultSendingChainID,
				defaultTokenID,
				BigInt(1500),
			);

			expect(terminateChain).toHaveBeenCalledWith(context, defaultSendingChainID);
		});

		it('should terminate if not enough escrow balance', async () => {
			await store.set(context, defaultTokenID, { amount: BigInt(1000) });
			const terminateChain = jest.fn();

			await store.deductEscrowAmountWithTerminate(
				context as any,
				{ terminateChain } as never,
				defaultSendingChainID,
				defaultTokenID,
				BigInt(1500),
			);

			expect(terminateChain).toHaveBeenCalledWith(context, defaultSendingChainID);
		});

		it('should not terminate and it should reduce escrow balance if enough escrow balance exists', async () => {
			await store.set(context, Buffer.concat([defaultSendingChainID, defaultTokenID]), {
				amount: BigInt(1500),
			});
			const terminateChain = jest.fn();

			await store.deductEscrowAmountWithTerminate(
				context as any,
				{ terminateChain } as never,
				defaultSendingChainID,
				defaultTokenID,
				BigInt(1500),
			);

			expect(terminateChain).not.toHaveBeenCalled();
			const escrowAccount = await store.get(
				context,
				Buffer.concat([defaultSendingChainID, defaultTokenID]),
			);
			expect(escrowAccount.amount).toEqual(BigInt(0));
		});
	});
});

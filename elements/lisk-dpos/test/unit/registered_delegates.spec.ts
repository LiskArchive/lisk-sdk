/*
 * Copyright © 2020 Lisk Foundation
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

import { Slots } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { StateStoreMock } from '../utils/state_store_mock';
import { CHAIN_STATE_DELEGATE_USERNAMES } from '../../src/constants';
import { getDelegateAccounts } from '../utils/round_delegates';
import { Dpos } from '../../src';
import { BLOCK_TIME } from '../fixtures/constants';
import { delegatesUserNamesSchema } from '../../src/schemas';

const MS_IN_A_SEC = 1000;
const GENESIS_BLOCK_TIMESTAMP =
	new Date(Date.UTC(2020, 5, 15, 0, 0, 0, 0)).getTime() / MS_IN_A_SEC;

describe('dpos', () => {
	let dpos: Dpos;
	let chainStub: any;
	let stateStore: StateStoreMock;

	beforeEach(() => {
		chainStub = {
			slots: new Slots({
				genesisBlockTimestamp: GENESIS_BLOCK_TIMESTAMP,
				interval: BLOCK_TIME,
			}) as any,
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
				getConsensusState: jest.fn().mockResolvedValue(undefined),
				getDelegateAccounts: jest.fn().mockResolvedValue([]),
				getDelegates: jest.fn().mockResolvedValue([]),
			},
		};
		dpos = new Dpos({ chain: chainStub });
		stateStore = new StateStoreMock();
	});

	describe('getRegisteredDelegates', () => {
		it('should return array of registered delegates usernames and their addresses', async () => {
			// Arrange
			const usernames = getDelegateAccounts(103).map(delegate => ({
				address: delegate.address,
				username: delegate.asset.delegate.username,
			}));
			const encodedBuffer = codec.encode(delegatesUserNamesSchema, {
				registeredDelegates: usernames,
			});
			stateStore.chain.set(CHAIN_STATE_DELEGATE_USERNAMES, encodedBuffer);

			// Act
			const result = await dpos.getRegisteredDelegates(stateStore);

			// Assert
			expect(result).toEqual(usernames);
		});
		it('should return empty array if no delegate registered', async () => {
			// Act
			const result = await dpos.getRegisteredDelegates(stateStore);

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe('setRegisteredDelegates', () => {
		it('should set registered delegates usernames and their addresses to store', async () => {
			// Arrange
			const usernames = getDelegateAccounts(103).map(delegate => ({
				address: delegate.address,
				username: delegate.asset.delegate.username,
			}));
			const encodedBuffer = codec.encode(delegatesUserNamesSchema, {
				registeredDelegates: usernames,
			});
			jest.spyOn(stateStore.chain, 'set');

			// Act
			await dpos.setRegisteredDelegates(stateStore, usernames);

			// Assert
			expect(stateStore.chain.set).toBeCalledWith(
				CHAIN_STATE_DELEGATE_USERNAMES,
				encodedBuffer,
			);
		});
	});
});

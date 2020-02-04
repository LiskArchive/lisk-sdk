/*
 * Copyright © 2019 Lisk Foundation
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
import { Dpos } from '../../src';
import { delegatePublicKeys, delegateAccounts } from '../utils/round_delegates';
import {
	ACTIVE_DELEGATES,
	DELEGATE_LIST_ROUND_OFFSET,
} from '../fixtures/constants';
import * as shuffledDelegatePublicKeys from '../fixtures/shuffled_delegate_publickeys_for_round_5.json';
import { CHAIN_STATE_FORGERS_LIST_KEY } from '../../src/constants';

/**
 * shuffledDelegatePublicKeys is created for the round: 5
 * If you need to update the round number or
 * need shuffled list for another round, please create/update
 * the list accordingly.
 */
describe('dpos.getForgerPublicKeysForRound()', () => {
	let dpos: Dpos;
	let chainStub: any;

	beforeEach(() => {
		// Arrange
		chainStub = {
			dataAccess: {
				getChainState: jest.fn(),
				getDelegateAccounts: jest.fn(),
			},
		};

		dpos = new Dpos({
			chain: chainStub,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset: DELEGATE_LIST_ROUND_OFFSET,
		});
	});

	const round = 5;

	it('should return shuffled delegate public keys by using round_delegates table record', async () => {
		// Arrange
		when(chainStub.dataAccess.getChainState)
			.calledWith(CHAIN_STATE_FORGERS_LIST_KEY)
			.mockReturnValue(
				JSON.stringify([{ round, delegates: delegatePublicKeys }]),
			);

		// Act
		const list = await dpos.getForgerPublicKeysForRound(round);

		// Assert
		expect(list).toEqual(shuffledDelegatePublicKeys);
	});

	it('should throw error when chain state is empty', async () => {
		// Arrange
		when(chainStub.dataAccess.getChainState)
			.calledWith(CHAIN_STATE_FORGERS_LIST_KEY)
			.mockReturnValue(undefined);
		chainStub.dataAccess.getDelegateAccounts.mockReturnValue(delegateAccounts);

		// Act && Assert
		return expect(dpos.getForgerPublicKeysForRound(round)).rejects.toThrow(
			`No delegate list found for round: ${round}`,
		);
	});

	it('should throw error when round is not in the chain state', async () => {
		// Arrange
		when(chainStub.dataAccess.getChainState)
			.calledWith(CHAIN_STATE_FORGERS_LIST_KEY)
			.mockReturnValue(
				JSON.stringify([{ round: 7, delegates: delegatePublicKeys }]),
			);
		chainStub.dataAccess.getDelegateAccounts.mockReturnValue(delegateAccounts);

		// Act && Assert
		return expect(dpos.getForgerPublicKeysForRound(round)).rejects.toThrow(
			`No delegate list found for round: ${round}`,
		);
	});
});

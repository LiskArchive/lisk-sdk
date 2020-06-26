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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { forgerListSchema } from '../../src/schemas';
import { Dpos } from '../../src';
import { delegatePublicKeys } from '../utils/round_delegates';
import { CONSENSUS_STATE_DELEGATE_FORGERS_LIST } from '../../src/constants';

/**
 * shuffledDelegatePublicKeys is created for the round: 5
 * If you need to update the round number or
 * need shuffled list for another round, please create/update
 * the list accordingly.
 */
describe('dpos.getForgerAddressesForRound()', () => {
	let dpos: Dpos;
	let chainStub: any;

	beforeEach(() => {
		// Arrange
		chainStub = {
			dataAccess: {
				getConsensusState: jest.fn(),
			},
		};

		dpos = new Dpos({
			chain: chainStub,
			initDelegates: [],
			genesisBlockHeight: 0,
			initRound: 3,
		});
	});

	const round = 5;

	it('should return shuffled delegate public keys by using round_delegates table record', async () => {
		// Arrange
		const forgerListObject = {
			forgersList: [
				{
					round,
					delegates: delegatePublicKeys.map(pk =>
						getAddressFromPublicKey(Buffer.from(pk, 'hex')),
					),
					standby: [],
				},
			],
		};

		const forgersList = codec.encode(forgerListSchema, forgerListObject);

		when(chainStub.dataAccess.getConsensusState)
			.calledWith(CONSENSUS_STATE_DELEGATE_FORGERS_LIST)
			.mockReturnValue(forgersList);

		// Act
		const list = await dpos.getForgerAddressesForRound(round);

		// Assert
		expect(list).toEqual(forgerListObject.forgersList[0].delegates);
	});

	it('should throw error when chain state is empty', async () => {
		// Arrange
		when(chainStub.dataAccess.getConsensusState)
			.calledWith(CONSENSUS_STATE_DELEGATE_FORGERS_LIST)
			.mockReturnValue(undefined);

		// Act && Assert
		return expect(dpos.getForgerAddressesForRound(round)).rejects.toThrow(
			`No delegate list found for round: ${round.toString()}`,
		);
	});

	it('should throw error when round is not in the chain state', async () => {
		// Arrange

		const forgerListObject = {
			forgersList: [
				{
					round: 7,
					delegates: delegatePublicKeys.map(pk =>
						getAddressFromPublicKey(Buffer.from(pk, 'hex')),
					),
					standby: [],
				},
			],
		};

		const forgersList = codec.encode(forgerListSchema, forgerListObject);

		when(chainStub.dataAccess.getConsensusState)
			.calledWith(CONSENSUS_STATE_DELEGATE_FORGERS_LIST)
			.mockReturnValue(forgersList);

		// Act && Assert
		return expect(dpos.getForgerAddressesForRound(round)).rejects.toThrow(
			`No delegate list found for round: ${round.toString()}`,
		);
	});
});

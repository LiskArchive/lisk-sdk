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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { getDelegateAccounts } from '../utils/round_delegates';
import { EPOCH_TIME, BLOCK_TIME } from '../fixtures/constants';
import * as delegatePublicKeys from '../fixtures/delegate_publickeys.json';
import { Dpos } from '../../src';

describe('dpos.isActiveDelegate', () => {
	const defaultAddress = getAddressFromPublicKey(delegatePublicKeys[0]);
	const delegatesAddresses = getDelegateAccounts(101).map(d => ({
		address: d.address,
		voteWeight: '100000000000',
	}));

	let dpos: Dpos;
	let chainMock: any;

	beforeEach(() => {
		// Arrange
		const slots = new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME });
		chainMock = {
			slots,
			dataAccess: {
				getConsensusState: jest.fn(),
			},
		};

		dpos = new Dpos({
			chain: chainMock,
		});
	});

	describe('When there is no forgers list corresponding to the height', () => {
		it('should throw an error', async () => {
			chainMock.dataAccess.getConsensusState.mockResolvedValue(
				JSON.stringify([{ round: 5, delegates: delegatesAddresses }]),
			);

			await expect(dpos.isActiveDelegate(defaultAddress, 1023)).rejects.toThrow(
				'Vote weight not found for round 10 for the given height 1023',
			);
		});
	});

	describe('When there is forgers list corresponding to the height', () => {
		describe('When the address is not in the first 101 elements', () => {
			it('should return false', async () => {
				chainMock.dataAccess.getConsensusState.mockResolvedValue(
					JSON.stringify([
						{
							round: 5,
							delegates: [
								...delegatesAddresses,
								{ address: defaultAddress, voteWeight: '0' },
							],
						},
					]),
				);

				const isActive = await dpos.isActiveDelegate(defaultAddress, 503);

				expect(isActive).toBeFalse();
			});
		});

		describe('When the address is in the first 101 elements', () => {
			it('should return true', async () => {
				chainMock.dataAccess.getConsensusState.mockResolvedValue(
					JSON.stringify([
						{
							round: 5,
							delegates: [
								{ address: defaultAddress, voteWeight: '200000000000' },
								...delegatesAddresses,
							],
						},
					]),
				);

				const isActive = await dpos.isActiveDelegate(defaultAddress, 503);

				expect(isActive).toBeTrue();
			});
		});
	});
});

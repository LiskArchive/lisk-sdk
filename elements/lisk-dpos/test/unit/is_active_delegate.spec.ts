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
import { codec } from '@liskhq/lisk-codec';
import { voteWeightsSchema } from '../../src/schemas';
import { getDelegateAccounts } from '../utils/round_delegates';
import { BLOCK_TIME } from '../fixtures/constants';
import * as delegatePublicKeys from '../fixtures/delegate_publickeys.json';
import { Dpos } from '../../src';

const MS_IN_A_SEC = 1000;
const GENESIS_BLOCK_TIMESTAMP =
	new Date(Date.UTC(2020, 5, 15, 0, 0, 0, 0)).getTime() / MS_IN_A_SEC;

describe('dpos.isActiveDelegate', () => {
	const defaultAddress = getAddressFromPublicKey(
		Buffer.from(delegatePublicKeys[0], 'hex'),
	);
	const delegatesAddresses = getDelegateAccounts(101).map(d => ({
		address: d.address,
		voteWeight: BigInt(100000000000),
	}));

	let dpos: Dpos;
	let chainMock: any;

	beforeEach(() => {
		// Arrange
		const slots = new Slots({
			genesisBlockTimestamp: GENESIS_BLOCK_TIMESTAMP,
			interval: BLOCK_TIME,
		});
		chainMock = {
			slots,
			dataAccess: {
				getConsensusState: jest.fn(),
			},
		};
		const initDelegates = delegatePublicKeys.map(pk =>
			getAddressFromPublicKey(Buffer.from(pk, 'hex')),
		);

		dpos = new Dpos({
			chain: chainMock,
			initDelegates,
		});
	});

	describe('When there is no forgers list corresponding to the height', () => {
		it('should throw an error', async () => {
			const voteWeights = {
				voteWeights: [{ round: 5, delegates: delegatesAddresses }],
			};

			const binaryVoteWeightsList = codec.encode(
				voteWeightsSchema,
				voteWeights,
			);

			chainMock.dataAccess.getConsensusState.mockResolvedValue(
				binaryVoteWeightsList,
			);

			await expect(dpos.isActiveDelegate(defaultAddress, 1023)).rejects.toThrow(
				'Vote weight not found for round 10 for the given height 1023',
			);
		});
	});

	describe('When there is forgers list corresponding to the height', () => {
		describe('When the address is not in the first 101 elements', () => {
			it('should return false', async () => {
				const voteWeights = {
					voteWeights: [
						{
							round: 5,
							delegates: [
								...delegatesAddresses,
								{ address: defaultAddress, voteWeight: BigInt(0) },
							],
						},
					],
				};

				const binaryVoteWeightsList = codec.encode(
					voteWeightsSchema,
					voteWeights,
				);

				chainMock.dataAccess.getConsensusState.mockResolvedValue(
					binaryVoteWeightsList,
				);

				const isActive = await dpos.isActiveDelegate(defaultAddress, 503);

				expect(isActive).toBeFalse();
			});
		});

		describe('When the address is in the first 101 elements', () => {
			it('should return true', async () => {
				const voteWeights = {
					voteWeights: [
						{
							round: 5,
							delegates: [
								{ address: defaultAddress, voteWeight: BigInt(200000000000) },
								...delegatesAddresses,
							],
						},
					],
				};

				const binaryVoteWeightsList = codec.encode(
					voteWeightsSchema,
					voteWeights,
				);

				chainMock.dataAccess.getConsensusState.mockResolvedValue(
					binaryVoteWeightsList,
				);

				const isActive = await dpos.isActiveDelegate(defaultAddress, 503);

				expect(isActive).toBeTrue();
			});
		});
	});
});

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

import { address, utils } from '@liskhq/lisk-cryptography';
import { Database, InMemoryDatabase } from '@liskhq/lisk-db';
import { ConsensusEndpoint } from '../../../../src/engine/endpoint/consensus';

describe('system endpoint', () => {
	const validators = [
		{
			address: utils.getRandomBytes(20),
			bftWeight: BigInt(2),
			blsKey: utils.getRandomBytes(20),
		},
	];
	const validatorsJSON = validators.map(v => ({
		address: address.getLisk32AddressFromAddress(v.address),
		bftWeight: v.bftWeight.toString(),
		blsKey: v.blsKey.toString('hex'),
	}));

	const bftParameters = {
		prevoteThreshold: BigInt(68),
		precommitThreshold: BigInt(70),
		certificateThreshold: BigInt(70),
		validators,
		validatorsHash: utils.getRandomBytes(20),
	};
	const bftParametersJSON = {
		prevoteThreshold: bftParameters.prevoteThreshold.toString(),
		precommitThreshold: bftParameters.precommitThreshold.toString(),
		certificateThreshold: bftParameters.certificateThreshold.toString(),
		validators: validatorsJSON,
		validatorsHash: bftParameters.validatorsHash.toString('hex'),
	};
	const bftHeights = {
		maxHeightPrevoted: 100,
		maxHeightPrecommitted: 98,
		maxHeightCertified: 80,
	};

	let endpoint: ConsensusEndpoint;
	let blockchainDB: Database;
	let bftMethod: any;

	beforeEach(() => {
		blockchainDB = new InMemoryDatabase() as never;
		bftMethod = {
			getBFTHeights: jest.fn().mockResolvedValue(bftHeights),
			getBFTParameters: jest.fn().mockResolvedValue(bftParameters),
		};
		endpoint = new ConsensusEndpoint({
			bftMethod,
			blockchainDB,
		});
	});
	describe('getBFTParameters', () => {
		it('should return bft parameters in JSON format', async () => {
			const result = await endpoint.getBFTParameters({ params: { height: 0 } } as any);

			expect(bftMethod.getBFTParameters).toHaveBeenCalledTimes(1);
			expect(result).toEqual(bftParametersJSON);
		});
	});

	describe('getBFTHeights', () => {
		it('should return bft heights', async () => {
			const result = await endpoint.getBFTHeights({} as any);

			expect(bftMethod.getBFTHeights).toHaveBeenCalledTimes(1);
			expect(result).toEqual(bftHeights);
		});
	});
});

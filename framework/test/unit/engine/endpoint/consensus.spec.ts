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

describe('consensus endpoint', () => {
	const validators = [
		{
			address: utils.getRandomBytes(20),
			bftWeight: BigInt(2),
			blsKey: utils.getRandomBytes(20),
		},
		{
			address: utils.getRandomBytes(20),
			bftWeight: BigInt(1),
			blsKey: utils.getRandomBytes(20),
		},
		{
			address: utils.getRandomBytes(20),
			bftWeight: BigInt(0),
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
			getBFTParametersActiveValidators: jest.fn().mockResolvedValue({
				...bftParameters,
				validators: bftParameters.validators.filter(v => v.bftWeight > BigInt(0)),
			}),
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

	describe('getBFTParametersActiveValidators', () => {
		it('should return bft parameters in JSON format including only active validators', async () => {
			const result = await endpoint.getBFTParametersActiveValidators({
				params: { height: 0 },
			} as any);
			const bftParamsWithActiveValidators = {
				...bftParametersJSON,
				validators: [...bftParametersJSON.validators.filter(v => BigInt(v.bftWeight) > BigInt(0))],
			};

			expect(bftMethod.getBFTParametersActiveValidators).toHaveBeenCalledTimes(1);
			expect(result).toEqual(bftParamsWithActiveValidators);
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

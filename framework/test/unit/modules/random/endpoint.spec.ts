/*
 * Copyright © 2021 Lisk Foundation
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

import * as cryptography from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';
import { ModuleEndpointContext } from '../../../../src';
import { MODULE_ID_RANDOM } from '../../../../src/modules/random/constants';
import { RandomEndpoint } from '../../../../src/modules/random/endpoint';
import { seedRevealSchema } from '../../../../src/modules/random/schemas';
import { createTransientModuleEndpointContext } from '../../../../src/testing';
import * as genesisDelegates from '../../../fixtures/genesis_delegates.json';

describe('RandomModuleEndpoint', () => {
	let randomEndpoint: RandomEndpoint;
	let context: ModuleEndpointContext;
	const subStoreMock = jest.fn();
	const storeMock = jest.fn().mockReturnValue({ getWithSchema: subStoreMock });
	const stateStore: any = {
		getStore: storeMock,
	};

	const emptyBytes = Buffer.alloc(0);

	describe('isSeedRevealValid', () => {
		const validatorsData = [
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[0].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[0].hashOnion.hashes[0], 'hex'),
				height: 1,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[1].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[1].hashOnion.hashes[1], 'hex'),
				height: 3,
				valid: true,
			},
			{
				generatorAddress: Buffer.from(genesisDelegates.delegates[2].address, 'hex'),
				seedReveal: Buffer.from(genesisDelegates.delegates[2].hashOnion.hashes[1], 'hex'),
				height: 5,
				valid: true,
			},
		];

		beforeEach(async () => {
			randomEndpoint = new RandomEndpoint(MODULE_ID_RANDOM);
			context = createTransientModuleEndpointContext({
				stateStore,
			});
			when(subStoreMock)
				.calledWith(emptyBytes, seedRevealSchema)
				.mockReturnValue({ validatorReveals: validatorsData });
		});

		it('should return true for a valid seed reveal', async () => {
			// Arrange
			const address = Buffer.from(genesisDelegates.delegates[0].address, 'hex');
			const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
			const hashes = cryptography.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisDelegates.delegates[0].hashOnion.distance,
				1,
			);
			const hashToBeChecked = hashes[1];
			// Act
			const isValid = await randomEndpoint.isSeedRevealValid(context, address, hashToBeChecked);
			// Assert
			expect(isValid).toEqual(true);
		});

		it('should return true if no last seed reveal found', async () => {
			// Arrange
			const address = Buffer.from(genesisDelegates.delegates[4].address, 'hex');
			const seed = genesisDelegates.delegates[4].hashOnion.hashes[0];
			const hashes = cryptography.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisDelegates.delegates[0].hashOnion.distance,
				1,
			);
			const hashToBeChecked = hashes[3];
			// Act
			const isValid = await randomEndpoint.isSeedRevealValid(context, address, hashToBeChecked);
			// Assert
			expect(isValid).toEqual(true);
		});

		it('should return false for an invalid seed reveal when last seed is not hash of the given reveal', async () => {
			// Arrange
			const address = Buffer.from(genesisDelegates.delegates[1].address, 'hex');
			const seed = genesisDelegates.delegates[0].hashOnion.hashes[1];
			const hashes = cryptography.hashOnion(
				Buffer.from(seed, 'hex'),
				genesisDelegates.delegates[0].hashOnion.distance,
				1,
			);
			const hashToBeChecked = hashes[3];
			// Act
			const isValid = await randomEndpoint.isSeedRevealValid(context, address, hashToBeChecked);
			// Assert
			expect(isValid).toEqual(false);
		});
	});
});

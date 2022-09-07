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

import { utils } from '@liskhq/lisk-cryptography';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { ABI } from '../../../../src/abi';
import { StateEndpoint } from '../../../../src/engine/endpoint/state';
import { Logger } from '../../../../src/logger';
import { fakeLogger } from '../../../utils/mocks';

describe('state endpoint', () => {
	const logger: Logger = fakeLogger;
	const networkIdentifier = Buffer.alloc(0);
	const stateRoot = utils.getRandomBytes(32);
	const queryKeys = [utils.getRandomBytes(32), utils.getRandomBytes(32)];
	const inputParams = { stateRoot, keys: queryKeys };

	let endpoint: StateEndpoint;
	let abi: ABI;

	beforeEach(() => {
		abi = {
			prove: jest.fn(),
		} as never;
		endpoint = new StateEndpoint({
			abi,
		});
	});

	describe('stateProve', () => {
		describe('when request data is invalid', () => {
			it('should reject with validation error', async () => {
				await expect(
					endpoint.stateProve({
						logger,
						params: {
							invalid: 'schema',
						},
						networkIdentifier,
					}),
				).rejects.toThrow(LiskValidationError);
			});

			it('should reject with error when state root bytes is invalid', async () => {
				await expect(
					endpoint.stateProve({
						logger,
						params: {
							stateRoot: 'xxxx',
						},
						networkIdentifier,
					}),
				).rejects.toThrow();
			});

			it('should reject with error when keys is not an array', async () => {
				await expect(
					endpoint.stateProve({
						logger,
						params: {
							stateRoot,
							keys: queryKeys[0],
						},
						networkIdentifier,
					}),
				).rejects.toThrow();
			});

			it('should reject with error when keys bytes is invalid', async () => {
				await expect(
					endpoint.stateProve({
						logger,
						params: {
							stateRoot,
							keys: ['xxxx'],
						},
						networkIdentifier,
					}),
				).rejects.toThrow();
			});
		});

		describe('when request data is valid', () => {
			it('should call abi.prove with appropriate parameters', async () => {
				const proveSpy = jest.spyOn(abi, 'prove');
				await endpoint.stateProve({ logger, params: inputParams, networkIdentifier });

				expect(proveSpy).toHaveBeenCalledTimes(1);
				expect(proveSpy).toHaveBeenCalledWith(inputParams);
			});
		});
	});
});

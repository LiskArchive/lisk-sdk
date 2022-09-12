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

import { Chain } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { ABI } from '../../../../src/abi';
import { StateEndpoint } from '../../../../src/engine/endpoint/state';
import { Logger } from '../../../../src/logger';
import { fakeLogger } from '../../../utils/mocks';

describe('state endpoint', () => {
	const logger: Logger = fakeLogger;
	const networkIdentifier = Buffer.alloc(0);
	const queryKeys = [utils.getRandomBytes(32), utils.getRandomBytes(32)];

	let endpoint: StateEndpoint;
	let abi: ABI;
	let chain: Chain;

	beforeEach(() => {
		chain = {
			lastBlock: {
				header: {
					stateRoot: utils.getRandomBytes(32),
				},
				transactions: [],
				assets: {
					getAll: jest.fn(),
				},
			},
		} as never;
		abi = {
			prove: jest.fn(),
		} as never;
		endpoint = new StateEndpoint({
			abi,
			chain,
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

			it('should reject with error when keys is not an array', async () => {
				await expect(
					endpoint.stateProve({
						logger,
						params: {
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
							keys: ['xxxx'],
						},
						networkIdentifier,
					}),
				).rejects.toThrow();
			});
		});

		describe('when request data is valid', () => {
			it('should throw error if last block header state root is empty', async () => {
				endpoint = new StateEndpoint({
					abi,
					chain: {
						lastBlock: {
							header: {},
							transactions: [],
							assets: {
								getAll: jest.fn(),
							},
						},
					} as never,
				});
				await expect(
					endpoint.stateProve({ logger, params: { keys: queryKeys }, networkIdentifier }),
				).rejects.toThrow('Last block header state root is empty.');
			});

			it('should call abi.prove with appropriate parameters if last block header state root is not empty', async () => {
				const proveSpy = jest.spyOn(abi, 'prove');
				await endpoint.stateProve({ logger, params: { keys: queryKeys }, networkIdentifier });

				expect(proveSpy).toHaveBeenCalledTimes(1);
				expect(proveSpy).toHaveBeenCalledWith({
					stateRoot: chain.lastBlock.header.stateRoot,
					keys: queryKeys,
				});
			});
		});
	});
});

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
import { ABI, ProveResponseJSON } from '../../../../src/abi';
import { StateEndpoint } from '../../../../src/engine/endpoint/state';
import { Logger } from '../../../../src/logger';
import { fakeLogger } from '../../../utils/mocks';

describe('state endpoint', () => {
	const logger: Logger = fakeLogger;
	const chainID = Buffer.from('00001111', 'hex');
	const queryKeys = [
		utils.getRandomBytes(32).toString('hex'),
		utils.getRandomBytes(32).toString('hex'),
	];

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
					endpoint.prove({
						logger,
						params: {
							invalid: 'schema',
						},
						chainID,
					}),
				).rejects.toThrow(LiskValidationError);
			});

			it('should reject with error when queryKeys is not an array', async () => {
				await expect(
					endpoint.prove({
						logger,
						params: {
							queryKeys: queryKeys[0],
						},
						chainID,
					}),
				).rejects.toThrow();
			});

			it('should reject with error when queryKeys string is invalid', async () => {
				await expect(
					endpoint.prove({
						logger,
						params: {
							queryKeys: [Buffer.from('xxxx')],
						},
						chainID,
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
				await expect(endpoint.prove({ logger, params: { queryKeys }, chainID })).rejects.toThrow(
					'Last block header state root is empty.',
				);
			});

			it('should call abi.prove with appropriate parameters if last block header state root is not empty', async () => {
				const proveABIResponse = {
					proof: {
						queries: queryKeys.map(q => ({
							bitmap: Buffer.alloc(1),
							key: Buffer.from(q, 'hex'),
							value: utils.hash(Buffer.alloc(1)),
						})),
						siblingHashes: [utils.getRandomBytes(32)],
					},
				};
				const proveABIResponseJSON: ProveResponseJSON = {
					proof: {
						queries: proveABIResponse.proof.queries.map(q => ({
							bitmap: q.bitmap.toString('hex'),
							key: q.key.toString('hex'),
							value: q.value.toString('hex'),
						})),
						siblingHashes: proveABIResponse.proof.siblingHashes.map(s => s.toString('hex')),
					},
				};
				const proveSpy = jest.spyOn(abi, 'prove').mockResolvedValue(proveABIResponse);
				const response = await endpoint.prove({ logger, params: { queryKeys }, chainID });

				expect(proveSpy).toHaveBeenCalledTimes(1);
				expect(proveSpy).toHaveBeenCalledWith({
					stateRoot: chain.lastBlock.header.stateRoot,
					keys: queryKeys.map(q => Buffer.from(q, 'hex')),
				});
				expect(response).toEqual(proveABIResponseJSON);
			});
		});
	});
});

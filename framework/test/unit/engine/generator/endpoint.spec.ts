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

import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { dataStructures } from '@liskhq/lisk-utils';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { ABI, TransactionVerifyResult } from '../../../../src/abi';
import { Logger } from '../../../../src/logger';
import { Broadcaster } from '../../../../src/engine/generator/broadcaster';
import { GENERATOR_STORE_RESERVED_PREFIX } from '../../../../src/engine/generator/constants';
import { Endpoint } from '../../../../src/engine/generator/endpoint';
import { InvalidTransactionError } from '../../../../src/engine/generator/errors';
import { GeneratorStore } from '../../../../src/engine/generator/generator_store';
import { previouslyGeneratedInfoSchema } from '../../../../src/engine/generator/schemas';
import { Consensus, Keypair } from '../../../../src/engine/generator/types';
import { fakeLogger } from '../../../utils/mocks';

describe('generator endpoint', () => {
	const logger: Logger = fakeLogger;
	const tx = new Transaction({
		params: Buffer.alloc(20),
		commandID: 0,
		fee: BigInt(100000),
		moduleID: 2,
		nonce: BigInt(0),
		senderPublicKey: Buffer.alloc(32),
		signatures: [Buffer.alloc(64)],
	});
	const config = {
		address: Buffer.from('d04699e57c4a3846c988f3c15306796f8eae5c1c', 'hex'),
		encryptedPassphrase:
			'iterations=10&cipherText=6541c04d7a46eacd666c07fbf030fef32c5db324466e3422e59818317ac5d15cfffb80c5f1e2589eaa6da4f8d611a94cba92eee86722fc0a4015a37cff43a5a699601121fbfec11ea022&iv=141edfe6da3a9917a42004be&salt=f523bba8316c45246c6ffa848b806188&tag=4ffb5c753d4a1dc96364c4a54865521a&version=1',
	};
	const invalidConfig = {
		...config,
		address: Buffer.from('aaaaaaaaaa4a3846c988f3c15306796f8eae5c1c', 'hex'),
	};
	const defaultPassword = 'elephant tree paris dragon chair galaxy';
	const networkIdentifier = Buffer.alloc(0);

	let endpoint: Endpoint;
	let broadcaster: Broadcaster;
	let consensus: Consensus;
	let pool: TransactionPool;
	let abi: ABI;

	beforeEach(() => {
		broadcaster = {
			enqueueTransactionId: jest.fn(),
		} as never;
		consensus = {
			isSynced: jest.fn().mockResolvedValue(true),
		} as never;
		pool = {
			contains: jest.fn().mockReturnValue(false),
			add: jest.fn().mockResolvedValue({}),
		} as never;
		abi = {
			verifyTransaction: jest.fn().mockResolvedValue({ result: TransactionVerifyResult.OK }),
		} as never;
		endpoint = new Endpoint({
			abi,
			broadcaster,
			consensus,
			pool,
			keypair: new dataStructures.BufferMap<Keypair>(),
			generators: [config, invalidConfig],
		});
		endpoint.init({
			generatorDB: new InMemoryKVStore() as never,
			logger,
		});
	});

	describe('postTransaction', () => {
		describe('when request data is invalid', () => {
			it('should reject with validation error', async () => {
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							invalid: 'schema',
						},
						networkIdentifier,
					}),
				).rejects.toThrow(LiskValidationError);
			});

			it('should reject with error when transaction bytes is invalid', async () => {
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							transaction: 'xxxx',
						},
						networkIdentifier,
					}),
				).rejects.toThrow();
			});
		});

		describe('when verify transaction fails', () => {
			it('should throw when transaction is invalid', async () => {
				(abi.verifyTransaction as jest.Mock).mockResolvedValue({
					result: TransactionVerifyResult.INVALID,
				});
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						networkIdentifier,
					}),
				).rejects.toThrow(InvalidTransactionError);
			});
		});

		describe('when transaction pool already contains the transaction', () => {
			it('should return the transaction id', async () => {
				(pool.contains as jest.Mock).mockReturnValue(true);
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						networkIdentifier,
					}),
				).resolves.toEqual({
					transactionId: tx.id.toString('hex'),
				});
			});
		});

		describe('when failed to add to the transaction', () => {
			it('should throw when transaction is invalid', async () => {
				(pool.add as jest.Mock).mockResolvedValue({
					error: new Error('invalid tx'),
				});
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						networkIdentifier,
					}),
				).rejects.toThrow(InvalidTransactionError);
			});
		});

		describe('when successfully to add to the transaction pool', () => {
			it('should return the transaction id', async () => {
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						networkIdentifier,
					}),
				).resolves.toEqual({
					transactionId: tx.id.toString('hex'),
				});
				expect(broadcaster.enqueueTransactionId).toHaveBeenCalledWith(tx.id);
			});
		});
	});

	describe('updateStatus', () => {
		const bftProps = {
			height: 200,
			maxHeightPrevoted: 200,
			maxHeightGenerated: 10,
		};

		it('should reject with error when request schema is invalid', async () => {
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						enable: true,
						password: defaultPassword,
						overwrite: true,
						...bftProps,
					},
					networkIdentifier,
				}),
			).rejects.toThrow(LiskValidationError);
		});

		it('should reject with error when address is not in config', async () => {
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: getRandomBytes(20).toString('hex'),
						enable: true,
						password: defaultPassword,
						overwrite: true,
						...bftProps,
					},
					networkIdentifier,
				}),
			).rejects.toThrow('Generator with address:');
		});

		it('should return error with invalid password', async () => {
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: config.address.toString('hex'),
						enable: true,
						password: 'wrong password',
						overwrite: true,
						...bftProps,
					},
					networkIdentifier,
				}),
			).rejects.toThrow('Invalid password and public key combination');
		});

		it('should return error with invalid publicKey', async () => {
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: invalidConfig.address.toString('hex'),
						enable: true,
						password: defaultPassword,
						overwrite: true,
						...bftProps,
					},
					networkIdentifier,
				}),
			).rejects.toThrow('Invalid keypair');
		});

		it('should return error if the engine is not synced', async () => {
			(consensus.isSynced as jest.Mock).mockReturnValue(false);
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: config.address.toString('hex'),
						enable: true,
						password: defaultPassword,
						overwrite: true,
						...bftProps,
					},
					networkIdentifier,
				}),
			).rejects.toThrow('Failed to enable forging as the node is not synced to the network.');
		});

		it('should delete the keypair if disabling', async () => {
			endpoint['_keypairs'].set(config.address, {
				publicKey: Buffer.alloc(0),
				privateKey: Buffer.alloc(0),
				blsSecretKey: Buffer.alloc(0),
			});
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: config.address.toString('hex'),
						enable: false,
						password: defaultPassword,
						overwrite: true,
						...bftProps,
					},
					networkIdentifier,
				}),
			).resolves.toEqual({
				address: config.address.toString('hex'),
				enabled: false,
			});
			expect(endpoint['_keypairs'].has(config.address)).toBeFalse();
		});

		it('should update the keypair and return enabled', async () => {
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: config.address.toString('hex'),
						enable: true,
						password: defaultPassword,
						overwrite: true,
						...bftProps,
					},
					networkIdentifier,
				}),
			).resolves.toEqual({
				address: config.address.toString('hex'),
				enabled: true,
			});
			expect(endpoint['_keypairs'].has(config.address)).toBeTrue();
		});

		it('should accept if BFT properties specified are zero and there is no previous values', async () => {
			const db = (new InMemoryKVStore() as unknown) as KVStore;
			endpoint.init({
				generatorDB: db,
				logger,
			});
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: config.address.toString('hex'),
						enable: true,
						password: defaultPassword,
						overwrite: false,
						height: 0,
						maxHeightPrevoted: 0,
						maxHeightGenerated: 0,
					},
					networkIdentifier,
				}),
			).resolves.toEqual({
				address: config.address.toString('hex'),
				enabled: true,
			});
		});

		it('should reject if BFT properties specified are non-zero and there is no previous values', async () => {
			const db = (new InMemoryKVStore() as unknown) as KVStore;
			endpoint.init({
				generatorDB: db,
				logger,
			});
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: config.address.toString('hex'),
						enable: true,
						password: defaultPassword,
						overwrite: false,
						height: 100,
						maxHeightPrevoted: 40,
						maxHeightGenerated: 3,
					},
					networkIdentifier,
				}),
			).rejects.toThrow('Last generated information does not exist.');
		});

		it('should reject if BFT properties specified are zero and there is non zero previous values', async () => {
			const encodedInfo = codec.encode(previouslyGeneratedInfoSchema, {
				height: 100,
				maxHeightPrevoted: 40,
				maxHeightGenerated: 3,
			});
			const db = (new InMemoryKVStore() as unknown) as KVStore;
			const generatorStore = new GeneratorStore(db as never);
			const subStore = generatorStore.getGeneratorStore(GENERATOR_STORE_RESERVED_PREFIX);
			await subStore.set(config.address, encodedInfo);
			const batch = db.batch();
			subStore.finalize(batch);
			await batch.write();
			endpoint.init({
				generatorDB: db,
				logger,
			});
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: config.address.toString('hex'),
						enable: true,
						password: defaultPassword,
						overwrite: false,
						height: 0,
						maxHeightPrevoted: 0,
						maxHeightGenerated: 0,
					},
					networkIdentifier,
				}),
			).rejects.toThrow('Request does not match last generated information.');
		});

		it('should reject if BFT properties specified specified does not match existing properties', async () => {
			const encodedInfo = codec.encode(previouslyGeneratedInfoSchema, {
				height: 50,
				maxHeightPrevoted: 40,
				maxHeightGenerated: 3,
			});
			const db = (new InMemoryKVStore() as unknown) as KVStore;
			const generatorStore = new GeneratorStore(db as never);
			const subStore = generatorStore.getGeneratorStore(GENERATOR_STORE_RESERVED_PREFIX);
			await subStore.set(config.address, encodedInfo);
			const batch = db.batch();
			subStore.finalize(batch);
			await batch.write();
			endpoint.init({
				generatorDB: db,
				logger,
			});
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: config.address.toString('hex'),
						enable: true,
						password: defaultPassword,
						overwrite: false,
						height: 100,
						maxHeightPrevoted: 40,
						maxHeightGenerated: 3,
					},
					networkIdentifier,
				}),
			).rejects.toThrow('Request does not match last generated information.');
		});

		it('should overwrite if BFT properties specified specified does not match existing properties and overwrite is true', async () => {
			const encodedInfo = codec.encode(previouslyGeneratedInfoSchema, {
				height: 50,
				maxHeightPrevoted: 40,
				maxHeightGenerated: 3,
			});
			const db = (new InMemoryKVStore() as unknown) as KVStore;
			const generatorStore = new GeneratorStore(db as never);
			const subStore = generatorStore.getGeneratorStore(GENERATOR_STORE_RESERVED_PREFIX);
			await subStore.set(config.address, encodedInfo);
			endpoint.init({
				generatorDB: db,
				logger,
			});
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: config.address.toString('hex'),
						enable: true,
						password: defaultPassword,
						overwrite: true,
						height: 100,
						maxHeightPrevoted: 40,
						maxHeightGenerated: 3,
					},
					networkIdentifier,
				}),
			).resolves.toEqual({
				address: config.address.toString('hex'),
				enabled: true,
			});
			const updatedGeneratorStore = new GeneratorStore(db);
			const updated = updatedGeneratorStore.getGeneratorStore(GENERATOR_STORE_RESERVED_PREFIX);
			const val = await updated.get(config.address);
			const decodedInfo = codec.decode(previouslyGeneratedInfoSchema, val);
			expect(decodedInfo).toEqual({
				height: 100,
				maxHeightPrevoted: 40,
				maxHeightGenerated: 3,
			});
		});
	});
});

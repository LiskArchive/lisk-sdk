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

import { codec } from '@liskhq/lisk-codec';
import { utils, ed, bls, encrypt, address } from '@liskhq/lisk-cryptography';
import { InMemoryDatabase, Database } from '@liskhq/lisk-db';
import { dataStructures } from '@liskhq/lisk-utils';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { Chain } from '@liskhq/lisk-chain';
import { when } from 'jest-when';
import { ABI, TransactionVerifyResult } from '../../../../src/abi';
import { Logger } from '../../../../src/logger';
import {
	GENERATOR_STORE_INFO_PREFIX,
	GENERATOR_STORE_KEY_PREFIX,
} from '../../../../src/engine/generator/constants';
import { PlainGeneratorKeyData, Consensus } from '../../../../src/engine/generator/types';
import { Endpoint } from '../../../../src/engine/generator/endpoint';
import {
	encryptedMessageSchema,
	generatorKeysSchema,
	plainGeneratorKeysSchema,
	previouslyGeneratedInfoSchema,
} from '../../../../src/engine/generator/schemas';
import { fakeLogger } from '../../../utils/mocks';

describe('generator endpoint', () => {
	const logger: Logger = fakeLogger;
	const defaultPassword = 'elephant tree paris dragon chair galaxy';
	const chainID = Buffer.alloc(0);
	const blockTime = 10;

	let defaultKeys: PlainGeneratorKeyData;
	let defaultEncryptedKeys: {
		address: Buffer;
		type: 'encrypted';
		data: encrypt.EncryptedMessageObject;
	};

	let endpoint: Endpoint;
	let consensus: Consensus;
	let abi: ABI;
	let chain: Chain;
	let db: Database;

	beforeEach(async () => {
		const generatorPrivateKey = await ed.getPrivateKeyFromPhraseAndPath(
			'passphrase',
			"m/25519'/134'/0'/0'",
		);
		const blsPrivateKey = await bls.getPrivateKeyFromPhraseAndPath('passphrase', 'm/12381/134/0/0');
		defaultKeys = {
			generatorKey: ed.getPublicKeyFromPrivateKey(generatorPrivateKey),
			generatorPrivateKey,
			blsPrivateKey,
			blsKey: bls.getPublicKeyFromPrivateKey(blsPrivateKey),
		};
		defaultEncryptedKeys = {
			address: Buffer.from('9cabee3d27426676b852ce6b804cb2fdff7cd0b5', 'hex'),
			type: 'encrypted',
			data: await encrypt.encryptAES256GCMWithPassword(
				codec.encode(plainGeneratorKeysSchema, defaultKeys),
				defaultPassword,
			),
		};

		consensus = {
			isSynced: jest.fn().mockResolvedValue(true),
			finalizedHeight: jest.fn().mockReturnValue(0),
		} as never;
		abi = {
			verifyTransaction: jest.fn().mockResolvedValue({ result: TransactionVerifyResult.OK }),
		} as never;
		chain = {
			dataAccess: {
				getBlockHeaderByHeight: jest.fn(),
			},
		} as never;

		endpoint = new Endpoint({
			abi,
			consensus,
			keypair: new dataStructures.BufferMap<PlainGeneratorKeyData>(),
			blockTime,
			chain,
		});
		db = new InMemoryDatabase() as never;
		endpoint.init({
			generatorDB: db,
		});
	});

	describe('updateStatus', () => {
		const bftProps = {
			height: 200,
			maxHeightPrevoted: 200,
			maxHeightGenerated: 10,
		};

		beforeEach(async () => {
			const encodedData = codec.encode(encryptedMessageSchema, defaultEncryptedKeys.data);
			await db.set(
				Buffer.concat([GENERATOR_STORE_KEY_PREFIX, defaultEncryptedKeys.address]),
				codec.encode(generatorKeysSchema, {
					type: defaultEncryptedKeys.type,
					data: encodedData,
				}),
			);
			await db.set(
				Buffer.concat([GENERATOR_STORE_INFO_PREFIX, defaultEncryptedKeys.address]),
				codec.encode(previouslyGeneratedInfoSchema, bftProps),
			);
		});

		it('should reject with error when request schema is invalid', async () => {
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						enable: true,
						password: defaultPassword,
						...bftProps,
					},
					chainID,
				}),
			).rejects.toThrow(LiskValidationError);
		});

		it('should reject with error when address is not in config', async () => {
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(utils.getRandomBytes(20)),
						enable: true,
						password: defaultPassword,
						...bftProps,
					},
					chainID,
				}),
			).rejects.toThrow('Generator with address:');
		});

		it('should return error with invalid password', async () => {
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						enable: true,
						password: 'wrong password',
						...bftProps,
					},
					chainID,
				}),
			).rejects.toThrow('Unsupported state or unable to authenticate data');
		});

		it('should return error if the engine is not synced', async () => {
			(consensus.isSynced as jest.Mock).mockReturnValue(false);
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						enable: true,
						password: defaultPassword,
						...bftProps,
					},
					chainID,
				}),
			).rejects.toThrow('Failed to enable forging as the node is not synced to the network.');
		});

		it('should delete the keypair if disabling', async () => {
			endpoint['_keypairs'].set(defaultEncryptedKeys.address, {
				generatorKey: Buffer.alloc(0),
				generatorPrivateKey: Buffer.alloc(0),
				blsKey: Buffer.alloc(0),
				blsPrivateKey: Buffer.alloc(0),
			});
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						enable: false,
						password: defaultPassword,
						...bftProps,
					},
					chainID,
				}),
			).resolves.toEqual({
				address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
				enabled: false,
			});
			expect(endpoint['_keypairs'].has(defaultEncryptedKeys.address)).toBeFalse();
		});

		it('should update the keypair and return enabled', async () => {
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						enable: true,
						password: defaultPassword,
						...bftProps,
					},
					chainID,
				}),
			).resolves.toEqual({
				address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
				enabled: true,
			});
			expect(endpoint['_keypairs'].has(defaultEncryptedKeys.address)).toBeTrue();
		});

		it('should accept if BFT properties specified are zero and there is no previous values', async () => {
			await db.del(Buffer.concat([GENERATOR_STORE_INFO_PREFIX, defaultEncryptedKeys.address]));
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						enable: true,
						password: defaultPassword,
						height: 0,
						maxHeightPrevoted: 0,
						maxHeightGenerated: 0,
					},
					chainID,
				}),
			).resolves.toEqual({
				address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
				enabled: true,
			});
		});

		it('should reject if BFT properties specified are non-zero and there is no previous values', async () => {
			await db.del(Buffer.concat([GENERATOR_STORE_INFO_PREFIX, defaultEncryptedKeys.address]));

			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						enable: true,
						password: defaultPassword,
						height: 100,
						maxHeightPrevoted: 40,
						maxHeightGenerated: 3,
					},
					chainID,
				}),
			).rejects.toThrow('Last generated information does not exist.');
		});

		it('should reject if BFT properties specified are zero and there is non zero previous values', async () => {
			const encodedInfo = codec.encode(previouslyGeneratedInfoSchema, {
				height: 100,
				maxHeightPrevoted: 40,
				maxHeightGenerated: 3,
			});
			await db.set(
				Buffer.concat([GENERATOR_STORE_INFO_PREFIX, defaultEncryptedKeys.address]),
				encodedInfo,
			);

			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						enable: true,
						password: defaultPassword,
						height: 0,
						maxHeightPrevoted: 0,
						maxHeightGenerated: 0,
					},
					chainID,
				}),
			).rejects.toThrow('Request does not match last generated information.');
		});

		it('should reject if BFT properties specified specified does not match existing properties', async () => {
			const encodedInfo = codec.encode(previouslyGeneratedInfoSchema, {
				height: 50,
				maxHeightPrevoted: 40,
				maxHeightGenerated: 3,
			});
			await db.set(
				Buffer.concat([GENERATOR_STORE_INFO_PREFIX, defaultEncryptedKeys.address]),
				encodedInfo,
			);
			await expect(
				endpoint.updateStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						enable: true,
						password: defaultPassword,
						height: 100,
						maxHeightPrevoted: 40,
						maxHeightGenerated: 3,
					},
					chainID,
				}),
			).rejects.toThrow('Request does not match last generated information.');
		});
	});

	describe('setStatus', () => {
		beforeEach(async () => {
			const encodedData = codec.encode(encryptedMessageSchema, defaultEncryptedKeys.data);
			await db.set(
				Buffer.concat([GENERATOR_STORE_KEY_PREFIX, defaultEncryptedKeys.address]),
				codec.encode(generatorKeysSchema, {
					type: defaultEncryptedKeys.type,
					data: encodedData,
				}),
			);
		});

		it('should reject with error if the input is invalid', async () => {
			await expect(
				endpoint.setStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						height: -1,
						maxHeightPrevoted: 40,
						maxHeightGenerated: 3,
					},
					chainID,
				}),
			).rejects.toThrow('Lisk validator found 1 error');
		});

		it('should resolve and store the given input when input is valid', async () => {
			await expect(
				endpoint.setStatus({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						height: 33,
						maxHeightPrevoted: 40,
						maxHeightGenerated: 3,
					},
					chainID,
				}),
			).resolves.toBeUndefined();
			await expect(
				db.has(Buffer.concat([GENERATOR_STORE_INFO_PREFIX, defaultEncryptedKeys.address])),
			).resolves.toBeTrue();
		});
	});

	describe('getStatus', () => {
		beforeEach(async () => {
			const encodedInfo = codec.encode(previouslyGeneratedInfoSchema, {
				height: 50,
				maxHeightPrevoted: 40,
				maxHeightGenerated: 3,
			});
			await db.set(
				Buffer.concat([GENERATOR_STORE_INFO_PREFIX, defaultEncryptedKeys.address]),
				encodedInfo,
			);
			const randomEncodedInfo = codec.encode(previouslyGeneratedInfoSchema, {
				height: 50,
				maxHeightPrevoted: 44,
				maxHeightGenerated: 3,
			});
			await db.set(
				Buffer.concat([GENERATOR_STORE_INFO_PREFIX, utils.getRandomBytes(20)]),
				randomEncodedInfo,
			);
		});

		it('should resolve all the status', async () => {
			const resp = await endpoint.getStatus({
				logger,
				params: {},
				chainID,
			});
			expect(resp.status).toHaveLength(2);
			expect(resp.status[0].address).not.toBeInstanceOf(Buffer);
		});
	});

	describe('estimateSafeStatus', () => {
		const finalizedBlock = {
			height: 300000,
			timestamp: 1659679220,
		};
		const blockPerMonth = (60 * 60 * 24 * 30) / blockTime;

		beforeEach(() => {
			jest.spyOn(consensus, 'finalizedHeight').mockReturnValue(finalizedBlock.height);
		});

		it('should reject when timeshutDown is not provided', async () => {
			await expect(
				endpoint.estimateSafeStatus({
					logger,
					params: {},
					chainID,
				}),
			).rejects.toThrow('Lisk validator found');
		});

		it('should fail if the timeShutdown is not finalized', async () => {
			when(chain.dataAccess.getBlockHeaderByHeight as jest.Mock)
				.calledWith(finalizedBlock.height)
				.mockResolvedValue(finalizedBlock);
			const now = Math.floor(Date.now() / 1000);
			await expect(
				endpoint.estimateSafeStatus({
					logger,
					params: {
						timeShutdown: now,
					},
					chainID,
				}),
			).rejects.toThrow(`A block at the time shutdown ${now} must be finalized.`);
		});

		it('should resolve the finalized height when there is no missed block in past month', async () => {
			when(chain.dataAccess.getBlockHeaderByHeight as jest.Mock)
				.calledWith(finalizedBlock.height)
				.mockResolvedValue(finalizedBlock)
				.calledWith(finalizedBlock.height - blockPerMonth)
				.mockResolvedValue({
					height: finalizedBlock.height - blockPerMonth,
					timestamp: finalizedBlock.timestamp - blockTime * blockPerMonth,
				});

			await expect(
				endpoint.estimateSafeStatus({
					logger,
					params: {
						timeShutdown: finalizedBlock.timestamp - 100000,
					},
					chainID,
				}),
			).resolves.toEqual({
				height: finalizedBlock.height,
				maxHeightGenerated: finalizedBlock.height,
				maxHeightPrevoted: finalizedBlock.height,
			});
		});

		it('should resolve the finalized height + missed block when there is missed block in past month', async () => {
			const missedBlocks = 50;
			when(chain.dataAccess.getBlockHeaderByHeight as jest.Mock)
				.calledWith(finalizedBlock.height)
				.mockResolvedValue(finalizedBlock)
				.calledWith(finalizedBlock.height - blockPerMonth)
				// missed 50 blocks
				.mockResolvedValue({
					height: finalizedBlock.height - blockPerMonth,
					timestamp:
						finalizedBlock.timestamp - blockTime * blockPerMonth - blockTime * missedBlocks,
				});

			await expect(
				endpoint.estimateSafeStatus({
					logger,
					params: {
						timeShutdown: finalizedBlock.timestamp - 100000,
					},
					chainID,
				}),
			).resolves.toEqual({
				height: finalizedBlock.height + missedBlocks,
				maxHeightGenerated: finalizedBlock.height + missedBlocks,
				maxHeightPrevoted: finalizedBlock.height + missedBlocks,
			});
		});
	});

	describe('setKeys', () => {
		it('should reject if input is invalid', async () => {
			await expect(
				endpoint.setKeys({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						type: 'plain',
						data: {
							version: '1',
							ciphertext:
								'bd65587de1b7b42e289693e8ac14561c7c77370ff158133c6eb512849353446b339f04c8f45b6b8cc72e5e8485dab4031d9f5e2d7cb9d424076401ea58dad6d4a348fc1f013ceb5d8bb314',
							mac: '6e017e6b2a341db10b91440462fc2626fe6e4b711ea09f8df3ac1df42a6de572',
							kdf: 'argon2id',
							kdfparams: {
								parallelism: 4,
								iterations: 1,
								memorySize: 2024,
								salt: 'e9f564ce7f8392acb2691fb4953e17c0',
							},
							cipher: 'aes-256-gcm',
							cipherparams: {},
						},
					},
					chainID,
				}),
			).rejects.toThrow('Lisk validator found');
		});

		it('should resolve and save input value', async () => {
			const val = {
				version: '1',
				ciphertext:
					'bd65587de1b7b42e289693e8ac14561c7c77370ff158133c6eb512849353446b339f04c8f45b6b8cc72e5e8485dab4031d9f5e2d7cb9d424076401ea58dad6d4a348fc1f013ceb5d8bb314',
				mac: '6e017e6b2a341db10b91440462fc2626fe6e4b711ea09f8df3ac1df42a6de572',
				kdf: 'argon2id',
				kdfparams: {
					parallelism: 4,
					iterations: 1,
					memorySize: 2024,
					salt: 'e9f564ce7f8392acb2691fb4953e17c0',
				},
				cipher: 'aes-256-gcm',
				cipherparams: {
					iv: '57124bb910dbf9e24e37d401',
					tag: 'b769dcbd4ad0d3f44041afe5322aad82',
				},
			};
			await expect(
				endpoint.setKeys({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
						type: 'encrypted',
						data: val,
					},
					chainID,
				}),
			).resolves.toBeUndefined();
			await expect(
				db.has(Buffer.concat([GENERATOR_STORE_KEY_PREFIX, defaultEncryptedKeys.address])),
			).resolves.toBeTrue();
		});
	});

	describe('getAllKeys', () => {
		beforeEach(async () => {
			await endpoint.setKeys({
				logger,
				params: {
					address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
					type: 'encrypted',
					data: {
						version: '1',
						ciphertext:
							'bd65587de1b7b42e289693e8ac14561c7c77370ff158133c6eb512849353446b339f04c8f45b6b8cc72e5e8485dab4031d9f5e2d7cb9d424076401ea58dad6d4a348fc1f013ceb5d8bb314',
						mac: '6e017e6b2a341db10b91440462fc2626fe6e4b711ea09f8df3ac1df42a6de572',
						kdf: 'argon2id',
						kdfparams: {
							parallelism: 4,
							iterations: 1,
							memorySize: 2024,
							salt: 'e9f564ce7f8392acb2691fb4953e17c0',
						},
						cipher: 'aes-256-gcm',
						cipherparams: {
							iv: '57124bb910dbf9e24e37d401',
							tag: 'b769dcbd4ad0d3f44041afe5322aad82',
						},
					},
				},
				chainID,
			});
			await endpoint.setKeys({
				logger,
				params: {
					address: address.getLisk32AddressFromAddress(utils.getRandomBytes(20)),
					type: 'plain',
					data: {
						generatorKey: defaultKeys.generatorKey.toString('hex'),
						generatorPrivateKey: defaultKeys.generatorPrivateKey.toString('hex'),
						blsPrivateKey: defaultKeys.blsPrivateKey.toString('hex'),
						blsKey: defaultKeys.blsKey.toString('hex'),
					},
				},
				chainID,
			});
		});

		it('should resolve all keys registered', async () => {
			const result = await endpoint.getAllKeys({
				logger,
				params: {},
				chainID,
			});
			expect(result.keys).toHaveLength(2);
		});
	});

	describe('hasKeys', () => {
		beforeEach(async () => {
			await endpoint.setKeys({
				logger,
				params: {
					address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
					type: 'encrypted',
					data: {
						version: '1',
						ciphertext:
							'bd65587de1b7b42e289693e8ac14561c7c77370ff158133c6eb512849353446b339f04c8f45b6b8cc72e5e8485dab4031d9f5e2d7cb9d424076401ea58dad6d4a348fc1f013ceb5d8bb314',
						mac: '6e017e6b2a341db10b91440462fc2626fe6e4b711ea09f8df3ac1df42a6de572',
						kdf: 'argon2id',
						kdfparams: {
							parallelism: 4,
							iterations: 1,
							memorySize: 2024,
							salt: 'e9f564ce7f8392acb2691fb4953e17c0',
						},
						cipher: 'aes-256-gcm',
						cipherparams: {
							iv: '57124bb910dbf9e24e37d401',
							tag: 'b769dcbd4ad0d3f44041afe5322aad82',
						},
					},
				},
				chainID,
			});
		});

		it('should fail if address does not exist in input', async () => {
			await expect(
				endpoint.hasKeys({
					logger,
					params: {},
					chainID,
				}),
			).rejects.toThrow('Lisk validator found 1 error');
		});

		it('should resolve true if key exist', async () => {
			await expect(
				endpoint.hasKeys({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(defaultEncryptedKeys.address),
					},
					chainID,
				}),
			).resolves.toEqual({ hasKey: true });
		});

		it('should resolve false if key does not exist', async () => {
			await expect(
				endpoint.hasKeys({
					logger,
					params: {
						address: address.getLisk32AddressFromAddress(utils.getRandomBytes(20)),
					},
					chainID,
				}),
			).resolves.toEqual({ hasKey: false });
		});
	});
});

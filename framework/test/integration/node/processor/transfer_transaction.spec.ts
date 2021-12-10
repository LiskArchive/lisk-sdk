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
 *
 */

import { codec } from '@liskhq/lisk-codec';
import { DataAccess, Transaction } from '@liskhq/lisk-chain';
import {
	getAddressAndPublicKeyFromPassphrase,
	getRandomBytes,
	signData,
} from '@liskhq/lisk-cryptography';
import { genesis, DefaultAccountProps } from '../../../fixtures';
import { nodeUtils } from '../../../utils';
import { TransferAsset } from '../../../../src/modules/token/transfer_asset';
import { Processor } from '../../../../src/node/processor';
import * as testing from '../../../../src/testing';

describe('when processing a block with transfer transaction', () => {
	let processEnv: testing.BlockProcessingEnv;
	let processor: Processor;
	let networkIdentifier: Buffer;
	let dataAccess: DataAccess;
	const databasePath = '/tmp/lisk/transfer/test';
	const transferFixHeight = 10;
	const account = nodeUtils.createAccount();

	describe('when current height is before fix height', () => {
		beforeAll(async () => {
			processEnv = await testing.getBlockProcessingEnv({
				options: {
					databasePath,
				},
			});
			networkIdentifier = processEnv.getNetworkId();
			dataAccess = processEnv.getDataAccess();
			processor = processEnv.getProcessor();
			(processor as any)['_modules'][0]['transactionAssets'][0][
				'_transferFixHeight'
			] = transferFixHeight;
		});

		afterAll(async () => {
			await processEnv.cleanup({ databasePath });
		});

		describe('when transfer transaction has no recipientAddress', () => {
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
					amount: BigInt('10000000'),
					data: '',
				});
				const { publicKey } = getAddressAndPublicKeyFromPassphrase(genesis.passphrase);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: genesisAccount.sequence.nonce,
					senderPublicKey: publicKey,
					fee: BigInt('20000000'),
					asset: encodedAsset,
					signatures: [],
				});
				(transaction.signatures as Buffer[]).push(
					signData(
						Buffer.concat([networkIdentifier, transaction.getSigningBytes()]),
						genesis.passphrase,
					),
				);
			});

			it('should process the block', async () => {
				const invalidBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(invalidBlock)).resolves.toBeUndefined();
			});
		});

		describe('when transfer transaction has invalid recipientAddress length', () => {
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
					amount: BigInt('10000000'),
					recipientAddress: getRandomBytes(80),
					data: '',
				});
				const { publicKey } = getAddressAndPublicKeyFromPassphrase(genesis.passphrase);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: genesisAccount.sequence.nonce,
					senderPublicKey: publicKey,
					fee: BigInt('20000000'),
					asset: encodedAsset,
					signatures: [],
				});
				(transaction.signatures as Buffer[]).push(
					signData(
						Buffer.concat([networkIdentifier, transaction.getSigningBytes()]),
						genesis.passphrase,
					),
				);
			});

			it('should process the block', async () => {
				const invalidBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(invalidBlock)).resolves.toBeUndefined();
			});
		});

		describe('when transfer transaction has invalid data string length', () => {
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
					amount: BigInt('10000000'),
					data: new Array(100).join(),
					recipientAddress: account.address,
				});
				const { publicKey } = getAddressAndPublicKeyFromPassphrase(genesis.passphrase);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: genesisAccount.sequence.nonce,
					senderPublicKey: publicKey,
					fee: BigInt('20000000'),
					asset: encodedAsset,
					signatures: [],
				});
				(transaction.signatures as Buffer[]).push(
					signData(
						Buffer.concat([networkIdentifier, transaction.getSigningBytes()]),
						genesis.passphrase,
					),
				);
			});

			it('should process the block', async () => {
				const invalidBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(invalidBlock)).resolves.toBeUndefined();
			});
		});

		describe('when transfer transaction has data with bytes', () => {
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
					amount: BigInt('10000000'),
					data: getRandomBytes(2),
					recipientAddress: account.address,
				});
				const { publicKey } = getAddressAndPublicKeyFromPassphrase(genesis.passphrase);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: genesisAccount.sequence.nonce,
					senderPublicKey: publicKey,
					fee: BigInt('20000000'),
					asset: encodedAsset,
					signatures: [],
				});
				(transaction.signatures as Buffer[]).push(
					signData(
						Buffer.concat([networkIdentifier, transaction.getSigningBytes()]),
						genesis.passphrase,
					),
				);
			});

			it('should process the block', async () => {
				const validBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(validBlock)).resolves.toBeUndefined();
			});
		});

		describe('when transfer transaction has no data', () => {
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
					amount: BigInt('10000000'),
					recipientAddress: account.address,
				});
				const { publicKey } = getAddressAndPublicKeyFromPassphrase(genesis.passphrase);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: genesisAccount.sequence.nonce,
					senderPublicKey: publicKey,
					fee: BigInt('20000000'),
					asset: encodedAsset,
					signatures: [],
				});
				(transaction.signatures as Buffer[]).push(
					signData(
						Buffer.concat([networkIdentifier, transaction.getSigningBytes()]),
						genesis.passphrase,
					),
				);
			});

			it('should process the block', async () => {
				const validBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(validBlock)).resolves.toBeUndefined();
			});
		});
	});

	describe('when current height is after fix height', () => {
		beforeAll(async () => {
			processEnv = await testing.getBlockProcessingEnv({
				options: {
					databasePath,
				},
			});
			networkIdentifier = processEnv.getNetworkId();
			dataAccess = processEnv.getDataAccess();
		});

		afterAll(async () => {
			await processEnv.cleanup({ databasePath });
		});

		describe('when transfer transaction has no recipientAddress', () => {
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
					amount: BigInt('10000000'),
					data: '',
				});
				const { publicKey } = getAddressAndPublicKeyFromPassphrase(genesis.passphrase);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: genesisAccount.sequence.nonce,
					senderPublicKey: publicKey,
					fee: BigInt('20000000'),
					asset: encodedAsset,
					signatures: [],
				});
				(transaction.signatures as Buffer[]).push(
					signData(
						Buffer.concat([networkIdentifier, transaction.getSigningBytes()]),
						genesis.passphrase,
					),
				);
			});

			it('should fail to process the block', async () => {
				const invalidBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(invalidBlock)).rejects.toThrow(
					'Invalid recipient address length.',
				);
			});
		});

		describe('when transfer transaction has invalid recipientAddress length', () => {
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
					amount: BigInt('10000000'),
					recipientAddress: getRandomBytes(80),
					data: '',
				});
				const { publicKey } = getAddressAndPublicKeyFromPassphrase(genesis.passphrase);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: genesisAccount.sequence.nonce,
					senderPublicKey: publicKey,
					fee: BigInt('20000000'),
					asset: encodedAsset,
					signatures: [],
				});
				(transaction.signatures as Buffer[]).push(
					signData(
						Buffer.concat([networkIdentifier, transaction.getSigningBytes()]),
						genesis.passphrase,
					),
				);
			});

			it('should fail to process the block', async () => {
				const invalidBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(invalidBlock)).rejects.toThrow(
					'Invalid recipient address length.',
				);
			});
		});

		describe('when transfer transaction has invalid data string length', () => {
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
					amount: BigInt('10000000'),
					data: new Array(100).join(),
					recipientAddress: account.address,
				});
				const { publicKey } = getAddressAndPublicKeyFromPassphrase(genesis.passphrase);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: genesisAccount.sequence.nonce,
					senderPublicKey: publicKey,
					fee: BigInt('20000000'),
					asset: encodedAsset,
					signatures: [],
				});
				(transaction.signatures as Buffer[]).push(
					signData(
						Buffer.concat([networkIdentifier, transaction.getSigningBytes()]),
						genesis.passphrase,
					),
				);
			});

			it('should fail to process the block', async () => {
				const invalidBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(invalidBlock)).rejects.toThrow('Invalid data length.');
			});
		});

		describe('when transfer transaction has data with bytes', () => {
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
					amount: BigInt('10000000'),
					data: getRandomBytes(2),
					recipientAddress: account.address,
				});
				const { publicKey } = getAddressAndPublicKeyFromPassphrase(genesis.passphrase);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: genesisAccount.sequence.nonce,
					senderPublicKey: publicKey,
					fee: BigInt('20000000'),
					asset: encodedAsset,
					signatures: [],
				});
				(transaction.signatures as Buffer[]).push(
					signData(
						Buffer.concat([networkIdentifier, transaction.getSigningBytes()]),
						genesis.passphrase,
					),
				);
			});

			it('should process the block', async () => {
				const validBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(validBlock)).resolves.toBeUndefined();
			});
		});

		describe('when transfer transaction has no data', () => {
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				const encodedAsset = codec.encode(new TransferAsset(BigInt(5000000)).schema, {
					amount: BigInt('10000000'),
					recipientAddress: account.address,
				});
				const { publicKey } = getAddressAndPublicKeyFromPassphrase(genesis.passphrase);

				transaction = new Transaction({
					moduleID: 2,
					assetID: 0,
					nonce: genesisAccount.sequence.nonce,
					senderPublicKey: publicKey,
					fee: BigInt('20000000'),
					asset: encodedAsset,
					signatures: [],
				});
				(transaction.signatures as Buffer[]).push(
					signData(
						Buffer.concat([networkIdentifier, transaction.getSigningBytes()]),
						genesis.passphrase,
					),
				);
			});

			it('should process the block', async () => {
				const validBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(validBlock)).resolves.toBeUndefined();
			});
		});
	});
});

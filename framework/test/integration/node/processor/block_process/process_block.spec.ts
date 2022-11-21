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

import { Block, Chain, DataAccess, Transaction } from '@liskhq/lisk-chain';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { address } from '@liskhq/lisk-cryptography';
import { nodeUtils } from '../../../../utils';
import * as testing from '../../../../../src/testing';
import {
	createDelegateRegisterTransaction,
	createDelegateVoteTransaction,
	createTransferTransaction,
	defaultTokenID,
} from '../../../../utils/mocks/transaction';
import { getGeneratorPrivateKeyFromDefaultConfig } from '../../../../../src/testing/fixtures';

describe('Process block', () => {
	let processEnv: testing.BlockProcessingEnv;
	let chainID: Buffer;
	let dataAccess: DataAccess;
	let chain: Chain;
	const databasePath = '/tmp/lisk/protocol_violation/test';
	const account = nodeUtils.createAccount();
	const genesis = testing.fixtures.defaultFaucetAccount;

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
		chainID = processEnv.getNetworkId();
		dataAccess = processEnv.getDataAccess();
		chain = processEnv.getChain();
	});

	afterAll(() => {
		processEnv.cleanup({ databasePath });
	});

	describe('given an account has a balance', () => {
		describe('when processing a block with valid transactions', () => {
			const originalBalance = BigInt(100000) * BigInt(10 ** 8);
			const amount = BigInt('100000000000');
			let newBlock: Block;
			let transaction: Transaction;

			beforeAll(async () => {
				const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address,
				});
				transaction = createTransferTransaction({
					nonce: BigInt(authData.nonce),
					recipientAddress: account.address,
					amount,
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});
				newBlock = await processEnv.createBlock([transaction]);
				await processEnv.process(newBlock);
			});

			it('should save account state changes from the transaction', async () => {
				const balance = await processEnv.invoke<{ availableBalance: string }>('token_getBalance', {
					address: genesis.address,
					tokenID: defaultTokenID(processEnv.getNetworkId()).toString('hex'),
				});
				const expected = originalBalance - transaction.fee - amount - BigInt(5000000);
				expect(balance.availableBalance).toEqual(expected.toString());
			});

			it('should save the block to the database', async () => {
				const processedBlock = await dataAccess.getBlockByID(newBlock.header.id);
				expect(processedBlock.header.id).toEqual(newBlock.header.id);
			});

			it('should save the transactions to the database', async () => {
				const [processedTx] = await dataAccess.getTransactionsByIDs([transaction.id]);
				expect(processedTx.id).toEqual(transaction.id);
			});

			it('should save the events to the database', async () => {
				const events = await dataAccess.getEvents(newBlock.header.height);
				expect(events.length).toBeGreaterThanOrEqual(1);
			});
		});
	});

	describe('given a valid block with empty transaction', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await processEnv.createBlock();
				await processEnv.process(newBlock);
			});

			it('should add the block to the chain', async () => {
				const processedBlock = await dataAccess.getBlockByID(newBlock.header.id);
				expect(processedBlock.header.id).toEqual(newBlock.header.id);
			});

			it('should save the events to the database', async () => {
				await expect(dataAccess.getEvents(newBlock.header.height)).resolves.not.toBeEmpty();
			});
		});
	});

	describe('given a block with existing transactions', () => {
		describe('when processing the block', () => {
			let newBlock: Block;
			let transaction: Transaction;

			beforeAll(async () => {
				const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address,
				});
				transaction = createTransferTransaction({
					nonce: BigInt(authData.nonce),
					recipientAddress: account.address,
					amount: BigInt('1000000000'),
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});
				newBlock = await processEnv.createBlock([transaction]);
				await processEnv.process(newBlock);
			});

			it('should fail to process the block', async () => {
				const invalidBlock = await processEnv.createBlock();
				(invalidBlock as any).transactions = [transaction];
				invalidBlock.header.transactionRoot = regularMerkleTree.calculateMerkleRootWithLeaves([
					transaction.id,
				]);
				const generatorPrivateKey = getGeneratorPrivateKeyFromDefaultConfig(
					invalidBlock.header.generatorAddress,
				);
				invalidBlock.header.sign(processEnv.getNetworkId(), generatorPrivateKey);
				await expect(processEnv.process(invalidBlock)).rejects.toThrow(
					'Failed to verify transaction',
				);
			});
		});
	});

	describe('given a block generated by invalid validator', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await processEnv.createBlock();
				(newBlock.header as any).generatorAddress = account.address;
			});

			it('should discard the block', async () => {
				await expect(processEnv.process(newBlock)).rejects.toThrow(
					expect.objectContaining({
						message: expect.stringContaining(' ineligible to generate block for the current slot'),
					}),
				);
			});
		});
	});

	describe('given a block which is already processed', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await processEnv.createBlock();
				await processEnv.process(newBlock);
			});

			it('should discard the block', async () => {
				await expect(processEnv.process(newBlock)).resolves.toBeUndefined();
			});
		});
	});

	describe('given a block which is not continuous to the current chain', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await processEnv.createBlock();
				(newBlock.header as any).height = 99;
				const generatorPrivateKey = getGeneratorPrivateKeyFromDefaultConfig(
					newBlock.header.generatorAddress,
				);
				newBlock.header.sign(processEnv.getNetworkId(), generatorPrivateKey);
			});

			it('should discard the block', async () => {
				await expect(processEnv.process(newBlock)).toReject();
				await expect(dataAccess.isBlockPersisted(newBlock.header.id)).resolves.toBeFalse();
			});
		});
	});

	describe('given an account is already a validator', () => {
		let newBlock: Block;
		let transaction: Transaction;

		beforeAll(async () => {
			const targetAuthData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
				address: address.getLisk32AddressFromAddress(account.address),
			});
			transaction = createDelegateRegisterTransaction({
				nonce: BigInt(targetAuthData.nonce),
				fee: BigInt('3000000000'),
				username: 'number1',
				chainID,
				blsKey: account.blsPublicKey,
				generatorKey: account.publicKey,
				blsProofOfPossession: account.blsPoP,
				privateKey: account.privateKey,
			});
			newBlock = await processEnv.createBlock([transaction]);
			await processEnv.process(newBlock);
		});

		describe('when processing a block with a transaction which has stakes for the validator', () => {
			it('should update the sender balance and the stake of the sender', async () => {
				// Arrange
				const senderAuthData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: address.getLisk32AddressFromAddress(account.address),
				});
				const senderBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: address.getLisk32AddressFromAddress(account.address),
						tokenID: defaultTokenID(processEnv.getNetworkId()).toString('hex'),
					},
				);
				const voteAmount = BigInt('1000000000');
				const voteTransaction = createDelegateVoteTransaction({
					nonce: BigInt(senderAuthData.nonce),
					chainID,
					privateKey: account.privateKey,
					stakes: [
						{
							validatorAddress: account.address,
							amount: voteAmount,
						},
					],
				});
				const block = await processEnv.createBlock([voteTransaction]);

				// Act
				await processEnv.process(block);

				// Assess
				const balance = await processEnv.invoke<{ availableBalance: string }>('token_getBalance', {
					address: address.getLisk32AddressFromAddress(account.address),
					tokenID: defaultTokenID(processEnv.getNetworkId()).toString('hex'),
				});
				const stakes = await processEnv.invoke<{ sentStakes: Record<string, unknown>[] }>(
					'pos_getStaker',
					{ address: address.getLisk32AddressFromAddress(account.address) },
				);
				expect(stakes.sentStakes).toHaveLength(1);
				expect(balance.availableBalance).toEqual(
					(BigInt(senderBalance.availableBalance) - voteAmount - voteTransaction.fee).toString(),
				);
			});
		});

		describe('when processing a block with a transaction which has validator registration from the same account', () => {
			let invalidBlock: Block;
			let invalidTx: Transaction;

			beforeAll(async () => {
				const senderAuthData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: address.getLisk32AddressFromAddress(account.address),
				});
				invalidTx = createDelegateRegisterTransaction({
					nonce: BigInt(senderAuthData.nonce),
					fee: BigInt('5000000000'),
					username: 'number1',
					chainID,
					privateKey: account.privateKey,
					blsKey: account.blsPublicKey,
					generatorKey: account.publicKey,
					blsProofOfPossession: account.blsPoP,
				});
				invalidBlock = await processEnv.createBlock();
				(invalidBlock as any).transactions = [transaction];
				invalidBlock.header.transactionRoot = regularMerkleTree.calculateMerkleRootWithLeaves([
					transaction.id,
				]);
				const generatorPrivateKey = getGeneratorPrivateKeyFromDefaultConfig(
					newBlock.header.generatorAddress,
				);
				invalidBlock.header.sign(processEnv.getNetworkId(), generatorPrivateKey);
				try {
					await processEnv.process(invalidBlock);
				} catch (err) {
					// expected error
				}
			});

			it('should have the same account state as before', async () => {
				const validator = await processEnv.invoke<{ name: string }>('pos_getValidator', {
					address: address.getLisk32AddressFromAddress(account.address),
				});
				expect(validator.name).toEqual('number1');
			});

			it('should not save the block to the database', async () => {
				await expect(dataAccess.isBlockPersisted(invalidBlock.header.id)).resolves.toBeFalse();
			});

			it('should not save the transaction to the database', async () => {
				await expect(dataAccess.isTransactionPersisted(invalidTx.id)).resolves.toBeFalse();
			});
		});
	});

	describe('given a block with invalid properties', () => {
		describe('when block has tie break BFT properties', () => {
			it('should replace the last block', async () => {
				const originalBlock = await processEnv.createBlock();
				const tieBreakBlock = await processEnv.createBlock([], originalBlock.header.timestamp + 10);
				await processEnv.process(originalBlock);
				(chain.lastBlock.header as any).receivedAt = originalBlock.header.timestamp + 20;
				// mutate the last block so that the last block was not received in the timeslot
				jest
					.spyOn(global.Date, 'now')
					.mockImplementationOnce(() => tieBreakBlock.header.timestamp * 1000);
				await processEnv.process(tieBreakBlock);

				expect(chain.lastBlock.header.id).toEqual(tieBreakBlock.header.id);
			});
		});
	});
});

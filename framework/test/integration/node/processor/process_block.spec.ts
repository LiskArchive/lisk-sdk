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

import { convertLSKToBeddows } from '@liskhq/lisk-transactions';
import { Block, Account, Transaction } from '@liskhq/lisk-chain';
import { KVStore } from '@liskhq/lisk-db';
import {
	getRandomBytes,
	signDataWithPrivateKey,
	getAddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import { nodeUtils } from '../../../utils';
import { createDB, removeDB } from '../../../utils/kv_store';
import { genesis, DefaultAccountProps } from '../../../fixtures';
import { Node } from '../../../../src/node';
import {
	createDelegateRegisterTransaction,
	createDelegateVoteTransaction,
	createTransferTransaction,
} from '../../../utils/node/transaction';

describe('Process block', () => {
	const dbName = 'process_block';
	const account = nodeUtils.createAccount();
	let node: Node;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
		// Since node start the forging so we have to stop the job
		// Our test make use of manual forging of blocks
		node['_forgingJob'].stop();
	});

	afterAll(async () => {
		await forgerDB.clear();
		await node.cleanup();
		await blockchainDB.close();
		await forgerDB.close();
		removeDB(dbName);
	});

	describe('given an account has a balance', () => {
		describe('when processing a block with valid transactions', () => {
			let newBlock: Block;
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress<DefaultAccountProps>(genesis.address);
				transaction = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					recipientAddress: account.address,
					amount: BigInt('100000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [transaction]);
				await node['_processor'].process(newBlock);
			});

			it('should save account state changes from the transaction', async () => {
				const recipient = await node['_chain'].dataAccess.getAccountByAddress<DefaultAccountProps>(
					account.address,
				);
				expect(recipient.token.balance.toString()).toEqual(convertLSKToBeddows('1000'));
			});

			it('should save the block to the database', async () => {
				const processedBlock = await node['_chain'].dataAccess.getBlockByID(newBlock.header.id);
				expect(processedBlock.header.id).toEqual(newBlock.header.id);
			});

			it('should save the transactions to the database', async () => {
				const [processedTx] = await node['_chain'].dataAccess.getTransactionsByIDs([
					transaction.id,
				]);
				expect(processedTx.id).toEqual(transaction.id);
			});
		});
	});

	describe('given a valid block with empty transaction', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node);
				await node['_processor'].process(newBlock);
			});

			it('should add the block to the chain', async () => {
				const processedBlock = await node['_chain'].dataAccess.getBlockByID(newBlock.header.id);
				expect(processedBlock.header.id).toEqual(newBlock.header.id);
			});
		});
	});

	describe('given a block with existing transactions', () => {
		describe('when processing the block', () => {
			let newBlock: Block;
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await node[
					'_chain'
				].dataAccess.getAccountByAddress<DefaultAccountProps>(genesis.address);
				transaction = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					recipientAddress: account.address,
					amount: BigInt('100000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [transaction]);
				await node['_processor'].process(newBlock);
			});

			it('should fail to process the block', async () => {
				const invalidBlock = await nodeUtils.createBlock(node, [transaction]);
				await expect(node['_processor'].process(invalidBlock)).rejects.toThrow(
					expect.objectContaining({
						message: expect.stringContaining('nonce is lower than account nonce'),
					}),
				);
			});
		});
	});

	describe('given a block forged by invalid delegate', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node, [], {
					keypair: {
						publicKey: account.publicKey,
						privateKey: account.privateKey,
					},
				});
				(newBlock.header as any).generatorPublicKey = account.publicKey;
			});

			it('should discard the block', async () => {
				await expect(node['_processor'].process(newBlock)).rejects.toThrow(
					expect.objectContaining({
						message: expect.stringContaining('Failed to verify generator'),
					}),
				);
			});
		});
	});

	describe('given a block which is already processed', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node);
				await node['_processor'].process(newBlock);
			});

			it('should discard the block', async () => {
				await expect(node['_processor'].process(newBlock)).resolves.toBeUndefined();
			});
		});
	});

	describe('given a block which is not continuous to the current chain', () => {
		describe('when processing the block', () => {
			let newBlock: Block;

			beforeAll(async () => {
				newBlock = await nodeUtils.createBlock(node, [], {
					lastBlock: {
						header: {
							timestamp: Math.floor(new Date().getTime() / 1000),
							height: 99,
						},
					} as Block,
				});
			});

			it('should discard the block', async () => {
				await expect(node['_processor'].process(newBlock)).resolves.toBeUndefined();
				await expect(
					node['_chain'].dataAccess.isBlockPersisted(newBlock.header.id),
				).resolves.toBeFalse();
			});
		});
	});

	describe('given an account is already a delegate', () => {
		let newBlock: Block;
		let transaction: Transaction;

		beforeAll(async () => {
			const targetAccount = await node[
				'_chain'
			].dataAccess.getAccountByAddress<DefaultAccountProps>(account.address);
			transaction = createDelegateRegisterTransaction({
				nonce: targetAccount.sequence.nonce,
				fee: BigInt('3000000000'),
				username: 'number1',
				networkIdentifier: node['_networkIdentifier'],
				passphrase: account.passphrase,
			});
			newBlock = await nodeUtils.createBlock(node, [transaction]);
			await node['_processor'].process(newBlock);
		});

		describe('when processing a block with a transaction which has votes for the delegate', () => {
			it('should update the sender balance and the vote of the sender', async () => {
				// Arrange
				const sender = await node['_chain'].dataAccess.getAccountByAddress<DefaultAccountProps>(
					account.address,
				);
				const voteAmount = BigInt('1000000000');
				const voteTransaction = createDelegateVoteTransaction({
					nonce: sender.sequence.nonce,
					networkIdentifier: node['_networkIdentifier'],
					passphrase: account.passphrase,
					votes: [
						{
							delegateAddress: account.address,
							amount: voteAmount,
						},
					],
				});
				const block = await nodeUtils.createBlock(node, [voteTransaction]);

				// Act
				await node['_processor'].process(block);

				// Assess
				const updatedSender = await node[
					'_chain'
				].dataAccess.getAccountByAddress<DefaultAccountProps>(account.address);
				expect(updatedSender.dpos.sentVotes).toHaveLength(1);
				expect(updatedSender.token.balance).toEqual(
					sender.token.balance - voteAmount - voteTransaction.fee,
				);
			});
		});

		describe('when processing a block with a transaction which has delegate registration from the same account', () => {
			let invalidBlock: Block;
			let invalidTx: Transaction;
			let originalAccount: Account<DefaultAccountProps>;

			beforeAll(async () => {
				originalAccount = await node['_chain'].dataAccess.getAccountByAddress(account.address);
				invalidTx = createDelegateRegisterTransaction({
					nonce: originalAccount.sequence.nonce,
					fee: BigInt('5000000000'),
					username: 'number1',
					networkIdentifier: node['_networkIdentifier'],
					passphrase: account.passphrase,
				});
				invalidBlock = await nodeUtils.createBlock(node, [invalidTx]);
				try {
					await node['_processor'].process(invalidBlock);
				} catch (err) {
					// expected error
				}
			});

			it('should have the same account state as before', () => {
				expect(originalAccount.dpos.delegate.username).toEqual('number1');
			});

			it('should not save the block to the database', async () => {
				await expect(
					node['_chain'].dataAccess.isBlockPersisted(invalidBlock.header.id),
				).resolves.toBeFalse();
			});

			it('should not save the transaction to the database', async () => {
				await expect(
					node['_chain'].dataAccess.isTransactionPersisted(invalidTx.id),
				).resolves.toBeFalse();
			});
		});
	});

	describe('given a block with invalid properties', () => {
		let invalidBlock: Block;

		describe('when block has lower reward than expected', () => {
			it('should reject the block', async () => {
				const { lastBlock } = node['_chain'];
				const currentSlot = node['_chain'].slots.getSlotNumber(lastBlock.header.timestamp) + 1;
				const timestamp = node['_chain'].slots.getSlotTime(currentSlot);
				const validator = await node['_chain'].getValidator(timestamp);

				const currentKeypair = node['_forger']['_keypairs'].get(validator.address);
				invalidBlock = await node['_forger']['_create']({
					keypair: currentKeypair as { publicKey: Buffer; privateKey: Buffer },
					previousBlock: lastBlock,
					seedReveal: getRandomBytes(16),
					timestamp,
					transactions: [],
				});
				node['_chain']['_blockRewardArgs'].rewardOffset = 1;
				(invalidBlock.header as any).reward = BigInt(1000);
				const signature = signDataWithPrivateKey(
					Buffer.concat([
						node.networkIdentifier,
						node['_chain'].dataAccess.encodeBlockHeader(invalidBlock.header, true),
					]),
					currentKeypair?.privateKey as Buffer,
				);
				(invalidBlock.header as any).signature = signature;
				await expect(node['_processor'].process(invalidBlock)).rejects.toThrow(
					'Invalid block reward',
				);
			});
		});

		describe('when block has tie break BFT properties', () => {
			it('should replace the last block', async () => {
				const { lastBlock } = node['_chain'];
				const currentSlot = node['_chain'].slots.getSlotNumber(lastBlock.header.timestamp) + 1;
				const timestamp = node['_chain'].slots.getSlotTime(currentSlot);
				const validator = await node['_chain'].getValidator(timestamp);

				const currentKeypair = node['_forger']['_keypairs'].get(validator.address);
				const tieBreakBlock = await node['_forger']['_create']({
					keypair: currentKeypair as { publicKey: Buffer; privateKey: Buffer },
					previousBlock: lastBlock,
					seedReveal: getRandomBytes(16),
					timestamp,
					transactions: [],
				});
				(tieBreakBlock.header as any).height = lastBlock.header.height;
				(tieBreakBlock.header as any).previousBlockID = lastBlock.header.previousBlockID;
				(tieBreakBlock.header as any).asset = lastBlock.header.asset;
				(tieBreakBlock.header as any).reward = BigInt(500000000);
				const signature = signDataWithPrivateKey(
					Buffer.concat([
						node.networkIdentifier,
						node['_chain'].dataAccess.encodeBlockHeader(tieBreakBlock.header, true),
					]),
					currentKeypair?.privateKey as Buffer,
				);
				(tieBreakBlock.header as any).signature = signature;
				(tieBreakBlock.header as any).receivedAt = timestamp;
				// There is no other way to mutate the time so that the tieBreak block is received at current slot
				jest.spyOn(node['_chain'].slots, 'timeSinceGenesis').mockReturnValue(timestamp);
				(node['_chain'].lastBlock.header as any).receivedAt = timestamp + 2;
				// mutate the last block so that the last block was not received in the timeslot

				await node['_processor'].process(tieBreakBlock);

				expect(node['_chain'].lastBlock.header.id).toEqual(tieBreakBlock.header.id);
			});
		});
	});

	describe('given a block with protocol violation', () => {
		beforeEach(() => {
			node['_chain']['_blockRewardArgs'].rewardOffset = 1;
		});

		describe('when SeedReveal is not preimage of the last block forged', () => {
			it('should reject a block if reward is not 0', async () => {
				const { lastBlock } = node['_chain'];
				const target = getAddressFromPublicKey(lastBlock.header.generatorPublicKey);
				const currentKeypair = node['_forger']['_keypairs'].get(target);
				const nextBlock = await nodeUtils.createValidBlock(node, [], target);
				// Mutate valid block to have reward 500000000 with invalid seed reveal
				(nextBlock.header as any).reward = BigInt(500000000);
				(nextBlock.header as any).asset.seedReveal = getRandomBytes(16);
				const signature = signDataWithPrivateKey(
					Buffer.concat([
						node.networkIdentifier,
						node['_chain'].dataAccess.encodeBlockHeader(nextBlock.header, true),
					]),
					currentKeypair?.privateKey as Buffer,
				);
				(nextBlock.header as any).signature = signature;

				await expect(node['_processor'].process(nextBlock)).rejects.toThrow(
					'Invalid block reward: 500000000 expected: 0',
				);
				expect(node['_chain'].lastBlock.header.id).toEqual(lastBlock.header.id);
			});

			it('should accept a block if reward is 0', async () => {
				const { lastBlock } = node['_chain'];
				const target = getAddressFromPublicKey(lastBlock.header.generatorPublicKey);
				const currentKeypair = node['_forger']['_keypairs'].get(target);
				const nextBlock = await nodeUtils.createValidBlock(node, [], target);
				// Mutate valid block to have reward 0 with invalid seed reveal
				(nextBlock.header as any).reward = BigInt(0);
				(nextBlock.header as any).asset.seedReveal = getRandomBytes(16);
				const signature = signDataWithPrivateKey(
					Buffer.concat([
						node.networkIdentifier,
						node['_chain'].dataAccess.encodeBlockHeader(nextBlock.header, true),
					]),
					currentKeypair?.privateKey as Buffer,
				);
				(nextBlock.header as any).signature = signature;

				await node['_processor'].process(nextBlock);
				expect(node['_chain'].lastBlock.header.id).toEqual(nextBlock.header.id);
			});

			it('should accept a block if reward is full and forger did not forget last 2 rounds', async () => {
				const targetHeight =
					node['_chain'].numberOfValidators * 2 + node['_chain'].lastBlock.header.height;
				const target = getAddressFromPublicKey(node['_chain'].lastBlock.header.generatorPublicKey);
				// Forge 2 rounds of block without generator of the last block
				while (node['_chain'].lastBlock.header.height !== targetHeight) {
					const nextBlock = await nodeUtils.createValidBlock(node, [], target, true);
					await node['_processor'].process(nextBlock);
				}
				const currentKeypair = node['_forger']['_keypairs'].get(target);
				const nextBlock = await nodeUtils.createValidBlock(node, [], target);
				(nextBlock.header as any).reward = BigInt(500000000);
				(nextBlock.header as any).asset.seedReveal = getRandomBytes(16);
				const signature = signDataWithPrivateKey(
					Buffer.concat([
						node.networkIdentifier,
						node['_chain'].dataAccess.encodeBlockHeader(nextBlock.header, true),
					]),
					currentKeypair?.privateKey as Buffer,
				);
				(nextBlock.header as any).signature = signature;

				await expect(node['_processor'].process(nextBlock)).resolves.toBeUndefined();
				expect(node['_chain'].lastBlock.header.id).toEqual(nextBlock.header.id);
			});
		});

		describe('when BFT protocol is violated', () => {
			it('should reject a block if reward is not quarter', async () => {
				const { lastBlock } = node['_chain'];
				const targetHeight =
					node['_chain'].numberOfValidators * 2 + node['_chain'].lastBlock.header.height;
				const target = getAddressFromPublicKey(lastBlock.header.generatorPublicKey);
				while (node['_chain'].lastBlock.header.height !== targetHeight) {
					const nextBlock = await nodeUtils.createValidBlock(node, [], target, true);
					await node['_processor'].process(nextBlock);
				}
				// Forge 2 rounds of block without generator of the last block
				const nextBlock = await nodeUtils.createValidBlock(node, [], target);

				const currentKeypair = node['_forger']['_keypairs'].get(target);
				(nextBlock.header as any).reward = BigInt(500000000);
				(nextBlock.header as any).asset.maxHeightPreviouslyForged = nextBlock.header.height;
				const signature = signDataWithPrivateKey(
					Buffer.concat([
						node.networkIdentifier,
						node['_chain'].dataAccess.encodeBlockHeader(nextBlock.header, true),
					]),
					currentKeypair?.privateKey as Buffer,
				);
				(nextBlock.header as any).signature = signature;

				await expect(node['_processor'].process(nextBlock)).rejects.toThrow(
					'Invalid block reward: 500000000 expected: 125000000',
				);
			});

			it('should accept a block if reward is quarter', async () => {
				const { lastBlock } = node['_chain'];
				const targetHeight =
					node['_chain'].numberOfValidators * 2 + node['_chain'].lastBlock.header.height;
				const target = getAddressFromPublicKey(lastBlock.header.generatorPublicKey);
				while (node['_chain'].lastBlock.header.height !== targetHeight) {
					const nextBlock = await nodeUtils.createValidBlock(node, [], target, true);
					await node['_processor'].process(nextBlock);
				}
				// Forge 2 rounds of block without generator of the last block
				const nextBlock = await nodeUtils.createValidBlock(node, [], target);

				const currentKeypair = node['_forger']['_keypairs'].get(target);
				// Make maxHeightPreviouslyForged to be current height (BFT violation) with quarter reward
				(nextBlock.header as any).reward = BigInt(125000000);
				(nextBlock.header as any).asset.maxHeightPreviouslyForged = nextBlock.header.height;
				const signature = signDataWithPrivateKey(
					Buffer.concat([
						node.networkIdentifier,
						node['_chain'].dataAccess.encodeBlockHeader(nextBlock.header, true),
					]),
					currentKeypair?.privateKey as Buffer,
				);
				(nextBlock.header as any).signature = signature;

				await node['_processor'].process(nextBlock);
				expect(node['_chain'].lastBlock.header.id).toEqual(nextBlock.header.id);
			});
		});

		describe('when BFT protocol is violated and seed reveal is not preimage', () => {
			it('should reject a block if reward is not 0', async () => {
				const { lastBlock } = node['_chain'];
				const target = getAddressFromPublicKey(lastBlock.header.generatorPublicKey);
				// Forge 2 rounds of block without generator of the last block
				const nextBlock = await nodeUtils.createValidBlock(node, [], target);

				const currentKeypair = node['_forger']['_keypairs'].get(target);
				// Make maxHeightPreviouslyForged to be current height (BFT violation) with random seedreveal and 0 reward
				(nextBlock.header as any).reward = BigInt(125000000);
				(nextBlock.header as any).asset.maxHeightPreviouslyForged = nextBlock.header.height;
				(nextBlock.header as any).asset.seedReveal = getRandomBytes(16);
				const signature = signDataWithPrivateKey(
					Buffer.concat([
						node.networkIdentifier,
						node['_chain'].dataAccess.encodeBlockHeader(nextBlock.header, true),
					]),
					currentKeypair?.privateKey as Buffer,
				);
				(nextBlock.header as any).signature = signature;

				await expect(node['_processor'].process(nextBlock)).rejects.toThrow(
					'Invalid block reward: 125000000 expected: 0',
				);
			});

			it('should accept a block if reward is 0', async () => {
				const { lastBlock } = node['_chain'];
				const target = getAddressFromPublicKey(lastBlock.header.generatorPublicKey);
				// Forge 2 rounds of block without generator of the last block
				const nextBlock = await nodeUtils.createValidBlock(node, [], target);

				const currentKeypair = node['_forger']['_keypairs'].get(target);
				// Make maxHeightPreviouslyForged to be current height (BFT violation) with random seedreveal and 0 reward
				(nextBlock.header as any).reward = BigInt(0);
				(nextBlock.header as any).asset.maxHeightPreviouslyForged = nextBlock.header.height;
				(nextBlock.header as any).asset.seedReveal = getRandomBytes(16);
				const signature = signDataWithPrivateKey(
					Buffer.concat([
						node.networkIdentifier,
						node['_chain'].dataAccess.encodeBlockHeader(nextBlock.header, true),
					]),
					currentKeypair?.privateKey as Buffer,
				);
				(nextBlock.header as any).signature = signature;

				await node['_processor'].process(nextBlock);
				expect(node['_chain'].lastBlock.header.id).toEqual(nextBlock.header.id);
			});
		});
	});
});

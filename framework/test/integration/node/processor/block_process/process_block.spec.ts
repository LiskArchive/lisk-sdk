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
import {
	Account,
	Block,
	Chain,
	DataAccess,
	TAG_BLOCK_HEADER,
	Transaction,
} from '@liskhq/lisk-chain';
import {
	signDataWithPrivateKey,
	getPrivateAndPublicKeyFromPassphrase,
} from '@liskhq/lisk-cryptography';

import { nodeUtils } from '../../../../utils';
import { genesis, DefaultAccountProps } from '../../../../fixtures';
import * as testing from '../../../../../src/testing';
import {
	createDelegateRegisterTransaction,
	createDelegateVoteTransaction,
	createTransferTransaction,
} from '../../../../utils/node/transaction';
import { getPassphraseFromDefaultConfig } from '../../../../../src/testing/fixtures';

const getPrivateKey = (address: Buffer) => {
	const passphrase = testing.fixtures.getPassphraseFromDefaultConfig(address);
	const { privateKey } = getPrivateAndPublicKeyFromPassphrase(passphrase);

	return privateKey;
};

const getNextTimeslot = (chain: Chain) => {
	const currentSlot = chain.slots.getSlotNumber(chain.lastBlock.header.timestamp) + 1;
	return chain.slots.getSlotTime(currentSlot);
};

describe('Process block', () => {
	let processEnv: testing.BlockProcessingEnv;
	let networkIdentifier: Buffer;
	let chain: Chain;
	let dataAccess: DataAccess;
	const databasePath = '/tmp/lisk/protocol_violation/test';
	const account = nodeUtils.createAccount();

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
		networkIdentifier = processEnv.getNetworkId();
		chain = processEnv.getChain();
		dataAccess = processEnv.getDataAccess();
	});

	afterAll(async () => {
		await processEnv.cleanup({ databasePath });
	});

	describe('given an account has a balance', () => {
		describe('when processing a block with valid transactions', () => {
			let newBlock: Block;
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				transaction = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					recipientAddress: account.address,
					amount: BigInt('100000000000'),
					networkIdentifier,
					passphrase: genesis.passphrase,
				});
				newBlock = await processEnv.createBlock([transaction]);
				await processEnv.process(newBlock);
			});

			it('should save account state changes from the transaction', async () => {
				const recipient = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					account.address,
				);
				expect(recipient.token.balance.toString()).toEqual(convertLSKToBeddows('1000'));
			});

			it('should save the block to the database', async () => {
				const processedBlock = await dataAccess.getBlockByID(newBlock.header.id);
				expect(processedBlock.header.id).toEqual(newBlock.header.id);
			});

			it('should save the transactions to the database', async () => {
				const [processedTx] = await dataAccess.getTransactionsByIDs([transaction.id]);
				expect(processedTx.id).toEqual(transaction.id);
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
		});
	});

	describe('given a block with existing transactions', () => {
		describe('when processing the block', () => {
			let newBlock: Block;
			let transaction: Transaction;

			beforeAll(async () => {
				const genesisAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				transaction = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					recipientAddress: account.address,
					amount: BigInt('100000000000'),
					networkIdentifier,
					passphrase: genesis.passphrase,
				});
				newBlock = await processEnv.createBlock([transaction]);
				await processEnv.process(newBlock);
			});

			it('should fail to process the block', async () => {
				const invalidBlock = await processEnv.createBlock([transaction]);
				await expect(processEnv.process(invalidBlock)).rejects.toThrow(
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

			beforeAll(() => {
				const timestamp = getNextTimeslot(chain);
				newBlock = testing.createBlock({
					passphrase: account.passphrase,
					networkIdentifier,
					timestamp,
					previousBlockID: chain.lastBlock.header.id,
					header: {
						height: chain.lastBlock.header.height + 1,
						asset: {
							maxHeightPreviouslyForged: chain.lastBlock.header.height,
							maxHeightPrevoted: 0,
							seedReveal: Buffer.alloc(16),
						},
					},
					payload: [],
				});
				(newBlock.header as any).generatorPublicKey = account.publicKey;
			});

			it('should discard the block', async () => {
				await expect(processEnv.process(newBlock)).rejects.toThrow(
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

			beforeAll(() => {
				const timestamp = getNextTimeslot(chain);
				newBlock = testing.createBlock({
					passphrase: genesis.passphrase,
					networkIdentifier,
					timestamp,
					previousBlockID: chain.lastBlock.header.id,
					header: {
						height: 99,
						timestamp: Math.floor(new Date().getTime() / 1000),
						asset: {
							maxHeightPreviouslyForged: chain.lastBlock.header.height,
							maxHeightPrevoted: 0,
							seedReveal: Buffer.alloc(16),
						},
					},
					payload: [],
				});
			});

			it('should discard the block', async () => {
				await expect(processEnv.process(newBlock)).resolves.toBeUndefined();
				await expect(dataAccess.isBlockPersisted(newBlock.header.id)).resolves.toBeFalse();
			});
		});
	});

	describe('given an account is already a delegate', () => {
		let newBlock: Block;
		let transaction: Transaction;

		beforeAll(async () => {
			const targetAccount = await dataAccess.getAccountByAddress<DefaultAccountProps>(
				account.address,
			);
			transaction = createDelegateRegisterTransaction({
				nonce: targetAccount.sequence.nonce,
				fee: BigInt('3000000000'),
				username: 'number1',
				networkIdentifier,
				passphrase: account.passphrase,
			});
			newBlock = await processEnv.createBlock([transaction]);
			await processEnv.process(newBlock);
		});

		describe('when processing a block with a transaction which has votes for the delegate', () => {
			it('should update the sender balance and the vote of the sender', async () => {
				// Arrange
				const sender = await dataAccess.getAccountByAddress<DefaultAccountProps>(account.address);
				const voteAmount = BigInt('1000000000');
				const voteTransaction = createDelegateVoteTransaction({
					nonce: sender.sequence.nonce,
					networkIdentifier,
					passphrase: account.passphrase,
					votes: [
						{
							delegateAddress: account.address,
							amount: voteAmount,
						},
					],
				});
				const block = await processEnv.createBlock([voteTransaction]);

				// Act
				await processEnv.process(block);

				// Assess
				const updatedSender = await dataAccess.getAccountByAddress<DefaultAccountProps>(
					account.address,
				);
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
				originalAccount = await dataAccess.getAccountByAddress(account.address);
				invalidTx = createDelegateRegisterTransaction({
					nonce: originalAccount.sequence.nonce,
					fee: BigInt('5000000000'),
					username: 'number1',
					networkIdentifier,
					passphrase: account.passphrase,
				});
				invalidBlock = await processEnv.createBlock([invalidTx]);
				try {
					await processEnv.process(invalidBlock);
				} catch (err) {
					// expected error
				}
			});

			it('should have the same account state as before', () => {
				expect(originalAccount.dpos.delegate.username).toEqual('number1');
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
		let invalidBlock: Block;

		describe('when block has lower reward than expected', () => {
			it('should reject the block', async () => {
				const timestamp = getNextTimeslot(chain);
				const validator = await chain.getValidator(timestamp);
				const passphrase = getPassphraseFromDefaultConfig(validator.address);

				invalidBlock = testing.createBlock({
					passphrase,
					networkIdentifier,
					timestamp,
					previousBlockID: chain.lastBlock.header.id,
					header: {
						height: chain.lastBlock.header.height + 1,
						asset: {
							maxHeightPreviouslyForged: chain.lastBlock.header.height,
							maxHeightPrevoted: 0,
							seedReveal: Buffer.alloc(16),
						},
					},
					payload: [],
				});
				chain['_blockRewardArgs'].rewardOffset = 1;
				(invalidBlock.header as any).reward = BigInt(1000);
				const signature = signDataWithPrivateKey(
					TAG_BLOCK_HEADER,
					networkIdentifier,
					dataAccess.encodeBlockHeader(invalidBlock.header, true),
					getPrivateKey(validator.address),
				);
				(invalidBlock.header as any).signature = signature;
				await expect(processEnv.process(invalidBlock)).rejects.toThrow('Invalid block reward');
			});
		});

		describe('when block has tie break BFT properties', () => {
			it('should replace the last block', async () => {
				const { lastBlock } = chain;
				const timestamp = getNextTimeslot(chain);
				const validator = await chain.getValidator(timestamp);
				const passphrase = getPassphraseFromDefaultConfig(validator.address);

				const tieBreakBlock = testing.createBlock({
					passphrase,
					networkIdentifier,
					timestamp,
					previousBlockID: chain.lastBlock.header.id,
					header: {
						height: chain.lastBlock.header.height + 1,
						asset: {
							maxHeightPreviouslyForged: chain.lastBlock.header.height,
							maxHeightPrevoted: 0,
							seedReveal: Buffer.alloc(16),
						},
					},
					payload: [],
				});
				(tieBreakBlock.header as any).height = lastBlock.header.height;
				(tieBreakBlock.header as any).previousBlockID = lastBlock.header.previousBlockID;
				(tieBreakBlock.header as any).asset = lastBlock.header.asset;
				(tieBreakBlock.header as any).reward = BigInt(500000000);
				const signature = signDataWithPrivateKey(
					TAG_BLOCK_HEADER,
					networkIdentifier,
					dataAccess.encodeBlockHeader(tieBreakBlock.header, true),
					getPrivateKey(validator.address),
				);
				(tieBreakBlock.header as any).signature = signature;
				(tieBreakBlock.header as any).receivedAt = timestamp;
				// There is no other way to mutate the time so that the tieBreak block is received at current slot
				jest.spyOn(chain.slots, 'timeSinceGenesis').mockReturnValue(timestamp);
				(chain.lastBlock.header as any).receivedAt = timestamp + 2;
				// mutate the last block so that the last block was not received in the timeslot

				await processEnv.process(tieBreakBlock);

				expect(chain.lastBlock.header.id).toEqual(tieBreakBlock.header.id);
			});
		});
	});
});

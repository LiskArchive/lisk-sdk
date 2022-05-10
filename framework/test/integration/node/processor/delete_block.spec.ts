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

import { formatInt, NotFoundError } from '@liskhq/lisk-db';
import {
	Block,
	stateDiffSchema,
	Transaction,
	DB_KEY_DIFF_STATE,
	concatDBKeys,
	DB_KEY_STATE_STORE,
} from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';

import { intToBuffer } from '@liskhq/lisk-cryptography';
import { nodeUtils } from '../../../utils';
import {
	createDelegateRegisterTransaction,
	createDelegateVoteTransaction,
	createTransferTransaction,
	DEFAULT_TOKEN_ID,
} from '../../../utils/node/transaction';
import * as testing from '../../../../src/testing';
import { TokenModule } from '../../../../src';

describe('Delete block', () => {
	let processEnv: testing.BlockProcessingEnv;
	let networkIdentifier: Buffer;
	const databasePath = '/tmp/lisk/delete_block/test';
	const emptyDiffState = codec.encode(stateDiffSchema, {
		updated: [],
		created: [],
		deleted: [],
	});
	const genesis = testing.fixtures.defaultFaucetAccount;

	beforeAll(async () => {
		processEnv = await testing.getBlockProcessingEnv({
			options: {
				databasePath,
			},
		});
		networkIdentifier = processEnv.getNetworkId();
	});

	afterAll(async () => {
		await processEnv.cleanup({ databasePath });
	});

	describe('given there is only a genesis block', () => {
		describe('when deleteLastBlock is called', () => {
			it('should fail to delete genesis block', async () => {
				await expect(processEnv.getConsensus()['_deleteLastBlock']()).rejects.toEqual(
					expect.objectContaining({
						message: expect.stringContaining(
							'Can not delete block below or same as finalized height',
						),
					}),
				);
			});
		});
	});

	describe('given there a valid block with transfer transaction is forged', () => {
		const recipientAccount = nodeUtils.createAccount();

		let newBlock: Block;
		let transaction: Transaction;
		let originalBalance: { availableBalance: string };

		describe('when deleteLastBlock is called', () => {
			beforeEach(async () => {
				const authData = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address.toString('hex'),
				});
				originalBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: genesis.address.toString('hex'),
						tokenID: DEFAULT_TOKEN_ID.toString('hex'),
					},
				);
				transaction = createTransferTransaction({
					nonce: BigInt(authData.nonce),
					recipientAddress: recipientAccount.address,
					amount: BigInt('1000000000'),
					networkIdentifier,
					passphrase: genesis.passphrase,
				});
				newBlock = await processEnv.createBlock([transaction]);
				await processEnv
					.getBlockchainDB()
					.put(concatDBKeys(DB_KEY_DIFF_STATE, formatInt(newBlock.header.height)), emptyDiffState);
				await processEnv.process(newBlock);
				await processEnv.getConsensus()['_deleteLastBlock']();
			});

			it('should delete the block from the database', async () => {
				await expect(
					processEnv.getDataAccess().isBlockPersisted(newBlock.header.id),
				).resolves.toBeFalse();
			});

			it('should delete the transactions from the database', async () => {
				await expect(
					processEnv.getDataAccess().isTransactionPersisted(transaction.id),
				).resolves.toBeFalse();
			});

			it('should delete the events from the database', async () => {
				await expect(processEnv.getDataAccess().getEvents(newBlock.header.height)).rejects.toThrow(
					'does not exist',
				);
			});

			it('should match the sender account to the original state', async () => {
				const afterBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: genesis.address.toString('hex'),
						tokenID: DEFAULT_TOKEN_ID.toString('hex'),
					},
				);
				expect(afterBalance).toEqual(originalBalance);
			});

			it('should not persist virgin recipient account', async () => {
				const recipientBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: recipientAccount.address.toString('hex'),
						tokenID: DEFAULT_TOKEN_ID.toString('hex'),
					},
				);
				expect(recipientBalance.availableBalance).toEqual('0');
			});

			it('should not persist the state diff for that block height', async () => {
				await expect(
					processEnv
						.getBlockchainDB()
						.get(concatDBKeys(DB_KEY_DIFF_STATE, formatInt(newBlock.header.height))),
				).rejects.toBeInstanceOf(NotFoundError);
			});
		});
	});

	describe('given an block that introduces account state change', () => {
		describe('when the deleteLastBlock is called', () => {
			it('should rollback all the accounts to the previous state', async () => {
				// Arrange
				const genesisAuth = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address.toString('hex'),
				});
				const genesisBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: genesis.address.toString('hex'),
						tokenID: DEFAULT_TOKEN_ID.toString('hex'),
					},
				);
				const recipientAccount = nodeUtils.createAccount();
				const transaction1 = createTransferTransaction({
					nonce: BigInt(genesisAuth.nonce),
					recipientAddress: recipientAccount.address,
					amount: BigInt('100000000000'),
					networkIdentifier,
					passphrase: genesis.passphrase,
				});
				const newBlock = await processEnv.createBlock([transaction1]);
				await processEnv.process(newBlock);
				await processEnv.getConsensus()['_deleteLastBlock']();
				// Assert
				const dbKey = concatDBKeys(
					DB_KEY_STATE_STORE,
					intToBuffer(new TokenModule().id, 4),
					intToBuffer(0, 2),
				);
				await expect(processEnv.getBlockchainDB().get(dbKey)).rejects.toThrow(
					`Specified key ${dbKey.toString('hex')} does not exist`,
				);
				const revertedBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: genesis.address.toString('hex'),
						tokenID: DEFAULT_TOKEN_ID.toString('hex'),
					},
				);
				expect(revertedBalance).toEqual(genesisBalance);
			});
		});
	});

	describe('given an block that introduces consensus state change', () => {
		describe('when the deleteLastBlock is called', () => {
			it('should rollback validators to the previous state', async () => {
				const genesisAuth = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address.toString('hex'),
				});
				const recipientAccount = nodeUtils.createAccount();
				const transaction1 = createTransferTransaction({
					nonce: BigInt(genesisAuth.nonce),
					recipientAddress: recipientAccount.address,
					amount: BigInt('1000000000000'),
					networkIdentifier,
					passphrase: genesis.passphrase,
				});
				const transaction2 = createDelegateRegisterTransaction({
					nonce: BigInt(0),
					username: 'rand',
					networkIdentifier,
					passphrase: recipientAccount.passphrase,
				});
				const transaction3 = createDelegateVoteTransaction({
					nonce: BigInt(1),
					networkIdentifier,
					passphrase: recipientAccount.passphrase,
					votes: [
						{
							delegateAddress: recipientAccount.address,
							amount: BigInt('100000000000'),
						},
					],
				});
				const initBlock = await processEnv.createBlock([transaction1, transaction2, transaction3]);
				await processEnv.process(initBlock);
				await processEnv.processUntilHeight(308);
				const validatorsBefore = await processEnv
					.getValidatorAPI()
					.getGeneratorList(processEnv.getAPIContext());

				const newBlock = await processEnv.createBlock([]);
				await processEnv.process(newBlock);
				const validatorsAfter = await processEnv
					.getValidatorAPI()
					.getGeneratorList(processEnv.getAPIContext());
				expect(validatorsBefore).not.toEqual(validatorsAfter);
				await processEnv.getConsensus()['_deleteLastBlock']();
				const validatorsReverted = await processEnv
					.getValidatorAPI()
					.getGeneratorList(processEnv.getAPIContext());
				expect(validatorsReverted).toEqual(validatorsBefore);
			});
		});
	});
});

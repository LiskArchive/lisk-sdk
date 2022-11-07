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

import { NotFoundError } from '@liskhq/lisk-db';
import {
	Block,
	stateDiffSchema,
	Transaction,
	DB_KEY_DIFF_STATE,
	concatDBKeys,
} from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';

import { address, utils } from '@liskhq/lisk-cryptography';
import { nodeUtils } from '../../../utils';
import {
	createDelegateRegisterTransaction,
	createDelegateVoteTransaction,
	createTransferTransaction,
	defaultTokenID,
} from '../../../utils/mocks/transaction';
import * as testing from '../../../../src/testing';

describe('Delete block', () => {
	let processEnv: testing.BlockProcessingEnv;
	let chainID: Buffer;
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
		chainID = processEnv.getNetworkId();
	});

	afterAll(() => {
		processEnv.cleanup({ databasePath });
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
					address: genesis.address,
				});
				originalBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: genesis.address,
						tokenID: defaultTokenID(processEnv.getNetworkId()).toString('hex'),
					},
				);
				transaction = createTransferTransaction({
					nonce: BigInt(authData.nonce),
					recipientAddress: recipientAccount.address,
					amount: BigInt('1000000000'),
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});
				newBlock = await processEnv.createBlock([transaction]);
				await processEnv
					.getBlockchainDB()
					.set(
						concatDBKeys(DB_KEY_DIFF_STATE, utils.intToBuffer(newBlock.header.height, 4)),
						emptyDiffState,
					);
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
				await expect(
					processEnv.getDataAccess().getEvents(newBlock.header.height),
				).resolves.toBeEmpty();
			});

			it('should match the sender account to the original state', async () => {
				const afterBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: genesis.address,
						tokenID: defaultTokenID(processEnv.getNetworkId()).toString('hex'),
					},
				);
				expect(afterBalance).toEqual(originalBalance);
			});

			it('should not persist virgin recipient account', async () => {
				const recipientBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: address.getLisk32AddressFromAddress(recipientAccount.address),
						tokenID: defaultTokenID(processEnv.getNetworkId()).toString('hex'),
					},
				);
				expect(recipientBalance.availableBalance).toEqual('0');
			});

			it('should not persist the state diff for that block height', async () => {
				await expect(
					processEnv
						.getBlockchainDB()
						.get(concatDBKeys(DB_KEY_DIFF_STATE, utils.intToBuffer(newBlock.header.height, 4))),
				).rejects.toBeInstanceOf(NotFoundError);
			});
		});
	});

	describe('given an block that introduces account state change', () => {
		describe('when the deleteLastBlock is called', () => {
			it('should rollback all the accounts to the previous state', async () => {
				// Arrange
				const genesisAuth = await processEnv.invoke<{ nonce: string }>('auth_getAuthAccount', {
					address: genesis.address,
				});
				const genesisBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: genesis.address,
						tokenID: defaultTokenID(processEnv.getNetworkId()).toString('hex'),
					},
				);
				const recipientAccount = nodeUtils.createAccount();
				const transaction1 = createTransferTransaction({
					nonce: BigInt(genesisAuth.nonce),
					recipientAddress: recipientAccount.address,
					amount: BigInt('100000000000'),
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});
				const newBlock = await processEnv.createBlock([transaction1]);
				await processEnv.process(newBlock);
				await processEnv.getConsensus()['_deleteLastBlock']();
				// Assert
				const revertedBalance = await processEnv.invoke<{ availableBalance: string }>(
					'token_getBalance',
					{
						address: genesis.address,
						tokenID: defaultTokenID(processEnv.getNetworkId()).toString('hex'),
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
					address: genesis.address,
				});
				const recipientAccount = nodeUtils.createAccount();
				const transaction1 = createTransferTransaction({
					nonce: BigInt(genesisAuth.nonce),
					recipientAddress: recipientAccount.address,
					amount: BigInt('1000000000000'),
					chainID,
					privateKey: Buffer.from(genesis.privateKey, 'hex'),
				});
				const transaction2 = createDelegateRegisterTransaction({
					nonce: BigInt(0),
					username: 'rand',
					chainID,
					blsKey: recipientAccount.blsPublicKey,
					blsProofOfPossession: recipientAccount.blsPoP,
					generatorKey: recipientAccount.publicKey,
					privateKey: recipientAccount.privateKey,
				});
				const transaction3 = createDelegateVoteTransaction({
					nonce: BigInt(1),
					chainID,
					privateKey: recipientAccount.privateKey,
					votes: [
						{
							delegateAddress: recipientAccount.address,
							amount: BigInt('100000000000'),
						},
					],
				});
				const insertAssets = await processEnv.createBlock([
					transaction1,
					transaction2,
					transaction3,
				]);
				await processEnv.process(insertAssets);
				await processEnv.processUntilHeight(308);
				const validatorsBefore = await processEnv
					.getConsensus()
					['_bft'].method.getBFTParameters(
						processEnv.getConsensusStore(),
						processEnv.getLastBlock().header.height + 1,
					);

				const newBlock = await processEnv.createBlock([]);
				await processEnv.process(newBlock);
				// TODO: #7666 after vote command changes the eligible delegate, it should enable
				// const validatorsAfter = await processEnv
				// 	.getConsensus()
				// 	['_bft'].method.getBFTParameters(
				// 		processEnv.getConsensusStore(),
				// 		processEnv.getLastBlock().header.height + 1,
				// 	);
				// expect(validatorsBefore.validators.map(v => v.address)).not.toEqual(
				// 	validatorsAfter.validators.map(v => v.address),
				// );
				await processEnv.getConsensus()['_deleteLastBlock']();
				const validatorsReverted = await processEnv
					.getConsensus()
					['_bft'].method.getBFTParameters(
						processEnv.getConsensusStore(),
						processEnv.getLastBlock().header.height + 1,
					);
				expect(validatorsReverted.validators.map(v => v.address)).toEqual(
					validatorsBefore.validators.map(v => v.address),
				);
			});
		});
	});
});

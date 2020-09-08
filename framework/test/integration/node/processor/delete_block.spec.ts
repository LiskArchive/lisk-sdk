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

import { KVStore, formatInt, NotFoundError } from '@liskhq/lisk-db';
import {
	Block,
	stateDiffSchema,
	Account,
	Transaction,
	CONSENSUS_STATE_VALIDATORS_KEY,
} from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { validator } from '@liskhq/lisk-validator';
import { createDB, removeDB } from '../../../utils/kv_store';
import { nodeUtils } from '../../../utils';
import { genesis, DefaultAccountProps } from '../../../fixtures';
import { Node } from '../../../../src/node';
import { createTransferTransaction } from '../../../utils/node/transaction';

describe('Delete block', () => {
	const dbName = 'delete_block';
	const emptyDiffState = codec.encode(stateDiffSchema, {
		updated: [],
		created: [],
		deleted: [],
	});
	let node: Node;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
		await node['_forger'].loadDelegates();
		// FIXME: Remove with #5572
		validator['_validator']._opts.addUsedSchema = false;
	});

	afterAll(async () => {
		await forgerDB.clear();
		await node.cleanup();
		await blockchainDB.close();
		await forgerDB.close();
		removeDB(dbName);
	});

	describe('given there is only a genesis block', () => {
		describe('when deleteLastBlock is called', () => {
			it('should fail to delete genesis block', async () => {
				await expect(node['_processor'].deleteLastBlock()).rejects.toEqual(
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
		let genesisAccount: Account<DefaultAccountProps>;

		describe('when deleteLastBlock is called', () => {
			beforeEach(async () => {
				genesisAccount = await node['_chain'].dataAccess.getAccountByAddress<DefaultAccountProps>(
					genesis.address,
				);
				transaction = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					recipientAddress: recipientAccount.address,
					amount: BigInt('100000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
				});
				newBlock = await nodeUtils.createBlock(node, [transaction]);
				await blockchainDB.put(`diff:${formatInt(newBlock.header.height)}`, emptyDiffState);
				await node['_processor'].process(newBlock);
				await node['_processor'].deleteLastBlock();
			});

			it('should delete the block from the database', async () => {
				await expect(
					node['_chain'].dataAccess.isBlockPersisted(newBlock.header.id),
				).resolves.toBeFalse();
			});

			it('should delete the transactions from the database', async () => {
				await expect(
					node['_chain'].dataAccess.isTransactionPersisted(transaction.id),
				).resolves.toBeFalse();
			});

			it('should match the sender account to the original state', async () => {
				const genesisAfter = await node['_chain'].dataAccess.getAccountByAddress<
					DefaultAccountProps
				>(genesis.address);
				expect(genesisAfter.token.balance.toString()).toEqual(
					genesisAccount.token.balance.toString(),
				);
			});

			it('should not persist virgin recipient account', async () => {
				await expect(
					node['_chain'].dataAccess.getAccountByAddress(recipientAccount.address),
				).rejects.toBeInstanceOf(NotFoundError);
				await expect(
					blockchainDB.get(`diff:${formatInt(newBlock.header.height)}`),
				).rejects.toBeInstanceOf(NotFoundError);
			});
		});
	});

	describe('given an block that introduces account state change', () => {
		describe('when the deleteLastBlock is called', () => {
			it('should rollback all the accounts to the previous state', async () => {
				// Arrange
				const genesisAccount = await node['_chain'].dataAccess.getAccountByAddress<
					DefaultAccountProps
				>(genesis.address);
				const genesisBalance = genesisAccount.token.balance;
				const recipientAccount = nodeUtils.createAccount();
				const transaction1 = createTransferTransaction({
					nonce: genesisAccount.sequence.nonce,
					recipientAddress: recipientAccount.address,
					amount: BigInt('100000000000'),
					networkIdentifier: node['_networkIdentifier'],
					passphrase: genesis.passphrase,
				});
				const newBlock = await nodeUtils.createBlock(node, [transaction1]);
				await node['_processor'].process(newBlock);
				await node['_processor'].deleteLastBlock();
				// Assert
				await expect(
					node['_chain'].dataAccess.getAccountByAddress(recipientAccount.address),
				).rejects.toThrow('Specified key accounts:address');
				const revertedGenesisAccount = await node['_chain'].dataAccess.getAccountByAddress<
					DefaultAccountProps
				>(genesisAccount.address);
				expect(revertedGenesisAccount.token.balance).toEqual(genesisBalance);
			});
		});
	});

	describe('given an block that introduces consensus state change', () => {
		describe('when the deleteLastBlock is called', () => {
			it('should rollback validators to the previous state', async () => {
				// Arrange
				const lastBootstrapHeight = node['_chain']['_getLastBootstrapHeight']();
				while (node['_chain'].lastBlock.header.height !== lastBootstrapHeight - 1) {
					const newBlock = await nodeUtils.createBlock(node);
					await node['_processor'].process(newBlock);
				}
				const consensusStateBefore = await node['_chain'].dataAccess.getConsensusState(
					CONSENSUS_STATE_VALIDATORS_KEY,
				);
				const newBlock = await nodeUtils.createBlock(node);
				await node['_processor'].process(newBlock);
				const consensusStateAfter = await node['_chain'].dataAccess.getConsensusState(
					CONSENSUS_STATE_VALIDATORS_KEY,
				);
				expect(consensusStateBefore).not.toEqual(consensusStateAfter);
				await node['_processor'].deleteLastBlock();
				const consensusStateReverted = await node['_chain'].dataAccess.getConsensusState(
					CONSENSUS_STATE_VALIDATORS_KEY,
				);
				expect(consensusStateReverted).toEqual(consensusStateBefore);
			});
		});
	});
});

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
import { KVStore } from '@liskhq/lisk-db';
import { validator } from '@liskhq/lisk-validator';
import { nodeUtils } from '../../../utils';
import { createDB, removeDB } from '../../../utils/kv_store';
import { Node } from '../../../../src/node';
import { genesis, DefaultAccountProps } from '../../../fixtures';
import { createTransferTransaction } from '../../../utils/node/transaction';
import {
	restoreBlocks,
	deleteBlocksAfterHeight,
	clearBlocksTempTable,
} from '../../../../src/node/synchronizer/utils';

describe('Temp block', () => {
	const dbName = 'temp_block';
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

	describe('given a blockchain with more than 3 rounds', () => {
		describe('when deleting 100 blocks and saving to the temp blocks chain', () => {
			it('should successfully store to temp block and restore from temp block', async () => {
				const targetHeight =
					node['_chain'].lastBlock.header.height + node['_chain'].numberOfValidators * 3;
				while (node['_chain'].lastBlock.header.height < targetHeight) {
					const genesisAccount = await node['_chain'].dataAccess.getAccountByAddress<
						DefaultAccountProps
					>(genesis.address);
					const accountWithoutBalance = nodeUtils.createAccount();
					const nextBlock = await nodeUtils.createBlock(node, [
						createTransferTransaction({
							nonce: genesisAccount.sequence.nonce,
							recipientAddress: accountWithoutBalance.address,
							amount: BigInt('10000000000'),
							networkIdentifier: node['_networkIdentifier'],
							passphrase: genesis.passphrase,
						}),
					]);
					await node['_processor'].processValidated(nextBlock);
				}
				const deleteUptoHeight = 1;
				await deleteBlocksAfterHeight(
					node['_processor'],
					node['_chain'],
					node['_logger'],
					deleteUptoHeight,
					true,
				);
				expect(node['_chain'].lastBlock.header.height).toEqual(deleteUptoHeight);
				const result = await restoreBlocks(node['_chain'], node['_processor']);
				expect(result).toBeTrue();
				expect(node['_chain'].lastBlock.header.height).toEqual(targetHeight);
				await clearBlocksTempTable(node['_chain']);
			});

			it('should successfully store to temp block and build new chain on top', async () => {
				const targetHeight =
					node['_chain'].lastBlock.header.height + node['_chain'].numberOfValidators * 3;
				while (node['_chain'].lastBlock.header.height < targetHeight) {
					const genesisAccount = await node['_chain'].dataAccess.getAccountByAddress<
						DefaultAccountProps
					>(genesis.address);
					const accountWithoutBalance = nodeUtils.createAccount();
					const nextBlock = await nodeUtils.createBlock(node, [
						createTransferTransaction({
							nonce: genesisAccount.sequence.nonce,
							recipientAddress: accountWithoutBalance.address,
							amount: BigInt('10000000000'),
							networkIdentifier: node['_networkIdentifier'],
							passphrase: genesis.passphrase,
						}),
					]);
					await node['_processor'].processValidated(nextBlock);
				}
				const deleteUptoHeight = node['_bft'].finalizedHeight;
				await deleteBlocksAfterHeight(
					node['_processor'],
					node['_chain'],
					node['_logger'],
					deleteUptoHeight,
					true,
				);
				expect(node['_chain'].lastBlock.header.height).toEqual(deleteUptoHeight);

				// Act
				while (node['_chain'].lastBlock.header.height < targetHeight) {
					const genesisAccount = await node['_chain'].dataAccess.getAccountByAddress<
						DefaultAccountProps
					>(genesis.address);
					const accountWithoutBalance = nodeUtils.createAccount();
					const nextBlock = await nodeUtils.createBlock(node, [
						createTransferTransaction({
							nonce: genesisAccount.sequence.nonce,
							recipientAddress: accountWithoutBalance.address,
							amount: BigInt('10000000000'),
							networkIdentifier: node['_networkIdentifier'],
							passphrase: genesis.passphrase,
						}),
					]);
					await node['_processor'].processValidated(nextBlock);
				}
				expect(node['_chain'].lastBlock.header.height).toEqual(targetHeight);
				// Restore last temp block
				await deleteBlocksAfterHeight(
					node['_processor'],
					node['_chain'],
					node['_logger'],
					deleteUptoHeight,
				);
				const result = await restoreBlocks(node['_chain'], node['_processor']);
				expect(result).toBeTrue();
				expect(node['_chain'].lastBlock.header.height).toEqual(targetHeight);
			});
		});
	});
});

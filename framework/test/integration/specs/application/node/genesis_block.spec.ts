/*
 * Copyright © 2018 Lisk Foundation
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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { nodeUtils } from '../../../../utils';
import { createDB, removeDB } from '../../../../utils/kv_store';
import { Node } from '../../../../../src/application/node';
import { genesisBlock as getGenesisBlock } from '../../../../fixtures';
import { AccountAsset } from '../../../../../src/application/node/account';

describe('genesis block', () => {
	const dbName = 'genesis_block';
	const TRANSACTION_TYPE_DELEGATE_REGISTRATION = 10;
	const genesisBlock = getGenesisBlock();
	let node: Node;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;

	beforeAll(async () => {
		({ blockchainDB, forgerDB } = createDB(dbName));
		node = await nodeUtils.createAndLoadNode(blockchainDB, forgerDB);
	});

	afterAll(async () => {
		await node.cleanup();
		await blockchainDB.close();
		await forgerDB.close();
		removeDB(dbName);
	});

	describe('given the application has not been initialized', () => {
		describe('when chain module is bootstrapped', () => {
			it('should save genesis block to the database', async () => {
				const block = await node['_chain'].dataAccess.getBlockByID(
					genesisBlock.header.id,
				);
				expect(block.header.id).toEqual(genesisBlock.header.id);
				expect(block.header.height).toEqual(1);
			});

			it('should have genesis transactions in database', async () => {
				// FIXME: genesis transaction has wrong ID in JSON, this test should be removed after new genesis block
				const block = await node['_chain'].dataAccess.getBlockByID(
					genesisBlock.header.id,
				);
				const ids = genesisBlock.payload.map(t => t.id);
				const allExist = ids.every(id =>
					block.payload
						.map(tx => tx.id)
						.find(txID => txID.equals(id) !== undefined),
				);

				expect(allExist).toEqual(true);
			});

			it('should save accounts for the registered genesis delegates', async () => {
				// Get accounts of delegate registeration
				const delegateRegistrationTransactions = genesisBlock.payload.filter(
					transaction =>
						transaction.type === TRANSACTION_TYPE_DELEGATE_REGISTRATION,
				);
				const delegateAccountsAddressesInGenesisBlock = delegateRegistrationTransactions.map(
					transaction => getAddressFromPublicKey(transaction.senderPublicKey),
				);
				// Get delegate accounts in genesis block from the database
				const accountsFromDb = await Promise.all(
					delegateAccountsAddressesInGenesisBlock.map(async address =>
						node['_chain'].dataAccess.getAccountByAddress(address),
					),
				);
				const allAccountsAreDelegate = delegateAccountsAddressesInGenesisBlock.every(
					address =>
						accountsFromDb.find(account => address.equals(account.address)),
				);

				expect(allAccountsAreDelegate).toEqual(true);
			});

			it('should have correct totalVotesReceived for genesis delegates', async () => {
				// Initial funds for genesis delegates
				const totalVotesReceivedOfDevnetDelegates = '1000000000000';
				// Get accounts of delegate registeration
				const delegateRegistrationTransactions = genesisBlock.payload.filter(
					transaction =>
						transaction.type === TRANSACTION_TYPE_DELEGATE_REGISTRATION,
				);
				const delegateAccountsAddressesInGenesisBlock = delegateRegistrationTransactions.map(
					transaction => getAddressFromPublicKey(transaction.senderPublicKey),
				);
				// Get delegate accounts in genesis block from the database
				const accountsFromDb = await Promise.all(
					delegateAccountsAddressesInGenesisBlock.map(async address =>
						node['_chain'].dataAccess.getAccountByAddress<AccountAsset>(
							address,
						),
					),
				);
				const allAccountsHaveCorrectVoteWeight = delegateAccountsAddressesInGenesisBlock.every(
					address =>
						accountsFromDb.find(
							account =>
								address.equals(account.address) &&
								account.asset.delegate.totalVotesReceived ===
									BigInt(totalVotesReceivedOfDevnetDelegates),
						),
				);

				expect(allAccountsHaveCorrectVoteWeight).toEqual(true);
			});

			it('should have correct delegate list', async () => {
				const delegateListFromChain = await nodeUtils.getDelegateList(node, 1);
				expect(delegateListFromChain).toMatchSnapshot();
			});
		});
	});

	describe('given the application has been initialized previously', () => {
		describe('when chain module is bootstrapped', () => {
			it('should have genesis transactions in database', async () => {
				const block = await node['_chain'].dataAccess.getBlockByID(
					genesisBlock.header.id,
				);
				const ids = genesisBlock.payload.map(t => t.id);
				const allExist = ids.every(id =>
					block.payload
						.map(tx => tx.id)
						.find(txID => txID.equals(id) !== undefined),
				);

				expect(allExist).toEqual(true);
			});

			it('should save accounts for the registered genesis delegates', async () => {
				// Get accounts of delegate registeration
				const delegateRegistrationTransactions = genesisBlock.payload.filter(
					transaction =>
						transaction.type === TRANSACTION_TYPE_DELEGATE_REGISTRATION,
				);
				const delegateAccountsAddressesInGenesisBlock = delegateRegistrationTransactions.map(
					transaction => getAddressFromPublicKey(transaction.senderPublicKey),
				);
				// Get delegate accounts in genesis block from the database
				const accountsFromDb = await Promise.all(
					delegateAccountsAddressesInGenesisBlock.map(async address =>
						node['_chain'].dataAccess.getAccountByAddress(address),
					),
				);
				const allAccountsAreDelegate = delegateAccountsAddressesInGenesisBlock.every(
					address =>
						accountsFromDb.find(account => address.equals(account.address)),
				);

				expect(allAccountsAreDelegate).toEqual(true);
			});

			it('should have correct vote weight for genesis delegates', async () => {
				// Initial funds for genesis delegates
				const totalVotesReceivedOfDevnetDelegates = '1000000000000';
				// Get accounts of delegate registeration
				const delegateRegistrationTransactions = genesisBlock.payload.filter(
					transaction =>
						transaction.type === TRANSACTION_TYPE_DELEGATE_REGISTRATION,
				);
				const delegateAccountsAddressesInGenesisBlock = delegateRegistrationTransactions.map(
					transaction => getAddressFromPublicKey(transaction.senderPublicKey),
				);
				// Get delegate accounts in genesis block from the database
				const accountsFromDb = await Promise.all(
					delegateAccountsAddressesInGenesisBlock.map(async address =>
						node['_chain'].dataAccess.getAccountByAddress<AccountAsset>(
							address,
						),
					),
				);
				const allAccountsHaveCorrectVoteWeight = delegateAccountsAddressesInGenesisBlock.every(
					address =>
						accountsFromDb.find(
							account =>
								address.equals(account.address) &&
								account.asset.delegate.totalVotesReceived ===
									BigInt(totalVotesReceivedOfDevnetDelegates),
						),
				);

				expect(allAccountsHaveCorrectVoteWeight).toEqual(true);
			});

			it('should have correct delegate list', async () => {
				const delegateListFromChain = await nodeUtils.getDelegateList(node, 1);
				expect(delegateListFromChain).toMatchSnapshot();
			});
		});
	});
});

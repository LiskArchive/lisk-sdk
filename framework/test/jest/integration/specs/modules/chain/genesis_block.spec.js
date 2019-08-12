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

'use strict';

const { chainUtils, storageUtils, configUtils } = require('../../../utils');
const delegateListForTheFirstRound = require('../../../../../fixtures/config/devnet/delegates_for_first_round.json');
const genesisBlock = require('../../../../../fixtures/config/devnet/genesis_block');

describe('genesis block', () => {
	const dbName = 'genesis_block';
	const TRANSACTION_TYPE_DELEGATE_REGISTRATION = 2;
	let storage;
	let chainModule;

	beforeAll(async () => {
		storage = new storageUtils.StorageSandbox(
			configUtils.storageConfig({ database: dbName }),
		);
		await storage.bootstrap();
	});

	afterAll(async () => {
		await chainModule.cleanup();
		await storage.cleanup();
	});

	describe('given the application has not been initialized', () => {
		describe('when chain module is bootstrapped', () => {
			beforeAll(async () => {
				chainModule = await chainUtils.createAndLoadChainModule(dbName);
			});

			afterAll(async () => {
				await chainModule.unload();
			});

			it('should save genesis block to the database', async () => {
				const block = await chainUtils.getBlock(storage, genesisBlock.id);
				expect(block.id).toEqual(genesisBlock.id);
				expect(block.height).toEqual(1);
			});

			it('should have genesis transactions in database', async () => {
				const block = await chainUtils.getBlock(storage, genesisBlock.id);
				const ids = genesisBlock.transactions.map(t => t.id);
				const allExist = ids.every(id =>
					block.transactions.map(tx => tx.id).includes(id),
				);

				expect(allExist).toEqual(true);
			});

			it('should save accounts for the registered genesis delegates', async () => {
				// Get accounts of delegate registeration
				const delegateRegistrationTransactions = genesisBlock.transactions.filter(
					transaction =>
						transaction.type === TRANSACTION_TYPE_DELEGATE_REGISTRATION,
				);
				const delegateAccountsAddressesInGenesisBlock = delegateRegistrationTransactions.map(
					transaction => transaction.senderId,
				);
				// Get delegate accounts in genesis block from the database
				const accountsFromDb = await Promise.all(
					delegateAccountsAddressesInGenesisBlock.map(address =>
						chainUtils.getAccount(storage, address),
					),
				);
				const allAccountsAreDelegate = delegateAccountsAddressesInGenesisBlock.every(
					address =>
						accountsFromDb.find(account => address === account.address),
				);

				expect(allAccountsAreDelegate).toEqual(true);
			});

			it('should have correct vote weight for genesis delegates', async () => {
				// All delegates has vote weight of total supply
				const voteWeightOfDevnetDelegates = '10000000000000000';
				// Get accounts of delegate registeration
				const delegateRegistrationTransactions = genesisBlock.transactions.filter(
					transaction =>
						transaction.type === TRANSACTION_TYPE_DELEGATE_REGISTRATION,
				);
				const delegateAccountsAddressesInGenesisBlock = delegateRegistrationTransactions.map(
					transaction => transaction.senderId,
				);
				// Get delegate accounts in genesis block from the database
				const accountsFromDb = await Promise.all(
					delegateAccountsAddressesInGenesisBlock.map(address =>
						chainUtils.getAccount(storage, address),
					),
				);
				const allAccountsHaveCorrectVoteWeight = delegateAccountsAddressesInGenesisBlock.every(
					address =>
						accountsFromDb.find(
							account =>
								address === account.address &&
								account.vote === voteWeightOfDevnetDelegates,
						),
				);

				expect(allAccountsHaveCorrectVoteWeight).toEqual(true);
			});

			it('should have correct delegate list', async () => {
				const delegateListFromChain = await chainUtils.getDelegateList(
					chainModule,
					1,
				);
				expect(delegateListFromChain).toEqual(delegateListForTheFirstRound);
			});
		});
	});

	describe('given the application has been initialized previously', () => {
		describe('when chain module is bootstrapped', () => {
			beforeAll(async () => {
				chainModule = await chainUtils.createAndLoadChainModule(dbName);
			});

			it('should have genesis transactions in database', async () => {
				const block = await chainUtils.getBlock(storage, genesisBlock.id);
				const ids = genesisBlock.transactions.map(t => t.id);
				const allExist = ids.every(id =>
					block.transactions.map(tx => tx.id).includes(id),
				);

				expect(allExist).toEqual(true);
			});

			it('should save accounts for the registered genesis delegates', async () => {
				// Get accounts of delegate registeration
				const delegateRegistrationTransactions = genesisBlock.transactions.filter(
					transaction =>
						transaction.type === TRANSACTION_TYPE_DELEGATE_REGISTRATION,
				);
				const delegateAccountsAddressesInGenesisBlock = delegateRegistrationTransactions.map(
					transaction => transaction.senderId,
				);
				// Get delegate accounts in genesis block from the database
				const accountsFromDb = await Promise.all(
					delegateAccountsAddressesInGenesisBlock.map(address =>
						chainUtils.getAccount(storage, address),
					),
				);
				const allAccountsAreDelegate = delegateAccountsAddressesInGenesisBlock.every(
					address =>
						accountsFromDb.find(account => address === account.address),
				);

				expect(allAccountsAreDelegate).toEqual(true);
			});

			it('should have correct vote weight for genesis delegates', async () => {
				// All delegates has vote weight of total supply
				const voteWeightOfDevnetDelegates = '10000000000000000';
				// Get accounts of delegate registeration
				const delegateRegistrationTransactions = genesisBlock.transactions.filter(
					transaction =>
						transaction.type === TRANSACTION_TYPE_DELEGATE_REGISTRATION,
				);
				const delegateAccountsAddressesInGenesisBlock = delegateRegistrationTransactions.map(
					transaction => transaction.senderId,
				);
				// Get delegate accounts in genesis block from the database
				const accountsFromDb = await Promise.all(
					delegateAccountsAddressesInGenesisBlock.map(address =>
						chainUtils.getAccount(storage, address),
					),
				);
				const allAccountsHaveCorrectVoteWeight = delegateAccountsAddressesInGenesisBlock.every(
					address =>
						accountsFromDb.find(
							account =>
								address === account.address &&
								account.vote === voteWeightOfDevnetDelegates,
						),
				);

				expect(allAccountsHaveCorrectVoteWeight).toEqual(true);
			});

			it('should have correct delegate list', async () => {
				const delegateListFromChain = await chainUtils.getDelegateList(
					chainModule,
					1,
				);
				expect(delegateListFromChain).toEqual(delegateListForTheFirstRound);
			});
		});
	});
});

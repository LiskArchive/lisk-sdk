/*
 * Copyright © 2019 Lisk Foundation
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
import {
	transfer,
	castVotes,
	TransactionJSON,
	BaseTransaction,
	registerDelegate,
	TransactionResponse,
} from '@liskhq/lisk-transactions';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { Chain } from '../../src';
import * as genesisBlock from '../fixtures/genesis_block.json';
import { genesisAccount } from '../fixtures/default_account';
import { registeredTransactions } from '../utils/registered_transactions';
import { Slots } from '../../src/slots';

jest.mock('events');

describe('blocks/transactions', () => {
	const constants = {
		blockReceiptTimeout: 20,
		loadPerIteration: 1000,
		maxPayloadLength: 15 * 1024,
		activeDelegates: 101,
		rewardDistance: 3000000,
		rewardOffset: 2160,
		rewardMileStones: [
			'500000000', // Initial Reward
			'400000000', // Milestone 1
			'300000000', // Milestone 2
			'200000000', // Milestone 3
			'100000000', // Milestone 4
		],
		totalAmount: '10000000000000000',
		blockSlotWindow: 5,
		blockTime: 10,
		epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
	};
	const networkIdentifier = getNetworkIdentifier(
		genesisBlock.payloadHash,
		genesisBlock.communityIdentifier,
	);

	let exceptions = {};
	let chainInstance: Chain;
	let storageStub: any;
	let slots: Slots;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Account: {
					get: jest.fn(),
					getOne: jest.fn(),
					update: jest.fn(),
				},
				Block: {
					begin: jest.fn(),
					create: jest.fn(),
					count: jest.fn(),
					getOne: jest.fn(),
					delete: jest.fn(),
					get: jest.fn(),
					isPersisted: jest.fn(),
				},
				Transaction: {
					get: jest.fn(),
					create: jest.fn(),
				},
				TempBlock: {
					create: jest.fn(),
					delete: jest.fn(),
					get: jest.fn(),
				},
			},
		};

		slots = new Slots({
			epochTime: constants.epochTime,
			interval: constants.blockTime,
		});
		exceptions = {
			transactions: [],
		};

		chainInstance = new Chain({
			storage: storageStub,
			genesisBlock,
			networkIdentifier,
			registeredTransactions,
			slots,
			exceptions,
			...constants,
		});
		(chainInstance as any)._lastBlock = {
			...genesisBlock,
			receivedAt: new Date(),
		};
	});

	describe('#filterReadyTransactions', () => {
		describe('when transactions include not allowed transaction based on the context', () => {
			it('should return transaction which are allowed', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '10000000000' },
				]);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const notAllowedTx = chainInstance.deserializeTransaction(
					registerDelegate({
						fee: '2500000000',
						nonce: '0',
						networkIdentifier,
						passphrase: genesisAccount.passphrase,
						username: 'notAllowed',
					}) as TransactionJSON,
				);
				const transactionClass = (chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.get(
					notAllowedTx.type,
				);
				Object.defineProperty(transactionClass.prototype, 'matcher', {
					get: () => () => false,
					configurable: true,
				});
				(chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.set(
					notAllowedTx.type,
					transactionClass,
				);
				// Act
				const result = await chainInstance.filterReadyTransactions(
					[validTx, notAllowedTx],
					{ blockTimestamp: 0, blockHeight: 1, blockVersion: 1 },
				);
				// Assert
				expect(result).toHaveLength(1);
				expect(result[0].id).toBe(validTx.id);
			});
		});

		describe('when transactions include not applicable transaction', () => {
			it('should return transaction which are applicable', async () => {
				// Arrange
				storageStub.entities.Account.get
					.mockResolvedValueOnce([
						{ address: genesisAccount.address, balance: '21000000' },
					])
					.mockResolvedValue([]);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '10000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const notAllowedTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				// Act
				const result = await chainInstance.filterReadyTransactions(
					[validTx, notAllowedTx],
					{ blockTimestamp: 0, blockHeight: 1, blockVersion: 1 },
				);
				// Assert
				expect(result).toHaveLength(1);
				expect(result[0].id).toBe(validTx.id);
			});
		});

		describe('when all transactions are allowed and applicable', () => {
			let result: BaseTransaction[];
			let validTx: BaseTransaction;
			let validTxSpy: jest.SpyInstance;
			let validTx2: BaseTransaction;
			let validTx2Spy: jest.SpyInstance;

			beforeEach(async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000' },
				]);
				validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				validTxSpy = jest.spyOn(validTx, 'apply');
				validTx2Spy = jest.spyOn(validTx2, 'apply');
				// Act
				result = await chainInstance.filterReadyTransactions(
					[validTx, validTx2],
					{ blockTimestamp: 0, blockHeight: 1, blockVersion: 1 },
				);
			});

			it('should return all transactions', async () => {
				// Assert
				expect(result).toHaveLength(2);
				expect(result[0].id).toBe(validTx.id);
				expect(result[1].id).toBe(validTx2.id);
			});

			it('should call apply for all transactions', async () => {
				// Assert
				expect(validTxSpy).toHaveBeenCalledTimes(1);
				expect(validTx2Spy).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('#validateTransactions', () => {
		describe('when transactions include not allowed transaction based on the context', () => {
			it('should return transaction response corresponds to the setup', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '10000000000' },
				]);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						fee: '10000000',
						nonce: '0',
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const notAllowedTx = chainInstance.deserializeTransaction(
					registerDelegate({
						networkIdentifier,
						fee: '2000000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						username: 'notAllowed',
					}) as TransactionJSON,
				);
				const transactionClass = (chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.get(
					notAllowedTx.type,
				);
				Object.defineProperty(transactionClass.prototype, 'matcher', {
					get: () => () => false,
					configurable: true,
				});
				(chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.set(
					notAllowedTx.type,
					transactionClass,
				);
				// Act
				const {
					transactionsResponses,
				} = await chainInstance.validateTransactions([validTx, notAllowedTx]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				) as TransactionResponse;
				const invalidResponse = transactionsResponses.find(
					res => res.id === notAllowedTx.id,
				) as TransactionResponse;
				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(1);
			});
		});

		describe('when transactions include invalid transaction', () => {
			it('should return transaction response corresponds to the setup', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '10000000000' },
				]);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const notAllowedTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				(notAllowedTx as any).signatures = ['invalid-signature'];
				// Act
				const {
					transactionsResponses,
				} = await chainInstance.validateTransactions([validTx, notAllowedTx]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				) as TransactionResponse;
				const invalidResponse = transactionsResponses.find(
					res => res.id === notAllowedTx.id,
				) as TransactionResponse;
				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(3);
			});
		});

		describe('when all transactions are valid', () => {
			let responses: TransactionResponse[];
			let validTxValidateSpy: jest.SpyInstance;
			let validTx2ValidateSpy: jest.SpyInstance;

			beforeEach(async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000' },
				]);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				validTxValidateSpy = jest.spyOn(validTx, 'validate');
				validTx2ValidateSpy = jest.spyOn(validTx2, 'validate');
				// Act
				const {
					transactionsResponses,
				} = await chainInstance.validateTransactions([validTx, validTx2]);
				responses = transactionsResponses as TransactionResponse[];
			});

			it('should return all transactions response which are all ok', async () => {
				// Assert
				expect(responses).toHaveLength(2);
				expect(responses.every(res => res.status === 1)).toBeTrue();
				expect(responses.every(res => res.errors.length === 0)).toBeTrue();
			});

			it('should invoke transaction validations', async () => {
				expect(validTxValidateSpy).toHaveBeenCalledTimes(1);
				expect(validTx2ValidateSpy).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('#verifyTransactions', () => {
		describe('when transactions include not allowed transaction based on the context', () => {
			it('should return transaction response corresponds to the setup', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '10000000000' },
				]);
				storageStub.entities.Transaction.get.mockResolvedValue([]);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const notAllowedTx = chainInstance.deserializeTransaction(
					registerDelegate({
						fee: '2500000000',
						nonce: '0',
						networkIdentifier,
						passphrase: genesisAccount.passphrase,
						username: 'notAllowed',
					}) as TransactionJSON,
				);
				const transactionClass = (chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.get(
					notAllowedTx.type,
				);
				Object.defineProperty(transactionClass.prototype, 'matcher', {
					get: () => () => false,
					configurable: true,
				});
				(chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.set(
					notAllowedTx.type,
					transactionClass,
				);
				// Act
				const {
					transactionsResponses,
				} = await chainInstance.verifyTransactions([validTx, notAllowedTx]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				) as TransactionResponse;
				const invalidResponse = transactionsResponses.find(
					res => res.id === notAllowedTx.id,
				) as TransactionResponse;
				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(1);
			});
		});

		describe('when transactions include existing transaction in database', () => {
			it('should return status FAIL for the existing transaction', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000' },
				]);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				storageStub.entities.Transaction.get.mockResolvedValue([validTx2]);
				// Act
				const {
					transactionsResponses,
				} = await chainInstance.verifyTransactions([validTx, validTx2]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				) as TransactionResponse;
				const invalidResponse = transactionsResponses.find(
					res => res.id === validTx2.id,
				) as TransactionResponse;
				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(1);
			});
		});

		describe('when all transactions are new and verifiable', () => {
			let responses: TransactionResponse[];
			let validTxApplySpy: jest.SpyInstance;
			let validTx2ApplySpy: jest.SpyInstance;

			beforeEach(async () => {
				// Arrange
				storageStub.entities.Account.get
					.mockResolvedValueOnce([
						{ address: genesisAccount.address, balance: '100000000' },
					])
					.mockResolvedValue([]);
				storageStub.entities.Transaction.get.mockResolvedValue([]);
				// Act
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '10000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '10000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				validTxApplySpy = jest.spyOn(validTx, 'apply');
				validTx2ApplySpy = jest.spyOn(validTx2, 'apply');
				// Act
				const {
					transactionsResponses,
				} = await chainInstance.verifyTransactions([validTx, validTx2]);
				responses = transactionsResponses as TransactionResponse[];
			});

			it('should return transaction with all status 1', async () => {
				expect(responses).toHaveLength(2);
				expect(responses.every(res => res.status === 1)).toBeTrue();
				expect(responses.every(res => res.errors.length === 0)).toBeTrue();
			});

			it('should call apply for all the transactions', async () => {
				expect(validTxApplySpy).toHaveBeenCalledTimes(1);
				expect(validTx2ApplySpy).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('#processTransactions', () => {
		describe('when transactions include existing transaction in database', () => {
			it('should return status FAIL for the existing transaction', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000' },
				]);

				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);

				const validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);

				storageStub.entities.Transaction.get.mockResolvedValue([validTx2]);
				// Act
				const {
					transactionsResponses,
				} = await chainInstance.processTransactions([validTx, validTx2]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);

				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				) as TransactionResponse;

				const invalidResponse = transactionsResponses.find(
					res => res.id === validTx2.id,
				) as TransactionResponse;

				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(1);
			});
		});

		describe('when transactions include not applicable transaction with current state', () => {
			it('should return status FAIL for the invalid transaction', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '10000100' },
				]);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const invalidTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '500',
						networkIdentifier,
					}) as TransactionJSON,
				);
				storageStub.entities.Transaction.get.mockResolvedValue([]);
				// Act
				const {
					transactionsResponses,
				} = await chainInstance.processTransactions([validTx, invalidTx]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				) as TransactionResponse;
				const invalidResponse = transactionsResponses.find(
					res => res.id === invalidTx.id,
				) as TransactionResponse;
				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(1);
			});
		});

		describe('when all transactions are new and veriable', () => {
			let responses: TransactionResponse[];
			let validTxApplySpy: jest.SpyInstance;
			let validTx2ApplySpy: jest.SpyInstance;
			let delegate1;
			let delegate2;

			beforeEach(async () => {
				// Arrange
				delegate1 = {
					address: '12890088834458000560L',
					publicKey:
						'2104c3882088fa512df4c64033a03cac911eec7e71dc03352cc2244dfc10a74c',
					username: 'genesis_200',
					voteWeight: '0',
				};
				delegate2 = {
					address: '1002903009718862306L',
					publicKey:
						'2c638a3b2fccbde21b6773a595e2abf697fbda1a5b8495f040f79a118e0b291c',
					username: 'genesis_201',
					voteWeight: '0',
				};
				storageStub.entities.Account.get.mockResolvedValue([
					{
						address: genesisAccount.address,
						balance: '10000000000',
						votedPublicKeys: [delegate1.publicKey, delegate2.publicKey],
					},
					delegate1,
					delegate2,
				]);
				storageStub.entities.Transaction.get.mockResolvedValue([]);
				// Act
				const validTx = chainInstance.deserializeTransaction(
					castVotes({
						fee: '100000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						networkIdentifier,
						votes: [delegate1.publicKey, delegate2.publicKey],
					}) as TransactionJSON,
				);
				const validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				validTxApplySpy = jest.spyOn(validTx, 'apply');
				validTx2ApplySpy = jest.spyOn(validTx2, 'apply');
				// Act
				const {
					transactionsResponses,
				} = await chainInstance.processTransactions([validTx, validTx2]);
				responses = transactionsResponses as TransactionResponse[];
			});

			it('should return transaction with all status 1', async () => {
				expect(responses).toHaveLength(2);
				expect(responses.every(res => res.status === 1)).toBeTrue();
				expect(responses.every(res => res.errors.length === 0)).toBeTrue();
			});

			it('should call apply for all the transactions', async () => {
				expect(validTxApplySpy).toHaveBeenCalledTimes(1);
				expect(validTx2ApplySpy).toHaveBeenCalledTimes(1);
			});
		});
	});
});

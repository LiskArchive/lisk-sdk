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
import { when } from 'jest-when';
import { Readable } from 'stream';
import {
	transfer,
	castVotes,
	TransactionJSON,
	BaseTransaction,
	registerDelegate,
	TransactionResponse,
} from '@liskhq/lisk-transactions';
import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { Chain } from '../../src';
import * as genesisBlock from '../fixtures/genesis_block.json';
import { genesisAccount } from '../fixtures/default_account';
import { registeredTransactions } from '../utils/registered_transactions';

jest.mock('events');
jest.mock('@liskhq/lisk-db');

describe('blocks/transactions', () => {
	const constants = {
		maxPayloadLength: 15 * 1024,
		rewardDistance: 3000000,
		rewardOffset: 2160,
		rewardMilestones: [
			'500000000', // Initial Reward
			'400000000', // Milestone 1
			'300000000', // Milestone 2
			'200000000', // Milestone 3
			'100000000', // Milestone 4
		],
		totalAmount: '10000000000000000',
		blockTime: 10,
		epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
	};
	const networkIdentifier = getNetworkIdentifier(
		genesisBlock.payloadHash,
		genesisBlock.communityIdentifier,
	);

	let chainInstance: Chain;
	let db: any;

	beforeEach(() => {
		db = new KVStore('temp');
		(db.createReadStream as jest.Mock).mockReturnValue(Readable.from([]));

		chainInstance = new Chain({
			db,
			genesisBlock,
			networkIdentifier,
			registeredTransactions,
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
				when(db.get)
					.mockRejectedValue(new NotFoundError('data not found') as never)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '1000000000000',
					} as never);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '10000000000',
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
					get: () => (): boolean => false,
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
				when(db.get)
					.mockRejectedValue(new NotFoundError('data not found') as never)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '210000000',
					} as never);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: 'a28d5e34007fd8fe6d7903044eb23a60fdad3c00',
						amount: '10000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const notAllowedTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: 'b28d5e34007fd8fe6d7903444eb23a60fdad3c11',
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
				when(db.get)
					.mockRejectedValue(new NotFoundError('data not found') as never)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '10000000000000',
					} as never);
				validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: 'a28d5e34007fd8fe6d7903044eb23a60fdad3c00',
						amount: '100000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '1',
						passphrase: genesisAccount.passphrase,
						recipientId: 'b28d5e34007fd8fe6d7903444eb23a60fdad3c11',
						amount: '100000000',
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

			it('should return all transactions', () => {
				// Assert
				expect(result).toHaveLength(2);
				expect(result[0].id).toBe(validTx.id);
				expect(result[1].id).toBe(validTx2.id);
			});

			it('should call apply for all transactions', () => {
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
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '10000000000',
					} as never);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						fee: '10000000',
						nonce: '0',
						recipientId: 'a28d5e34007fd8fe6d7903044eb23a60fdad3c00',
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
					get: () => (): boolean => false,
					configurable: true,
				});
				(chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.set(
					notAllowedTx.type,
					transactionClass,
				);
				// Act
				const transactionsResponses = await chainInstance.validateTransactions([
					validTx,
					notAllowedTx,
				]);
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
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '10000000000',
					} as never);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: 'a28d5e34007fd8fe6d7903044eb23a60fdad3c00',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const notAllowedTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: 'b28d5e34007fd8fe6d7903444eb23a60fdad3c11',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				(notAllowedTx as any).signatures = ['invalid-signature'];
				// Act
				const transactionsResponses = await chainInstance.validateTransactions([
					validTx,
					notAllowedTx,
				]);
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
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '100000000',
					} as never);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: 'a28d5e34007fd8fe6d7903044eb23a60fdad3c00',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: 'b28d5e34007fd8fe6d7903444eb23a60fdad3c11',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				validTxValidateSpy = jest.spyOn(validTx, 'validate');
				validTx2ValidateSpy = jest.spyOn(validTx2, 'validate');
				// Act
				const transactionsResponses = await chainInstance.validateTransactions([
					validTx,
					validTx2,
				]);
				responses = transactionsResponses as TransactionResponse[];
			});

			it('should return all transactions response which are all ok', () => {
				// Assert
				expect(responses).toHaveLength(2);
				expect(responses.every(res => res.status === 1)).toBeTrue();
				expect(responses.every(res => res.errors.length === 0)).toBeTrue();
			});

			it('should invoke transaction validations', () => {
				expect(validTxValidateSpy).toHaveBeenCalledTimes(1);
				expect(validTx2ValidateSpy).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('#applyTransactions', () => {
		describe('when transactions include not allowed transaction based on the context', () => {
			it('should return transaction response corresponds to the setup', async () => {
				// Arrange
				when(db.get)
					.mockRejectedValue(new NotFoundError('data not found') as never)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '100000000000',
					} as never);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: 'a28d5e34007fd8fe6d7903044eb23a60fdad3c00',
						amount: '100000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const notAllowedTx = chainInstance.deserializeTransaction(
					registerDelegate({
						fee: '2500000000',
						nonce: '1',
						networkIdentifier,
						passphrase: genesisAccount.passphrase,
						username: 'notAllowed',
					}) as TransactionJSON,
				);
				const transactionClass = (chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.get(
					notAllowedTx.type,
				);
				Object.defineProperty(transactionClass.prototype, 'matcher', {
					get: () => (): boolean => false,
					configurable: true,
				});
				(chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.set(
					notAllowedTx.type,
					transactionClass,
				);
				// Act
				const transactionsResponses = await chainInstance.applyTransactions([
					validTx,
					notAllowedTx,
				]);
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
				when(db.get)
					.mockRejectedValue(new NotFoundError('data not found') as never)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '10000000000',
					} as never);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: 'a28d5e34007fd8fe6d7903044eb23a60fdad3c00',
						amount: '100000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: 'b28d5e34007fd8fe6d7903444eb23a60fdad3c11',
						amount: '100000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				when(db.exists)
					.mockResolvedValue(false as never)
					.calledWith(`transactions:id:${validTx2.id}`)
					.mockResolvedValue(true as never);
				// Act
				const transactionsResponses = await chainInstance.applyTransactions([
					validTx,
					validTx2,
				]);
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

		describe('when all transactions are new and veriable', () => {
			let responses: TransactionResponse[];
			let validTxApplySpy: jest.SpyInstance;
			let validTx2ApplySpy: jest.SpyInstance;
			let delegate1;
			let delegate2;

			beforeEach(async () => {
				// Arrange
				delegate1 = {
					address: 'b01c191580cbe2b28b9df8836a49f0d3a1429137',
					publicKey:
						'2104c3882088fa512df4c64033a03cac911eec7e71dc03352cc2244dfc10a74c',
					username: 'genesis_200',
				};
				delegate2 = {
					address: 'e2817646f906eb0d7e2f2a9ccf5c6bf633a4c210',
					publicKey:
						'2c638a3b2fccbde21b6773a595e2abf697fbda1a5b8495f040f79a118e0b291c',
					username: 'genesis_201',
				};
				when(db.get)
					.mockRejectedValue(new NotFoundError('data not found') as never)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '10000000000',
					} as never)
					.calledWith(`accounts:address:${delegate1.address}`)
					.mockResolvedValue(delegate1 as never)
					.calledWith(`accounts:address:${delegate2.address}`)
					.mockResolvedValue(delegate2 as never);
				(db.exists as jest.Mock).mockResolvedValue(false as never);
				// Act
				const validTx = chainInstance.deserializeTransaction(
					castVotes({
						fee: '100000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						networkIdentifier,
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: '1000000000',
							},
							{
								delegateAddress: delegate2.address,
								amount: '1000000000',
							},
						],
					}) as TransactionJSON,
				);
				const validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '1',
						passphrase: genesisAccount.passphrase,
						recipientId: 'b28d5e34007fd8fe6d7903444eb23a60fdad3c11',
						amount: '100000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				validTxApplySpy = jest.spyOn(validTx, 'apply');
				validTx2ApplySpy = jest.spyOn(validTx2, 'apply');
				// Act
				const transactionsResponses = await chainInstance.applyTransactions([
					validTx,
					validTx2,
				]);
				responses = transactionsResponses;
			});

			it('should return transaction with all status 1', () => {
				expect(responses).toHaveLength(2);
				expect(responses.every(res => res.status === 1)).toBeTrue();
				expect(responses.every(res => res.errors.length === 0)).toBeTrue();
			});

			it('should call apply for all the transactions', () => {
				expect(validTxApplySpy).toHaveBeenCalledTimes(1);
				expect(validTx2ApplySpy).toHaveBeenCalledTimes(1);
			});
		});
	});
});

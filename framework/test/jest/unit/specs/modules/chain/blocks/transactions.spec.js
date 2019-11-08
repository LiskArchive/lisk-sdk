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

'use strict';

const {
	transfer,
	castVotes,
	registerSecondPassphrase,
	createSignatureObject,
} = require('@liskhq/lisk-transactions');
const { getNetworkIdentifier } = require('@liskhq/lisk-cryptography');
const { Slots } = require('../../../../../../../src/modules/chain/dpos');
const { Blocks } = require('../../../../../../../src/modules/chain/blocks');
const genesisBlock = require('../../../../../../fixtures/config/devnet/genesis_block.json');
const { genesisAccount } = require('./default_account');
const {
	registeredTransactions,
} = require('../../../../../utils/registered_transactions');

jest.mock('events');

describe('blocks/transactions', () => {
	const constants = {
		blockReceiptTimeout: 20,
		loadPerIteration: 1000,
		maxPayloadLength: 1024 * 1024,
		maxTransactionsPerBlock: 25,
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
	let blocksInstance;
	let storageStub;
	let loggerStub;
	let slots;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Account: {
					get: jest.fn(),
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
		loggerStub = {
			debug: jest.fn(),
			log: jest.fn(),
			error: jest.fn(),
		};
		slots = new Slots({
			epochTime: constants.epochTime,
			interval: constants.blockTime,
			blocksPerRound: constants.activeDelegates,
		});
		exceptions = {
			transactions: [],
		};

		blocksInstance = new Blocks({
			storage: storageStub,
			logger: loggerStub,
			genesisBlock,
			networkIdentifier,
			registeredTransactions,
			slots,
			exceptions,
			...constants,
		});
		blocksInstance._lastBlock = {
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
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const notAllowedTx = blocksInstance.deserializeTransaction(
					registerSecondPassphrase({
						passphrase: genesisAccount.passphrase,
						secondPassphrase: 'second-passphrase',
						networkIdentifier,
					}),
				);
				const transactionClass = blocksInstance._transactionAdapter.transactionClassMap.get(
					notAllowedTx.type,
				);
				Object.defineProperty(transactionClass.prototype, 'matcher', {
					get: () => () => false,
					configurable: true,
				});
				blocksInstance._transactionAdapter.transactionClassMap.set(
					notAllowedTx.type,
					transactionClass,
				);
				// Act
				const result = await blocksInstance.filterReadyTransactions(
					[validTx, notAllowedTx],
					{ blockTimestamp: 0 },
				);
				// Assert
				expect(result).toHaveLength(1);
				expect(result[0].id).toBe(validTx.id);
			});
		});

		describe('when transactions include not applicable transaction', () => {
			it('should return transaction which are applicable', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '10000100' },
				]);
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const notAllowedTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}),
				);
				// Act
				const result = await blocksInstance.filterReadyTransactions(
					[validTx, notAllowedTx],
					{ blockTimestamp: 0 },
				);
				// Assert
				expect(result).toHaveLength(1);
				expect(result[0].id).toBe(validTx.id);
			});
		});

		describe('when all transactions are allowed and applicable', () => {
			let result;
			let validTx;
			let validTxSpy;
			let validTx2;
			let validTx2Spy;

			beforeEach(async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000' },
				]);
				validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				validTx2 = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}),
				);
				validTxSpy = jest.spyOn(validTx, 'apply');
				validTx2Spy = jest.spyOn(validTx2, 'apply');
				// Act
				result = await blocksInstance.filterReadyTransactions(
					[validTx, validTx2],
					{ blockTimestamp: 0 },
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
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const notAllowedTx = blocksInstance.deserializeTransaction(
					registerSecondPassphrase({
						passphrase: genesisAccount.passphrase,
						secondPassphrase: 'second-passphrase',
						networkIdentifier,
					}),
				);
				const transactionClass = blocksInstance._transactionAdapter.transactionClassMap.get(
					notAllowedTx.type,
				);
				Object.defineProperty(transactionClass.prototype, 'matcher', {
					get: () => () => false,
					configurable: true,
				});
				blocksInstance._transactionAdapter.transactionClassMap.set(
					notAllowedTx.type,
					transactionClass,
				);
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.validateTransactions([validTx, notAllowedTx]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				);
				const invalidResponse = transactionsResponses.find(
					res => res.id === notAllowedTx.id,
				);
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
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const notAllowedTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}),
				);
				notAllowedTx._signature = 'invalid-signature';
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.validateTransactions([validTx, notAllowedTx]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				);
				const invalidResponse = transactionsResponses.find(
					res => res.id === notAllowedTx.id,
				);
				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(1);
			});
		});

		describe('when all transactions are valid', () => {
			let responses;
			let validTxValidateSpy;
			let validTx2ValidateSpy;

			beforeEach(async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000' },
				]);
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const validTx2 = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}),
				);
				validTxValidateSpy = jest.spyOn(validTx, 'validate');
				validTx2ValidateSpy = jest.spyOn(validTx2, 'validate');
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.validateTransactions([validTx, validTx2]);
				responses = transactionsResponses;
			});

			it('should return all transactions response which are all ok', async () => {
				// Assert
				expect(responses).toHaveLength(2);
				expect(responses.every(res => res.status === 1)).toBeTrue();
				expect(responses.every(res => res.errors.length === 0)).toBeTrue();
			});

			it('should return all transactions response which are all ok', async () => {
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
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const notAllowedTx = blocksInstance.deserializeTransaction(
					registerSecondPassphrase({
						passphrase: genesisAccount.passphrase,
						secondPassphrase: 'second-passphrase',
						networkIdentifier,
					}),
				);
				const transactionClass = blocksInstance._transactionAdapter.transactionClassMap.get(
					notAllowedTx.type,
				);
				Object.defineProperty(transactionClass.prototype, 'matcher', {
					get: () => () => false,
					configurable: true,
				});
				blocksInstance._transactionAdapter.transactionClassMap.set(
					notAllowedTx.type,
					transactionClass,
				);
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.verifyTransactions([validTx, notAllowedTx]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				);
				const invalidResponse = transactionsResponses.find(
					res => res.id === notAllowedTx.id,
				);
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
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const validTx2 = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}),
				);
				storageStub.entities.Transaction.get.mockResolvedValue([validTx2]);
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.verifyTransactions([validTx, validTx2]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				);
				const invalidResponse = transactionsResponses.find(
					res => res.id === validTx2.id,
				);
				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(1);
			});
		});

		describe('when transactions include not verifiable transaction with current state', () => {
			it('should return status FAIL for the invalid transaction', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '10000100' },
				]);
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const invalidTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '500',
						networkIdentifier,
					}),
				);
				storageStub.entities.Transaction.get.mockResolvedValue([]);
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.verifyTransactions([validTx, invalidTx]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				);
				const invalidResponse = transactionsResponses.find(
					res => res.id === invalidTx.id,
				);
				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(1);
			});

			it('should return status FAIL for the future transaction', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '1000000000' },
				]);
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const invalidTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '500',
						networkIdentifier,
						timeOffset: 114748364,
					}),
				);
				storageStub.entities.Transaction.get.mockResolvedValue([]);
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.verifyTransactions([validTx, invalidTx]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				);
				const invalidResponse = transactionsResponses.find(
					res => res.id === invalidTx.id,
				);
				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(1);
			});
		});

		describe('when all transactions are new and verifiable', () => {
			let responses;
			let validTxApplySpy;
			let validTx2ApplySpy;

			beforeEach(async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000' },
				]);
				storageStub.entities.Transaction.get.mockResolvedValue([]);
				// Act
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const validTx2 = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}),
				);
				validTxApplySpy = jest.spyOn(validTx, 'apply');
				validTx2ApplySpy = jest.spyOn(validTx2, 'apply');
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.verifyTransactions([validTx, validTx2]);
				responses = transactionsResponses;
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
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const validTx2 = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}),
				);
				storageStub.entities.Transaction.get.mockResolvedValue([validTx2]);
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.processTransactions([validTx, validTx2]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				);
				const invalidResponse = transactionsResponses.find(
					res => res.id === validTx2.id,
				);
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
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const invalidTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '500',
						networkIdentifier,
					}),
				);
				storageStub.entities.Transaction.get.mockResolvedValue([]);
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.processTransactions([validTx, invalidTx]);
				// Assert
				expect(transactionsResponses).toHaveLength(2);
				const validResponse = transactionsResponses.find(
					res => res.id === validTx.id,
				);
				const invalidResponse = transactionsResponses.find(
					res => res.id === invalidTx.id,
				);
				expect(validResponse.status).toBe(1);
				expect(validResponse.errors).toBeEmpty();
				expect(invalidResponse.status).toBe(0);
				expect(invalidResponse.errors).toHaveLength(1);
			});
		});

		describe('when all transactions are new and veriable', () => {
			let responses;
			let validTxApplySpy;
			let validTx2ApplySpy;
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
				const validTx = blocksInstance.deserializeTransaction(
					castVotes({
						passphrase: genesisAccount.passphrase,
						networkIdentifier,
						votes: [delegate1.publicKey, delegate2.publicKey],
					}),
				);
				const validTx2 = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}),
				);
				validTxApplySpy = jest.spyOn(validTx, 'apply');
				validTx2ApplySpy = jest.spyOn(validTx2, 'apply');
				// Act
				const {
					transactionsResponses,
				} = await blocksInstance.processTransactions([validTx, validTx2]);
				responses = transactionsResponses;
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

	describe('#processSignature', () => {
		describe('when transaction fails to add signature', () => {
			it('should return invalid transaction response', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '10000100' },
				]);
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const signatureObject = {
					transactionId: validTx.id,
					publicKey:
						'2104c3882088fa512df4c64033a03cac911eec7e71dc03352cc2244dfc10a74c',
					// Invalid signature
					signature:
						'a8872f1ad9fb6603e233565d336dad80e43fb598f2461b955eed4b4eec544ef5fe7f88a54fed31a8e90f3565bf3ed48b1b5e5bdf4488312ba449eebbcff98f0d',
				};
				// Act
				const transactionResponse = await blocksInstance.processSignature(
					validTx,
					signatureObject,
				);
				// Assert
				expect(transactionResponse.status).toBe(0);
				expect(transactionResponse.errors).toHaveLength(1);
				expect(transactionResponse.errors[0].message).toContain(
					'Failed to add signature',
				);
			});
		});

		describe('when transaction successfully add signature', () => {
			const defaultSecondPassphrase = {
				passphrase:
					'tornado metal foster prefer crucial note slim demise vicious weasel tobacco civil',
				publicKey:
					'2f16cad638f254316ea077ed45c81c09c380ce9df4c7e530ff14f3a14cc49ae5',
			};
			it('should return success transaction response', async () => {
				// Arrange
				storageStub.entities.Account.get.mockResolvedValue([
					{
						address: genesisAccount.address,
						balance: '10000100',
						membersPublicKeys: [defaultSecondPassphrase.publicKey],
						multiMin: 2,
					},
				]);
				const transactionJSON = transfer({
					passphrase: genesisAccount.passphrase,
					recipientId: '123L',
					amount: '100',
					networkIdentifier,
				});
				const validTx = blocksInstance.deserializeTransaction(transactionJSON);
				const signatureObject = createSignatureObject({
					transaction: transactionJSON,
					passphrase: defaultSecondPassphrase.passphrase,
					networkIdentifier,
				});
				// Act
				const transactionResponse = await blocksInstance.processSignature(
					validTx,
					signatureObject,
				);
				// Assert
				expect(transactionResponse.status).toBe(2); // Pending status
				expect(transactionResponse.errors).toHaveLength(1);
			});
		});
	});
});

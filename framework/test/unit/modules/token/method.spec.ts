/*
 * Copyright © 2022 Lisk Foundation
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
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { TokenMethod, TokenModule } from '../../../../src/modules/token';
import {
	CCM_STATUS_OK,
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_NAME_FORWARD,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	EMPTY_BYTES,
	TOKEN_ID_LENGTH,
} from '../../../../src/modules/token/constants';
import {
	crossChainForwardMessageParams,
	crossChainTransferMessageParams,
} from '../../../../src/modules/token/schemas';
import { AvailableLocalIDStore } from '../../../../src/modules/token/stores/available_local_id';
import { EscrowStore } from '../../../../src/modules/token/stores/escrow';
import { SupplyStore } from '../../../../src/modules/token/stores/supply';
import { UserStore } from '../../../../src/modules/token/stores/user';
import { MethodContext, createMethodContext, EventQueue } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { DEFAULT_TOKEN_ID } from '../../../utils/mocks/transaction';

describe('token module', () => {
	const tokenModule = new TokenModule();
	const defaultAddress = utils.getRandomBytes(20);
	const defaultTokenIDAlias = Buffer.alloc(TOKEN_ID_LENGTH, 0);
	const defaultTokenID = Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]);
	const defaultForeignTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
	const defaultAccount = {
		availableBalance: BigInt(10000000000),
		lockedBalances: [
			{
				module: 'dpos',
				amount: BigInt(100000000),
			},
		],
	};
	const defaultTotalSupply = BigInt('100000000000000');
	const defaultEscrowAmount = BigInt('100000000000');

	let method: TokenMethod;
	let methodContext: MethodContext;

	beforeEach(async () => {
		method = new TokenMethod(tokenModule.stores, tokenModule.events, tokenModule.name);
		method.init({
			minBalances: [
				{
					tokenID: DEFAULT_TOKEN_ID,
					amount: BigInt(5000000),
				},
			],
		});
		method.addDependencies({
			getOwnChainAccount: jest.fn().mockResolvedValue({ id: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn().mockResolvedValue(true),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
			getChainAccount: jest.fn(),
		} as never);
		methodContext = createMethodContext({
			stateStore: new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()),
			eventQueue: new EventQueue(0),
		});
		const userStore = tokenModule.stores.get(UserStore);
		await userStore.set(
			methodContext,
			userStore.getKey(defaultAddress, defaultTokenIDAlias),
			defaultAccount,
		);
		await userStore.set(
			methodContext,
			userStore.getKey(defaultAddress, defaultForeignTokenID),
			defaultAccount,
		);

		const supplyStore = tokenModule.stores.get(SupplyStore);
		await supplyStore.set(methodContext, defaultTokenIDAlias.slice(CHAIN_ID_LENGTH), {
			totalSupply: defaultTotalSupply,
		});

		const nextAvailableLocalIDStore = tokenModule.stores.get(AvailableLocalIDStore);
		await nextAvailableLocalIDStore.set(methodContext, EMPTY_BYTES, {
			nextAvailableLocalID: Buffer.from([0, 0, 0, 5]),
		});

		const escrowStore = tokenModule.stores.get(EscrowStore);
		await escrowStore.set(
			methodContext,
			Buffer.concat([
				defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			]),
			{ amount: defaultEscrowAmount },
		);
	});

	describe('getAvailableBalance', () => {
		it('should return zero if data does not exist', async () => {
			await expect(
				method.getAvailableBalance(methodContext, utils.getRandomBytes(20), defaultTokenID),
			).resolves.toEqual(BigInt(0));
		});

		it('should return balance if data exists', async () => {
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance);
		});
	});

	describe('getLockedAmount', () => {
		it('should return zero if data does not exist', async () => {
			await expect(
				method.getLockedAmount(methodContext, utils.getRandomBytes(20), defaultTokenID, 'auth'),
			).resolves.toEqual(BigInt(0));
			await expect(
				method.getLockedAmount(methodContext, defaultAddress, defaultTokenID, 'auth'),
			).resolves.toEqual(BigInt(0));
		});

		it('should return balance if data exists', async () => {
			await expect(
				method.getLockedAmount(methodContext, defaultAddress, defaultTokenID, 'dpos'),
			).resolves.toEqual(defaultAccount.lockedBalances[0].amount);
		});
	});

	describe('getEscrowedAmount', () => {
		it('should reject if token is native', async () => {
			await expect(
				method.getEscrowedAmount(
					methodContext,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
					defaultForeignTokenID,
				),
			).rejects.toThrow('Only native token can have escrow amount');
		});

		it('should return zero if data does not exist', async () => {
			await expect(
				method.getEscrowedAmount(
					methodContext,
					Buffer.from([1, 0, 0, 0]),
					Buffer.from([0, 0, 0, 1, 0, 0, 0, 1]),
				),
			).resolves.toEqual(BigInt(0));
		});

		it('should return balance if data exists', async () => {
			await expect(
				method.getEscrowedAmount(
					methodContext,
					Buffer.from([1, 0, 0, 0]),
					Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]),
				),
			).resolves.toEqual(defaultEscrowAmount);
		});
	});

	describe('accountExists', () => {
		it('should return true if account exist', async () => {
			await expect(method.accountExists(methodContext, defaultAddress)).resolves.toBeTrue();
		});

		it('should return false if account does not exist', async () => {
			await expect(
				method.accountExists(methodContext, utils.getRandomBytes(20)),
			).resolves.toBeFalse();
		});
	});

	describe('getNextAvailableLocalID', () => {
		it('should return next available local ID', async () => {
			await expect(method.getNextAvailableLocalID(methodContext)).resolves.toEqual(
				Buffer.from([0, 0, 0, 5]),
			);
		});
	});

	describe('initializeToken', () => {
		it('should reject if supply already exist', async () => {
			await expect(
				method.initializeToken(methodContext, defaultTokenID.slice(CHAIN_ID_LENGTH)),
			).rejects.toThrow('Token is already initialized');
		});

		it('should not update next available local ID if local ID is less than existing one', async () => {
			await expect(
				method.initializeToken(methodContext, Buffer.from([0, 0, 0, 2])),
			).resolves.toBeUndefined();
			await expect(method.getNextAvailableLocalID(methodContext)).resolves.toEqual(
				Buffer.from([0, 0, 0, 5]),
			);
		});

		it('should update next available local ID if local ID is greater than existing one', async () => {
			await expect(
				method.initializeToken(methodContext, Buffer.from([0, 0, 0, 7])),
			).resolves.toBeUndefined();
			await expect(method.getNextAvailableLocalID(methodContext)).resolves.toEqual(
				Buffer.from([0, 0, 0, 8]),
			);
		});
	});

	describe('mint', () => {
		it('should reject if token is not native', async () => {
			await expect(
				method.mint(methodContext, defaultAddress, defaultForeignTokenID, BigInt(10000)),
			).rejects.toThrow('Only native token can be minted');
		});

		it('should reject if amount is less than zero', async () => {
			await expect(
				method.mint(methodContext, defaultAddress, defaultTokenID, BigInt(-1)),
			).rejects.toThrow('Amount must be a positive integer to mint');
		});

		it('should reject if supply does not exist', async () => {
			await expect(
				method.mint(
					methodContext,
					defaultAddress,
					Buffer.from([0, 0, 0, 1, 0, 0, 0, 3]),
					BigInt(100),
				),
			).rejects.toThrow('is not initialized to mint');
		});

		it('should reject if supply exceeds max uint64', async () => {
			await expect(
				method.mint(methodContext, defaultAddress, defaultTokenID, BigInt(2) ** BigInt(64)),
			).rejects.toThrow('Supply cannot exceed MAX_UINT64');
		});

		it.todo('should reject if recipient does not exist and minBalance is not set');
		it.todo('should reject if recipient does not exist and amount is less than minBalance');

		it('should update recipient balance and total supply', async () => {
			await expect(
				method.mint(methodContext, defaultAddress, defaultTokenID, BigInt(10000)),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(10000));
			const supplyStore = tokenModule.stores.get(SupplyStore);
			const { totalSupply } = await supplyStore.get(
				methodContext,
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			);
			expect(totalSupply).toEqual(defaultTotalSupply + BigInt(10000));
		});
	});

	describe('burn', () => {
		it('should reject if token is not native', async () => {
			await expect(
				method.burn(methodContext, defaultAddress, defaultForeignTokenID, BigInt(10000)),
			).rejects.toThrow('Only native token can be burnt');
		});

		it('should reject amount is less than zero', async () => {
			await expect(
				method.burn(methodContext, defaultAddress, defaultTokenID, BigInt(-1)),
			).rejects.toThrow('Amount must be a positive integer to burn');
		});

		it('should reject if address does not have enough balance', async () => {
			await expect(
				method.burn(
					methodContext,
					defaultAddress,
					defaultTokenID,
					defaultAccount.availableBalance + BigInt(1),
				),
			).rejects.toThrow('is not sufficient for');
		});

		it('should update address balance and total supply', async () => {
			await expect(
				method.burn(methodContext, defaultAddress, defaultTokenID, defaultAccount.availableBalance),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(BigInt(0));

			const supplyStore = tokenModule.stores.get(SupplyStore);
			const { totalSupply } = await supplyStore.get(
				methodContext,
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			);
			expect(totalSupply).toEqual(defaultTotalSupply - defaultAccount.availableBalance);
		});
	});

	describe('lock', () => {
		it('should reject amount is less than zero', async () => {
			await expect(
				method.lock(methodContext, defaultAddress, 'dpos', defaultTokenID, BigInt(-1)),
			).rejects.toThrow('Amount must be a positive integer to lock');
		});

		it('should reject if address does not have enough balance', async () => {
			await expect(
				method.lock(
					methodContext,
					defaultAddress,
					'dpos',
					defaultTokenID,
					defaultAccount.availableBalance + BigInt(1),
				),
			).rejects.toThrow('is not sufficient for');
		});

		it('should update address balance', async () => {
			await expect(
				method.lock(
					methodContext,
					defaultAddress,
					'token',
					defaultTokenID,
					defaultAccount.availableBalance,
				),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(BigInt(0));
		});

		it('should update locked balances to be sorted by module ID', async () => {
			await expect(
				method.lock(
					methodContext,
					defaultAddress,
					'token',
					defaultTokenID,
					defaultAccount.availableBalance,
				),
			).resolves.toBeUndefined();
			const userStore = tokenModule.stores.get(UserStore);
			const { lockedBalances } = await userStore.get(
				methodContext,
				userStore.getKey(defaultAddress, defaultTokenIDAlias),
			);
			expect(lockedBalances[0].module).toEqual('dpos');
		});
	});

	describe('unlock', () => {
		it('should reject amount is less than zero', async () => {
			await expect(
				method.unlock(methodContext, defaultAddress, 'dpos', defaultTokenID, BigInt(-1)),
			).rejects.toThrow('Amount must be a positive integer to unlock');
		});

		it('should reject if address does not have any corresponding locked balance for the specified module', async () => {
			await expect(
				method.unlock(methodContext, defaultAddress, 'sample', defaultTokenID, BigInt(100)),
			).rejects.toThrow('No balance is locked for module sample');
		});

		it('should reject if address does not have sufficient corresponding locked balance for the specified module', async () => {
			await expect(
				method.unlock(
					methodContext,
					defaultAddress,
					'dpos',
					defaultTokenID,
					defaultAccount.lockedBalances[0].amount + BigInt(1),
				),
			).rejects.toThrow('Not enough amount is locked for module dpos to unlock');
		});

		it('should update address balance', async () => {
			await expect(
				method.unlock(
					methodContext,
					defaultAddress,
					'dpos',
					defaultTokenID,
					defaultAccount.lockedBalances[0].amount - BigInt(1),
				),
			).resolves.toBeUndefined();
			const userStore = tokenModule.stores.get(UserStore);
			const { lockedBalances } = await userStore.get(
				methodContext,
				userStore.getKey(defaultAddress, defaultTokenIDAlias),
			);
			expect(lockedBalances[0].amount).toEqual(BigInt(1));
		});

		it('should remove lockedBalances entry if amount becomes zero', async () => {
			await expect(
				method.unlock(
					methodContext,
					defaultAddress,
					'dpos',
					defaultTokenID,
					defaultAccount.lockedBalances[0].amount,
				),
			).resolves.toBeUndefined();
			const userStore = tokenModule.stores.get(UserStore);
			const { lockedBalances } = await userStore.get(
				methodContext,
				userStore.getKey(defaultAddress, defaultTokenIDAlias),
			);
			expect(lockedBalances).toHaveLength(0);
		});
	});

	describe('transferCrossChain', () => {
		it('should reject when amount is less than zero', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultTokenID.slice(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt('-3'),
					BigInt('10000'),
					'data',
				),
			).rejects.toThrow('Amount must be greater or equal to zero');
		});

		it('should reject when sender address length is invalid', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress.slice(1),
					defaultTokenID.slice(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt('100'),
					BigInt('10000'),
					'data',
				),
			).rejects.toThrow('Invalid sender address');
		});

		it('should reject when recipient address length is invalid', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultTokenID.slice(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(19),
					defaultTokenID,
					BigInt('100'),
					BigInt('10000'),
					'data',
				),
			).rejects.toThrow('Invalid recipient address');
		});

		it('should reject when sender balance is less than amount', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultTokenID.slice(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					defaultAccount.availableBalance + BigInt(100000),
					BigInt('10000'),
					'data',
				),
			).rejects.toThrow('is not sufficient for');
		});

		it('should not update sender balance if send fail and chain id is native chain', async () => {
			jest.spyOn(method['_interoperabilityMethod'], 'send').mockResolvedValue(false);
			await method.transferCrossChain(
				methodContext,
				defaultAddress,
				defaultTokenID.slice(0, CHAIN_ID_LENGTH),
				utils.getRandomBytes(20),
				defaultTokenID,
				defaultAccount.availableBalance,
				BigInt('10000'),
				'data',
			);

			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance);
		});

		it('should not update sender balance if send fail and chain id is mainchain', async () => {
			jest.spyOn(method['_interoperabilityMethod'], 'send').mockResolvedValue(false);
			jest
				.spyOn(method['_interoperabilityMethod'], 'getOwnChainAccount')
				.mockResolvedValue({ id: Buffer.from([0, 0, 0, 2]) } as never);
			const receivingChainID = Buffer.from([0, 0, 0, 3]);
			const messageFee = BigInt('10000');
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.set(
				methodContext,
				userStore.getKey(defaultAddress, defaultTokenID),
				defaultAccount,
			);
			await method.transferCrossChain(
				methodContext,
				defaultAddress,
				receivingChainID,
				utils.getRandomBytes(20),
				defaultTokenID,
				defaultAccount.availableBalance - messageFee,
				messageFee,
				'data',
			);
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance);
		});

		describe('when chainID is native chain', () => {
			beforeEach(async () => {
				jest.spyOn(codec, 'encode');
				await method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultTokenID.slice(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					defaultAccount.availableBalance,
					BigInt('10000'),
					'data',
				);
			});

			it('should send transfer message', () => {
				expect(codec.encode).toHaveBeenCalledWith(crossChainTransferMessageParams, {
					tokenID: Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]),
					amount: defaultAccount.availableBalance,
					senderAddress: defaultAddress,
					recipientAddress: expect.any(Buffer),
					data: 'data',
				});
				expect(method['_interoperabilityMethod'].send).toHaveBeenCalledWith(
					methodContext,
					defaultAddress,
					method['_moduleName'],
					CROSS_CHAIN_COMMAND_NAME_TRANSFER,
					defaultTokenID.slice(0, CHAIN_ID_LENGTH),
					BigInt('10000'),
					CCM_STATUS_OK,
					expect.any(Buffer),
				);
			});

			it('should deduct amount from sender', async () => {
				await expect(
					method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
				).resolves.toEqual(BigInt(0));
			});

			it('should add amount to escrow', async () => {
				await expect(
					method.getEscrowedAmount(
						methodContext,
						defaultTokenID.slice(0, CHAIN_ID_LENGTH),
						defaultTokenID,
					),
				).resolves.toEqual(defaultAccount.availableBalance);
			});
		});

		describe('when chainID is receiving chain id', () => {
			beforeEach(async () => {
				jest.spyOn(codec, 'encode');
				jest.spyOn(tokenModule.stores, 'get');
				await method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultForeignTokenID,
					defaultAccount.availableBalance,
					BigInt('10000'),
					'data',
				);
			});

			it('should send transfer message', () => {
				expect(codec.encode).toHaveBeenCalledWith(crossChainTransferMessageParams, {
					tokenID: Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
					amount: defaultAccount.availableBalance,
					senderAddress: defaultAddress,
					recipientAddress: expect.any(Buffer),
					data: 'data',
				});
				expect(method['_interoperabilityMethod'].send).toHaveBeenCalledWith(
					methodContext,
					defaultAddress,
					method['_moduleName'],
					CROSS_CHAIN_COMMAND_NAME_TRANSFER,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
					BigInt('10000'),
					CCM_STATUS_OK,
					expect.any(Buffer),
				);
			});

			it('should deduct amount from sender', async () => {
				await expect(
					method.getAvailableBalance(methodContext, defaultAddress, defaultForeignTokenID),
				).resolves.toEqual(BigInt(0));
			});

			it('should not add amount to escrow', () => {
				expect(tokenModule.stores.get).not.toHaveBeenCalledWith(EscrowStore);
			});
		});

		describe('when chainID is mainchain id', () => {
			const messageFee = BigInt('10000');
			const receivingChainID = Buffer.from([0, 0, 0, 3]);

			beforeEach(async () => {
				jest.spyOn(codec, 'encode');
				jest
					.spyOn(method['_interoperabilityMethod'], 'getOwnChainAccount')
					.mockResolvedValue({ id: Buffer.from([0, 0, 0, 2]) } as never);
				const userStore = tokenModule.stores.get(UserStore);
				await userStore.set(
					methodContext,
					userStore.getKey(defaultAddress, defaultTokenID),
					defaultAccount,
				);
				await method.transferCrossChain(
					methodContext,
					defaultAddress,
					receivingChainID,
					utils.getRandomBytes(20),
					defaultTokenID,
					defaultAccount.availableBalance - messageFee,
					messageFee,
					'data',
				);
			});

			it('should fail if sender does not have amount + messageFee', async () => {
				await expect(
					method.transferCrossChain(
						methodContext,
						defaultAddress,
						receivingChainID,
						utils.getRandomBytes(20),
						defaultTokenID,
						defaultAccount.availableBalance,
						BigInt('10000'),
						'data',
					),
				).rejects.toThrow('is not sufficient for');
			});

			it('should forward transfer message', () => {
				expect(codec.encode).toHaveBeenCalledWith(crossChainForwardMessageParams, {
					tokenID: Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]),
					amount: defaultAccount.availableBalance - messageFee,
					senderAddress: defaultAddress,
					forwardToChainID: receivingChainID,
					recipientAddress: expect.any(Buffer),
					data: 'data',
					forwardedMessageFee: messageFee,
				});
				expect(method['_interoperabilityMethod'].send).toHaveBeenCalledWith(
					methodContext,
					defaultAddress,
					method['_moduleName'],
					CROSS_CHAIN_COMMAND_NAME_FORWARD,
					defaultTokenID.slice(0, CHAIN_ID_LENGTH),
					BigInt('0'),
					CCM_STATUS_OK,
					expect.any(Buffer),
				);
			});

			it('should deduct amount and message fee from sender', async () => {
				await expect(
					method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
				).resolves.toEqual(BigInt(0));
			});
		});
	});
});

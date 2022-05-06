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
import { StateStore } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { TokenAPI } from '../../../../src/modules/token';
import {
	CHAIN_ID_LENGTH,
	EMPTY_BYTES,
	MODULE_ID_TOKEN,
	STORE_PREFIX_AVAILABLE_LOCAL_ID,
	STORE_PREFIX_ESCROW,
	STORE_PREFIX_SUPPLY,
	STORE_PREFIX_USER,
	TOKEN_ID_LENGTH,
} from '../../../../src/modules/token/constants';
import {
	availableLocalIDStoreSchema,
	escrowStoreSchema,
	SupplyStoreData,
	supplyStoreSchema,
	UserStoreData,
	userStoreSchema,
} from '../../../../src/modules/token/schemas';
import { getUserStoreKey } from '../../../../src/modules/token/utils';
import { APIContext, createAPIContext, EventQueue } from '../../../../src/node/state_machine';
import { DEFAULT_TOKEN_ID } from '../../../utils/node/transaction';

describe('token module', () => {
	const defaultAddress = getRandomBytes(20);
	const defaultTokenIDAlias = Buffer.alloc(TOKEN_ID_LENGTH, 0);
	const defaultTokenID = Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]);
	const defaultForeginTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
	const defaultAccount = {
		availableBalance: BigInt(10000000000),
		lockedBalances: [
			{
				moduleID: 12,
				amount: BigInt(100000000),
			},
		],
	};
	const defaultTotalSupply = BigInt('100000000000000');
	const defaultEscrowAmount = BigInt('100000000000');

	let api: TokenAPI;
	let apiContext: APIContext;

	beforeEach(async () => {
		api = new TokenAPI(MODULE_ID_TOKEN);
		api.init({
			minBalances: [
				{
					tokenID: DEFAULT_TOKEN_ID,
					amount: BigInt(5000000),
				},
			],
		});
		api.addDependencies({
			getOwnChainAccount: jest.fn().mockResolvedValue({ id: Buffer.from([0, 0, 0, 1]) }),
		});
		apiContext = createAPIContext({
			stateStore: new StateStore(new InMemoryKVStore()),
			eventQueue: new EventQueue(),
		});
		const userStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
		await userStore.setWithSchema(
			getUserStoreKey(defaultAddress, defaultTokenIDAlias),
			defaultAccount,
			userStoreSchema,
		);
		await userStore.setWithSchema(
			getUserStoreKey(defaultAddress, defaultForeginTokenID),
			defaultAccount,
			userStoreSchema,
		);

		const supplyStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_SUPPLY);
		await supplyStore.setWithSchema(
			defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			{ totalSupply: defaultTotalSupply },
			supplyStoreSchema,
		);

		const nextAvailableLocalIDStore = apiContext.getStore(
			MODULE_ID_TOKEN,
			STORE_PREFIX_AVAILABLE_LOCAL_ID,
		);
		await nextAvailableLocalIDStore.setWithSchema(
			EMPTY_BYTES,
			{ nextAvailableLocalID: Buffer.from([0, 0, 0, 5]) },
			availableLocalIDStoreSchema,
		);

		const escrowStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_ESCROW);
		await escrowStore.setWithSchema(
			Buffer.concat([
				defaultForeginTokenID.slice(0, CHAIN_ID_LENGTH),
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			]),
			{ amount: defaultEscrowAmount },
			escrowStoreSchema,
		);
	});

	describe('getAvailableBalance', () => {
		it('should return zero if data does not exist', async () => {
			await expect(
				api.getAvailableBalance(apiContext, getRandomBytes(20), defaultTokenID),
			).resolves.toEqual(BigInt(0));
		});

		it('should return balance if data exists', async () => {
			await expect(
				api.getAvailableBalance(apiContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance);
		});
	});

	describe('getLockedAmount', () => {
		it('should return zero if data does not exist', async () => {
			await expect(
				api.getLockedAmount(apiContext, getRandomBytes(20), defaultTokenID, 3),
			).resolves.toEqual(BigInt(0));
			await expect(
				api.getLockedAmount(apiContext, defaultAddress, defaultTokenID, 3),
			).resolves.toEqual(BigInt(0));
		});

		it('should return balance if data exists', async () => {
			await expect(
				api.getLockedAmount(apiContext, defaultAddress, defaultTokenID, 12),
			).resolves.toEqual(defaultAccount.lockedBalances[0].amount);
		});
	});

	describe('getEscrowedAmount', () => {
		it('should reject if token is native', async () => {
			await expect(
				api.getEscrowedAmount(
					apiContext,
					defaultForeginTokenID.slice(0, CHAIN_ID_LENGTH),
					defaultForeginTokenID,
				),
			).rejects.toThrow('Only native token can have escrow amount');
		});

		it('should return zero if data does not exist', async () => {
			await expect(
				api.getEscrowedAmount(
					apiContext,
					Buffer.from([1, 0, 0, 0]),
					Buffer.from([0, 0, 0, 1, 0, 0, 0, 1]),
				),
			).resolves.toEqual(BigInt(0));
		});

		it('should return balance if data exists', async () => {
			await expect(
				api.getEscrowedAmount(
					apiContext,
					Buffer.from([1, 0, 0, 0]),
					Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]),
				),
			).resolves.toEqual(defaultEscrowAmount);
		});
	});

	describe('accountExists', () => {
		it('should return true if account exist', async () => {
			await expect(api.accountExists(apiContext, defaultAddress)).resolves.toBeTrue();
		});

		it('should return false if account does not exist', async () => {
			await expect(api.accountExists(apiContext, getRandomBytes(20))).resolves.toBeFalse();
		});
	});

	describe('getNextAvailableLocalID', () => {
		it('should return next available local ID', async () => {
			await expect(api.getNextAvailableLocalID(apiContext)).resolves.toEqual(
				Buffer.from([0, 0, 0, 5]),
			);
		});
	});

	describe('initializeToken', () => {
		it('should reject if supply already exist', async () => {
			await expect(
				api.initializeToken(apiContext, defaultTokenID.slice(CHAIN_ID_LENGTH)),
			).rejects.toThrow('Token is already initialized');
		});

		it('should not update next available local ID if local ID is less than existing one', async () => {
			await expect(
				api.initializeToken(apiContext, Buffer.from([0, 0, 0, 2])),
			).resolves.toBeUndefined();
			await expect(api.getNextAvailableLocalID(apiContext)).resolves.toEqual(
				Buffer.from([0, 0, 0, 5]),
			);
		});

		it('should update next available local ID if local ID is greater than existing one', async () => {
			await expect(
				api.initializeToken(apiContext, Buffer.from([0, 0, 0, 7])),
			).resolves.toBeUndefined();
			await expect(api.getNextAvailableLocalID(apiContext)).resolves.toEqual(
				Buffer.from([0, 0, 0, 8]),
			);
		});
	});

	describe('mint', () => {
		it('should reject if token is not native', async () => {
			await expect(
				api.mint(apiContext, defaultAddress, defaultForeginTokenID, BigInt(10000)),
			).rejects.toThrow('Only native token can be minted');
		});

		it('should reject if amount is less than zero', async () => {
			await expect(
				api.mint(apiContext, defaultAddress, defaultTokenID, BigInt(-1)),
			).rejects.toThrow('Amount must be a positive integer to mint');
		});

		it('should reject if supply does not exist', async () => {
			await expect(
				api.mint(apiContext, defaultAddress, Buffer.from([0, 0, 0, 1, 0, 0, 0, 3]), BigInt(100)),
			).rejects.toThrow('is not initialized to mint');
		});

		it('should reject if supply exceeds max uint64', async () => {
			await expect(
				api.mint(apiContext, defaultAddress, defaultTokenID, BigInt(2) ** BigInt(64)),
			).rejects.toThrow('Supply cannot exceed MAX_UINT64');
		});

		it.todo('should reject if recipient does not exist and minBalance is not set');
		it.todo('should reject if recipient does not exist and amount is less than minBalance');

		it('should update recipient balance and total supply', async () => {
			await expect(
				api.mint(apiContext, defaultAddress, defaultTokenID, BigInt(10000)),
			).resolves.toBeUndefined();
			await expect(
				api.getAvailableBalance(apiContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(10000));
			const supplyStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_SUPPLY);
			const { totalSupply } = await supplyStore.getWithSchema<SupplyStoreData>(
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
				supplyStoreSchema,
			);
			expect(totalSupply).toEqual(defaultTotalSupply + BigInt(10000));
		});
	});

	describe('burn', () => {
		it('should reject if token is not native', async () => {
			await expect(
				api.burn(apiContext, defaultAddress, defaultForeginTokenID, BigInt(10000)),
			).rejects.toThrow('Only native token can be burnt');
		});

		it('should reject amount is less than zero', async () => {
			await expect(
				api.burn(apiContext, defaultAddress, defaultTokenID, BigInt(-1)),
			).rejects.toThrow('Amount must be a positive integer to burn');
		});

		it('should reject if address does not have enough balance', async () => {
			await expect(
				api.burn(
					apiContext,
					defaultAddress,
					defaultTokenID,
					defaultAccount.availableBalance + BigInt(1),
				),
			).rejects.toThrow('is not sufficient for');
		});

		it('should update address balance and total supply', async () => {
			await expect(
				api.burn(apiContext, defaultAddress, defaultTokenID, defaultAccount.availableBalance),
			).resolves.toBeUndefined();
			await expect(
				api.getAvailableBalance(apiContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(BigInt(0));

			const supplyStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_SUPPLY);
			const { totalSupply } = await supplyStore.getWithSchema<SupplyStoreData>(
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
				supplyStoreSchema,
			);
			expect(totalSupply).toEqual(defaultTotalSupply - defaultAccount.availableBalance);
		});
	});

	describe('lock', () => {
		it('should reject amount is less than zero', async () => {
			await expect(
				api.lock(apiContext, defaultAddress, 12, defaultTokenID, BigInt(-1)),
			).rejects.toThrow('Amount must be a positive integer to lock');
		});

		it('should reject if address does not have enough balance', async () => {
			await expect(
				api.lock(
					apiContext,
					defaultAddress,
					12,
					defaultTokenID,
					defaultAccount.availableBalance + BigInt(1),
				),
			).rejects.toThrow('is not sufficient for');
		});

		it('should update address balance', async () => {
			await expect(
				api.lock(apiContext, defaultAddress, 2, defaultTokenID, defaultAccount.availableBalance),
			).resolves.toBeUndefined();
			await expect(
				api.getAvailableBalance(apiContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(BigInt(0));
		});

		it('should update locked balances to be sorted by module ID', async () => {
			await expect(
				api.lock(apiContext, defaultAddress, 2, defaultTokenID, defaultAccount.availableBalance),
			).resolves.toBeUndefined();
			const userStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
			const { lockedBalances } = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(defaultAddress, defaultTokenIDAlias),
				userStoreSchema,
			);
			expect(lockedBalances[0].moduleID).toEqual(2);
		});
	});

	describe('unlock', () => {
		it('should reject amount is less than zero', async () => {
			await expect(
				api.unlock(apiContext, defaultAddress, 12, defaultTokenID, BigInt(-1)),
			).rejects.toThrow('Amount must be a positive integer to unlock');
		});

		it('should reject if address does not have any corresponding locked balance for the specified module', async () => {
			await expect(
				api.unlock(apiContext, defaultAddress, 15, defaultTokenID, BigInt(100)),
			).rejects.toThrow('No balance is locked for module ID 15');
		});

		it('should reject if address does not have sufficient corresponding locked balance for the specified module', async () => {
			await expect(
				api.unlock(
					apiContext,
					defaultAddress,
					12,
					defaultTokenID,
					defaultAccount.lockedBalances[0].amount + BigInt(1),
				),
			).rejects.toThrow('Not enough amount is locked for module 12 to unlock');
		});

		it('should update address balance', async () => {
			await expect(
				api.unlock(
					apiContext,
					defaultAddress,
					12,
					defaultTokenID,
					defaultAccount.lockedBalances[0].amount - BigInt(1),
				),
			).resolves.toBeUndefined();
			const userStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
			const { lockedBalances } = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(defaultAddress, defaultTokenIDAlias),
				userStoreSchema,
			);
			expect(lockedBalances[0].amount).toEqual(BigInt(1));
		});

		it('should remove lockedBalances entry if amount becomes zero', async () => {
			await expect(
				api.unlock(
					apiContext,
					defaultAddress,
					12,
					defaultTokenID,
					defaultAccount.lockedBalances[0].amount,
				),
			).resolves.toBeUndefined();
			const userStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
			const { lockedBalances } = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(defaultAddress, defaultTokenIDAlias),
				userStoreSchema,
			);
			expect(lockedBalances).toHaveLength(0);
		});
	});
});

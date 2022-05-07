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
import { TokenEndpoint } from '../../../../src/modules/token/endpoint';
import {
	availableLocalIDStoreSchema,
	escrowStoreSchema,
	supplyStoreSchema,
	userStoreSchema,
} from '../../../../src/modules/token/schemas';
import { getUserStoreKey } from '../../../../src/modules/token/utils';
import { createTransientModuleEndpointContext } from '../../../../src/testing';
import { DEFAULT_TOKEN_ID } from '../../../utils/node/transaction';

describe('token endpoint', () => {
	const defaultAddress = getRandomBytes(20);
	const defaultTokenIDAlias = Buffer.alloc(TOKEN_ID_LENGTH, 0);
	const defaultTokenID = Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]);
	const defaultForeignTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
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
	const supportedTokenIDs = ['0000000000000000', '0000000200000000'];

	let endpoint: TokenEndpoint;
	let stateStore: StateStore;

	beforeEach(async () => {
		const api = new TokenAPI(MODULE_ID_TOKEN);
		endpoint = new TokenEndpoint(MODULE_ID_TOKEN);
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
			send: jest.fn().mockResolvedValue(true),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
		});
		endpoint.init(api, supportedTokenIDs);
		stateStore = new StateStore(new InMemoryKVStore());
		const userStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
		await userStore.setWithSchema(
			getUserStoreKey(defaultAddress, defaultTokenIDAlias),
			defaultAccount,
			userStoreSchema,
		);
		await userStore.setWithSchema(
			getUserStoreKey(defaultAddress, defaultForeignTokenID),
			defaultAccount,
			userStoreSchema,
		);

		const supplyStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_SUPPLY);
		await supplyStore.setWithSchema(
			defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			{ totalSupply: defaultTotalSupply },
			supplyStoreSchema,
		);

		const nextAvailableLocalIDStore = stateStore.getStore(
			MODULE_ID_TOKEN,
			STORE_PREFIX_AVAILABLE_LOCAL_ID,
		);
		await nextAvailableLocalIDStore.setWithSchema(
			EMPTY_BYTES,
			{ nextAvailableLocalID: Buffer.from([0, 0, 0, 5]) },
			availableLocalIDStoreSchema,
		);

		const escrowStore = stateStore.getStore(MODULE_ID_TOKEN, STORE_PREFIX_ESCROW);
		await escrowStore.setWithSchema(
			Buffer.concat([
				defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			]),
			{ amount: defaultEscrowAmount },
			escrowStoreSchema,
		);
	});

	describe('getBalances', () => {
		it('should reject when input is invalid', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { address: '1234' },
			});
			await expect(endpoint.getBalances(moduleEndpointContext)).rejects.toThrow(
				".address' must NOT have fewer than 40 characters",
			);
		});

		it('should return empty balances if account does not exist', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { address: getRandomBytes(20).toString('hex') },
			});
			const resp = await endpoint.getBalances(moduleEndpointContext);
			expect(resp).toEqual({ balances: [] });
		});

		it('should return all the balances', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { address: defaultAddress.toString('hex') },
			});
			const resp = await endpoint.getBalances(moduleEndpointContext);
			expect(resp).toEqual({
				balances: [
					{
						tokenID: '0000000000000000',
						availableBalance: defaultAccount.availableBalance.toString(),
						lockedBalances: defaultAccount.lockedBalances.map(lb => ({
							...lb,
							amount: lb.amount.toString(),
						})),
					},
					{
						tokenID: '0100000000000000',
						availableBalance: defaultAccount.availableBalance.toString(),
						lockedBalances: defaultAccount.lockedBalances.map(lb => ({
							...lb,
							amount: lb.amount.toString(),
						})),
					},
				],
			});
		});
	});

	describe('getBalance', () => {
		it('should reject when input has invalid address', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { address: '1234' },
			});
			await expect(endpoint.getBalance(moduleEndpointContext)).rejects.toThrow(
				".address' must NOT have fewer than 40 characters",
			);
		});

		it('should reject when input has invalid tokenID', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { address: defaultAddress.toString('hex'), tokenID: '00' },
			});
			await expect(endpoint.getBalance(moduleEndpointContext)).rejects.toThrow(
				".tokenID' must NOT have fewer than 16 characters",
			);
		});

		it('should return zero balance if account does not exist', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: getRandomBytes(20).toString('hex'),
					tokenID: defaultTokenID.toString('hex'),
				},
			});
			const resp = await endpoint.getBalance(moduleEndpointContext);
			expect(resp).toEqual({
				availableBalance: '0',
				lockedBalances: [],
			});
		});

		it('should return return balance when network tokenID is specified', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: defaultAddress.toString('hex'),
					tokenID: defaultTokenID.toString('hex'),
				},
			});
			const resp = await endpoint.getBalance(moduleEndpointContext);
			expect(resp).toEqual({
				availableBalance: defaultAccount.availableBalance.toString(),
				lockedBalances: defaultAccount.lockedBalances.map(lb => ({
					...lb,
					amount: lb.amount.toString(),
				})),
			});
		});

		it('should return return balance when native tokenID is specified', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: defaultAddress.toString('hex'),
					tokenID: defaultTokenIDAlias.toString('hex'),
				},
			});
			const resp = await endpoint.getBalance(moduleEndpointContext);
			expect(resp).toEqual({
				availableBalance: defaultAccount.availableBalance.toString(),
				lockedBalances: defaultAccount.lockedBalances.map(lb => ({
					...lb,
					amount: lb.amount.toString(),
				})),
			});
		});
	});

	describe('getTotalSupply', () => {
		it('should return all total supply', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
			});
			const resp = await endpoint.getTotalSupply(moduleEndpointContext);
			expect(resp).toEqual({
				totalSupply: [
					{
						tokenID: defaultTokenIDAlias.toString('hex'),
						totalSupply: defaultTotalSupply.toString(),
					},
				],
			});
		});
	});

	describe('getSupportedTokens', () => {
		it('should return all supported tokens', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
			});
			const resp = await endpoint.getSupportedTokens(moduleEndpointContext);
			expect(resp).toEqual({
				tokenIDs: supportedTokenIDs,
			});
		});
	});

	describe('getEscrowedAmounts', () => {
		it('should return all escrowed tokens', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
			});
			const resp = await endpoint.getEscrowedAmounts(moduleEndpointContext);
			expect(resp).toEqual({
				escrowedAmounts: [
					{
						tokenID: defaultTokenIDAlias.toString('hex'),
						escrowChainID: defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH).toString('hex'),
						amount: defaultEscrowAmount.toString(),
					},
				],
			});
		});
	});
});

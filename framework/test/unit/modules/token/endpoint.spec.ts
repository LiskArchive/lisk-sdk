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
import { address, utils } from '@liskhq/lisk-cryptography';
import { TokenMethod, TokenModule } from '../../../../src/modules/token';
import {
	USER_SUBSTORE_INITIALIZATION_FEE,
	ESCROW_SUBSTORE_INITIALIZATION_FEE,
} from '../../../../src/modules/token/constants';
import { TokenEndpoint } from '../../../../src/modules/token/endpoint';
import { EscrowStore } from '../../../../src/modules/token/stores/escrow';
import { SupplyStore } from '../../../../src/modules/token/stores/supply';
import { UserStore } from '../../../../src/modules/token/stores/user';
import { SupportedTokensStore } from '../../../../src/modules/token/stores/supported_tokens';
import { MethodContext } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import {
	createTransientMethodContext,
	createTransientModuleEndpointContext,
} from '../../../../src/testing';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { ModuleConfig } from '../../../../src/modules/token/types';

describe('token endpoint', () => {
	const tokenModule = new TokenModule();
	const defaultAddress = utils.getRandomBytes(20);
	const defaultChainID = Buffer.from([0, 0, 0, 1]);
	const defaultTokenID = Buffer.concat([defaultChainID, Buffer.from([0, 0, 0, 0])]);
	const defaultForeignChainID = Buffer.from([1, 0, 0, 0]);
	const defaultForeignTokenID = Buffer.concat([defaultForeignChainID, Buffer.from([0, 0, 0, 0])]);
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
	const supportedTokenIDs = [
		Buffer.from('0000000000000000', 'hex'),
		Buffer.from('0000000200000000', 'hex'),
	];
	let supportedTokensStore: SupportedTokensStore;

	let endpoint: TokenEndpoint;
	let stateStore: PrefixedStateReadWriter;
	let methodContext: MethodContext;

	beforeEach(async () => {
		const method = new TokenMethod(tokenModule.stores, tokenModule.events, tokenModule.name);
		endpoint = new TokenEndpoint(tokenModule.stores, tokenModule.offchainStores);
		const config: ModuleConfig = {
			userAccountInitializationFee: USER_SUBSTORE_INITIALIZATION_FEE,
			escrowAccountInitializationFee: ESCROW_SUBSTORE_INITIALIZATION_FEE,
			feeTokenID: defaultTokenID,
		};
		method.init(Object.assign(config, { ownChainID: Buffer.from([0, 0, 0, 1]) }));
		method.addDependencies({
			getOwnChainAccount: jest.fn().mockResolvedValue({ id: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn().mockResolvedValue(true),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
		} as never);
		endpoint.init(config);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		methodContext = createTransientMethodContext({ stateStore });
		const userStore = tokenModule.stores.get(UserStore);
		await userStore.save(methodContext, defaultAddress, defaultTokenID, defaultAccount);
		await userStore.save(methodContext, defaultAddress, defaultForeignTokenID, defaultAccount);

		const supplyStore = tokenModule.stores.get(SupplyStore);
		await supplyStore.set(methodContext, defaultTokenID, {
			totalSupply: defaultTotalSupply,
		});

		const escrowStore = tokenModule.stores.get(EscrowStore);
		await escrowStore.set(methodContext, Buffer.concat([defaultForeignChainID, defaultTokenID]), {
			amount: defaultEscrowAmount,
		});

		supportedTokensStore = tokenModule.stores.get(SupportedTokensStore);
		supportedTokensStore.registerOwnChainID(defaultChainID);
		await supportedTokensStore.set(methodContext, defaultTokenID, { supportedTokenIDs });
	});

	describe('getBalances', () => {
		it('should reject when input is invalid', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { address: '1234' },
			});
			await expect(endpoint.getBalances(moduleEndpointContext)).rejects.toThrow(
				'.address\' must match format "lisk32"',
			);
		});

		it('should return empty balances if account does not exist', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { address: address.getLisk32AddressFromAddress(utils.getRandomBytes(20)) },
			});
			const resp = await endpoint.getBalances(moduleEndpointContext);
			expect(resp).toEqual({ balances: [] });
		});

		it('should return all the balances', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { address: address.getLisk32AddressFromAddress(defaultAddress) },
			});
			const resp = await endpoint.getBalances(moduleEndpointContext);
			expect(resp).toEqual({
				balances: [
					{
						tokenID: '0000000100000000',
						availableBalance: defaultAccount.availableBalance.toString(),
						lockedBalances: defaultAccount.lockedBalances.map(lb => ({
							...lb,
							module: lb.module,
							amount: lb.amount.toString(),
						})),
					},
					{
						tokenID: '0100000000000000',
						availableBalance: defaultAccount.availableBalance.toString(),
						lockedBalances: defaultAccount.lockedBalances.map(lb => ({
							...lb,
							module: lb.module,
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
				'.address\' must match format "lisk32"',
			);
		});

		it('should reject when input has invalid tokenID', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { address: address.getLisk32AddressFromAddress(defaultAddress), tokenID: '00' },
			});
			await expect(endpoint.getBalance(moduleEndpointContext)).rejects.toThrow(
				".tokenID' must NOT have fewer than 16 characters",
			);
		});

		it('should return zero balance if account does not exist', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: address.getLisk32AddressFromAddress(utils.getRandomBytes(20)),
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
					address: address.getLisk32AddressFromAddress(defaultAddress),
					tokenID: defaultTokenID.toString('hex'),
				},
			});
			const resp = await endpoint.getBalance(moduleEndpointContext);
			expect(resp).toEqual({
				availableBalance: defaultAccount.availableBalance.toString(),
				lockedBalances: defaultAccount.lockedBalances.map(lb => ({
					...lb,
					module: lb.module,
					amount: lb.amount.toString(),
				})),
			});
		});

		it('should return return balance when native tokenID is specified', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: address.getLisk32AddressFromAddress(defaultAddress),
					tokenID: defaultTokenID.toString('hex'),
				},
			});
			const resp = await endpoint.getBalance(moduleEndpointContext);
			expect(resp).toEqual({
				availableBalance: defaultAccount.availableBalance.toString(),
				lockedBalances: defaultAccount.lockedBalances.map(lb => ({
					...lb,
					module: lb.module,
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
						tokenID: defaultTokenID.toString('hex'),
						totalSupply: defaultTotalSupply.toString(),
					},
				],
			});
		});
	});

	describe('getSupportedTokens', () => {
		it.todo('should return all supported tokens');
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
						tokenID: defaultTokenID.toString('hex'),
						escrowChainID: defaultForeignChainID.toString('hex'),
						amount: defaultEscrowAmount.toString(),
					},
				],
			});
		});
	});

	describe('isSupported', () => {
		it('should return true for a supported token', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { tokenID: supportedTokenIDs[0].toString('hex') },
			});

			expect(await endpoint.isSupported(moduleEndpointContext)).toEqual({ supported: true });
		});

		it('should return false for a non-supported token', async () => {
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { tokenID: '8888888888888888' },
			});

			expect(await endpoint.isSupported(moduleEndpointContext)).toEqual({ supported: false });
		});

		it('should return true for a token from a foreign chain, when all tokens are supported', async () => {
			await supportedTokensStore.supportAll(methodContext);
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { tokenID: '8888888888888888' },
			});

			expect(await endpoint.isSupported(moduleEndpointContext)).toEqual({ supported: true });
		});
	});

	describe('getInitializationFees', () => {
		it('should return configured initialization fees for user account and escrow account', () => {
			expect(endpoint.getInitializationFees()).toEqual({
				userAccount: USER_SUBSTORE_INITIALIZATION_FEE.toString(),
				escrowAccount: ESCROW_SUBSTORE_INITIALIZATION_FEE.toString(),
			});
		});
	});
});

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
	const addr = utils.getRandomBytes(20);
	const mainChainID = Buffer.from([1, 0, 0, 0]);
	const mainChainTokenID = Buffer.concat([mainChainID, Buffer.from([0, 0, 0, 0])]);
	const nativeChainID = Buffer.from([1, 0, 0, 1]);
	const nativeTokenID = Buffer.concat([nativeChainID, Buffer.from([0, 0, 0, 0])]);
	const foreignChainID = Buffer.from([1, 0, 0, 8]);
	const foreignTokenID = Buffer.concat([foreignChainID, Buffer.from([0, 0, 0, 0])]);
	const account = {
		availableBalance: BigInt(10000000000),
		lockedBalances: [
			{
				module: 'pos',
				amount: BigInt(100000000),
			},
		],
	};
	const totalSupply = BigInt('100000000000000');
	const escrowAmount = BigInt('100000000000');
	const supportedForeignChainTokenIDs = [
		Buffer.concat([foreignChainID, Buffer.from([0, 0, 0, 8])]),
		Buffer.concat([foreignChainID, Buffer.from([0, 0, 0, 9])]),
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
			feeTokenID: nativeTokenID,
		};
		method.init(Object.assign(config, { ownChainID: Buffer.from([0, 0, 0, 1]) }));
		method.addDependencies({
			getOwnChainAccount: jest.fn().mockResolvedValue({ chainID: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn().mockResolvedValue(true),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
		} as never);
		endpoint.init(config);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		methodContext = createTransientMethodContext({ stateStore });
		const userStore = tokenModule.stores.get(UserStore);
		await userStore.save(methodContext, addr, nativeTokenID, account);
		await userStore.save(methodContext, addr, foreignTokenID, account);

		const supplyStore = tokenModule.stores.get(SupplyStore);
		await supplyStore.set(methodContext, nativeTokenID, {
			totalSupply,
		});

		const escrowStore = tokenModule.stores.get(EscrowStore);
		await escrowStore.set(methodContext, Buffer.concat([foreignChainID, nativeTokenID]), {
			amount: escrowAmount,
		});

		supportedTokensStore = tokenModule.stores.get(SupportedTokensStore);
		supportedTokensStore.registerOwnChainID(nativeChainID);
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
				params: { address: address.getLisk32AddressFromAddress(addr) },
			});
			const resp = await endpoint.getBalances(moduleEndpointContext);
			expect(resp).toEqual({
				balances: [
					{
						tokenID: nativeTokenID.toString('hex'),
						availableBalance: account.availableBalance.toString(),
						lockedBalances: account.lockedBalances.map(lb => ({
							...lb,
							module: lb.module,
							amount: lb.amount.toString(),
						})),
					},
					{
						tokenID: foreignTokenID.toString('hex'),
						availableBalance: account.availableBalance.toString(),
						lockedBalances: account.lockedBalances.map(lb => ({
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
				params: { address: address.getLisk32AddressFromAddress(addr), tokenID: '00' },
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
					tokenID: nativeTokenID.toString('hex'),
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
					address: address.getLisk32AddressFromAddress(addr),
					tokenID: nativeTokenID.toString('hex'),
				},
			});
			const resp = await endpoint.getBalance(moduleEndpointContext);
			expect(resp).toEqual({
				availableBalance: account.availableBalance.toString(),
				lockedBalances: account.lockedBalances.map(lb => ({
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
					address: address.getLisk32AddressFromAddress(addr),
					tokenID: nativeTokenID.toString('hex'),
				},
			});
			const resp = await endpoint.getBalance(moduleEndpointContext);
			expect(resp).toEqual({
				availableBalance: account.availableBalance.toString(),
				lockedBalances: account.lockedBalances.map(lb => ({
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
						tokenID: nativeTokenID.toString('hex'),
						totalSupply: totalSupply.toString(),
					},
				],
			});
		});
	});

	describe('getSupportedTokens', () => {
		it('should return * when ALL tokens are supported globally', async () => {
			await supportedTokensStore.supportAll(methodContext);
			const moduleEndpointContext = createTransientModuleEndpointContext({ stateStore });

			expect(await endpoint.getSupportedTokens(moduleEndpointContext)).toEqual({
				supportedTokens: ['*'],
			});
		});

		it('should return the list of supported tokens when ALL the tokens from a foreign chain are supported', async () => {
			await supportedTokensStore.set(methodContext, foreignChainID, { supportedTokenIDs: [] });

			// const anotherForeignChainID = Buffer.from([0, 0, 0, 9]);
			// await supportedTokensStore.set(methodContext, anotherForeignChainID, { supportedTokenIDs: [] });
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				chainID: nativeChainID,
			});

			expect(await endpoint.getSupportedTokens(moduleEndpointContext)).toEqual({
				supportedTokens: [
					mainChainTokenID.toString('hex'),
					nativeTokenID.toString('hex'),
					`${foreignChainID.toString('hex')}********`,
				],
			});
		});

		it('should return the list of supported tokens when NOT ALL the tokens from a foreign chain are supported', async () => {
			await supportedTokensStore.set(methodContext, foreignChainID, {
				supportedTokenIDs: supportedForeignChainTokenIDs,
			});
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				chainID: nativeChainID,
			});

			expect(await endpoint.getSupportedTokens(moduleEndpointContext)).toEqual({
				supportedTokens: [
					mainChainTokenID.toString('hex'),
					nativeTokenID.toString('hex'),
					supportedForeignChainTokenIDs[0].toString('hex'),
					supportedForeignChainTokenIDs[1].toString('hex'),
				],
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
						tokenID: nativeTokenID.toString('hex'),
						escrowChainID: foreignChainID.toString('hex'),
						amount: escrowAmount.toString(),
					},
				],
			});
		});
	});

	describe('isSupported', () => {
		it('should return true for a supported token', async () => {
			await supportedTokensStore.set(methodContext, foreignChainID, {
				supportedTokenIDs: supportedForeignChainTokenIDs,
			});
			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				params: { tokenID: supportedForeignChainTokenIDs[0].toString('hex') },
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

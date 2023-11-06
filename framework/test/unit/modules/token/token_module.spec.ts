/*
 * Copyright © 2020 Lisk Foundation
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
import { BlockAssets } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { genesisTokenStoreSchema, TokenModule } from '../../../../src/modules/token';
import { LOCAL_ID_LENGTH, TOKEN_ID_LENGTH } from '../../../../src/modules/token/constants';
import { EscrowStore } from '../../../../src/modules/token/stores/escrow';
import { SupplyStore } from '../../../../src/modules/token/stores/supply';
import { UserStore } from '../../../../src/modules/token/stores/user';
import { createGenesisBlockContext } from '../../../../src/testing';
import { invalidGenesisAssets, validGenesisAssets } from './init_genesis_state_fixture';
import { SupportedTokensStore } from '../../../../src/modules/token/stores/supported_tokens';
import { EMPTY_BYTES } from '../../../../src';

describe('token module', () => {
	let tokenModule: TokenModule;

	const ownChainID = Buffer.from([0, 0, 0, 0]);

	beforeEach(() => {
		tokenModule = new TokenModule();
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			await expect(
				tokenModule.init({
					genesisConfig: { chainID: ownChainID.toString('hex') } as any,
					moduleConfig: {},
				}),
			).toResolve();
		});

		it('should initialize config with given value', async () => {
			await expect(
				tokenModule.init({
					genesisConfig: { chainID: ownChainID.toString('hex') } as any,
					moduleConfig: {
						supportedTokenID: ['000000020000'],
					},
				}),
			).toResolve();
		});
	});

	describe('initGenesisState', () => {
		beforeEach(async () => {
			await tokenModule.init({
				genesisConfig: { chainID: '00000000' } as any,
				moduleConfig: {},
			});
		});

		it('should setup initial state', async () => {
			const context = createGenesisBlockContext({
				chainID: ownChainID,
			}).createInitGenesisStateContext();
			return expect(tokenModule.initGenesisState(context)).resolves.toBeUndefined();
		});

		it.each(validGenesisAssets)('%s', async (_desc, input) => {
			if (typeof input === 'string') {
				throw new Error('invalid test case');
			}
			const encodedAsset = codec.encode(genesisTokenStoreSchema, input);
			const context = createGenesisBlockContext({
				chainID: ownChainID,
				assets: new BlockAssets([{ module: 'token', data: encodedAsset }]),
			}).createInitGenesisStateContext();

			await expect(tokenModule.initGenesisState(context)).resolves.toBeUndefined();
			// Expect stored
			const userStore = tokenModule.stores.get(UserStore);
			const allUsers = await userStore.iterate(context, {
				gte: Buffer.alloc(26, 0),
				lte: Buffer.alloc(26, 255),
			});
			expect(allUsers).toHaveLength(input.userSubstore.length);

			const supplyStore = tokenModule.stores.get(SupplyStore);
			const allSupplies = await supplyStore.iterate(context, {
				gte: Buffer.alloc(LOCAL_ID_LENGTH, 0),
				lte: Buffer.alloc(LOCAL_ID_LENGTH, 255),
			});
			expect(allSupplies).toHaveLength(input.supplySubstore.length);

			const escrowStore = tokenModule.stores.get(EscrowStore);
			const allEscrows = await escrowStore.iterate(context, {
				gte: Buffer.alloc(TOKEN_ID_LENGTH, 0),
				lte: Buffer.alloc(TOKEN_ID_LENGTH, 255),
			});
			expect(allEscrows).toHaveLength(input.escrowSubstore.length);

			const supportedTokenStore = tokenModule.stores.get(SupportedTokensStore);
			const allSupported = await supportedTokenStore.allSupported(context);

			// When all the tokens are supported
			if (
				input.supportedTokensSubstore.length === 1 &&
				input.supportedTokensSubstore[0].chainID.equals(EMPTY_BYTES)
			) {
				expect(allSupported).toBeTrue();
			} else {
				expect(allSupported).toBeFalse();
			}
		});

		it.each(invalidGenesisAssets)('%s', async (_desc, input, err) => {
			if (typeof input === 'string') {
				throw new Error('invalid test case');
			}
			const encodedAsset = codec.encode(genesisTokenStoreSchema, input);
			const context = createGenesisBlockContext({
				chainID: ownChainID,
				assets: new BlockAssets([{ module: 'token', data: encodedAsset }]),
			}).createInitGenesisStateContext();

			await expect(tokenModule.initGenesisState(context)).rejects.toThrow(err as string);
		});
	});
});

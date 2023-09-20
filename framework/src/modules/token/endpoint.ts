/*
 * Copyright © 2021 Lisk Foundation
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

import { validator } from '@liskhq/lisk-validator';
import * as cryptography from '@liskhq/lisk-cryptography';
import { NotFoundError } from '../../state_machine';
import { JSONObject, ModuleEndpointContext } from '../../types';
import { ModuleConfig } from './types';
import { BaseEndpoint } from '../base_endpoint';
import { CHAIN_ID_LENGTH, TOKEN_ID_LENGTH } from './constants';
import {
	getBalanceRequestSchema,
	getBalancesRequestSchema,
	hasEscrowAccountRequestSchema,
	hasUserAccountRequestSchema,
	isSupportedRequestSchema,
} from './schemas';
import { EscrowStore, EscrowStoreData } from './stores/escrow';
import { SupplyStore, SupplyStoreData } from './stores/supply';
import { UserStore, UserStoreData } from './stores/user';
import { SupportedTokensStore } from './stores/supported_tokens';

export class TokenEndpoint extends BaseEndpoint {
	private _moduleConfig!: ModuleConfig;

	public init(moduleConfig: ModuleConfig) {
		this._moduleConfig = moduleConfig;
	}

	public async getBalances(
		context: ModuleEndpointContext,
	): Promise<{ balances: JSONObject<UserStoreData & { tokenID: Buffer }>[] }> {
		validator.validate<{ address: string }>(getBalancesRequestSchema, context.params);

		const address = cryptography.address.getAddressFromLisk32Address(context.params.address);
		const userStore = this.stores.get(UserStore);
		const userData = await userStore.iterate(context, {
			gte: Buffer.concat([address, Buffer.alloc(TOKEN_ID_LENGTH, 0)]),
			lte: Buffer.concat([address, Buffer.alloc(TOKEN_ID_LENGTH, 255)]),
		});

		return {
			balances: userData.map(({ key, value: user }) => ({
				tokenID: key.subarray(20).toString('hex'),
				availableBalance: user.availableBalance.toString(),
				lockedBalances: user.lockedBalances.map(b => ({
					amount: b.amount.toString(),
					module: b.module,
				})),
			})),
		};
	}

	public async getBalance(context: ModuleEndpointContext): Promise<JSONObject<UserStoreData>> {
		validator.validate<{ address: string; tokenID: string }>(
			getBalanceRequestSchema,
			context.params,
		);

		const address = cryptography.address.getAddressFromLisk32Address(context.params.address);
		const tokenID = Buffer.from(context.params.tokenID, 'hex');
		const userStore = this.stores.get(UserStore);
		try {
			const user = await userStore.get(context, userStore.getKey(address, tokenID));
			return {
				availableBalance: user.availableBalance.toString(),
				lockedBalances: user.lockedBalances.map(b => ({
					amount: b.amount.toString(),
					module: b.module,
				})),
			};
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return {
				availableBalance: '0',
				lockedBalances: [],
			};
		}
	}

	public async getTotalSupply(
		context: ModuleEndpointContext,
	): Promise<{ totalSupply: JSONObject<SupplyStoreData & { tokenID: string }>[] }> {
		const supplyStore = this.stores.get(SupplyStore);
		const supplyData = await supplyStore.getAll(context);

		return {
			totalSupply: supplyData.map(({ key: tokenID, value: supply }) => ({
				tokenID: tokenID.toString('hex'),
				totalSupply: supply.totalSupply.toString(),
			})),
		};
	}

	public async getSupportedTokens(
		context: ModuleEndpointContext,
	): Promise<{ supportedTokens: string[] }> {
		const supportedTokensStore = this.stores.get(SupportedTokensStore);

		if (await supportedTokensStore.allSupported(context)) {
			return {
				supportedTokens: ['*'],
			};
		}

		const supportedTokens: string[] = [];

		// main chain token
		const mainchainTokenID = Buffer.concat([
			context.chainID.subarray(0, 1),
			Buffer.alloc(TOKEN_ID_LENGTH - 1, 0),
		]);
		supportedTokens.push(mainchainTokenID.toString('hex'));

		// native chain tokens
		const supplyStore = this.stores.get(SupplyStore);
		const supplyData = await supplyStore.getAll(context);

		for (const tokenSupply of supplyData) {
			supportedTokens.push(tokenSupply.key.toString('hex'));
		}

		// foreign chain tokens
		const supportedTokensData = await supportedTokensStore.getAll(context);

		for (const supportedToken of supportedTokensData) {
			if (!supportedToken.value.supportedTokenIDs.length) {
				supportedTokens.push(`${supportedToken.key.toString('hex')}${'********'}`); // key in supported token store is 4-byte chain ID
			} else {
				for (const token of supportedToken.value.supportedTokenIDs) {
					supportedTokens.push(token.toString('hex'));
				}
			}
		}

		return { supportedTokens };
	}

	public async isSupported(context: ModuleEndpointContext) {
		validator.validate<{ tokenID: string }>(isSupportedRequestSchema, context.params);

		const tokenID = Buffer.from(context.params.tokenID, 'hex');
		const supportedTokensStore = this.stores.get(SupportedTokensStore);

		return { supported: await supportedTokensStore.isSupported(context, tokenID) };
	}

	public async getEscrowedAmounts(context: ModuleEndpointContext): Promise<{
		escrowedAmounts: JSONObject<EscrowStoreData & { escrowChainID: Buffer; tokenID: Buffer }>[];
	}> {
		const escrowStore = this.stores.get(EscrowStore);
		const escrowData = await escrowStore.iterate(context, {
			gte: Buffer.concat([Buffer.alloc(TOKEN_ID_LENGTH, 0)]),
			lte: Buffer.concat([Buffer.alloc(TOKEN_ID_LENGTH, 255)]),
		});
		return {
			escrowedAmounts: escrowData.map(({ key, value: escrow }) => {
				const escrowChainID = key.subarray(0, CHAIN_ID_LENGTH);
				const tokenID = key.subarray(CHAIN_ID_LENGTH);
				return {
					escrowChainID: escrowChainID.toString('hex'),
					amount: escrow.amount.toString(),
					tokenID: tokenID.toString('hex'),
				};
			}),
		};
	}

	public getInitializationFees() {
		return {
			userAccount: this._moduleConfig.userAccountInitializationFee.toString(),
			escrowAccount: this._moduleConfig.escrowAccountInitializationFee.toString(),
		};
	}

	public async hasUserAccount(context: ModuleEndpointContext): Promise<{ exists: boolean }> {
		validator.validate<{ address: string; tokenID: string }>(
			hasUserAccountRequestSchema,
			context.params,
		);

		const address = cryptography.address.getAddressFromLisk32Address(context.params.address);
		const tokenID = Buffer.from(context.params.tokenID, 'hex');
		const userStore = this.stores.get(UserStore);

		return { exists: await userStore.has(context, userStore.getKey(address, tokenID)) };
	}

	public async hasEscrowAccount(context: ModuleEndpointContext): Promise<{ exists: boolean }> {
		validator.validate<{ escrowChainID: string; tokenID: string }>(
			hasEscrowAccountRequestSchema,
			context.params,
		);

		const escrowChainID = Buffer.from(context.params.escrowChainID, 'hex');
		const tokenID = Buffer.from(context.params.tokenID, 'hex');
		const escrowStore = this.stores.get(EscrowStore);

		return { exists: await escrowStore.has(context, escrowStore.getKey(escrowChainID, tokenID)) };
	}
}

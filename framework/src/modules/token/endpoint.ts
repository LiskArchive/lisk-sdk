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
import { BaseEndpoint } from '../base_endpoint';
import { TokenMethod } from './method';
import { CHAIN_ID_ALIAS_NATIVE, LOCAL_ID_LENGTH, TOKEN_ID_LENGTH } from './constants';
import {
	getBalanceRequestSchema,
	getBalancesRequestSchema,
	SupplyStoreData,
	UserStoreData,
} from './schemas';
import { EscrowStore, EscrowStoreData } from './stores/escrow';
import { SupplyStore } from './stores/supply';
import { UserStore } from './stores/user';
import { splitTokenID } from './utils';

export class TokenEndpoint extends BaseEndpoint {
	private _tokenMethod!: TokenMethod;
	private _supportedTokenIDs: string[] = [];

	public init(tokenMethod: TokenMethod, supportedTokenIDs: string[]) {
		this._tokenMethod = tokenMethod;
		this._supportedTokenIDs = supportedTokenIDs;
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
				tokenID: key.slice(20).toString('hex'),
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
		const canonicalTokenID = await this._tokenMethod.getCanonicalTokenID(
			context.getImmutableMethodContext(),
			tokenID,
		);
		const userStore = this.stores.get(UserStore);
		try {
			const user = await userStore.get(context, userStore.getKey(address, canonicalTokenID));
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
		const supplyData = await supplyStore.iterate(context, {
			gte: Buffer.concat([Buffer.alloc(LOCAL_ID_LENGTH, 0)]),
			lte: Buffer.concat([Buffer.alloc(LOCAL_ID_LENGTH, 255)]),
		});

		return {
			totalSupply: supplyData.map(({ key: localID, value: supply }) => ({
				tokenID: Buffer.concat([CHAIN_ID_ALIAS_NATIVE, localID]).toString('hex'),
				totalSupply: supply.totalSupply.toString(),
			})),
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getSupportedTokens(
		_context: ModuleEndpointContext,
	): Promise<{ tokenIDs: string[] }> {
		return {
			tokenIDs: this._supportedTokenIDs,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getEscrowedAmounts(
		context: ModuleEndpointContext,
	): Promise<{
		escrowedAmounts: JSONObject<EscrowStoreData & { escrowChainID: Buffer; tokenID: Buffer }>[];
	}> {
		const escrowStore = this.stores.get(EscrowStore);
		const escrowData = await escrowStore.iterate(context, {
			gte: Buffer.concat([Buffer.alloc(TOKEN_ID_LENGTH, 0)]),
			lte: Buffer.concat([Buffer.alloc(TOKEN_ID_LENGTH, 255)]),
		});
		return {
			escrowedAmounts: escrowData.map(({ key, value: escrow }) => {
				const [escrowChainID, localID] = splitTokenID(key);
				return {
					escrowChainID: escrowChainID.toString('hex'),
					amount: escrow.amount.toString(),
					tokenID: Buffer.concat([CHAIN_ID_ALIAS_NATIVE, localID]).toString('hex'),
				};
			}),
		};
	}
}

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

import { NotFoundError } from '@liskhq/lisk-chain';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { JSONObject, ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { TokenAPI } from './api';
import {
	CHAIN_ID_ALIAS_NATIVE,
	LOCAL_ID_LENGTH,
	STORE_PREFIX_ESCROW,
	STORE_PREFIX_SUPPLY,
	STORE_PREFIX_USER,
	TOKEN_ID_LENGTH,
} from './constants';
import {
	EscrowStoreData,
	escrowStoreSchema,
	getBalanceRequestSchema,
	getBalancesRequestSchema,
	SupplyStoreData,
	supplyStoreSchema,
	UserStoreData,
	userStoreSchema,
} from './schemas';
import { getUserStoreKey, splitTokenID } from './utils';

export class TokenEndpoint extends BaseEndpoint {
	private _tokenAPI!: TokenAPI;
	private _supportedTokenIDs: string[] = [];

	public init(tokenAPI: TokenAPI, supportedTokenIDs: string[]) {
		this._tokenAPI = tokenAPI;
		this._supportedTokenIDs = supportedTokenIDs;
	}

	public async getBalances(
		context: ModuleEndpointContext,
	): Promise<{ balances: JSONObject<UserStoreData & { tokenID: Buffer }>[] }> {
		const errors = validator.validate(getBalancesRequestSchema, context.params);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		const address = Buffer.from(context.params.address as string, 'hex');
		const userStore = context.getStore(this.moduleID, STORE_PREFIX_USER);
		const userData = await userStore.iterateWithSchema<UserStoreData>(
			{
				start: Buffer.concat([address, Buffer.alloc(TOKEN_ID_LENGTH, 0)]),
				end: Buffer.concat([address, Buffer.alloc(TOKEN_ID_LENGTH, 255)]),
			},
			userStoreSchema,
		);

		return {
			balances: userData.map(({ key, value: user }) => ({
				tokenID: key.slice(20).toString('hex'),
				availableBalance: user.availableBalance.toString(),
				lockedBalances: user.lockedBalances.map(b => ({
					amount: b.amount.toString(),
					moduleID: b.moduleID,
				})),
			})),
		};
	}

	public async getBalance(context: ModuleEndpointContext): Promise<JSONObject<UserStoreData>> {
		const errors = validator.validate(getBalanceRequestSchema, context.params);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		const address = Buffer.from(context.params.address as string, 'hex');
		const tokenID = Buffer.from(context.params.tokenID as string, 'hex');
		const canonicalTokenID = await this._tokenAPI.getCanonicalTokenID(
			context.getImmutableAPIContext(),
			tokenID,
		);
		const userStore = context.getStore(this.moduleID, STORE_PREFIX_USER);
		try {
			const user = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(address, canonicalTokenID),
				userStoreSchema,
			);
			return {
				availableBalance: user.availableBalance.toString(),
				lockedBalances: user.lockedBalances.map(b => ({
					amount: b.amount.toString(),
					moduleID: b.moduleID,
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
		const supplyStore = context.getStore(this.moduleID, STORE_PREFIX_SUPPLY);
		const supplyData = await supplyStore.iterateWithSchema<SupplyStoreData>(
			{
				start: Buffer.concat([Buffer.alloc(LOCAL_ID_LENGTH, 0)]),
				end: Buffer.concat([Buffer.alloc(LOCAL_ID_LENGTH, 255)]),
			},
			supplyStoreSchema,
		);

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
		const escrowStore = context.getStore(this.moduleID, STORE_PREFIX_ESCROW);
		const escrowData = await escrowStore.iterateWithSchema<EscrowStoreData>(
			{
				start: Buffer.concat([Buffer.alloc(TOKEN_ID_LENGTH, 0)]),
				end: Buffer.concat([Buffer.alloc(TOKEN_ID_LENGTH, 255)]),
			},
			escrowStoreSchema,
		);
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

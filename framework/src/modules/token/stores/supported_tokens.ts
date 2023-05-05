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
import { NotFoundError } from '@liskhq/lisk-db';
import { BaseStore, ImmutableStoreGetter, StoreGetter } from '../../base_store';
import { getMainchainID } from '../../interoperability/utils';
import { CHAIN_ID_LENGTH, LOCAL_ID_LENGTH, TOKEN_ID_LENGTH } from '../constants';
import { splitTokenID } from '../utils';

export interface SupportedTokensStoreData {
	supportedTokenIDs: Buffer[];
}

export const supportedTokensStoreSchema = {
	$id: '/token/store/supportedTokens',
	type: 'object',
	required: ['supportedTokenIDs'],
	properties: {
		supportedTokenIDs: {
			type: 'array',
			fieldNumber: 1,
			items: {
				dataType: 'bytes',
				minLength: TOKEN_ID_LENGTH,
				maxLength: TOKEN_ID_LENGTH,
			},
		},
	},
};

export const ALL_SUPPORTED_TOKENS_KEY = Buffer.alloc(0);

export class SupportedTokensStore extends BaseStore<SupportedTokensStoreData> {
	public schema = supportedTokensStoreSchema;

	private _ownChainID!: Buffer;

	public registerOwnChainID(ownChainID: Buffer) {
		this._ownChainID = ownChainID;
	}

	public async allSupported(context: ImmutableStoreGetter): Promise<boolean> {
		return this.has(context, ALL_SUPPORTED_TOKENS_KEY);
	}

	public async isSupported(context: ImmutableStoreGetter, tokenID: Buffer): Promise<boolean> {
		if (this._isMainchainOrNative(tokenID)) {
			return true;
		}
		const allSupported = await this.allSupported(context);
		if (allSupported) {
			return true;
		}
		const chainID = tokenID.slice(0, CHAIN_ID_LENGTH);
		try {
			const supported = await this.get(context, chainID);
			if (
				supported.supportedTokenIDs.length === 0 ||
				supported.supportedTokenIDs.findIndex(id => id.equals(tokenID)) > -1
			) {
				return true;
			}
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		return false;
	}

	public async getAll(
		context: ImmutableStoreGetter,
	): Promise<{ key: Buffer; value: SupportedTokensStoreData }[]> {
		return this.iterate(context, {
			gte: Buffer.alloc(TOKEN_ID_LENGTH, 0),
			lte: Buffer.alloc(TOKEN_ID_LENGTH, 255),
		});
	}

	public async removeAll(context: StoreGetter): Promise<void> {
		const allSupportedTokens = await this.getAll(context);

		for (const { key } of allSupportedTokens) {
			await this.del(context, key);
		}
	}

	public async supportAll(context: StoreGetter): Promise<void> {
		await this.removeAll(context);
		await this.set(context, ALL_SUPPORTED_TOKENS_KEY, { supportedTokenIDs: [] });
	}

	public async supportChain(context: StoreGetter, chainID: Buffer): Promise<void> {
		// LSK or native token do not need entry
		if (this._isMainchainOrNative(Buffer.concat([chainID, Buffer.alloc(LOCAL_ID_LENGTH)]))) {
			return;
		}
		const allSupported = await this.allSupported(context);
		if (allSupported) {
			return;
		}
		await this.set(context, chainID, { supportedTokenIDs: [] });
	}

	public async removeSupportForChain(context: StoreGetter, chainID: Buffer): Promise<void> {
		// LSK or native token do not need entry
		if (this._isMainchainOrNative(Buffer.concat([chainID, Buffer.alloc(LOCAL_ID_LENGTH)]))) {
			return;
		}
		const allSupported = await this.allSupported(context);
		if (allSupported) {
			throw new Error('Invalid operation. All tokens from all chains are supported.');
		}
		if (chainID.equals(this._ownChainID)) {
			throw new Error(
				'Invalid operation. All tokens from all the specified chain should be supported.',
			);
		}
		const supportExist = await this.has(context, chainID);
		if (!supportExist) {
			return;
		}
		await this.del(context, chainID);
	}

	public async supportToken(context: StoreGetter, tokenID: Buffer): Promise<void> {
		// LSK or native token do not need entry
		if (this._isMainchainOrNative(tokenID)) {
			return;
		}
		const allSupported = await this.allSupported(context);
		if (allSupported) {
			return;
		}
		const [chainID] = splitTokenID(tokenID);
		let supported: SupportedTokensStoreData = { supportedTokenIDs: [] };
		try {
			supported = await this.get(context, chainID);
			if (supported.supportedTokenIDs.length === 0) {
				return;
			}
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		if (
			supported.supportedTokenIDs.length === 0 ||
			supported.supportedTokenIDs.findIndex(id => id.equals(tokenID)) === -1
		) {
			supported.supportedTokenIDs.push(tokenID);
			supported.supportedTokenIDs.sort((a, b) => a.compare(b));
			await this.del(context, ALL_SUPPORTED_TOKENS_KEY);
			await this.set(context, chainID, supported);
		}
	}

	public async removeSupportForToken(context: StoreGetter, tokenID: Buffer): Promise<void> {
		if (this._isMainchainOrNative(tokenID)) {
			throw new Error('Cannot remove support for LSK or native token.');
		}
		const allSupported = await this.allSupported(context);
		if (allSupported) {
			throw new Error('All tokens are supported.');
		}
		const [chainID] = splitTokenID(tokenID);
		const supportExist = await this.has(context, chainID);
		if (!supportExist) {
			return;
		}
		const supported = await this.get(context, chainID);
		if (supported.supportedTokenIDs.length === 0) {
			throw new Error('All tokens from the specified chain are supported.');
		}

		const index = supported.supportedTokenIDs.findIndex(id => id.equals(tokenID));
		if (index >= 0) {
			supported.supportedTokenIDs.splice(index, 1);
			await this.set(context, chainID, supported);

			if (supported.supportedTokenIDs.length === 0) {
				await this.del(context, chainID);
			}
		}
	}

	private _isMainchainOrNative(tokenID: Buffer): boolean {
		const [chainID] = splitTokenID(tokenID);
		if (chainID.equals(this._ownChainID)) {
			return true;
		}

		return chainID[0] === this._ownChainID[0] && getMainchainID(chainID).equals(chainID);
	}
}

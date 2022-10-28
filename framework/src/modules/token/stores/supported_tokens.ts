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
import { CHAIN_ID_LENGTH, CHAIN_ID_LSK, LOCAL_ID_LENGTH, TOKEN_ID_LENGTH } from '../constants';
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

	public async removeAll(context: StoreGetter): Promise<void> {
		// check if exist
		const allSupportedTokens = await this.iterate(context, {
			gte: Buffer.alloc(4, 0),
			lte: Buffer.alloc(4, 255),
		});
		for (const { key } of allSupportedTokens) {
			await this.del(context, key);
		}
	}

	public async supportAll(context: StoreGetter): Promise<void> {
		const allSupportedTokens = await this.iterate(context, {
			gte: Buffer.alloc(4, 0),
			lte: Buffer.alloc(4, 255),
		});
		for (const { key } of allSupportedTokens) {
			await this.del(context, key);
		}
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
		await this.del(context, ALL_SUPPORTED_TOKENS_KEY);
		await this.set(context, chainID, { supportedTokenIDs: [] });
	}

	public async removeSupportForChain(context: StoreGetter, chainID: Buffer): Promise<void> {
		// LSK or native token do not need entry
		if (this._isMainchainOrNative(Buffer.concat([chainID, Buffer.alloc(LOCAL_ID_LENGTH)]))) {
			return;
		}
		const supportExist = await this.has(context, chainID);
		if (!supportExist) {
			throw new Error(`ChainID ${chainID.toString('hex')} is not supported.`);
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
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		supported.supportedTokenIDs.push(tokenID);
		supported.supportedTokenIDs.sort((a, b) => a.compare(b));
		await this.del(context, ALL_SUPPORTED_TOKENS_KEY);
		await this.set(context, chainID, supported);
	}

	public async removeSupportForToken(context: StoreGetter, tokenID: Buffer): Promise<void> {
		if (this._isMainchainOrNative(tokenID)) {
			return;
		}
		const allSupported = await this.allSupported(context);
		if (allSupported) {
			return;
		}
		const [chainID] = splitTokenID(tokenID);
		const supported = await this.get(context, chainID);
		const index = supported.supportedTokenIDs.findIndex(id => id.equals(tokenID));
		if (index < 0) {
			throw new Error(`TokenID ${tokenID.toString('hex')} is not supported.`);
		}
		supported.supportedTokenIDs.splice(index, 1);

		if (supported.supportedTokenIDs.length > 0) {
			await this.set(context, chainID, supported);
		} else {
			await this.del(context, chainID);
		}
	}

	private _isMainchainOrNative(tokenID: Buffer): boolean {
		const [chainID] = splitTokenID(tokenID);
		if (chainID.equals(this._ownChainID)) {
			return true;
		}
		return chainID[0] === this._ownChainID[0] && chainID.slice(1).equals(CHAIN_ID_LSK.slice(1));
	}
}

/*
 * Copyright © 2023 Lisk Foundation
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

import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import { JSONObject } from '../../types';
import { CCMsg } from '../interoperability';

export interface ModuleConfig {
	ownChainID: Buffer;
}

export interface InteroperabilityMethod {
	send(
		methodContext: MethodContext,
		feeAddress: Buffer,
		module: string,
		crossChainCommand: string,
		receivingChainID: Buffer,
		fee: bigint,
		parameters: Buffer,
		timestamp?: number,
	): Promise<void>;
	error(methodContext: MethodContext, ccm: CCMsg, code: number): Promise<void>;
	terminateChain(methodContext: MethodContext, chainID: Buffer): Promise<void>;
	getMessageFeeTokenID(methodContext: ImmutableMethodContext, chainID: Buffer): Promise<Buffer>;
}

export interface FeeMethod {
	payFee(methodContext: MethodContext, amount: bigint): void;
}

export interface TokenMethod {
	getAvailableBalance(
		methodContext: ImmutableMethodContext,
		address: Buffer,
		tokenID: Buffer,
	): Promise<bigint>;
}

export interface NFTMethod {
	getChainID(nftID: Buffer): Buffer;
	destroy(methodContext: MethodContext, address: Buffer, nftID: Buffer): Promise<void>;
	getNFT(methodContext: ImmutableMethodContext, nftID: Buffer): Promise<NFT>;
	isNFTEscrowed(nft: NFT): boolean;
	isNFTLocked(nft: NFT): boolean;
}

export interface NFTAttributes {
	module: string;
	attributes: Buffer;
}

/** Interface for NFTs */
export interface NFT {
	// Owner of the NFT
	owner: Buffer;
	// NFT Attributes
	attributesArray: NFTAttributes[];
	// Name of the module locking the NFT (if locked).
	lockingModule?: string;
}

export type NFTJSON = JSONObject<NFT>;

export interface NFTOutputEndpoint {
	owner: string;
	attributesArray: NFTAttributes[];
	lockingModule?: string;
}

export interface GenesisNFTStore {
	nftSubstore: {
		nftID: Buffer;
		owner: Buffer;
		attributesArray: {
			module: string;
			attributes: Buffer;
		}[];
	}[];
	supportedNFTsSubstore: {
		chainID: Buffer;
		supportedCollectionIDArray: {
			collectionID: Buffer;
		}[];
	}[];
}

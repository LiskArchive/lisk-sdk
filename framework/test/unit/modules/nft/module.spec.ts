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

import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { BlockAssets } from '@liskhq/lisk-chain';
import { NFTModule } from '../../../../src/modules/nft/module';
import { createGenesisBlockContext } from '../../../../src/testing';
import {
	invalidSchemaNFTSubstoreGenesisAssets,
	invalidSchemaSupportedNFTsSubstoreGenesisAssets,
	validData,
} from './init_genesis_state_fixtures';
import { genesisNFTStoreSchema } from '../../../../src/modules/nft/schemas';
import {
	ALL_SUPPORTED_NFTS_KEY,
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	LENGTH_COLLECTION_ID,
	LENGTH_NFT_ID,
	MODULE_NAME_NFT,
	NFT_NOT_LOCKED,
} from '../../../../src/modules/nft/constants';
import { NFTStore } from '../../../../src/modules/nft/stores/nft';
import { SupportedNFTsStore } from '../../../../src/modules/nft/stores/supported_nfts';
import { UserStore } from '../../../../src/modules/nft/stores/user';
import { EscrowStore } from '../../../../src/modules/nft/stores/escrow';

describe('nft module', () => {
	const module = new NFTModule();

	const nftStore = module.stores.get(NFTStore);
	const userStore = module.stores.get(UserStore);
	const escrowStore = module.stores.get(EscrowStore);
	const supportedNFTsSubstore = module.stores.get(SupportedNFTsStore);

	const createGenesisBlockContextFromGenesisAssets = (genesisAssets: object) => {
		const encodedAsset = codec.encode(genesisNFTStoreSchema, genesisAssets);

		const context = createGenesisBlockContext({
			assets: new BlockAssets([{ module: module.name, data: encodedAsset }]),
		}).createInitGenesisStateContext();

		return context;
	};

	it('should have the name "nft"', () => {
		expect(module.name).toBe(MODULE_NAME_NFT);
	});

	describe('initGenesisState', () => {
		describe('validate nftSubstore schema', () => {
			it.each(invalidSchemaNFTSubstoreGenesisAssets)('%s', async (_, input, err) => {
				if (typeof input === 'string') {
					return;
				}

				const encodedAsset = codec.encode(genesisNFTStoreSchema, input);

				const context = createGenesisBlockContext({
					assets: new BlockAssets([{ module: module.name, data: encodedAsset }]),
				}).createInitGenesisStateContext();

				await expect(module.initGenesisState(context)).rejects.toThrow(err as string);
			});
		});

		describe('validate supportedNFTsSubstore schema', () => {
			it.each(invalidSchemaSupportedNFTsSubstoreGenesisAssets)('%s', async (_, input, err) => {
				if (typeof input === 'string') {
					return;
				}

				const encodedAsset = codec.encode(genesisNFTStoreSchema, input);

				const context = createGenesisBlockContext({
					assets: new BlockAssets([{ module: module.name, data: encodedAsset }]),
				}).createInitGenesisStateContext();

				await expect(module.initGenesisState(context)).rejects.toThrow(err as string);
			});
		});

		it('should throw if owner of the NFT is not a valid address', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: utils.getRandomBytes(LENGTH_ADDRESS - 1),
						attributesArray: [],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${nftID.toString('hex')} has invalid owner`,
			);
		});

		it('should throw if owner of the NFT is not a valid chain', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: utils.getRandomBytes(LENGTH_CHAIN_ID + 1),
						attributesArray: [],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${nftID.toString('hex')} has invalid owner`,
			);
		});

		it('should throw if nftID is duplicated', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: utils.getRandomBytes(LENGTH_ADDRESS),
						attributesArray: [],
					},
					{
						nftID,
						owner: utils.getRandomBytes(LENGTH_ADDRESS),
						attributesArray: [],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${nftID.toString('hex')} duplicated`,
			);
		});

		it('should throw if NFT has duplicate attribute for a module', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
			const moduleName = 'pos';

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: utils.getRandomBytes(LENGTH_ADDRESS),
						attributesArray: [
							{
								module: moduleName,
								attributes: Buffer.alloc(10),
							},
							{
								module: moduleName,
								attributes: Buffer.alloc(0),
							},
						],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${nftID.toString('hex')} has a duplicate attribute for pos module`,
			);
		});

		it('should throw if all NFTs are supported and SupportedNFTsSubstore contains more than one entry', async () => {
			const genesisAssets = {
				...validData,
				supportedNFTsSubstore: [
					{
						chainID: Buffer.alloc(0),
						supportedCollectionIDArray: [],
					},
					{
						chainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
						supportedCollectionIDArray: [],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				'SupportedNFTsSubstore should contain only one entry if all NFTs are supported',
			);
		});

		it('should throw if all NFTs are supported and supportedCollectionIDArray is not empty', async () => {
			const genesisAssets = {
				...validData,
				supportedNFTsSubstore: [
					{
						chainID: ALL_SUPPORTED_NFTS_KEY,
						supportedCollectionIDArray: [
							{
								collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID),
							},
						],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				'supportedCollectionIDArray must be empty if all NFTs are supported',
			);
		});

		it('should throw if supported chain is duplicated', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			const genesisAssets = {
				...validData,
				supportedNFTsSubstore: [
					{
						chainID,
						supportedCollectionIDArray: [],
					},
					{
						chainID,
						supportedCollectionIDArray: [],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`chainID ${chainID.toString('hex')} duplicated`,
			);
		});

		it('should create NFTs, their corresponding user or escrow entries and supported chains', async () => {
			const context = createGenesisBlockContextFromGenesisAssets(validData);

			await expect(module.initGenesisState(context)).resolves.toBeUndefined();

			for (const nft of validData.nftSubstore) {
				const { nftID, owner, attributesArray } = nft;

				await expect(nftStore.get(context.getMethodContext(), nftID)).resolves.toEqual({
					owner,
					attributesArray,
				});

				if (owner.length === LENGTH_CHAIN_ID) {
					await expect(
						escrowStore.get(context.getMethodContext(), escrowStore.getKey(owner, nftID)),
					).resolves.toEqual({});
				} else {
					await expect(
						userStore.get(context.getMethodContext(), userStore.getKey(owner, nftID)),
					).resolves.toEqual({
						lockingModule: NFT_NOT_LOCKED,
					});
				}
			}

			for (const supportedChain of validData.supportedNFTsSubstore) {
				const { chainID, supportedCollectionIDArray } = supportedChain;

				await expect(
					supportedNFTsSubstore.get(context.getMethodContext(), chainID),
				).resolves.toEqual({ supportedCollectionIDArray });
			}
		});

		it('should create entries for all NFTs lexicographically', async () => {
			const nftID1 = Buffer.alloc(LENGTH_NFT_ID, 1);
			const nftID2 = Buffer.alloc(LENGTH_NFT_ID, 0);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID: nftID1,
						owner: utils.getRandomBytes(LENGTH_ADDRESS),
						attributesArray: [],
					},
					{
						nftID: nftID2,
						owner: utils.getRandomBytes(LENGTH_ADDRESS),
						attributesArray: [],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).resolves.toBeUndefined();

			const allNFTs = await nftStore.iterate(context.getMethodContext(), {
				gte: Buffer.alloc(LENGTH_NFT_ID, 0),
				lte: Buffer.alloc(LENGTH_NFT_ID, 255),
			});

			const expectedKeys = [nftID2, nftID1];

			expect(expectedKeys).toEqual(allNFTs.map(nft => nft.key));
		});

		it('should create entry for an NFT with attributesArray sorted lexicographically on module', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: utils.getRandomBytes(LENGTH_ADDRESS),
						attributesArray: [
							{
								module: 'token',
								attributes: utils.getRandomBytes(10),
							},
							{
								module: 'pos',
								attributes: utils.getRandomBytes(10),
							},
						],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).resolves.toBeUndefined();

			const nft = await nftStore.get(context.getMethodContext(), nftID);

			expect(nft.attributesArray.map(attribute => attribute.module)).toEqual(['pos', 'token']);
		});

		it('should remove entries in attributes array with empty attributes', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: utils.getRandomBytes(LENGTH_ADDRESS),
						attributesArray: [
							{
								module: 'token',
								attributes: Buffer.alloc(0),
							},
						],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).resolves.toBeUndefined();

			const nft = await nftStore.get(context.getMethodContext(), nftID);

			expect(nft.attributesArray).toHaveLength(0);
		});

		it('should create an entry for ALL_SUPPORTED_NFTS_KEY with empty supportedCollectionIDArray if all NFTs are supported', async () => {
			const genesisAssets = {
				...validData,
				supportedNFTsSubstore: [
					{
						chainID: ALL_SUPPORTED_NFTS_KEY,
						supportedCollectionIDArray: [],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).resolves.toBeUndefined();

			const supportedNFTs = await supportedNFTsSubstore.get(
				context.getMethodContext(),
				ALL_SUPPORTED_NFTS_KEY,
			);

			expect(supportedNFTs.supportedCollectionIDArray).toHaveLength(0);
		});

		it('should create entries for supported chains lexicographically', async () => {
			const chainID1 = Buffer.alloc(LENGTH_CHAIN_ID, 1);
			const chainID2 = Buffer.alloc(LENGTH_CHAIN_ID, 0);

			const genesisAssets = {
				...validData,
				supportedNFTsSubstore: [
					{
						chainID: chainID1,
						supportedCollectionIDArray: [],
					},
					{
						chainID: chainID2,
						supportedCollectionIDArray: [],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).resolves.toBeUndefined();

			const allSupportedNFTs = await supportedNFTsSubstore.getAll(context.getMethodContext());

			const expectedKeys = [chainID2, chainID1];

			expect(expectedKeys).toEqual(allSupportedNFTs.map(supportedNFTs => supportedNFTs.key));
		});

		it('should create an entry for supported chains with supportedCollectionIDArray sorted lexicographically', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			const collectionID1 = Buffer.alloc(LENGTH_COLLECTION_ID, 1);
			const collectionID2 = Buffer.alloc(LENGTH_COLLECTION_ID, 0);

			const genesisAssets = {
				...validData,
				supportedNFTsSubstore: [
					{
						chainID,
						supportedCollectionIDArray: [
							{
								collectionID: collectionID1,
							},
							{
								collectionID: collectionID2,
							},
						],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).resolves.toBeUndefined();

			const supportedNFT = await supportedNFTsSubstore.get(context.getMethodContext(), chainID);

			expect(supportedNFT.supportedCollectionIDArray).toEqual([
				{
					collectionID: collectionID2,
				},
				{
					collectionID: collectionID1,
				},
			]);
		});
	});
});

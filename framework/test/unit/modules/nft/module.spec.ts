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
	invalidSchemaEscrowSubstoreGenesisAssets,
	invalidSchemaNFTSubstoreGenesisAssets,
	invalidSchemaSupportedNFTsSubstoreGenesisAssets,
	invalidSchemaUserSubstoreGenesisAssets,
	validData,
} from './init_genesis_state_fixtures';
import { genesisNFTStoreSchema } from '../../../../src/modules/nft/schemas';
import {
	ALL_SUPPORTED_NFTS_KEY,
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	LENGTH_COLLECTION_ID,
	LENGTH_NFT_ID,
} from '../../../../src/modules/nft/constants';
import { NFTStore } from '../../../../src/modules/nft/stores/nft';
import { SupportedNFTsStore } from '../../../../src/modules/nft/stores/supported_nfts';
import { UserStore } from '../../../../src/modules/nft/stores/user';
import { EscrowStore } from '../../../../src/modules/nft/stores/escrow';

describe('nft module', () => {
	const module = new NFTModule();

	const nftStore = module.stores.get(NFTStore);
	const userStore = module.stores.get(UserStore);
	const supportedNFTsSubstore = module.stores.get(SupportedNFTsStore);
	const escrowStore = module.stores.get(EscrowStore);

	const createGenesisBlockContextFromGenesisAssets = (genesisAssets: object) => {
		const encodedAsset = codec.encode(genesisNFTStoreSchema, genesisAssets);

		const context = createGenesisBlockContext({
			assets: new BlockAssets([{ module: module.name, data: encodedAsset }]),
		}).createInitGenesisStateContext();

		return context;
	};

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

		describe('validate userSubstore schema', () => {
			it.each(invalidSchemaUserSubstoreGenesisAssets)('%s', async (_, input, err) => {
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

		describe('validate escrowSubstore schema', () => {
			it.each(invalidSchemaEscrowSubstoreGenesisAssets)('%s', async (_, input, err) => {
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

		it('should throw if NFT does not have a corresponding entry for user or escrow store', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: utils.getRandomBytes(LENGTH_ADDRESS),
						attributesArray: [],
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${nftID.toString(
					'hex',
				)} has no corresponding entry for UserSubstore or EscrowSubstore`,
			);
		});

		it('should throw if NFT has an entry for both user and escrow store', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
			// const owner = utils.getRandomBytes(LENGTH_ADDRESS);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: utils.getRandomBytes(LENGTH_ADDRESS),
						attributesArray: [],
					},
				],
				userSubstore: [
					{
						address: utils.getRandomBytes(LENGTH_ADDRESS),
						nftID,
						lockingModule: 'pos',
					},
				],
				escrowSubstore: [
					{
						escrowedChainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
						nftID,
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${nftID.toString('hex')} has an entry for both UserSubstore and EscrowSubstore`,
			);
		});

		it('should throw if NFT has multiple entries for user store', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
			const owner = utils.getRandomBytes(LENGTH_ADDRESS);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner,
						attributesArray: [],
					},
				],
				userSubstore: [
					{
						address: owner,
						nftID,
						lockingModule: 'pos',
					},
					{
						address: owner,
						nftID,
						lockingModule: 'token',
					},
				],
				escrowSubstore: [],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${nftID.toString('hex')} has multiple entries for UserSubstore`,
			);
		});

		it('should throw if NFT has multiple entries for escrow store', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
			const escrowedChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: escrowedChainID,
						attributesArray: [],
					},
				],
				userSubstore: [],
				escrowSubstore: [
					{
						escrowedChainID,
						nftID,
					},
					{
						escrowedChainID,
						nftID,
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${nftID.toString('hex')} has multiple entries for EscrowSubstore`,
			);
		});

		it('should throw if escrowed NFT has no corresponding entry for escrow store', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: utils.getRandomBytes(LENGTH_CHAIN_ID),
						attributesArray: [],
					},
				],
				userSubstore: [
					{
						address: utils.getRandomBytes(LENGTH_ADDRESS),
						nftID,
						lockingModule: 'pos',
					},
				],
				escrowSubstore: [],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${nftID.toString('hex')} should have a corresponding entry for EscrowSubstore only`,
			);
		});

		it('should throw if NFT has duplicate attribute for an array', async () => {
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
				userSubstore: [
					{
						address: utils.getRandomBytes(LENGTH_ADDRESS),
						nftID,
						lockingModule: 'pos',
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${nftID.toString('hex')} has a duplicate attribute for pos module`,
			);
		});

		it('should throw if an NFT in user store has no corresponding entry for nft store', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
			const owner = utils.getRandomBytes(LENGTH_ADDRESS);

			const additionalNFTID = utils.getRandomBytes(LENGTH_NFT_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner,
						attributesArray: [],
					},
				],
				userSubstore: [
					{
						address: owner,
						nftID,
						lockingModule: 'pos',
					},
					{
						address: utils.getRandomBytes(LENGTH_ADDRESS),
						nftID: additionalNFTID,
						lockingModule: 'pos',
					},
				],
				escrowSubstore: [],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${additionalNFTID.toString(
					'hex',
				)} in UserSubstore has no corresponding entry for NFTSubstore`,
			);
		});

		it('should throw if an NFT in escrow store has no corresponding entry for nft store', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);
			const escrowedChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			const additionalNFTID = utils.getRandomBytes(LENGTH_NFT_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID,
						owner: escrowedChainID,
						attributesArray: [],
					},
				],
				userSubstore: [],
				escrowSubstore: [
					{
						nftID,
						escrowedChainID,
					},
					{
						nftID: additionalNFTID,
						escrowedChainID,
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).rejects.toThrow(
				`nftID ${additionalNFTID.toString(
					'hex',
				)} in EscrowSubstore has no corresponding entry for NFTSubstore`,
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
				userSubstore: [
					{
						address: utils.getRandomBytes(LENGTH_ADDRESS),
						nftID: nftID1,
						lockingModule: 'pos',
					},
					{
						address: utils.getRandomBytes(LENGTH_ADDRESS),
						nftID: nftID2,
						lockingModule: 'pos',
					},
				],
				escrowSubstore: [],
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
				userSubstore: [
					{
						address: utils.getRandomBytes(LENGTH_ADDRESS),
						nftID,
						lockingModule: 'pos',
					},
				],
				escrowSubstore: [],
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
				userSubstore: [
					{
						address: utils.getRandomBytes(LENGTH_ADDRESS),
						nftID,
						lockingModule: 'token',
					},
				],
				escrowSubstore: [],
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

		it('should create entries for user and escrow store', async () => {
			const nftID1 = utils.getRandomBytes(LENGTH_NFT_ID);
			const nftID2 = utils.getRandomBytes(LENGTH_NFT_ID);
			const nftID3 = utils.getRandomBytes(LENGTH_NFT_ID);

			const escrowedNFTID1 = utils.getRandomBytes(LENGTH_NFT_ID);
			const escrowedNFTID2 = utils.getRandomBytes(LENGTH_NFT_ID);

			const owner1 = utils.getRandomBytes(LENGTH_ADDRESS);
			const owner2 = utils.getRandomBytes(LENGTH_ADDRESS);

			const escrowedChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			const genesisAssets = {
				...validData,
				nftSubstore: [
					{
						nftID: nftID1,
						owner: owner1,
						attributesArray: [],
					},
					{
						nftID: nftID2,
						owner: owner1,
						attributesArray: [],
					},
					{
						nftID: nftID3,
						owner: owner2,
						attributesArray: [],
					},
					{
						nftID: escrowedNFTID1,
						owner: escrowedChainID,
						attributesArray: [],
					},
					{
						nftID: escrowedNFTID2,
						owner: escrowedChainID,
						attributesArray: [],
					},
				],
				userSubstore: [
					{
						address: owner1,
						nftID: nftID1,
						lockingModule: 'pos',
					},
					{
						address: owner1,
						nftID: nftID2,
						lockingModule: 'token',
					},
					{
						address: owner2,
						nftID: nftID3,
						lockingModule: 'auth',
					},
				],
				escrowSubstore: [
					{
						escrowedChainID,
						nftID: escrowedNFTID1,
					},
					{
						escrowedChainID,
						nftID: escrowedNFTID2,
					},
				],
			};

			const context = createGenesisBlockContextFromGenesisAssets(genesisAssets);

			await expect(module.initGenesisState(context)).resolves.toBeUndefined();

			await expect(
				userStore.get(context.getMethodContext(), userStore.getKey(owner1, nftID1)),
			).resolves.toEqual({ lockingModule: 'pos' });

			await expect(
				userStore.get(context.getMethodContext(), userStore.getKey(owner1, nftID2)),
			).resolves.toEqual({ lockingModule: 'token' });

			await expect(
				userStore.get(context.getMethodContext(), userStore.getKey(owner2, nftID3)),
			).resolves.toEqual({ lockingModule: 'auth' });

			await expect(
				escrowStore.get(
					context.getMethodContext(),
					escrowStore.getKey(escrowedChainID, escrowedNFTID1),
				),
			).resolves.toEqual({});

			await expect(
				escrowStore.get(
					context.getMethodContext(),
					escrowStore.getKey(escrowedChainID, escrowedNFTID2),
				),
			).resolves.toEqual({});
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

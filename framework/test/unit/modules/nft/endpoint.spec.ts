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

import { validator } from '@liskhq/lisk-validator';
import { address, utils } from '@liskhq/lisk-cryptography';
import { NFTEndpoint } from '../../../../src/modules/nft/endpoint';
import { NFTMethod } from '../../../../src/modules/nft/method';
import { NFTModule } from '../../../../src/modules/nft/module';
import { MethodContext } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import {
	InMemoryPrefixedStateDB,
	createTransientMethodContext,
	createTransientModuleEndpointContext,
} from '../../../../src/testing';
import { NFTStore } from '../../../../src/modules/nft/stores/nft';
import { UserStore } from '../../../../src/modules/nft/stores/user';
import {
	ALL_SUPPORTED_NFTS_KEY,
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	LENGTH_COLLECTION_ID,
	LENGTH_NFT_ID,
	NFT_NOT_LOCKED,
} from '../../../../src/modules/nft/constants';
import { NFT } from '../../../../src/modules/nft/types';
import { JSONObject } from '../../../../src';
import { SupportedNFTsStore } from '../../../../src/modules/nft/stores/supported_nfts';
import {
	isCollectionIDSupportedResponseSchema,
	getEscrowedNFTIDsResponseSchema,
	getNFTResponseSchema,
	getNFTsResponseSchema,
	hasNFTResponseSchema,
	isNFTSupportedResponseSchema,
} from '../../../../src/modules/nft/schemas';
import { EscrowStore } from '../../../../src/modules/nft/stores/escrow';

type NFTofOwner = Omit<NFT, 'owner'> & { id: Buffer };

describe('NFTEndpoint', () => {
	const module = new NFTModule();
	const method = new NFTMethod(module.stores, module.events);
	const endpoint = new NFTEndpoint(module.stores, module.events);
	const ownChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
	method.init({ ownChainID });

	endpoint.addDependencies(method);

	const nftStore = module.stores.get(NFTStore);
	const userStore = module.stores.get(UserStore);
	const escrowStore = module.stores.get(EscrowStore);
	const supportedNFTsStore = module.stores.get(SupportedNFTsStore);

	let stateStore: PrefixedStateReadWriter;
	let methodContext: MethodContext;

	const owner = utils.getRandomBytes(LENGTH_ADDRESS);
	const ownerAddress = address.getLisk32AddressFromAddress(owner);
	const escrowChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

	const nfts: NFTofOwner[] = [
		{
			id: utils.getRandomBytes(LENGTH_NFT_ID),
			attributesArray: [
				{
					module: 'pos',
					attributes: Buffer.alloc(10, 0),
				},
			],
			lockingModule: NFT_NOT_LOCKED,
		},
		{
			id: utils.getRandomBytes(LENGTH_NFT_ID),
			attributesArray: [],
			lockingModule: 'pos',
		},
	];

	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		methodContext = createTransientMethodContext({ stateStore });
	});

	describe('getNFTs', () => {
		beforeEach(async () => {
			for (const nft of nfts) {
				await nftStore.save(methodContext, nft.id, {
					owner,
					attributesArray: nft.attributesArray,
				});

				await userStore.set(methodContext, userStore.getKey(owner, nft.id), {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					lockingModule: nft.lockingModule!,
				});
			}

			await nftStore.save(methodContext, utils.getRandomBytes(LENGTH_NFT_ID), {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				attributesArray: [],
			});
		});

		it('should fail if address does not have valid length', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: 'incorrect',
				},
			});

			await expect(endpoint.getNFTs(context)).rejects.toThrow(
				`'.address' must match format "lisk32"`,
			);
		});

		it('should return empty NFTs collection if owner has no NFTs', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: address.getLisk32AddressFromAddress(utils.getRandomBytes(LENGTH_ADDRESS)),
				},
			});

			await expect(endpoint.getNFTs(context)).resolves.toEqual({ nfts: [] });

			validator.validate(getNFTsResponseSchema, { nfts: [] });
		});

		it('should return NFTs for the provided owner lexicograhpically per id', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: ownerAddress,
				},
			});

			const expectedNFTs = {
				nfts: nfts
					.sort((a, b) => a.id.compare(b.id))
					.map(nft => ({
						id: nft.id.toString('hex'),
						attributesArray: nft.attributesArray.map(attribute => ({
							module: attribute.module,
							attributes: attribute.attributes.toString('hex'),
						})),
						lockingModule: nft.lockingModule,
					})),
			};

			await expect(endpoint.getNFTs(context)).resolves.toEqual(expectedNFTs);

			validator.validate(getNFTsResponseSchema, expectedNFTs);
		});

		it('should return NFT details for escrowed NFT', async () => {
			await escrowStore.set(methodContext, escrowChainID, {});

			await nftStore.save(methodContext, nfts[0].id, {
				owner: escrowChainID,
				attributesArray: [],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					id: nfts[0].id.toString('hex'),
				},
			});

			const expectedNFT: JSONObject<NFT> = {
				owner: escrowChainID.toString('hex'),
				attributesArray: [],
			};

			await expect(endpoint.getNFT(context)).resolves.toEqual(expectedNFT);

			validator.validate(getNFTResponseSchema, expectedNFT);
		});
	});

	describe('hasNFT', () => {
		it('should fail if address is not valid', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: 'incorrect',
					id: utils.getRandomBytes(LENGTH_NFT_ID).toString('hex'),
				},
			});

			await expect(endpoint.hasNFT(context)).rejects.toThrow(
				`'.address' must match format "lisk32"`,
			);
		});

		it('should fail if id does not have valid length', async () => {
			const minLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: ownerAddress,
					id: utils.getRandomBytes(LENGTH_NFT_ID - 1).toString('hex'),
				},
			});

			const maxLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: ownerAddress,
					id: utils.getRandomBytes(LENGTH_NFT_ID + 1).toString('hex'),
				},
			});

			await expect(endpoint.hasNFT(minLengthContext)).rejects.toThrow(
				`'.id' must NOT have fewer than 32 characters`,
			);

			await expect(endpoint.hasNFT(maxLengthContext)).rejects.toThrow(
				`'.id' must NOT have more than 32 characters`,
			);
		});

		it('should return false if provided NFT does not exist', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: ownerAddress,
					id: utils.getRandomBytes(LENGTH_NFT_ID).toString('hex'),
				},
			});

			await expect(endpoint.hasNFT(context)).resolves.toEqual({ hasNFT: false });

			validator.validate(hasNFTResponseSchema, { hasNFT: false });
		});

		it('should return false if provided NFT is not owned by the provided address', async () => {
			await nftStore.save(methodContext, nfts[0].id, {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				attributesArray: [],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: ownerAddress,
					id: nfts[0].id.toString('hex'),
				},
			});

			await expect(endpoint.hasNFT(context)).resolves.toEqual({ hasNFT: false });

			validator.validate(hasNFTResponseSchema, { hasNFT: false });
		});

		it('should return true if provided is owned by the provided address', async () => {
			await nftStore.save(methodContext, nfts[0].id, {
				owner,
				attributesArray: [],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: ownerAddress,
					id: nfts[0].id.toString('hex'),
				},
			});

			await expect(endpoint.hasNFT(context)).resolves.toEqual({ hasNFT: true });

			validator.validate(hasNFTResponseSchema, { hasNFT: true });
		});
	});

	describe('getNFT', () => {
		it('should fail if id does not have valid length', async () => {
			const minLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					id: utils.getRandomBytes(LENGTH_NFT_ID - 1).toString('hex'),
				},
			});

			const maxLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					id: utils.getRandomBytes(LENGTH_NFT_ID + 1).toString('hex'),
				},
			});

			await expect(endpoint.getNFT(minLengthContext)).rejects.toThrow(
				`'.id' must NOT have fewer than 32 characters`,
			);

			await expect(endpoint.getNFT(maxLengthContext)).rejects.toThrow(
				`'.id' must NOT have more than 32 characters`,
			);
		});

		it('should fail if NFT does not exist', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					id: nfts[0].id.toString('hex'),
				},
			});

			await expect(endpoint.getNFT(context)).rejects.toThrow('NFT substore entry does not exist');
		});

		it('should return NFT details', async () => {
			const attributesArray = [
				{
					module: 'pos',
					attributes: utils.getRandomBytes(10),
				},
			];
			await nftStore.save(methodContext, nfts[0].id, {
				owner,
				attributesArray,
			});

			await userStore.set(methodContext, userStore.getKey(owner, nfts[0].id), {
				lockingModule: NFT_NOT_LOCKED,
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					id: nfts[0].id.toString('hex'),
				},
			});

			const expectedNFT: JSONObject<NFT> = {
				owner: owner.toString('hex'),
				attributesArray: attributesArray.map(attribute => ({
					module: attribute.module,
					attributes: attribute.attributes.toString('hex'),
				})),
				lockingModule: NFT_NOT_LOCKED,
			};

			await expect(endpoint.getNFT(context)).resolves.toEqual(expectedNFT);

			validator.validate(getNFTResponseSchema, expectedNFT);
		});
	});

	describe('getSupportedCollectionIDs', () => {
		it('should return an array with a single * when all collections are supported', async () => {
			await supportedNFTsStore.save(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID).toString('hex'),
				},
			});

			await expect(endpoint.getSupportedCollectionIDs(context)).resolves.toEqual({
				supportedCollectionIDs: ['*'],
			});
		});

		it('should return an empty array when there are no supported collection IDs', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID).toString('hex'),
				},
			});

			await expect(endpoint.getSupportedCollectionIDs(context)).resolves.toEqual({
				supportedCollectionIDs: [],
			});
		});

		it('should return an array with chainID + "********" when there are no supported collection IDs for the provided chainID', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: chainID.toString('hex'),
				},
			});

			await expect(endpoint.getSupportedCollectionIDs(context)).resolves.toEqual({
				supportedCollectionIDs: [`${chainID.toString('hex')}********`],
			});
		});

		it('should return an array with supported collection ID', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const collectionID = utils.getRandomBytes(LENGTH_COLLECTION_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [
					{
						collectionID,
					},
				],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: chainID.toString('hex'),
				},
			});

			await expect(endpoint.getSupportedCollectionIDs(context)).resolves.toEqual({
				supportedCollectionIDs: [Buffer.concat([chainID, collectionID]).toString('hex')],
			});
		});
	});

	describe('isCollectionIDSupported', () => {
		it('should fail if provided chainID has invalid length', async () => {
			const minLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID - 1).toString('hex'),
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID).toString('hex'),
				},
			});

			const maxLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID + 1).toString('hex'),
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID).toString('hex'),
				},
			});

			await expect(endpoint.isCollectionIDSupported(minLengthContext)).rejects.toThrow(
				`'.chainID' must NOT have fewer than 8 characters`,
			);

			await expect(endpoint.isCollectionIDSupported(maxLengthContext)).rejects.toThrow(
				`'.chainID' must NOT have more than 8 characters`,
			);
		});

		it('should fail if provided collectionID has invalid length', async () => {
			const minLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID).toString('hex'),
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID - 1).toString('hex'),
				},
			});

			const maxLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID).toString('hex'),
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID + 1).toString('hex'),
				},
			});

			await expect(endpoint.isCollectionIDSupported(minLengthContext)).rejects.toThrow(
				`'.collectionID' must NOT have fewer than 8 characters`,
			);

			await expect(endpoint.isCollectionIDSupported(maxLengthContext)).rejects.toThrow(
				`'.collectionID' must NOT have more than 8 characters`,
			);
		});

		it('should return false if NFT is not supported', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID).toString('hex'),
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID).toString('hex'),
				},
			});

			await expect(endpoint.isCollectionIDSupported(context)).resolves.toEqual({
				isCollectionIDSupported: false,
			});
		});

		it('should return false if provided chainID does not exist', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID).toString('hex'),
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID).toString('hex'),
				},
			});

			await expect(endpoint.isCollectionIDSupported(context)).resolves.toEqual({
				isCollectionIDSupported: false,
			});

			validator.validate(isCollectionIDSupportedResponseSchema, { isCollectionIDSupported: false });
		});

		it('should return false if provided collectionID does not exist for the provided chainID', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [
					{
						collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID),
					},
				],
			});
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: chainID.toString('hex'),
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID).toString('hex'),
				},
			});

			await expect(endpoint.isCollectionIDSupported(context)).resolves.toEqual({
				isCollectionIDSupported: false,
			});
		});

		it('should return true if provided collectionID exists for the provided chainID', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const collectionID = utils.getRandomBytes(LENGTH_COLLECTION_ID);

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [
					{
						collectionID,
					},
				],
			});
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: chainID.toString('hex'),
					collectionID: collectionID.toString('hex'),
				},
			});

			await expect(endpoint.isCollectionIDSupported(context)).resolves.toEqual({
				isCollectionIDSupported: true,
			});

			validator.validate(isCollectionIDSupportedResponseSchema, { isCollectionIDSupported: true });
		});
	});

	describe('getEscrowedNFTIDs', () => {
		it('should fail if provided chainID has invalid length', async () => {
			const minLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID - 1).toString('hex'),
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID).toString('hex'),
				},
			});

			const maxLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID + 1).toString('hex'),
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID).toString('hex'),
				},
			});

			await expect(endpoint.getEscrowedNFTIDs(minLengthContext)).rejects.toThrow(
				`'.chainID' must NOT have fewer than 8 characters`,
			);

			await expect(endpoint.getEscrowedNFTIDs(maxLengthContext)).rejects.toThrow(
				`'.chainID' must NOT have more than 8 characters`,
			);
		});

		it('should return empty list if provided chain has no NFTs escrowed to it', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID).toString('hex'),
				},
			});

			await expect(endpoint.getEscrowedNFTIDs(context)).resolves.toEqual({ escrowedNFTIDs: [] });

			validator.validate(getEscrowedNFTIDsResponseSchema, { escrowedNFTIDs: [] });
		});

		it('should return list of escrowed NFTs for the chainID', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const nftIDs = [Buffer.alloc(LENGTH_NFT_ID, 0), Buffer.alloc(LENGTH_NFT_ID, 255)];

			for (const nftID of nftIDs) {
				await nftStore.save(methodContext, nftID, {
					owner: chainID,
					attributesArray: [],
				});
			}

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					chainID: chainID.toString('hex'),
				},
			});

			const expectedNFTIDs = { escrowedNFTIDs: nftIDs.map(nftID => nftID.toString('hex')) };

			await expect(endpoint.getEscrowedNFTIDs(context)).resolves.toEqual(expectedNFTIDs);

			validator.validate(getEscrowedNFTIDsResponseSchema, expectedNFTIDs);
		});
	});

	describe('isNFTSupported', () => {
		it('should fail if nftID does not have valid length', async () => {
			const minLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					nftID: utils.getRandomBytes(LENGTH_NFT_ID - 1).toString('hex'),
				},
			});

			const maxLengthContext = createTransientModuleEndpointContext({
				stateStore,
				params: {
					nftID: utils.getRandomBytes(LENGTH_NFT_ID + 1).toString('hex'),
				},
			});

			await expect(endpoint.isNFTSupported(minLengthContext)).rejects.toThrow(
				`'.nftID' must NOT have fewer than 32 characters`,
			);

			await expect(endpoint.isNFTSupported(maxLengthContext)).rejects.toThrow(
				`'.nftID' must NOT have more than 32 characters`,
			);
		});

		it('should return false if NFT does not exist', async () => {
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					nftID: utils.getRandomBytes(LENGTH_NFT_ID).toString('hex'),
				},
			});

			await expect(endpoint.isNFTSupported(context)).resolves.toEqual({ isNFTSupported: false });

			validator.validate(isNFTSupportedResponseSchema, { isNFTSupported: false });
		});

		it('should return true if chainID of NFT is equal to ownChainID', async () => {
			const nftID = Buffer.concat([ownChainID, Buffer.alloc(LENGTH_NFT_ID - LENGTH_CHAIN_ID)]);

			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				attributesArray: [],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					nftID: nftID.toString('hex'),
				},
			});

			await expect(endpoint.isNFTSupported(context)).resolves.toEqual({ isNFTSupported: true });

			validator.validate(isNFTSupportedResponseSchema, { isNFTSupported: true });
		});

		it('should return true if all NFTs are supported', async () => {
			const nftID = utils.getRandomBytes(LENGTH_NFT_ID);

			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				attributesArray: [],
			});

			await supportedNFTsStore.save(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					nftID: nftID.toString('hex'),
				},
			});

			await expect(endpoint.isNFTSupported(context)).resolves.toEqual({ isNFTSupported: true });
		});

		it('should return true if all collections of the chain are supported', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const nftID = Buffer.concat([chainID, Buffer.alloc(LENGTH_NFT_ID - LENGTH_CHAIN_ID)]);

			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				attributesArray: [],
			});

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					nftID: nftID.toString('hex'),
				},
			});

			await expect(endpoint.isNFTSupported(context)).resolves.toEqual({ isNFTSupported: true });
		});

		it('should return true if collection of the chain is supported', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const collectionID = utils.getRandomBytes(LENGTH_COLLECTION_ID);
			const nftID = Buffer.concat([
				chainID,
				collectionID,
				Buffer.alloc(LENGTH_NFT_ID - LENGTH_CHAIN_ID - LENGTH_COLLECTION_ID),
			]);

			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				attributesArray: [],
			});

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [
					{
						collectionID,
					},
				],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					nftID: nftID.toString('hex'),
				},
			});

			await expect(endpoint.isNFTSupported(context)).resolves.toEqual({ isNFTSupported: true });
		});

		it('should return false if collection of the chain is not supported', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const collectionID = utils.getRandomBytes(LENGTH_COLLECTION_ID);
			const nftID = Buffer.concat([
				chainID,
				collectionID,
				Buffer.alloc(LENGTH_NFT_ID - LENGTH_CHAIN_ID - LENGTH_COLLECTION_ID),
			]);

			await nftStore.save(methodContext, nftID, {
				owner: utils.getRandomBytes(LENGTH_ADDRESS),
				attributesArray: [],
			});

			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [
					{
						collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID),
					},
				],
			});

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					nftID: nftID.toString('hex'),
				},
			});

			await expect(endpoint.isNFTSupported(context)).resolves.toEqual({ isNFTSupported: false });
		});
	});

	describe('getSupportedNFTs', () => {
		it('should return * when all nft`s are supported globally', async () => {
			await supportedNFTsStore.save(methodContext, ALL_SUPPORTED_NFTS_KEY, {
				supportedCollectionIDArray: [],
			});
			const moduleEndpointContext = createTransientModuleEndpointContext({ stateStore });

			await expect(endpoint.getSupportedNFTs(moduleEndpointContext)).resolves.toEqual({
				supportedNFTs: ['*'],
			});
		});

		it('should return the list of supported nft`s when all the nft`s from a chain are supported', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: [],
			});

			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				chainID,
			});

			await expect(endpoint.getSupportedNFTs(moduleEndpointContext)).resolves.toEqual({
				supportedNFTs: [`${chainID.toString('hex')}********`],
			});
		});

		it('should return the list of supported nft`s when not all the nft`s from a chain are supported', async () => {
			const chainID = utils.getRandomBytes(LENGTH_CHAIN_ID);
			const supportedCollections = [
				{
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID),
				},
				{
					collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID),
				},
			];
			await supportedNFTsStore.save(methodContext, chainID, {
				supportedCollectionIDArray: supportedCollections,
			});

			const moduleEndpointContext = createTransientModuleEndpointContext({
				stateStore,
				chainID,
			});

			await expect(endpoint.getSupportedNFTs(moduleEndpointContext)).resolves.toEqual({
				supportedNFTs: [
					chainID.toString('hex') + supportedCollections[0].collectionID.toString('hex'),
					chainID.toString('hex') + supportedCollections[1].collectionID.toString('hex'),
				],
			});
		});
	});
});

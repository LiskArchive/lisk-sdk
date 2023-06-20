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
import { GenesisNFTStore } from '../../../../src/modules/nft/types';
import {
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	LENGTH_COLLECTION_ID,
	LENGTH_NFT_ID,
} from '../../../../src/modules/nft/constants';

const nftID1 = utils.getRandomBytes(LENGTH_NFT_ID);
const nftID2 = utils.getRandomBytes(LENGTH_NFT_ID);
const nftID3 = utils.getRandomBytes(LENGTH_NFT_ID);
const owner = utils.getRandomBytes(LENGTH_ADDRESS);
const escrowedChainID = utils.getRandomBytes(LENGTH_CHAIN_ID);

export const validData: GenesisNFTStore = {
	nftSubstore: [
		{
			nftID: nftID1,
			owner,
			attributesArray: [
				{
					module: 'pos',
					attributes: utils.getRandomBytes(10),
				},
				{
					module: 'token',
					attributes: utils.getRandomBytes(10),
				},
			],
		},
		{
			nftID: nftID2,
			owner,
			attributesArray: [
				{
					module: 'pos',
					attributes: utils.getRandomBytes(10),
				},
				{
					module: 'token',
					attributes: utils.getRandomBytes(10),
				},
			],
		},
		{
			nftID: nftID3,
			owner: escrowedChainID,
			attributesArray: [],
		},
	],
	userSubstore: [
		{
			address: owner,
			nftID: nftID1,
			lockingModule: 'pos',
		},
		{
			address: owner,
			nftID: nftID2,
			lockingModule: 'token',
		},
	],
	escrowSubstore: [
		{
			escrowedChainID,
			nftID: nftID3,
		},
	],
	supportedNFTsSubstore: [
		{
			chainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
			supportedCollectionIDArray: [],
		},
	],
};

export const validGenesisAssets = [['Valid genesis asset', validData]];

export const invalidSchemaNFTSubstoreGenesisAssets = [
	[
		'Invalid nftID - minimum length not satisfied',
		{
			...validData,
			nftSubstore: [
				{
					nftID: utils.getRandomBytes(LENGTH_NFT_ID - 1),
					owner: utils.getRandomBytes(LENGTH_ADDRESS),
					attributesArray: [],
				},
			],
		},
		`nftID' minLength not satisfied`,
	],
	[
		'Invalid nftID - maximum length exceeded',
		{
			...validData,
			nftSubstore: [
				{
					nftID: utils.getRandomBytes(LENGTH_NFT_ID + 1),
					owner: utils.getRandomBytes(LENGTH_ADDRESS),
					attributesArray: [],
				},
			],
		},
		`nftID' maxLength exceeded`,
	],
	[
		'Invalid attributesArray.module - minimum length not satisfied',
		{
			...validData,
			nftSubstore: [
				{
					nftID: utils.getRandomBytes(LENGTH_NFT_ID),
					owner: utils.getRandomBytes(LENGTH_ADDRESS),
					attributesArray: [
						{
							module: '',
							attributes: utils.getRandomBytes(10),
						},
					],
				},
			],
		},
		`module' must NOT have fewer than 1 characters`,
	],
	[
		'Invalid attributesArray.module - maximum length exceeded',
		{
			...validData,
			nftSubstore: [
				{
					nftID: utils.getRandomBytes(LENGTH_NFT_ID),
					owner: utils.getRandomBytes(LENGTH_ADDRESS),
					attributesArray: [
						{
							module: '1'.repeat(33),
							attributes: utils.getRandomBytes(10),
						},
					],
				},
			],
		},
		`module' must NOT have more than 32 characters`,
	],
	[
		'Invalid attributesArray.module - must match pattern "^[a-zA-Z0-9]*$"',
		{
			...validData,
			nftSubstore: [
				{
					nftID: utils.getRandomBytes(LENGTH_NFT_ID),
					owner: utils.getRandomBytes(LENGTH_ADDRESS),
					attributesArray: [
						{
							module: '#$a1!',
							attributes: utils.getRandomBytes(10),
						},
					],
				},
			],
		},
		'must match pattern "^[a-zA-Z0-9]*$"',
	],
];

export const invalidSchemaUserSubstoreGenesisAssets = [
	[
		'Invalid owner address',
		{
			...validData,
			userSubstore: [
				{
					address: utils.getRandomBytes(LENGTH_ADDRESS - 1),
					nftID: nftID1,
					lockingModule: 'pos',
				},
			],
		},
		`address' address length invalid`,
	],
	[
		'Invalid nftID - minimum length not satisified',
		{
			...validData,
			userSubstore: [
				{
					address: utils.getRandomBytes(LENGTH_ADDRESS),
					nftID: utils.getRandomBytes(LENGTH_NFT_ID - 1),
					lockingModule: 'pos',
				},
			],
		},
		`nftID' minLength not satisfied`,
	],
	[
		'Invalid nftID - maximum length exceeded',
		{
			...validData,
			userSubstore: [
				{
					address: utils.getRandomBytes(LENGTH_ADDRESS),
					nftID: utils.getRandomBytes(LENGTH_NFT_ID + 1),
					lockingModule: 'pos',
				},
			],
		},
		`nftID' maxLength exceeded`,
	],
	[
		'Invalid lockingModule - minimum length not satisfied',
		{
			...validData,
			userSubstore: [
				{
					address: utils.getRandomBytes(LENGTH_ADDRESS),
					nftID: utils.getRandomBytes(LENGTH_NFT_ID),
					lockingModule: '',
				},
			],
		},
		`lockingModule' must NOT have fewer than 1 characters`,
	],
	[
		'Invalid lockingModule - maximum length exceeded',
		{
			...validData,
			userSubstore: [
				{
					address: utils.getRandomBytes(LENGTH_ADDRESS),
					nftID: utils.getRandomBytes(LENGTH_NFT_ID),
					lockingModule: 'pos'.repeat(33),
				},
			],
		},
		`lockingModule' must NOT have more than 32 characters`,
	],
	[
		'lockingModule must match pattern - "^[a-zA-Z0-9]*$"',
		{
			...validData,
			userSubstore: [
				{
					address: utils.getRandomBytes(LENGTH_ADDRESS),
					nftID: utils.getRandomBytes(LENGTH_NFT_ID),
					lockingModule: '$#pos"',
				},
			],
		},
		`must match pattern "^[a-zA-Z0-9]*$"`,
	],
];

export const invalidSchemaEscrowSubstoreGenesisAssets = [
	[
		'Invalid escrowedChainID - minimum length not satisfied',
		{
			...validData,
			escrowSubstore: [
				{
					escrowedChainID: utils.getRandomBytes(LENGTH_CHAIN_ID - 1),
					nftID: nftID1,
				},
			],
		},
		`escrowedChainID' minLength not satisfied`,
	],
	[
		'Invalid escrowedChainID - maximum length exceeded',
		{
			...validData,
			escrowSubstore: [
				{
					escrowedChainID: utils.getRandomBytes(LENGTH_CHAIN_ID + 1),
					nftID: nftID1,
				},
			],
		},
		`escrowedChainID' maxLength exceeded`,
	],
	[
		'Invalid nftID - minimum length not satisfied',
		{
			...validData,
			escrowSubstore: [
				{
					escrowedChainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
					nftID: utils.getRandomBytes(LENGTH_CHAIN_ID - 1),
				},
			],
		},
		`nftID' minLength not satisfied`,
	],
	[
		'Invalid nftID - maximum length exceeded',
		{
			...validData,
			escrowSubstore: [
				{
					escrowedChainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
					nftID: utils.getRandomBytes(LENGTH_NFT_ID + 1),
				},
			],
		},
		`nftID' maxLength exceeded`,
	],
];

export const invalidSchemaSupportedNFTsSubstoreGenesisAssets = [
	[
		'Invalid collectionID - minimum length not satisfied',
		{
			...validData,
			supportedNFTsSubstore: [
				{
					chainID: utils.getRandomBytes(LENGTH_CHAIN_ID),
					supportedCollectionIDArray: [
						{
							collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID - 1),
						},
					],
				},
			],
		},
		`collectionID' minLength not satisfied`,
	],
	[
		'Invalid collectionID - maximum length exceeded',
		{
			...validData,
			supportedNFTsSubstore: [
				{
					chainID: utils.getRandomBytes(LENGTH_COLLECTION_ID),
					supportedCollectionIDArray: [
						{
							collectionID: utils.getRandomBytes(LENGTH_COLLECTION_ID + 1),
						},
					],
				},
			],
		},
		`collectionID' maxLength exceeded`,
	],
];

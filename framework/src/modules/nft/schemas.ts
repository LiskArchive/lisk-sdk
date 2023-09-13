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

import {
	LENGTH_CHAIN_ID,
	LENGTH_COLLECTION_ID,
	LENGTH_NFT_ID,
	MAX_LENGTH_MODULE_NAME,
	MIN_LENGTH_MODULE_NAME,
	MAX_LENGTH_DATA,
} from './constants';

export const transferParamsSchema = {
	$id: '/lisk/nftTransferParams',
	type: 'object',
	required: ['nftID', 'recipientAddress', 'data'],
	properties: {
		nftID: {
			dataType: 'bytes',
			minLength: LENGTH_NFT_ID,
			maxLength: LENGTH_NFT_ID,
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 2,
		},
		data: {
			dataType: 'string',
			minLength: 0,
			maxLength: MAX_LENGTH_DATA,
			fieldNumber: 3,
		},
	},
};

export const crossChainNFTTransferMessageParamsSchema = {
	$id: '/lisk/crossChainNFTTransferMessageParamsSchmema',
	type: 'object',
	required: ['nftID', 'senderAddress', 'recipientAddress', 'attributesArray', 'data'],
	properties: {
		nftID: {
			dataType: 'bytes',
			minLength: LENGTH_NFT_ID,
			maxLength: LENGTH_NFT_ID,
			fieldNumber: 1,
		},
		senderAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 2,
		},
		recipientAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 3,
		},
		attributesArray: {
			type: 'array',
			fieldNumber: 4,
			items: {
				type: 'object',
				required: ['module', 'attributes'],
				properties: {
					module: {
						dataType: 'string',
						minLength: MIN_LENGTH_MODULE_NAME,
						maxLength: MAX_LENGTH_MODULE_NAME,
						pattern: '^[a-zA-Z0-9]*$',
						fieldNumber: 1,
					},
					attributes: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
				},
			},
		},
		data: {
			dataType: 'string',
			maxLength: MAX_LENGTH_DATA,
			fieldNumber: 5,
		},
	},
};

export interface CCTransferMessageParams {
	nftID: Buffer;
	attributesArray: { module: string; attributes: Buffer }[];
	senderAddress: Buffer;
	recipientAddress: Buffer;
	data: string;
}

export const crossChainTransferParamsSchema = {
	$id: '/lisk/crossChainNFTTransferParamsSchema',
	type: 'object',
	required: [
		'nftID',
		'receivingChainID',
		'recipientAddress',
		'data',
		'messageFee',
		'includeAttributes',
	],
	properties: {
		nftID: {
			dataType: 'bytes',
			minLength: LENGTH_NFT_ID,
			maxLength: LENGTH_NFT_ID,
			fieldNumber: 1,
		},
		receivingChainID: {
			dataType: 'bytes',
			minLength: LENGTH_CHAIN_ID,
			maxLength: LENGTH_CHAIN_ID,
			fieldNumber: 2,
		},
		recipientAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 3,
		},
		data: {
			dataType: 'string',
			minLength: 0,
			maxLength: MAX_LENGTH_DATA,
			fieldNumber: 4,
		},
		messageFee: {
			dataType: 'uint64',
			fieldNumber: 5,
		},
		includeAttributes: {
			dataType: 'boolean',
			fieldNumber: 6,
		},
	},
};

export const getNFTsRequestSchema = {
	$id: '/nft/endpoint/getNFTsRequest',
	type: 'object',
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
	required: ['address'],
};

export const getNFTsResponseSchema = {
	$id: '/nft/endpoint/getNFTsResponse',
	type: 'object',
	properties: {
		nfts: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						format: 'hex',
					},
					attributesArray: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								module: {
									type: 'string',
								},
								attributes: {
									type: 'string',
									format: 'hex',
								},
							},
						},
					},
					lockingModule: {
						type: 'string',
					},
				},
			},
		},
	},
};

export const hasNFTRequestSchema = {
	$id: '/nft/endpoint/hasNFTRequest',
	type: 'object',
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
		id: {
			type: 'string',
			format: 'hex',
			minLength: LENGTH_NFT_ID * 2,
			maxLength: LENGTH_NFT_ID * 2,
		},
	},
	required: ['address', 'id'],
};

export const hasNFTResponseSchema = {
	$id: '/nft/endpoint/hasNFTResponse',
	type: 'object',
	properties: {
		hasNFT: {
			type: 'boolean',
		},
	},
};

export const getNFTRequestSchema = {
	$id: '/nft/endpoint/getNFTRequest',
	type: 'object',
	properties: {
		id: {
			type: 'string',
			format: 'hex',
			minLength: LENGTH_NFT_ID * 2,
			maxLength: LENGTH_NFT_ID * 2,
		},
	},
	required: ['id'],
};

export const getNFTResponseSchema = {
	$id: '/nft/endpoint/getNFTResponse',
	type: 'object',
	properties: {
		owner: {
			type: 'string',
			format: 'hex',
		},
		attributesArray: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					module: {
						type: 'string',
					},
					attributes: {
						type: 'string',
						format: 'hex',
					},
				},
			},
		},
		lockingModule: {
			type: 'string',
		},
	},
};

export const getCollectionIDsRequestSchema = {
	$id: '/nft/endpoint/getCollectionIDsRequest',
	type: 'object',
	properties: {
		chainID: {
			type: 'string',
			format: 'hex',
			minLength: LENGTH_CHAIN_ID * 2,
			maxLength: LENGTH_CHAIN_ID * 2,
		},
	},
	required: ['chainID'],
};

export const getCollectionIDsResponseSchema = {
	$id: '/nft/endpoint/getCollectionIDsRespone',
	type: 'object',
	properties: {
		collectionIDs: {
			type: 'array',
			items: {
				type: 'string',
				format: 'hex',
			},
		},
	},
};

export const collectionExistsRequestSchema = {
	$id: '/nft/endpoint/collectionExistsRequest',
	type: 'object',
	properties: {
		chainID: {
			type: 'string',
			format: 'hex',
			minLength: LENGTH_CHAIN_ID * 2,
			maxLength: LENGTH_CHAIN_ID * 2,
		},
		collectionID: {
			type: 'string',
			format: 'hex',
			minLength: LENGTH_COLLECTION_ID * 2,
			maxLength: LENGTH_COLLECTION_ID * 2,
		},
	},
	required: ['chainID', 'collectionID'],
};

export const collectionExistsResponseSchema = {
	$id: '/nft/endpoint/collectionExistsResponse',
	type: 'object',
	properties: {
		collectionExists: {
			type: 'boolean',
		},
	},
};

export const getEscrowedNFTIDsRequestSchema = {
	$id: '/nft/endpoint/getEscrowedNFTIDsRequest',
	type: 'object',
	properties: {
		chainID: {
			type: 'string',
			format: 'hex',
			minLength: LENGTH_CHAIN_ID * 2,
			maxLength: LENGTH_CHAIN_ID * 2,
		},
	},
	required: ['chainID'],
};

export const getEscrowedNFTIDsResponseSchema = {
	$id: '/nft/endpoint/getEscrowedNFTIDsResponse',
	type: 'object',
	properties: {
		escrowedNFTIDs: {
			type: 'array',
			items: {
				type: 'string',
				format: 'hex',
			},
		},
	},
};

export const isNFTSupportedRequestSchema = {
	$id: '/nft/endpoint/isNFTSupportedRequest',
	type: 'object',
	properties: {
		id: {
			type: 'string',
			format: 'hex',
			minLength: LENGTH_NFT_ID * 2,
			maxLength: LENGTH_NFT_ID * 2,
		},
	},
	required: ['id'],
};

export const isNFTSupportedResponseSchema = {
	$id: '/nft/endpoint/isNFTSupportedResponse',
	type: 'object',
	properties: {
		isNFTSupported: {
			type: 'boolean',
		},
	},
};

export const genesisNFTStoreSchema = {
	$id: '/nft/module/genesis',
	type: 'object',
	required: ['nftSubstore', 'supportedNFTsSubstore'],
	properties: {
		nftSubstore: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['nftID', 'owner', 'attributesArray'],
				properties: {
					nftID: {
						dataType: 'bytes',
						minLength: LENGTH_NFT_ID,
						maxLength: LENGTH_NFT_ID,
						fieldNumber: 1,
					},
					owner: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
					attributesArray: {
						type: 'array',
						fieldNumber: 3,
						items: {
							type: 'object',
							required: ['module', 'attributes'],
							properties: {
								module: {
									dataType: 'string',
									minLength: MIN_LENGTH_MODULE_NAME,
									maxLength: MAX_LENGTH_MODULE_NAME,
									pattern: '^[a-zA-Z0-9]*$',
									fieldNumber: 1,
								},
								attributes: {
									dataType: 'bytes',
									fieldNumber: 2,
								},
							},
						},
					},
				},
			},
		},
		supportedNFTsSubstore: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['chainID', 'supportedCollectionIDArray'],
				properties: {
					chainID: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					supportedCollectionIDArray: {
						type: 'array',
						fieldNumber: 2,
						items: {
							type: 'object',
							required: ['collectionID'],
							properties: {
								collectionID: {
									dataType: 'bytes',
									minLength: LENGTH_COLLECTION_ID,
									maxLength: LENGTH_COLLECTION_ID,
									fieldNumber: 1,
								},
							},
						},
					},
				},
			},
		},
	},
};

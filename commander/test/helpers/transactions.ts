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

import { TokenTransferAsset, KeysRegisterAsset, DPoSVoteAsset } from 'lisk-framework';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as transactions from '@liskhq/lisk-transactions';
import { codec, Schema } from '@liskhq/lisk-codec';

const account = {
	passphrase: 'endless focus guilt bronze hold economy bulk parent soon tower cement venue',
	privateKey:
		'a30c9e2b10599702b985d18fee55721b56691877cd2c70bbdc1911818dabc9b9508a965871253595b36e2f8dc27bff6e67b39bdd466531be9c6f8c401253979c',
	publicKey: '508a965871253595b36e2f8dc27bff6e67b39bdd466531be9c6f8c401253979c',
	address: '9cabee3d27426676b852ce6b804cb2fdff7cd0b5',
};

const tokenTransferAsset = new TokenTransferAsset(BigInt(500000));

export const tokenTransferAssetSchema = tokenTransferAsset.schema;
export const keysRegisterAssetSchema = new KeysRegisterAsset().schema;
export const dposVoteAssetSchema = new DPoSVoteAsset().schema;
export const accountSchema = {
	$id: '/account/base',
	properties: {
		address: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		dpos: {
			fieldNumber: 5,
			properties: {
				delegate: {
					fieldNumber: 1,
					properties: {
						consecutiveMissedBlocks: {
							dataType: 'uint32',
							fieldNumber: 3,
						},
						isBanned: {
							dataType: 'boolean',
							fieldNumber: 5,
						},
						lastForgedHeight: {
							dataType: 'uint32',
							fieldNumber: 4,
						},
						pomHeights: {
							fieldNumber: 2,
							items: {
								dataType: 'uint32',
							},
							type: 'array',
						},
						totalVotesReceived: {
							dataType: 'uint64',
							fieldNumber: 6,
						},
						username: {
							dataType: 'string',
							fieldNumber: 1,
						},
					},
					required: [
						'username',
						'pomHeights',
						'consecutiveMissedBlocks',
						'lastForgedHeight',
						'isBanned',
						'totalVotesReceived',
					],
					type: 'object',
				},
				sentVotes: {
					fieldNumber: 2,
					items: {
						properties: {
							amount: {
								dataType: 'uint64',
								fieldNumber: 2,
							},
							delegateAddress: {
								dataType: 'bytes',
								fieldNumber: 1,
							},
						},
						required: ['delegateAddress', 'amount'],
						type: 'object',
					},
					type: 'array',
				},
				unlocking: {
					fieldNumber: 3,
					items: {
						properties: {
							amount: {
								dataType: 'uint64',
								fieldNumber: 2,
							},
							delegateAddress: {
								dataType: 'bytes',
								fieldNumber: 1,
							},
							unvoteHeight: {
								dataType: 'uint32',
								fieldNumber: 3,
							},
						},
						required: ['delegateAddress', 'amount', 'unvoteHeight'],
						type: 'object',
					},
					type: 'array',
				},
			},
			type: 'object',
		},
		keys: {
			fieldNumber: 4,
			properties: {
				mandatoryKeys: {
					fieldNumber: 2,
					items: {
						dataType: 'bytes',
					},
					type: 'array',
				},
				numberOfSignatures: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				optionalKeys: {
					fieldNumber: 3,
					items: {
						dataType: 'bytes',
					},
					type: 'array',
				},
			},
			type: 'object',
		},
		sequence: {
			fieldNumber: 3,
			properties: {
				nonce: {
					dataType: 'uint64',
					fieldNumber: 1,
				},
			},
			type: 'object',
		},
		token: {
			fieldNumber: 2,
			properties: {
				balance: {
					dataType: 'uint64',
					fieldNumber: 1,
				},
			},
			type: 'object',
		},
	},
	required: ['address', 'token', 'sequence', 'keys', 'dpos'],
	type: 'object',
};

export const genesisBlockID = Buffer.from(
	'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	'hex',
);
export const communityIdentifier = 'Lisk';

export const networkIdentifier = cryptography.getNetworkIdentifier(
	genesisBlockID,
	communityIdentifier,
);

export const networkIdentifierStr = networkIdentifier.toString('hex');

export const createTransferTransaction = ({
	amount,
	fee,
	recipientAddress,
	nonce,
}: {
	amount: string;
	fee: string;
	recipientAddress: string;
	nonce: number;
}): Record<string, unknown> => {
	const transaction = transactions.signTransaction(
		tokenTransferAsset.schema,
		{
			moduleID: 2,
			assetID: 0,
			nonce: BigInt(nonce),
			fee: BigInt(transactions.convertLSKToBeddows(fee)),
			senderPublicKey: Buffer.from(account.publicKey, 'hex'),
			asset: {
				amount: BigInt(transactions.convertLSKToBeddows(amount)),
				recipientAddress: Buffer.from(recipientAddress, 'hex'),
				data: '',
			},
		},
		networkIdentifier,
		account.passphrase,
	) as any;

	return {
		...transaction,
		id: transaction.id.toString('hex'),
		senderPublicKey: transaction.senderPublicKey.toString('hex'),
		signatures: transaction.signatures.map((s: Buffer) => s.toString('hex')),
		asset: {
			...transaction.asset,
			amount: transaction.asset.amount.toString(),
			recipientAddress: transaction.asset.recipientAddress.toString('hex'),
		},
		nonce: transaction.nonce.toString(),
		fee: transaction.fee.toString(),
	};
};

export const encodeTransactionFromJSON = (
	transaction: Record<string, unknown>,
	baseSchema: Schema,
	assetsSchemas: { moduleID: number; assetID: number; schema: Schema }[],
): string => {
	const transactionTypeAssetSchema = assetsSchemas.find(
		as => as.moduleID === transaction.moduleID && as.assetID === transaction.assetID,
	);

	if (!transactionTypeAssetSchema) {
		throw new Error('Transaction type not found.');
	}

	const transactionAssetBuffer = codec.encode(
		transactionTypeAssetSchema.schema,
		// eslint-disable-next-line @typescript-eslint/ban-types
		codec.fromJSON(transactionTypeAssetSchema.schema, transaction.asset as object),
	);

	const transactionBuffer = codec.encode(
		baseSchema,
		codec.fromJSON(baseSchema, {
			...transaction,
			asset: transactionAssetBuffer,
		}),
	);

	return transactionBuffer.toString('hex');
};

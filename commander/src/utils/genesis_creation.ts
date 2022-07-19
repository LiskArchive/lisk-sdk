/*
 * LiskHQ/lisk-commander
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
 *
 */
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { Schema } from '@liskhq/lisk-codec';
import { bls, address, utils, ed } from '@liskhq/lisk-cryptography';
import {
	dposGenesisStoreSchema,
	DPoSModule,
	tokenGenesisStoreSchema,
	TokenModule,
} from 'lisk-framework';

export const genesisAssetsSchema = {
	$id: '/genesis/asset/0',
	type: 'object',
	required: ['assets'],
	properties: {
		type: 'array',
		items: {
			required: ['moduleID', 'data', 'object'],
			properties: {
				moduleID: {
					type: 'string',
					format: 'uint32',
				},
				data: {
					type: 'object',
				},
				schema: {
					type: 'object',
				},
			},
		},
	},
};

export interface GenesisAssetsInput {
	assets: {
		moduleID: Buffer;
		data: Record<string, unknown>;
		schema: Schema;
	}[];
}

interface GenesisBlockDefaultAccountInput {
	tokenDistribution: number;
	numberOfValidators: number;
	numberOfAccounts: number;
}

export const generateGenesisBlockDefaultDPoSAssets = (input: GenesisBlockDefaultAccountInput) => {
	const accountList = [];
	for (let i = 0; i < input.numberOfAccounts; i += 1) {
		const passphrase = Mnemonic.generateMnemonic(256);
		const keys = ed.getKeys(passphrase);
		accountList.push({
			publicKey: keys.publicKey,
			privateKey: keys.privateKey,
			passphrase,
			address: address.getAddressFromPublicKey(keys.publicKey),
			lisk32Address: address.getLisk32AddressFromPublicKey(keys.publicKey),
		});
	}
	const validatorList = [];
	for (let i = 0; i < input.numberOfValidators; i += 1) {
		const passphrase = Mnemonic.generateMnemonic(256);
		const keys = ed.getKeys(passphrase);
		const blsPrivateKey = bls.generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
		const blsPublicKey = bls.getPublicKeyFromPrivateKey(blsPrivateKey);
		const blsPoP = bls.popProve(blsPrivateKey);
		validatorList.push({
			publicKey: keys.publicKey,
			name: `genesis_${i}`,
			privateKey: keys.privateKey,
			blsPublicKey,
			blsPrivateKey,
			blsPoP,
			passphrase,
			address: address.getAddressFromPublicKey(keys.publicKey),
			lisk32Address: address.getLisk32AddressFromPublicKey(keys.publicKey),
		});
	}

	const genesisAssets = [
		{
			moduleID: new TokenModule().id,
			data: {
				userSubstore: accountList.map(a => ({
					address: a.address,
					tokenID: {
						chainID: utils.intToBuffer(0, 4),
						localID: utils.intToBuffer(0, 4),
					},
					availableBalance: BigInt(input.tokenDistribution),
					lockedBalances: [],
				})),
			} as Record<string, unknown>,
			schema: tokenGenesisStoreSchema,
		},
		{
			moduleID: new DPoSModule().id,
			data: {
				validators: validatorList.map(v => ({
					address: v.address,
					name: v.name,
					blsKey: v.blsPublicKey,
					proofOfPossession: v.blsPoP,
					generatorKey: v.publicKey,
					lastGeneratedHeight: 0,
					isBanned: false,
					pomHeights: [],
					consecutiveMissedBlocks: 0,
				})),
				voters: [],
				snapshots: [],
				genesisData: {
					initRounds: 3,
					initDelegates: validatorList.slice(0, input.numberOfValidators).map(v => v.address),
				},
			} as Record<string, unknown>,
			schema: dposGenesisStoreSchema,
		},
	];

	return {
		accountList,
		validatorList,
		genesisAssets,
	};
};

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

import { bls, address as cryptoAddress, legacy, utils } from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';

export const validators = new Array(103).fill(0).map((_, i) => {
	const passphrase = Mnemonic.generateMnemonic();
	const keys = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);
	const address = cryptoAddress.getAddressFromPublicKey(keys.publicKey);
	const blsPrivateKey = bls.generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
	const blsPublicKey = bls.getPublicKeyFromPrivateKey(blsPrivateKey);
	const blsPoP = bls.popProve(blsPrivateKey);
	return {
		address,
		name: `genesis_${i}`,
		blsKey: blsPublicKey,
		proofOfPossession: blsPoP,
		generatorKey: keys.publicKey,
	};
});
validators.sort((a, b) => a.address.compare(b.address));

const activeValidators = validators
	.slice(0, validators.length - 2)
	.map(v => ({ address: v.address, weight: BigInt(1) }));
const threshold = BigInt(35);

export const validAsset = {
	validators,
	snapshotSubstore: {
		activeValidators,
		threshold,
	},
};

export const invalidAssets: any[] = [
	[
		'Invalid validator name length',
		{
			validators: [
				{
					...validators[0],
					name: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
				},
				...validators.slice(1, validators.length),
			],
			snapshotSubstore: {
				activeValidators,
				threshold,
			},
		},
	],
	[
		'Invalid validator name character',
		{
			validators: [
				{
					...validators[0],
					name: '@@@__++',
				},
				...validators.slice(1, validators.length),
			],
			snapshotSubstore: {
				activeValidators,
				threshold,
			},
		},
		'`name` property is invalid. Must contain only characters a-z0-9!@$&_.',
	],
	[
		'Not unique validator name',
		{
			validators: [
				{
					...validators[0],
					name: validators[1].name,
				},
				...validators.slice(1, validators.length),
			],
			snapshotSubstore: {
				activeValidators,
				threshold,
			},
		},
		'`name` property of all entries in the validators must be distinct.',
	],
	[
		'Not unique validator address',
		{
			validators: [
				{
					...validators[0],
					address: validators[1].address,
				},
				...validators.slice(1, validators.length),
			],
			snapshotSubstore: {
				activeValidators,
				threshold,
			},
		},
		'`address` property of all entries in validators must be distinct.',
	],
	[
		'validator address is not ordered',
		{
			validators: validators.slice(0).sort((a, b) => b.address.compare(a.address)),
			snapshotSubstore: {
				activeValidators,
				threshold,
			},
		},
		'`validators` must be ordered lexicographically by address.',
	],
	[
		'active validator address is not unique',
		{
			validators,
			snapshotSubstore: {
				activeValidators: [
					{
						...activeValidators[0],
						address: activeValidators[1].address,
					},
					...activeValidators.slice(1, activeValidators.length),
				],
				threshold,
			},
		},
		'`address` properties in `activeValidators` must be distinct.',
	],
	[
		'active validator address is not ordered',
		{
			validators,
			snapshotSubstore: {
				activeValidators: activeValidators.slice(0).sort((a, b) => b.address.compare(a.address)),
				threshold,
			},
		},
		'`activeValidators` must be ordered lexicographically by address property.',
	],
	[
		'active validator address is missing from validators array',
		{
			validators,
			snapshotSubstore: {
				activeValidators: [
					{ ...activeValidators[0], address: utils.getRandomBytes(20) },
					...activeValidators.slice(1, activeValidators.length),
				].sort((a, b) => a.address.compare(b.address)),
				threshold,
			},
		},
		'`activeValidator` address is missing from validators array.',
	],
	[
		'active validator weight must be positive integer',
		{
			validators,
			snapshotSubstore: {
				activeValidators: [
					{ ...activeValidators[0], weight: BigInt(-1) },
					...activeValidators.slice(1, activeValidators.length),
				],
				threshold,
			},
		},
		// This is the error message returned from schema validation
		'Invalid terminate index. Index is 22580 but terminateIndex is 22579',
	],
	[
		'active validators total weight must be within range',
		{
			validators,
			snapshotSubstore: {
				activeValidators: [
					{ ...activeValidators[0], weight: BigInt(1000000000000000) },
					...activeValidators.slice(1, activeValidators.length),
				],
				threshold,
			},
		},
		'`threshold` in snapshot substore is not within range.',
	],
];

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
import { bls, address as cryptoAddress, legacy } from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';

export const validators = new Array(120).fill(0).map((_, i) => {
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
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [],
		consecutiveMissedBlocks: 0,
		commission: 0,
		lastCommissionIncreaseHeight: 0,
		sharingCoefficients: [],
	};
});
validators.sort((a, b) => a.address.compare(b.address));

export const validAsset = {
	validators,
	voters: [
		{
			address: validators[0].address,
			sentVotes: [
				{
					delegateAddress: validators[0].address,
					amount: BigInt(1000) * BigInt(100000000),
					voteSharingCoefficients: [],
				},
			],
			pendingUnlocks: [
				{
					delegateAddress: validators[0].address,
					amount: BigInt(10) * BigInt(100000000),
					unvoteHeight: 0,
				},
			],
		},
		{
			address: validators[1].address,
			sentVotes: [
				{
					delegateAddress: validators[0].address,
					amount: BigInt(1000) * BigInt(100000000),
					voteSharingCoefficients: [],
				},
			],
			pendingUnlocks: [
				{
					delegateAddress: validators[0].address,
					amount: BigInt(10) * BigInt(100000000),
					unvoteHeight: 0,
				},
			],
		},
	],
	genesisData: {
		initRounds: 3,
		initDelegates: validators.slice(0, 101).map(v => v.address),
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
				...validators.slice(1, 101),
			],
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
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
				...validators.slice(1, 101),
			],
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Invalid validator name',
	],
	[
		'Not unique validator name',
		{
			validators: [
				{
					...validators[0],
					name: validators[1].name,
				},
				...validators.slice(1, 101),
			],
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Validator name is not unique',
	],
	[
		'Not unique validator address',
		{
			validators: [
				{
					...validators[0],
					address: validators[1].address,
				},
				...validators.slice(1, 101),
			],
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Validator address is not unique',
	],
	[
		'Not sorted validator sharing coefficient',
		{
			validators: [
				{
					...validators[0],
					sharingCoefficients: [
						{
							tokenID: Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
							coefficient: Buffer.from([1, 0, 0, 0]),
						},
						{
							tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
							coefficient: Buffer.from([1, 0, 0, 0]),
						},
					],
				},
				...validators.slice(1, 101),
			],
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'SharingCoefficients must be sorted by tokenID',
	],
	[
		'Exceed max vote',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: validators.slice(0, 22).map(v => ({
						delegateAddress: v.address,
						amount: BigInt(1000) * BigInt(100000000),
						voteSharingCoefficients: [],
					})),
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Sent vote exceeds max vote',
	],
	[
		'sent vote delegate address is not unique',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[1].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
						...validators.slice(1, 10).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						})),
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Sent vote delegate address is not unique',
	],
	[
		'sent vote delegate address is not ordered',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[1].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
						...validators.slice(2, 10).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						})),
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Sent vote delegate address is not lexicographically ordered',
	],
	[
		'sent vote delegate address is not validator',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: Buffer.alloc(20, 0),
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
						...validators.slice(1, 10).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						})),
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Sent vote includes non existing validator address',
	],
	[
		'sent vote sharing coefficients is not sorted',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [
								{
									tokenID: Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
									coefficient: Buffer.from([1, 0, 0, 0]),
								},
								{
									tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
									coefficient: Buffer.from([1, 0, 0, 0]),
								},
							],
						},
						...validators.slice(1, 10).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						})),
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Validator does not have corresponding sharing coefficient or the coefficient value is not consistent',
	],
	[
		'sent vote sharing coefficients is matching',
		{
			validators: [
				{
					...validators[0],
					sharingCoefficients: [
						{
							tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
							coefficient: Buffer.from([100, 100, 100, 0]),
						},
						{
							tokenID: Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
							coefficient: Buffer.from([1, 0, 0, 0]),
						},
					],
				},
				...validators.slice(1, 101),
			],
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [
								{
									tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
									coefficient: Buffer.from([255, 0, 0, 0]),
								},
							],
						},
						...validators.slice(1, 10).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						})),
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Validator does not have corresponding sharing coefficient or the coefficient value is not consistent',
	],
	[
		'exceed max unlocking',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						...validators.slice(0, 10).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						})),
					],
					pendingUnlocks: [
						...validators.slice(0, 21).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							unvoteHeight: 0,
						})),
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'PendingUnlocks exceeds max unlocking',
	],
	[
		'pendingUnlocks is not ordered',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						...validators.slice(0, 10).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						})),
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[1].address,
							amount: BigInt(1000) * BigInt(100000000),
							unvoteHeight: 0,
						},
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							unvoteHeight: 0,
						},
						...validators.slice(2, 20).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							unvoteHeight: 0,
						})),
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'PendingUnlocks are not lexicographically ordered',
	],
	[
		'pendingUnlocks include non validator delegate address',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						...validators.slice(0, 10).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						})),
					],
					pendingUnlocks: [
						{
							delegateAddress: Buffer.alloc(20, 0),
							amount: BigInt(1000) * BigInt(100000000),
							unvoteHeight: 0,
						},
						...validators.slice(1, 20).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							unvoteHeight: 0,
						})),
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Pending unlocks includes non existing validator address',
	],
	[
		'not unique voter address',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						...validators.slice(0, 10).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						})),
					],
					pendingUnlocks: [
						...validators.slice(0, 20).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							unvoteHeight: 0,
						})),
					],
				},
				{
					address: validators[0].address,
					sentVotes: [
						...validators.slice(0, 10).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						})),
					],
					pendingUnlocks: [
						...validators.slice(0, 20).map(v => ({
							delegateAddress: v.address,
							amount: BigInt(1000) * BigInt(100000000),
							unvoteHeight: 0,
						})),
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 101).map(v => v.address),
			},
		},
		'Voter address is not unique',
	],
	[
		'non unique init delegate',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: [validators[1].address, ...validators.slice(1, 101).map(v => v.address)],
			},
		},
		'Init delegates address is not unique',
	],
	[
		'non validator init delegate',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: [Buffer.alloc(20, 0), ...validators.slice(1, 101).map(v => v.address)],
			},
		},
		'Init delegates includes non existing validator address',
	],
	[
		'more than number of active validators init delegate',
		{
			validators,
			voters: [
				{
					address: validators[0].address,
					sentVotes: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(1000) * BigInt(100000000),
							voteSharingCoefficients: [],
						},
					],
					pendingUnlocks: [
						{
							delegateAddress: validators[0].address,
							amount: BigInt(10) * BigInt(100000000),
							unvoteHeight: 0,
						},
					],
				},
			],
			genesisData: {
				initRounds: 3,
				initDelegates: validators.slice(0, 105).map(v => v.address),
			},
		},
		'Init delegates is greater than number of active delegates',
	],
];

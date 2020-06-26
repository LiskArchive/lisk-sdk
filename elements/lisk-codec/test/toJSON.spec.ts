/*
 * Copyright © 2020 Lisk Foundation
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
import { codec } from '../src/codec';
import * as accountEncoding from '../fixtures/account_encodings.json';

describe('toJSON', () => {
	it('should return JSON like object from JS object', () => {
		const { schema, object } = accountEncoding.testCases[0].input;

		const jsObject = {
			...object,
			address: Buffer.from(object.address.data),
			balance: BigInt(object.balance),
			publicKey: Buffer.from(object.publicKey.data),
			nonce: BigInt(object.nonce),
			keys: {
				...object.keys,
				mandatoryKeys: object.keys.mandatoryKeys.map(mKey =>
					Buffer.from(mKey.data),
				),
				optionalKeys: object.keys.optionalKeys.map((oKey: any) =>
					Buffer.from(oKey.data),
				),
			},
			asset: {
				...object.asset,
				delegate: {
					...object.asset.delegate,
					totalVotesReceived: BigInt(object.asset.delegate.totalVotesReceived),
				},
				sentVotes: object.asset.sentVotes.map(v => ({
					...v,
					delegateAddress: Buffer.from(v.delegateAddress.data),
					amount: BigInt(v.amount),
				})),
				unlocking: object.asset.unlocking.map(v => ({
					...v,
					delegateAddress: Buffer.from(v.delegateAddress.data),
					amount: BigInt(v.amount.toString()),
				})),
			},
		};

		const jsonLikeObject = {
			...object,
			address: Buffer.from(object.address.data).toString('base64'),
			balance: BigInt(object.balance).toString(),
			publicKey: Buffer.from(object.publicKey.data).toString('base64'),
			nonce: BigInt(object.nonce).toString(),
			keys: {
				...object.keys,
				mandatoryKeys: object.keys.mandatoryKeys.map(mKey =>
					Buffer.from(mKey.data).toString('base64'),
				),
				optionalKeys: object.keys.optionalKeys.map((oKey: any) =>
					Buffer.from(oKey.data).toString('base64'),
				),
			},
			asset: {
				...object.asset,
				delegate: {
					...object.asset.delegate,
					totalVotesReceived: BigInt(
						object.asset.delegate.totalVotesReceived,
					).toString(),
				},
				sentVotes: object.asset.sentVotes.map(v => ({
					...v,
					delegateAddress: Buffer.from(v.delegateAddress.data).toString(
						'base64',
					),
					amount: BigInt(v.amount).toString(),
				})),
				unlocking: object.asset.unlocking.map(v => ({
					...v,
					delegateAddress: Buffer.from(v.delegateAddress.data).toString(
						'base64',
					),
					amount: BigInt(v.amount.toString()).toString(),
				})),
			},
		};

		const res = codec.toJSON(schema, jsObject);
		expect(res).toEqual(jsonLikeObject);
	});
});

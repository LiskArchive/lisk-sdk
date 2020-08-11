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

import { BaseBlockHeader } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { ApplyAssetInput, BaseAsset, ValidateAssetInput } from '../../base_asset';
import { ValidationError } from '../../../errors';
import { MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE, MAX_POM_HEIGHTS } from '../constants';
import { DPOSAccountProps, PomTransactionAssetInput } from '../types';
import { getPunishmentPeriod, validateSignature } from '../utils';

const signingBlockHeaderSchema = {
	$id: 'lisk/signing-block-header',
	type: 'object',
	properties: {
		version: { dataType: 'uint32', fieldNumber: 1 },
		timestamp: { dataType: 'uint32', fieldNumber: 2 },
		height: { dataType: 'uint32', fieldNumber: 3 },
		previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
		transactionRoot: { dataType: 'bytes', fieldNumber: 5 },
		generatorPublicKey: { dataType: 'bytes', fieldNumber: 6 },
		reward: { dataType: 'uint64', fieldNumber: 7 },
		asset: {
			type: 'object',
			fieldNumber: 8,
			properties: {
				maxHeightPreviouslyForged: {
					dataType: 'uint32',
					fieldNumber: 1,
				},
				maxHeightPrevoted: {
					dataType: 'uint32',
					fieldNumber: 2,
				},
				seedReveal: {
					dataType: 'bytes',
					fieldNumber: 3,
				},
			},
			required: ['maxHeightPreviouslyForged', 'maxHeightPrevoted', 'seedReveal'],
		},
	},
	required: [
		'version',
		'timestamp',
		'height',
		'previousBlockID',
		'transactionRoot',
		'generatorPublicKey',
		'reward',
		'asset',
	],
};

export const blockHeaderSchema = {
	...signingBlockHeaderSchema,
	$id: 'lisk/block-header',
	properties: {
		...signingBlockHeaderSchema.properties,
		signature: { dataType: 'bytes', fieldNumber: 9 },
	},
};

const getBlockHeaderBytes = (header: BaseBlockHeader): Buffer =>
	codec.encode(signingBlockHeaderSchema, header);

export class PomTransactionAsset extends BaseAsset<PomTransactionAssetInput> {
	public baseFee = BigInt(0);
	public name = 'pom';
	public type = 3;
	public assetSchema = {
		$id: 'lisk/dpos/pom',
		type: 'object',
		required: ['header1', 'header2'],
		properties: {
			header1: {
				...blockHeaderSchema,
				fieldNumber: 1,
			},
			header2: {
				...blockHeaderSchema,
				fieldNumber: 2,
			},
		},
	};

	// eslint-disable-next-line class-methods-use-this
	public validateAsset({ asset }: ValidateAssetInput<PomTransactionAssetInput>): void {
		if (!asset.header1.generatorPublicKey.equals(asset.header2.generatorPublicKey)) {
			throw new ValidationError(
				'GeneratorPublicKey of each BlockHeader should match.',
				asset.header1.generatorPublicKey.toString('base64'),
			);
		}

		if (
			Buffer.compare(getBlockHeaderBytes(asset.header1), getBlockHeaderBytes(asset.header2)) === 0
		) {
			throw new Error('BlockHeaders are identical. No contradiction detected.');
		}

		/*
			Check for BFT violations:
					1. Double forging
					2. Disjointedness
					3. Branch is not the one with largest maxHeightPrevoted
		*/

		let b1 = asset.header1;
		let b2 = asset.header2;

		// Order the two block headers such that b1 must be forged first
		if (
			b1.asset.maxHeightPreviouslyForged > b2.asset.maxHeightPreviouslyForged ||
			(b1.asset.maxHeightPreviouslyForged === b2.asset.maxHeightPreviouslyForged &&
				b1.asset.maxHeightPrevoted > b2.asset.maxHeightPrevoted) ||
			(b1.asset.maxHeightPreviouslyForged === b2.asset.maxHeightPreviouslyForged &&
				b1.asset.maxHeightPrevoted === b2.asset.maxHeightPrevoted &&
				b1.height > b2.height)
		) {
			b1 = asset.header2;
			b2 = asset.header1;
		}

		if (
			!(b1.asset.maxHeightPrevoted === b2.asset.maxHeightPrevoted && b1.height >= b2.height) &&
			!(b1.height > b2.asset.maxHeightPreviouslyForged) &&
			!(b1.asset.maxHeightPrevoted > b2.asset.maxHeightPrevoted)
		) {
			throw new Error('BlockHeaders are not contradicting as per BFT violation rules.');
		}
	}

	// eslint-disable-next-line class-methods-use-this
	public async applyAsset({
		asset,
		senderID,
		stateStore: store,
		reducerHandler,
	}: ApplyAssetInput<PomTransactionAssetInput>): Promise<void> {
		const currentHeight = store.chain.lastBlockHeaders[0].height + 1;
		const senderAccount = await store.account.get<DPOSAccountProps>(senderID);
		const { networkIdentifier } = store.chain;
		/*
			|header1.height - h| < 260,000.
			|header2.height - h| < 260,000.
		*/

		if (Math.abs(asset.header1.height - currentHeight) >= MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE) {
			throw new Error(
				`Difference between header1.height and current height must be less than ${MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE.toString()}.`,
			);
		}

		if (Math.abs(asset.header2.height - currentHeight) >= MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE) {
			throw new Error(
				`Difference between header2.height and current height must be less than ${MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE.toString()}.`,
			);
		}

		/*
			Check if delegate is eligible to be punished
		*/
		const delegateAddress = getAddressFromPublicKey(asset.header1.generatorPublicKey);
		const delegateAccount = await store.account.get<DPOSAccountProps>(delegateAddress);

		if (delegateAccount.dpos.delegate.username === '') {
			throw new Error('Account is not a delegate');
		}

		if (delegateAccount.dpos.delegate.isBanned) {
			throw new Error('Cannot apply proof-of-misbehavior. Delegate is banned.');
		}

		if (
			getPunishmentPeriod(
				delegateAccount,
				delegateAccount,
				store.chain.lastBlockHeaders[0].height,
			) > 0
		) {
			throw new Error('Cannot apply proof-of-misbehavior. Delegate is already punished. ');
		}

		/*
			Check block signatures validity
		*/

		const blockHeader1Bytes = Buffer.concat([
			networkIdentifier,
			getBlockHeaderBytes(asset.header1),
		]);
		if (
			!validateSignature(
				asset.header1.generatorPublicKey,
				asset.header1.signature,
				blockHeader1Bytes,
			)
		) {
			throw new Error('Invalid block signature for header 1.');
		}

		const blockHeader2Bytes = Buffer.concat([
			networkIdentifier,
			getBlockHeaderBytes(asset.header2),
		]);

		if (
			!validateSignature(
				asset.header2.generatorPublicKey,
				asset.header2.signature,
				blockHeader2Bytes,
			)
		) {
			throw new Error('Invalid block signature for header 2.');
		}

		/*
			Update sender account
		*/
		const delegateAccountBalance = await reducerHandler.invoke<bigint>('token:getBalance', {
			address: delegateAccount.address,
		});

		const reward =
			store.chain.lastBlockReward > delegateAccountBalance
				? delegateAccountBalance
				: store.chain.lastBlockReward;

		await reducerHandler.invoke('token:credit', { address: senderID, amount: reward });

		store.account.set(senderAccount.address, senderAccount);

		/*
			Update delegate account
		*/

		// Fetch delegate account again in case sender and delegate are the same account
		const updatedDelegateAccount = await store.account.get<DPOSAccountProps>(delegateAddress);

		updatedDelegateAccount.dpos.delegate.pomHeights.push(currentHeight);

		if (updatedDelegateAccount.dpos.delegate.pomHeights.length >= MAX_POM_HEIGHTS) {
			updatedDelegateAccount.dpos.delegate.isBanned = true;
		}
		await reducerHandler.invoke('token:debit', {
			address: updatedDelegateAccount.address,
			amount: reward,
		});
		store.account.set(updatedDelegateAccount.address, updatedDelegateAccount);
	}
}

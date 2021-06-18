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

import { BlockHeader, TAG_BLOCK_HEADER } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey, hash } from '@liskhq/lisk-cryptography';
import { areHeadersContradicting } from '@liskhq/lisk-bft';
import { codec } from '@liskhq/lisk-codec';
import { BaseAsset } from '../../base_asset';
import { ApplyAssetContext, ValidateAssetContext } from '../../../types';
import { MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE, MAX_POM_HEIGHTS } from '../constants';
import { DPOSAccountProps, PomTransactionAssetContext } from '../types';
import { getPunishmentPeriod, validateSignature } from '../utils';

const signingBlockHeaderSchema = {
	$id: 'lisk/dpos/signingBlockHeader',
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

const getBlockHeaderBytes = (header: BlockHeader): Buffer =>
	codec.encode(signingBlockHeaderSchema, header);

export class PomTransactionAsset extends BaseAsset<PomTransactionAssetContext> {
	public name = 'reportDelegateMisbehavior';
	public id = 3;
	public schema = {
		$id: 'lisk/dpos/pom',
		type: 'object',
		required: ['header1', 'header2'],
		properties: {
			header1: {
				...blockHeaderSchema,
				$id: 'block-header1',
				fieldNumber: 1,
			},
			header2: {
				...blockHeaderSchema,
				$id: 'block-header2',
				fieldNumber: 2,
			},
		},
	};

	public validate({ asset }: ValidateAssetContext<PomTransactionAssetContext>): void {
		const header1ID = hash(getBlockHeaderBytes(asset.header1));
		const header1 = {
			...asset.header1,
			id: header1ID,
		};
		const header2ID = hash(getBlockHeaderBytes(asset.header2));
		const header2 = {
			...asset.header2,
			id: header2ID,
		};
		// Check for BFT violations:
		if (!areHeadersContradicting(header1, header2)) {
			throw new Error('BlockHeaders are not contradicting as per BFT violation rules.');
		}
	}

	public async apply({
		asset,
		transaction,
		stateStore: store,
		reducerHandler,
	}: ApplyAssetContext<PomTransactionAssetContext>): Promise<void> {
		const currentHeight = store.chain.lastBlockHeaders[0].height + 1;
		const { networkIdentifier } = store.chain;
		/*
			|header1.height - h| >= 260,000.
			|header2.height - h| >= 260,000.
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
			throw new Error('Account is not a delegate.');
		}

		if (delegateAccount.dpos.delegate.isBanned) {
			throw new Error('Cannot apply proof-of-misbehavior. Delegate is already banned.');
		}

		if (
			getPunishmentPeriod(
				delegateAccount,
				delegateAccount,
				store.chain.lastBlockHeaders[0].height,
			) > 0
		) {
			throw new Error('Cannot apply proof-of-misbehavior. Delegate is already punished.');
		}

		/*
			Check block signatures validity
		*/
		if (
			!validateSignature(
				TAG_BLOCK_HEADER,
				networkIdentifier,
				asset.header1.generatorPublicKey,
				asset.header1.signature,
				getBlockHeaderBytes(asset.header1),
			)
		) {
			throw new Error('Invalid block signature for header 1.');
		}

		if (
			!validateSignature(
				TAG_BLOCK_HEADER,
				networkIdentifier,
				asset.header2.generatorPublicKey,
				asset.header2.signature,
				getBlockHeaderBytes(asset.header2),
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
		const minRemainingBalance = await reducerHandler.invoke<bigint>('token:getMinRemainingBalance');

		const delegateSubtractableBalance =
			delegateAccountBalance - minRemainingBalance > BigInt(0)
				? delegateAccountBalance - minRemainingBalance
				: BigInt(0);

		const reward =
			store.chain.lastBlockReward > delegateSubtractableBalance
				? delegateSubtractableBalance
				: store.chain.lastBlockReward;

		if (reward > BigInt(0)) {
			await reducerHandler.invoke('token:credit', {
				address: transaction.senderAddress,
				amount: reward,
			});
		}

		/*
			Update delegate account
		*/

		// Fetch delegate account again in case sender and delegate are the same account
		const updatedDelegateAccount = await store.account.get<DPOSAccountProps>(delegateAddress);

		updatedDelegateAccount.dpos.delegate.pomHeights.push(currentHeight);

		if (updatedDelegateAccount.dpos.delegate.pomHeights.length >= MAX_POM_HEIGHTS) {
			updatedDelegateAccount.dpos.delegate.isBanned = true;
		}
		await store.account.set(updatedDelegateAccount.address, updatedDelegateAccount);

		if (reward > BigInt(0)) {
			await reducerHandler.invoke('token:debit', {
				address: updatedDelegateAccount.address,
				amount: reward,
			});
		}
	}
}

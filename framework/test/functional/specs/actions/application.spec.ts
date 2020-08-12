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
import { blockSchema, blockHeaderSchema } from '@liskhq/lisk-chain';

import {
	TransferTransaction,
	DelegateTransaction,
	VoteTransaction,
	UnlockTransaction,
	MultisignatureTransaction,
	ProofOfMisbehaviorTransaction,
	BaseTransaction,
} from '@liskhq/lisk-transactions';

import { createApplication, closeApplication } from '../../utils/application';

import { Application } from '../../../../src';

describe('Application related actions', () => {
	let app: Application;

	beforeAll(async () => {
		app = await createApplication('actions-transactions');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('getSchema', () => {
		it('should return schemas used to encode objects in framework', async () => {
			const frameworkSchemas = await app['_channel'].invoke('app:getSchema');
			const appInstance = app as any;

			const expectedFrameworkSchemas = {
				account: appInstance._node._chain.accountSchema,
				blockSchema,
				blockHeaderSchema,
				blockHeadersAssets: appInstance._node._chain.blockAssetSchema,
				baseTransaction: BaseTransaction.BASE_SCHEMA,
				transactionsAssets: {
					[TransferTransaction.TYPE]: TransferTransaction.ASSET_SCHEMA,
					[DelegateTransaction.TYPE]: DelegateTransaction.ASSET_SCHEMA,
					[VoteTransaction.TYPE]: VoteTransaction.ASSET_SCHEMA,
					[UnlockTransaction.TYPE]: UnlockTransaction.ASSET_SCHEMA,
					[MultisignatureTransaction.TYPE]: MultisignatureTransaction.ASSET_SCHEMA,
					[ProofOfMisbehaviorTransaction.TYPE]: ProofOfMisbehaviorTransaction.ASSET_SCHEMA,
				},
			};

			expect(frameworkSchemas).toEqual(expectedFrameworkSchemas);
		});
	});

	describe('getNodeInfo', () => {
		it('should return node status and constants', async () => {
			const appInstance = app as any;

			const expectedStatusAndConstants = {
				version: appInstance._node._options.version,
				networkVersion: appInstance._node._options.networkVersion,
				networkID: appInstance._node._options.networkId,
				lastBlockID: appInstance._node._chain.lastBlock.header.id.toString('base64'),
				height: appInstance._node._chain.lastBlock.header.height,
				finalizedHeight: appInstance._node._bft.finalityManager.finalizedHeight,
				syncing: appInstance._node._synchronizer.isActive,
				unconfirmedTransactions: appInstance._node._transactionPool.getAll().length,
				genesisConfig: {
					...appInstance._node._options.genesisConfig,
					...appInstance._node._options.constants,
					totalAmount: appInstance._node._options.constants.totalAmount.toString(),
				},
			};

			const nodeStatusAndConstants = await app['_channel'].invoke('app:getNodeInfo');
			expect(nodeStatusAndConstants).toEqual(expectedStatusAndConstants);
		});
	});
});

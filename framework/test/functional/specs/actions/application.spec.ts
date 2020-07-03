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
import { blockSchema, baseAccountSchema } from '@liskhq/lisk-chain';

import {
	TransferTransaction,
	DelegateTransaction,
	VoteTransaction,
	UnlockTransaction,
	MultisignatureTransaction,
	ProofOfMisbehaviorTransaction,
	BaseTransaction,
} from '@liskhq/lisk-transactions';
import { accountAssetSchema } from '../../../../src/application/node/account';

import { BlockProcessorV0 } from '../../../../src/application/node/block_processor_v0';
import { BlockProcessorV2 } from '../../../../src/application/node/block_processor_v2';

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

			const accountSchema = {
				...baseAccountSchema,
				properties: {
					...baseAccountSchema.properties,
					asset: {
						...baseAccountSchema.properties.asset,
						properties: accountAssetSchema,
					},
				},
			};

			const expectedFrameworkSchemas = {
				account: accountSchema,
				baseBlockHeader: blockSchema,
				blockHeaders: {
					0: BlockProcessorV0.schema,
					2: BlockProcessorV2.schema,
				},
				baseTransaction: BaseTransaction.BASE_SCHEMA,
				transactions: {
					[TransferTransaction.TYPE]: TransferTransaction.ASSET_SCHEMA,
					[DelegateTransaction.TYPE]: DelegateTransaction.ASSET_SCHEMA,
					[VoteTransaction.TYPE]: VoteTransaction.ASSET_SCHEMA,
					[UnlockTransaction.TYPE]: UnlockTransaction.ASSET_SCHEMA,
					[MultisignatureTransaction.TYPE]:
						MultisignatureTransaction.ASSET_SCHEMA,
					[ProofOfMisbehaviorTransaction.TYPE]:
						ProofOfMisbehaviorTransaction.ASSET_SCHEMA,
				},
			};

			expect(frameworkSchemas).toEqual(expectedFrameworkSchemas);
		});
	});
});

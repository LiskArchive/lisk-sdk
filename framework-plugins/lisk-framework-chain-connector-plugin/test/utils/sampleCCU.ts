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
	testing,
	SubmitMainchainCrossChainUpdateCommand,
	MODULE_NAME_INTEROPERABILITY,
} from 'lisk-sdk';

export const getSampleCCU = (params?: Record<string, unknown>) =>
	testing
		.createTransaction({
			commandClass: SubmitMainchainCrossChainUpdateCommand as any,
			module: MODULE_NAME_INTEROPERABILITY,
			params: params ?? {
				activeValidatorsUpdate: {
					blsKeysUpdate: [],
					bftWeightsUpdate: [],
					bftWeightsUpdateBitmap: Buffer.alloc(0),
				},
				certificate: Buffer.alloc(1),
				certificateThreshold: BigInt(1),
				inboxUpdate: {
					crossChainMessages: [],
					messageWitnessHashes: [],
					outboxRootWitness: {
						bitmap: Buffer.alloc(1),
						siblingHashes: [],
					},
				},
				sendingChainID: Buffer.from('04000001', 'hex'),
			},
			chainID: Buffer.from('04000001', 'hex'),
		})
		.toObject();

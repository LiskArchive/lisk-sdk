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

import { Schema } from '@liskhq/lisk-codec';
import { mergeDeep } from './merge_deep';

export const getHeaderAssetSchemaWithAccountAsset = (
	headerSchema: Schema,
	accountAssetSchema: Schema,
): Schema =>
	mergeDeep({}, headerSchema, {
		properties: {
			accounts: {
				items: {
					properties: {
						asset: {
							...accountAssetSchema,
						},
					},
				},
			},
		},
	}) as Schema;

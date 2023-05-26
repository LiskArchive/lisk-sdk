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

import { BaseStore } from '../../base_store';

export const escrowStoreSchema = {
	$id: '/nft/store/escrow',
	type: 'object',
	required: [],
	properties: {},
};

type EscrowStoreData = Record<string, never>;

export class EscrowStore extends BaseStore<EscrowStoreData> {
	public schema = escrowStoreSchema;
}

/*
 * Copyright © 2022 Lisk Foundation
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

export interface TerminatedEscrowStoreData {
	escrowTerminated: boolean;
}

export const terminatedEscrowStoreSchema = {
	$id: '/token/store/terminatedEscrow',
	type: 'object',
	required: ['escrowTerminated'],
	properties: {
		escrowTerminated: {
			dataType: 'boolean',
			fieldNumber: 1,
		},
	},
};

export class TerminatedEscrowStore extends BaseStore<TerminatedEscrowStoreData> {
	public schema = terminatedEscrowStoreSchema;
}

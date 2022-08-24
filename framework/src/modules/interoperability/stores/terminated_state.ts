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

export interface TerminatedStateAccount {
	stateRoot: Buffer;
	mainchainStateRoot?: Buffer;
	initialized?: boolean;
}

export interface TerminatedStateAccountJSON {
	stateRoot: string;
	mainchainStateRoot?: string;
	initialized?: boolean;
}

export const terminatedStateSchema = {
	$id: '/modules/interoperability/terminatedState',
	type: 'object',
	required: ['stateRoot'],
	properties: {
		stateRoot: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		mainchainStateRoot: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		initialized: {
			dataType: 'boolean',
			fieldNumber: 3,
		},
	},
};

export class TerminatedStateStore extends BaseStore<TerminatedStateAccount> {
	public schema = terminatedStateSchema;
}

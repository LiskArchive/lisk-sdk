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

import { BaseCCCommand } from './base_cc_command';
import { BaseInteroperableAPI } from './base_interoperable_api';
import { SidechainInteroperabilityStore } from './sidechain/store';
import { getStoreFunction } from './types';

export abstract class BaseInteroperabilityCCCommand extends BaseCCCommand {
	protected readonly interoperableCCAPIs = new Map<number, BaseInteroperableAPI>();

	public constructor(moduleID: number, interoperableCCAPIs: Map<number, BaseInteroperableAPI>) {
		super(moduleID);
		this.interoperableCCAPIs = interoperableCCAPIs;
	}

	protected getInteroperabilityStore(getStore: getStoreFunction) {
		return new SidechainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}

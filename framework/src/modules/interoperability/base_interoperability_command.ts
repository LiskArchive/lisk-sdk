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

import { BaseCommand } from '../base_command';
import { BaseCCCommand } from './base_cc_command';
import { BaseInteroperabilityStore } from './base_interoperability_store';
import { BaseInteroperableAPI } from './base_interoperable_api';
import { StoreCallback } from './types';

export abstract class BaseInteroperabilityCommand extends BaseCommand {
	protected readonly interoperableCCAPIs = new Map<number, BaseInteroperableAPI>();
	protected readonly ccCommands = new Map<number, BaseCCCommand[]>();

	public constructor(
		moduleID: number,
		interoperableCCAPIs: Map<number, BaseInteroperableAPI>,
		ccCommands: Map<number, BaseCCCommand[]>,
	) {
		super(moduleID);
		this.interoperableCCAPIs = interoperableCCAPIs;
		this.ccCommands = ccCommands;
	}

	protected abstract getInteroperabilityStore(getStore: StoreCallback): BaseInteroperabilityStore;
}

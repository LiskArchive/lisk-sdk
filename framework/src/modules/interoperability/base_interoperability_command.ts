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
import { NamedRegistry } from '../named_registry';
import { BaseCCCommand } from './base_cc_command';
import { BaseCCMethod } from './base_cc_method';
import { BaseInteroperabilityInternalMethod } from './base_interoperability_internal_methods';

export abstract class BaseInteroperabilityCommand<
	T extends BaseInteroperabilityInternalMethod
> extends BaseCommand {
	public constructor(
		stores: NamedRegistry,
		events: NamedRegistry,
		protected readonly interoperableCCMethods = new Map<string, BaseCCMethod>(),
		protected readonly ccCommands = new Map<string, BaseCCCommand[]>(),
		protected internalMethod: T,
	) {
		super(stores, events);
	}
}

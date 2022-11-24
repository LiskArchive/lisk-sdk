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

import { NamedRegistry } from '../named_registry';
import { BaseCCCommand } from './base_cc_command';
import { BaseInteroperabilityInternalMethod } from './base_interoperability_internal_methods';
import { BaseCCMethod } from './base_cc_method';

export abstract class BaseInteroperabilityCCCommand<
	T extends BaseInteroperabilityInternalMethod,
> extends BaseCCCommand {
	public constructor(
		protected stores: NamedRegistry,
		protected events: NamedRegistry,
		protected interoperableCCMethods = new Map<string, BaseCCMethod>(),
		protected internalMethods: T,
	) {
		super(stores, events);
	}
}

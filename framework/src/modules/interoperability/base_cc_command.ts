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

import { Schema } from '@liskhq/lisk-codec';
import { NamedRegistry } from '../named_registry';
import { CCCommandExecuteContext } from './types';

export abstract class BaseCCCommand {
	public abstract name: string;
	public abstract schema: Schema;

	// eslint-disable-next-line no-useless-constructor
	public constructor(protected stores: NamedRegistry, protected events: NamedRegistry) {}
	public abstract execute(ctx: CCCommandExecuteContext): Promise<void>;
}

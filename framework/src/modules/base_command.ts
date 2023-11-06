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
/* eslint-disable class-methods-use-this */

import { Schema, emptySchema } from '@liskhq/lisk-codec';
import { CommandVerifyContext, CommandExecuteContext, VerificationResult } from '../state_machine';
import { NamedRegistry } from './named_registry';

export abstract class BaseCommand<T = unknown> {
	public schema: Schema = emptySchema;

	public get name(): string {
		const name = this.constructor.name.replace('Command', '');
		return name.charAt(0).toLowerCase() + name.substr(1);
	}

	// eslint-disable-next-line no-useless-constructor
	public constructor(protected stores: NamedRegistry, protected events: NamedRegistry) {}

	public verify?(context: CommandVerifyContext<T>): Promise<VerificationResult>;

	public abstract execute(context: CommandExecuteContext<T>): Promise<void>;
}

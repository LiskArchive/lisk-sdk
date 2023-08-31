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

import { Schema, emptySchema } from '@liskhq/lisk-codec';
import { NamedRegistry } from '../named_registry';
import { CCCommandExecuteContext, ImmutableCrossChainMessageContext } from './types';

/**
 * The `BaseCCCommand` represents Lisk cross-chain commands by providing a generic interface, from which each cross-chain command extends from.
 */
export abstract class BaseCCCommand<T = unknown> {
	public schema: Schema = emptySchema;

	/**
	 * Returns the name of the cross-chain command.
	 */
	public get name(): string {
		const name = this.constructor.name.replace('CCCommand', '');
		return name.charAt(0).toLowerCase() + name.substring(1);
	}

	// eslint-disable-next-line no-useless-constructor
	public constructor(protected stores: NamedRegistry, protected events: NamedRegistry) {}
	/**
	 * The hook `CCCommand.verify()` is called to perform all necessary verifications.
	 *
	 * In this hook, the state *cannot* be mutated and events cannot be emitted.
	 *
	 * If the verification of the command was successful, for the next step the cc-command can be {@link execute | executed}.
	 *
	 * @param context The context available in every Command.verify() hook.
	 */
	public verify?(ctx: ImmutableCrossChainMessageContext): Promise<void>;

	/**
	 * Applies the state changes of a command through the state machine.
	 * The hook `CCCommand.execute()` is triggered by a transaction identified by the module name and the command name.
	 *
	 * Additionally, an event will be emitted that provides the information on whether a command is executed successfully or failed.
	 *
	 * In this hook, the *state can be mutated* and *events* can be emitted.
	 *
	 * @param context The context available in every `CCCommand.execute()` hook.
	 */
	public abstract execute(ctx: CCCommandExecuteContext<T>): Promise<void>;
}

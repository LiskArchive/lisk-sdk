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

/**
 * The `BaseCommand` is the class every module command extends from.
 */
export abstract class BaseCommand<T = unknown> {
	public schema: Schema = emptySchema;

	public get name(): string {
		const name = this.constructor.name.replace('Command', '');
		return name.charAt(0).toLowerCase() + name.substr(1);
	}

	// eslint-disable-next-line no-useless-constructor
	public constructor(protected stores: NamedRegistry, protected events: NamedRegistry) {}

	/**
	 * The hook `Command.verify()` is called to perform all necessary verifications.
	 * If the verification of the command was successful, for the next step the command can be {@link execute | executed}.
	 * Similar to the {@link BaseModule.verifyTransaction} hook, `Command.verify()` will be called also in the {@link @liskhq/lisk-transaction-pool!TransactionPool}, and Its purpose is to guarantee that the verification defined within this hook is adhered to when the transactions are incorporated into a block.
	 *
	 * In this hook, the state *cannot* be mutated and events cannot be emitted.
	 *
	 * @param context The context available in every Command.verify() hook.
	 */
	public verify?(context: CommandVerifyContext<T>): Promise<VerificationResult>;

	/**
	 * Applies the state changes of a command through the state machine.
	 * The hook `Command.execute()` is triggered by a transaction identified by the module name and the command name.
	 *
	 * Additionally, an event will be emitted that provides the information on whether a command is executed successfully or failed.
	 *
	 * In this hook, the *state can be mutated* and *events* can be emitted.
	 *
	 * If the {@link verify | command verification} succeeded, but the hook execution *fails*, the transaction that triggered this command is still valid, however the *state changes applied in this hook are reverted.*
	 *
	 * @param context The context available in every `Command.execute()` hook.
	 */
	public abstract execute(context: CommandExecuteContext<T>): Promise<void>;
}

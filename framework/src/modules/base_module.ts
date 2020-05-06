/*
 * Copyright © 2019 Lisk Foundation
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

import { ImplementationMissingError } from '../errors';
import { EventsArray } from '../controller/event';
import { ActionsDefinition } from '../controller/action';
import { BaseChannel } from '../controller/channels/base_channel';

export interface ModuleInfo {
	readonly author: string;
	readonly version: string;
	readonly name: string;
}

export abstract class BaseModule {
	public readonly options: object;

	public constructor(options: object) {
		this.options = options;
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public static get alias(): string {
		throw new ImplementationMissingError();
	}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public static get info(): ModuleInfo {
		throw new ImplementationMissingError();
	}

	// Array of migrations to be executed before loading the module. Expected format: ['yyyyMMddHHmmss_name_of_migration.sql']
	public static get migrations(): ReadonlyArray<string> {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	public get defaults(): object {
		return {};
	}
	public abstract get events(): EventsArray;
	public abstract get actions(): ActionsDefinition;
	public abstract async load(channel: BaseChannel): Promise<void>;
	public abstract async unload(): Promise<void>;
}

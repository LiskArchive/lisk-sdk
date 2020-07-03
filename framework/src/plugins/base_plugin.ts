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
import { BaseChannel } from '../controller/channels';

export interface PluginInfo {
	readonly author: string;
	readonly version: string;
	readonly name: string;
}

export interface InstantiablePlugin<T, U = object> {
	alias: string;
	info: PluginInfo;
	defaults: object;
	load: () => Promise<void>;
	unload: () => Promise<void>;
	new (...args: U[]): T;
}

export abstract class BasePlugin {
	public readonly options: object;
	public schemas!: object;

	protected constructor(options: object) {
		this.options = options;
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public static get alias(): string {
		throw new ImplementationMissingError();
	}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public static get info(): PluginInfo {
		throw new ImplementationMissingError();
	}

	// eslint-disable-next-line class-methods-use-this
	public get defaults(): object {
		return {};
	}
	public abstract get events(): EventsArray;
	public abstract get actions(): ActionsDefinition;

	public async load(channel: BaseChannel): Promise<void> {
		this.schemas = await channel.invoke('app:getSchema');
	}
	public abstract async unload(): Promise<void>;
}

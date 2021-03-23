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
import {
	ActionsDefinition,
	BaseChannel,
	BasePlugin,
	EventsDefinition,
	PluginInfo,
} from '../../../src';

export class HelloPlugin extends BasePlugin {
	private _channel!: BaseChannel;
	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get alias(): string {
		return 'hello';
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public static get info(): PluginInfo {
		return {
			author: 'hello',
			name: 'hello',
			version: '2.1',
			exportPath: __filename,
		};
	}

	public async load(channel: BaseChannel): Promise<void> {
		this._channel = channel;
		this._channel.publish('hello:greet', { message: 'hello event' });
	}

	public async unload(): Promise<void> {}

	public get defaults(): object {
		return {};
	}

	public get events(): EventsDefinition {
		return ['greet'];
	}

	public get actions(): ActionsDefinition {
		return {
			callGreet: () => {
				return { greet: 'hi, how are you?' };
			},
			publishGreetEvent: () => {
				this._channel.publish('hello:greet', { message: 'hello event' });

				return undefined;
			},
			greetByName: (params?: Record<string, unknown>) => {
				return `Hi ${(params as { firstName: string }).firstName}, how are you?`;
			},
			blankAction: () => {},
		};
	}
}

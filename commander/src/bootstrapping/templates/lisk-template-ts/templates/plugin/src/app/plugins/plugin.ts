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

import { BasePlugin, PluginInfo } from 'lisk-framework';
import type { BaseChannel, EventsDefinition, ActionsDefinition } from 'lisk-framework';

export class <%= className %> extends BasePlugin {
	private _channel!: BaseChannel;

	public static get alias(): string {
		return '<%= alias %>';
	}

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get info(): PluginInfo {
		return {
			author: '<%= author %>',
			version: '<%= version %>',
			name: '<%= name %>',
		};
	}

	// eslint-disable-next-line class-methods-use-this
	public get events(): EventsDefinition {
		return [
			// 'block:created', 
			// 'block:missed'
		];
	}

	// eslint-disable-next-line class-methods-use-this
	public get actions(): ActionsDefinition {
		return {
			hello: async () => { return { hello: 'world' }; },
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(channel: BaseChannel): Promise<void> {
		this._channel = channel;
		this._channel.once('app:ready', () => {
		});
	}

	public async unload(): Promise<void> {}
}

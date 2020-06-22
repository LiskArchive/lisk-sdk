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

import { BasePlugin, ModuleInfo } from 'lisk-framework';
import type {
	BaseChannel,
	EventsArray,
	ActionsDefinition,
} from 'lisk-framework';
import * as pJSON from '../package.json';

export class HTTPAPIPlugin extends BasePlugin {
	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get alias(): string {
		return 'http-api';
	}

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get info(): ModuleInfo {
		return {
			author: pJSON.author,
			version: pJSON.version,
			name: pJSON.name,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	public get events(): EventsArray {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	public get actions(): ActionsDefinition {
		return {};
	}

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
	public async load(_channel: BaseChannel): Promise<void> {}

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
	public async unload(): Promise<void> {}
}

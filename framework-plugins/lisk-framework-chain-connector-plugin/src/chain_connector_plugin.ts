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

import { BasePlugin, PluginInitContext } from 'lisk-sdk';

export class ChainConnectorPlugin extends BasePlugin {
	public name = 'chainConnector';

	public get nodeModulePath(): string {
		return __filename;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(context: PluginInitContext): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(context);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async load(): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async unload(): Promise<void> {}
}

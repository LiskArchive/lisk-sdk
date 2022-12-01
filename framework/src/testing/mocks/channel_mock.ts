/*
 * Copyright © 2021 Lisk Foundation
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
 *
 */

import { BaseChannel } from '../../controller/channels';

export const channelMock = {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	publish: (_name: string, _data?: Record<string, unknown>): void => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	registerToBus: async (_arg: unknown): Promise<void> => Promise.resolve(),
	isValidEventName: (_name: string, _throwError = true): boolean | never => true,
	isValidActionName: (_name: string, _throwError = true): boolean | never => true,
	eventsList: [],
	actionsList: [],
	actions: {},
	moduleName: '',
	options: {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	once: (_event: string): void => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	subscribe: (_event: string): void => {},
	invoke: async <T = unknown>(_name: string, _params?: Record<string, unknown>): Promise<T> =>
		Promise.resolve({} as unknown as T),
} as unknown as BaseChannel;

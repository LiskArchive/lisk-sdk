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
/* eslint-disable @typescript-eslint/no-empty-function */
export const moduleChannelMock = {
	publish: (_name: string, _data?: Record<string, unknown>): void => {},
	subscribe: (_name: string, _data?: Record<string, unknown>): void => {},
	once: (_name: string, _data?: Record<string, unknown>): void => {},
	invoke: (_name: string, _data?: Record<string, unknown>): void => {},
};

export const moduleBusMock = {
	registerChannel: (_name: string, _data?: Record<string, unknown>): void => {},
	setup: (_name: string, _data?: Record<string, unknown>): void => {},
	publish: (_name: string, _data?: Record<string, unknown>): void => {},
	subscribe: (_name: string, _data?: Record<string, unknown>): void => {},
	once: (_name: string, _data?: Record<string, unknown>): void => {},
	invoke: (_name: string, _data?: Record<string, unknown>): void => {},
};

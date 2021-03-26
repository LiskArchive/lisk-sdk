/* eslint-disable @typescript-eslint/no-empty-function */
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

export const loggerMock = {
	trace: (_data?: object | unknown, _message?: string): void => {},
	debug: (_data?: object | unknown, _message?: string): void => {},
	info: (_data?: object | unknown, _message?: string): void => {},
	warn: (_data?: object | unknown, _message?: string): void => {},
	error: (_data?: object | unknown, _message?: string): void => {},
	fatal: (_data?: object | unknown, _message?: string): void => {},
	level: (): number => 2,
};

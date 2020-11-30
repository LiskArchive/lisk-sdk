/*
 * LiskHQ/lisk-commander
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
 *
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createFakeInterface = (value: any) => ({
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	on: (type: string, callback: Function) => {
		if (type === 'line') {
			value.split('\n').forEach(callback);
		}
		if (type === 'close') {
			callback();
		}
		return createFakeInterface(value);
	},
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createStreamStub = (on: Function) => ({
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-empty-function
	resume: () => {},
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-empty-function
	close: () => {},
	on,
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const objectToKeyValueString = (value: object) =>
	Object.entries(value)
		.map(([vKey, vValue]) => `${vKey}: ${JSON.stringify(vValue, null, ' ')}`)
		.join('\n');

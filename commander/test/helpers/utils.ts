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
export const createFakeInterface = (value: any) => ({
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

export const createStreamStub = (on: Function) => ({
	resume: () => {},
	close: () => {},
	on,
});

export const objectToKeyValueString = (value: object) =>
	Object.entries(value)
		.map(([vKey, vValue]) => `${vKey}: ${JSON.stringify(vValue, null, ' ')}`)
		.join('\n');

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
import * as CliTable3 from 'cli-table3';

const chars = {
	top: '═',
	'top-mid': '╤',
	'top-left': '╔',
	'top-right': '╗',
	bottom: '═',
	'bottom-mid': '╧',
	'bottom-left': '╚',
	'bottom-right': '╝',
	left: '║',
	'left-mid': '╟',
	mid: '─',
	'mid-mid': '┼',
	right: '║',
	'right-mid': '╢',
	middle: '│',
};

const getKeyValueObject = (object: object) => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!object || typeof object !== 'object') {
		return object;
	}

	return Object.entries(object)
		.map(([key, value]) => `${key}: ${JSON.stringify(value, undefined, ' ')}`)
		.join('\n');
};

const getKeyValueArray = (array: ReadonlyArray<object>) =>
	array.some(item => typeof item === 'object')
		? array.map(getKeyValueObject).join('\n\n')
		: array.join('\n');

const addValuesToTable = (table: object[], data: object) => {
	Object.entries(data).forEach(([key, values]) => {
		const strValue = Array.isArray(values) ? getKeyValueArray(values) : getKeyValueObject(values);
		table.push({ [key]: strValue });
	});
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const tablify = (data: ReadonlyArray<object> | object) => {
	const table = new CliTable3({
		chars,
		style: {
			head: [],
			border: [],
		},
	});

	if (Array.isArray(data)) {
		data.forEach((value, key) => {
			const cell: CliTable3.Cell[] = [
				{
					colSpan: 2,
					content: `data ${key + 1}`,
				},
			];
			table.push(cell);
			addValuesToTable(table, value);
		});
	} else {
		addValuesToTable(table, data);
	}

	return table;
};

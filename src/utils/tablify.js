/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import Table from 'cli-table2';
import { PrintError } from './error';

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

const getNestedValue = data => keyString =>
	keyString
		.split('.')
		.reduce((accumulated, key) => (accumulated ? accumulated[key] : ''), data);

const addValuesToTable = (table, data) => {
	const nestedValues = table.options.head.map(getNestedValue(data));
	const valuesToPush = nestedValues.map(
		value => (Array.isArray(value) ? value.join('\n') : value),
	);
	return valuesToPush.length && table.push(valuesToPush);
};

const getKeys = (data, limit = 3, loop = 1) => {
	if (loop > limit) {
		throw new PrintError(
			`Output cannot be displayed in table format: Maximum object depth of ${limit} was exceeded. Consider using JSON output format.`,
		);
	}
	return Object.entries(data)
		.map(
			([parentKey, value]) =>
				Object.prototype.toString.call(value) === '[object Object]'
					? getKeys(value, limit, loop + 1).reduce(
							(nestedKeys, childKey) => [
								...nestedKeys,
								`${parentKey}.${childKey}`,
							],
							[],
						)
					: [parentKey],
		)
		.reduce(
			(flattenedKeys, keysToBeFlattened) => [
				...flattenedKeys,
				...keysToBeFlattened,
			],
			[],
		);
};

const reduceKeys = (keys, row) => {
	const newKeys = Object.entries(row).flatMap(([key, value]) => {
		if (keys.includes(key) || value === undefined || value instanceof Error) {
			return [];
		}
		if (typeof value === 'object' && !Array.isArray(value)) {
			return getKeys(value)
				.map(nestedKey => `${key}.${nestedKey}`)
				.filter(nestedKey => !keys.includes(nestedKey));
		}
		return key;
	});
	return keys.concat(newKeys);
};

const tablify = data => {
	const dataIsArray = Array.isArray(data);
	const head = dataIsArray ? data.reduce(reduceKeys, []) : getKeys(data);

	const table = new Table({
		head,
		chars,
		style: {
			head: ['cyan'],
			border: [],
		},
	});

	if (dataIsArray) {
		data.map(addValuesToTable.bind(null, table));
	} else {
		addValuesToTable(table, data);
	}

	return table;
};

export default tablify;

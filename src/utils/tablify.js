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

const getNestedValue = data => keyString => keyString.split('.').reduce((obj, key) => obj[key], data);

const addValuesToTable = (table, data) => {
	const nestedValues = table.options.head.map(getNestedValue(data));
	const valuesToPush = nestedValues.map(value => (Array.isArray(value) ? value.join('\n') : value));
	return valuesToPush.length && table.push(valuesToPush);
};

const reduceKeys = (keys, row) => {
	const newKeys = Object.keys(row)
		.filter(key =>
			!keys.includes(key)
			&& row[key] !== undefined
			&& !(row[key] instanceof Error));
	return keys.concat(newKeys);
};

const getKeys = data => Object.entries(data).map(([parentKey, value]) => (
	Object.prototype.toString.call(value) === '[object Object]'
		? getKeys(value).reduce((nestedKeys, childKey) => [...nestedKeys, `${parentKey}.${childKey}`], [])
		: [parentKey]
))
	.reduce((flattenedKeys, keysToBeFlattened) => [...flattenedKeys, ...keysToBeFlattened], []);

const tablify = (data) => {
	const dataIsArray = Array.isArray(data);
	const head = dataIsArray
		? data.reduce(reduceKeys, [])
		: getKeys(data);

	const table = new Table({ head });

	if (dataIsArray) {
		data.map(addValuesToTable.bind(null, table));
	} else {
		addValuesToTable(table, data);
	}

	return table;
};

export default tablify;

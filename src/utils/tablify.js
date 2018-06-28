/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import Table from 'cli-table3';

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

const getKeyValueObject = object => {
	if (!object || typeof object !== 'object') {
		return object;
	}
	return Object.entries(object)
		.map(([key, value]) => `${key}: ${JSON.stringify(value, null, ' ')}`)
		.join('\n');
};

const addValuesToTable = (table, data) => {
	Object.entries(data).forEach(([key, values]) => {
		const strValue = Array.isArray(values)
			? values.join('\n')
			: getKeyValueObject(values);
		table.push({ [key]: strValue });
	});
};

const tablify = data => {
	const dataIsArray = Array.isArray(data);

	const table = new Table({
		chars,
		style: {
			head: [],
			border: [],
		},
	});

	if (dataIsArray) {
		data.forEach((value, key) => {
			table.push([{ colSpan: 2, content: `data ${key + 1}` }]);
			addValuesToTable(table, value);
		});
	} else {
		addValuesToTable(table, data);
	}

	return table;
};

export default tablify;

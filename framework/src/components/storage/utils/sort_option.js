/*
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
 */

'use strict';

const parseSortStringToObject = sortString => {
	const [field, method = 'ASC'] = sortString.split(':');
	return { field, method: method.toUpperCase() };
};

const isSortOptionValid = (sortOption, fields) => {
	if (!sortOption) return true;
	const sortArray = Array.isArray(sortOption) ? sortOption : [sortOption];
	return sortArray.reduce((acc, curr) => {
		const { field, method } = parseSortStringToObject(curr);
		return acc && fields.includes(field) && ['ASC', 'DESC'].includes(method);
	}, true);
};

const parseSortString = sortString => {
	let sortClause = '';
	if (sortString) {
		const { field, method } = parseSortStringToObject(sortString);
		sortClause = `"${field}" ${method.toUpperCase()}`;
	}
	return sortClause;
};

module.exports = {
	isSortOptionValid,
	parseSortString,
	parseSortStringToObject,
};

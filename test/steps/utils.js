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
const regExp = /"(.+?)"/;

export const getFirstQuotedString = title => title.match(regExp)[1];

export const getQuotedStrings = (title) => {
	const globalRegExp = new RegExp(regExp, 'g');
	return title
		.match(globalRegExp)
		.map(match => match.match(regExp)[1]);
};

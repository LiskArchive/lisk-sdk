/*
 * LiskHQ/lisk-commander
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

export const camelToSnake = (name: string): string => {
	const nameWithFirstLower = `${name.charAt(0).toLocaleLowerCase()}${name.slice(1)}`;
	return nameWithFirstLower.replace(/([A-Z])/g, '_$1').toLowerCase();
};

export const camelToPascal = (name: string): string =>
	`${name.charAt(0).toUpperCase() + name.slice(1)}`;

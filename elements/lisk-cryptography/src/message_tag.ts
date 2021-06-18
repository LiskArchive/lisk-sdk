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

const TAG_REGEX = /^([A-Za-z0-9])+$/;

export const createMessageTag = (domain: string, version?: number | string): string => {
	if (!TAG_REGEX.test(domain)) {
		throw new Error(
			`Message tag domain must be alpha numeric without special characters. Got "${domain}".`,
		);
	}

	if (version && !TAG_REGEX.test(version.toString())) {
		throw new Error(
			`Message tag version must be alpha numeric without special characters. Got "${version}"`,
		);
	}

	return `LSK_${version ? `${domain}:${version}` : domain}_`;
};

export const tagMessage = (
	tag: string,
	networkIdentifier: Buffer,
	message: string | Buffer,
): Buffer =>
	Buffer.concat([
		Buffer.from(tag, 'utf8'),
		networkIdentifier,
		typeof message === 'string' ? Buffer.from(message, 'utf8') : message,
	]);

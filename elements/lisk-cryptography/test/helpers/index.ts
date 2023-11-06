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
 *
 */

import * as glob from 'glob';
import { join } from 'path';
import * as fs from 'fs';
import * as yml from 'js-yaml';
import { EMPTY_BUFFER } from '../../src/constants';

export const makeInvalid = (buffer: Buffer): Buffer => {
	const newBuffer = Buffer.alloc(buffer.length);
	buffer.copy(newBuffer);

	const replace = newBuffer[0] % 2 === 0 ? 1 : 2;
	newBuffer[0] = replace;
	return newBuffer;
};

export const getAllFiles = (
	dirs: string[],
	ignore?: RegExp,
): { path: string; toString: () => string }[] => {
	return dirs
		.map((dir: string) => {
			return glob
				.sync(join(__dirname, '../protocol_specs/', dir, '**/*.{yaml,yml}'))
				.filter(path => (ignore ? !ignore.test(path) : true))
				.map(path => ({ path, toString: () => `${dir}${path.split(dir)[1]}` }));
		})
		.flat();
};

export const loadSpecFile = <T = Record<string, unknown>>(filePath: string) =>
	yml.load(fs.readFileSync(filePath, 'utf8')) as unknown as T;

export const hexToBuffer = (str: string | null): Buffer =>
	str ? Buffer.from(str.substr(2), 'hex') : EMPTY_BUFFER;

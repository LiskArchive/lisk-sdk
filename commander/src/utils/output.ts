/*
 * LiskHQ/lisk-commander
 * Copyright © 2023 Lisk Foundation
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

import * as fs from 'fs-extra';
import * as path from 'path';
import { homedir } from 'os';
import { OWNER_READ_WRITE } from '../constants';

interface OutputOptions {
	outputPath?: string;
	filename?: string;
}

async function getDefaultFilename(namespace: string): Promise<string> {
	return `${namespace}.json`;
}

function resolvePath(filePath: string): string {
	if (filePath.startsWith('~')) {
		return path.join(homedir(), filePath.slice(1));
	}

	return path.resolve(filePath);
}

async function handleOutput(options: OutputOptions, namespace: string): Promise<string> {
	const outputPath = options.outputPath ?? process.cwd();
	const filename = options.filename ?? (await getDefaultFilename(namespace));

	const resolvedPath = resolvePath(outputPath);
	const outputPathWithFilename = path.join(resolvedPath, filename);

	await fs.mkdir(resolvedPath, { recursive: true });

	return outputPathWithFilename;
}

export async function handleOutputFlag(
	outputPath: string,
	data: object,
	namespace: string,
	filename?: string,
): Promise<string> {
	// if output path has an extension, then it is a file and write to current directory
	if (path.extname(outputPath)) {
		const resolvedPath = resolvePath(outputPath);
		const resolvedPathWithFilename = path.join(resolvedPath, filename ?? '');

		try {
			fs.writeJSONSync(resolvedPathWithFilename, data, {
				spaces: ' ',
				mode: OWNER_READ_WRITE,
			});

			return `Successfully written data to ${resolvedPathWithFilename}`;
		} catch (error) {
			throw new Error(`Error writing data to ${resolvedPathWithFilename}: ${error as string}`);
		}
	}

	const options: OutputOptions = {
		outputPath,
		filename,
	};

	const outputFilePath = await handleOutput(options, namespace);

	try {
		fs.writeJSONSync(outputFilePath, data, {
			spaces: ' ',
			mode: OWNER_READ_WRITE,
		});

		return `Successfully written data to ${outputFilePath}`;
	} catch (error) {
		throw new Error(`Error writing data to ${outputFilePath}: ${error as string}`);
	}
}

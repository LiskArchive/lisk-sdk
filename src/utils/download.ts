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
import Axios from 'axios';
import Fs from 'fs';
import { exec } from './worker-process';

export const download = async (
	url: string,
	filePath: string,
): Promise<void> => {
	if (Fs.existsSync(filePath)) {
		return;
	}
	try {
		const writeStream = Fs.createWriteStream(filePath);

		const response = await Axios({
			url,
			method: 'GET',
			responseType: 'stream',
		});

		response.data.pipe(writeStream);

		return new Promise<void>((resolve, reject) => {
			writeStream.on('finish', resolve);
			writeStream.on('error', reject);
		});
	} catch (error) {
		return;
	}
};

export const isValidChecksum = async (
	filePath: string,
	fileName: string,
): Promise<void | boolean> => {
	const { stdout, stderr } = await exec(
		`cd ${filePath}; shasum -c ${fileName}`,
	);
	if (stderr) {
		throw new Error(`Checksum validation failed with error: ${stderr}`);
	}

	return new RegExp(stdout).test(`${fileName}: OK`);
};

export const extract = async (
	filePath: string,
	fileName: string,
	outDir: string | undefined,
): Promise<string> => {
	const { stdout, stderr } = await exec(
		`cd ${filePath}; tar xf ${fileName} -C ${outDir} --strip-component=1;`,
	);

	if (stderr) {
		throw new Error(`Extraction failed with error: ${stderr}`);
	}

	return stdout;
};

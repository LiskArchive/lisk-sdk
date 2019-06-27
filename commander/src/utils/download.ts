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
import { verifyChecksum } from '@liskhq/lisk-cryptography';
import * as axios from 'axios';
import fs from 'fs-extra';
import { dateDiff, getDownloadedFileInfo } from './core/commons';
import { exec, ExecResult } from './worker-process';

export const download = async (
	url: string,
	cacheDir: string,
): Promise<void> => {
	const CACHE_EXPIRY_IN_DAYS = 2;
	const { filePath, fileDir } = getDownloadedFileInfo(url, cacheDir);

	if (fs.existsSync(filePath)) {
		if (
			dateDiff(new Date(), fs.statSync(filePath).birthtime) <=
			CACHE_EXPIRY_IN_DAYS
		) {
			return;
		}
		fs.unlinkSync(filePath);
	}

	fs.ensureDirSync(fileDir);
	const writeStream = fs.createWriteStream(filePath);
	const response = await axios.default({
		url,
		method: 'GET',
		responseType: 'stream',
	});

	response.data.pipe(writeStream);

	return new Promise<void>((resolve, reject) => {
		writeStream.on('finish', resolve);
		writeStream.on('error', reject);
	});
};

export const extract = async (
	filePath: string,
	fileName: string,
	outDir: string,
): Promise<string> => {
	const { stdout, stderr }: ExecResult = await exec(
		`tar xf ${fileName} -C ${outDir} --strip-component=1;`,
		{ cwd: filePath },
	);

	if (stderr) {
		throw new Error(`Extraction failed with error: ${stderr}`);
	}

	return stdout;
};

export const downloadAndValidate = async (url: string, cacheDir: string) => {
	await download(url, cacheDir);
	await download(`${url}.SHA256`, cacheDir);

	const { fileName, fileDir } = getDownloadedFileInfo(url, cacheDir);
	const dataBuffer = fs.readFileSync(`${fileDir}/${fileName}`);
	const content = fs.readFileSync(`${fileDir}/${fileName}.SHA256`, 'utf8');
	const checksum = content.split(' ')[0];

	if (!verifyChecksum(dataBuffer, checksum)) {
		throw new Error(`Checksum did not match`);
	}
};

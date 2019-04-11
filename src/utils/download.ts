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
import * as axios from 'axios';
import fs from 'fs';
import { liskTar, liskTarSHA256 } from './node/commons';
import { exec, ExecResult } from './worker-process';

export const download = async (
	url: string,
	filePath: string,
): Promise<void> => {
	if (fs.existsSync(filePath)) {
		return;
	}
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

export const validateChecksum = async (
	filePath: string,
	fileName: string,
): Promise<void> => {
	const { stdout, stderr }: ExecResult = await exec(
		`cd ${filePath}; shasum -c ${fileName}`,
	);

	if (stdout.search('OK') >= 0) {
		return;
	}

	throw new Error(`Checksum validation failed ${stdout} with error: ${stderr}`);
};

export const extract = async (
	filePath: string,
	fileName: string,
	outDir: string,
): Promise<string> => {
	const { stdout, stderr }: ExecResult = await exec(
		`cd ${filePath}; tar xf ${fileName} -C ${outDir} --strip-component=1;`,
	);

	if (stderr) {
		throw new Error(`Extraction failed with error: ${stderr}`);
	}

	return stdout;
};

export const downloadLiskAndValidate = async (
	destPath: string,
	releaseUrl: string,
	version: string,
) => {
	const LISK_RELEASE_PATH = `${destPath}/${liskTar(version)}`;
	const LISK_RELEASE_SHA256_PATH = `${destPath}/${liskTarSHA256(version)}`;
	const liskTarUrl = `${releaseUrl}/${liskTar(version)}`;
	const liskTarSHA256Url = `${releaseUrl}/${liskTarSHA256(version)}`;

	await download(liskTarUrl, LISK_RELEASE_PATH);
	await download(liskTarSHA256Url, LISK_RELEASE_SHA256_PATH);
	await validateChecksum(destPath, liskTarSHA256(version));
};

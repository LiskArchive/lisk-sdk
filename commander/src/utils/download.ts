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
import * as crypto from 'crypto';
import * as axios from 'axios';
import * as fs from 'fs-extra';
import * as tar from 'tar';
import * as path from 'path';

export interface FileInfo {
	readonly fileName: string;
	readonly fileDir: string;
	readonly filePath: string;
}

export const getDownloadedFileInfo = (url: string, downloadDir: string): FileInfo => {
	const pathWithoutProtocol = url.replace(/(^\w+:|^)\/\//, '').split('/');
	const fileName = pathWithoutProtocol.pop() as string;
	const filePath = path.join(downloadDir, fileName);

	return {
		fileName,
		fileDir: downloadDir,
		filePath,
	};
};

export const download = async (url: string, dir: string): Promise<void> => {
	const { filePath, fileDir } = getDownloadedFileInfo(url, dir);

	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
	}

	fs.ensureDirSync(fileDir);
	const writeStream = fs.createWriteStream(filePath);
	const response = await axios.default({
		url,
		method: 'GET',
		responseType: 'stream',
		maxContentLength: 5000,
	});

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
	response.data.pipe(writeStream);

	return new Promise<void>((resolve, reject) => {
		writeStream.on('finish', resolve);
		writeStream.on('error', reject);
	});
};

export const verifyChecksum = async (filePath: string, expectedChecksum: string): Promise<void> => {
	const fileStream = fs.createReadStream(filePath);
	const dataHash = crypto.createHash('sha256');
	const fileHash = await new Promise<Buffer>((resolve, reject) => {
		fileStream.on('data', (datum: Buffer) => {
			dataHash.update(datum);
		});
		fileStream.on('error', error => {
			reject(error);
		});
		fileStream.on('end', () => {
			resolve(dataHash.digest());
		});
	});

	const fileChecksum = fileHash.toString('hex');
	if (fileChecksum !== expectedChecksum) {
		throw new Error(
			`File checksum: ${fileChecksum} mismatched with expected checksum: ${expectedChecksum}`,
		);
	}
};

export const getChecksum = (url: string, dir: string): string => {
	const { filePath } = getDownloadedFileInfo(url, dir);
	const content = fs.readFileSync(`${filePath}.SHA256`, 'utf8');

	if (!content) {
		throw new Error(`Invalid filepath: ${filePath}`);
	}

	return content.split(' ')[0];
};

export const downloadAndValidate = async (url: string, dir: string): Promise<void> => {
	await download(url, dir);
	await download(`${url}.SHA256`, dir);
	const { filePath } = getDownloadedFileInfo(url, dir);
	const checksum = getChecksum(url, dir);
	await verifyChecksum(filePath, checksum);
};

export const extract = async (filePath: string, fileName: string, outDir: string): Promise<void> =>
	tar.x(
		{
			file: path.join(filePath, fileName),
			cwd: outDir,
		},
		['state.db', 'blockchain.db'],
	);

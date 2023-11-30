import * as fs from 'fs-extra';
// import * as path from 'path';
import { homedir } from 'os';
import { handleOutputFlag } from '../../src/utils/output';
import { OWNER_READ_WRITE } from '../../src/constants';

jest.mock('fs-extra');
// jest.mock('path');

describe('handleOutputFlag', () => {
	const namespace = 'testNamespace';
	const data = { key: 'value' };
	const outputPath = process.cwd();
	const relativePath = 'testPath';
	const absolutePath = '/testPath';
	const filename = 'testFile.json';
	const error = new Error('write error');

	beforeEach(() => {
		(fs.writeJSONSync as jest.Mock).mockClear();
	});

	it('should write data to file in the current working directory if outputPath is not provided', async () => {
		const outputFilePath = `${outputPath}/${namespace}.json`;

		await handleOutputFlag('', data, namespace);

		expect(fs.writeJSONSync).toHaveBeenCalledWith(outputFilePath, data, {
			spaces: ' ',
			mode: OWNER_READ_WRITE,
		});
	});

	it('should respond with success message if writing data to file in the current working directory succeeds', async () => {
		const outputFilePath = `${outputPath}/${namespace}.json`;

		const res = await handleOutputFlag(outputFilePath, data, namespace);

		expect(res).toBe(`Successfully written data to ${outputFilePath}`);
	});

	it('should throw error if writing data to file in the current working directory fails', async () => {
		const outputFilePath = `${outputPath}/${namespace}.json`;

		(fs.writeJSONSync as jest.Mock).mockImplementationOnce(() => {
			throw error;
		});

		await expect(handleOutputFlag(outputFilePath, data, namespace)).rejects.toThrow(
			`Error writing data to ${outputFilePath}: ${error.toString()}`,
		);
	});

	it('should write data to relative path if outputPath is provided', async () => {
		const outputFilePath = `${outputPath}/testPath/${namespace}.json`;

		await handleOutputFlag(relativePath, data, namespace);

		expect(fs.writeJSONSync).toHaveBeenCalledWith(outputFilePath, data, {
			spaces: ' ',
			mode: OWNER_READ_WRITE,
		});
	});

	it('should respond with success message if writing data to relative path succeeds', async () => {
		const outputFilePath = `${outputPath}/testPath/${namespace}.json`;

		const res = await handleOutputFlag(relativePath, data, namespace);

		expect(res).toBe(`Successfully written data to ${outputFilePath}`);
	});

	it('should throw error if writing data to relative path fails', async () => {
		const outputFilePath = `${outputPath}/testPath/${namespace}.json`;

		(fs.writeJSONSync as jest.Mock).mockImplementationOnce(() => {
			throw error;
		});

		await expect(handleOutputFlag(relativePath, data, namespace)).rejects.toThrow(
			`Error writing data to ${outputFilePath}: ${error.toString()}`,
		);
	});

	it('should write data to absolute path if outputPath is provided', async () => {
		const outputFilePath = '/testPath/testNamespace.json';

		await handleOutputFlag(absolutePath, data, namespace);

		expect(fs.writeJSONSync).toHaveBeenCalledWith(outputFilePath, data, {
			spaces: ' ',
			mode: OWNER_READ_WRITE,
		});
	});

	it('should respond with success message if writing data to absolute path succeeds', async () => {
		const outputFilePath = '/testPath/testNamespace.json';

		const res = await handleOutputFlag(absolutePath, data, namespace);

		expect(res).toBe(`Successfully written data to ${outputFilePath}`);
	});

	it('should throw error if writing data to absolute path fails', async () => {
		const outputFilePath = '/testPath/testNamespace.json';

		(fs.writeJSONSync as jest.Mock).mockImplementationOnce(() => {
			throw error;
		});

		await expect(handleOutputFlag(absolutePath, data, namespace)).rejects.toThrow(
			`Error writing data to ${outputFilePath}: ${error.toString()}`,
		);
	});

	it('should write data to file in the current working directory if outputPath is provided with filename', async () => {
		const outputFilePath = `${outputPath}/${filename}`;

		await handleOutputFlag('', data, namespace, filename);

		expect(fs.writeJSONSync).toHaveBeenCalledWith(outputFilePath, data, {
			spaces: ' ',
			mode: OWNER_READ_WRITE,
		});
	});

	it('should respond with success message if writing data to file in the current working directory with filename succeeds', async () => {
		const outputFilePath = `${outputPath}/${filename}`;

		const res = await handleOutputFlag('', data, namespace, filename);

		expect(res).toBe(`Successfully written data to ${outputFilePath}`);
	});

	it('should throw error if writing data to file in the current working directory with filename fails', async () => {
		const outputFilePath = `${outputPath}/${filename}`;

		(fs.writeJSONSync as jest.Mock).mockImplementationOnce(() => {
			throw error;
		});

		await expect(handleOutputFlag('', data, namespace, filename)).rejects.toThrow(
			`Error writing data to ${outputFilePath}: ${error.toString()}`,
		);
	});

	it('should write data to user home if ~ is provided', async () => {
		const outputFilePath = `${homedir()}/${namespace}.json`;

		await handleOutputFlag('~', data, namespace);

		expect(fs.writeJSONSync).toHaveBeenCalledWith(outputFilePath, data, {
			spaces: ' ',
			mode: OWNER_READ_WRITE,
		});
	});
});

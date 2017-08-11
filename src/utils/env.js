import os from 'os';
import fse from 'fs-extra';
import defaultConfig from '../../config.json';

const configDirName = '.lisky';
const configFileName = 'config.json';
const configDirPath = `${os.homedir()}/${configDirName}`;
const configFilePath = `${configDirPath}/${configFileName}`;

const configDirExists = fse.existsSync(configDirPath);

if (!configDirExists) {
	fse.mkdirSync(configDirPath);
}

const configFileExists = fse.existsSync(configFilePath);

if (!configFileExists) {
	fse.writeJsonSync(configFilePath, defaultConfig, {
		spaces: '\t',
	});
}

// eslint-disable-next-line import/no-dynamic-require
const config = require(configFilePath);

export default config;

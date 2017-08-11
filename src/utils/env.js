import os from 'os';
import fse from 'fs-extra';
import defaultConfig from '../../config.json';

const configDirName = '.lisky';
const configFileName = 'config.json';
const homedir = os.homedir();
const configDirPath = `${homedir}/${configDirName}`;
const configFilePath = `${configDirPath}/${configFileName}`;

const initConfigFile = () => {
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
};

const getConfig = () => {
	try {
		return fse.readJsonSync(configFilePath);
	} catch (e) {
		return defaultConfig;
	}
};

try {
	initConfigFile();
} catch (e) {
	console.warn(`WARNING: Could not write to \`${configFilePath}\`; your configuration will not be persisted.`);
}

export default getConfig();

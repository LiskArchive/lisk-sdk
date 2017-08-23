import os from 'os';
import fse from 'fs-extra';
import defaultConfig from '../../defaultConfig.json';

const configDirName = '.lisky';
const configFileName = 'config.json';
const homedir = os.homedir();
const configDirPath = `${homedir}/${configDirName}`;
const configFilePath = `${configDirPath}/${configFileName}`;

const getReadErrorMessage = (error, path) => {
	if (error.code === 'EACCES') {
		return `WARNING: Could not read \`${path}\`: permission denied. Using default config instead.`;
	}
	if (error.message.match(/JSON/)) {
		return `WARNING: Config file at \`${path}\` is not valid JSON. Using default config instead.`;
	}
	return `WARNING: Could not read \`${path}\`. Using default config instead.`;
};

const getWriteErrorMessage = path => `WARNING: Could not write to \`${path}\`. Your configuration will not be persisted.`;

const checkExists = (path) => {
	try {
		return fse.existsSync(path);
	} catch (error) {
		const message = getReadErrorMessage(error, path);
		console.warn(message);
		return false;
	}
};

const initConfigFile = () => {
	const configDirExists = checkExists(configDirPath);

	if (!configDirExists) {
		try {
			fse.mkdirSync(configDirPath);
		} catch (error) {
			const message = getWriteErrorMessage(configDirPath);
			console.warn(message);
		}
	}

	const configFileExists = checkExists(configFilePath);

	if (!configFileExists) {
		try {
			fse.writeJsonSync(configFilePath, defaultConfig, {
				spaces: '\t',
			});
		} catch (error) {
			const message = getWriteErrorMessage(configFilePath);
			console.warn(message);
		}
	}
};

const getConfig = () => {
	try {
		return fse.readJsonSync(configFilePath);
	} catch (error) {
		const message = getReadErrorMessage(error, configFilePath);
		console.warn(message);
		return defaultConfig;
	}
};

try {
	initConfigFile();
} catch (error) {
	console.warn(`WARNING: Could not write to \`${configFilePath}\`; your configuration will not be persisted.`);
}

export default getConfig();

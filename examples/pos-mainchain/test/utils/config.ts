import { Config } from '@oclif/core';

import pJSON = require('../../package.json');

export const getConfig = async () => {
	const config = await Config.load();
	config.pjson.lisk = { addressPrefix: 'lsk' };
	config.pjson.version = pJSON.version;
	return config;
};

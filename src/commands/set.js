import fse from 'fs-extra';
import config from '../../config.json';

const checkBoolean = value => ['true', 'false'].includes(value);

const writeConfigToFile = (newConfig) => {
	const configString = JSON.stringify(newConfig, null, '\t');
	fse.writeFileSync('config.json', `${configString}\n`, 'utf8');
};

export default function setCommand(vorpal) {
	function setJSON(value) {
		if (!checkBoolean(value)) {
			return { message: `Cannot set json to ${value}.` };
		}
		config.json = (value === 'true');
		writeConfigToFile(config);
		return { message: `Successfully set json output to ${value}.` };
	}

	function setTestnet(value) {
		if (!checkBoolean(value)) {
			return { message: `Cannot set testnet to ${value}.` };
		}
		config.liskJS.testnet = (value === 'true');
		writeConfigToFile(config);
		return { message: `Successfully set testnet to ${value}.` };
	}

	vorpal
		.command('set <variable> <value>')
		.description('Set configuration <variable> to <value>.')
		.action((userInput, callback) => {
			const getType = {
				json: setJSON,
				testnet: setTestnet,
			};

			const returnValue = Object.keys(getType).includes(userInput.variable)
				? getType[userInput.variable](userInput.value)
				: { message: 'Unsupported variable name.' };
			return (callback && typeof callback === 'function') ? callback(returnValue.message) : returnValue.message;
		});
}

import fse from 'fs-extra';
import config from '../../config.json';

const writeConfigToFile = (newConfig) => {
	const configString = JSON.stringify(newConfig, null, '\t');
	fse.writeFileSync('config.json', `${configString}\n`, 'utf8');
};

export default function setCommand(vorpal) {
	function setJSON(value) {
		config.json = (value === 'true');
		writeConfigToFile(config);
		return { message: `Successfully set json output to ${value}.` };
	}

	function setTestnet(value) {
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

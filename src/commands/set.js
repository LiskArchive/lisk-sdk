import fse from 'fs-extra';
import config from '../../config.json';

const checkBoolean = value => ['true', 'false'].includes(value);

const writeConfigToFile = (newConfig) => {
	const configString = JSON.stringify(newConfig, null, '\t');
	fse.writeFileSync('config.json', `${configString}\n`, 'utf8');
};

const setJSON = (value) => {
	if (!checkBoolean(value)) {
		return `Cannot set json output to ${value}.`;
	}
	config.json = (value === 'true');
	writeConfigToFile(config);
	return `Successfully set json output to ${value}.`;
};

const setTestnet = (value) => {
	if (!checkBoolean(value)) {
		return `Cannot set testnet to ${value}.`;
	}
	config.liskJS.testnet = (value === 'true');
	writeConfigToFile(config);
	return `Successfully set testnet to ${value}.`;
};

const set = ({ variable, value }, callback) => {
	const handlers = {
		json: setJSON,
		testnet: setTestnet,
	};

	const returnMessage = Object.keys(handlers).includes(variable)
		? handlers[variable](value)
		: 'Unsupported variable name.';

	return (callback && typeof callback === 'function')
		? callback(returnMessage)
		: returnMessage;
};

export default function setCommand(vorpal) {
	vorpal
		.command('set <variable> <value>')
		.description('Set configuration <variable> to <value>.')
		.action(set);
}

import path from 'path';
import fse from 'fs-extra';
import vorpal from 'vorpal';
import config from './../config.json';

const lisky = vorpal();

const commandsDir = path.join(__dirname, 'commands');

fse.readdirSync(commandsDir).forEach((command) => {
	const commandPath = path.join(commandsDir, command);
	// eslint-disable-next-line global-require, import/no-dynamic-require
	const commandModule = require(commandPath);
	lisky.use(commandModule.default);
});

const isInteractive = process.argv.length > 2;

lisky
	.delimiter('lisky>')
	.history('lisky');

if (!isInteractive) {
	lisky.show();
}

lisky.find('help').alias('?');
lisky.find('exit').description(`Exits ${config.name}.`);

export default lisky;

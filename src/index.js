import path from 'path';
import fse from 'fs-extra';
import vorpal from 'vorpal';
import config from './../config.json';
import { version } from '../package.json';

const lisky = vorpal();

const commandsDir = path.join(__dirname, 'commands');

fse.readdirSync(commandsDir).forEach((command) => {
	const commandPath = path.join(commandsDir, command);
	// eslint-disable-next-line global-require, import/no-dynamic-require
	const commandModule = require(commandPath);
	lisky.use(commandModule.default);
});

const logo = `
 _ _     _
| (_)___| | ___   _
| | / __| |/ / | | |
| | \\__ \\   <| |_| |
|_|_|___/_|\\_\\\\__, |
              |___/
`;

const message = `
Running v${version}.
Type \`help\` to get started.
`;
const intro = `${logo}${message}`;

lisky
	.delimiter('lisky>')
	.history('lisky')
	.log(intro)
	.show();


lisky.find('help').alias('?');
lisky.find('exit').description(`Exits ${config.name}.`);

export default lisky;

const path = require('path');
const fse = require('fs-extra');
const lisky = require('vorpal')();
const config = require('./config.json');
const packageJson = require('./package.json');

const commandsDir = path.join(__dirname, 'src', 'commands');

fse.readdirSync(commandsDir).forEach((command) => {
	const commandPath = path.join(commandsDir, command);
	// eslint-disable-next-line global-require, import/no-dynamic-require
	lisky.use(require(commandPath));
});

const logo = `
 _ _     _
| (_)___| | ___   _
| | / __| |/ / | | |
| | \\__ \\   <| |_| |
|_|_|___/_|\\_\\\\__, |
              |___/
`;
const { version } = packageJson;
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

module.exports = lisky;

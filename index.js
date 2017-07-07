const path = require('path');
const fse = require('fs-extra');
const lisky = require('vorpal')();
const config = require('./config.json');

const commandsDir = path.join(__dirname, 'src', 'commands');

//import commands from ./commands/ folder
fse.readdirSync(commandsDir).forEach(function (command) {
	const commandPath = path.join(commandsDir, command);
	lisky.use(require(commandPath));
});

//Define vorpal
lisky
	  .delimiter('lisky>')
	  .history('lisky')
	  .show();


lisky.find('help').alias('?');
lisky.find('exit').description(`Exits ${config.name}.`);

module.exports = lisky;

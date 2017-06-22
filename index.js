const fse = require('fs-extra');
const lisky = require('vorpal')();
const config = require('./config.json');

//import commands from ./commands/ folder
fse.readdirSync('./commands').map(function (command) {
	lisky.use(require('./commands/'+command));
});

//Define vorpal
lisky
	  .delimiter('lisky>')
	  .history('lisky')
	  .show();


lisky.find('help').alias('?');
lisky.find('exit').description(`Exits ${config.name}.`);

module.exports = lisky;
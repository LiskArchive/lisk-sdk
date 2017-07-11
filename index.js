const path = require('path');
const fse = require('fs-extra');
const lisky = require('vorpal')();
const config = require('./config.json');

const commandsDir = path.join(__dirname, 'src', 'commands');

fse.readdirSync(commandsDir).forEach((command) => {
  const commandPath = path.join(commandsDir, command);
  // eslint-disable-next-line global-require, import/no-dynamic-require
  lisky.use(require(commandPath));
});

lisky
  .delimiter('lisky>')
  .history('lisky')
  .show();


lisky.find('help').alias('?');
lisky.find('exit').description(`Exits ${config.name}.`);

module.exports = lisky;

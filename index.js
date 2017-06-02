const fse = require('fs-extra');
const vorpal = require('vorpal')();
const config = require('./config');

//import commands from ./commands/ folder
fse.readdirSync('./commands').map(function (command) {
	vorpal.use(require('./commands/'+command));

});

//Define vorpal
  vorpal
	  .delimiter('lisky>')
	  .history('lisky')
	  .show();

module.exports = vorpal;
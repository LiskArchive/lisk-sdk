const fse = require('fs-extra');
const vorpal = require('vorpal')();

//import commands from ./commands/ folder
fse.readdirSync('./commands').map(function (command) {
	vorpal.use(require('./commands/'+command));

});

  vorpal 
	  .delimiter('lisky>')
	  .history('lisky')
	  .show();

module.exports = vorpal;
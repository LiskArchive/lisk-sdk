const vorpal = require('vorpal')();
const get = require('./commands/get');
const list = require('./commands/list');

  vorpal.use(get);
vorpal.use(list);

  vorpal 
	  .delimiter('lisky>')
	  .history('lisky')
	  .show();

module.exports = vorpal;
const vorpal = require('vorpal')();
const get = require('./commands/get');

  vorpal.use(get);

  vorpal 
	  .delimiter('lisky>') 
	  .show();

module.exports = vorpal;
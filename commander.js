var program = require('commander');

program
	.version('0.0.1')
	.command('getblock <input>')
	.action(function(input) {
		console.log(input);
	});

program.parse(process.argv);
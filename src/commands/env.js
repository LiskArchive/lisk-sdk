import config from '../../config.json';

export default function envCommand(vorpal) {
	vorpal
		.command('env')
		.description('Print environmental configuration')
		.action((args, callback) => {
			vorpal.log(JSON.stringify(config));
			callback();
		});
}

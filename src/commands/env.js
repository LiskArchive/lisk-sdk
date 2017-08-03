import config from '../../config.json';

const env = vorpal => () => Promise.resolve(vorpal.log(JSON.stringify(config, null, '\t')));

export default function envCommand(vorpal) {
	vorpal
		.command('env')
		.description('Print environmental configuration')
		.action(env(vorpal));
}

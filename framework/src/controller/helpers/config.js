const os = require('os');

module.exports = {
	dirs: {
		root: process.cwd(),
		temp: `${os.homedir()}/.lisk/temp`,
		sockets: `${os.homedir()}/.lisk/temp/sockets`,
		pids: `${os.homedir()}/.lisk/temp/pids`,
	},
};

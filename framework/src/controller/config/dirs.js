const rootDir = process.cwd();

const systemDirs = appLabel => ({
	root: rootDir,
	temp: `${rootDir}/tmp/${appLabel}/`,
	sockets: `${rootDir}/tmp/${appLabel}/sockets`,
	pids: `${rootDir}/tmp/${appLabel}/pids`,
});

module.exports = systemDirs;

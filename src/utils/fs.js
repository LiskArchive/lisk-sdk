import { readFileSync, writeFileSync } from 'fs';

export const readJsonSync = (path) => {
	const contents = readFileSync(path, 'utf8');
	const stripped = contents.replace(/^\uFEFF/, '');
	return JSON.parse(stripped);
};

export const writeJsonSync = (path, contents) => {
	const json = JSON.stringify(contents, null, '\t');
	return writeFileSync(path, json);
};

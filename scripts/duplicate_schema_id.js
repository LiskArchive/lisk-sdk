/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const extractSchemaIdsFromFile = filePath => {
	const content = fs.readFileSync(filePath, 'utf-8');
	const schemaIdRegex = /\$id:\s*['"]([^'"\s,]+)['"]/g;
	let match;
	const ids = [];
	while ((match = schemaIdRegex.exec(content)) !== null) {
		const line = content.substring(0, match.index).split('\n').length;
		ids.push({ id: match[1], file: filePath, line: line });
	}
	return ids;
};

const getDuplicateIDs = directoryPath => {
	const output = execSync('git ls-files **/*.ts', { cwd: directoryPath }).toString();
	const filePaths = output.split('\n').map(line => path.join(directoryPath, line));
	const allIds = [];
	const duplicateIds = [];
	for (const filePath of filePaths) {
		// Skip unrelated folders
		if (
			filePath.includes('node_modules') ||
			filePath.includes('.git') ||
			filePath.includes('test')
		) {
			continue;
		}
		// Skip if filePath is a directory
		if (fs.lstatSync(filePath).isDirectory()) {
			continue;
		}
		// Skip *.spec.ts files
		if (filePath.endsWith('.spec.ts')) {
			continue;
		}
		const ids = extractSchemaIdsFromFile(filePath);
		for (const { id, file, line } of ids) {
			const existingId = allIds.find(existing => existing.id === id);
			if (existingId) {
				duplicateIds.push({
					id,
					occurrences: [
						{ file: existingId.file, line: existingId.line },
						{ file, line },
					],
				});
			}
			allIds.push({ id, file, line });
		}
	}
	return duplicateIds;
};

const logAndExitDuplicateIDs = duplicateIDs => {
	if (duplicateIDs.length === 0) {
		console.log('No duplicate schema ids found');
		process.exit(0);
	}
	console.log(`${duplicateIDs.length} duplicate schema ids found:`);
	for (const { id, occurrences } of duplicateIDs) {
		console.log(`$id: ${id}`);
		for (const { file, line } of occurrences) {
			console.log(`  File: ${file}:${line}`);
		}
	}
	process.exit(1);
};

const [, , arg2] = process.argv;
if (!arg2) {
	throw new Error('Search path needs to be provided as an argument');
}

const searchPath = path.resolve(arg2);

console.log(`Searching: ${searchPath}`);

// Run the check
logAndExitDuplicateIDs(getDuplicateIDs(searchPath));

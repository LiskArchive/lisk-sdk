const Table = require('cli-table2');

module.exports = function tablify(data) {
	const table = new Table();

	Object.entries(data)
		.forEach(([key, value]) => table.push({ [key]: value }));

	return table;
};

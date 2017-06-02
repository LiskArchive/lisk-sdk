const Table = require('cli-table2');

module.exports = function tablify (data) {

	let table = new Table();

	for (let property in data) {
		table.push({
			[property]: data[property]
		});
	}
	return table;
}
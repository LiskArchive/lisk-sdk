const Table = require('cli-table2');

module.exports = function tablify (data) {

	let table = new Table();

	for (let property in data) {
		if (data.hasOwnProperty(property)) {
			table.push({
				[property]: data[property]
			})
		}
	}
	return table;
}
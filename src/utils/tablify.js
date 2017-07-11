const Table = require('cli-table2');

module.exports = function tablify(data) {
  const table = new Table();

  for (const property in data) {
    table.push({
      [property]: data[property],
    });
  }
  return table;
};

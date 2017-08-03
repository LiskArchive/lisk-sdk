import Table from 'cli-table2';

const addValuesToTable = (table, data) => {
	const valuesToPush = table.options.head.map(key => data[key]);
	return valuesToPush.length && table.push(valuesToPush);
};

const reduceKeys = (keys, row) => {
	const newKeys = Object.keys(row)
		.filter(key =>
			!keys.includes(key)
			&& row[key] !== undefined
			&& !(row[key] instanceof Error),
		);
	return keys.concat(newKeys);
};

export default function tablify(data) {
	const dataIsArray = Array.isArray(data);
	const head = dataIsArray
		? data.reduce(reduceKeys, [])
		: Object.keys(data);
	const table = new Table({ head });

	if (dataIsArray) {
		data.map(addValuesToTable.bind(null, table));
	} else {
		addValuesToTable(table, data);
	}

	return table;
}

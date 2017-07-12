import Table from 'cli-table2';

export default function tablify(data) {
	const table = new Table();

	Object.entries(data)
		.forEach(([key, value]) => table.push({ [key]: value }));

	return table;
}

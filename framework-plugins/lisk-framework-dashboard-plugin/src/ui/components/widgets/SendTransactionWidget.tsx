/*
 * Copyright © 2021 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
import * as React from 'react';
import { Widget, WidgetHeader, WidgetBody } from '../widget';
import Text from '../Text';
import { RegisteredModule } from '../../types';
import SelectInput, { SelectInputOptionType } from '../input/SelectInput';
import { TextAreaInput } from '../input';
import Box from '../Box';
import Button from '../Button';

interface WidgetProps {
	modules: RegisteredModule[];
	onSubmit: (data: {
		moduleID: number;
		assetID: number;
		asset: string;
		passphrase: string;
	}) => void;
}

const SendTransactionWidget: React.FC<WidgetProps> = props => {
	const [listOptions, setListOptions] = React.useState<SelectInputOptionType[]>([]);
	const [selectedAssets, setSelectedAssets] = React.useState<SelectInputOptionType[]>([]);
	const [passphrase, setPassphrase] = React.useState('');
	const [asset, setAsset] = React.useState('');

	React.useEffect(() => {
		const assets = props.modules
			.map(m =>
				m.transactionAssets.map(t => ({
					label: `${m.name}:${t.name}`,
					value: `${m.name}:${t.name}`,
				})),
			)
			.flat();

		setListOptions(assets);
		setSelectedAssets(assets.length ? [assets[0]] : []);
	}, [props.modules]);

	const handleSubmit = () => {
		const assetSelectedValue = selectedAssets[0].value;
		const moduleName = assetSelectedValue.split(':').shift();
		const assetName = assetSelectedValue.split(':').slice(1).join(':');
		let moduleID: number | undefined;
		let assetID: number | undefined;

		

		for (const m of props.modules) {
			if (m.name === moduleName) {
				moduleID = m.id;

				for (const t of m.transactionAssets) {
					if (t.name === assetName) {
						assetID = t.id;

						break;
					}
				}

				break;
			}
		}

		if (moduleID && assetID) {
			props.onSubmit({ moduleID, assetID, passphrase, asset });
		}
	};

	return (
		<Widget>
			<WidgetHeader>
				<Text type={'h2'}>{'Send transaction'}</Text>
			</WidgetHeader>
			<WidgetBody>
				<Box mb={4}>
					<SelectInput
						options={listOptions}
						selected={selectedAssets}
						onChange={val => setSelectedAssets(val)}
					></SelectInput>
				</Box>

				<Box mb={4}>
					<TextAreaInput
						placeholder={'Passphrase'}
						size={'s'}
						value={passphrase}
						onChange={val => setPassphrase(val)}
					></TextAreaInput>
				</Box>

				<Box mb={4}>
					<TextAreaInput
						placeholder={'JSON Object'}
						size={'m'}
						value={asset}
						onChange={val => setAsset(val)}
					></TextAreaInput>
				</Box>

				<Box textAlign={'center'}>
					<Button size={'m'} onClick={handleSubmit}>
						Submit
					</Button>
				</Box>
			</WidgetBody>
		</Widget>
	);
};

export default SendTransactionWidget;

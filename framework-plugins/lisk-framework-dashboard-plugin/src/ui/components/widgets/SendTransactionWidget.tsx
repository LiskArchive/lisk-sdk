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
import { RegisteredModule, SendTransactionOptions } from '../../types';
import SelectInput, { SelectInputOptionType } from '../input/SelectInput';
import { TextAreaInput } from '../input';
import Box from '../Box';
import Button from '../Button';

interface WidgetProps {
	modules: RegisteredModule[];
	onSubmit: (data: SendTransactionOptions) => void;
}

const SendTransactionWidget: React.FC<WidgetProps> = props => {
	const [passphrase, setPassphrase] = React.useState('');
	const [asset, setAsset] = React.useState('{}');
	const [validAsset, setValidAsset] = React.useState(true);
	const assets = props.modules
		.map(m =>
			m.transactionAssets.map(t => ({
				label: `${m.name}:${t.name}`,
				value: `${m.name}:${t.name}`,
			})),
		)
		.flat();
	const [selectedAsset, setSelectedAsset] = React.useState<SelectInputOptionType>(assets[0]);

	const handleSubmit = () => {
		const assetSelectedValue = selectedAsset ? selectedAsset.value : '';
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

		if (moduleID !== undefined && assetID !== undefined) {
			props.onSubmit({
				moduleID,
				assetID,
				passphrase,
				asset: JSON.parse(asset) as Record<string, unknown>,
			});
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
						multi={false}
						options={assets}
						selected={selectedAsset}
						onChange={val => setSelectedAsset(val)}
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
						json
						placeholder={'Asset'}
						size={'m'}
						value={asset}
						onChange={val => {
							try {
								JSON.parse(val ?? '');
								setValidAsset(true);
							} catch (error) {
								setValidAsset(false);
							}
							setAsset(val);
						}}
					></TextAreaInput>
				</Box>

				<Box textAlign={'center'}>
					<Button size={'m'} onClick={handleSubmit} disabled={!validAsset}>
						Submit
					</Button>
				</Box>
			</WidgetBody>
		</Widget>
	);
};

export default SendTransactionWidget;

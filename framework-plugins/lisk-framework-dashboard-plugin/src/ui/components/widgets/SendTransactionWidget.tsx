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
import { SendTransactionOptions } from '../../types';
import SelectInput, { SelectInputOptionType } from '../input/SelectInput';
import { TextAreaInput } from '../input';
import Box from '../Box';
import Button from '../Button';

interface WidgetProps {
	modules: { name: string; commands: { name: string }[] }[];
	onSubmit: (data: SendTransactionOptions) => void;
}

const SendTransactionWidget: React.FC<WidgetProps> = props => {
	const [passphrase, setPassphrase] = React.useState('');
	const [params, setParams] = React.useState('{}');
	const [validParams, setValidParams] = React.useState(true);
	const parameters = props.modules
		.map(m =>
			m.commands.map(t => ({
				label: `${m.name}_${t.name}`,
				value: `${m.name}_${t.name}`,
			})),
		)
		.flat();
	const [selectedParams, setSelectedParams] = React.useState<SelectInputOptionType>(parameters[0]);

	const handleSubmit = () => {
		const paramsSelectedValue = selectedParams ? selectedParams.value : '';
		const moduleName = paramsSelectedValue.split('_').shift();
		const commandName = paramsSelectedValue.split('_').slice(1).join('_');

		if (moduleName !== undefined && commandName !== undefined) {
			props.onSubmit({
				module: moduleName,
				command: commandName,
				passphrase,
				params: JSON.parse(params) as Record<string, unknown>,
			});
		}
	};

	return (
		<Widget>
			<WidgetHeader>
				<Text type={'h2'}>{'Invoke command'}</Text>
			</WidgetHeader>
			<WidgetBody>
				<Box mb={4}>
					<SelectInput
						multi={false}
						options={parameters}
						selected={selectedParams}
						onChange={val => setSelectedParams(val)}
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
						placeholder={'Params'}
						size={'m'}
						value={params}
						onChange={val => {
							try {
								JSON.parse(val ?? '');
								setValidParams(true);
							} catch (error) {
								setValidParams(false);
							}
							setParams(val);
						}}
					></TextAreaInput>
				</Box>

				<Box textAlign={'center'}>
					<Button size={'m'} onClick={handleSubmit} disabled={!validParams}>
						Submit
					</Button>
				</Box>
			</WidgetBody>
		</Widget>
	);
};

export default SendTransactionWidget;

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
import SelectInput, { SelectInputOptionType } from '../input/SelectInput';
import { TextAreaInput } from '../input';
import Box from '../Box';
import Button from '../Button';
import { CallEndpointOptions } from '../../types';

interface WidgetProps {
	actions: string[];
	onSubmit: (data: CallEndpointOptions) => void;
}

const CallEndpointWidget: React.FC<WidgetProps> = props => {
	const actions = props.actions.map(action => ({ label: action, value: action })).flat();
	const [selectedAction, setSelectedAction] = React.useState<SelectInputOptionType>();
	const [keyValue, setKeyValue] = React.useState('{}');
	const [validValue, setValidValue] = React.useState(true);

	const handleSubmit = () => {
		if (!selectedAction) {
			return;
		}
		const actionName = selectedAction.value;

		props.onSubmit({
			name: actionName,
			params: JSON.parse(keyValue) as Record<string, unknown>,
		});
	};

	return (
		<Widget>
			<WidgetHeader>
				<Text type={'h2'}>{'Call endpoint'}</Text>
			</WidgetHeader>
			<WidgetBody>
				<Box mb={4}>
					<SelectInput
						multi={false}
						options={actions}
						selected={selectedAction}
						onChange={val => setSelectedAction(val)}
					></SelectInput>
				</Box>

				<Box mb={4}>
					<TextAreaInput
						json
						placeholder={'Params'}
						size={'l'}
						value={keyValue}
						onChange={val => {
							try {
								JSON.parse(val ?? '');
								setValidValue(true);
							} catch (error) {
								setValidValue(false);
							}
							setKeyValue(val);
						}}
					></TextAreaInput>
				</Box>

				<Box textAlign={'center'}>
					<Button size={'m'} onClick={handleSubmit} disabled={!validValue}>
						Submit
					</Button>
				</Box>
			</WidgetBody>
		</Widget>
	);
};

export default CallEndpointWidget;

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
import Select from 'react-select';
import styles from './Input.module.scss';

interface Props {
	options: { label: string; value: string }[];
	multi?: boolean;
	onSelect?: (value: any) => void;
	selected?: string[];
}

const customStyles = {
	container: {
		height: '40px',
		width: '520px',
		background: 'linear-gradient(180deg, #101c3d 0%, #0c152e 100%)',
		border: '1px solid rgba(223, 230, 242, 0.2)',
		'box-sizing': 'border-box',
		'border-radius': '3px',
		'font-style': 'normal',
		'font-weight': 'normal',
		'font-size': '16px',
	},
	valueContainer: {
		height: '40px',
		width: '520px',
		background: 'linear-gradient(180deg, #101c3d 0%, #0c152e 100%)',
	},
	dropdownIndicator: {
		background: 'linear-gradient(180deg, #101c3d 0%, #0c152e 100%)',
	},
	options: {
		background: 'linear-gradient(180deg, #101c3d 0%, #0c152e 100%)',
		color: '#ffffff',
		':hover': { background: '#4070f4' },
	},
	menu: {
		background: 'linear-gradient(180deg, #101c3d 0%, #0c152e 100%)',
		color: '#ffffff',
		border: 'none',
		'border-bottom': '1px solid rgba(223, 230, 242, 0.2)',
		'box-sizing': 'border-box',
		'border-radius': '3px',
	},
	menuList: {
		background: 'linear-gradient(180deg, #101c3d 0%, #0c152e 100%)',
		border: 'none',
		'border-bottom': '1px solid rgba(223, 230, 242, 0.2)',
		'box-sizing': 'border-box',
		'border-radius': '3px',
	},
	control: {
		background: 'linear-gradient(180deg, #101c3d 0%, #0c152e 100%)',
		border: 'none',
		'border-bottom': '1px solid rgba(223, 230, 242, 0.2)',
		'box-sizing': 'border-box',
		'border-radius': '3px',
	},
	indicatorsContainer: {
		border: 'none',
	},
	input: {
		color: '#ffffff',
	},
	singleValue: {
		color: '#ffffff',
		background: '#254898',
	},
	multiValue: {
		padding: '9px 16px 9px 16px',
		background: '#254898',
		borderRadius: '18px',
		height: '28px',
		alignItems: 'center',
	},
	multiValueLabel: {
		color: '#ffffff',
		background: '#254898',
	},
};

const SelectInput: React.FC<Props> = props => {
	const { options } = props;
	const multi = props.multi ?? false;
	const [selected, updateSelected] = React.useState(props.selected ?? []);
	const onSelectHandler = (newValue: any) => {
		updateSelected(newValue);
	};

	const onSelect = props.onSelect ?? onSelectHandler;

	return (
		<span className={styles.select}>
			<Select
				closeMenuOnSelect={!multi}
				isMulti={multi}
				options={options}
				value={selected}
				onChange={onSelect}
				styles={{
					// Overriding lib component styles, provided -- the component's default styles
					container: provided => ({ ...provided, ...customStyles.container }),
					valueContainer: provided => ({ ...provided, ...customStyles.valueContainer }),
					option: provided => ({ ...provided, ...customStyles.options }),
					dropdownIndicator: provided => ({ ...provided, ...customStyles.dropdownIndicator }),
					menu: provided => ({ ...provided, ...customStyles.menu }),
					control: provided => ({ ...provided, ...customStyles.control }),
					menuList: provided => ({ ...provided, ...customStyles.menuList }),
					input: provided => ({ ...provided, ...customStyles.input }),
					singleValue: provided => ({ ...provided, ...customStyles.singleValue }),
					indicatorsContainer: provided => ({ ...provided, ...customStyles.indicatorsContainer }),
					multiValue: provided => ({ ...provided, ...customStyles.multiValue }),
					multiValueLabel: provided => ({ ...provided, ...customStyles.singleValue }),
					indicatorSeparator: _ => ({}),
				}}
			/>
		</span>
	);
};

export default SelectInput;

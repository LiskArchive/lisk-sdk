/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as React from 'react';
import { apiClient } from '@liskhq/lisk-client';
import { validateBase32Address, getAddressFromBase32Address } from '@liskhq/lisk-cryptography';
import logo from './logo.svg';
import illustration from './illustration.svg';
import styles from './app.module.scss';

const validateAddress = (address: string, prefix: string): boolean => {
	try {
		return validateBase32Address(address, prefix);
	} catch (error) {
		return false;
	}
};

const WarningIcon = () =>
	<span className={`${styles.icon} ${styles.warning}`}>&#xE8B2;</span>;

export const App: React.FC = () => {
	const amount = '100';
	const prefix = 'lsk';
	const faucetAddress = 'lskdwsyfmcko6mcd357446yatromr9vzgu7eb8y99';
	const [input, updateInput] = React.useState('');
	const [errorMsg, updateErrorMsg] = React.useState('');

	const onChange = (val: string) => {
		updateInput(val);
		if (val === '') {
			updateErrorMsg('');
		}
	};

	const onSummit = async () => {
		try {
			const client = await apiClient.createWSClient('ws://localhost:8080/ws');
			await client.invoke('faucet:fundToken', { address: getAddressFromBase32Address(input, prefix) });
			updateErrorMsg('');
		} catch (error) {
			updateErrorMsg(error?.message ?? 'Fail to connect to server');
		}
	};
	return (
		<div className={styles.root}>
			<header className={styles.header}>
				<img src={logo} className={styles.logo} alt="logo" />
			</header>
			<section className={styles.content}>
				<div className={styles.main}>
					<h1>All tokens are for testing purposes only</h1>
					<h2>Please enter your address to receive {amount} {prefix.toLocaleUpperCase()} tokens for free</h2>
					<div className={styles.inputArea}>
						<div className={styles.input}>
							<input className={`${errorMsg !== '' ? styles.error : ''}`} placeholder={faucetAddress} value={input} onChange={e => onChange(e.target.value)} />
							{errorMsg ? <WarningIcon /> : <span />}
							{errorMsg ? <span className={styles.errorMsg}>{errorMsg}</span> : <span />}
						</div>
						<button disabled={!validateAddress(input, prefix)} onClick={onSummit}>Receive</button>
					</div>
					<div className={styles.capcha}></div>
					<div className={styles.address}>
						<p><span className={styles.addressLabel}>Faucet address:</span><span className={styles.addressValue}>{faucetAddress}</span></p>
					</div>
				</div>
				<div className={styles.background}>
					<img src={illustration} className={styles.illustration} alt="illustration" />
				</div>
			</section>
			<footer>
				<p className={styles.copyright}>© 2021 Lisk Foundation</p>
			</footer>
		</div>
	);
};

import * as path from 'path';
import { connect, list, ProcessDescription, start } from 'pm2';

const connectPM2 = async (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        connect(err => {
            if (err) {
                reject(err);

                return;
            }
            resolve();
        })
    })

const startPM2 = async (installPath: string, name: string): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        start({
            name: 'lisk.app',
            script: 'app.js',
            args: '-c config.json',
            cwd: path.resolve(installPath, name),
            pid: path.resolve(installPath, name, '/pids/lisk.app.pid'),
            output: path.resolve(installPath, name, '/logs/lisk.app.log'),
            error: path.resolve(installPath, name, '/logs/lisk.app.err'),
            log_date_format: 'YYYY-MM-DD HH:mm:ss SSS',
            watch: false,
            kill_timeout: 10000,
            max_memory_restart: '1024M',
            min_uptime: 20000,
            max_restarts: 10,
        }, err => {
            if (err) {
                reject(err);

                return;
            }
            resolve();

            return;
        })
    });

export const startApplication = async (installPath: string, name: string): Promise<void> => {
    await connectPM2();
    await startPM2(installPath, name);
}

export const listApplication = async (): Promise<ReadonlyArray<ProcessDescription>> =>
    new Promise<ReadonlyArray<ProcessDescription>>((resolve, reject) => {
        list((err, res) => {
            if (err) {
                reject(err);

                return;
            }
            resolve(res);
        });
    });
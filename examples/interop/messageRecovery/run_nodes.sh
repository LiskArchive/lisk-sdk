
echo "\nRunning 'pm2 stop all'..."
pm2 stop all
sleep 5

echo "\nRunning 'rm -rf ~/.lisk'..."
rm -rf ~/.lisk
sleep 5

echo "\nRunning './start_example'..."
./start_example
sleep 5

echo "\nRunning 'ts-node ./messageRecovery/events/parse_events.ts'"
ts-node ./messageRecovery/events/parse_events.ts


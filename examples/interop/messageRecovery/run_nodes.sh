
echo "Running pm2 stop all..."
pm2 stop all
sleep 5

echo "Running rm -rf ~/.lisk..."
rm -rf ~/.lisk
sleep 5

echo "Running ./start_example..."
./start_example
sleep 5

echo "Running ts-node ./messageRecovery/events/parse_events.ts"
ts-node ./messageRecovery/events/parse_events.ts


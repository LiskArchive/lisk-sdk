#!/bin/bash

cd "$(cd -P -- "$(dirname -- "$0")" && pwd -P)"
. "$(pwd)/shared.sh"
. "$(pwd)/env.sh"

if [ ! -f "$(pwd)/app.js" ]; then
  echo "Error: Lisk installation was not found. Exiting."
  exit 1
fi

if [ "$USER" == "root" ]; then
  echo "Error: Lisk should not be run be as root. Exiting."
  exit 1
fi

UNAME=$(uname)
NETWORK="test"

DB_NAME="lisk_$NETWORK"
DB_USER=$USER
DB_PASS="password"
DB_DATA="$(pwd)/pgsql/data"
DB_LOG_FILE="$(pwd)/pgsql.log"

LOG_FILE="$(pwd)/app.log"
PID_FILE="$(pwd)/app.pid"

CMDS=("curl" "forever" "gunzip" "node" "tar" "psql" "createdb" "createuser" "dropdb" "dropuser")
check_cmds CMDS[@]

################################################################################

create_user() {
  dropuser --if-exists "$DB_USER" &> /dev/null
  createuser --createdb "$DB_USER" &> /dev/null
  psql -qd postgres -c "ALTER USER "$DB_USER" WITH PASSWORD '$DB_PASS';" &> /dev/null
  if [ $? != 0 ]; then
    echo "X Failed to create Postgresql user."
    exit 1
  else
    echo "√ Postgresql user created successfully."
  fi
}

create_database() {
  dropdb --if-exists "$DB_NAME" &> /dev/null
  createdb "$DB_NAME" &> /dev/null
  if [ $? != 0 ]; then
    echo "X Failed to create Postgresql database."
    exit 1
  else
    echo "√ Postgresql database created successfully."
  fi
}

populate_database() {
  psql -ltAq | grep -q "^$DB_NAME|" &> /dev/null
  if [ $? == 0 ]; then
    download_blockchain
    restore_blockchain
  fi
}

download_blockchain() {
  echo "Downloading blockchain snapshot..."
  curl -o blockchain.db.gz "https://downloads.lisk.io/lisk/$NETWORK/blockchain.db.gz" &> /dev/null
  if [ $? == 0 ] && [ -f blockchain.db.gz ]; then
    gunzip -q blockchain.db.gz &> /dev/null
  fi
  if [ $? != 0 ]; then
    rm -f blockchain.*
    echo "X Failed to download blockchain snapshot."
    exit 1
  else
    echo "√ Blockchain snapshot downloaded successfully."
  fi
}

restore_blockchain() {
  echo "Restoring blockchain..."
  if [ -f blockchain.db ]; then
    psql -qd "$DB_NAME" < blockchain.db &> /dev/null
  fi
  rm -f blockchain.*
  if [ $? != 0 ]; then
    echo "X Failed to restore blockchain."
    exit 1
  else
    echo "√ Blockchain restored successfully."
  fi
}

autostart_cron() {
  local cmd="crontab"

  command -v "$cmd" &> /dev/null

  if [ $? != 0 ]; then
    echo "X Failed to execute crontab."
    return 1
  fi

  crontab=$($cmd -l 2> /dev/null | sed '/lisk\.sh start/d' 2> /dev/null)

  crontab=$(cat <<-EOF
	$crontab
	@reboot $(command -v "bash") $(pwd)/lisk.sh start > $(pwd)/cron.log 2>&1
	EOF
  )

  printf "$crontab\n" | $cmd - &> /dev/null

  if [ $? != 0 ]; then
    echo "X Failed to update crontab."
    return 1
  else
    echo "√ Crontab updated successfully."
    return 0
  fi
}

coldstart_lisk() {
  stop_lisk &> /dev/null
  stop_postgresql &> /dev/null
  rm -rf $DB_DATA
  pg_ctl initdb -D $DB_DATA &> /dev/null
  sleep 2
  start_postgresql
  sleep 1
  create_user
  create_database
  populate_database
  autostart_cron
  start_lisk
}

start_postgresql() {
  if pgrep -x "postgres" &> /dev/null; then
    echo "√ Postgresql is running."
  else
    pg_ctl -D $DB_DATA -l $DB_LOG_FILE start &> /dev/null
    sleep 1
    if [ $? != 0 ]; then
      echo "X Failed to start Postgresql."
      exit 1
    else
      echo "√ Postgresql started successfully."
    fi
  fi
}

stop_postgresql() {
  stopPg=0
  if ! pgrep -x "postgres" &> /dev/null; then
    echo "√ Postgresql is not running."
  else
   while [[ $stopPg < 5 ]] &> /dev/null; do
      pg_ctl -D $DB_DATA -l $DB_LOG_FILE stop &> /dev/null
      if [ $? == 0 ]; then
        echo "√ Postgresql stopped successfully."
        break
      else
        echo "X Postgresql failed to stop."
      fi
      sleep .5
      stopPg=$[$stopPg+1]
    done
    if pgrep -x "postgres" &> /dev/null; then
      pkill -x postgres -9  &> /dev/null;
      echo "√ Postgresql Killed."
    fi
  fi
}

start_lisk() {
  if pgrep -x "node" &> /dev/null; then
    echo "√ Lisk is running."
    exit 1
  else
    forever start -u lisk -a -l $LOG_FILE --pidFile $PID_FILE -m 1 app.js &> /dev/null
    if [ $? == 0 ]; then
      echo "√ Lisk started successfully."
    else
      echo "X Failed to start lisk."
    fi
  fi
}

stop_lisk() {
  stopLisk=0
  if ! pgrep -x "node" &> /dev/null; then
    echo "√ Lisk is not running."
  else
    while [[ $stopLisk < 5 ]] &> /dev/null; do
      forever stop lisk &> /dev/null
      if [ $? !=  0 ]; then
        echo "X Failed to stop lisk."
      else
        echo "√ Lisk stopped successfully."
        break
      fi
      sleep .5
      stopLisk=$[$stopLisk+1]
    done
    if pgrep -x "node" &> /dev/null; then
      pkill -x node -9  &> /dev/null;
      echo "√ Lisk Killed."
    fi
  fi
}

rebuild_lisk() {
  create_database
  download_blockchain
  restore_blockchain
}

check_status() {
  if [ -f "$PID_FILE" ]; then
    local PID=$(cat "$PID_FILE")
  fi
  if [ ! -z "$PID" ]; then
    ps -p "$PID" > /dev/null 2>&1
    local STATUS=$?
  else
    local STATUS=1
  fi
  if [ -f $PID_FILE ] && [ ! -z "$PID" ] && [ $STATUS == 0 ]; then
    echo "√ Lisk is running (as process $PID)."
  else
    echo "X Lisk is not running."
  fi
}

tail_logs() {
  if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
  fi
}

case $1 in
"coldstart")
  coldstart_lisk
  ;;
"start")
  start_postgresql
  sleep 2
  start_lisk
  ;;
"stop")
  stop_lisk
  stop_postgresql
  ;;
"reload")
  stop_lisk
  start_lisk
  ;;
"restart")
  stop_lisk
  stop_postgresql
  start_postgresql
  sleep 1
  start_lisk
  ;;
"rebuild")
  stop_lisk
  sleep 1
  start_postgresql
  sleep 1
  rebuild_lisk
  start_lisk
  ;;
"status")
  check_status
  ;;
"logs")
  tail_logs
  ;;
*)
  echo "Error: Unrecognized command."
  echo ""
  echo "Available commands are: coldstart start stop reload restart rebuild status logs "
  ;;
esac

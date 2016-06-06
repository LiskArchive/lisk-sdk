#!/bin/bash

bail() {
  echo "Error executing command, exiting"
  exit 1
}

exec_cmd_nobail() {
  echo "+ $1"
  bash -c "$1"
}

exec_cmd() {
  exec_cmd_nobail "$1" || bail
}

check_cmds() {
  local cmds=("${!1}")
  for i in "${cmds[@]}"; do
    command -v "$i" > /dev/null 2>&1 || {
      echo "Error: $i command was not found. Aborting." >&2; exit 1;
    }
  done
}

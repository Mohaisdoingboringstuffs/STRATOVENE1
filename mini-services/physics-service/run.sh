#!/usr/bin/env bash
# Start the STRATOVANE physics service (Flask) on port 5001.
cd "$(dirname "$0")"
export PYTHONPATH="$(pwd)"
exec python3 -m flask --app app run --host 127.0.0.1 --port 5001 --with-threads

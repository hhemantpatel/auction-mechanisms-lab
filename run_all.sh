#!/bin/sh
# Reproduce all results and figures (needs numpy and matplotlib).
set -e
cd "$(dirname "$0")"
mkdir -p figures results
if [ -z "$PY" ]; then
  if [ -x .venv/bin/python ]; then PY=.venv/bin/python; else PY=python3; fi
fi
$PY part1_second_price.py > results/part1.txt
$PY part2_first_price.py > results/part2.txt
$PY part3_vcg.py > results/part3.txt
echo done

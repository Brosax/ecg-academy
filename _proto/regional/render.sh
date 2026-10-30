#!/bin/sh
# render out/<id>.json → out/<id>.png and out/<id>-beat.png with the shared harness
cd "$(dirname "$0")"
for id in "$@"; do python -I "C:\Users\A511741\Desktop\Workspace\ECG Academy\_proto\harness\render.py" out/$id.json out/$id; done

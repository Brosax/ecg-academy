#!/bin/sh
# usage: dbg_sweep.sh '<json>' [id]
cd "/c/Users/A511741/Desktop/Workspace/ECG Academy/_proto/field"
FIELD_OVR="$1" node dbg_meas.ts ${2:-normal} | sed -n '2,20p'

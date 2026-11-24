#!/bin/bash
# usage: tools/test/quick-e2e/e2e.sh  (app served on 127.0.0.1:8791; temp bridge on 8793; screenshots in $OUT or the temp dir)
# 156b end-to-end with a TEMP home (never the owner's bridge or data): quick box → (bridge down: queue) → bridge up → /inbox → app 8791 → snapshot → box list → ?open
SP=$(dirname "$(readlink -f "$0")"); R=$(cd "$SP/../../.." && pwd)
T=$(mktemp -d); C=$T/.config/hizli-note; mkdir -p "$C"
echo '{"port":8793,"token":"e2e-token-123"}' > "$C/bridge.json"
export NTS_QUICK_CONF=$C; TEXT="E2E hızlı kutu $(date +%H%M%S)"
python3 $SP/e2eq.py down "$TEXT" 2>&1 | grep -v IM_MOD
HOME=$T node $R/bridge/server.mjs > $T/bridge.log 2>&1 & BP=$!
for k in $(seq 50); do curl -s -o /dev/null 127.0.0.1:8793/ && break; sleep 0.1; done
python3 $SP/e2eq.py flush "$TEXT" 2>&1 | grep -v IM_MOD
curl -s -H "authorization: Bearer e2e-token-123" 127.0.0.1:8793/inbox | python3 -c "import json,sys;l=json.load(sys.stdin);print('bridge /inbox:', [e['text'] for e in l])"
node $SP/e2e.mjs "$C/snapshot.json" "$TEXT" ${OUT:-$T}/e2e; RC=$?
python3 $SP/e2eq.py after "$TEXT" 2>&1 | grep -v IM_MOD
python3 $SP/e2eq.py down "$TEXT-2" 2>&1 | grep -v IM_MOD; python3 $SP/shot.py dark 0 "" "" ${OUT:-$T}/e2e-box.png 2>&1 | grep -v IM_MOD
kill $BP; grep -c . $T/bridge.log >/dev/null; tail -3 $T/bridge.log | grep -v Token; echo "e2e rc=$RC"

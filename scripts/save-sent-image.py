#!/usr/bin/env python3
"""Save the newest image sent in the current Alfred opencode session to a target path.
Usage: python3 save-sent-image.py /path/to/target.jpg
Tracks already-saved part ids in /tmp/saved_image_parts.txt so repeated runs
pick up photos one at a time in order."""

import sqlite3
import base64
import json
import sys
import os

DB = "/home/cam/.local/share/opencode-alfred/opencode/opencode.db"
SESSION = "ses_fff541b2cffeA0raQonKS5f6JI"
STATE = "/tmp/saved_image_parts.txt"

if len(sys.argv) < 2:
    print("usage: save-sent-image.py <target-path>")
    sys.exit(1)
target = sys.argv[1]

saved = set()
if os.path.exists(STATE):
    saved = set(x for x in open(STATE).read().split() if x)

con = sqlite3.connect("file:%s?mode=ro" % DB, uri=True)
rows = con.execute(
    """
    SELECT p.id, p.data FROM part p
    WHERE p.session_id = ?
      AND json_extract(p.data, '$.type') = 'file'
      AND json_extract(p.data, '$.mime') LIKE 'image%'
    ORDER BY p.time_created DESC
    """,
    (SESSION,),
).fetchall()

fresh = [r for r in rows if r[0] not in saved]
if not fresh:
    print("NO NEW IMAGE in session. Total image parts seen:", len(rows))
    sys.exit(1)

pid, raw_json = fresh[0]
d = json.loads(raw_json)
mime = d.get("mime", "?")
url = d.get("url", "")
if not url.startswith("data:"):
    print("UNEXPECTED url format (not inline base64):", url[:120])
    print("part id:", pid)
    sys.exit(1)

b64 = url.split(",", 1)[1]
raw = base64.b64decode(b64)
os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
with open(target, "wb") as f:
    f.write(raw)
with open(STATE, "a") as f:
    f.write(pid + "\n")

magic = raw[:3].hex()
ok_jpeg = magic == "ffd8ff"
print("saved part", pid)
print(
    "->",
    target,
    "|",
    len(raw),
    "bytes | mime",
    mime,
    "| magic",
    magic,
    "| jpeg:",
    ok_jpeg,
)
if not ok_jpeg:
    print(
        "WARNING: not a JPEG magic header (browser will usually still sniff it, but check)"
    )

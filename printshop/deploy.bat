@echo off
node build.js && git add . && git commit -m "update data.json" && git push origin main
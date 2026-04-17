powershell -ExecutionPolicy Bypass -File deploy/bundle.ps1
scp deploy\toolaccess-kiosk-1.0.0.zip alexk@192.168.86.62:~
ssh alexk@192.168.86.62 './deploy_kiosk.sh'

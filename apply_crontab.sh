#!/bin/bash
if [ -f /opt/jobassistant/crontab_host.txt ]; then
    crontab /opt/jobassistant/crontab_host.txt
fi

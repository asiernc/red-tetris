#!/bin/bash
HOST_IP=$(hostname -I | awk '{print $1}')
echo "HOST_IP=$HOST_IP" > .env
docker-compose up
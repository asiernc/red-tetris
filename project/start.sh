#!/bin/bash

# Obtener la IP automáticamente
HOST_IP=$(hostname -I | awk '{print $1}')

# Verificar si el archivo .env existe y tiene HOST_IP vacía
if [ ! -f .env ] || ! grep -q '^HOST_IP=' .env || [ -z "$(grep '^HOST_IP=' .env | cut -d= -f2)" ]; then
  echo "HOST_IP=$HOST_IP" >> .env  # Si no existe o está vacía, la añade
fi

# Exportar variables del .env
export $(grep -v '^#' .env | xargs)

# Levantar Docker Compose
docker-compose up
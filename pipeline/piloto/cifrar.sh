#!/usr/bin/env bash
# Cifra una carpeta con la clave pública del repo (AES-256 + RSA-OAEP). Solo la sesión que tiene la privada la abre.
# Uso: cifrar.sh <carpeta> <salida_sin_extension>
set -euo pipefail
tar czf /tmp/c.tgz -C "$(dirname "$1")" "$(basename "$1")"
openssl rand -hex 32 > /tmp/c.key
openssl enc -aes-256-cbc -pbkdf2 -salt -in /tmp/c.tgz -out "$2.tgz.enc" -pass file:/tmp/c.key
openssl pkeyutl -encrypt -pubin -inkey config/claves/catalogo.pub.pem -pkeyopt rsa_padding_mode:oaep -in /tmp/c.key -out "$2.key.enc"
rm -f /tmp/c.tgz /tmp/c.key

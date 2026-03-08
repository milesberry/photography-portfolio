#!/bin/bash
# Usage: ./upload-photos.sh <local-folder> <album-name>
# Example: ./upload-photos.sh ~/exports/jazz jazz
#
# Prerequisites:
#   aws configure --profile r2
#   Use your R2 API token Access Key ID and Secret Access Key.
#   Set region to: auto

set -e

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <local-folder> <album-name>"
  exit 1
fi

LOCAL_FOLDER="$1"
ALBUM_NAME="$2"

aws s3 sync "$LOCAL_FOLDER" "s3://portfolio-images/${ALBUM_NAME}/" \
  --endpoint-url https://f9d3f7f75d0c7fe40dd82e84a37de170.eu.r2.cloudflarestorage.com \
  --profile r2

echo "Done. Remember to update gallery.yaml with the new image filenames."

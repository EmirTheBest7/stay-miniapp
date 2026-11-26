#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
printf '#!/bin/sh\ncd "$(git rev-parse --show-toplevel)" && sh scripts/secret-scan.sh\n' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit && echo "pre-commit hook installed"

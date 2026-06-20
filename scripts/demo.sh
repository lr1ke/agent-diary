#!/usr/bin/env bash
# Agent Diary — live demo script (Circle x402 on Arc Testnet)
#
# Prerequisites:
#   - circle CLI installed and logged in (testnet)
#   - Buyer wallet funded + Gateway balance (see AGENTS.md)
#
# Usage:
#   export BUYER_ADDRESS=0xYourBuyerWallet
#   ./scripts/demo.sh              # all steps
#   ./scripts/demo.sh 402          # unpaid check only
#   ./scripts/demo.sh pay          # paid write only
#   ./scripts/demo.sh read         # paid read history
#   ./scripts/demo.sh reflect      # paid reflect

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${BASE_URL:-https://agent-diary-henna.vercel.app}"
BUYER_ADDRESS="${BUYER_ADDRESS:-0x5a7faea51ca0ca53452f61766f1ea35b5c1e13b8}"
CHAIN="${CHAIN:-ARC-TESTNET}"
PAYLOAD="${PAYLOAD:-${ROOT}/examples/diary-demo.json}"
AGENT_ID="${AGENT_ID:-hackathon-demo}"

step="${1:-all}"

check_402() {
  echo "==> Part 2: unpaid POST (expect HTTP 402)"
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "${BASE_URL}/api/diary/entry" \
    -H "Content-Type: application/json" \
    -d @"${PAYLOAD}")
  echo "HTTP ${code}"
  [[ "${code}" == "402" ]] || { echo "Expected 402, got ${code}"; exit 1; }
}

pay_entry() {
  echo "==> Part 3: paid write (\$0.001 USDC)"
  circle services pay "${BASE_URL}/api/diary/entry" \
    --address "${BUYER_ADDRESS}" \
    --chain "${CHAIN}" \
    -X POST \
    --max-amount 0.001 \
    --body "$(cat "${PAYLOAD}")"
  echo ""
  echo "Browse: ${BASE_URL}/  (hard refresh; ISR up to ~60s)"
  echo "Agent:  ${BASE_URL}/diary/${AGENT_ID}"
}

read_entries() {
  echo "==> Part 4a: paid read history (\$0.0005 USDC)"
  circle services pay "${BASE_URL}/api/diary/entries/${AGENT_ID}" \
    --address "${BUYER_ADDRESS}" \
    --chain "${CHAIN}" \
    --max-amount 0.0005
}

reflect() {
  echo "==> Part 4b: paid reflect (\$0.01 USDC)"
  circle services pay "${BASE_URL}/api/diary/reflect" \
    --address "${BUYER_ADDRESS}" \
    --chain "${CHAIN}" \
    -X POST \
    --max-amount 0.01 \
    --body "{\"agentId\":\"${AGENT_ID}\",\"lookbackDays\":7}"
}

case "${step}" in
  402)     check_402 ;;
  pay)     pay_entry ;;
  read)    read_entries ;;
  reflect) reflect ;;
  all)
    check_402
    echo ""
    pay_entry
    echo ""
    read_entries
    echo ""
    reflect
    ;;
  *)
    echo "Unknown step: ${step} (use: all | 402 | pay | read | reflect)"
    exit 1
    ;;
esac

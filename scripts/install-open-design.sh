#!/usr/bin/env bash
# Downloads skills, design-systems and craft from nexu-io/open-design into the project.
set -euo pipefail

REPO="nexu-io/open-design"
BASE_RAW="https://raw.githubusercontent.com/${REPO}/main"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SKILLS_DIR="${PROJECT_ROOT}/.skills"
DS_DIR="${PROJECT_ROOT}/.design-systems"
CRAFT_DIR="${PROJECT_ROOT}/.craft"

mkdir -p "$SKILLS_DIR" "$DS_DIR" "$CRAFT_DIR"

echo "=== Downloading skills ==="
SKILL_NAMES=$(gh api "repos/${REPO}/contents/skills" --jq '[.[] | select(.type=="dir") | .name] | .[]')
for skill in $SKILL_NAMES; do
  dest="${SKILLS_DIR}/${skill}"
  if [ -d "$dest" ]; then
    echo "  [skip] ${skill} (already exists)"
    continue
  fi
  # Get all files in this skill folder
  files=$(gh api "repos/${REPO}/contents/skills/${skill}" --jq '[.[] | select(.type=="file") | .name] | .[]' 2>/dev/null || echo "SKILL.md")
  mkdir -p "$dest"
  for f in $files; do
    url="${BASE_RAW}/skills/${skill}/${f}"
    curl -sf "$url" -o "${dest}/${f}" && echo "  [ok] ${skill}/${f}" || echo "  [err] ${skill}/${f}"
  done
done

echo ""
echo "=== Downloading design-systems ==="
DS_NAMES=$(gh api "repos/${REPO}/contents/design-systems" --jq '[.[] | select(.type=="dir") | .name] | .[]')
for ds in $DS_NAMES; do
  dest="${DS_DIR}/${ds}"
  if [ -d "$dest" ]; then
    echo "  [skip] ${ds} (already exists)"
    continue
  fi
  files=$(gh api "repos/${REPO}/contents/design-systems/${ds}" --jq '[.[] | select(.type=="file") | .name] | .[]' 2>/dev/null || echo "DESIGN.md")
  mkdir -p "$dest"
  for f in $files; do
    url="${BASE_RAW}/design-systems/${ds}/${f}"
    curl -sf "$url" -o "${dest}/${f}" && echo "  [ok] ${ds}/${f}" || echo "  [err] ${ds}/${f}"
  done
done

echo ""
echo "=== Downloading craft files ==="
CRAFT_FILES=$(gh api "repos/${REPO}/contents/craft" --jq '[.[] | select(.type=="file") | .name] | .[]')
for cf in $CRAFT_FILES; do
  dest="${CRAFT_DIR}/${cf}"
  if [ -f "$dest" ]; then
    echo "  [skip] ${cf} (already exists)"
    continue
  fi
  url="${BASE_RAW}/craft/${cf}"
  curl -sf "$url" -o "$dest" && echo "  [ok] ${cf}" || echo "  [err] ${cf}"
done

echo ""
echo "Done! Skills: ${SKILLS_DIR}"
echo "      Design systems: ${DS_DIR}"
echo "      Craft: ${CRAFT_DIR}"

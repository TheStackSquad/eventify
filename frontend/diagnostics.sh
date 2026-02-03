#!/bin/bash
echo "=== SEARCHING FOR CURRENCY FORMATTING LOGIC ==="

# 1. Find all imports of currency utilities
echo "1. Files importing currency utilities:"
grep -r "import.*currency\|from.*currency" ./src --include="*.js" --include="*.jsx" 2>/dev/null

echo -e "\n2. Files using formatCurrency:"
grep -r "formatCurrency" ./src --include="*.js" --include="*.jsx" 2>/dev/null

echo -e "\n3. Files using koboToNaira:"
grep -r "koboToNaira" ./src --include="*.js" --include="*.jsx" 2>/dev/null

echo -e "\n4. Check the currency utility file itself:"
find ./src -name "*currency*" -type f 2>/dev/null

# 5. Check specific event-related files
echo -e "\n5. Checking event detail files:"
EVENT_FILES=(
  "./src/app/events/\[id\]/components/actionButtons.js"
  "./src/app/events/\[id\]/components/orderSummary.js"
  "./src/app/events/\[id\]/components/quantitySelector.js"
  "./src/app/events/\[id\]/components/ticketSelector.js"
  "./src/app/events/\[id\]/ticketUI/orderSummary.js"
  "./src/app/events/\[id\]/ticketUI/index.js"
  "./src/app/events/\[id\]/ticketPurchaseSection.js"
  "./src/app/events/\[id\]/eventDetailClient.js"
)

for file in "${EVENT_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "=== $file ==="
    grep -n "formatCurrency\|koboToNaira\|currency" "$file" 2>/dev/null || echo "No currency usage found"
    echo ""
  fi
done

# 6. Also check any utility files
echo "6. Checking utility files:"
find ./src -type f \( -name "*.js" -o -name "*.jsx" \) -path "*/utils/*" -exec grep -l "formatCurrency\|koboToNaira" {} \; 2>/dev/null

# 7. Quick one-liner to see all files that need updating
echo -e "\n7. All files that likely need updating (imports or uses currency formatting):"
grep -r -l "formatCurrency\|koboToNaira\|from.*currency" ./src --include="*.js" --include="*.jsx" 2>/dev/null
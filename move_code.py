import re

with open('/Users/eason/Downloads/台球牌局计分助手/src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Remove Table Felt Color block
start_felt = -1
end_felt = -1
for i, l in enumerate(lines):
    if "Table Felt Color & Cards Type Select System" in l:
        start_felt = i
    if start_felt != -1 and "Advanced rules config toggler" in l:
        end_felt = i
        break

if start_felt != -1 and end_felt != -1:
    lines = lines[:start_felt] + lines[end_felt:]
else:
    print("Could not find Table Felt Color block")

# 2. Move Order Drawer block
start_order = -1
end_order = -1
for i, l in enumerate(lines):
    if "COLLAPSIBLE ORDER COMPARISON SECTION" in l:
        start_order = i
    if start_order != -1 and "Players card tiles" in l:
        # Actually, let's find the empty line before "Players card tiles"
        end_order = i - 1 
        break

if start_order != -1 and end_order != -1:
    order_block = lines[start_order:end_order]
    lines = lines[:start_order] + lines[end_order:]
else:
    print("Could not find Order Drawer block")

# 3. Insert before Direct match enter button
insert_idx = -1
for i, l in enumerate(lines):
    if "Direct match enter button" in l:
        insert_idx = i
        break

if insert_idx != -1:
    lines = lines[:insert_idx] + order_block + lines[insert_idx:]
else:
    print("Could not find Direct match enter button")

with open('/Users/eason/Downloads/台球牌局计分助手/src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Done")

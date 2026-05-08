const fs = require("fs");
let content = fs.readFileSync("src/app/api/admin/analytics/route.ts", "utf8");

// Split into lines so we can work line-by-line
const lines = content.split("\n");

// Find where the old block starts (the $addFields with productObjectId using $toObjectId)
let startIdx = -1;
let endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("productObjectId: { $toObjectId")) {
    // Start 2 lines before this (the opening {)
    startIdx = i - 2;
  }
  if (startIdx !== -1 && lines[i].includes("{ $sort: { revenue: -1 } }") && endIdx === -1) {
    endIdx = i;
  }
}

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find block. start=" + startIdx + " end=" + endIdx);
  process.exit(1);
}

console.log("Replacing lines", startIdx+1, "to", endIdx+1);

const newLines = [
  "            {",
  "              $addFields: {",
  "                productObjectId: {",
  '                  $convert: { input: "$items.productId", to: "objectId", onError: null, onNull: null }',
  "                }",
  "              }",
  "            },",
  "            {",
  "              $lookup: {",
  '                from: "products",',
  '                localField: "productObjectId",',
  '                foreignField: "_id",',
  '                as: "productInfo"',
  "              }",
  "            },",
  "            // Use product categoryId if found, else fall back to item.categoryId (admin-created orders)",
  "            {",
  "              $addFields: {",
  "                resolvedCategoryId: {",
  "                  $cond: {",
  '                    if: { $gt: [{ $size: "$productInfo" }, 0] },',
  '                    then: { $arrayElemAt: ["$productInfo.categoryId", 0] },',
  '                    else: "$items.categoryId"',
  "                  }",
  "                }",
  "              }",
  "            },",
  "            { $match: { resolvedCategoryId: { $ne: null } } },",
  "            {",
  "              $addFields: {",
  "                categoryObjectId: {",
  '                  $convert: { input: "$resolvedCategoryId", to: "objectId", onError: null, onNull: null }',
  "                }",
  "              }",
  "            },",
  "            {",
  "              $lookup: {",
  '                from: "categories",',
  '                let: { catObjId: "$categoryObjectId", catStr: "$resolvedCategoryId" },',
  "                pipeline: [",
  "                  {",
  "                    $match: {",
  "                      $expr: {",
  "                        $or: [",
  '                          { $eq: ["$_id", "$$catObjId"] },',
  '                          { $eq: [{ $toString: "$_id" }, "$$catStr"] }',
  "                        ]",
  "                      }",
  "                    }",
  "                  }",
  "                ],",
  '                as: "categoryInfo"',
  "              }",
  "            },",
  '            { $unwind: "$categoryInfo" },',
  "            {",
  "              $group: {",
  '                _id: "$categoryInfo.name",',
  '                count: { $sum: "$items.quantity" },',
  '                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }',
  "              }",
  "            },",
  "            { $sort: { revenue: -1 } }"
];

// Detect line ending from file
const crlf = content.includes("\r\n");
const sep = crlf ? "\r" : "";  // we'll re-add \n from join

const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);
const combined = [...before, ...newLines.map(l => l + sep), ...after];
fs.writeFileSync("src/app/api/admin/analytics/route.ts", combined.join("\n"));
console.log("Done - replaced lines", startIdx+1, "to", endIdx+1);

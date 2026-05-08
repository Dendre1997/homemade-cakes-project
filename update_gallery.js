const fs = require('fs');

const file1 = 'src/app/api/admin/gallery/route.ts';
let content1 = fs.readFileSync(file1, 'utf8');

content1 = content1.replace('decorationPrice, isActive } = body;', 'decorationPrice, isActive, defaultAddons } = body;');
content1 = content1.replace('updatedAt: new Date(),\r\n    };', 'updatedAt: new Date(),\r\n      defaultAddons: defaultAddons?.map((da) => ({\r\n          addonId: new ObjectId(String(da.addonId)),\r\n          variantId: new ObjectId(String(da.variantId))\r\n      })) || [],\r\n    };');
content1 = content1.replace('updatedAt: new Date(),\n    };', 'updatedAt: new Date(),\n      defaultAddons: defaultAddons?.map((da) => ({\n          addonId: new ObjectId(String(da.addonId)),\n          variantId: new ObjectId(String(da.variantId))\n      })) || [],\n    };');

if (!content1.includes('import { ObjectId } from')) {
    content1 = content1.replace('import clientPromise, { getGalleryCollection } from "@/lib/db";', 'import clientPromise, { getGalleryCollection } from "@/lib/db";\nimport { ObjectId } from "mongodb";');
}
fs.writeFileSync(file1, content1);

const file2 = 'src/app/api/admin/gallery/[id]/route.ts';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace('if (body.isActive !== undefined) updateData.isActive = !!body.isActive;\r\n\r\n    const result = await collection.updateOne(', 'if (body.isActive !== undefined) updateData.isActive = !!body.isActive;\r\n    if (body.defaultAddons !== undefined) {\r\n      updateData.defaultAddons = body.defaultAddons.map((da: any) => ({\r\n          addonId: new ObjectId(String(da.addonId)),\r\n          variantId: new ObjectId(String(da.variantId))\r\n      }));\r\n    }\r\n\r\n    const result = await collection.updateOne(');
content2 = content2.replace('if (body.isActive !== undefined) updateData.isActive = !!body.isActive;\n\n    const result = await collection.updateOne(', 'if (body.isActive !== undefined) updateData.isActive = !!body.isActive;\n    if (body.defaultAddons !== undefined) {\n      updateData.defaultAddons = body.defaultAddons.map((da: any) => ({\n          addonId: new ObjectId(String(da.addonId)),\n          variantId: new ObjectId(String(da.variantId))\n      }));\n    }\n\n    const result = await collection.updateOne(');

fs.writeFileSync(file2, content2);
console.log('Done Gallery API');

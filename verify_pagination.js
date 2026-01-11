
const baseUrl = "http://localhost:3000/api/products";

async function verifyPagination() {
  try {
    console.log("Fetching Page 1...");
    const res1 = await fetch(`${baseUrl}?page=1&limit=10`);
    const data1 = await res1.json();
    console.log(`Page 1 returned ${data1.length} items.`);
    const ids1 = data1.map(p => p._id);

    console.log("Fetching Page 2...");
    const res2 = await fetch(`${baseUrl}?page=2&limit=10`);
    const data2 = await res2.json();
    console.log(`Page 2 returned ${data2.length} items.`);
    const ids2 = data2.map(p => p._id);

    // Check for overlaps
    const overlaps = ids2.filter(id => ids1.includes(id));
    console.log(`Overlapping IDs: ${overlaps.length}`);
    if (overlaps.length > 0) {
      console.log("Overlapping IDs:", overlaps);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

verifyPagination();

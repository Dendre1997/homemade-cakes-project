/**
 * Converts a JSON array to a CSV string and triggers a browser download.
 * @param data Array of objects to export
 * @param filename Name of the file to download (without extension)
 * @param headers Optional custom headers. If not provided, keys of the first object are used.
 */
export function exportToCSV(data: any[], filename: string, headers?: string[]) {
  if (!data || !data.length) {
    console.warn("No data to export");
    return;
  }

  // 1. Extract headers
  const keys = Object.keys(data[0]);
  const csvHeaders = headers || keys;

  // 2. Convert to CSV string
  const csvRows = [
    csvHeaders.join(","), // Header row
    ...data.map((row) =>
      keys
        .map((key) => {
          const val = row[key];
          // Handle special characters, quotes, and commas
          const escaped = ("" + (val ?? "")).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ].join("\n");

  // 3. Create Blob and Trigger Download
  const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

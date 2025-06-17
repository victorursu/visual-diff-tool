// pages/api/files.ts
import { readdir, stat } from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  const { folder } = req.query;
  const baseDir = path.join(process.cwd(), "public");

  try {
    if (folder) {
      const dirPath = path.join(baseDir, folder);
      const files = await readdir(dirPath);
      return res.status(200).json(files);
    } else {
      // If no folder given, list available result folders
      const folders = await readdir(path.join(baseDir, "results"));
      const filtered = [];

      for (const f of folders) {
        const fullPath = path.join(baseDir, "results", f);
        const info = await stat(fullPath);
        if (info.isDirectory()) {
          filtered.push(f);
        }
      }

      return res.status(200).json({ folders: filtered });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

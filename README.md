# Visual Diff Tool

A lightweight visual regression testing utility that helps you compare screenshots of web pages between two environments (source and destination). Useful for catching layout changes, regressions, or rendering bugs across deployments.

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your setup

- Define your source and destination environments. Example:

  ```json
  {
    "sourceBase": "https://source-site.com",
    "destBase": "https://destination-site.com",
    "maxHeight": "1000",
    "delaySeconds": 2,
    "s3": {
      "enabled": true,
      "removeFolderAfterSync": true,
      "bucket": "visual-diff-tool"
    }
  }
  ```

- List all the relative paths you want to test, one per line:

  ```
  /
  /about
  /contact
  /company
  ```

### 3. Generate screenshots

Run the comparison script to capture screenshots for all defined URLs:

```bash
node compare.mjs
```

### 4. Start the viewer

Launch the Next.js frontend to explore visual diffs:

```bash
npx next dev
```

Visit the app at:

```
http://localhost:3000/viewer
```

(or whatever address your terminal displays)

---

## 📂 Project Structure

- `compare.mjs` – Main script for capturing source & destination screenshots
- `config.json` – Contains URLs of source and destination environments
- `urls.txt` – List of paths to test
- `public/results/` – Generated screenshot files
- `pages/` – Next.js viewer

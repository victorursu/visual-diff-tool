# Visual Diff Tool

A lightweight visual regression testing utility that helps you compare screenshots of web pages between two environments (source and destination). Useful for catching layout changes, regressions, or rendering bugs across deployments.

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your setup

- ``\
  Define your source and destination environments. Example:

  ```json
  {
    "source": "https://source-site.com",
    "destination": "https://destination-site.com"
  }
  ```

- ``\
  List all the relative paths you want to test, one per line:

  ```
  /
  /about
  /contact
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
http://localhost:3000
```

(or whatever address your terminal displays)

---

## 📂 Project Structure

- `compare.mjs` – Main script for capturing source & destination screenshots
- `config.json` – Contains URLs of source and destination environments
- `urls.txt` – List of paths to test
- `public/results/` – Generated screenshot files
- `pages/` – Next.js viewer

---

## 📝 License

[MIT](LICENSE)


# Visual Diff Tool

A lightweight visual regression testing utility that helps you compare screenshots of web pages between two environments (source and destination). Useful for catching layout changes, regressions, or rendering bugs across deployments.

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your setup

* Define your source and destination environments. Example:

  ```json
  {
    "sourceBase": "https://source-site.com",
    "destBase": "https://destination-site.com",
    "maxHeight": "1000",
    "delaySeconds": 2
  }
  ```

* List all the relative paths you want to test in `url.txt`, one per line:

  ```
  /
  /about
  /contact
  /company
  ```

### 2.1 Amazon S3 Support

To enable Amazon S3 support for remote screenshot storage and retrieval, update `.env.local` with the following values:

#### 🔧 `.env.local`

```env
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=visual-diff-tool

NEXT_PUBLIC_S3_ENABLED=true
NEXT_PUBLIC_REMOVE_FOLDER_AFTER_SYNC=false
NEXT_PUBLIC_S3_BUCKET=visual-diff-tool
NEXT_PUBLIC_S3_REGION=us-west-2
```

#### 🔧 `config.json`

Make sure the `s3` block is properly configured in .env.local
`NEXT_PUBLIC_REMOVE_FOLDER_AFTER_SYNC=true` means the public/results folder where the screenshots are kept localy, is being deleted after the S3 sync.
`NEXT_PUBLIC_S3_ENABLED=true` mean images will be synced up to a valid S3 bucket.

#### 🛡️ S3 Bucket Configuration

To allow proper access to your files, configure the following **CORS policy** for your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

And set the **Bucket Policy** for public read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::visual-diff-tool/*"
    }
  ]
}
```

Once enabled, the application will automatically fetch screenshots from your S3 bucket instead of the local `public/results/` folder.

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

* `compare.mjs` – Main script for capturing source & destination screenshots
* `config.json` – Contains URLs of source and destination environments
* `urls.txt` – List of paths to test
* `public/results/` – Generated screenshot files
* `pages/` – Next.js viewer

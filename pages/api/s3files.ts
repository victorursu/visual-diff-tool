import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  const { folder } = req.query;
  const Bucket = process.env.AWS_S3_BUCKET;
  const Prefix = folder ? `${folder}/` : '';

  try {
    const data = await s3.send(
      new ListObjectsV2Command({ Bucket, Prefix, Delimiter: '/' })
    );

    if (!folder) {
      // Root listing — extract folder names
      const folders = data.CommonPrefixes?.map((p) =>
        p.Prefix.replace(/\/$/, '')
      ) || [];
      return res.status(200).json({ folders });
    } else {
      // File listing in the folder
      const files = data.Contents?.map((obj) =>
        obj.Key.replace(`${Prefix}`, '')
      ).filter((f) => f.endsWith('.png')) || [];
      return res.status(200).json(files);
    }
  } catch (err) {
    console.error('S3 error:', err);
    res.status(500).json({ error: 'Failed to access S3' });
  }
}

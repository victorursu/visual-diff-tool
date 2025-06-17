import { useEffect, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export default function VisualDiffViewer() {
  const [files, setFiles] = useState([]);
  const [groups, setGroups] = useState({});
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");

  useEffect(() => {
    async function loadFolders() {
      const res = await fetch("/api/files");
      const data = await res.json();
      setFolders(data.folders || []);
      if (data.folders?.length) {
        setSelectedFolder(data.folders[data.folders.length - 1]);
      }
    }
    loadFolders();
  }, []);

  useEffect(() => {
    if (!selectedFolder) return;
    async function loadFiles() {
      const folderPath = `results/${selectedFolder}`;
      const response = await fetch(`/api/files?folder=${folderPath}`);
      const fileList = await response.json();

      if (!Array.isArray(fileList)) {
        console.error("fileList is not an array:", fileList);
        return;
      }

      setFiles(fileList);

      const grouped = {};
      for (const file of fileList) {
        const match = file.toLowerCase().match(/^(.+?)-(desktop|mobile)-(before|after|diff)\.png$/);
        if (match) {
          const [_, base, view, type] = match;
          const key = `${base}-${view}`;
          if (!grouped[key]) grouped[key] = {};
          grouped[key][type] = `/results/${selectedFolder}/${file}`;
        } else {
          console.warn("Filename not matched:", file);
        }
      }
      setGroups(grouped);
    }
    loadFiles();
  }, [selectedFolder]);

  return (
    <div className="visual-diff-viewer">
      <h1>Visual Diff Report</h1>

      <label>
        <span>Select Results Folder:</span>
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
        >
          <option value="" disabled>Select folder</option>
          {folders.map((folder) => (
            <option key={folder} value={folder}>{folder}</option>
          ))}
        </select>
      </label>

      {Object.keys(groups).length === 0 ? (
        <p>No matched image sets found. Check filenames or folder path.</p>
      ) : (
        <div className="result-grid">
          {Object.entries(groups).map(([key, files]) => (
            <div key={key} className="group">
              <h2>{key}</h2>
              <div className="card-row">
                {['before', 'after', 'diff'].map((type) => (
                  <div key={type} className="card">
                    <div className="card-header">{type}</div>
                    {files[type] && (
                      <div className="card-image">
                        <img
                          src={files[type]}
                          alt={`${type} preview`}
                          onClick={() => {
                            setLightboxImage(files[type]);
                            setLightboxOpen(true);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={[{ src: lightboxImage }]}
        />
      )}

      <style jsx>{`
        .visual-diff-viewer {
          padding: 24px;
          font-family: sans-serif;
        }

        h1 {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 24px;
        }

        label {
          display: block;
          margin-bottom: 20px;
        }

        select {
          margin-top: 6px;
          padding: 6px;
          font-size: 16px;
        }

        .result-grid {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .group h2 {
          font-size: 20px;
          margin-bottom: 12px;
        }

        .card-row {
          display: flex;
          gap: 16px;
        }

        .card {
          width: 200px;
          height: 200px;
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .card-header {
          text-align: center;
          padding: 6px;
          font-size: 14px;
          font-weight: 500;
          border-bottom: 1px solid #ccc;
          text-transform: capitalize;
        }

        .card-image {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

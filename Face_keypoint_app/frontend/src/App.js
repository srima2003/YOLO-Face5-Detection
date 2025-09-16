import React, { useState } from "react";
import CameraDetection from "./CameraDetection";
import "./App.css"; // 🔥 We'll add custom CSS here

function App() {
  const [mode, setMode] = useState(null);
  const [preview, setPreview] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleFileUpload = async (file, type) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    const endpoint = type === "image" ? "/detect/image" : "/detect/video";

    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreview(url);
      setDownloadUrl(url);
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert("Failed to process file. Check backend logs.");
    }
  };

  if (!mode) {
    return (
      <div className="container">
        <h1 className="title">✨ Face Keypoints Detection (YOLOv8)</h1>
        <h2 className="subtitle">Choose Detection Mode</h2>
        <div className="button-group">
          <button className="btn" onClick={() => setMode("image")}>📷 Upload Image</button>
          <button className="btn" onClick={() => setMode("video")}>🎥 Upload Video</button>
          <button className="btn" onClick={() => setMode("realtime")}>📡 Real-Time</button>
        </div>
      </div>
    );
  }

  if (mode === "image") {
    return (
      <div className="container">
        <h2 className="subtitle">Upload Image for Detection</h2>
        <input
          type="file"
          accept="image/png, image/jpeg, image/jpg"
          onChange={(e) => handleFileUpload(e.target.files[0], "image")}
        />
        {preview && (
          <div className="preview-box">
            <img src={preview} alt="Detected" className="preview-img" />
          </div>
        )}
        {downloadUrl && (
          <div className="download-box">
            <a className="download-link" href={downloadUrl} download="detected_image.jpg">
              ⬇️ Download Result
            </a>
          </div>
        )}
        <button className="btn back-btn" onClick={() => setMode(null)}>⬅️ Back</button>
      </div>
    );
  }

  if (mode === "video") {
    return (
      <div className="container">
        <h2 className="subtitle">Upload Video for Detection</h2>
        <input
          type="file"
          accept="video/mp4"
          onChange={(e) => handleFileUpload(e.target.files[0], "video")}
        />
        {preview && (
          <div className="preview-box">
            <video src={preview} controls className="preview-video" />
          </div>
        )}
        {downloadUrl && (
          <div className="download-box">
            <a className="download-link" href={downloadUrl} download="detected_video.mp4">
              ⬇️ Download Result
            </a>
          </div>
        )}
        <button className="btn back-btn" onClick={() => setMode(null)}>⬅️ Back</button>
      </div>
    );
  }

  if (mode === "realtime") {
    return (
      <div className="container">
        <h1 className="title">📡 Real-Time Detection</h1>
        <CameraDetection />
        <button className="btn back-btn" onClick={() => setMode(null)}>⬅️ Back</button>
      </div>
    );
  }

  return null;
}

export default App;

import React, { useRef, useEffect } from "react";

  const backendUrl = "ws://yolo-face-detection.com:8000/ws";

export default function CameraDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  useEffect(() => {
    // const ws = new WebSocket("ws://localhost:8000/ws");
    const ws = new WebSocket(backendUrl)
    let frameCount = 0;

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }
    setupCamera();

    ws.onopen = () => console.log("Connected to backend WebSocket");
    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.warn("WebSocket closed");

    ws.onmessage = (event) => {
      const { bbox, keypoints } = JSON.parse(event.data);
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

      // Draw bounding boxes
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      bbox.forEach(([x1, y1, x2, y2]) => {
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      });

      // Draw keypoints
      ctx.fillStyle = "red";
      keypoints.forEach((kpList) => {
        kpList.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      });
    };

    // Capture & send only 1 out of 10 frames (~3 FPS)
    const interval = setInterval(() => {
      frameCount++;
      if (!videoRef.current || ws.readyState !== WebSocket.OPEN) return;
      if (frameCount % 10 !== 0) return; // skip frames

      const hiddenCanvas = document.createElement("canvas");
      hiddenCanvas.width = videoRef.current.videoWidth;
      hiddenCanvas.height = videoRef.current.videoHeight;
      const ctx = hiddenCanvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);
      const data = hiddenCanvas.toDataURL("image/jpeg").split(",")[1];
      ws.send(data);
    }, 100); // video ~10FPS, sending ~1FPS effective

    return () => {
      clearInterval(interval);
      ws.close();
    }
    // eslint-disable next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <video ref={videoRef} autoPlay playsInline style={{ display: "none" }} />
      <canvas ref={canvasRef} width={640} height={480} />
    </div>
  );
}

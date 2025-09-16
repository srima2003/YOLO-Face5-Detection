from fastapi import FastAPI, WebSocket, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import base64, cv2, numpy as np, os, uuid
from ultralytics import YOLO

app = FastAPI()

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
model = YOLO("best.pt")  # replace with your trained model

OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            img_bytes = base64.b64decode(data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            results = model(frame, verbose=False)

            bboxes, keypoints = [], []
            for r in results:
                if r.boxes is not None and r.keypoints is not None:
                    for box, kps in zip(r.boxes.xyxy.cpu().numpy(), r.keypoints.xy.cpu().numpy()):
                        bboxes.append(box.tolist())
                        keypoints.append(kps.tolist())

            await websocket.send_json({"bbox": bboxes, "keypoints": keypoints})
    except Exception as e:
        print("⚠️ Error:", e)
    finally:
        await websocket.close()


# 📷 Image upload detection
@app.post("/detect/image")
async def detect_image(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Run YOLO
    results = model(img, verbose=False)

    # Save result
    output_path = os.path.join(OUTPUT_DIR, f"detected_{uuid.uuid4().hex}.jpg")
    for r in results:
        annotated = r.plot()  # YOLO has built-in plotting
        cv2.imwrite(output_path, annotated)

    return FileResponse(output_path, media_type="image/jpeg", filename="detected.jpg")


# 🎥 Video upload detection
@app.post("/detect/video")
async def detect_video(file: UploadFile = File(...)):
    contents = await file.read()
    input_path = os.path.join(OUTPUT_DIR, f"input_{uuid.uuid4().hex}.mp4")
    with open(input_path, "wb") as f:
        f.write(contents)

    cap = cv2.VideoCapture(input_path)

    # ✅ Force consistent frame size
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 20.0  # fallback if fps=0

    # ✅ Use proper codec for mp4
    fourcc = cv2.VideoWriter_fourcc(*"avc1")  # better than "mp4v"
    output_path = os.path.join(OUTPUT_DIR, f"detected_{uuid.uuid4().hex}.mp4")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        results = model(frame, verbose=False)
        for r in results:
            annotated = r.plot()
            out.write(annotated)

    cap.release()
    out.release()

    # ✅ Return valid mp4 response
    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename="detected.mp4"
    )

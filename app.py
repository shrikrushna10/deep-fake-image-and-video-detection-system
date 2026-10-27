import os
import io
import tempfile
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import forensic_engine

app = FastAPI(
    title="Deep Fake Image and Video Detection System",
    description="Advanced multi-spectral forensic verification system for detecting camera captured, AI generated, and reshared media."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory resolution for local and cloud environments
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
SAMPLES_DIR = os.path.join(BASE_DIR, "samples")

# Ensure directories exist
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)
os.makedirs(SAMPLES_DIR, exist_ok=True)

# Mount static and sample files
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
if os.path.exists(SAMPLES_DIR):
    app.mount("/samples", StaticFiles(directory=SAMPLES_DIR), name="samples")


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="""
        <div style="font-family:system-ui, -apple-system, sans-serif; text-align:center; padding: 60px 20px; color: #1e293b; background: #f8fafc; min-height: 100vh;">
            <h1 style="font-size: 28px; margin-bottom: 12px;">Deep Fake Image and Video Detection System</h1>
            <div style="max-width: 540px; margin: 30px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: left;">
                <h3 style="color: #dc2626; margin-top: 0;">⚠️ Missing 'static' Folder</h3>
                <p>The server is running, but <code>static/index.html</code> was not found on this host.</p>
                <p><strong>To fix:</strong> Ensure you have committed and pushed the entire <code>static/</code> directory (including <code>index.html</code>, <code>css/</code>, and <code>js/</code>) to your GitHub repository.</p>
            </div>
        </div>
    """, status_code=200)


@app.post("/api/analyze/image")
async def analyze_image_endpoint(file: UploadFile = File(...)):
    """Analyze uploaded image file against the 3 core criteria."""
    try:
        contents = await file.read()
        if len(contents) == 0:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Empty file uploaded"}
            )
        if len(contents) > 25 * 1024 * 1024:
            return JSONResponse(
                status_code=413,
                content={"status": "error", "message": "Image exceeds 25MB limit. Please upload an image under 25MB."}
            )
        
        result = forensic_engine.analyze_image(contents, file.filename or "image.jpg")
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Forensic analysis error: {str(e)}"}
        )


@app.post("/api/analyze/video")
async def analyze_video_endpoint(file: UploadFile = File(...)):
    """Analyze uploaded video file against the 3 core criteria."""
    suffix = os.path.splitext(file.filename or "video.mp4")[1]
    if not suffix:
        suffix = ".mp4"
        
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        contents = await file.read()
        if len(contents) == 0:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Empty video file uploaded"}
            )
        if len(contents) > 75 * 1024 * 1024:
            return JSONResponse(
                status_code=413,
                content={"status": "error", "message": "Video exceeds 75MB limit for cloud instance. Please upload a shorter clip."}
            )
        
        temp_file.write(contents)
        temp_file.close()

        result = forensic_engine.analyze_video(temp_file.name, file.filename or "video.mp4")
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Video analysis error: {str(e)}"}
        )
    finally:
        if os.path.exists(temp_file.name):
            try:
                os.remove(temp_file.name)
            except Exception:
                pass


@app.get("/api/test-sample/{sample_name}")
async def analyze_sample(sample_name: str):
    """Run forensic analysis directly on built-in samples."""
    sample_path = os.path.join(SAMPLES_DIR, sample_name)
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Sample not found")

    ext = os.path.splitext(sample_name)[1].lower()
    if ext in [".jpg", ".jpeg", ".png", ".webp"]:
        with open(sample_path, "rb") as f:
            content = f.read()
        res = forensic_engine.analyze_image(content, sample_name)
        return JSONResponse(content=res)
    elif ext in [".mp4", ".mov", ".avi", ".webm"]:
        res = forensic_engine.analyze_video(sample_path, sample_name)
        return JSONResponse(content=res)
    else:
        raise HTTPException(status_code=400, detail="Unsupported sample format")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("app:app", host=host, port=port, reload=False)

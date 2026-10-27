---
title: Deep Fake Image and Video Detection System
emoji: 🛡️
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 8000
pinned: false
---

# Deep Fake Image and Video Detection System

An advanced multi-spectral forensic verification system that classifies digital media into:
1. **Real / Original** (Camera Captured with hardware sensor noise and EXIF provenance)
2. **Fake / AI Generated** (Midjourney, DALL-E, Gemini, Stable Diffusion, Sora, Kling, Runway, etc.)
3. **Not Original** (Reshared, social messaging downloads with stripped metadata)

## 🔬 Multi-Spectral Forensic Engine
- **2D Fast Fourier Transform (FFT)** for neural upsampling grid artifacts.
- **Error Level Analysis (ELA)** for compression inconsistencies.
- **Sensor Shot Noise & PRNU Residuals** for physical sensor verification.
- **Temporal Coherence & Frame Differencing** for video morphing and flickers.
- **C2PA, Metadata, & Social Signature Analysis**.

## 🚀 Running Locally
```bash
pip install -r requirements.txt
python create_samples.py
uvicorn app:app --host 0.0.0.0 --port 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

## 👤 Author
Developed by **Shrikrushna Hodawadekar**

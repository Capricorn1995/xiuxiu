#!/usr/bin/env python3
"""嗅嗅应用图标生成脚本：SVG -> PNG(512/256) + ICO 多尺寸"""
import os
import cairosvg
from PIL import Image

RES_DIR = "/workspace/xiuxiu/resources"
BUILD_DIR = "/workspace/xiuxiu/build"
SVG_PATH = os.path.join(RES_DIR, "icon.svg")

os.makedirs(BUILD_DIR, exist_ok=True)

# 1) SVG -> PNG (512x512)
png_512 = os.path.join(RES_DIR, "icon.png")
cairosvg.svg2png(url=SVG_PATH, write_to=png_512, output_width=512, output_height=512)
print(f"[OK] {png_512} ({os.path.getsize(png_512)} bytes)")

# 2) SVG -> PNG (256x256)
png_256 = os.path.join(RES_DIR, "icon-256.png")
cairosvg.svg2png(url=SVG_PATH, write_to=png_256, output_width=256, output_height=256)
print(f"[OK] {png_256} ({os.path.getsize(png_256)} bytes)")

# 3) 复制到 build/icon.png (electron-builder 使用)
build_png = os.path.join(BUILD_DIR, "icon.png")
cairosvg.svg2png(url=SVG_PATH, write_to=build_png, output_width=512, output_height=512)
print(f"[OK] {build_png} ({os.path.getsize(build_png)} bytes)")

# 4) 生成 ICO (多尺寸，Windows 适配)
ico_path = os.path.join(RES_DIR, "icon.ico")
sizes = [16, 24, 32, 48, 64, 128, 256, 512]
ico_images = []
for s in sizes:
    tmp = os.path.join(RES_DIR, f"_tmp_{s}.png")
    cairosvg.svg2png(url=SVG_PATH, write_to=tmp, output_width=s, output_height=s)
    ico_images.append(Image.open(tmp).convert("RGBA"))

# Pillow ICO：第一张为主图，其余作为附加尺寸
base = ico_images[-1]  # 512
base.save(
    ico_path,
    format="ICO",
    sizes=[(s, s) for s in sizes],
    append_images=ico_images[:-1],
)
print(f"[OK] {ico_path} ({os.path.getsize(ico_path)} bytes)")

# 清理临时文件
for s in sizes:
    tmp = os.path.join(RES_DIR, f"_tmp_{s}.png")
    if os.path.exists(tmp):
        os.remove(tmp)

# 5) 验证
print("\n=== 验证 ===")
for p in [png_512, png_256, build_png, ico_path]:
    im = Image.open(p)
    print(f"{p}: {im.size} {im.format} {os.path.getsize(p)} bytes")

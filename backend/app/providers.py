import os
import base64
import httpx
from . import storage
from .catalog import PRODUCTS, STYLES

def settings():
    return {"provider":os.getenv("MODEL_PROVIDER","openai"),"image_model":os.getenv("IMAGE_MODEL",""),"text_model":os.getenv("TEXT_MODEL",""),
        "configured":bool(os.getenv("MODEL_API_KEY") and os.getenv("IMAGE_MODEL")),
        "live_enabled":os.getenv("ENABLE_LIVE_GENERATION","false").lower()=="true",
        "estimated_cost":float(os.getenv("IMAGE_ESTIMATED_COST_USD",".20")),
        "project_limit":float(os.getenv("MAX_PROJECT_COST_USD","5"))}

def prompt_for(data, style):
    product_text = "\n".join(p["name"]+" / "+p["size"]+" / "+p["material"] for p in PRODUCTS if p["id"] in data["product_ids"])
    return (
        "You are an interior visualization specialist. Generate one photorealistic room redesign. "
        "Preserve the reference room's walls, openings and camera perspective. Do not invent doors or windows. "
        "The reference floor plan is authoritative geometry; product references guide appearance only. "
        "No text, dimensions, logos or watermarks in the result.\n"
        + "Room: "+str(data["room"]["width"])+"m by "+str(data["room"]["length"])+"m; ceiling "+str(data["room"]["height"])+"m.\n"
        + "Style: "+style["name"]+". Client brief: "+data["brief"]+"\nProducts:\n"+product_text
    )

def generate_image(data, style):
    cfg=settings()
    if not (cfg["configured"] and cfg["live_enabled"]):
        raise ValueError("云端模型尚未启用")
    key=os.environ["MODEL_API_KEY"]
    base=os.getenv("MODEL_BASE_URL","https://api.openai.com/v1").rstrip("/")
    original=data["original"] or data["cover"]
    from .geometry import reference_png
    refs=[storage.read_image(original),reference_png(data["room"])]
    # All protocol references are normalized to PNG to match their MIME type.
    refs.extend(storage.read_image(p["image"]) for p in PRODUCTS if p["id"] in data["product_ids"] and p["id"]!="wood")
    from PIL import Image
    from io import BytesIO
    normalized=[]
    for raw in refs:
        image=Image.open(BytesIO(raw)).convert("RGB")
        image.thumbnail((1800,1800))
        output=BytesIO()
        image.save(output,"PNG")
        normalized.append(output.getvalue())
    refs=normalized
    headers={"Authorization":"Bearer "+key}
    with httpx.Client(timeout=httpx.Timeout(240, connect=20)) as client:
        if cfg["provider"]=="openrouter":
            content=[{"type":"text","text":prompt_for(data,style)}]
            for raw in refs:
                content.append({"type":"image_url","image_url":{"url":"data:image/png;base64,"+base64.b64encode(raw).decode()}})
            response=client.post(base+"/chat/completions",headers=headers,json={"model":cfg["image_model"],"messages":[{"role":"user","content":content}],"modalities":["image","text"]})
            response.raise_for_status()
            result=response.json()
            url=result["choices"][0]["message"]["images"][0]["image_url"]["url"]
        else:
            response=client.post(base+"/images/edits",headers=headers,
                data={"model":cfg["image_model"],"prompt":prompt_for(data,style),"n":"1","size":"1536x1024"},
                files=[("image[]",("reference-"+str(i)+".png",raw,"image/png")) for i,raw in enumerate(refs)])
            response.raise_for_status()
            item=response.json()["data"][0]
            if item.get("b64_json"):
                return base64.b64decode(item["b64_json"])
            url=item["url"]
        if url.startswith("data:image/"):
            return base64.b64decode(url.split(",",1)[1])
        if not url.startswith("https://"):
            raise ValueError("图像服务返回了无效地址")
        result=client.get(url)
        result.raise_for_status()
        return result.content

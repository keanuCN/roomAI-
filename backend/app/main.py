import os
import secrets
import hashlib
from io import BytesIO
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from contextlib import asynccontextmanager
from xml.sax.saxutils import escape
from fastapi import FastAPI, Request, Response, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from PIL import Image, UnidentifiedImageError
from .db import Session, Record, initialize
from .catalog import PRODUCTS, STYLES, new_project, now
from .geometry import validate_room, plan_svg
from . import storage
from .providers import settings
from .jobs import run_render

@asynccontextmanager
async def lifespan(app):
    initialize()
    yield

app=FastAPI(title="roomAI 栖间 API",version="0.1.0",lifespan=lifespan)

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

@app.middleware("http")
async def session_cookie(request, call_next):
    token=request.cookies.get("roomai_session","")
    fresh=len(token)!=64
    if fresh:
        token=secrets.token_hex(32)
    request.state.owner=digest(token)
    response=await call_next(request)
    if fresh:
        response.set_cookie("roomai_session",token,max_age=86400*30,httponly=True,samesite="lax",secure=os.getenv("COOKIE_SECURE","false")=="true")
    return response

def project_for(db, project_id, owner):
    row=db.get(Record,project_id)
    if not row or row.kind!="project" or row.owner!=owner:
        raise HTTPException(404,"项目不存在或无权访问")
    return row

def share_for(db, token):
    row=db.get(Record,"share-"+digest(token))
    if not row or row.data.get("revoked") or datetime.fromisoformat(row.data["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(404,"分享链接已失效或不存在")
    p=db.get(Record,row.data["project_id"])
    if not p:
        raise HTTPException(404,"项目已删除")
    return row,p

class OpeningInput(BaseModel):
    id: str = Field(max_length=80)
    type: str = "door"
    wall: int = Field(ge=0,le=5)
    position: float = Field(ge=0,le=25)
    width: float = Field(gt=0,le=5)

class FurnitureInput(BaseModel):
    id: str = Field(max_length=80)
    product_id: str
    x: float = Field(ge=0,le=25)
    y: float = Field(ge=0,le=25)
    rotation: int = 0

class RoomInput(BaseModel):
    width: float = Field(ge=2,le=20)
    length: float = Field(ge=2,le=20)
    height: float = Field(ge=2,le=6)
    shape: str = "rectangle"
    confirmed: bool = False
    openings: list[OpeningInput] = Field(default_factory=list,max_length=20)
    furniture: list[FurnitureInput] = Field(default_factory=list,max_length=30)

class ProjectCreate(BaseModel):
    title: str = Field(min_length=1,max_length=80)
    room_type: str = Field(default="客厅",max_length=30)
    width: float = Field(default=5.6,ge=2,le=20)
    length: float = Field(default=5,ge=2,le=20)

class ProjectUpdate(BaseModel):
    title: str = Field(min_length=1,max_length=80)
    room_type: str = Field(max_length=30)
    client: str = Field(max_length=50)
    brief: str = Field(max_length=1500)
    budget: int = Field(ge=0,le=10000000)
    style: str
    product_ids: list[str] = Field(max_length=30)
    room: RoomInput

class RenderInput(BaseModel):
    style: str
    mode: str = "demo"
    confirm_cost: bool = False
    request_id: str = Field(min_length=8,max_length=80)

class ShareInput(BaseModel):
    days: int = Field(default=7,ge=1,le=30)

class LeadInput(BaseModel):
    name: str = Field(min_length=1,max_length=60)
    contact: str = Field(min_length=5,max_length=120)
    message: str = Field(default="",max_length=1000)
    consent: bool

@app.get("/api/health")
def health():
    return {"status":"ok","service":"roomai"}

@app.get("/api/settings")
def get_settings():
    return settings()

@app.get("/api/products")
def products():
    return PRODUCTS

@app.get("/api/styles")
def styles():
    return STYLES

@app.get("/api/projects")
def projects(request:Request):
    owner=request.state.owner
    with Session() as db:
        if not db.get(Record,"session-"+owner):
            db.add(Record(id="session-"+owner,kind="session",owner=owner,data={"created_at":now()}))
            for i,title in enumerate(["云栖 · 自然主义客厅","木语 · 一隅书房","留白 · 安静的卧室"]):
                data=new_project(title,["客厅","书房","卧室"][i],index=i)
                data["updated_at"]=(datetime.now(timezone.utc)-timedelta(days=i)).isoformat()
                data["status"]="已完成" if i==2 else "设计中"
                db.add(Record(id=data["id"],kind="project",owner=owner,data=data))
            db.commit()
        rows=db.scalars(select(Record).where(Record.kind=="project",Record.owner==owner)).all()
        return sorted([row.data for row in rows],key=lambda p:p["updated_at"],reverse=True)

@app.post("/api/projects")
def create_project(body:ProjectCreate,request:Request):
    data=new_project(body.title,body.room_type,body.width,body.length)
    data["room"]["confirmed"]=False
    data["versions"]=[]
    # New rooms start clear so furniture is explicitly placed and measured by the user.
    data["room"]["furniture"]=[]
    data["room"]["openings"]=[]
    data["product_ids"]=[]
    with Session() as db:
        db.add(Record(id=data["id"],kind="project",owner=request.state.owner,data=data))
        db.commit()
    return data

@app.get("/api/projects/{project_id}")
def get_project(project_id:str,request:Request):
    with Session() as db:
        return project_for(db,project_id,request.state.owner).data

@app.put("/api/projects/{project_id}")
def save_project(project_id:str,body:ProjectUpdate,request:Request):
    room=body.room.model_dump()
    if room["shape"] not in ("rectangle","alcove") or any(o["type"] not in ("door","window") for o in room["openings"]):
        raise HTTPException(400,"不支持的房间或门窗类型")
    if any(o["wall"] >= (4 if room["shape"]=="rectangle" else 6) for o in room["openings"]):
        raise HTTPException(400,"门窗所在墙段不存在")
    ids={p["id"] for p in PRODUCTS}
    if any(p not in ids for p in body.product_ids) or any(f["product_id"] not in ids for f in room["furniture"]):
        raise HTTPException(400,"包含不存在的产品")
    check=validate_room(room)
    if not check["valid"]:
        raise HTTPException(422,"；".join(check["errors"]))
    with Session() as db:
        row=project_for(db,project_id,request.state.owner)
        data={**row.data,**body.model_dump(),"updated_at":now()}
        row.data=data
        db.commit()
        return data

@app.delete("/api/projects/{project_id}")
def delete_project(project_id:str,request:Request):
    with Session() as db:
        row=project_for(db,project_id,request.state.owner)
        related=db.scalars(select(Record).where(Record.kind.in_(["share","job","lead"]))).all()
        for item in related:
            if item.data.get("project_id")==project_id or (item.kind=="lead" and item.owner==project_id):
                db.delete(item)
        db.delete(row)
        db.commit()
    storage.remove_project(project_id)
    return {"ok":True}

@app.post("/api/projects/{project_id}/upload")
async def upload(project_id:str,request:Request,file:UploadFile=File(...)):
    with Session() as db:
        row=project_for(db,project_id,request.state.owner)
        raw=await file.read(12*1024*1024+1)
        if len(raw)>12*1024*1024:
            raise HTTPException(413,"照片大小不能超过 12 MB")
        try:
            Image.MAX_IMAGE_PIXELS=30000000
            im=Image.open(BytesIO(raw))
            if im.format not in ("JPEG","PNG","WEBP"):
                raise ValueError()
            im=im.convert("RGB")
            im.thumbnail((2400,2400))
            output=BytesIO()
            im.save(output,"JPEG",quality=90)
        except (UnidentifiedImageError,ValueError,OSError,Image.DecompressionBombError):
            raise HTTPException(400,"请上传有效的 JPG、PNG 或 WebP 照片")
        url=storage.put(project_id+"/"+uuid4().hex+".jpg",output.getvalue(),"image/jpeg")
        data={**row.data,"original":url,"updated_at":now()}
        row.data=data
        db.commit()
        return data

@app.get("/api/projects/{project_id}/plan")
def download_plan(project_id:str,request:Request):
    with Session() as db:
        row=project_for(db,project_id,request.state.owner)
        return Response(plan_svg(row.data["room"]),media_type="image/svg+xml",headers={"Content-Disposition":"attachment; filename=room-plan.svg"})

@app.post("/api/projects/{project_id}/renders")
def render(project_id:str,body:RenderInput,request:Request,background:BackgroundTasks):
    if body.style not in {s["id"] for s in STYLES} or body.mode not in ("demo","live"):
        raise HTTPException(400,"无效的生成设置")
    cfg=settings()
    with Session() as db:
        p=project_for(db,project_id,request.state.owner)
        check=validate_room(p.data["room"])
        if not p.data["room"]["confirmed"] or not check["valid"]:
            raise HTTPException(400,"请先确认房间尺寸，并修正户型中的问题")
        # Lock the project for the short budget reservation transaction in PostgreSQL.
        db.execute(select(Record).where(Record.id==project_id).with_for_update())
        jobs=db.scalars(select(Record).where(Record.kind=="job",Record.owner==request.state.owner)).all()
        for row in jobs:
            if row.data.get("project_id")==project_id and row.data.get("request_id")==body.request_id:
                return {k:v for k,v in row.data.items() if k!="snapshot"}
        if any(j.data["status"] in ("queued","running") for j in jobs):
            raise HTTPException(429,"已有生成任务进行中，请完成后再试")
        cost=cfg["estimated_cost"] if body.mode=="live" else 0
        if body.mode=="live":
            if not body.confirm_cost or not cfg["configured"] or not cfg["live_enabled"]:
                raise HTTPException(400,"请配置并启用云端模型后确认预计费用")
            used=sum(j.data.get("estimated_cost",0) for j in jobs if j.data["project_id"]==project_id and j.data["status"]!="failed")
            if used+cost>cfg["project_limit"]:
                raise HTTPException(400,"已达到项目的模型调用预算上限")
        recent=sum(1 for j in jobs if j.data["created_at"][:10]==now()[:10])
        if recent>=30:
            raise HTTPException(429,"已达到今日演示生成次数上限")
        job={"id":uuid4().hex,"project_id":project_id,"mode":body.mode,"style":body.style,"status":"queued","progress":5,"estimated_cost":cost,"created_at":now(),"request_id":body.request_id,"snapshot":p.data}
        db.add(Record(id=job["id"],kind="job",owner=request.state.owner,data=job))
        db.commit()
    redis_url=os.getenv("REDIS_URL")
    if redis_url:
        try:
            from redis import Redis
            from rq import Queue
            Queue("renders",connection=Redis.from_url(redis_url)).enqueue("app.jobs.run_render",job["id"],job_timeout=360)
        except Exception:
            with Session() as db:
                row=db.get(Record,job["id"])
                row.data={**row.data,"status":"failed","error":"生成队列暂不可用，请重试"}
                db.commit()
            raise HTTPException(503,"生成队列暂不可用")
    else:
        background.add_task(run_render,job["id"])
    return {k:v for k,v in job.items() if k!="snapshot"}

@app.get("/api/render-jobs/{job_id}")
def job_status(job_id:str,request:Request):
    with Session() as db:
        row=db.get(Record,job_id)
        if not row or row.kind!="job" or row.owner!=request.state.owner:
            raise HTTPException(404,"任务不存在")
        return {k:v for k,v in row.data.items() if k!="snapshot"}

@app.post("/api/projects/{project_id}/share-links")
def create_share(project_id:str,body:ShareInput,request:Request):
    token=secrets.token_urlsafe(32)
    with Session() as db:
        p=project_for(db,project_id,request.state.owner)
        if not p.data["versions"]:
            raise HTTPException(400,"请先完成一个设计方案")
        data={"project_id":project_id,"expires_at":(datetime.now(timezone.utc)+timedelta(days=body.days)).isoformat(),"revoked":False}
        db.add(Record(id="share-"+digest(token),kind="share",owner=request.state.owner,data=data))
        db.commit()
    return {"token":token,"path":"/share/"+token,**data}

@app.delete("/api/share/{token}")
def revoke_share(token:str,request:Request):
    with Session() as db:
        row,p=share_for(db,token)
        if row.owner!=request.state.owner:
            raise HTTPException(404,"链接不存在")
        row.data={**row.data,"revoked":True}
        db.commit()
    return {"ok":True}

@app.get("/api/share/{token}")
def public_share(token:str):
    with Session() as db:
        row,p=share_for(db,token)
        data=p.data
        return {"title":data["title"],"client":data["client"],"room_type":data["room_type"],"area":validate_room(data["room"])["area"],
            "versions":data["versions"],"cover":data["cover"],"products":[p for p in PRODUCTS if p["id"] in data["product_ids"]],
            "brand":{"name":"栖木家居","english":"QIMU","tagline":"为真实的生活，寻找自然的答案。"},"expires_at":row.data["expires_at"]}

@app.post("/api/share/{token}/leads")
def create_lead(token:str,body:LeadInput):
    if not body.consent:
        raise HTTPException(400,"请同意将联系方式用于本次设计咨询")
    with Session() as db:
        row,p=share_for(db,token)
        if len(db.scalars(select(Record).where(Record.kind=="lead",Record.owner==p.id)).all())>=50:
            raise HTTPException(429,"该方案已达到咨询提交上限")
        db.add(Record(id=uuid4().hex,kind="lead",owner=p.id,data={**body.model_dump(),"created_at":now(),"share_id":row.id}))
        db.commit()
    return {"ok":True,"message":"预约已提交，设计顾问将通过您填写的方式联系您。"}

@app.get("/api/projects/{project_id}/leads")
def project_leads(project_id:str,request:Request):
    with Session() as db:
        project_for(db,project_id,request.state.owner)
        return [r.data for r in db.scalars(select(Record).where(Record.kind=="lead",Record.owner==project_id)).all()]

@app.get("/files/{project_id}/{filename}")
def private_file(project_id:str,filename:str,request:Request,share:str=""):
    with Session() as db:
        if share:
            link,p=share_for(db,share)
            if p.id!=project_id:
                raise HTTPException(404)
        else:
            project_for(db,project_id,request.state.owner)
        if not filename.endswith((".jpg",".png")) or "/" in filename or ".." in filename:
            raise HTTPException(404)
        try:
            raw=storage.get(project_id+"/"+filename)
        except Exception:
            raise HTTPException(404,"文件不存在")
        return Response(raw,media_type="image/jpeg" if filename.endswith(".jpg") else "image/png",headers={"Cache-Control":"private, max-age=300"})

@app.get("/api/projects/{project_id}/report")
def report(project_id:str,request:Request):
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as PDFImage, Table
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    from reportlab.lib import colors
    with Session() as db:
        data=project_for(db,project_id,request.state.owner).data
    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    style=ParagraphStyle("Chinese",fontName="STSong-Light",fontSize=11,leading=19,textColor=colors.HexColor("#30362d"))
    title=ParagraphStyle("TitleCN",parent=style,fontSize=25,leading=34,spaceAfter=18)
    elements=[Paragraph(escape("roomAI 栖间 / "+data["title"]),title),Paragraph("设计方案展示报告 · "+now()[:10],style),Spacer(1,16)]
    im=Image.open(BytesIO(storage.read_image(data["cover"])))
    output=BytesIO()
    im.convert("RGB").save(output,"JPEG")
    output.seek(0)
    elements.append(PDFImage(output,width=480,height=480*im.height/im.width))
    elements.extend([Spacer(1,18),Paragraph("空间与需求",title),Paragraph(escape(data["brief"]),style),Spacer(1,10),Paragraph("房间尺寸："+str(data["room"]["width"])+" × "+str(data["room"]["length"])+" m；面积："+str(validate_room(data["room"])["area"])+" m²",style)])
    if data["versions"]:
        elements.extend([Spacer(1,15),Paragraph("设计说明",title),Paragraph(escape(data["versions"][-1]["rationale"]),style)])
    elements.extend([Spacer(1,20),Paragraph("产品与参考预算",title)])
    selected=[p for p in PRODUCTS if p["id"] in data["product_ids"]]
    for product in selected:
        elements.append(Paragraph(escape(product["name"]+" · "+product["size"]+" · ¥"+str(product["price"])),style))
    elements.extend([Spacer(1,14),Paragraph("参考总价：¥"+str(sum(p["price"] for p in selected))+"（示例价格，不含施工与运输）",style),Spacer(1,20),Paragraph("效果图用于方案沟通。预置演示图片不代表对当前房间或产品的精确复现。尺寸须现场复核，本报告不是施工图。",style)])
    buf=BytesIO()
    SimpleDocTemplate(buf,pagesize=(595,842),leftMargin=50,rightMargin=50).build(elements)
    return Response(buf.getvalue(),media_type="application/pdf",headers={"Content-Disposition":"attachment; filename=roomAI-proposal.pdf"})

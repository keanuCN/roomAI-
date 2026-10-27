from io import BytesIO
from uuid import uuid4
from PIL import Image
from .db import Session, Record
from .catalog import STYLES, now
from . import storage
from .providers import generate_image

def run_render(job_id):
    import os
    if os.getenv("REDIS_URL"):
        from .db import engine
        engine.dispose(close=False)
    with Session() as db:
        row=db.get(Record,job_id)
        if not row or row.data["status"] not in ("queued","running"):
            return
        job=dict(row.data)
        job.update(status="running",progress=30)
        row.data=dict(job)
        db.commit()
        try:
            style=next(s for s in STYLES if s["id"]==job["style"])
            image=style["image"]
            if job["mode"]=="live":
                raw=generate_image(job["snapshot"],style)
                im=Image.open(BytesIO(raw)).convert("RGB")
                im.thumbnail((2560,2560))
                output=BytesIO()
                im.save(output,format="JPEG",quality=92)
                image=storage.put(job["project_id"]+"/"+uuid4().hex+".jpg",output.getvalue(),"image/jpeg")
            project=db.get(Record,job["project_id"])
            if not project:
                raise ValueError("项目已被删除")
            data=dict(project.data)
            version={"id":uuid4().hex,"name":style["name"],"style":style["id"],"image":image,"mode":job["mode"],"created_at":now(),"rationale":style["description"]}
            data.update(cover=image,style=style["id"],updated_at=now(),status="已完成")
            data["versions"]=[*data["versions"],version]
            project.data=data
            job.update(status="completed",progress=100,image=image,version_id=version["id"])
        except Exception as exc:
            # Provider exceptions may contain request headers/URLs. Keep them off the public API.
            job.update(status="failed",progress=0,error="图像生成未完成，请检查模型配置或稍后重试。"+("项目已删除。" if isinstance(exc,ValueError) else ""))
        job.pop("snapshot",None)
        row.data=job
        db.commit()

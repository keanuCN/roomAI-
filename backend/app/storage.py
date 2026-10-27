import os
from pathlib import Path
import boto3

ROOT = Path(os.getenv("MEDIA_ROOT", "data/media"))
ROOT.mkdir(parents=True, exist_ok=True)
ASSETS = Path(os.getenv("ASSETS_ROOT", "../web/public/assets")).resolve()
BUCKET = os.getenv("S3_BUCKET", "roomai")
USE_S3 = os.getenv("STORAGE_BACKEND", "local") == "s3"

def client():
    return boto3.client("s3", endpoint_url=os.getenv("S3_ENDPOINT"), aws_access_key_id=os.getenv("S3_ACCESS_KEY"), aws_secret_access_key=os.getenv("S3_SECRET_KEY"), region_name="us-east-1")

def put(key, content, content_type):
    if USE_S3:
        s3 = client()
        try:
            s3.head_bucket(Bucket=BUCKET)
        except s3.exceptions.ClientError:
            s3.create_bucket(Bucket=BUCKET)
        s3.put_object(Bucket=BUCKET, Key=key, Body=content, ContentType=content_type)
    else:
        p = ROOT / key
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(content)
    return "/files/" + key

def get(key):
    if ".." in key or key.startswith("/"):
        raise ValueError("无效文件路径")
    if USE_S3:
        return client().get_object(Bucket=BUCKET, Key=key)["Body"].read()
    return (ROOT / key).read_bytes()

def remove_project(project_id):
    if USE_S3:
        s3 = client()
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=project_id + "/"):
            objects = [{"Key":item["Key"]} for item in page.get("Contents", [])]
            if objects:
                s3.delete_objects(Bucket=BUCKET, Delete={"Objects":objects})
    else:
        import shutil
        p = ROOT / project_id
        if p.exists():
            shutil.rmtree(p)

def read_image(url):
    if url.startswith("/assets/"):
        return (ASSETS / Path(url).name).read_bytes()
    if url.startswith("/files/"):
        return get(url.removeprefix("/files/"))
    raise ValueError("不支持的图片地址")
